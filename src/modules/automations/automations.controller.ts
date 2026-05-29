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
import { AutomationsService } from './automations.service';
import { CreateAutomationDto } from './dto/create-automation.dto';
import { UpdateAutomationDto } from './dto/update-automation.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';

@ApiTags('Automations')
@ApiBearerAuth()
@ApiHeader({ name: 'x-workspace-id', required: true })
@Controller('automations')
export class AutomationsController {
  constructor(private readonly service: AutomationsService) {}

  @Get()
  findAll(@WorkspaceId() ws: string, @CurrentUser('id') uid: string) {
    return this.service.findAll(ws, uid);
  }

  @Post()
  create(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Body() dto: CreateAutomationDto,
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
    @Body() dto: UpdateAutomationDto,
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

  @Post(':id/enable')
  @HttpCode(200)
  enable(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.setActive(id, ws, uid, true);
  }

  @Post(':id/disable')
  @HttpCode(200)
  disable(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.setActive(id, ws, uid, false);
  }

  @Post(':id/test')
  @HttpCode(200)
  test(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.service.test(id, ws, uid, body);
  }
}
