import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { Contact } from './entities/contact.entity';
import { ContactGroup } from './entities/contact-group.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { QueryContactsDto } from './dto/query-contacts.dto';
import {
  CreateContactGroupDto,
  UpdateContactGroupDto,
} from './dto/contact-group.dto';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { buildPagination } from '../../common/helpers/pagination.helper';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private readonly contacts: Repository<Contact>,
    @InjectRepository(ContactGroup)
    private readonly groups: Repository<ContactGroup>,
    private readonly workspaces: WorkspacesService,
  ) {}

  private normalizePhone(phone: string): string {
    return phone.replace(/[^\d]/g, '');
  }

  async create(workspaceId: string, userId: string, dto: CreateContactDto) {
    await this.workspaces.assertMember(workspaceId, userId);
    return this.contacts.save(
      this.contacts.create({
        workspaceId,
        name: dto.name || null,
        phone: this.normalizePhone(dto.phone),
        tags: dto.tags || [],
        notes: dto.notes || null,
        isBlacklisted: dto.isBlacklisted || false,
      }),
    );
  }

  async findAll(workspaceId: string, userId: string, query: QueryContactsDto) {
    await this.workspaces.assertMember(workspaceId, userId);
    const qb = this.contacts
      .createQueryBuilder('c')
      .where('c.workspace_id = :workspaceId', { workspaceId });
    if (query.search) {
      qb.andWhere(
        new Brackets((b) =>
          b
            .where('c.name ILIKE :s', { s: `%${query.search}%` })
            .orWhere('c.phone ILIKE :s', { s: `%${query.search}%` }),
        ),
      );
    }
    if (query.tag) {
      qb.andWhere('c.tags @> :tag', { tag: JSON.stringify([query.tag]) });
    }
    if (query.blacklisted !== undefined) {
      qb.andWhere('c.is_blacklisted = :bl', {
        bl: query.blacklisted === 'true',
      });
    }
    qb.orderBy('c.created_at', 'DESC').skip(query.skip).take(query.limit);
    const [data, total] = await qb.getManyAndCount();
    return buildPagination(data, total, query.page, query.limit);
  }

  async findOne(id: string, workspaceId: string, userId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    const contact = await this.contacts.findOne({ where: { id, workspaceId } });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async update(
    id: string,
    workspaceId: string,
    userId: string,
    dto: UpdateContactDto,
  ) {
    const contact = await this.findOne(id, workspaceId, userId);
    if (dto.phone) dto.phone = this.normalizePhone(dto.phone);
    Object.assign(contact, dto);
    return this.contacts.save(contact);
  }

  async remove(id: string, workspaceId: string, userId: string) {
    const contact = await this.findOne(id, workspaceId, userId);
    await this.contacts.remove(contact);
    return { message: 'Contact deleted' };
  }

  async blacklist(id: string, workspaceId: string, userId: string) {
    const contact = await this.findOne(id, workspaceId, userId);
    contact.isBlacklisted = true;
    return this.contacts.save(contact);
  }

  /** Bulk import from parsed CSV rows. Upserts by phone within workspace. */
  async importMany(
    workspaceId: string,
    userId: string,
    rows: { name?: string; phone: string; tags?: string[] }[],
  ) {
    await this.workspaces.assertMember(workspaceId, userId);
    let created = 0;
    let updated = 0;
    let skipped = 0;
    for (const row of rows) {
      const phone = this.normalizePhone(row.phone || '');
      if (!phone) {
        skipped++;
        continue;
      }
      const existing = await this.contacts.findOne({
        where: { workspaceId, phone },
      });
      if (existing) {
        existing.name = row.name || existing.name;
        if (row.tags?.length) existing.tags = row.tags;
        await this.contacts.save(existing);
        updated++;
      } else {
        await this.contacts.save(
          this.contacts.create({
            workspaceId,
            phone,
            name: row.name || null,
            tags: row.tags || [],
          }),
        );
        created++;
      }
    }
    return { created, updated, skipped, total: rows.length };
  }

  async resolvePhones(workspaceId: string, contactIds: string[]) {
    if (!contactIds.length) return [];
    const found = await this.contacts.find({
      where: { workspaceId, id: In(contactIds) },
    });
    return found.filter((c) => !c.isBlacklisted);
  }

  // --- Groups ---

  async listGroups(workspaceId: string, userId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    return this.groups.find({ where: { workspaceId } });
  }

  async createGroup(
    workspaceId: string,
    userId: string,
    dto: CreateContactGroupDto,
  ) {
    await this.workspaces.assertMember(workspaceId, userId);
    return this.groups.save(
      this.groups.create({
        workspaceId,
        name: dto.name,
        contactIds: dto.contactIds || [],
      }),
    );
  }

  async updateGroup(
    id: string,
    workspaceId: string,
    userId: string,
    dto: UpdateContactGroupDto,
  ) {
    await this.workspaces.assertMember(workspaceId, userId);
    const group = await this.groups.findOne({ where: { id, workspaceId } });
    if (!group) throw new NotFoundException('Group not found');
    Object.assign(group, dto);
    return this.groups.save(group);
  }

  async removeGroup(id: string, workspaceId: string, userId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    const group = await this.groups.findOne({ where: { id, workspaceId } });
    if (!group) throw new NotFoundException('Group not found');
    await this.groups.remove(group);
    return { message: 'Group deleted' };
  }
}
