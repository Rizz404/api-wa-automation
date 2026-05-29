import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-text.dto';
import { SendBulkDto } from './dto/send-bulk.dto';
import { QueryLogsDto } from './dto/query-logs.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';

@ApiTags('Messages')
@ApiBearerAuth()
@ApiHeader({ name: 'x-workspace-id', required: true })
@Controller('messages')
export class MessagesController {
  constructor(private readonly service: MessagesService) {}

  @Post('send')
  send(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.service.send(ws, uid, dto);
  }

  @Post('send-bulk')
  sendBulk(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Body() dto: SendBulkDto,
  ) {
    return this.service.sendBulk(ws, uid, dto);
  }

  @Get('logs')
  logs(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Query() query: QueryLogsDto,
  ) {
    return this.service.findLogs(ws, uid, query);
  }

  @Get('logs/:id')
  log(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findLog(id, ws, uid);
  }
}
