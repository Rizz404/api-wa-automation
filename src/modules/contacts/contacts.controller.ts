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
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiTags,
} from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { QueryContactsDto } from './dto/query-contacts.dto';
import {
  CreateContactGroupDto,
  UpdateContactGroupDto,
} from './dto/contact-group.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { parseCsvContacts } from './csv.util';

@ApiTags('Contacts')
@ApiBearerAuth()
@ApiHeader({ name: 'x-workspace-id', required: true })
@Controller('contacts')
export class ContactsController {
  constructor(private readonly service: ContactsService) {}

  // --- Groups (declared before :id routes to avoid conflicts) ---

  @Get('groups')
  listGroups(@WorkspaceId() ws: string, @CurrentUser('id') uid: string) {
    return this.service.listGroups(ws, uid);
  }

  @Post('groups')
  createGroup(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Body() dto: CreateContactGroupDto,
  ) {
    return this.service.createGroup(ws, uid, dto);
  }

  @Patch('groups/:id')
  updateGroup(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactGroupDto,
  ) {
    return this.service.updateGroup(id, ws, uid, dto);
  }

  @Delete('groups/:id')
  removeGroup(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.removeGroup(id, ws, uid);
  }

  // --- Contacts ---

  @Get()
  findAll(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Query() query: QueryContactsDto,
  ) {
    return this.service.findAll(ws, uid, query);
  }

  @Post()
  create(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Body() dto: CreateContactDto,
  ) {
    return this.service.create(ws, uid, dto);
  }

  @Post('import')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  importCsv(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const rows = parseCsvContacts(file?.buffer?.toString('utf8') || '');
    return this.service.importMany(ws, uid, rows);
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
    @Body() dto: UpdateContactDto,
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

  @Post(':id/blacklist')
  @HttpCode(200)
  blacklist(
    @WorkspaceId() ws: string,
    @CurrentUser('id') uid: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.blacklist(id, ws, uid);
  }
}
