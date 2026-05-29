import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';

@ApiTags('Analytics')
@ApiBearerAuth()
@ApiHeader({ name: 'x-workspace-id', required: true })
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('overview')
  overview(@WorkspaceId() ws: string, @CurrentUser('id') uid: string) {
    return this.service.overview(ws, uid);
  }

  @Get('messages')
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  messages(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.messages_(ws, uid, from, to);
  }

  @Get('automations')
  automations(@WorkspaceId() ws: string, @CurrentUser('id') uid: string) {
    return this.service.automationStats(ws, uid);
  }

  @Get('sessions')
  sessions(@WorkspaceId() ws: string, @CurrentUser('id') uid: string) {
    return this.service.sessionStats(ws, uid);
  }

  @Get('broadcasts')
  broadcasts(@WorkspaceId() ws: string, @CurrentUser('id') uid: string) {
    return this.service.broadcastStats(ws, uid);
  }
}
