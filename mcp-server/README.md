# CloudMail MCP Server

Model Context Protocol (MCP) server for CloudMail temporary email platform. Enables AI assistants to interact with CloudMail programmatically.

## Features

- **Dual Transport Modes**: stdio (local) and HTTP+SSE (remote)
- **Authentication**: Optional Bearer token auth for remote access
- **8 Tools**: Email generation, inbox checking, alias management, domain listing
- **Full API Coverage**: Access all CloudMail features through MCP

## Transport Modes

### 1. **stdio** (Local/Desktop Clients)
For Claude Desktop, Cursor, and other local MCP clients.

```bash
CLOUDMAIL_API_URL=http://localhost:3000 \
CLOUDMAIL_API_KEY=your-api-key \
npm start
```

### 2. **http** (Remote/SSE)
For remote MCP clients, web apps, and distributed systems.

```bash
TRANSPORT_MODE=http \
MCP_PORT=3100 \
MCP_AUTH_KEY=your-secret-key \
CLOUDMAIL_API_URL=http://localhost:3000 \
CLOUDMAIL_API_KEY=your-api-key \
npm run start:http
```

## Installation

```bash
cd mcp-server
npm install
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CLOUDMAIL_API_URL` | ✅ | - | CloudMail API base URL (e.g., `http://192.168.110.9:8090`) |
| `CLOUDMAIL_API_KEY` | ✅ | - | API key from CloudMail dashboard (`/dashboard/api-keys`) |
| `TRANSPORT_MODE` | ❌ | `stdio` | Transport mode: `stdio` or `http` |
| `MCP_PORT` | ❌ | `3100` | HTTP server port (only for `http` mode) |
| `MCP_AUTH_KEY` | ❌ | - | Bearer token for remote auth (recommended for `http` mode) |

### Generate CloudMail API Key

1. Open CloudMail dashboard: `http://your-server:8090/dashboard/api-keys`
2. Click "Tambah Kunci API"
3. Copy the generated key
4. Use it as `CLOUDMAIL_API_KEY`

## Usage

### Local Client (stdio)

**Claude Desktop** (`claude_desktop_config.json`):
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

**Cursor** (`.cursor/mcp.json`):
```json
{
  "mcp": {
    "cloudmail": {
      "type": "stdio",
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

### Remote Client (HTTP+SSE)

**Start Server:**
```bash
TRANSPORT_MODE=http \
MCP_PORT=3100 \
MCP_AUTH_KEY=my-secret-key-12345 \
CLOUDMAIL_API_URL=http://192.168.110.9:8090 \
CLOUDMAIL_API_KEY=your-cloudmail-api-key \
npm run start:http
```

**Client Configuration:**
```json
{
  "mcpServers": {
    "cloudmail": {
      "url": "http://your-server:3100/sse",
      "transport": "sse",
      "headers": {
        "Authorization": "Bearer my-secret-key-12345"
      }
    }
  }
}
```

**Or using environment variables:**
```bash
export MCP_CLOUDMAIL_URL="http://your-server:3100/sse"
export MCP_CLOUDMAIL_AUTH="Bearer my-secret-key-12345"
```

## Endpoints (HTTP Mode)

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/health` | GET | Health check | ❌ |
| `/docs` | GET | API documentation | ❌ |
| `/sse` | POST | MCP SSE connection | ✅ (if `MCP_AUTH_KEY` set) |
| `/message` | POST | SSE message handler | ✅ (if `MCP_AUTH_KEY` set) |

### Test Remote Server

```bash
# Health check
curl http://localhost:3100/health

# Documentation
curl http://localhost:3100/docs | jq

# SSE connection (with auth)
curl -X POST http://localhost:3100/sse \
  -H "Authorization: Bearer my-secret-key-12345" \
  -H "Content-Type: application/json"
```

## Available Tools

### 1. `generate_email`
Generate a temporary email identity with AI-generated fake persona.

**Parameters:** None

**Returns:** Email address with persona details

### 2. `generate_bulk_emails`
Generate multiple temporary email identities at once.

**Parameters:**
- `count` (number, required): Number of emails to generate (1-50)

**Returns:** Array of email addresses with personas

### 3. `check_inbox`
Check inbox for a temporary email address.

**Parameters:**
- `email` (string, required): Full email address
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Results per page (default: 50, max: 100)

**Returns:** List of emails with metadata (subject, sender, date, preview)

### 4. `read_email`
Read full email content including body, headers, and attachments. Automatically extracts OTP codes.

**Parameters:**
- `id` (string, required): Email ID from `check_inbox`

**Returns:** Full email content with OTP extraction

