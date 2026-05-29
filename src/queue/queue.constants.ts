export const QUEUE_MESSAGES = 'wa-messages';
export const QUEUE_BROADCASTS = 'wa-broadcasts';
export const QUEUE_WEBHOOKS = 'wa-webhooks';
export const QUEUE_AUTOMATIONS = 'wa-automations';

export const ALL_QUEUES = [
  QUEUE_MESSAGES,
  QUEUE_BROADCASTS,
  QUEUE_WEBHOOKS,
  QUEUE_AUTOMATIONS,
] as const;
