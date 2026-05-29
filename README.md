# WA Automation Backend

WhatsApp automation backend (NestJS 11 · PostgreSQL 16 · Redis 7 · BullMQ · TypeORM · Socket.IO) integrating the OpenWA API. Implements the full feature set in [plan.md](plan.md).

## Quick start

```bash
# 1. Start infrastructure (Postgres + Redis)
docker compose up -d

# 2. Configure environment
cp .env.example .env   # edit values as needed

# 3. Install & run
npm install
npm run start:dev
```

- API base: `http://localhost:3000/api`
- Swagger docs: `http://localhost:3000/docs`
- Health: `http://localhost:3000/health`

`DB_SYNC=true` (default in `.env.example`) auto-creates tables in development.
For production set `DB_SYNC=false` and use migrations (`npm run migration:generate -- migrations/Init`).

## Architecture

| Layer | What |
| ----- | ---- |
| `config/` | Namespaced `@nestjs/config` factories (app, database, redis, jwt, openwa) |
| `common/` | Guards (JWT, API key, master key), decorators (`@CurrentUser`, `@WorkspaceId`, `@Public`), exception filter, response interceptor, helpers (AES-256-GCM encryption, pagination, template) |
| `openwa/` | Multi-tenant HTTP wrapper around the OpenWA EASY API |
| `queue/` | BullMQ connection + queue registration (`wa-messages`, `wa-broadcasts`, `wa-webhooks`, `wa-automations`) |
| `modules/` | Feature modules (see below) |

### Modules

- **auth** — register/login/refresh/logout (JWT access + refresh, refresh tokens tracked in Redis cache).
- **users** — profile, password change, account deletion.
- **workspaces** — multi-tenant workspaces, members/roles, encrypted OpenWA credentials.
- **api-keys** — SHA-256 hashed keys, full key returned once, validated via `ApiKeyGuard`.
- **sessions** — WhatsApp sessions via OpenWA, QR, start/stop/status, realtime gateway.
- **messages** — queued send (text/image/file), bulk send with anti-spam delay, log search.
- **automations** — trigger (message/schedule/webhook) + ordered action engine (send/delay/condition branching), cron scheduler, inbound dispatch.
- **broadcasts** — templated blast with per-message delay, progress events, cancel mid-flight, reports.
- **contacts** — CRUD, CSV import, tags, blacklist, groups.
- **webhooks** — outbound webhooks with HMAC signing and custom retry backoff (0s → 30s → 5m), delivery log.
- **analytics** — overview, message/automation/session/broadcast stats.

## Auth & multi-tenancy

All routes require a JWT (`Authorization: Bearer <token>`) except those marked `@Public()`.
Workspace-scoped endpoints expect the active workspace via the `x-workspace-id` header.
Machine-to-machine access uses `x-api-key` (guarded by `ApiKeyGuard`).
OpenWA inbound callbacks use `x-master-key` (guarded by `MasterKeyGuard`).

## Realtime (Socket.IO)

Connect, then `join_workspace` / `join_session`. Server emits `session.status`, `session.qr`,
`message.received`, `message.sent`, `broadcast.progress`, `automation.triggered`.

## OpenWA inbound wiring

Point your OpenWA instance's message webhook at `POST /api/inbound/message` with header
`x-master-key: <OPENWA_MASTER_KEY>` and body `{ session, from, body, isGroupMsg }`. This records
the inbound log, emits realtime events, fans out to subscribed webhooks, and triggers matching
message automations.
