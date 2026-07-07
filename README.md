# CloudMail

Self-hosted temporary email platform built with Next.js 15 and Cloudflare Email Workers. Receive emails on your own domains, auto-extract OTPs, generate disposable addresses with AI-powered fake identities, and manage everything through a clean admin dashboard.

## Features

- **Disposable Email Addresses** — Receive emails on any configured domain with auto-generated or custom aliases
- **OTP Auto-Extraction** — Automatically detects and extracts one-time passwords from incoming emails
- **Smart Email Labeling** — Auto-categorizes emails as OTP, verification, newsletter, transaction, or notification
- **AI Identity Generator** — Generate realistic fake identities with email addresses using any OpenAI-compatible LLM
- **Bulk Generation** — Create up to 20 identities in a single API call
- **Custom Aliases** — Create personalized email aliases with optional expiration
- **Email Reply** — Reply to received emails via configured SMTP
- **Real-time Inbox** — Live email updates via Server-Sent Events (SSE)
- **Admin Dashboard** — Full management UI for domains, aliases, API keys, users, and settings
- **API Key Authentication** — Secure API access with rate limiting and IP allowlisting
- **Webhook Support** — Forward incoming emails to external endpoints
- **Audit Logging** — Track all administrative actions
- **QR Code Sharing** — Generate QR codes for email addresses
- **Dark Mode** — Full theme support via next-themes

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, Turbopack) |
| Frontend | React 19, Tailwind CSS 4, shadcn/ui, Recharts |
| Database | SQLite via better-sqlite3 + Drizzle ORM |
| Auth | NextAuth v5 (Credentials, JWT) |
| Email Worker | Cloudflare Workers (postal-mime) |
| AI | OpenAI SDK (configurable endpoint/model) |
| Validation | Zod |

## Architecture

```
┌─────────────────┐     SMTP      ┌─────────────────────┐
│  Incoming Email  │──────────────▶│  Cloudflare Email    │
│  (any sender)    │               │  Worker (worker/)    │
└─────────────────┘               └─────────┬───────────┘
                                            │ HMAC-signed
                                            │ POST webhook
                                            ▼
                                  ┌─────────────────────┐
                                  │  Next.js Backend     │
                                  │  /api/internal/ingest│
                                  └─────────┬───────────┘
                                            │
                                            ▼
                                  ┌─────────────────────┐
                                  │  SQLite Database     │
                                  │  (Drizzle ORM)       │
                                  └─────────┬───────────┘
                                            │
                                            ▼
                                  ┌─────────────────────┐
                                  │  Dashboard / API     │
                                  │  (Next.js Frontend)  │
                                  └─────────────────────┘
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Cloudflare account (for email workers)

### Installation

```bash
# Clone the repository
git clone https://github.com/wsatriyadi/cloudmail.git
cd cloudmail

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### Environment Variables

Edit `.env` with your values:

```env
# Database — path to SQLite file (auto-created)
DATABASE_PATH=./data/cloudmail.db

# Auth — generate with: openssl rand -base64 32
AUTH_SECRET=your-secret-here

# Default Admin (used by seed script)
ADMIN_EMAIL=admin@cloudmail.local
ADMIN_PASSWORD=changeme

# Worker Communication — generate with: openssl rand -hex 32
WORKER_INGEST_SECRET=your-worker-secret-here

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database Setup

```bash
# Push schema to database
npm run db:push

# Seed admin user and default settings
npm run seed
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with your admin credentials.

### Production Build

```bash
npm run build
npm run start
```

## Cloudflare Email Worker Setup

The `worker/` directory contains a Cloudflare Worker that receives incoming emails and forwards them to your CloudMail instance.

1. Configure `worker/wrangler.toml` with your domain and backend URL
2. Set the `INGEST_SECRET` in your worker environment (must match `WORKER_INGEST_SECRET`)
3. Deploy the worker:

```bash
cd worker
npx wrangler deploy
```

4. Configure email routing in Cloudflare DNS to point to your worker

## API Reference

