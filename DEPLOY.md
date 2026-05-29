# 🚀 Tutorial Deploy ke Plesk (Docker) — Lengkap dari Nol

Panduan ini untuk men-deploy **WA Automation Backend** ke server Plesk menggunakan Docker.

**Konsep yang dipakai:** Satu stack Docker Compose berisi **API + PostgreSQL 16 + Redis 7**
dalam satu jaringan privat. Hanya port **API** yang di-publish ke `127.0.0.1`, lalu domain
Plesk mem-*forward* (reverse proxy) ke port itu. Keuntungannya:

- Redis & Postgres jalan otomatis di dalam Docker → **tidak perlu install Redis manual** di server.
- Tidak mengutak-atik Postgres bawaan Plesk.
- Sekali jalan, semua komponen ikut hidup/mati bersama.

```
Internet → https://api.domain-kamu.com  (Plesk + SSL)
                     │  reverse proxy (nginx)
                     ▼
            127.0.0.1:3000  (container: api)
                     │  jaringan privat docker
        ┌────────────┼─────────────┐
        ▼            ▼              ▼
   container api  postgres(5432)  redis(6379)
```

---

## Daftar Isi
1. [Yang perlu disiapkan](#1-yang-perlu-disiapkan)
2. [Cek & pasang Docker di server](#2-cek--pasang-docker-di-server)
3. [Buat subdomain di Plesk](#3-buat-subdomain-di-plesk)
4. [Upload kode ke server](#4-upload-kode-ke-server)
5. [Buat file `.env` produksi](#5-buat-file-env-produksi)
6. [Build & jalankan stack Docker](#6-build--jalankan-stack-docker)
7. [Kunci skema database (DB_SYNC)](#7-kunci-skema-database-db_sync)
8. [Pasang reverse proxy + SSL di Plesk](#8-pasang-reverse-proxy--ssl-di-plesk)
9. [Verifikasi API live](#9-verifikasi-api-live)
10. [Hubungkan webhook OpenWA](#10-hubungkan-webhook-openwa)
11. [Update / redeploy](#11-update--redeploy)
12. [Backup database](#12-backup-database)
13. [Troubleshooting](#13-troubleshooting)
14. [Cheat sheet perintah](#14-cheat-sheet-perintah)

---

## 1. Yang perlu disiapkan

- Akses **SSH** ke server (user dengan hak `sudo`, atau minimal bisa jalankan `docker`).
- **Plesk** dengan akses panel admin.
- Sebuah **subdomain** untuk API, misal: `api.wa-automation.fts-tech.co.id`.
- **OPENWA_MASTER_KEY** dari instance OpenWA kamu.

> Ganti semua `api.domain-kamu.com` di panduan ini dengan subdomain asli kamu.

---

## 2. Cek & pasang Docker di server

Login SSH dulu:

```bash
ssh user@IP_SERVER
```

Cek apakah Docker sudah ada:

```bash
docker --version
docker compose version
```

**Kalau dua perintah di atas keluar versinya → lewati ke langkah 3.**

Kalau belum ada (`command not found`), install Docker (Ubuntu/Debian — paling umum di Plesk):

```bash
# Pasang Docker Engine + Compose plugin resmi
curl -fsSL https://get.docker.com | sudo sh

# Izinkan user kamu menjalankan docker tanpa sudo (opsional, biar enak)
sudo usermod -aG docker $USER
# lalu LOGOUT dan login SSH lagi agar berlaku
```

Cek lagi:

```bash
docker --version          # mis. Docker version 27.x
docker compose version    # mis. Docker Compose version v2.x
```

> Server CentOS/AlmaLinux/RHEL: perintah `curl -fsSL https://get.docker.com | sudo sh` tetap
> jalan. Setelah itu: `sudo systemctl enable --now docker`.

---

## 3. Buat subdomain di Plesk

1. Buka Plesk → **Websites & Domains** → **Add Subdomain**.
2. Isi nama subdomain, mis. `api` di bawah domain `wa-automation.fts-tech.co.id`.
3. Document root biarkan default (kita tidak pakai untuk file statis, hanya untuk reverse proxy).
4. Klik **OK**. Subdomain aktif (masih halaman default Plesk — wajar).

> SSL dipasang di langkah 8.

---

## 4. Upload kode ke server

Tentukan folder app, misal di home user. Contoh:

```bash
mkdir -p ~/apps && cd ~/apps
```

**Pilih salah satu cara:**

### Cara A — Git (paling rapi, dianjurkan)

Kalau repo sudah di-*push* ke GitHub/GitLab:

```bash
git clone <URL_REPO_KAMU> wa-automation
cd wa-automation
```

### Cara B — Upload manual (tanpa Git remote)

Dari **komputer lokal kamu** (PowerShell), kirim file proyek ke server pakai `scp`
(jangan ikutkan `node_modules`/`dist` — akan dibuat ulang saat build):

```powershell
# jalankan dari D:\kodingan\personal\wa-automation
scp -r .\src .\package.json .\package-lock.json .\tsconfig.json .\tsconfig.build.json `
       .\nest-cli.json .\Dockerfile .\docker-compose.prod.yml .\.env.production.example `
       .\.dockerignore .\scripts `
       user@IP_SERVER:~/apps/wa-automation/
```

Lalu di server:

```bash
cd ~/apps/wa-automation
```

### Cara C — File Manager Plesk

Zip folder proyek (tanpa `node_modules` & `dist`), upload via **Files** di Plesk, lalu extract.

---

## 5. Buat file `.env` produksi

Di server, dari dalam folder proyek:

```bash
cp .env.production.example .env
nano .env        # atau: vi .env
```

**PENTING (khusus mode Docker):** `DB_HOST` & `REDIS_HOST` harus memakai **nama service**
(`postgres` dan `redis`), bukan `localhost`, karena antar-container saling kenal lewat nama service.

```env
NODE_ENV=production
PORT=3000
API_PORT=3000
APP_URL=https://api.domain-kamu.com

# Database (di dalam jaringan docker)
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=wauser
DB_PASSWORD=GANTI_PASSWORD_KUAT
DB_NAME=wa_automation
DB_SYNC=true          # ⚠️ true HANYA untuk deploy pertama (lihat langkah 7)
DB_LOGGING=false

# Redis (di dalam jaringan docker)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# OpenWA
OPENWA_BASE_URL=https://openwa.fts-tech.co.id
OPENWA_MASTER_KEY=ISI_KEY_OPENWA_KAMU

# JWT & enkripsi — JANGAN pakai contoh, generate sendiri (lihat di bawah)
JWT_SECRET=
JWT_REFRESH_SECRET=
ENCRYPTION_KEY=

JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

**Generate secret yang aman** (jalankan di server, lalu tempel hasilnya ke `.env`):

```bash
echo "JWT_SECRET=$(openssl rand -hex 48)"
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 48)"
echo "ENCRYPTION_KEY=$(openssl rand -hex 16)"   # menghasilkan 32 karakter (wajib tepat 32)
```

> `ENCRYPTION_KEY` **wajib tepat 32 karakter**. `openssl rand -hex 16` = 32 karakter hex. Pas.
> Pastikan `DB_PASSWORD` di `.env` sama dengan yang dipakai container Postgres (otomatis dibaca
> dari `.env` oleh `docker-compose.prod.yml`).

Simpan file (`nano`: `Ctrl+O` Enter, lalu `Ctrl+X`).

---

## 6. Build & jalankan stack Docker

Masih di folder proyek:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Proses pertama agak lama (download image + `npm ci` + build). Cek status:

```bash
docker compose -f docker-compose.prod.yml ps
```

Ketiga service (`api`, `postgres`, `redis`) harus `running`/`healthy`. Lihat log API:

```bash
docker compose -f docker-compose.prod.yml logs -f api
# Tunggu sampai muncul:  🚀 API running on http://localhost:3000/api
# tekan Ctrl+C untuk keluar dari log (container tetap jalan)
```

Tes dari dalam server:

```bash
curl http://127.0.0.1:3000/health
# Harusnya: {"success":true,"data":{"status":"ok",...}}
```

---

## 7. Kunci skema database (DB_SYNC)

Saat deploy pertama, `DB_SYNC=true` membuat semua tabel otomatis di database kosong.
**Setelah API berhasil hidup sekali**, matikan agar skema tidak berubah-ubah sendiri:

```bash
nano .env
# ubah:  DB_SYNC=true  →  DB_SYNC=false
```

Terapkan (recreate container api dengan env baru):

```bash
docker compose -f docker-compose.prod.yml up -d
```

> Tabel yang sudah dibuat tetap aman; ini hanya menonaktifkan auto-sync.

---

## 8. Pasang reverse proxy + SSL di Plesk

Sambungkan domain ke container API (port `127.0.0.1:3000`).

### 8a. Reverse proxy (nginx)

1. Plesk → pilih subdomain `api.domain-kamu.com` → **Apache & nginx Settings**.
2. Di kolom **Additional nginx directives**, tempel:

   ```nginx
   location / {
       proxy_pass http://127.0.0.1:3000;
       proxy_http_version 1.1;

       # Wajib untuk WebSocket (Socket.IO realtime)
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";

       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;

       proxy_read_timeout 120s;
   }
   ```

3. Klik **OK / Apply**.

> Kalau ada opsi **"Proxy mode"** di bagian Apache, biarkan default. Directive nginx di atas
> sudah cukup untuk meneruskan semua request ke aplikasi.

### 8b. SSL (HTTPS gratis)

1. Plesk → subdomain → **SSL/TLS Certificates** → **Install** (Let's Encrypt).
2. Centang domain (+`www` bila perlu), lalu **Get it free**.
3. Aktifkan **Redirect HTTP → HTTPS** (Permanent 301) di pengaturan hosting domain.

---

## 9. Verifikasi API live

Dari browser / komputer mana pun:

- Health: `https://api.domain-kamu.com/health`
- Swagger (dokumentasi API): `https://api.domain-kamu.com/docs`
- Base URL semua endpoint: `https://api.domain-kamu.com/api`

Uji cepat register dari terminal lokal:

```bash
curl -X POST https://api.domain-kamu.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@example.com","password":"rahasia123"}'
```

Harus mengembalikan `accessToken` & `refreshToken`. 🎉

---

## 10. Hubungkan webhook OpenWA

Agar pesan masuk WhatsApp memicu automation & webhook keluar, arahkan callback OpenWA ke:

```
POST https://api.domain-kamu.com/api/inbound/message
Header:  x-master-key: <OPENWA_MASTER_KEY yang sama dengan di .env>
Body (JSON): { "session": "<id-session-openwa>", "from": "628xxx", "body": "isi pesan", "isGroupMsg": false }
```

Atur ini di konfigurasi webhook OpenWA kamu.

---

## 11. Update / redeploy

Kalau ada perubahan kode:

```bash
cd ~/apps/wa-automation
git pull                  # (kalau pakai Git; kalau upload manual, upload ulang folder src)
docker compose -f docker-compose.prod.yml up -d --build
```

Atau pakai helper yang sudah disediakan:

```bash
export API_PORT=3000
bash scripts/deploy.sh
```

---

## 12. Backup database

Backup (dump) ke file di server:

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U wauser wa_automation > backup_$(date +%F).sql
```

Restore dari file:

```bash
cat backup_2026-05-29.sql | docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U wauser -d wa_automation
```

> Data Postgres tersimpan di volume Docker `postgres_data` dan tidak hilang saat container restart.

---

## 13. Troubleshooting

| Gejala | Penyebab & solusi |
| ------ | ----------------- |
| `curl /health` connection refused | Container API belum jalan/healthy. Cek `docker compose -f docker-compose.prod.yml ps` dan `logs api`. |
| Log API: `ECONNREFUSED ...:5432` | `DB_HOST` salah. Di Docker harus `postgres` (bukan `localhost`/`127.0.0.1`). |
| Log API: `ECONNREFUSED ...:6379` | `REDIS_HOST` harus `redis`. |
| Error soal `ENCRYPTION_KEY` / panjang salah | Harus tepat 32 karakter. Pakai `openssl rand -hex 16`. |
| Domain buka tapi **502 Bad Gateway** | Reverse proxy aktif tapi container API mati / port salah. Pastikan `API_PORT` di `.env` = `3000` dan `proxy_pass` ke `127.0.0.1:3000`. |
| WebSocket/Socket.IO tidak connect | Pastikan blok `Upgrade`/`Connection "upgrade"` ada di directive nginx. |
| Tabel tidak terbuat | Deploy pertama harus `DB_SYNC=true`, lalu recreate: `docker compose -f docker-compose.prod.yml up -d`. |
| Port 3000 bentrok app lain | Ubah `API_PORT` di `.env` (mis. `3100`) & samakan `proxy_pass` ke `127.0.0.1:3100`. |
| Perlu masuk ke dalam container | `docker compose -f docker-compose.prod.yml exec api sh` |

Lihat log realtime kapan saja:

```bash
docker compose -f docker-compose.prod.yml logs -f api
```

---

## 14. Cheat sheet perintah

```bash
# Status semua service
docker compose -f docker-compose.prod.yml ps

# Lihat log API (realtime)
docker compose -f docker-compose.prod.yml logs -f api

# Restart hanya API
docker compose -f docker-compose.prod.yml restart api

# Stop semua
docker compose -f docker-compose.prod.yml down

# Stop + hapus volume (HATI-HATI: hapus data DB & Redis!)
docker compose -f docker-compose.prod.yml down -v

# Rebuild & jalankan (setelah update kode/env)
docker compose -f docker-compose.prod.yml up -d --build

# Masuk shell container API
docker compose -f docker-compose.prod.yml exec api sh

# Masuk psql database
docker compose -f docker-compose.prod.yml exec postgres psql -U wauser -d wa_automation
```

---

**Selesai.** Kalau ada langkah yang error atau membingungkan, catat pesan errornya dan tanyakan —
sertakan output dari `docker compose -f docker-compose.prod.yml logs --tail=50 api`.
