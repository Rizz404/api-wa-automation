import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { QUEUE_AUTOMATIONS } from '../../queue/queue.constants';
import { AutomationJob } from '../../queue/jobs/job.types';
import { Automation } from './entities/automation.entity';
import { AutomationsService } from './automations.service';
import { ActionEngine } from './engine/action.engine';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { SessionsService } from '../sessions/sessions.service';

@Processor(QUEUE_AUTOMATIONS)
export class AutomationProcessor extends WorkerHost {
  private readonly logger = new Logger(AutomationProcessor.name);

  constructor(
    @InjectRepository(Automation)
    private readonly automations: Repository<Automation>,
    private readonly automationsService: AutomationsService,
    private readonly actionEngine: ActionEngine,
    private readonly workspaces: WorkspacesService,
    private readonly sessions: SessionsService,
  ) {
    super();
  }

  async process(job: Job<AutomationJob>): Promise<any> {
    const { automationId, workspaceId, context } = job.data;
    const automation = await this.automations.findOne({
      where: { id: automationId },
    });
    if (!automation) {
      this.logger.warn(`Automation ${automationId} not found, skipping`);
      return;
    }

    const dbSessionId = automation.sessionId || context.sessionId;
    if (!dbSessionId) {
      this.logger.warn(
        `Automation ${automationId} has no session to run on, skipping`,
      );
      return;
    }
    const session = await this.sessions.getById(dbSessionId);
    const creds = await this.workspaces.getOpenwaCredentials(workspaceId);

    const to = context.to || context.from;
    await this.actionEngine.run(automation.actions || [], {
      workspaceId,
      sessionId: session.id,
      openwaSessionId: session.sessionId,
      creds,
      to,
      automationId,
      variables: context,
    });

    await this.automationsService.markRun(automationId);
    return { ran: true };
  }
}
