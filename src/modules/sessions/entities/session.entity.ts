import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type SessionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

@Entity('sessions')
export class Session {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Index()
  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ApiProperty({ description: 'OpenWA session id' })
  @Column({ name: 'session_id', length: 100 })
  sessionId: string;

  @ApiProperty()
  @Column({ length: 100 })
  name: string;

  @ApiProperty({ required: false })
  @Column({ name: 'phone_number', type: 'varchar', length: 20, nullable: true })
  phoneNumber: string | null;

  @ApiProperty({
    enum: ['idle', 'connecting', 'connected', 'disconnected', 'error'],
  })
  @Column({ type: 'varchar', length: 20, default: 'idle' })
  status: SessionStatus;

  @ApiProperty({ required: false })
  @Column({ name: 'last_active_at', type: 'timestamp', nullable: true })
  lastActiveAt: Date | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
