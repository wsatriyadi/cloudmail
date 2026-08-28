#!/usr/bin/env node

import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import express from "express";
import cors from "cors";

// ---------------------------------------------------------------------------
// Environment validation
// ---------------------------------------------------------------------------

const CLOUDMAIL_API_URL =
  process.env.CLOUDMAIL_API_URL?.replace(/\/+$/, "") ?? "";
const CLOUDMAIL_API_KEY = process.env.CLOUDMAIL_API_KEY ?? "";
const MCP_PORT = parseInt(process.env.MCP_PORT || "3100", 10);
const MCP_AUTH_KEY = process.env.MCP_AUTH_KEY || ""; // Auth key untuk MCP remote
const TRANSPORT_MODE = process.env.TRANSPORT_MODE || "stdio"; // "stdio" or "http"

if (!CLOUDMAIL_API_URL) {
  console.error(
    "ERROR: CLOUDMAIL_API_URL environment variable is required. " +
      "Set it to the base URL of your CloudMail API (e.g. http://localhost:3000)."
  );
  process.exit(1);
}

if (!CLOUDMAIL_API_KEY) {
  console.error(
    "ERROR: CLOUDMAIL_API_KEY environment variable is required. " +
      "Generate one from your CloudMail dashboard (/dashboard/api-keys)."
  );
  process.exit(1);
}

if (TRANSPORT_MODE === "http" && !MCP_AUTH_KEY) {
  console.error(
    "WARNING: MCP_AUTH_KEY not set. Remote MCP will be accessible without authentication."
  );
}

// ---------------------------------------------------------------------------
// Shared API helper
// ---------------------------------------------------------------------------

async function callApi(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: unknown
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  try {
    const url = `${CLOUDMAIL_API_URL}${path}`;
    const opts: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLOUDMAIL_API_KEY,
      },
    };
    if (body) {
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(url, opts);
    const text = await res.text();

    if (!res.ok) {
      return {
        ok: false,
        error: `HTTP ${res.status}: ${text || res.statusText}`,
      };
    }

    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    return { ok: true, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

/** Convenience: turn callApi result into an MCP tool response. */
function toMcpResponse(result: Awaited<ReturnType<typeof callApi>>) {
  if (!result.ok) {
    return {
      content: [{ type: "text" as const, text: `Error: ${result.error}` }],
      isError: true,
    };
  }
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(result.data, null, 2) },
    ],
  };
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "cloudmail",
  version: "1.0.0",
});

// 1. generate_email
server.tool(
  "generate_email",
  "Generate a temporary email identity with AI-generated fake persona",
  {},
  async () => {
    const result = await callApi("POST", "/api/generate");
    return toMcpResponse(result);
  }
);

// 2. generate_bulk_emails
server.tool(
  "generate_bulk_emails",
  "Generate multiple temporary email identities at once",
  {
    count: z
      .number()
      .int()
      .min(1)
      .max(50)
      .describe("Number of email identities to generate (1-50)"),
  },
  async ({ count }) => {
    const result = await callApi("POST", "/api/generate/bulk", { count });
    return toMcpResponse(result);
  }
);

// 3. check_inbox
server.tool(
  "check_inbox",
  "Check inbox for a temporary email address. Returns list of received emails with metadata.",
  {
    email: z.string().describe("Full email address to check"),
    page: z.number().int().min(1).optional().describe("Page number (default: 1)"),
    limit: z.number().int().min(1).max(100).optional().describe("Results per page (default: 50)"),
  },
  async ({ email, page, limit }) => {
    const params = new URLSearchParams({ email });
    if (page) params.set("page", String(page));
    if (limit) params.set("limit", String(limit));
    const result = await callApi("GET", `/api/inbox/${email}?${params}`);
    return toMcpResponse(result);
  }
);

// 4. read_email
server.tool(
  "read_email",
  "Read the full content of an email including body, headers, and attachments info. Also extracts OTP codes if present.",
  {
    id: z.string().describe("Email ID from check_inbox results"),
  },
  async ({ id }) => {
    const result = await callApi("GET", `/api/inbox/view/${id}`);
    return toMcpResponse(result);
  }
);

// 5. create_alias
server.tool(
  "create_alias",
  "Create a custom email alias with optional expiration",
  {
    localPart: z.string().describe("Local part of email (before @)"),
    domain: z.string().describe("Domain to use for alias"),
    description: z.string().optional().describe("Optional description"),
    expiresInMinutes: z.number().int().min(0).optional().describe("Expiration in minutes (0 = never)"),
  },
  async ({ localPart, domain, description, expiresInMinutes }) => {
    const result = await callApi("POST", "/api/dashboard/aliases", {
      localPart,
      domain,
      description,
      expiresIn: expiresInMinutes || 0,
    });
    return toMcpResponse(result);
  }
);

// 6. list_aliases
server.tool(
  "list_aliases",
  "List all active email aliases",
  {},
  async () => {
    const result = await callApi("GET", "/api/dashboard/aliases");
    return toMcpResponse(result);
  }
);

