import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { QUEUE_BROADCASTS } from '../../queue/queue.constants';
import { BroadcastJob } from '../../queue/jobs/job.types';
import { Broadcast } from './entities/broadcast.entity';
import { BroadcastRecipient } from './entities/broadcast-recipient.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { SessionsService } from '../sessions/sessions.service';
import { OpenwaService } from '../../openwa/openwa.service';
import { MessagesService } from '../messages/messages.service';
import { SessionsGateway } from '../sessions/sessions.gateway';
import { renderTemplate } from '../../common/helpers/template.helper';

@Processor(QUEUE_BROADCASTS)
export class BroadcastProcessor extends WorkerHost {
  private readonly logger = new Logger(BroadcastProcessor.name);

  constructor(
    @InjectRepository(Broadcast)
    private readonly broadcasts: Repository<Broadcast>,
    @InjectRepository(BroadcastRecipient)
    private readonly recipients: Repository<BroadcastRecipient>,
    private readonly workspaces: WorkspacesService,
    private readonly sessions: SessionsService,
    private readonly openwa: OpenwaService,
    private readonly messages: MessagesService,
    private readonly gateway: SessionsGateway,
  ) {
    super();
  }

  async process(job: Job<BroadcastJob>): Promise<any> {
    const broadcast = await this.broadcasts.findOne({
      where: { id: job.data.broadcastId },
    });
    if (!broadcast) return { skipped: true };

    const session = await this.sessions.getById(broadcast.sessionId);
    const creds = await this.workspaces.getOpenwaCredentials(
      broadcast.workspaceId,
    );

    broadcast.status = 'sending';
    broadcast.startedAt = new Date();
    await this.broadcasts.save(broadcast);

    const pending = await this.recipients.find({
      where: { broadcastId: broadcast.id, status: 'pending' },
    });

    for (const recipient of pending) {
      // Honour cancellation requested mid-flight.
      const fresh = await this.broadcasts.findOne({
        where: { id: broadcast.id },
        select: ['status'],
      });
      if (fresh?.status === 'cancelled') {
        this.logger.log(`Broadcast ${broadcast.id} cancelled, stopping`);
        return { cancelled: true };
      }

      const message = renderTemplate(broadcast.template, recipient.variables);
      try {
        const res = await this.openwa.sendText(
          creds,
          session.sessionId,
          recipient.phone,
          message,
        );
        recipient.status = 'sent';
        recipient.sentAt = new Date();
        await this.recipients.save(recipient);
        broadcast.sentCount++;
        await this.messages
          .record({
            workspaceId: broadcast.workspaceId,
            sessionId: session.id,
            broadcastId: broadcast.id,
            direction: 'out',
            toPhone: recipient.phone,
            messageType: 'text',
            content: message,
            status: 'sent',
            waMessageId: (res?.response as string) || null,
          })
          .catch(() => undefined);
      } catch (err) {
        recipient.status = 'failed';
        recipient.errorMessage = err instanceof Error ? err.message : String(err);
        await this.recipients.save(recipient);
        broadcast.failedCount++;
      }

      await this.broadcasts.save(broadcast);
      this.gateway.emitBroadcastProgress(broadcast.workspaceId, {
        broadcastId: broadcast.id,
        sent: broadcast.sentCount,
        failed: broadcast.failedCount,
        total: broadcast.total,
      });

      // Anti-spam delay between messages.
      await this.sleep(broadcast.delayMs || 3000);
    }

    broadcast.status = 'done';
    broadcast.finishedAt = new Date();
    await this.broadcasts.save(broadcast);
    return {
      done: true,
      sent: broadcast.sentCount,
      failed: broadcast.failedCount,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
