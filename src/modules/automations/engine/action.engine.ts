import { Injectable, Logger } from '@nestjs/common';
import { AutomationAction } from '../entities/automation-action.entity';
import { OpenwaService, OpenwaCredentials } from '../../../openwa/openwa.service';
import { MessagesService } from '../../messages/messages.service';
import { ConditionEngine, ConditionConfig } from './condition.engine';
import { renderTemplate } from '../../../common/helpers/template.helper';

export interface ActionRunContext {
  workspaceId: string;
  sessionId: string; // DB session id
  openwaSessionId: string;
  creds: OpenwaCredentials;
  to: string; // recipient phone
  automationId?: string;
  variables: Record<string, any>;
}

@Injectable()
export class ActionEngine {
  private readonly logger = new Logger(ActionEngine.name);

  constructor(
    private readonly openwa: OpenwaService,
    private readonly messages: MessagesService,
    private readonly conditions: ConditionEngine,
  ) {}

  /**
   * Runs the action list in order. `condition` actions may jump to a
   * specific order; `delay` actions pause execution.
   */
  async run(actions: AutomationAction[], ctx: ActionRunContext): Promise<void> {
    const sorted = [...actions].sort((a, b) => a.order - b.order);
    const byOrder = new Map(sorted.map((a) => [a.order, a]));
    let index = 0;

    // Guard against infinite loops from misconfigured condition jumps.
    let steps = 0;
    const maxSteps = sorted.length * 4 + 10;

    while (index < sorted.length && steps < maxSteps) {
      steps++;
      const action = sorted[index];
      const next = await this.execute(action, ctx, byOrder);
      if (next === undefined) {
        index++;
      } else {
        const target = sorted.findIndex((a) => a.order === next);
        index = target === -1 ? sorted.length : target;
      }
    }
  }

  /** Returns the next order to jump to, or undefined to continue sequentially. */
  private async execute(
    action: AutomationAction,
    ctx: ActionRunContext,
    _byOrder: Map<number, AutomationAction>,
  ): Promise<number | undefined> {
    const cfg = action.actionConfig || {};
    switch (action.actionType) {
      case 'send_text': {
        const message = renderTemplate(cfg.message || '', ctx.variables);
        if (cfg.delay_ms) await this.sleep(cfg.delay_ms);
        await this.openwa.sendText(ctx.creds, ctx.openwaSessionId, ctx.to, message);
        await this.log(ctx, 'text', message);
        return undefined;
      }
      case 'send_image': {
        const caption = renderTemplate(cfg.caption || '', ctx.variables);
        await this.openwa.sendImage(
          ctx.creds,
          ctx.openwaSessionId,
          ctx.to,
          cfg.image_url,
          caption,
        );
        await this.log(ctx, 'image', cfg.image_url);
        return undefined;
      }
      case 'send_file': {
        await this.openwa.sendFile(
          ctx.creds,
          ctx.openwaSessionId,
          ctx.to,
          cfg.file_url,
          cfg.filename || 'file',
          renderTemplate(cfg.caption || '', ctx.variables),
        );
        await this.log(ctx, 'file', cfg.file_url);
        return undefined;
      }
      case 'forward': {
        const target = cfg.to || ctx.to;
        const message = renderTemplate(cfg.message || '', ctx.variables);
        await this.openwa.sendText(ctx.creds, ctx.openwaSessionId, target, message);
        return undefined;
      }
      case 'delay': {
        await this.sleep(cfg.duration_ms || 1000);
        return undefined;
      }
      case 'condition': {
        const result = this.conditions.evaluate(
          cfg as ConditionConfig,
          ctx.variables,
        );
        const target = result
          ? cfg.if_true_action_order
          : cfg.if_false_action_order;
        return typeof target === 'number' ? target : undefined;
      }
      default:
        this.logger.warn(`Unknown action type: ${action.actionType}`);
        return undefined;
    }
  }

  private async log(ctx: ActionRunContext, type: any, content: string) {
    await this.messages
      .record({
        workspaceId: ctx.workspaceId,
        sessionId: ctx.sessionId,
        automationId: ctx.automationId || null,
        direction: 'out',
        toPhone: ctx.to,
        messageType: type,
        content,
        status: 'sent',
      })
      .catch(() => undefined);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
