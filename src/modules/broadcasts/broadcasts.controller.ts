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
import { BroadcastsService } from './broadcasts.service';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';
import { UpdateBroadcastDto } from './dto/update-broadcast.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';

@ApiTags('Broadcasts')
@ApiBearerAuth()
@ApiHeader({ name: 'x-workspace-id', required: true })
@Controller('broadcasts')
export class BroadcastsController {
  constructor(private readonly service: BroadcastsService) {}

  @Get()
  findAll(@WorkspaceId() ws: string, @CurrentUser('id') uid: string) {
    return this.service.findAll(ws, uid);
  }

  @Post()
  create(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Body() dto: CreateBroadcastDto,
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
    @Body() dto: UpdateBroadcastDto,
  ) {
    return this.service.update(id, ws, uid, dto);
  }

  @Delete(':id')
  remove(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(id, ws, uid);
  }

  @Post(':id/send')
  @HttpCode(200)
  send(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.send(id, ws, uid);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.cancel(id, ws, uid);
  }

  @Get(':id/status')
  status(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.status(id, ws, uid);
  }

  @Get(':id/report')
  report(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.report(id, ws, uid);
  }
}
