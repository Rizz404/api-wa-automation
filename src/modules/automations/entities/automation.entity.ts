import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AutomationAction } from './automation-action.entity';

export type TriggerType = 'message' | 'schedule' | 'webhook';

@Entity('automations')
export class Automation {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Index()
  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ApiProperty({ required: false })
  @Column({ name: 'session_id', type: 'uuid', nullable: true })
  sessionId: string | null;

  @ApiProperty()
  @Column({ length: 100 })
  name: string;

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty()
  @Column({ name: 'is_active', default: false })
  isActive: boolean;

  @ApiProperty({ enum: ['message', 'schedule', 'webhook'] })
  @Column({ name: 'trigger_type', type: 'varchar', length: 20 })
  triggerType: TriggerType;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @Column({ name: 'trigger_config', type: 'jsonb' })
  triggerConfig: Record<string, any>;

  @ApiProperty()
  @Column({ name: 'run_count', type: 'int', default: 0 })
  runCount: number;

  @ApiProperty({ required: false })
  @Column({ name: 'last_run_at', type: 'timestamp', nullable: true })
  lastRunAt: Date | null;

  @OneToMany(() => AutomationAction, (action) => action.automation, {
    cascade: true,
    eager: true,
  })
  actions: AutomationAction[];

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
