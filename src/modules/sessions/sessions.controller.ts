import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';

@ApiTags('Sessions')
@ApiBearerAuth()
@ApiHeader({ name: 'x-workspace-id', required: true })
@Controller('sessions')
export class SessionsController {
  constructor(private readonly service: SessionsService) {}

  @Get()
  findAll(@WorkspaceId() ws: string, @CurrentUser('id') uid: string) {
    return this.service.findAll(ws, uid);
  }

  @Post()
  create(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Body() dto: CreateSessionDto,
  ) {
    return this.service.create(ws, uid, dto);
  }

  @Get(':id')
  findOne(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(id, ws, uid);
  }

  @Patch(':id')
  update(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSessionDto,
  ) {
    return this.service.update(id, ws, uid, dto);
  }

  @Get(':id/qr')
  qr(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getQr(id, ws, uid);
  }

  @Post(':id/start')
  @HttpCode(200)
  start(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.start(id, ws, uid);
  }

  @Post(':id/stop')
  @HttpCode(200)
  stop(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.stop(id, ws, uid);
  }

  @Get(':id/status')
  status(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getStatus(id, ws, uid);
  }

  @Delete(':id')
  remove(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(id, ws, uid);
  }
}
