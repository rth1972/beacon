# Beacon

A self-hosted push notification server built with **Next.js 16**.

## Quick start

```bash
cd ~/Documents/my-ntfy
npm install
# Fix the dynamic route folder (brackets can't be created by some tools):
mkdir -p "app/api/[topic]"
cp "app/api/topic/route.ts" "app/api/[topic]/route.ts"
# Now start:
npm run dev
```

Open http://localhost:3000

---

## Usage

### Subscribe (SSE)

```bash
# In the browser console or any SSE client:
const es = new EventSource('http://localhost:3000/api/my-topic')
es.onmessage = e => console.log(JSON.parse(e.data))
```

### Publish

```bash
# Plain text
curl -d "Hello world" http://localhost:3000/api/my-topic

# JSON with title and priority
curl -X POST http://localhost:3000/api/my-topic \
  -H "Content-Type: application/json" \
  -d '{"title":"Deploy done","message":"✅ Success","priority":"high","tags":["ci","deploy"]}'
```

### Browser UI

Visit `/t/<topic>` to subscribe, read messages, and publish from a browser UI:

```
http://localhost:3000/t/my-topic
```

---

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/:topic` | Subscribe (SSE stream) |
| `POST` | `/api/:topic` | Publish a message |
| `HEAD` | `/api/:topic` | Get subscriber count (X-Subscriber-Count header) |

### Message schema

```json
{
  "message":  "string (required)",
  "title":    "string (optional)",
  "priority": "low | default | high | urgent",
  "tags":     ["string"]
}
```

### Response

```json
{ "ok": true, "id": "uuid", "delivered": 3 }
```

---

## Architecture note

Messages are held in-memory (a `Map` in `app/store.ts`). This works perfectly for a single server process. For multi-instance deployments, replace the store with **Redis Pub/Sub**.
