import { Injectable } from '@nestjs/common';

export interface MessageTriggerConfig {
  keywords?: string[];
  match_type?: 'exact' | 'contains' | 'starts_with' | 'regex';
  from_phone?: string | null;
  is_group?: boolean;
}

export interface IncomingMessageContext {
  message: string;
  from: string;
  isGroup?: boolean;
}

@Injectable()
export class TriggerEngine {
  /** Decides whether an incoming message satisfies a message-trigger config. */
  matchesMessage(
    config: MessageTriggerConfig,
    ctx: IncomingMessageContext,
  ): boolean {
    if (config.from_phone && config.from_phone !== ctx.from) return false;
    if (config.is_group !== undefined && !!ctx.isGroup !== config.is_group) {
      return false;
    }
    const keywords = config.keywords || [];
    if (keywords.length === 0) return true; // no keyword = match all

    const text = (ctx.message || '').toLowerCase();
    const matchType = config.match_type || 'contains';

    return keywords.some((raw) => {
      const kw = raw.toLowerCase();
      switch (matchType) {
        case 'exact':
          return text === kw;
        case 'starts_with':
          return text.startsWith(kw);
        case 'regex':
          try {
            return new RegExp(raw, 'i').test(ctx.message);
          } catch {
            return false;
          }
        case 'contains':
        default:
          return text.includes(kw);
      }
    });
  }
}
