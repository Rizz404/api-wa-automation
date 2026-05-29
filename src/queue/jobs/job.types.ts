export interface SendMessageJob {
  workspaceId: string;
  sessionId: string; // DB session id
  openwaSessionId: string;
  to: string;
  type: 'text' | 'image' | 'file';
  content?: string;
  mediaUrl?: string;
  caption?: string;
  filename?: string;
  automationId?: string;
  broadcastId?: string;
}

export interface BroadcastJob {
  broadcastId: string;
}

export interface WebhookJob {
  webhookId: string;
  event: string;
  payload: Record<string, any>;
}

export interface AutomationJob {
  automationId: string;
  workspaceId: string;
  context: Record<string, any>; // trigger context (incoming message, etc.)
}
