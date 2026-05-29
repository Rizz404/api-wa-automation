import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Automation } from './entities/automation.entity';
import { AutomationAction } from './entities/automation-action.entity';
import { CreateAutomationDto } from './dto/create-automation.dto';
import { UpdateAutomationDto } from './dto/update-automation.dto';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { TriggerEngine } from './engine/trigger.engine';
import { QUEUE_AUTOMATIONS } from '../../queue/queue.constants';
import { AutomationJob } from '../../queue/jobs/job.types';
import { SessionsGateway } from '../sessions/sessions.gateway';

@Injectable()
export class AutomationsService {
  constructor(
    @InjectRepository(Automation)
    private readonly automations: Repository<Automation>,
    @InjectRepository(AutomationAction)
    private readonly actions: Repository<AutomationAction>,
    @InjectQueue(QUEUE_AUTOMATIONS)
    private readonly queue: Queue<AutomationJob>,
    private readonly workspaces: WorkspacesService,
    private readonly triggerEngine: TriggerEngine,
    private readonly gateway: SessionsGateway,
  ) {}

  async create(workspaceId: string, userId: string, dto: CreateAutomationDto) {
    await this.workspaces.assertRole(workspaceId, userId, ['owner', 'admin']);
    if (dto.triggerType === 'webhook' && !dto.triggerConfig.webhook_path) {
      dto.triggerConfig.webhook_path = `/trigger/${randomBytes(8).toString('hex')}`;
    }
    const automation = this.automations.create({
      workspaceId,
      sessionId: dto.sessionId || null,
      name: dto.name,
      description: dto.description || null,
      triggerType: dto.triggerType,
      triggerConfig: dto.triggerConfig,
      actions: dto.actions.map((a) =>
        this.actions.create({
          order: a.order,
          actionType: a.actionType as any,
          actionConfig: a.actionConfig,
        }),
      ),
    });
    return this.automations.save(automation);
  }

  async findAll(workspaceId: string, userId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    return this.automations.find({ where: { workspaceId } });
  }

  async findOne(id: string, workspaceId: string, userId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    const automation = await this.automations.findOne({
      where: { id, workspaceId },
    });
    if (!automation) throw new NotFoundException('Automation not found');
    return automation;
  }

  async update(
    id: string,
    workspaceId: string,
    userId: string,
    dto: UpdateAutomationDto,
  ) {
    await this.workspaces.assertRole(workspaceId, userId, ['owner', 'admin']);
    const automation = await this.findOne(id, workspaceId, userId);
    if (dto.name !== undefined) automation.name = dto.name;
    if (dto.description !== undefined) automation.description = dto.description;
    if (dto.sessionId !== undefined) automation.sessionId = dto.sessionId;
    if (dto.triggerType !== undefined) automation.triggerType = dto.triggerType;
    if (dto.triggerConfig !== undefined)
      automation.triggerConfig = dto.triggerConfig;
    if (dto.actions !== undefined) {
      await this.actions.delete({ automationId: id });
      automation.actions = dto.actions.map((a) =>
        this.actions.create({
          automationId: id,
          order: a.order,
          actionType: a.actionType as any,
          actionConfig: a.actionConfig,
        }),
      );
    }
    return this.automations.save(automation);
  }

  async remove(id: string, workspaceId: string, userId: string) {
    await this.workspaces.assertRole(workspaceId, userId, ['owner', 'admin']);
    const automation = await this.findOne(id, workspaceId, userId);
    await this.automations.remove(automation);
    return { message: 'Automation deleted' };
  }

  async setActive(
    id: string,
    workspaceId: string,
    userId: string,
    active: boolean,
  ) {
    await this.workspaces.assertRole(workspaceId, userId, ['owner', 'admin']);
    const automation = await this.findOne(id, workspaceId, userId);
    automation.isActive = active;
    return this.automations.save(automation);
  }

  async test(id: string, workspaceId: string, userId: string, context: any) {
    const automation = await this.findOne(id, workspaceId, userId);
    return this.enqueueRun(automation, context || {});
  }

  /** Enqueue an automation execution job. */
  async enqueueRun(automation: Automation, context: Record<string, any>) {
    this.gateway.emitAutomationTriggered(automation.workspaceId, {
      automationId: automation.id,
      phone: context.from || context.to,
      timestamp: new Date().toISOString(),
    });
    const job = await this.queue.add('run', {
      automationId: automation.id,
      workspaceId: automation.workspaceId,
      context,
    });
    return { queued: true, jobId: job.id };
  }

  /** Find an automation by webhook trigger path (public trigger endpoint). */
  findByWebhookPath(path: string): Promise<Automation | null> {
    return this.automations
      .createQueryBuilder('a')
      .where('a.is_active = true')
      .andWhere("a.trigger_type = 'webhook'")
      .andWhere("a.trigger_config ->> 'webhook_path' = :path", { path })
      .getOne();
  }

  /**
   * Evaluate all active message-trigger automations for an incoming message
   * and enqueue the ones that match.
   */
  async dispatchIncomingMessage(
    workspaceId: string,
    ctx: { message: string; from: string; isGroup?: boolean },
  ) {
    const candidates = await this.automations.find({
      where: { workspaceId, isActive: true, triggerType: 'message' },
    });
    const matched = candidates.filter((a) =>
      this.triggerEngine.matchesMessage(a.triggerConfig as any, ctx),
    );
    for (const automation of matched) {
      await this.enqueueRun(automation, {
        ...ctx,
        to: ctx.from, // reply back to sender by default
      });
    }
    return { matched: matched.length };
  }

  async markRun(automationId: string) {
    await this.automations.increment({ id: automationId }, 'runCount', 1);
    await this.automations.update(
      { id: automationId },
      { lastRunAt: new Date() },
    );
  }
}