All API routes require an API key passed via `X-API-Key` header (except internal routes).

### Generate Identity

```bash
POST /api/generate

# Response
{
  "identity": {
    "name": "John Smith",
    "email": "john.smith@yourdomain.com",
    "username": "johnsmith42",
    ...
  }
}
```

### Bulk Generate

```bash
POST /api/generate/bulk
Content-Type: application/json

{ "count": 5 }
```

### List Inbox

```bash
GET /api/inbox/{email}?page=1&limit=20
```

### View Email

```bash
GET /api/inbox/view/{id}
```

### Download Attachment

```bash
GET /api/inbox/attachment/{id}
```

### Create Alias

```bash
POST /api/alias
Content-Type: application/json

{
  "localPart": "myalias",
  "domainId": "domain-id",
  "expiresAt": "2025-12-31T23:59:59Z"  // optional
}
```

### List / Delete Aliases

```bash
GET /api/alias
DELETE /api/alias?id={alias-id}
```

### Reply to Email

```bash
POST /api/reply
Content-Type: application/json

{
  "emailId": "original-email-id",
  "body": "Reply content here"
}
```

> Requires SMTP configuration in dashboard settings.

## Dashboard

Access the admin dashboard at `/dashboard` after logging in.

| Page | Description |
|------|-------------|
| `/dashboard` | Overview stats and charts |
| `/dashboard/inbox` | Browse all received emails |
| `/dashboard/inbox/[id]` | View individual email with OTP extraction |
| `/dashboard/domains` | Manage email domains |
| `/dashboard/aliases` | Manage custom aliases |
| `/dashboard/api-keys` | Create and manage API keys |
| `/dashboard/users` | User management |
| `/dashboard/settings` | App settings (AI model, SMTP, etc.) |
| `/dashboard/audit-log` | View audit trail |

## Database Commands

```bash
npm run db:generate    # Generate migration files
npm run db:migrate     # Run migrations
npm run db:push        # Push schema directly (dev)
npm run db:studio      # Open Drizzle Studio GUI
npm run seed           # Seed admin user + defaults
```

## Deployment

### With Docker (Recommended)

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["npm", "start"]
```

### With PM2

```bash
npm run build
pm2 start npm --name cloudmail -- start
```

### Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name mail.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## MCP Server (AI Integration)

CloudMail includes a [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that lets AI assistants like Claude, Cursor, and OpenCode interact with your temporary email platform directly.

### Available Tools

| Tool | Description |
|------|-------------|
| `generate_email` | Generate a temporary email identity with AI-generated fake persona |
| `generate_bulk_emails` | Generate multiple temporary email identities at once (1-20) |
| `check_inbox` | Check inbox for a temporary email address |
| `read_email` | Read full email content including body, headers, OTP extraction |
| `create_alias` | Create a custom email alias with optional expiration |
| `list_aliases` | List all active email aliases |
| `delete_alias` | Delete an email alias |

### Setup

1. Install dependencies:
```bash
cd mcp-server
npm install
```

2. Create an API key in the CloudMail dashboard (`/dashboard/api-keys`) with `generate` and `inbox` permissions.

3. Add to your MCP client config:

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "cloudmail": {
      "command": "npx",
      "args": ["tsx", "src/index.ts"],
      "cwd": "/path/to/cloudmail/mcp-server",
      "env": {
        "CLOUDMAIL_API_URL": "https://your-domain.com",
        "CLOUDMAIL_API_KEY": "your-api-key"
      }
    }
  }
}
```

**OpenCode** (`opencode.json`):
```json
{
  "mcp": {
    "cloudmail": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "src/index.ts"],
      "cwd": "/path/to/cloudmail/mcp-server",
      "env": {
        "CLOUDMAIL_API_URL": "https://your-domain.com",
        "CLOUDMAIL_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Example Usage

Once connected, ask your AI assistant:
- "Generate a temporary email for me"
- "Check the inbox for user@yourdomain.com"
- "Read the latest email and extract the OTP code"
- "Create an alias that expires in 30 minutes"

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
