import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import jwtConfig from './config/jwt.config';
import openwaConfig from './config/openwa.config';

import { JwtAuthGuard } from './common/guards/jwt.guard';
import { HealthController } from './health.controller';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { OpenwaModule } from './openwa/openwa.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { MessagesModule } from './modules/messages/messages.module';
import { QueueModule } from './queue/queue.module';
import { AutomationsModule } from './modules/automations/automations.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { BroadcastsModule } from './modules/broadcasts/broadcasts.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig, openwaConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('database.host'),
        port: config.get('database.port'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        database: config.get('database.database'),
        autoLoadEntities: true,
        synchronize: config.get<boolean>('database.synchronize'),
        logging: config.get<boolean>('database.logging'),
      }),
    }),
    CacheModule.register({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('app.throttle.ttl')! * 1000,
            limit: config.get<number>('app.throttle.limit')!,
          },
        ],
      }),
    }),
    ScheduleModule.forRoot(),

    // Phase 1
    AuthModule,
    UsersModule,
    WorkspacesModule,
    ApiKeysModule,

    // Phase 2
    OpenwaModule,
    QueueModule,
    SessionsModule,
    MessagesModule,

    // Phase 3
    AutomationsModule,

    // Phase 4
    ContactsModule,
    BroadcastsModule,
    WebhooksModule,

    // Phase 5
    AnalyticsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
