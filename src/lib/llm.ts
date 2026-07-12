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

// Random per-request origin steers the LLM away from its ~10 default names.
const NAME_ORIGINS = [
  "Indonesian (Javanese)",
  "Indonesian (Sundanese)",
  "Indonesian (Batak)",
  "Indonesian (Minangkabau)",
  "Indonesian (Balinese)",
  "American (English)",
  "British (English)",
  "Irish",
  "Scottish",
  "French",
  "German",
  "Italian",
  "Spanish",
  "Portuguese (Brazilian)",
  "Mexican (Spanish)",
  "Dutch",
  "Swedish",
  "Norwegian",
  "Danish",
  "Finnish",
  "Polish",
  "Czech",
  "Hungarian",
  "Romanian",
  "Greek",
  "Russian",
  "Ukrainian",
  "Turkish",
  "Arabic (Egyptian)",
  "Arabic (Levantine)",
  "Persian (Iranian)",
  "Pakistani (Urdu)",
  "Indian (Hindi)",
  "Indian (Tamil)",
  "Indian (Bengali)",
  "Indian (Punjabi)",
  "Nigerian (Yoruba)",
  "Nigerian (Igbo)",
  "Ghanaian (Akan)",
  "Kenyan (Swahili)",
  "Ethiopian (Amharic)",
  "South African (Zulu)",
  "Japanese",
  "Korean",
  "Chinese (Mandarin)",
  "Vietnamese",
  "Thai",
  "Filipino",
  "Malaysian (Malay)",
  "Cambodian (Khmer)",
];

const NAME_STYLES = [
  "common and traditional",
  "modern and trendy",
  "classic and timeless",
  "rare and uncommon",
  "everyday and ordinary",
];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDateOfBirth(): string {
  const now = new Date();
  const minAge = 18;
  const maxAge = 65;
  const age = minAge + Math.floor(Math.random() * (maxAge - minAge + 1));
  const year = now.getFullYear() - age;
  const month = 1 + Math.floor(Math.random() * 12);
  const day = 1 + Math.floor(Math.random() * 28);
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
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

  const origin = randomChoice(NAME_ORIGINS);
  const gender = randomChoice(["male", "female"]);
  const style = randomChoice(NAME_STYLES);
  const dateOfBirth = randomDateOfBirth();

  const response = await client.chat.completions.create({
    model: config.model,
    messages: [
      {
        role: "system",
        content: `You generate realistic fictional identities for testing. Return ONLY a valid JSON object, nothing else, with exactly these fields:
- firstName: string
- lastName: string
- gender: string
- dateOfBirth: string (YYYY-MM-DD)

Rules:
- The name MUST authentically match the requested cultural origin.
- Do NOT default to overused names. Avoid clichés like "Yuki Tanaka", "Yusuf", "Kwame", "John Smith". Pick genuinely varied names each time.
- The firstName must match the requested gender.`,
      },
      {
        role: "user",
        content: `Generate ONE identity with:
- Cultural origin: ${origin}
- Gender: ${gender}
- Name style: ${style}
- Date of birth: ${dateOfBirth}

Use exactly this gender and dateOfBirth in your JSON. Pick a ${style} ${gender} name authentic to ${origin} culture. Randomness token: ${crypto.randomUUID()}`,
      },
    ],
    temperature: 1.15,
    top_p: 0.95,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("LLM tidak mengembalikan response");
  }

  const parsed = JSON.parse(content);

  return {
    firstName: String(parsed.firstName ?? "").trim(),
    lastName: String(parsed.lastName ?? "").trim(),
    gender: parsed.gender === "male" || parsed.gender === "female" ? parsed.gender : gender,
    dateOfBirth:
      typeof parsed.dateOfBirth === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.dateOfBirth)
        ? parsed.dateOfBirth
        : dateOfBirth,
  };
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
