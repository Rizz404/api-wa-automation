import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('contacts')
@Unique(['workspaceId', 'phone'])
export class Contact {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Index()
  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string | null;

  @ApiProperty()
  @Column({ length: 20 })
  phone: string;

  @ApiProperty({ type: [String] })
  @Column({ type: 'jsonb', default: () => "'[]'" })
  tags: string[];

  @ApiProperty()
  @Column({ name: 'is_blacklisted', default: false })
  isBlacklisted: boolean;

  @ApiProperty({ required: false })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
