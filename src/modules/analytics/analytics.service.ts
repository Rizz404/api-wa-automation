import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { MessageLog } from '../messages/entities/message-log.entity';
import { Automation } from '../automations/entities/automation.entity';
import { Session } from '../sessions/entities/session.entity';
import { Broadcast } from '../broadcasts/entities/broadcast.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(MessageLog)
    private readonly messages: Repository<MessageLog>,
    @InjectRepository(Automation)
    private readonly automations: Repository<Automation>,
    @InjectRepository(Session)
    private readonly sessions: Repository<Session>,
    @InjectRepository(Broadcast)
    private readonly broadcasts: Repository<Broadcast>,
    private readonly workspaces: WorkspacesService,
  ) {}

  private dayRange(date = new Date()) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  async overview(workspaceId: string, userId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    const { start, end } = this.dayRange();

    const [messagesToday, inbound, outbound, failed, activeSessions, activeAutomations] =
      await Promise.all([
        this.messages.count({
          where: { workspaceId, createdAt: Between(start, end) },
        }),
        this.messages.count({
          where: { workspaceId, direction: 'in', createdAt: Between(start, end) },
        }),
        this.messages.count({
          where: { workspaceId, direction: 'out', createdAt: Between(start, end) },
        }),
        this.messages.count({
          where: { workspaceId, status: 'failed', createdAt: Between(start, end) },
        }),
        this.sessions.count({ where: { workspaceId, status: 'connected' } }),
        this.automations.count({ where: { workspaceId, isActive: true } }),
      ]);

    return {
      date: start.toISOString().slice(0, 10),
      messagesToday,
      inbound,
      outbound,
      failed,
      activeSessions,
      activeAutomations,
    };
  }

  async messages_(
    workspaceId: string,
    userId: string,
    from?: string,
    to?: string,
  ) {
    await this.workspaces.assertMember(workspaceId, userId);
    const start = from ? new Date(from) : this.dayRange().start;
    const end = to ? new Date(to) : new Date();
    const rows = await this.messages
      .createQueryBuilder('m')
      .select("DATE(m.created_at)", 'day')
      .addSelect('m.direction', 'direction')
      .addSelect('COUNT(*)', 'count')
      .where('m.workspace_id = :workspaceId', { workspaceId })
      .andWhere('m.created_at BETWEEN :start AND :end', { start, end })
      .groupBy('day')
      .addGroupBy('m.direction')
      .orderBy('day', 'ASC')
      .getRawMany();
    return rows;
  }

  async automationStats(workspaceId: string, userId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    const list = await this.automations.find({ where: { workspaceId } });
    return list
      .map((a) => ({
        id: a.id,
        name: a.name,
        isActive: a.isActive,
        runCount: a.runCount,
        lastRunAt: a.lastRunAt,
      }))
      .sort((a, b) => b.runCount - a.runCount);
  }

  async sessionStats(workspaceId: string, userId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    const rows = await this.messages
      .createQueryBuilder('m')
      .select('m.session_id', 'sessionId')
      .addSelect('COUNT(*)', 'count')
      .where('m.workspace_id = :workspaceId', { workspaceId })
      .groupBy('m.session_id')
      .getRawMany();
    const sessions = await this.sessions.find({ where: { workspaceId } });
    return sessions.map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      messageCount: Number(
        rows.find((r) => r.sessionId === s.id)?.count || 0,
      ),
    }));
  }

  async broadcastStats(workspaceId: string, userId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    const list = await this.broadcasts.find({ where: { workspaceId } });
    return {
      total: list.length,
      byStatus: list.reduce<Record<string, number>>((acc, b) => {
        acc[b.status] = (acc[b.status] || 0) + 1;
        return acc;
      }, {}),
      totalSent: list.reduce((sum, b) => sum + b.sentCount, 0),
      totalFailed: list.reduce((sum, b) => sum + b.failedCount, 0),
    };
  }
}
