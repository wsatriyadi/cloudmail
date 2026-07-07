import OpenAI from "openai";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface LLMConfig {
  endpoint: string;
  apiKey: string;
  model: string;
}

function getSetting(key: string): string | undefined {
  return db.select().from(settings).where(eq(settings.key, key)).get()?.value;
}

export function getLLMConfig(): LLMConfig {
  return {
    endpoint: getSetting("llm_endpoint") || "https://api.openai.com/v1",
    apiKey: getSetting("llm_api_key") || "",
    model: getSetting("llm_model") || "gpt-4o-mini",
  };
}

export function createLLMClient(config?: LLMConfig): OpenAI {
  const cfg = config || getLLMConfig();
  return new OpenAI({
    baseURL: cfg.endpoint,
    apiKey: cfg.apiKey,
  });
}

export async function generateIdentity(): Promise<{
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
}> {
  const config = getLLMConfig();

  if (!config.apiKey) {
    throw new Error("LLM API key belum dikonfigurasi. Atur di Pengaturan.");
  }

  const client = createLLMClient(config);

  const response = await client.chat.completions.create({
    model: config.model,
    messages: [
      {
        role: "system",
        content: `Generate a realistic temporary identity. Return a JSON object with:
- firstName: a realistic first name
- lastName: a realistic last name
- gender: "male" or "female"
- dateOfBirth: a realistic date (YYYY-MM-DD format, age 18-65)

Be creative and diverse. Never repeat. Use names from various cultural backgrounds.
Return ONLY valid JSON, nothing else.`,
      },
      {
        role: "user",
        content: `Generate a unique identity. Seed: ${crypto.randomUUID()}`,
      },
    ],
    temperature: 1.2,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("LLM tidak mengembalikan response");
  }

  return JSON.parse(content);
}

export function generateUsername(firstName: string, lastName: string): string {
  const first = firstName.toLowerCase().replace(/[^a-z]/g, "");
  const last = lastName.toLowerCase().replace(/[^a-z]/g, "");
  const rand = Math.floor(Math.random() * 900) + 100;

  const strategies = [
    () => `${first}.${last}`,
    () => `${first}${last.slice(0, 3)}${Math.floor(Math.random() * 90) + 10}`,
    () => `${first[0]}${last}${rand}`,
    () => `${first}_${last}`,
    () => `${first}${Math.floor(Math.random() * 9000) + 1000}`,
  ];

  return strategies[Math.floor(Math.random() * strategies.length)]();
}
