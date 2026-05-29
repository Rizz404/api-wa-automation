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
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';

@ApiTags('Webhooks')
@ApiBearerAuth()
@ApiHeader({ name: 'x-workspace-id', required: true })
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  @Get()
  findAll(@WorkspaceId() ws: string, @CurrentUser('id') uid: string) {
    return this.service.findAll(ws, uid);
  }

  @Post()
  create(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Body() dto: CreateWebhookDto,
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
    @Body() dto: UpdateWebhookDto,
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

  @Post(':id/test')
  @HttpCode(200)
  test(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.test(id, ws, uid);
  }

  @Get(':id/logs')
  logs(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.logs(id, ws, uid);
  }
}
