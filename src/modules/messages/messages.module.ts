import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageLog } from './entities/message-log.entity';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { MessageProcessor } from './message.processor';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MessageLog]),
    WorkspacesModule,
    SessionsModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService, MessageProcessor],
  exports: [MessagesService],
})
export class MessagesModule {}
