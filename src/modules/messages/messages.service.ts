import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Brackets, Repository } from 'typeorm';
import { MessageLog } from './entities/message-log.entity';
import { SendMessageDto } from './dto/send-text.dto';
import { SendBulkDto } from './dto/send-bulk.dto';
import { QueryLogsDto } from './dto/query-logs.dto';
import { QUEUE_MESSAGES } from '../../queue/queue.constants';
import { SendMessageJob } from '../../queue/jobs/job.types';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { SessionsService } from '../sessions/sessions.service';
import { buildPagination } from '../../common/helpers/pagination.helper';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(MessageLog)
    private readonly logs: Repository<MessageLog>,
    @InjectQueue(QUEUE_MESSAGES) private readonly queue: Queue<SendMessageJob>,
    private readonly workspaces: WorkspacesService,
    private readonly sessions: SessionsService,
  ) {}

  async send(workspaceId: string, userId: string, dto: SendMessageDto) {
    await this.workspaces.assertMember(workspaceId, userId);
    const session = await this.sessions.findOne(dto.sessionId, workspaceId, userId);
    const job = await this.queue.add('send', {
      workspaceId,
      sessionId: session.id,
      openwaSessionId: session.sessionId,
      to: dto.to,
      type: dto.type || 'text',
      content: dto.content,
      mediaUrl: dto.mediaUrl,
      caption: dto.caption,
      filename: dto.filename,
    });
    return { queued: true, jobId: job.id };
  }

  async sendBulk(workspaceId: string, userId: string, dto: SendBulkDto) {
    await this.workspaces.assertMember(workspaceId, userId);
    const session = await this.sessions.findOne(dto.sessionId, workspaceId, userId);
    const delay = dto.delayMs ?? 3000;
    let i = 0;
    for (const to of dto.recipients) {
      await this.queue.add(
        'send',
        {
          workspaceId,
          sessionId: session.id,
          openwaSessionId: session.sessionId,
          to,
          type: 'text',
          content: dto.content,
        },
        { delay: i * delay },
      );
      i++;
    }
    return { queued: true, count: dto.recipients.length };
  }

  async findLogs(workspaceId: string, userId: string, query: QueryLogsDto) {
    await this.workspaces.assertMember(workspaceId, userId);
    const qb = this.logs
      .createQueryBuilder('log')
      .where('log.workspace_id = :workspaceId', { workspaceId });
    if (query.sessionId)
      qb.andWhere('log.session_id = :sessionId', { sessionId: query.sessionId });
    if (query.direction)
      qb.andWhere('log.direction = :direction', { direction: query.direction });
    if (query.status)
      qb.andWhere('log.status = :status', { status: query.status });
    if (query.phone)
      qb.andWhere(
        new Brackets((b) =>
          b
            .where('log.from_phone ILIKE :p', { p: `%${query.phone}%` })
            .orWhere('log.to_phone ILIKE :p', { p: `%${query.phone}%` }),
        ),
      );
    qb.orderBy('log.created_at', 'DESC')
      .skip(query.skip)
      .take(query.limit);
    const [data, total] = await qb.getManyAndCount();
    return buildPagination(data, total, query.page, query.limit);
  }

  async findLog(id: string, workspaceId: string, userId: string) {
    await this.workspaces.assertMember(workspaceId, userId);
    const log = await this.logs.findOne({ where: { id, workspaceId } });
    if (!log) throw new NotFoundException('Message log not found');
    return log;
  }

  /** Persist a log row (used by processors). */
  record(data: Partial<MessageLog>): Promise<MessageLog> {
    return this.logs.save(this.logs.create(data));
  }
}
