import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageLog } from '../messages/entities/message-log.entity';
import { Automation } from '../automations/entities/automation.entity';
import { Session } from '../sessions/entities/session.entity';
import { Broadcast } from '../broadcasts/entities/broadcast.entity';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MessageLog, Automation, Session, Broadcast]),
    WorkspacesModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
