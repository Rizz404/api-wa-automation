import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Automation } from './automation.entity';

export type ActionType =
  | 'send_text'
  | 'send_image'
  | 'send_file'
  | 'forward'
  | 'delay'
  | 'condition';

@Entity('automation_actions')
export class AutomationAction {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ name: 'automation_id', type: 'uuid' })
  automationId: string;

  @ApiProperty({ description: 'Execution order (ascending)' })
  @Column({ name: 'order', type: 'smallint' })
  order: number;

  @ApiProperty({
    enum: ['send_text', 'send_image', 'send_file', 'forward', 'delay', 'condition'],
  })
  @Column({ name: 'action_type', type: 'varchar', length: 20 })
  actionType: ActionType;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @Column({ name: 'action_config', type: 'jsonb' })
  actionConfig: Record<string, any>;

  @ManyToOne(() => Automation, (automation) => automation.actions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'automation_id' })
  automation: Automation;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
