import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import {
  QUEUE_AUTOMATIONS,
  QUEUE_BROADCASTS,
  QUEUE_MESSAGES,
  QUEUE_WEBHOOKS,
} from './queue.constants';

/**
 * Central BullMQ infrastructure: configures the Redis connection and
 * registers every queue. The queues are exported globally so feature
 * modules can `@InjectQueue(...)` to enqueue jobs and bind their own
 * processors (kept beside the services that own the domain logic).
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          password: config.get<string>('redis.password') || undefined,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_MESSAGES },
      { name: QUEUE_BROADCASTS },
      { name: QUEUE_WEBHOOKS },
      { name: QUEUE_AUTOMATIONS },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
