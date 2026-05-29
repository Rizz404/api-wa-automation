import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Automation } from './entities/automation.entity';
import { AutomationAction } from './entities/automation-action.entity';
import { AutomationsService } from './automations.service';
import { AutomationsController } from './automations.controller';
import { InboundController } from './inbound.controller';
import { AutomationProcessor } from './automation.processor';
import { AutomationScheduler } from './automation.scheduler';
import { TriggerEngine } from './engine/trigger.engine';
import { ActionEngine } from './engine/action.engine';
import { ConditionEngine } from './engine/condition.engine';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { SessionsModule } from '../sessions/sessions.module';
import { MessagesModule } from '../messages/messages.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Automation, AutomationAction]),
    WorkspacesModule,
    SessionsModule,
    MessagesModule,
    WebhooksModule,
  ],
  controllers: [AutomationsController, InboundController],
  providers: [
    AutomationsService,
    AutomationProcessor,
    AutomationScheduler,
    TriggerEngine,
    ActionEngine,
    ConditionEngine,
  ],
  exports: [AutomationsService],
})
export class AutomationsModule {}
