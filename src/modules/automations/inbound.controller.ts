import {
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiHeader } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { MasterKeyGuard } from '../../common/guards/master-key.guard';
import { AutomationsService } from './automations.service';
import { SessionsService } from '../sessions/sessions.service';
import { MessagesService } from '../messages/messages.service';
import { SessionsGateway } from '../sessions/sessions.gateway';
import { WebhooksService } from '../webhooks/webhooks.service';
import { renderTemplate } from '../../common/helpers/template.helper';

interface InboundMessageDto {
  session: string; // OpenWA session id
  from: string;
  body: string;
  isGroupMsg?: boolean;
}

/**
 * Inbound callbacks invoked by OpenWA (or its webhook config) when events
 * happen on a WhatsApp session. Protected by the OPENWA master key.
 */
@ApiTags('Inbound (OpenWA)')
@Controller()
export class InboundController {
  constructor(
    private readonly automations: AutomationsService,
    private readonly sessions: SessionsService,
    private readonly messages: MessagesService,
    private readonly gateway: SessionsGateway,
    private readonly webhooks: WebhooksService,
  ) {}

  @Public()
  @UseGuards(MasterKeyGuard)
  @ApiHeader({ name: 'x-master-key', required: true })
  @Post('inbound/message')
  @HttpCode(200)
  async onMessage(@Body() dto: InboundMessageDto) {
    const session = await this.sessions.findByOpenwaSessionId(dto.session);
    if (!session) return { ignored: true };

    await this.messages
      .record({
        workspaceId: session.workspaceId,
        sessionId: session.id,
        direction: 'in',
        fromPhone: dto.from,
        messageType: 'text',
        content: dto.body,
        status: 'delivered',
      })
      .catch(() => undefined);

    this.gateway.emitMessageReceived(session.workspaceId, session.id, {
      sessionId: session.id,
      from: dto.from,
      message: dto.body,
      timestamp: new Date().toISOString(),
    });

    await this.webhooks.dispatch(session.workspaceId, 'message.received', {
      sessionId: session.id,
      from: dto.from,
      message: dto.body,
    });

    const result = await this.automations.dispatchIncomingMessage(
      session.workspaceId,
      {
        message: dto.body,
        from: dto.from,
        isGroup: dto.isGroupMsg,
        // expose session so the automation can run without an explicit one
        ...({ sessionId: session.id } as any),
      },
    );
    return { ok: true, ...result };
  }

  @Public()
  @Post('automations/hook/:token')
  @HttpCode(200)
  async webhookTrigger(
    @Param('token') token: string,
    @Body() body: Record<string, any>,
  ) {
    const automation = await this.automations.findByWebhookPath(
      `/trigger/${token}`,
    );
    if (!automation) return { ignored: true };

    const cfg = automation.triggerConfig as any;
    const phone = cfg.phone_field ? body[cfg.phone_field] : body.phone;
    const context: Record<string, any> = {
      ...body,
      from: phone,
      to: phone,
      sessionId: automation.sessionId,
    };
    if (cfg.message_template) {
      context.message = renderTemplate(cfg.message_template, body);
    }
    return this.automations.enqueueRun(automation, context);
  }
}
