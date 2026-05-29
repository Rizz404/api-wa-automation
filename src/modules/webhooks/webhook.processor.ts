import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { createHmac } from 'crypto';
import axios from 'axios';
import { QUEUE_WEBHOOKS } from '../../queue/queue.constants';
import { WebhookJob } from '../../queue/jobs/job.types';
import { WebhooksService } from './webhooks.service';

/**
 * Delivers outbound webhooks with HMAC-SHA256 signing and a custom retry
 * backoff: attempt 1 → immediate, attempt 2 → 30s, attempt 3+ → 5 minutes.
 */
@Processor(QUEUE_WEBHOOKS, {
  settings: {
    backoffStrategy: (attemptsMade: number) => {
      if (attemptsMade <= 1) return 0;
      if (attemptsMade === 2) return 30_000;
      return 300_000;
    },
  },
})
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(private readonly webhooks: WebhooksService) {
    super();
  }

  async process(job: Job<WebhookJob>): Promise<any> {
    const webhook = await this.webhooks.getById(job.data.webhookId);
    if (!webhook || !webhook.isActive) return { skipped: true };

    const body = JSON.stringify({
      event: job.data.event,
      data: job.data.payload,
      timestamp: new Date().toISOString(),
    });
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Event': job.data.event,
    };
    if (webhook.secret) {
      headers['X-Webhook-Signature'] = createHmac('sha256', webhook.secret)
        .update(body)
        .digest('hex');
    }

    try {
      const res = await axios.post(webhook.url, body, {
        headers,
        timeout: webhook.timeoutMs || 10000,
      });
      await this.webhooks.recordDelivery({
        webhookId: webhook.id,
        event: job.data.event,
        payload: job.data.payload,
        attempt: job.attemptsMade + 1,
        statusCode: res.status,
        status: 'success',
      });
      return { status: res.status };
    } catch (err: any) {
      const statusCode = err?.response?.status ?? null;
      const message = err instanceof Error ? err.message : String(err);
      await this.webhooks.recordDelivery({
        webhookId: webhook.id,
        event: job.data.event,
        payload: job.data.payload,
        attempt: job.attemptsMade + 1,
        statusCode,
        status: 'failed',
        error: message,
      });
      this.logger.warn(
        `Webhook ${webhook.id} delivery failed (attempt ${job.attemptsMade + 1}): ${message}`,
      );
      throw err;
    }
  }
}