// 7. delete_alias
server.tool(
  "delete_alias",
  "Delete an email alias",
  {
    id: z.string().describe("Alias ID to delete"),
  },
  async ({ id }) => {
    const result = await callApi("DELETE", "/api/dashboard/aliases", { id });
    return toMcpResponse(result);
  }
);

// 8. list_domains
server.tool(
  "list_domains",
  "List all available domains for creating aliases",
  {},
  async () => {
    const result = await callApi("GET", "/api/dashboard/domains");
    return toMcpResponse(result);
  }
);

// ---------------------------------------------------------------------------
// Start Server (stdio or HTTP+SSE)
// ---------------------------------------------------------------------------

async function startStdio() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("CloudMail MCP Server running on stdio");
}

async function startHttp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Auth middleware
  const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (MCP_AUTH_KEY) {
      const authHeader = req.headers.authorization;
      if (!authHeader || authHeader !== `Bearer ${MCP_AUTH_KEY}`) {
        res.status(401).json({ error: "Unauthorized: Invalid or missing API key" });
        return;
      }
    }
    next();
  };

  // Health check
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      server: "cloudmail-mcp",
      version: "1.0.0",
      transport: "sse",
      auth: MCP_AUTH_KEY ? "enabled" : "disabled",
    });
  });

  // MCP SSE endpoint
  app.post("/sse", requireAuth, async (req, res) => {
    console.error(`[MCP] New SSE connection from ${req.ip}`);
    
    const transport = new SSEServerTransport("/message", res);
    await server.connect(transport);

    req.on("close", () => {
      console.error(`[MCP] SSE connection closed from ${req.ip}`);
    });
  });

  // Message endpoint for SSE
  app.post("/message", requireAuth, async (req, res) => {
    // SSE transport handles this internally
    res.status(200).end();
  });

  // API documentation endpoint
  app.get("/docs", (req, res) => {
    res.json({
      name: "CloudMail MCP Server",
      version: "1.0.0",
      description: "Model Context Protocol server for CloudMail temporary email platform",
      transport: "SSE (Server-Sent Events)",
      authentication: MCP_AUTH_KEY ? "Required: Bearer token in Authorization header" : "None",
      endpoints: {
        health: {
          method: "GET",
          path: "/health",
          description: "Health check endpoint",
        },
        sse: {
          method: "POST",
          path: "/sse",
          description: "MCP SSE connection endpoint",
          headers: MCP_AUTH_KEY ? { Authorization: "Bearer YOUR_MCP_AUTH_KEY" } : {},
        },
      },
      tools: [
        {
          name: "generate_email",
          description: "Generate a temporary email identity with AI-generated fake persona",
          parameters: {},
        },
        {
          name: "generate_bulk_emails",
          description: "Generate multiple temporary email identities at once",
          parameters: { count: "number (1-50)" },
        },
        {
          name: "check_inbox",
          description: "Check inbox for a temporary email address",
          parameters: {
            email: "string (required)",
            page: "number (optional)",
            limit: "number (optional, max 100)",
          },
        },
        {
          name: "read_email",
          description: "Read full email content including OTP extraction",
          parameters: { id: "string (required)" },
        },
        {
          name: "create_alias",
          description: "Create a custom email alias with optional expiration",
          parameters: {
            localPart: "string (required)",
            domain: "string (required)",
            description: "string (optional)",
            expiresInMinutes: "number (optional, 0 = never)",
          },
        },
        {
          name: "list_aliases",
          description: "List all active email aliases",
          parameters: {},
        },
        {
          name: "delete_alias",
          description: "Delete an email alias",
          parameters: { id: "string (required)" },
        },
        {
          name: "list_domains",
          description: "List all available domains for creating aliases",
          parameters: {},
        },
      ],
      clientConfiguration: {
        description: "Add this to your MCP client config",
        example: {
          cloudmail: {
            url: `http://YOUR_SERVER_IP:${MCP_PORT}/sse`,
            transport: "sse",
            headers: MCP_AUTH_KEY ? { Authorization: "Bearer YOUR_MCP_AUTH_KEY" } : {},
          },
        },
      },
    });
  });

  app.listen(MCP_PORT, () => {
    console.error(`CloudMail MCP Server running on http://0.0.0.0:${MCP_PORT}`);
    console.error(`- SSE endpoint: http://0.0.0.0:${MCP_PORT}/sse`);
    console.error(`- Documentation: http://0.0.0.0:${MCP_PORT}/docs`);
    console.error(`- Health check: http://0.0.0.0:${MCP_PORT}/health`);
    console.error(`- Auth: ${MCP_AUTH_KEY ? "Enabled (Bearer token required)" : "Disabled"}`);
  });
}

async function main() {
  if (TRANSPORT_MODE === "http") {
    await startHttp();
  } else {
    await startStdio();
  }
}

main().catch((err) => {
  console.error("Fatal error starting CloudMail MCP Server:", err);
  process.exit(1);
});
