import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { ApiKey } from './entities/api-key.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { sha256 } from '../../common/helpers/encryption.helper';
import { WorkspacesService } from '../workspaces/workspaces.service';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeys: Repository<ApiKey>,
    private readonly workspaces: WorkspacesService,
  ) {}

  async create(workspaceId: string, userId: string, dto: CreateApiKeyDto) {
    await this.workspaces.assertRole(workspaceId, userId, ['owner', 'admin']);
    const raw = `wa_${randomBytes(24).toString('hex')}`;
    const entity = this.apiKeys.create({
      workspaceId,
      name: dto.name,
      keyHash: sha256(raw),
      keyPrefix: raw.slice(0, 10),
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });
    const saved = await this.apiKeys.save(entity);
    // Full key returned exactly once.
    return { ...saved, key: raw };
  }

  async findAll(workspaceId: string, userId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    return this.apiKeys.find({ where: { workspaceId } });
  }

  async remove(id: string, workspaceId: string, userId: string) {
    await this.workspaces.assertRole(workspaceId, userId, ['owner', 'admin']);
    const key = await this.apiKeys.findOne({ where: { id, workspaceId } });
    if (!key) throw new NotFoundException('API key not found');
    await this.apiKeys.remove(key);
    return { message: 'API key deleted' };
  }

  /** Validates a raw API key and returns its workspace id, or null. */
  async validate(rawKey: string): Promise<{ workspaceId: string } | null> {
    const hash = sha256(rawKey);
    const key = await this.apiKeys.findOne({ where: { keyHash: hash } });
    if (!key || !key.isActive) return null;
    if (key.expiresAt && key.expiresAt.getTime() < Date.now()) return null;
    key.lastUsedAt = new Date();
    await this.apiKeys.save(key);
    return { workspaceId: key.workspaceId };
  }
}