### 5. `create_alias`
Create a custom email alias with optional expiration.

**Parameters:**
- `localPart` (string, required): Local part (before @)
- `domain` (string, required): Domain name
- `description` (string, optional): Alias description
- `expiresInMinutes` (number, optional): Expiration in minutes (0 = never)

**Returns:** Created alias details

### 6. `list_aliases`
List all active email aliases.

**Parameters:** None

**Returns:** Array of aliases with details

### 7. `delete_alias`
Delete an email alias.

**Parameters:**
- `id` (string, required): Alias ID

**Returns:** Success confirmation

### 8. `list_domains`
List all available domains for creating aliases.

**Parameters:** None

**Returns:** Array of domain names

## Production Deployment

### Using PM2

1. Create `.env` file:
```bash
TRANSPORT_MODE=http
MCP_PORT=3100
MCP_AUTH_KEY=your-strong-secret-key
CLOUDMAIL_API_URL=http://localhost:8090
CLOUDMAIL_API_KEY=your-cloudmail-api-key
```

2. Create PM2 ecosystem file (`ecosystem.config.js`):
```javascript
module.exports = {
  apps: [{
    name: 'cloudmail-mcp',
    script: 'src/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    cwd: '/path/to/cloudmail/mcp-server',
    env: {
      NODE_ENV: 'production',
      TRANSPORT_MODE: 'http',
      MCP_PORT: 3100,
      MCP_AUTH_KEY: 'your-strong-secret-key',
      CLOUDMAIL_API_URL: 'http://localhost:8090',
      CLOUDMAIL_API_KEY: 'your-cloudmail-api-key'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M'
  }]
};
```

3. Start with PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Using systemd

Create `/etc/systemd/system/cloudmail-mcp.service`:
```ini
[Unit]
Description=CloudMail MCP Server
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/cloudmail/mcp-server
Environment="TRANSPORT_MODE=http"
Environment="MCP_PORT=3100"
Environment="MCP_AUTH_KEY=your-strong-secret-key"
Environment="CLOUDMAIL_API_URL=http://localhost:8090"
Environment="CLOUDMAIL_API_KEY=your-cloudmail-api-key"
ExecStart=/usr/bin/npx tsx src/index.ts
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable cloudmail-mcp
sudo systemctl start cloudmail-mcp
sudo systemctl status cloudmail-mcp
```

## Security Best Practices

### 1. Use Strong Auth Keys
```bash
# Generate secure MCP_AUTH_KEY
openssl rand -hex 32
```

### 2. Firewall Rules
```bash
# Only allow specific IPs (replace with your client IP)
sudo ufw allow from 192.168.1.0/24 to any port 3100
```

### 3. Reverse Proxy (Nginx)
```nginx
server {
    listen 443 ssl http2;
    server_name mcp.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        
        # SSE specific
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400;
    }
}
```

### 4. Rate Limiting
Consider adding rate limiting middleware for production deployments.

## Troubleshooting

### Connection Refused
```bash
# Check if server is running
curl http://localhost:3100/health

# Check firewall
sudo ufw status
```

### Authentication Failed
```bash
# Verify auth key matches
echo $MCP_AUTH_KEY

# Test with correct auth
curl -X POST http://localhost:3100/sse \
  -H "Authorization: Bearer YOUR_KEY"
```

### API Key Invalid
```bash
# Verify CloudMail API key in dashboard
# Regenerate if needed at /dashboard/api-keys
```

## Development

```bash
# Install dependencies
npm install

# Run in development (stdio)
npm start

# Run in development (HTTP)
npm run start:http

# Build TypeScript
npm run build
```

## Examples

### Python Client (HTTP Mode)
```python
import requests
import json

MCP_URL = "http://localhost:3100/sse"
MCP_AUTH = "Bearer my-secret-key"

headers = {
    "Authorization": MCP_AUTH,
    "Content-Type": "application/json"
}

# Connect to MCP
response = requests.post(MCP_URL, headers=headers, stream=True)

# Use MCP tools
# (Implementation depends on your MCP client library)
```

### Node.js Client (HTTP Mode)
```javascript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const transport = new SSEClientTransport(
  new URL("http://localhost:3100/sse"),
  { Authorization: "Bearer my-secret-key" }
);

const client = new Client({
  name: "my-app",
  version: "1.0.0"
}, {
  capabilities: {}
});

await client.connect(transport);

// Call tools
const result = await client.callTool("generate_email", {});
console.log(result);
```

## License

MIT

## Support

For issues and questions:
- GitHub: https://github.com/wsatriyadi/cloudmail
- Documentation: http://your-server:3100/docs
