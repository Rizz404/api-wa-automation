import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_MESSAGES } from '../../queue/queue.constants';
import { SendMessageJob } from '../../queue/jobs/job.types';
import { MessagesService } from './messages.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { OpenwaService } from '../../openwa/openwa.service';
import { SessionsGateway } from '../sessions/sessions.gateway';

@Processor(QUEUE_MESSAGES)
export class MessageProcessor extends WorkerHost {
  private readonly logger = new Logger(MessageProcessor.name);

  constructor(
    private readonly messages: MessagesService,
    private readonly workspaces: WorkspacesService,
    private readonly openwa: OpenwaService,
    private readonly gateway: SessionsGateway,
  ) {
    super();
  }

  async process(job: Job<SendMessageJob>): Promise<any> {
    const data = job.data;
    const creds = await this.workspaces.getOpenwaCredentials(data.workspaceId);
    let waMessageId: string | null = null;
    try {
      let res;
      if (data.type === 'image') {
        res = await this.openwa.sendImage(
          creds,
          data.openwaSessionId,
          data.to,
          data.mediaUrl!,
          data.caption || '',
          data.filename || 'image.jpg',
        );
      } else if (data.type === 'file') {
        res = await this.openwa.sendFile(
          creds,
          data.openwaSessionId,
          data.to,
          data.mediaUrl!,
          data.filename || 'file',
          data.caption || '',
        );
      } else {
        res = await this.openwa.sendText(
          creds,
          data.openwaSessionId,
          data.to,
          data.content || '',
        );
      }
      waMessageId =
        (res?.response as string) || (res as any)?.messageId || null;

      await this.messages.record({
        workspaceId: data.workspaceId,
        sessionId: data.sessionId,
        automationId: data.automationId || null,
        broadcastId: data.broadcastId || null,
        direction: 'out',
        toPhone: data.to,
        messageType: data.type,
        content: data.content || data.caption || data.mediaUrl || null,
        status: 'sent',
        waMessageId,
      });
      this.gateway.emitMessageSent(data.workspaceId, data.sessionId, {
        sessionId: data.sessionId,
        to: data.to,
        messageId: waMessageId,
        status: 'sent',
      });
      return { waMessageId };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send to ${data.to}: ${message}`);
      await this.messages.record({
        workspaceId: data.workspaceId,
        sessionId: data.sessionId,
        automationId: data.automationId || null,
        broadcastId: data.broadcastId || null,
        direction: 'out',
        toPhone: data.to,
        messageType: data.type,
        content: data.content || data.caption || data.mediaUrl || null,
        status: 'failed',
        errorMessage: message,
      });
      throw err;
    }
  }
}
