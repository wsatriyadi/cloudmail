import { db } from "../src/lib/db";
import { users, settings } from "../src/lib/db/schema";
import { hashSync } from "bcryptjs";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import crypto from "crypto";

async function seed() {
  console.log("🌱 Seeding database...");

  const adminEmail = process.env.ADMIN_EMAIL || "admin@cloudmail.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  const existingUser = (await db.select().from(users).where(eq(users.email, adminEmail)))[0];

  if (!existingUser) {
    await db.insert(users)
      .values({
        id: nanoid(),
        email: adminEmail,
        passwordHash: hashSync(adminPassword, 12),
        name: "Admin",
        role: "admin",
      });
    console.log(`✅ Admin user dibuat: ${adminEmail}`);
  } else {
    console.log(`⏭️  Admin user sudah ada: ${adminEmail}`);
  }

  const defaultSettings: Record<string, string> = {
    platform_name: "CloudMail",
    llm_endpoint: "https://api.openai.com/v1",
    llm_api_key: "",
    llm_model: "gpt-4o-mini",
    logo_path: "",
    favicon_path: "",
    email_retention_days: "30",
    worker_secret:
      process.env.WORKER_INGEST_SECRET || crypto.randomBytes(32).toString("hex"),
    webhook_url: "",
  };

  for (const [key, value] of Object.entries(defaultSettings)) {
    const existing = (await db.select().from(settings).where(eq(settings.key, key)))[0];

    if (!existing) {
      await db.insert(settings).values({ key, value });
      console.log(`✅ Setting: ${key} = ${key.includes("secret") || key.includes("api_key") ? "***" : value}`);
    }
  }

  console.log("\n🎉 Seeding selesai!");
}

seed().catch(console.error);
