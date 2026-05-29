import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('webhook_deliveries')
export class WebhookDelivery {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Index()
  @Column({ name: 'webhook_id', type: 'uuid' })
  webhookId: string;

  @ApiProperty()
  @Column({ length: 100 })
  event: string;

  @ApiProperty()
  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @ApiProperty()
  @Column({ type: 'int', default: 0 })
  attempt: number;

  @ApiProperty({ required: false })
  @Column({ name: 'status_code', type: 'int', nullable: true })
  statusCode: number | null;

  @ApiProperty({ enum: ['success', 'failed'] })
  @Column({ type: 'varchar', length: 10 })
  status: 'success' | 'failed';

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  error: string | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
