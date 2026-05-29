import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Workspace } from './entities/workspace.entity';
import {
  WorkspaceMember,
  WorkspaceRole,
} from './entities/workspace-member.entity';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteMemberDto, UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { decrypt, encrypt } from '../../common/helpers/encryption.helper';
import { UsersService } from '../users/users.service';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaces: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private readonly members: Repository<WorkspaceMember>,
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  private get encKey(): string {
    return this.config.get<string>('app.encryptionKey')!;
  }

  async create(userId: string, dto: CreateWorkspaceDto): Promise<Workspace> {
    const workspace = this.workspaces.create({
      name: dto.name,
      ownerId: userId,
      openwaBaseUrl: dto.openwaBaseUrl,
      openwaApiKey: encrypt(dto.openwaApiKey, this.encKey),
    });
    const saved = await this.workspaces.save(workspace);
    await this.members.save(
      this.members.create({
        workspaceId: saved.id,
        userId,
        role: 'owner',
      }),
    );
    return saved;
  }

  async findAllForUser(userId: string): Promise<Workspace[]> {
    const memberships = await this.members.find({ where: { userId } });
    const ids = memberships.map((m) => m.workspaceId);
    if (ids.length === 0) return [];
    return this.workspaces.find({ where: { id: In(ids) } });
  }

  async findOne(id: string, userId: string): Promise<Workspace> {
    await this.assertMember(id, userId);
    const workspace = await this.workspaces.findOne({ where: { id } });
    if (!workspace) throw new NotFoundException('Workspace not found');
    return workspace;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateWorkspaceDto,
  ): Promise<Workspace> {
    await this.assertRole(id, userId, ['owner', 'admin']);
    const workspace = await this.workspaces.findOne({ where: { id } });
    if (!workspace) throw new NotFoundException('Workspace not found');
    if (dto.name !== undefined) workspace.name = dto.name;
    if (dto.openwaBaseUrl !== undefined)
      workspace.openwaBaseUrl = dto.openwaBaseUrl;
    if (dto.openwaApiKey !== undefined)
      workspace.openwaApiKey = encrypt(dto.openwaApiKey, this.encKey);
    if (dto.isActive !== undefined) workspace.isActive = dto.isActive;
    return this.workspaces.save(workspace);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.assertRole(id, userId, ['owner']);
    const workspace = await this.workspaces.findOne({ where: { id } });
    if (!workspace) throw new NotFoundException('Workspace not found');
    await this.workspaces.remove(workspace);
  }

  // --- Members ---

  async listMembers(id: string, userId: string): Promise<WorkspaceMember[]> {
    await this.assertMember(id, userId);
    return this.members.find({
      where: { workspaceId: id },
      relations: ['user'],
    });
  }

  async invite(id: string, userId: string, dto: InviteMemberDto) {
    await this.assertRole(id, userId, ['owner', 'admin']);
    const invitee = await this.usersService.findByEmail(dto.email);
    if (!invitee) throw new NotFoundException('User to invite not found');
    const existing = await this.members.findOne({
      where: { workspaceId: id, userId: invitee.id },
    });
    if (existing) return existing;
    return this.members.save(
      this.members.create({
        workspaceId: id,
        userId: invitee.id,
        role: dto.role || 'member',
      }),
    );
  }

  async removeMember(id: string, userId: string, targetUserId: string) {
    await this.assertRole(id, userId, ['owner', 'admin']);
    const member = await this.members.findOne({
      where: { workspaceId: id, userId: targetUserId },
    });
    if (!member) throw new NotFoundException('Member not found');
    if (member.role === 'owner') {
      throw new ForbiddenException('Cannot remove the workspace owner');
    }
    await this.members.remove(member);
    return { message: 'Member removed' };
  }

  // --- Shared helpers used by other modules ---

  async assertMember(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember> {
    const member = await this.members.findOne({
      where: { workspaceId, userId },
    });
    if (!member) {
      throw new ForbiddenException('You are not a member of this workspace');
    }
    return member;
  }

  async assertRole(
    workspaceId: string,
    userId: string,
    roles: WorkspaceRole[],
  ): Promise<WorkspaceMember> {
    const member = await this.assertMember(workspaceId, userId);
    if (!roles.includes(member.role)) {
      throw new ForbiddenException('Insufficient workspace role');
    }
    return member;
  }

  /** Returns the workspace with its OpenWA API key decrypted. */
  async getOpenwaCredentials(
    workspaceId: string,
  ): Promise<{ baseUrl: string; apiKey: string }> {
    const workspace = await this.workspaces.findOne({
      where: { id: workspaceId },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');
    return {
      baseUrl: workspace.openwaBaseUrl,
      apiKey: decrypt(workspace.openwaApiKey, this.encKey),
    };
  }
}
