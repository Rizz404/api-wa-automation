import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as parser from 'cron-parser';
import { Automation } from './entities/automation.entity';
import { AutomationsService } from './automations.service';

/**
 * Evaluates schedule-triggered automations once per minute. For each active
 * schedule automation, we check whether its cron expression has a fire time
 * within the just-elapsed minute and, if so, enqueue a run per target phone.
 */
@Injectable()
export class AutomationScheduler {
  private readonly logger = new Logger(AutomationScheduler.name);

  constructor(
    @InjectRepository(Automation)
    private readonly automations: Repository<Automation>,
    private readonly automationsService: AutomationsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick() {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 60_000);

    const scheduled = await this.automations.find({
      where: { isActive: true, triggerType: 'schedule' },
    });

    for (const automation of scheduled) {
      const cfg = automation.triggerConfig as any;
      if (!cfg?.cron) continue;
      try {
        const interval = parser.parseExpression(cfg.cron, {
          currentDate: windowStart,
          tz: cfg.timezone || 'UTC',
        });
        const next = interval.next().toDate();
        if (next > windowStart && next <= now) {
          const targets: string[] = cfg.target_phones || [];
          for (const phone of targets) {
            await this.automationsService.enqueueRun(automation, {
              to: phone,
              from: phone,
              sessionId: automation.sessionId,
            });
          }
        }
      } catch (err) {
        this.logger.warn(
          `Invalid cron for automation ${automation.id}: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }
  }
}
