#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Environment validation
// ---------------------------------------------------------------------------

const CLOUDMAIL_API_URL =
  process.env.CLOUDMAIL_API_URL?.replace(/\/+$/, "") ?? "";
const CLOUDMAIL_API_KEY = process.env.CLOUDMAIL_API_KEY ?? "";

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
      "Set it to your CloudMail API key."
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Shared API helper
// ---------------------------------------------------------------------------

async function callApi(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: unknown
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  const url = `${CLOUDMAIL_API_URL}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${CLOUDMAIL_API_KEY}`,
  };

  if (method === "POST" || method === "DELETE") {
    headers["Content-Type"] = "application/json";
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    let data: unknown;
    const contentType = res.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status}: ${text}` };
      }
      data = { message: text };
    }

    if (!res.ok) {
      const msg =
        typeof data === "object" && data !== null && "error" in data
          ? String((data as Record<string, unknown>).error)
          : typeof data === "object" && data !== null && "message" in data
            ? String((data as Record<string, unknown>).message)
            : `HTTP ${res.status}`;
      return { ok: false, error: msg };
    }

    return { ok: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Request failed: ${message}` };
  }
}

/** Convenience: turn callApi result into an MCP tool response. */
function toMcpResponse(result: Awaited<ReturnType<typeof callApi>>) {
  if (!result.ok) {
    return {
      isError: true as const,
      content: [{ type: "text" as const, text: `Error: ${result.error}` }],
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
      .min(1)
      .max(20)
      .default(5)
      .describe("Number of identities to generate (1-20)"),
  },
  async ({ count }) => {
    const result = await callApi(
      "POST",
      `/api/generate/bulk?count=${count}`
    );
    return toMcpResponse(result);
  }
);

// 3. check_inbox
server.tool(
  "check_inbox",
  "Check inbox for a temporary email address. Returns list of received emails with metadata.",
  {
    email: z.string().email(),
    page: z.number().optional().default(1),
    limit: z.number().optional().default(20),
  },
  async ({ email, page, limit }) => {
    const result = await callApi(
      "GET",
      `/api/inbox/${encodeURIComponent(email)}?page=${page}&limit=${limit}`
    );
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
    const result = await callApi(
      "GET",
      `/api/inbox/view/${encodeURIComponent(id)}`
    );
    return toMcpResponse(result);
  }
);

// 5. create_alias
server.tool(
  "create_alias",
  "Create a custom email alias with optional expiration",
  {
    localPart: z.string().describe("The part before @ in the email"),
    domain: z.string().describe("Domain to use"),
    description: z.string().optional(),
    expiresInMinutes: z
      .number()
      .optional()
      .describe("Auto-expire after N minutes"),
  },
  async ({ localPart, domain, description, expiresInMinutes }) => {
    const body: Record<string, unknown> = { localPart, domain };
    if (description !== undefined) body.description = description;
    if (expiresInMinutes !== undefined)
      body.expiresInMinutes = expiresInMinutes;

    const result = await callApi("POST", "/api/alias", body);
    return toMcpResponse(result);
  }
);

// 6. list_aliases
server.tool(
  "list_aliases",
  "List all active email aliases",
  {},
  async () => {
    const result = await callApi("GET", "/api/alias");
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
    const result = await callApi("DELETE", "/api/alias", { id });
    return toMcpResponse(result);
  }
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("CloudMail MCP Server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting CloudMail MCP Server:", err);
  process.exit(1);
});
