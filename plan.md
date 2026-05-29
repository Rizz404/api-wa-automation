# WA Automation Backend — Project Plan

> **Stack:** NestJS 11.x · Node.js 24 LTS · PostgreSQL 16 · Redis 7 · BullMQ 5.x · TypeORM 0.3.x
> **Scope:** Backend only (REST API + WebSocket)
> **Integrasi:** OpenWA API (`openwa.fts-tech.co.id`)

---

## Daftar Isi

1. [Overview](#1-overview)
2. [Tech Stack](#2-tech-stack)
3. [Arsitektur Sistem](#3-arsitektur-sistem)
4. [Struktur Folder](#4-struktur-folder)
5. [Database Schema](#5-database-schema)
6. [API Endpoints](#6-api-endpoints)
7. [Modul Detail](#7-modul-detail)
8. [Queue & Background Jobs](#8-queue--background-jobs)
9. [WebSocket Events](#9-websocket-events)
10. [Konfigurasi & Environment](#10-konfigurasi--environment)
11. [Docker Setup](#11-docker-setup)
12. [Phase & Timeline](#12-phase--timeline)
13. [Dependency List](#13-dependency-list)

---

## 1. Overview

Platform backend untuk otomasi WhatsApp berbasis OpenWA API. User dapat membuat workflow otomasi (trigger → action), melakukan broadcast pesan, manajemen kontak, dan menerima event realtime dari WhatsApp — semuanya lewat REST API yang terdokumentasi dengan Swagger.

**Fitur utama:**
- Multi-tenant (setiap user punya workspace sendiri)
- Auth dengan JWT + API Key
- Manajemen sesi WhatsApp (via OpenWA)
- Automation engine (trigger + action)
- Broadcast / blast messaging dengan delay anti-spam
- Auto-reply bot berbasis keyword
- Webhook outbound dengan HMAC signing
- Realtime status via Socket.IO
- Analytics & message logging

---

## 2. Tech Stack

| Layer       | Teknologi               | Versi     |
| ----------- | ----------------------- | --------- |
| Runtime     | Node.js LTS             | **24.x**  |
| Framework   | NestJS                  | **11.x**  |
| Language    | TypeScript              | **5.x**   |
| Database    | PostgreSQL              | **16**    |
| ORM         | TypeORM                 | **0.3.x** |
| Queue       | BullMQ + Redis          | **5.x**   |
| Cache       | Redis (via ioredis)     | **7.x**   |
| Realtime    | Socket.IO               | **4.x**   |
| Auth        | JWT + Passport          | -         |
| HTTP Client | Axios                   | -         |
| Docs        | Swagger (OpenAPI 3)     | -         |
| Container   | Docker + Docker Compose | -         |

---

## 3. Arsitektur Sistem

```
┌─────────────────────────────────────────────┐
│              CLIENT LAYER                   │
│  Next.js Frontend · Mobile · 3rd Party      │
└─────────────────┬───────────────────────────┘
                  │ HTTPS / WebSocket
┌─────────────────▼───────────────────────────┐
│           API GATEWAY MODULE                │
│  Auth Guard · Rate Limiter · Logger         │
│  Request Validator · Response Interceptor   │
└──┬──────────┬──────────┬────────────────────┘
   │          │          │
┌──▼──┐  ┌───▼───┐  ┌───▼──────┐  ┌──────────┐
│Auth │  │Session│  │Automation│  │ Messages │
│ JWT │  │  WA   │  │  Engine  │  │   API    │
└──┬──┘  └───┬───┘  └───┬──────┘  └────┬─────┘
   │         │          │               │
┌──▼─────────▼──────────▼───────────────▼─────┐
│            INFRASTRUCTURE LAYER             │
│  TypeORM │ BullMQ │ Socket.IO │ Cache       │
└──┬──────────┬──────────┬────────────────────┘
   │          │          │
┌──▼──┐  ┌───▼──┐  ┌────▼──────┐  ┌──────────┐
│ PG  │  │Redis │  │OpenWA API │  │  S3/     │
│ 16  │  │  7   │  │(openwa.   │  │ Storage  │
└─────┘  └──────┘  │fts-tech)  │  └──────────┘
                   └───────────┘
```

---

## 4. Struktur Folder

```
wa-automation-backend/
├── src/
│   ├── main.ts                         ← Bootstrap + Swagger setup
│   ├── app.module.ts                   ← Root module
│   │
│   ├── config/                         ← Konfigurasi environment
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   ├── jwt.config.ts
│   │   └── openwa.config.ts
│   │
│   ├── common/                         ← Shared utilities
│   │   ├── guards/
│   │   │   ├── jwt.guard.ts
│   │   │   └── api-key.guard.ts
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── workspace.decorator.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── interceptors/
│   │   │   └── response.interceptor.ts
│   │   ├── pipes/
│   │   │   └── validation.pipe.ts
│   │   └── helpers/
│   │       ├── encryption.helper.ts    ← AES-256 encrypt/decrypt
│   │       └── pagination.helper.ts
│   │
│   ├── modules/
│   │   │
│   │   ├── auth/                       ← Phase 1
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── register.dto.ts
│   │   │   │   ├── login.dto.ts
│   │   │   │   └── refresh-token.dto.ts
│   │   │   └── strategies/
│   │   │       ├── jwt.strategy.ts
│   │   │       └── jwt-refresh.strategy.ts
│   │   │
│   │   ├── users/                      ← Phase 1
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── dto/
│   │   │   │   └── update-user.dto.ts
│   │   │   └── entities/
│   │   │       └── user.entity.ts
│   │   │
│   │   ├── workspaces/                 ← Phase 1
│   │   │   ├── workspaces.module.ts
│   │   │   ├── workspaces.controller.ts
│   │   │   ├── workspaces.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-workspace.dto.ts
│   │   │   │   └── update-workspace.dto.ts
│   │   │   └── entities/
│   │   │       ├── workspace.entity.ts
│   │   │       └── workspace-member.entity.ts
│   │   │
│   │   ├── api-keys/                   ← Phase 1
│   │   │   ├── api-keys.module.ts
│   │   │   ├── api-keys.controller.ts
│   │   │   ├── api-keys.service.ts
│   │   │   ├── dto/
│   │   │   │   └── create-api-key.dto.ts
│   │   │   └── entities/
│   │   │       └── api-key.entity.ts
│   │   │
│   │   ├── sessions/                   ← Phase 2
│   │   │   ├── sessions.module.ts
│   │   │   ├── sessions.controller.ts
│   │   │   ├── sessions.service.ts
│   │   │   ├── sessions.gateway.ts     ← Socket.IO gateway
│   │   │   ├── dto/
│   │   │   │   ├── create-session.dto.ts
│   │   │   │   └── update-session.dto.ts
│   │   │   └── entities/
│   │   │       └── session.entity.ts
│   │   │
│   │   ├── messages/                   ← Phase 2
│   │   │   ├── messages.module.ts
│   │   │   ├── messages.controller.ts
│   │   │   ├── messages.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── send-text.dto.ts
│   │   │   │   ├── send-image.dto.ts
│   │   │   │   └── send-bulk.dto.ts
│   │   │   └── entities/
│   │   │       └── message-log.entity.ts
│   │   │
│   │   ├── automations/                ← Phase 3
│   │   │   ├── automations.module.ts
│   │   │   ├── automations.controller.ts
│   │   │   ├── automations.service.ts
│   │   │   ├── engine/
│   │   │   │   ├── trigger.engine.ts   ← Evaluasi trigger
│   │   │   │   ├── action.engine.ts    ← Eksekusi action
│   │   │   │   └── condition.engine.ts ← Filter kondisi
│   │   │   ├── dto/
│   │   │   │   ├── create-automation.dto.ts
│   │   │   │   └── update-automation.dto.ts
│   │   │   └── entities/
│   │   │       ├── automation.entity.ts
│   │   │       └── automation-action.entity.ts
│   │   │
│   │   ├── broadcasts/                 ← Phase 4
│   │   │   ├── broadcasts.module.ts
│   │   │   ├── broadcasts.controller.ts
│   │   │   ├── broadcasts.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-broadcast.dto.ts
│   │   │   │   └── send-broadcast.dto.ts
│   │   │   └── entities/
│   │   │       ├── broadcast.entity.ts
│   │   │       └── broadcast-recipient.entity.ts
│   │   │
│   │   ├── contacts/                   ← Phase 4
│   │   │   ├── contacts.module.ts
│   │   │   ├── contacts.controller.ts
│   │   │   ├── contacts.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-contact.dto.ts
│   │   │   │   └── import-contacts.dto.ts
│   │   │   └── entities/
│   │   │       ├── contact.entity.ts
│   │   │       └── contact-group.entity.ts
│   │   │
│   │   ├── webhooks/                   ← Phase 4
│   │   │   ├── webhooks.module.ts
│   │   │   ├── webhooks.controller.ts
│   │   │   ├── webhooks.service.ts
│   │   │   ├── dto/
│   │   │   │   └── create-webhook.dto.ts
│   │   │   └── entities/
│   │   │       └── webhook.entity.ts
│   │   │
│   │   └── analytics/                  ← Phase 5
│   │       ├── analytics.module.ts
│   │       ├── analytics.controller.ts
│   │       └── analytics.service.ts
│   │
│   ├── queue/                          ← Background jobs
│   │   ├── queue.module.ts
│   │   ├── queue.constants.ts          ← Nama queue
│   │   ├── processors/
│   │   │   ├── message.processor.ts    ← Kirim pesan
│   │   │   ├── broadcast.processor.ts  ← Blast messaging
│   │   │   └── webhook.processor.ts    ← Outbound webhook
│   │   └── jobs/
│   │       └── job.types.ts            ← Type definisi job
│   │
│   └── openwa/                         ← OpenWA HTTP client
│       ├── openwa.module.ts
│       ├── openwa.service.ts           ← Wrapper semua OpenWA endpoint
│       └── dto/
│           └── openwa-response.dto.ts
│
├── migrations/                         ← TypeORM migrations
├── test/                               ← E2E tests
├── docker-compose.yml                  ← Dev environment
├── docker-compose.prod.yml             ← Production
├── Dockerfile
├── .env.example
├── nest-cli.json
├── tsconfig.json
└── package.json
```

---

## 5. Database Schema

### `users`
```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
name          VARCHAR(100) NOT NULL
email         VARCHAR(255) UNIQUE NOT NULL
password      VARCHAR(255) NOT NULL          -- bcrypt hashed
is_active     BOOLEAN DEFAULT true
created_at    TIMESTAMP DEFAULT NOW()
updated_at    TIMESTAMP DEFAULT NOW()
```

### `workspaces`
```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
name              VARCHAR(100) NOT NULL
owner_id          UUID REFERENCES users(id)
openwa_base_url   VARCHAR(255) NOT NULL
openwa_api_key    TEXT NOT NULL              -- AES-256 encrypted
is_active         BOOLEAN DEFAULT true
created_at        TIMESTAMP DEFAULT NOW()
updated_at        TIMESTAMP DEFAULT NOW()
```

### `workspace_members`
```sql
workspace_id  UUID REFERENCES workspaces(id)
user_id       UUID REFERENCES users(id)
role          ENUM('owner', 'admin', 'member') DEFAULT 'member'
joined_at     TIMESTAMP DEFAULT NOW()
PRIMARY KEY (workspace_id, user_id)
```

### `api_keys`
```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
workspace_id  UUID REFERENCES workspaces(id)
name          VARCHAR(100) NOT NULL
key_hash      VARCHAR(255) NOT NULL          -- SHA-256 hash
key_prefix    VARCHAR(10) NOT NULL           -- Tampil di UI (wa_xxxx...)
last_used_at  TIMESTAMP
expires_at    TIMESTAMP                      -- NULL = tidak expire
is_active     BOOLEAN DEFAULT true
created_at    TIMESTAMP DEFAULT NOW()
```

### `sessions`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
workspace_id    UUID REFERENCES workspaces(id)
session_id      VARCHAR(100) NOT NULL        -- OpenWA session ID
name            VARCHAR(100) NOT NULL
phone_number    VARCHAR(20)
status          ENUM('idle','connecting','connected','disconnected','error')
last_active_at  TIMESTAMP
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
```

### `automations`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
workspace_id    UUID REFERENCES workspaces(id)
session_id      UUID REFERENCES sessions(id)
name            VARCHAR(100) NOT NULL
description     TEXT
is_active       BOOLEAN DEFAULT false
trigger_type    ENUM('message', 'schedule', 'webhook')
trigger_config  JSONB NOT NULL              -- Konfigurasi trigger
run_count       INTEGER DEFAULT 0
last_run_at     TIMESTAMP
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
```

### `automation_actions`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
automation_id   UUID REFERENCES automations(id)
order           SMALLINT NOT NULL
action_type     ENUM('send_text','send_image','send_file','forward','delay','condition')
action_config   JSONB NOT NULL
created_at      TIMESTAMP DEFAULT NOW()
```

### `contacts`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
workspace_id    UUID REFERENCES workspaces(id)
name            VARCHAR(100)
phone           VARCHAR(20) NOT NULL
tags            JSONB DEFAULT '[]'
is_blacklisted  BOOLEAN DEFAULT false
notes           TEXT
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
UNIQUE (workspace_id, phone)
```

### `contact_groups`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
workspace_id    UUID REFERENCES workspaces(id)
name            VARCHAR(100) NOT NULL
contact_ids     JSONB DEFAULT '[]'
created_at      TIMESTAMP DEFAULT NOW()
```

### `broadcasts`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
workspace_id    UUID REFERENCES workspaces(id)
session_id      UUID REFERENCES sessions(id)
name            VARCHAR(100) NOT NULL
template        TEXT NOT NULL               -- Bisa pakai {{variable}}
status          ENUM('draft','queued','sending','done','failed','cancelled')
delay_ms        INTEGER DEFAULT 3000        -- Delay antar pesan (anti-spam)
total           INTEGER DEFAULT 0
sent_count      INTEGER DEFAULT 0
failed_count    INTEGER DEFAULT 0
scheduled_at    TIMESTAMP                   -- NULL = kirim sekarang
started_at      TIMESTAMP
finished_at     TIMESTAMP
created_at      TIMESTAMP DEFAULT NOW()
```

### `broadcast_recipients`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
broadcast_id    UUID REFERENCES broadcasts(id)
phone           VARCHAR(20) NOT NULL
variables       JSONB DEFAULT '{}'          -- Untuk template variable
status          ENUM('pending','sent','failed')
error_message   TEXT
sent_at         TIMESTAMP
```

### `message_logs`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
workspace_id    UUID REFERENCES workspaces(id)
session_id      UUID REFERENCES sessions(id)
automation_id   UUID REFERENCES automations(id) -- NULLABLE
broadcast_id    UUID REFERENCES broadcasts(id)  -- NULLABLE
direction       ENUM('in', 'out')
from_phone      VARCHAR(20)
to_phone        VARCHAR(20)
message_type    ENUM('text','image','file','audio','video')
content         TEXT
status          ENUM('sent','delivered','read','failed')
wa_message_id   VARCHAR(100)                -- ID dari WhatsApp
error_message   TEXT
created_at      TIMESTAMP DEFAULT NOW()
```

### `webhooks`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
workspace_id    UUID REFERENCES workspaces(id)
name            VARCHAR(100) NOT NULL
url             VARCHAR(500) NOT NULL
secret          VARCHAR(255)                -- Untuk HMAC signature
events          JSONB DEFAULT '[]'          -- ['message.received', 'session.connected']
is_active       BOOLEAN DEFAULT true
retry_count     SMALLINT DEFAULT 3
timeout_ms      INTEGER DEFAULT 10000
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
```

---

## 6. API Endpoints

### Auth
```
POST   /auth/register           Daftar user baru
POST   /auth/login              Login, return JWT
POST   /auth/refresh            Refresh access token
POST   /auth/logout             Invalidate refresh token
```

### Users
```
GET    /users/me                Profil user saat ini
PATCH  /users/me                Update profil
PATCH  /users/me/password       Ganti password
DELETE /users/me                Hapus akun
```

### Workspaces
```
GET    /workspaces              List semua workspace user
POST   /workspaces              Buat workspace baru
GET    /workspaces/:id          Detail workspace
PATCH  /workspaces/:id          Update workspace
DELETE /workspaces/:id          Hapus workspace
GET    /workspaces/:id/members  List member
POST   /workspaces/:id/members  Invite member
DELETE /workspaces/:id/members/:userId  Remove member
```

### API Keys
```
GET    /api-keys                List API key (tampil prefix saja)
POST   /api-keys                Buat API key (return full key SEKALI)
DELETE /api-keys/:id            Hapus API key
```

### Sessions (WhatsApp)
```
GET    /sessions                List sesi WA
POST   /sessions                Buat sesi baru
GET    /sessions/:id            Detail sesi
GET    /sessions/:id/qr         Ambil QR code (base64)
POST   /sessions/:id/start      Start sesi
POST   /sessions/:id/stop       Stop sesi
DELETE /sessions/:id            Hapus sesi
GET    /sessions/:id/status     Status koneksi realtime
```

### Messages
```
POST   /messages/send           Kirim pesan teks/gambar
POST   /messages/send-bulk      Kirim ke banyak nomor
GET    /messages/logs           Riwayat pesan (dengan filter & pagination)
GET    /messages/logs/:id       Detail satu pesan
```

### Automations
```
GET    /automations             List automation
POST   /automations             Buat automation baru
GET    /automations/:id         Detail automation
PATCH  /automations/:id         Update automation
DELETE /automations/:id         Hapus automation
POST   /automations/:id/enable  Aktifkan automation
POST   /automations/:id/disable Non-aktifkan automation
POST   /automations/:id/test    Test jalankan automation
GET    /automations/:id/logs    Log eksekusi automation
```

### Broadcasts
```
GET    /broadcasts              List broadcast
POST   /broadcasts              Buat broadcast baru
GET    /broadcasts/:id          Detail broadcast
PATCH  /broadcasts/:id          Update broadcast (jika masih draft)
DELETE /broadcasts/:id          Hapus broadcast
POST   /broadcasts/:id/send     Mulai kirim broadcast
POST   /broadcasts/:id/cancel   Batalkan broadcast yang sedang jalan
GET    /broadcasts/:id/status   Progress pengiriman
GET    /broadcasts/:id/report   Laporan lengkap
```

### Contacts
```
GET    /contacts                List kontak (dengan filter & search)
POST   /contacts                Tambah kontak
POST   /contacts/import         Import dari CSV
GET    /contacts/:id            Detail kontak
PATCH  /contacts/:id            Update kontak
DELETE /contacts/:id            Hapus kontak
POST   /contacts/:id/blacklist  Blacklist nomor
GET    /contacts/groups         List group kontak
POST   /contacts/groups         Buat group
PATCH  /contacts/groups/:id     Update group
DELETE /contacts/groups/:id     Hapus group
```

### Webhooks
```
GET    /webhooks                List webhook
POST   /webhooks                Buat webhook baru
GET    /webhooks/:id            Detail webhook
PATCH  /webhooks/:id            Update webhook
DELETE /webhooks/:id            Hapus webhook
POST   /webhooks/:id/test       Kirim test event
GET    /webhooks/:id/logs       Log pengiriman webhook
```

### Analytics
```
GET    /analytics/overview      Ringkasan stats hari ini
GET    /analytics/messages      Stats pesan (range tanggal)
GET    /analytics/automations   Stats automation
GET    /analytics/sessions      Stats per sesi
GET    /analytics/broadcasts    Stats broadcast
```

---

## 7. Modul Detail

### Automation Engine

**Jenis Trigger:**
```json
// trigger_type: "message"
{
  "trigger_type": "message",
  "trigger_config": {
    "keywords": ["halo", "hello", "hi"],
    "match_type": "contains",         // exact | contains | starts_with | regex
    "from_phone": null,               // null = semua nomor
    "is_group": false
  }
}

// trigger_type: "schedule"
{
  "trigger_type": "schedule",
  "trigger_config": {
    "cron": "0 9 * * 1-5",            // Setiap hari kerja jam 9 pagi
    "timezone": "Asia/Jakarta",
    "target_phones": ["628111...", "628222..."]
  }
}

// trigger_type: "webhook"
{
  "trigger_type": "webhook",
  "trigger_config": {
    "webhook_path": "/trigger/abc123",  // URL unik
    "phone_field": "customer_phone",    // Ambil nomor dari body request
    "message_template": "Halo {{name}}, pesananmu {{order_id}} sudah dikirim!"
  }
}
```

**Jenis Action:**
```json
// action_type: "send_text"
{
  "action_type": "send_text",
  "action_config": {
    "message": "Halo {{name}}, terima kasih sudah menghubungi kami!",
    "delay_ms": 1000
  }
}

// action_type: "send_image"
{
  "action_type": "send_image",
  "action_config": {
    "image_url": "https://...",
    "caption": "Ini produk kami!"
  }
}

// action_type: "delay"
{
  "action_type": "delay",
  "action_config": {
    "duration_ms": 5000
  }
}

// action_type: "condition"
{
  "action_type": "condition",
  "action_config": {
    "field": "message",
    "operator": "contains",
    "value": "harga",
    "if_true_action_order": 3,
    "if_false_action_order": 5
  }
}
```

---

## 8. Queue & Background Jobs

**Queue names:**
```
wa-messages       Pengiriman pesan satu-satu
wa-broadcasts     Blast messaging dengan delay
wa-webhooks       Outbound webhook dengan retry
wa-automations    Eksekusi automation
```

**Job: broadcast processor**
```
1. Ambil daftar recipient yang belum terkirim
2. Untuk setiap recipient:
   a. Render template dengan variable
   b. Kirim via OpenWA API
   c. Update status recipient
   d. Delay `delay_ms` milidetik (anti-spam)
3. Update progress broadcast
4. Jika selesai, update status broadcast → 'done'
```

**Job: webhook processor (dengan retry)**
```
Attempt 1 → delay 0s
Attempt 2 → delay 30s
Attempt 3 → delay 5 menit
Jika semua gagal → mark webhook delivery failed
```

---

## 9. WebSocket Events

**Client → Server:**
```
join_workspace    { workspaceId }     Subscribe ke event workspace
leave_workspace   { workspaceId }     Unsubscribe
join_session      { sessionId }       Subscribe ke event sesi WA
```

**Server → Client:**
```
session.status    { sessionId, status, phone }
session.qr        { sessionId, qr }            QR code baru
session.connected { sessionId, phone }
message.received  { sessionId, from, message, timestamp }
message.sent      { sessionId, to, messageId, status }
broadcast.progress { broadcastId, sent, failed, total }
automation.triggered { automationId, phone, timestamp }
```

---

## 10. Konfigurasi & Environment

```env
# App
NODE_ENV=production
PORT=3000
APP_URL=https://api.wa-automation.fts-tech.co.id

# JWT
JWT_SECRET=random_string_min_64_karakter
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=random_string_berbeda_min_64_karakter
JWT_REFRESH_EXPIRES_IN=30d

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=wauser
DB_PASSWORD=password_kuat
DB_NAME=wa_automation
DB_SYNC=false
DB_LOGGING=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# OpenWA
OPENWA_BASE_URL=https://openwa.fts-tech.co.id
OPENWA_MASTER_KEY=api_key_dari_openwa

# Enkripsi (untuk simpan OpenWA API key user)
ENCRYPTION_KEY=32_karakter_tepat_untuk_aes_256

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

---

## 11. Docker Setup

### `docker-compose.yml` (Development)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: wa-automation-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: wauser
      POSTGRES_PASSWORD: wapassword
      POSTGRES_DB: wa_automation
    ports:
      - '127.0.0.1:5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U wauser']
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: wa-automation-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    ports:
      - '127.0.0.1:6379:6379'
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

### `Dockerfile` (Production)

```dockerfile
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:24-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/main.js"]
```

---

## 12. Phase & Timeline

| Phase     | Modul                                           | Durasi       | Output                                |
| --------- | ----------------------------------------------- | ------------ | ------------------------------------- |
| **1**     | Setup + Auth + Users + Workspaces + API Keys    | 3 hari       | Login, register, workspace management |
| **2**     | OpenWA client + Sessions + Messages + Socket.IO | 3 hari       | Bisa connect WA & kirim pesan         |
| **3**     | Automation engine + Queue setup                 | 5 hari       | Trigger & action berjalan             |
| **4**     | Broadcasts + Contacts + Webhooks                | 4 hari       | Blast & outbound webhook              |
| **5**     | Analytics + Polish + Swagger + Testing          | 3 hari       | Siap production                       |
| **Total** |                                                 | **~18 hari** | Full backend API                      |

### Urutan Prioritas Coding

```
Phase 1:
  [x] Setup NestJS project
  [x] Docker Compose (PG + Redis)
  [x] Database connection (TypeORM)
  [x] Auth module (register, login, JWT)
  [x] Users module
  [x] Workspaces module
  [x] API Keys module
  [x] Global guards, filters, interceptors

Phase 2:
  [x] OpenWA service (HTTP client wrapper)
  [x] Sessions module
  [x] Socket.IO gateway
  [x] Messages module
  [x] Queue module (BullMQ setup)

Phase 3:
  [x] Automation entity & CRUD
  [x] Trigger engine (message, schedule, webhook)
  [x] Action engine
  [x] Automation processor (queue)
  [x] Schedule module (cron)

Phase 4:
  [x] Contacts module + CSV import
  [x] Contact groups
  [x] Broadcasts module
  [x] Broadcast processor (queue + delay)
  [x] Webhooks module + HMAC signing
  [x] Webhook processor (queue + retry)

Phase 5:
  [x] Analytics service + queries
  [x] Swagger documentation lengkap
  [x] Rate limiting per endpoint (global ThrottlerGuard)
  [x] Health check endpoint
  [ ] Unit tests modul kritikal
  [ ] E2E tests auth flow
```

---

## 13. Dependency List

### Production Dependencies

```bash
npm install \
  @nestjs/config \
  @nestjs/typeorm \
  @nestjs/jwt \
  @nestjs/passport \
  @nestjs/swagger \
  @nestjs/websockets \
  @nestjs/platform-socket.io \
  @nestjs/schedule \
  @nestjs/bullmq \
  @nestjs/cache-manager \
  @nestjs/throttler \
  bullmq \
  typeorm \
  pg \
  passport \
  passport-jwt \
  socket.io \
  ioredis \
  cache-manager \
  bcryptjs \
  uuid \
  axios \
  class-validator \
  class-transformer \
  multer
```

### Dev Dependencies

```bash
npm install -D \
  @types/passport-jwt \
  @types/bcryptjs \
  @types/uuid \
  @types/multer \
  @types/node \
  typescript \
  ts-node \
  ts-jest
```

---

## Catatan Penting

- **Jangan simpan OpenWA API key user dalam plaintext** — selalu enkripsi dengan AES-256 sebelum masuk database
- **Broadcast delay minimum 3000ms** — lebih rendah dari ini rawan banned oleh WhatsApp
- **Session per workspace** — satu workspace bisa punya banyak sesi WA
- **Swagger aktif di semua env** untuk development; pertimbangkan disable di production atau proteksi dengan basic auth
- **TypeORM sync: false di production** — selalu pakai migrations
- **Redis wajib** untuk BullMQ queue dan caching sesi — jangan skip

---

*Dokumen ini mencakup backend saja. Frontend (Next.js) direncanakan terpisah setelah backend selesai.*
