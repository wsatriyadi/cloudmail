#!/usr/bin/env node

import "dotenv/config";

console.log("CloudMail MCP Server - Configuration Test\n");
console.log("=".repeat(50));

const config = {
  CLOUDMAIL_API_URL: process.env.CLOUDMAIL_API_URL || "",
  CLOUDMAIL_API_KEY: process.env.CLOUDMAIL_API_KEY || "",
  TRANSPORT_MODE: process.env.TRANSPORT_MODE || "stdio",
  MCP_PORT: process.env.MCP_PORT || "3100",
  MCP_AUTH_KEY: process.env.MCP_AUTH_KEY || "",
};

console.log("\n📋 Configuration:");
console.log("-".repeat(50));
console.log(`CLOUDMAIL_API_URL: ${config.CLOUDMAIL_API_URL || "❌ NOT SET"}`);
console.log(`CLOUDMAIL_API_KEY: ${config.CLOUDMAIL_API_KEY ? "✅ SET (" + config.CLOUDMAIL_API_KEY.substring(0, 8) + "...)" : "❌ NOT SET"}`);
console.log(`TRANSPORT_MODE: ${config.TRANSPORT_MODE}`);
console.log(`MCP_PORT: ${config.MCP_PORT} (only for http mode)`);
console.log(`MCP_AUTH_KEY: ${config.MCP_AUTH_KEY ? "✅ SET (auth enabled)" : "⚠️  NOT SET (no auth)"}`);

console.log("\n🔍 Validation:");
console.log("-".repeat(50));

let hasErrors = false;

if (!config.CLOUDMAIL_API_URL) {
  console.log("❌ CLOUDMAIL_API_URL is required");
  hasErrors = true;
} else {
  console.log("✅ CLOUDMAIL_API_URL is set");
}

if (!config.CLOUDMAIL_API_KEY) {
  console.log("❌ CLOUDMAIL_API_KEY is required");
  hasErrors = true;
} else {
  console.log("✅ CLOUDMAIL_API_KEY is set");
}

if (config.TRANSPORT_MODE === "http") {
  console.log("✅ HTTP mode selected");
  if (!config.MCP_AUTH_KEY) {
    console.log("⚠️  MCP_AUTH_KEY not set - remote access will be unprotected!");
  } else {
    console.log("✅ MCP_AUTH_KEY is set - remote access protected");
  }
} else {
  console.log("✅ stdio mode selected (default)");
}

console.log("\n🧪 Testing CloudMail API Connection:");
console.log("-".repeat(50));

async function testConnection() {
  try {
    const url = `${config.CLOUDMAIL_API_URL}/api/dashboard/domains`;
    console.log(`Fetching: ${url}`);
    
    const res = await fetch(url, {
      headers: {
        "x-api-key": config.CLOUDMAIL_API_KEY,
      },
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`✅ Connection successful`);
      console.log(`   Status: ${res.status}`);
      console.log(`   Response: ${Array.isArray(data) ? `${data.length} domains` : "OK"}`);
    } else {
      console.log(`❌ Connection failed`);
      console.log(`   Status: ${res.status} ${res.statusText}`);
      const text = await res.text();
      console.log(`   Error: ${text.substring(0, 100)}`);
      hasErrors = true;
    }
  } catch (error) {
    console.log(`❌ Connection error: ${error instanceof Error ? error.message : String(error)}`);
    hasErrors = true;
  }
}

await testConnection();

console.log("\n📊 Summary:");
console.log("=".repeat(50));

if (hasErrors) {
  console.log("❌ Configuration has errors. Please fix before starting server.");
  console.log("\nTo fix:");
  console.log("1. Copy .env.example to .env");
  console.log("2. Edit .env and set required values");
  console.log("3. Run this test again: npm test");
  process.exit(1);
} else {
  console.log("✅ Configuration is valid!");
  console.log("\nTo start server:");
  if (config.TRANSPORT_MODE === "http") {
    console.log(`  npm run start:http`);
    console.log(`\nServer will be available at:`);
    console.log(`  - SSE endpoint: http://0.0.0.0:${config.MCP_PORT}/sse`);
    console.log(`  - Documentation: http://0.0.0.0:${config.MCP_PORT}/docs`);
    console.log(`  - Health check: http://0.0.0.0:${config.MCP_PORT}/health`);
  } else {
    console.log(`  npm start`);
    console.log(`\nServer will run in stdio mode (for Claude Desktop/Cursor)`);
  }
  console.log("\n" + "=".repeat(50));
}
