import { Injectable } from '@nestjs/common';

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'regex'
  | 'gt'
  | 'lt';

export interface ConditionConfig {
  field: string;
  operator: ConditionOperator;
  value: any;
  if_true_action_order?: number;
  if_false_action_order?: number;
}

@Injectable()
export class ConditionEngine {
  evaluate(config: ConditionConfig, context: Record<string, any>): boolean {
    const actual = this.resolve(config.field, context);
    const expected = config.value;
    const a = actual == null ? '' : String(actual);
    const e = expected == null ? '' : String(expected);

    switch (config.operator) {
      case 'equals':
        return a === e;
      case 'not_equals':
        return a !== e;
      case 'contains':
        return a.toLowerCase().includes(e.toLowerCase());
      case 'not_contains':
        return !a.toLowerCase().includes(e.toLowerCase());
      case 'starts_with':
        return a.toLowerCase().startsWith(e.toLowerCase());
      case 'ends_with':
        return a.toLowerCase().endsWith(e.toLowerCase());
      case 'regex':
        try {
          return new RegExp(e, 'i').test(a);
        } catch {
          return false;
        }
      case 'gt':
        return Number(actual) > Number(expected);
      case 'lt':
        return Number(actual) < Number(expected);
      default:
        return false;
    }
  }

  private resolve(field: string, context: Record<string, any>): any {
    return field
      .split('.')
      .reduce<any>((acc, part) => (acc == null ? acc : acc[part]), context);
  }
}
