import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { Webhook } from './entities/webhook.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { QUEUE_WEBHOOKS } from '../../queue/queue.constants';
import { WebhookJob } from '../../queue/jobs/job.types';

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(Webhook)
    private readonly webhooks: Repository<Webhook>,
    @InjectRepository(WebhookDelivery)
    private readonly deliveries: Repository<WebhookDelivery>,
    @InjectQueue(QUEUE_WEBHOOKS) private readonly queue: Queue<WebhookJob>,
    private readonly workspaces: WorkspacesService,
  ) {}

  async create(workspaceId: string, userId: string, dto: CreateWebhookDto) {
    await this.workspaces.assertRole(workspaceId, userId, ['owner', 'admin']);
    return this.webhooks.save(this.webhooks.create({ workspaceId, ...dto }));
  }

  async findAll(workspaceId: string, userId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    return this.webhooks.find({ where: { workspaceId } });
  }

  async findOne(id: string, workspaceId: string, userId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    const webhook = await this.webhooks.findOne({ where: { id, workspaceId } });
    if (!webhook) throw new NotFoundException('Webhook not found');
    return webhook;
  }

  async update(
    id: string,
    workspaceId: string,
    userId: string,
    dto: UpdateWebhookDto,
  ) {
    await this.workspaces.assertRole(workspaceId, userId, ['owner', 'admin']);
    const webhook = await this.findOne(id, workspaceId, userId);
    Object.assign(webhook, dto);
    return this.webhooks.save(webhook);
  }

  async remove(id: string, workspaceId: string, userId: string) {
    await this.workspaces.assertRole(workspaceId, userId, ['owner', 'admin']);
    const webhook = await this.findOne(id, workspaceId, userId);
    await this.webhooks.remove(webhook);
    return { message: 'Webhook deleted' };
  }

  async test(id: string, workspaceId: string, userId: string) {
    const webhook = await this.findOne(id, workspaceId, userId);
    await this.enqueue(webhook, 'test.event', {
      message: 'This is a test event',
      timestamp: new Date().toISOString(),
    });
    return { queued: true };
  }

  async logs(id: string, workspaceId: string, userId: string) {
    await this.findOne(id, workspaceId, userId);
    return this.deliveries.find({
      where: { webhookId: id },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  /** Enqueue all active webhooks of a workspace subscribed to `event`. */
  async dispatch(
    workspaceId: string,
    event: string,
    payload: Record<string, any>,
  ) {
    const hooks = await this.webhooks.find({
      where: { workspaceId, isActive: true },
    });
    const subscribed = hooks.filter((h) => h.events?.includes(event));
    for (const hook of subscribed) {
      await this.enqueue(hook, event, payload);
    }
    return { dispatched: subscribed.length };
  }

  private enqueue(webhook: Webhook, event: string, payload: Record<string, any>) {
    return this.queue.add(
      'deliver',
      { webhookId: webhook.id, event, payload },
      { attempts: (webhook.retryCount || 3) + 1, backoff: { type: 'custom' } },
    );
  }

  // Used by the processor.
  getById(id: string): Promise<Webhook | null> {
    return this.webhooks.findOne({ where: { id } });
  }

  recordDelivery(data: Partial<WebhookDelivery>) {
    return this.deliveries.save(this.deliveries.create(data));
  }
}
