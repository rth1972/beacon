# Beacon

Self-hosted push notifications — your own ntfy clone, built with Next.js 16.

```
curl -d "Hello world" http://localhost:3000/api/my-topic
```

---

## Quick start

```bash
git clone <repo>
cd beacon
cp env.example .env.local   # edit to set NTFY_TOKEN, Telegram, etc.
npm install
npm run dev -- --hostname 0.0.0.0
```

Open **http://localhost:3000**

---

## Docker

```bash
docker compose up -d
```

Data is persisted to a named Docker volume (`beacon-data`). The SQLite database lives at `/app/data/ntfy.db` inside the container.

---

## Publishing messages

### Plain text (simplest)
```bash
curl -d "Hello" http://localhost:3000/api/my-topic
```

### Full JSON
```bash
curl -X POST http://localhost:3000/api/my-topic \
  -H "Content-Type: application/json" \
  -d '{
    "title":    "Deploy complete",
    "message":  "v2.4.1 is live",
    "type":     "success",
    "priority": "high",
    "tags":     ["deploy", "prod"],
    "url":      "https://myapp.com",
    "url_label":"Open app",
    "ttl":      3600
  }'
```

### ntfy-compatible headers (plain text body + headers)
```bash
curl -d "Disk at 92%" \
  -H "X-Title: Warning" \
  -H "X-Type: warning" \
  -H "X-Priority: high" \
  -H "X-Tags: infra,prod" \
  http://localhost:3000/api/alerts
```

### Scheduled message
```bash
# Send in 30 minutes
curl -X POST http://localhost:3000/api/my-topic \
  -H "Content-Type: application/json" \
  -d '{"message":"Maintenance window starting","delay":"30m"}'
```

---

## Message fields

| Field | Type | Description |
|---|---|---|
| `message` | string | **Required.** Notification body |
| `title` | string | Optional heading |
| `type` | `info \| success \| warning \| error` | Visual style |
| `priority` | `low \| default \| high \| urgent` | Urgency level |
| `tags` | string[] | Tag labels |
| `url` | string | Click-action URL |
| `url_label` | string | Button label (default: "Open") |
| `ttl` | number | Seconds until expiry |
| `delay` | string | Schedule: `30s`, `5m`, `2h`, `1d` |

---

## API reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/:topic` | Subscribe (SSE stream) |
| `GET` | `/api/:topic?poll=1` | Fetch history as JSON |
| `GET` | `/api/:topic?since=<ts>` | Fetch messages since timestamp |
| `POST` | `/api/:topic` | Publish a message |
| `DELETE` | `/api/:topic` | Clear all topic messages |
| `DELETE` | `/api/:topic?id=<id>` | Delete a specific message |
| `HEAD` | `/api/:topic` | Subscriber count + stats |
| `GET` | `/api/topics` | Live topic list (SSE) |
| `GET` | `/api/topics?list=1` | Topic list + stats (JSON) |
| `GET` | `/api/search` | Search message history |
| `GET` | `/api/webhooks` | List webhooks |
| `POST` | `/api/webhooks` | Create webhook |
| `DELETE` | `/api/webhooks/:id` | Delete webhook |
| `PATCH` | `/api/webhooks/:id` | Enable/pause webhook |
| `GET` | `/api/scheduled` | List pending scheduled messages |
| `DELETE` | `/api/scheduled?id=<id>` | Cancel a scheduled message |
| `GET` | `/api/health` | Health check |

Full interactive docs at **http://localhost:3000/docs**

---

## Authentication

Set `NTFY_TOKEN` in `.env.local`:

```bash
NTFY_TOKEN=mysecrettoken
```

Then pass it in requests:
```bash
curl -H "Authorization: Bearer mysecrettoken" \
  -d "Hello" http://localhost:3000/api/my-topic
```

Browser users are redirected to `/login`.

---

## Outgoing webhooks

POST to any URL whenever a message is published to a topic. Configure via the Settings page or API:

```bash
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{"topic":"deploy","url":"https://hooks.slack.com/...","label":"Slack"}'
```

If a `secret` is set, requests include an `X-Beacon-Signature: sha256=<hmac>` header.

---

## Telegram notifications

1. Message [@BotFather](https://t.me/BotFather) → `/newbot` → copy token
2. Message [@userinfobot](https://t.me/userinfobot) → copy your chat ID
3. Add to `.env.local`:

```bash
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHI...
TELEGRAM_CHAT_ID=987654321
```

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `NTFY_TOKEN` | _(empty)_ | Bearer token for auth. Empty = open access |
| `NTFY_MAX_HISTORY` | `100` | Max messages to keep per topic |
| `NTFY_DEFAULT_TTL` | `0` | Default message TTL in seconds (0 = never) |
| `NTFY_RATE_LIMIT` | `60` | Max messages per topic per minute (0 = off) |
| `TELEGRAM_BOT_TOKEN` | _(empty)_ | Telegram bot token |
| `TELEGRAM_CHAT_ID` | _(empty)_ | Telegram chat ID |

---

## System notifications

On the machine running the server:

| Platform | Method | Requires |
|---|---|---|
| macOS | `osascript` | Built-in |
| Windows | PowerShell toast | Built-in (Win 10/11) |
| Linux | `notify-send` | `libnotify-bin` |

> On a headless server, system notifications won't appear. Use Telegram or webhooks instead.

---

## Features

- **Real-time SSE** — instant delivery, no polling
- **Message history** — SQLite-backed, survives restarts
- **Scheduled messages** — delay publishing with `delay=5m`
- **Message expiry** — auto-purge with `ttl=3600`
- **Outgoing webhooks** — with HMAC signing
- **Rate limiting** — per topic, configurable
- **Token auth** — single token protects all endpoints
- **Telegram relay** — phone notifications when away from desk
- **Native OS notifications** — macOS, Windows, Linux
- **Message search** — full-text search across history
- **Message templates** — save and reuse common messages
- **Per-topic mute** — silence noisy topics
- **Pinned topics** — keep important topics at top of sidebar
- **Read/unread tracking** — badge count in sidebar
- **Dark + light mode** — follows OS preference, toggleable
- **PWA** — installable on phone home screen
- **Collapsible sidebar** — more room when you need it
- **Docker** — single `docker compose up -d`
