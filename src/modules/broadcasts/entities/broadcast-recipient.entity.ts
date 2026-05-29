import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Broadcast } from './broadcast.entity';

export type RecipientStatus = 'pending' | 'sent' | 'failed';

@Entity('broadcast_recipients')
export class BroadcastRecipient {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Index()
  @Column({ name: 'broadcast_id', type: 'uuid' })
  broadcastId: string;

  @ApiProperty()
  @Column({ length: 20 })
  phone: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @Column({ type: 'jsonb', default: () => "'{}'" })
  variables: Record<string, any>;

  @ApiProperty({ enum: ['pending', 'sent', 'failed'] })
  @Column({ type: 'varchar', length: 10, default: 'pending' })
  status: RecipientStatus;

  @ApiProperty({ required: false })
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @ApiProperty({ required: false })
  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @ManyToOne(() => Broadcast, (b) => b.recipients, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'broadcast_id' })
  broadcast: Broadcast;
}
