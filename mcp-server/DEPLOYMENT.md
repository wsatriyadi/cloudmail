# CloudMail MCP Server - Production Deployment Guide

## Overview

Deploy MCP server on production untuk enable remote MCP access dengan authentication.

## Server Specs

- **Host:** 192.168.110.9
- **User:** seraalfa
- **CloudMail Port:** 8090
- **MCP Port:** 3100 (recommended)

---

## Step-by-Step Deployment

### 1. Prepare Environment File

SSH ke server dan buat `.env` file:

```bash
ssh seraalfa@192.168.110.9
cd ~/cloudmail/mcp-server
```

Buat file `.env`:

```bash
nano .env
```

Isi dengan:

```bash
# CloudMail API Configuration
CLOUDMAIL_API_URL=http://localhost:8090
CLOUDMAIL_API_KEY=your-cloudmail-api-key

# Transport Mode
TRANSPORT_MODE=http

# HTTP Server Configuration
MCP_PORT=3100

# Authentication Key (generate secure key)
MCP_AUTH_KEY=your-strong-secret-key-here
```

**Generate Secure Auth Key:**

```bash
# Option 1: OpenSSL (if available)
openssl rand -hex 32

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 3: Manual
# Use random alphanumeric string (min 32 characters)
```

Save and exit (`Ctrl+X`, `Y`, `Enter`)

### 2. Get CloudMail API Key

1. Open browser: http://192.168.110.9:8090/dashboard/api-keys
2. Login ke dashboard
3. Klik "Tambah Kunci API"
4. Copy generated key
5. Paste ke `.env` sebagai `CLOUDMAIL_API_KEY`

### 3. Install Dependencies

```bash
cd ~/cloudmail/mcp-server
npm install
```

### 4. Test Configuration

```bash
npm test
```

Expected output:
```
✅ CLOUDMAIL_API_URL is set
✅ CLOUDMAIL_API_KEY is set
✅ HTTP mode selected
✅ MCP_AUTH_KEY is set - remote access protected
✅ Connection successful
✅ Configuration is valid!
```

### 5. Deploy with PM2

**Create PM2 ecosystem file:**

```bash
cd ~/cloudmail/mcp-server
nano ecosystem.config.cjs
```

Content:

```javascript
module.exports = {
  apps: [{
    name: 'cloudmail-mcp',
    script: 'src/index.ts',
    interpreter: 'node',
    interpreter_args: '--import tsx',
    cwd: '/home/seraalfa/cloudmail/mcp-server',
    env_file: '.env',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '300M',
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

**Create logs directory:**

```bash
mkdir -p logs
```

**Start with PM2:**

```bash
pm2 start ecosystem.config.cjs
pm2 save
```

**Enable PM2 startup (run once):**

```bash
pm2 startup
# Follow the instructions shown
```

### 6. Verify Deployment

**Check PM2 status:**

```bash
pm2 status cloudmail-mcp
pm2 logs cloudmail-mcp --lines 20
```

**Test health endpoint:**

```bash
curl http://localhost:3100/health
```

Expected response:
```json
{
  "status": "ok",
  "server": "cloudmail-mcp",
  "version": "1.0.0",
  "transport": "sse",
  "auth": "enabled"
}
```

**Test documentation:**

```bash
curl http://localhost:3100/docs | jq
```

**Test authenticated endpoint:**

```bash
curl -X POST http://localhost:3100/sse \
  -H "Authorization: Bearer YOUR_MCP_AUTH_KEY" \
  -H "Content-Type: application/json"
```

---

## Firewall Configuration

### Allow MCP Port

```bash
# Allow from specific network
sudo ufw allow from 192.168.110.0/24 to any port 3100

# Or allow from all (less secure)
sudo ufw allow 3100/tcp

# Check status
sudo ufw status
```

---

## Client Configuration

### Claude Desktop

Edit `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cloudmail": {
      "url": "http://192.168.110.9:3100/sse",
      "transport": "sse",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_AUTH_KEY"
      }
    }
  }
}
```

**Config locations:**
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

### Cursor

Edit `.cursor/mcp.json`:

```json
{
  "mcp": {
    "cloudmail": {
      "type": "sse",
      "url": "http://192.168.110.9:3100/sse",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_AUTH_KEY"
      }
    }
  }
}
```

### OpenCode / Other Clients

Add environment variables:

```bash
export MCP_CLOUDMAIL_URL="http://192.168.110.9:3100/sse"
export MCP_CLOUDMAIL_AUTH="Bearer YOUR_MCP_AUTH_KEY"
```

---

## Management Commands

### PM2 Operations

```bash
# Start
pm2 start cloudmail-mcp

# Stop
pm2 stop cloudmail-mcp

# Restart
pm2 restart cloudmail-mcp

# Delete
pm2 delete cloudmail-mcp

# View logs
pm2 logs cloudmail-mcp

# Monitor
pm2 monit
```

### Update MCP Server

```bash
cd ~/cloudmail
git pull origin main
cd mcp-server
npm install
pm2 restart cloudmail-mcp
```

---

## Troubleshooting

### Server Won't Start

```bash
# Check logs
pm2 logs cloudmail-mcp --err --lines 50

# Check .env file
cat .env

# Test manually
npm test
```

### Connection Refused

```bash
# Check if server is running
pm2 status cloudmail-mcp

# Check port
netstat -tuln | grep 3100

# Test locally
curl http://localhost:3100/health
```

### Authentication Failed

```bash
# Verify auth key in .env
grep MCP_AUTH_KEY .env

# Test with correct key
curl -X POST http://localhost:3100/sse \
  -H "Authorization: Bearer $(grep MCP_AUTH_KEY .env | cut -d= -f2)" \
  -v
```

### CloudMail API Errors

```bash
# Test API key
curl http://localhost:8090/api/dashboard/domains \
  -H "x-api-key: YOUR_KEY"

# Regenerate key in dashboard if needed
```

---

## Security Best Practices

1. **Strong Auth Key:** Use 32+ character random string
2. **Firewall:** Restrict access to trusted IPs only
3. **HTTPS:** Use reverse proxy (Nginx) with SSL for production
4. **Regular Updates:** Keep dependencies updated
5. **Monitor Logs:** Check for unauthorized access attempts
6. **Rotate Keys:** Change `MCP_AUTH_KEY` periodically

---

## Nginx Reverse Proxy (Optional, for HTTPS)

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

Then use `https://mcp.yourdomain.com/sse` in client config.

---

## Quick Deployment Script

Create `deploy-mcp.sh`:

```bash
#!/bin/bash
set -e

echo "Deploying CloudMail MCP Server..."

cd ~/cloudmail/mcp-server

# Pull latest
echo "Pulling latest code..."
git pull origin main

# Install deps
echo "Installing dependencies..."
npm install

# Test config
echo "Testing configuration..."
npm test

# Restart PM2
echo "Restarting server..."
pm2 restart cloudmail-mcp

# Show status
pm2 status cloudmail-mcp
pm2 logs cloudmail-mcp --lines 10 --nostream

echo "Deployment complete!"
echo "MCP endpoint: http://192.168.110.9:3100/sse"
```

Run:
```bash
chmod +x deploy-mcp.sh
./deploy-mcp.sh
```

---

**MCP Server is now ready for production use!** 🚀
