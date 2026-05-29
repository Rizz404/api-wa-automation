import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type MessageDirection = 'in' | 'out';
export type MessageType = 'text' | 'image' | 'file' | 'audio' | 'video';
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

@Entity('message_logs')
export class MessageLog {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Index()
  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ApiProperty()
  @Column({ name: 'session_id', type: 'uuid', nullable: true })
  sessionId: string | null;

  @ApiProperty({ required: false })
  @Column({ name: 'automation_id', type: 'uuid', nullable: true })
  automationId: string | null;

  @ApiProperty({ required: false })
  @Column({ name: 'broadcast_id', type: 'uuid', nullable: true })
  broadcastId: string | null;

  @ApiProperty({ enum: ['in', 'out'] })
  @Column({ type: 'varchar', length: 4 })
  direction: MessageDirection;

  @ApiProperty({ required: false })
  @Column({ name: 'from_phone', length: 20, nullable: true })
  fromPhone: string | null;

  @ApiProperty({ required: false })
  @Column({ name: 'to_phone', length: 20, nullable: true })
  toPhone: string | null;

  @ApiProperty({ enum: ['text', 'image', 'file', 'audio', 'video'] })
  @Column({ name: 'message_type', type: 'varchar', length: 10, default: 'text' })
  messageType: MessageType;

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  content: string | null;

  @ApiProperty({ enum: ['sent', 'delivered', 'read', 'failed'] })
  @Column({ type: 'varchar', length: 10, default: 'sent' })
  status: MessageStatus;

  @ApiProperty({ required: false })
  @Column({ name: 'wa_message_id', length: 100, nullable: true })
  waMessageId: string | null;

  @ApiProperty({ required: false })
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @ApiProperty()
  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
