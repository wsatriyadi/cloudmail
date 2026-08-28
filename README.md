# CloudMail

Self-hosted temporary email platform built with Next.js 15 and Cloudflare Email Workers. Receive emails on your own domains, auto-extract OTPs, generate disposable addresses with AI-powered fake identities, and manage everything through a clean admin dashboard.

## Features

### Core Features

- **Disposable Email Addresses** — Receive emails on any configured domain with auto-generated or custom aliases
- **OTP Auto-Extraction** — Automatically detects and extracts one-time passwords from incoming emails
- **Smart Email Labeling** — Auto-categorizes emails as OTP, verification, newsletter, transaction, or notification
- **AI Identity Generator** — Generate realistic fake identities with email addresses using any OpenAI-compatible LLM
- **Bulk Generation** — Create up to 50 identities in a single API call
- **Custom Aliases** — Create personalized email aliases with optional expiration
- **Email Reply** — Reply to received emails via configured SMTP
- **Real-time Inbox** — Live email updates via Server-Sent Events (SSE)
- **90-Day Email Retention** — Automatic cleanup of old emails with configurable cron job
- **Webhook Support** — Forward incoming emails to external endpoints
- **QR Code Sharing** — Generate QR codes for email addresses

### Admin Dashboard & UI/UX

- **Modern Dashboard** — Real-time stats with trend indicators (today vs yesterday), activity charts, quick actions
- **Inbox Pagination** — Browse emails with DataTables-style pagination (50 per page)
- **Interactive API Docs** — Swagger-style API explorer at `/docs` with live testing
- **Advanced Search & Filters** — Search and filter on domains, aliases, and emails tables
- **Domain Management** — Search by name/description, status filters (Active/Inactive), result counters
- **Alias Management** — Search by address/description, status + domain filters, split address display
- **API Key Authentication** — Secure API access with rate limiting and IP allowlisting
- **User Management** — Multi-user support with role-based permissions
- **Audit Logging** — Track all administrative actions
- **Dark Mode** — Full theme support via next-themes

### MCP Server (AI Integration)

- **Dual Transport Modes** — stdio (local) and HTTP+SSE (remote network access)
- **Bearer Token Auth** — Secure remote access with configurable auth keys
- **8 Production Tools** — generate_email, bulk_emails, check_inbox, read_email, create_alias, list_aliases, delete_alias, list_domains
- **Health Endpoints** — `/health`, `/docs` for monitoring and discovery
- **Production Ready** — PM2, systemd, Nginx configurations included

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
## MCP Server (AI Integration)

CloudMail includes a [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that lets AI assistants like Claude, Cursor, and OpenCode interact with your temporary email platform directly.

### Features

- **Dual Transport Modes**: stdio (local) and HTTP+SSE (remote network access)
- **Bearer Token Authentication**: Secure remote access with configurable auth keys
- **8 Production-Ready Tools**: Complete email management via MCP
- **Health & Documentation Endpoints**: `/health`, `/docs` for monitoring
- **Production Deployment**: PM2, systemd, Nginx reverse proxy support

### Available Tools

| Tool | Description |
|------|-------------|
| `generate_email` | Generate temporary email with AI-generated fake persona |
| `generate_bulk_emails` | Generate multiple emails at once (1-50) |
| `check_inbox` | Check inbox with pagination support |
| `read_email` | Read full email with OTP extraction |
| `create_alias` | Create custom alias with optional expiration |
| `list_aliases` | List all active aliases |
| `delete_alias` | Delete alias by ID |
| `list_domains` | List available domains |

### Quick Start

**Local Setup (stdio):**

1. Install dependencies:
```bash
cd mcp-server
npm install
```

2. Get API key from `/dashboard/api-keys` (needs `generate` and `inbox` permissions)

3. Configure Claude Desktop (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "cloudmail": {
      "command": "npx",
      "args": ["tsx", "src/index.ts"],
      "cwd": "/path/to/cloudmail/mcp-server",
      "env": {
        "CLOUDMAIL_API_URL": "http://192.168.110.9:8090",
        "CLOUDMAIL_API_KEY": "your-api-key"
      }
    }
  }
}
```

**Remote Setup (HTTP+SSE):**

1. Deploy MCP server (see `mcp-server/DEPLOYMENT.md` for full guide):
```bash
cd mcp-server
cp .env.example .env
nano .env  # Set CLOUDMAIL_API_KEY, MCP_AUTH_KEY, TRANSPORT_MODE=http
npm install
npm test
pm2 start ecosystem.config.cjs
```

2. Configure client:
```json
{
  "mcpServers": {
    "cloudmail": {
      "url": "http://your-server:3100/sse",
      "transport": "sse",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_AUTH_KEY"
      }
    }
  }
}
```

### Documentation

- **Full Guide**: `mcp-server/README.md` (9.9 KB)
- **Deployment**: `mcp-server/DEPLOYMENT.md` (7.2 KB)
- **Config Template**: `mcp-server/.env.example`

### Example Usage

Ask your AI assistant:
- "Generate a temporary email for testing"
- "Check inbox for user@yourdomain.com"
- "Read the latest email and extract OTP"
- "Create an alias expiring in 1 hour"
```

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
