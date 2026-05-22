# Beacon

A self-hosted push notification server with a dashboard UI, live topic pages, and Web Push / PWA support. Built with **Next.js 16**.

## Quick start

```bash
npm install
npm run build && npm start
```

Open http://localhost:9876

> The server auto-generates VAPID keys to `data/vapid.json` on first run.

## Usage

### Publish a message

```bash
curl -d "Hello world" http://localhost:9876/api/my-topic

curl -X POST http://localhost:9876/api/my-topic \
  -H "Content-Type: application/json" \
  -d '{"title":"Deploy done","message":"✅ Success","priority":"high"}'
```

### Subscribe via SSE

Open a topic page in the browser:

```
http://localhost:9876/t/my-topic
```

Messages arrive in real time. Optionally enable **push notifications** (see below).

### Dashboard

```
http://localhost:9876/dashboard
```

Live stats, quick publish, and topic list.

## Web Push (mobile push notifications)

Push requires **HTTPS**. On iOS it works only from an installed **home-screen PWA** (iOS 16.4+).

### Set up HTTPS with Apache (recommended)

```bash
sudo apt install apache2 certbot python3-certbot-apache
sudo a2enmod proxy proxy_http proxy_wstunnel rewrite headers ssl
```

**`/etc/apache2/sites-available/beacon.conf`**:

```apache
<VirtualHost *:80>
  ServerName beacon.yourdomain.com
  Redirect permanent / https://beacon.yourdomain.com/
</VirtualHost>

<VirtualHost *:443>
  ServerName beacon.yourdomain.com

  SSLEngine on
  SSLCertificateFile      /etc/letsencrypt/live/beacon.yourdomain.com/fullchain.pem
  SSLCertificateKeyFile   /etc/letsencrypt/live/beacon.yourdomain.com/privkey.pem

  ProxyPreserveHost On
  ProxyPass / http://localhost:9876/
  ProxyPassReverse / http://localhost:9876/

  ProxyPass /api/ http://localhost:9876/api/ nocanon
  SetEnv proxy-nointerrupt 1
  SetEnv proxy-sendchunked 1

  RewriteEngine on
  RewriteCond %{HTTP:Upgrade} websocket [NC]
  RewriteCond %{HTTP:Connection} upgrade [NC]
  RewriteRule ^/?(.*) ws://localhost:9876/$1 [P,L]

  Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
  Header always set X-Content-Type-Options nosniff
  Header always set X-Frame-Options DENY

  ErrorLog  ${APACHE_LOG_DIR}/beacon-error.log
  CustomLog ${APACHE_LOG_DIR}/beacon-access.log combined
</VirtualHost>
```

```bash
sudo certbot --apache -d beacon.yourdomain.com
sudo a2ensite beacon
sudo systemctl reload apache2
```

Point your phone at `https://beacon.yourdomain.com`, **Share → Add to Home Screen**, open the PWA, go to a topic, tap **📡 Push off** — you'll get push notifications even when the app is closed.

### Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `9876` | HTTP listen port |
| `NTFY_VAPID_SUBJECT` | `mailto:admin@beacon.local` | Email for VAPID contact |

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/:topic` | Subscribe (SSE stream) |
| `POST` | `/api/:topic` | Publish a message |
| `DELETE` | `/api/:topic` | Delete all messages (`?id=` for specific) |
| `GET`  | `/api/topics` | List topics (SSE + JSON via `?list=1`) |
| `GET`  | `/api/subscribe` | Get VAPID public key |
| `POST` | `/api/subscribe` | Save a push subscription |
| `DELETE` | `/api/subscribe` | Remove a push subscription |

### Message schema

```json
{
  "message":   "string (required)",
  "title":     "string",
  "priority":  "low | default | high | urgent",
  "type":      "info | success | warning | error",
  "tags":      ["string"],
  "url":       "https://...",
  "url_label": "Open",
  "ttl":       3600
}
```

### Response

```json
{ "ok": true, "id": "uuid", "delivered": 3 }
```

## Architecture

Messages are held in-memory (`app/store.ts`). For multi-instance deployments, replace the store with **Redis Pub/Sub**.

Push subscriptions are stored in SQLite (`data/subscriptions.db`).
