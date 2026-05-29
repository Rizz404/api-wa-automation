# Deployment — Plesk (Docker)

Self-contained Docker Compose stack: **API + PostgreSQL 16 + Redis 7** on a private
network. Only the API is published, to `127.0.0.1:<API_PORT>`. Plesk reverse-proxies the
domain to that port. This sidesteps the "Redis not installed" gap and never touches the
host's Plesk-managed Postgres.

## Prerequisites on the server

- Docker Engine + Docker Compose plugin (`docker --version`, `docker compose version`)
- A Plesk domain/subdomain (e.g. `api.wa-automation.fts-tech.co.id`) for the reverse proxy
- SSH access

## 1. Get the code

```bash
cd /var/www/vhosts/<domain>/   # or any app dir you control
git clone <repo-url> app && cd app
# (or push via the deploy script in scripts/deploy.sh)
```

## 2. Configure environment

```bash
cp .env.production.example .env
```

Edit `.env`. **Important for the Docker network** — services talk by container name:

```env
DB_HOST=postgres
REDIS_HOST=redis
DB_USERNAME=wauser
DB_PASSWORD=<strong>
DB_NAME=wa_automation
API_PORT=3000            # host loopback port Plesk proxies to
# First deploy ONLY (empty DB): create schema automatically, then set back to false.
DB_SYNC=true
JWT_SECRET=$(openssl rand -hex 48)
JWT_REFRESH_SECRET=$(openssl rand -hex 48)
ENCRYPTION_KEY=$(openssl rand -hex 16)   # exactly 32 chars
OPENWA_MASTER_KEY=<openwa key>
APP_URL=https://api.wa-automation.fts-tech.co.id
```

## 3. Build & start

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api
```

Health check:

```bash
curl http://127.0.0.1:3000/health
```

## 4. Lock down the schema

Once the tables exist (after first successful boot with `DB_SYNC=true`):

```bash
# edit .env -> DB_SYNC=false
docker compose -f docker-compose.prod.yml up -d   # recreate api with new env
```

## 5. Plesk reverse proxy + SSL

In Plesk for the domain:

1. **Apache & nginx Settings → Additional nginx directives**:

   ```nginx
   location / {
       proxy_pass http://127.0.0.1:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;        # WebSocket (Socket.IO)
       proxy_set_header Connection "upgrade";
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_read_timeout 120s;
   }
   ```

2. Enable **Let's Encrypt** SSL for the domain.
3. (Optional) Turn off "Proxy mode" Apache so nginx serves directly.

API will be live at `https://<domain>/api`, Swagger at `https://<domain>/docs`.

## 6. Updates / redeploy

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## Notes

- BullMQ workers run in-process; keep a single API container (`instances: 1`).
- Point OpenWA's inbound message webhook at `https://<domain>/api/inbound/message`
  with header `x-master-key: <OPENWA_MASTER_KEY>`.
- Logs: `docker compose -f docker-compose.prod.yml logs -f api`.
- Backups: the Postgres volume is `postgres_data`. Use `pg_dump` via
  `docker compose -f docker-compose.prod.yml exec postgres pg_dump -U wauser wa_automation`.
