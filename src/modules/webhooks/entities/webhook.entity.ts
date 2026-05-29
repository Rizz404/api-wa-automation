import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('webhooks')
export class Webhook {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Index()
  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ApiProperty()
  @Column({ length: 100 })
  name: string;

  @ApiProperty()
  @Column({ length: 500 })
  url: string;

  @Exclude()
  @Column({ type: 'varchar', length: 255, nullable: true })
  secret: string | null;

  @ApiProperty({ type: [String] })
  @Column({ type: 'jsonb', default: () => "'[]'" })
  events: string[];

  @ApiProperty()
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ApiProperty()
  @Column({ name: 'retry_count', type: 'smallint', default: 3 })
  retryCount: number;

  @ApiProperty()
  @Column({ name: 'timeout_ms', type: 'int', default: 10000 })
  timeoutMs: number;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
