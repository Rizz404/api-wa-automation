import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('contact_groups')
export class ContactGroup {
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

  @ApiProperty({ type: [String] })
  @Column({ name: 'contact_ids', type: 'jsonb', default: () => "'[]'" })
  contactIds: string[];

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
