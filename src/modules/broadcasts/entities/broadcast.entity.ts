import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BroadcastRecipient } from './broadcast-recipient.entity';

export type BroadcastStatus =
  | 'draft'
  | 'queued'
  | 'sending'
  | 'done'
  | 'failed'
  | 'cancelled';

@Entity('broadcasts')
export class Broadcast {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Index()
  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ApiProperty()
  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @ApiProperty()
  @Column({ length: 100 })
  name: string;

  @ApiProperty({ description: 'Message template, supports {{variable}}' })
  @Column({ type: 'text' })
  template: string;

  @ApiProperty({
    enum: ['draft', 'queued', 'sending', 'done', 'failed', 'cancelled'],
  })
  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: BroadcastStatus;

  @ApiProperty({ description: 'Delay between messages in ms (anti-spam)' })
  @Column({ name: 'delay_ms', type: 'int', default: 3000 })
  delayMs: number;

  @ApiProperty()
  @Column({ type: 'int', default: 0 })
  total: number;

  @ApiProperty()
  @Column({ name: 'sent_count', type: 'int', default: 0 })
  sentCount: number;

  @ApiProperty()
  @Column({ name: 'failed_count', type: 'int', default: 0 })
  failedCount: number;

  @ApiProperty({ required: false })
  @Column({ name: 'scheduled_at', type: 'timestamp', nullable: true })
  scheduledAt: Date | null;

  @ApiProperty({ required: false })
  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @ApiProperty({ required: false })
  @Column({ name: 'finished_at', type: 'timestamp', nullable: true })
  finishedAt: Date | null;

  @OneToMany(() => BroadcastRecipient, (r) => r.broadcast, { cascade: true })
  recipients: BroadcastRecipient[];

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
