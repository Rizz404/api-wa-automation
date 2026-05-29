import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Broadcast } from './entities/broadcast.entity';
import { BroadcastRecipient } from './entities/broadcast-recipient.entity';
import { BroadcastsService } from './broadcasts.service';
import { BroadcastsController } from './broadcasts.controller';
import { BroadcastProcessor } from './broadcast.processor';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { SessionsModule } from '../sessions/sessions.module';
import { ContactsModule } from '../contacts/contacts.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Broadcast, BroadcastRecipient]),
    WorkspacesModule,
    SessionsModule,
    ContactsModule,
    MessagesModule,
  ],
  controllers: [BroadcastsController],
  providers: [BroadcastsService, BroadcastProcessor],
  exports: [BroadcastsService],
})
export class BroadcastsModule {}
