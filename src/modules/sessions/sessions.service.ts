import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Session, SessionStatus } from './entities/session.entity';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { OpenwaService } from '../../openwa/openwa.service';
import { SessionsGateway } from './sessions.gateway';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessions: Repository<Session>,
    private readonly workspaces: WorkspacesService,
    private readonly openwa: OpenwaService,
    private readonly gateway: SessionsGateway,
  ) {}

  async create(workspaceId: string, userId: string, dto: CreateSessionDto) {
    await this.workspaces.assertRole(workspaceId, userId, ['owner', 'admin']);
    const sessionId =
      dto.sessionId || `s_${randomBytes(6).toString('hex')}`;
    const session = this.sessions.create({
      workspaceId,
      sessionId,
      name: dto.name,
      status: 'idle',
    });
    return this.sessions.save(session);
  }

  async findAll(workspaceId: string, userId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    return this.sessions.find({ where: { workspaceId } });
  }

  async findOne(id: string, workspaceId: string, userId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    const session = await this.sessions.findOne({ where: { id, workspaceId } });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  /** Internal lookup without user check (used by queue/automation). */
  async getById(id: string): Promise<Session> {
    const session = await this.sessions.findOne({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  /** Resolve a DB session from the OpenWA session id (inbound webhooks). */
  findByOpenwaSessionId(openwaSessionId: string): Promise<Session | null> {
    return this.sessions.findOne({ where: { sessionId: openwaSessionId } });
  }

  async update(
    id: string,
    workspaceId: string,
    userId: string,
    dto: UpdateSessionDto,
  ) {
    const session = await this.findOne(id, workspaceId, userId);
    Object.assign(session, dto);
    return this.sessions.save(session);
  }

  async remove(id: string, workspaceId: string, userId: string) {
    await this.workspaces.assertRole(workspaceId, userId, ['owner', 'admin']);
    const session = await this.findOne(id, workspaceId, userId);
    const creds = await this.workspaces.getOpenwaCredentials(workspaceId);
    await this.openwa
      .terminateSession(creds, session.sessionId)
      .catch(() => undefined);
    await this.sessions.remove(session);
    return { message: 'Session deleted' };
  }

  async start(id: string, workspaceId: string, userId: string) {
    const session = await this.findOne(id, workspaceId, userId);
    const creds = await this.workspaces.getOpenwaCredentials(workspaceId);
    await this.setStatus(session, 'connecting');
    await this.openwa.startSession(creds, session.sessionId);
    return this.sessions.findOne({ where: { id } });
  }

  async stop(id: string, workspaceId: string, userId: string) {
    const session = await this.findOne(id, workspaceId, userId);
    const creds = await this.workspaces.getOpenwaCredentials(workspaceId);
    await this.openwa.terminateSession(creds, session.sessionId);
    await this.setStatus(session, 'disconnected');
    return this.sessions.findOne({ where: { id } });
  }

  async getQr(id: string, workspaceId: string, userId: string) {
    const session = await this.findOne(id, workspaceId, userId);
    const creds = await this.workspaces.getOpenwaCredentials(workspaceId);
    const res = await this.openwa.getQrCode(creds, session.sessionId);
    const qr = (res.response as string) || (res as any).qr || null;
    if (qr) this.gateway.emitSessionQr(workspaceId, id, qr);
    return { qr };
  }

  async getStatus(id: string, workspaceId: string, userId: string) {
    const session = await this.findOne(id, workspaceId, userId);
    const creds = await this.workspaces.getOpenwaCredentials(workspaceId);
    const res = await this.openwa
      .getConnectionState(creds, session.sessionId)
      .catch(() => null);
    const remoteState = (res?.response as string) || null;
    const mapped = this.mapState(remoteState);
    if (mapped && mapped !== session.status) {
      await this.setStatus(session, mapped);
    }
    return { status: mapped || session.status, remoteState };
  }

  private mapState(state: string | null): SessionStatus | null {
    if (!state) return null;
    switch (state) {
      case 'CONNECTED':
        return 'connected';
      case 'TIMEOUT':
      case 'UNLAUNCHED':
      case 'UNPAIRED':
      case 'UNPAIRED_IDLE':
        return 'disconnected';
      case 'OPENING':
      case 'PAIRING':
        return 'connecting';
      case 'CONFLICT':
        return 'error';
      default:
        return null;
    }
  }

  async setStatus(
    session: Session,
    status: SessionStatus,
    phone?: string | null,
  ) {
    session.status = status;
    session.lastActiveAt = new Date();
    if (phone !== undefined) session.phoneNumber = phone;
    await this.sessions.save(session);
    this.gateway.emitSessionStatus(
      session.workspaceId,
      session.id,
      status,
      session.phoneNumber,
    );
  }
}
