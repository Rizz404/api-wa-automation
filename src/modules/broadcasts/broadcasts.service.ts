import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { Broadcast } from './entities/broadcast.entity';
import { BroadcastRecipient } from './entities/broadcast-recipient.entity';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';
import { UpdateBroadcastDto } from './dto/update-broadcast.dto';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { SessionsService } from '../sessions/sessions.service';
import { ContactsService } from '../contacts/contacts.service';
import { QUEUE_BROADCASTS } from '../../queue/queue.constants';
import { BroadcastJob } from '../../queue/jobs/job.types';

@Injectable()
export class BroadcastsService {
  constructor(
    @InjectRepository(Broadcast)
    private readonly broadcasts: Repository<Broadcast>,
    @InjectRepository(BroadcastRecipient)
    private readonly recipients: Repository<BroadcastRecipient>,
    @InjectQueue(QUEUE_BROADCASTS) private readonly queue: Queue<BroadcastJob>,
    private readonly workspaces: WorkspacesService,
    private readonly sessions: SessionsService,
    private readonly contacts: ContactsService,
  ) {}

  async create(workspaceId: string, userId: string, dto: CreateBroadcastDto) {
    await this.workspaces.assertRole(workspaceId, userId, ['owner', 'admin']);
    const session = await this.sessions.findOne(dto.sessionId, workspaceId, userId);

    // Build the recipient set from explicit list + resolved contacts.
    const map = new Map<string, BroadcastRecipient>();
    for (const r of dto.recipients || []) {
      const phone = r.phone.replace(/[^\d]/g, '');
      if (phone)
        map.set(
          phone,
          this.recipients.create({ phone, variables: r.variables || {} }),
        );
    }
    if (dto.contactIds?.length) {
      const contacts = await this.contacts.resolvePhones(
        workspaceId,
        dto.contactIds,
      );
      for (const c of contacts) {
        if (!map.has(c.phone)) {
          map.set(
            c.phone,
            this.recipients.create({
              phone: c.phone,
              variables: { name: c.name || '' },
            }),
          );
        }
      }
    }
    const recipientList = [...map.values()];
    if (recipientList.length === 0) {
      throw new BadRequestException('Broadcast has no recipients');
    }

    const broadcast = this.broadcasts.create({
      workspaceId,
      sessionId: session.id,
      name: dto.name,
      template: dto.template,
      delayMs: dto.delayMs ?? 3000,
      total: recipientList.length,
      status: 'draft',
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      recipients: recipientList,
    });
    return this.broadcasts.save(broadcast);
  }

  async findAll(workspaceId: string, userId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    return this.broadcasts.find({
      where: { workspaceId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, workspaceId: string, userId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    const broadcast = await this.broadcasts.findOne({
      where: { id, workspaceId },
    });
    if (!broadcast) throw new NotFoundException('Broadcast not found');
    return broadcast;
  }

  async update(
    id: string,
    workspaceId: string,
    userId: string,
    dto: UpdateBroadcastDto,
  ) {
    await this.workspaces.assertRole(workspaceId, userId, ['owner', 'admin']);
    const broadcast = await this.findOne(id, workspaceId, userId);
    if (broadcast.status !== 'draft') {
      throw new BadRequestException('Only draft broadcasts can be edited');
    }
    Object.assign(broadcast, dto);
    return this.broadcasts.save(broadcast);
  }

  async remove(id: string, workspaceId: string, userId: string) {
    await this.workspaces.assertRole(workspaceId, userId, ['owner', 'admin']);
    const broadcast = await this.findOne(id, workspaceId, userId);
    await this.broadcasts.remove(broadcast);
    return { message: 'Broadcast deleted' };
  }

  async send(id: string, workspaceId: string, userId: string) {
    await this.workspaces.assertRole(workspaceId, userId, ['owner', 'admin']);
    const broadcast = await this.findOne(id, workspaceId, userId);
    if (!['draft', 'failed', 'cancelled'].includes(broadcast.status)) {
      throw new BadRequestException(
        `Cannot send broadcast in '${broadcast.status}' status`,
      );
    }
    broadcast.status = 'queued';
    await this.broadcasts.save(broadcast);
    const delay = broadcast.scheduledAt
      ? Math.max(0, broadcast.scheduledAt.getTime() - Date.now())
      : 0;
    await this.queue.add('run', { broadcastId: broadcast.id }, { delay });
    return { queued: true, scheduledIn: delay };
  }

  async cancel(id: string, workspaceId: string, userId: string) {
    await this.workspaces.assertRole(workspaceId, userId, ['owner', 'admin']);
    const broadcast = await this.findOne(id, workspaceId, userId);
    broadcast.status = 'cancelled';
    await this.broadcasts.save(broadcast);
    return { message: 'Broadcast cancelled' };
  }

  async status(id: string, workspaceId: string, userId: string) {
    const b = await this.findOne(id, workspaceId, userId);
    return {
      id: b.id,
      status: b.status,
      total: b.total,
      sent: b.sentCount,
      failed: b.failedCount,
      progress: b.total ? Math.round((b.sentCount + b.failedCount) / b.total * 100) : 0,
    };
  }

  async report(id: string, workspaceId: string, userId: string) {
    const b = await this.findOne(id, workspaceId, userId);
    const recipients = await this.recipients.find({
      where: { broadcastId: id },
    });
    return { broadcast: b, recipients };
  }
}
