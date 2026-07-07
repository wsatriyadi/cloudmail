import { NextResponse } from "next/server";
import { getLLMConfig, createLLMClient } from "@/lib/llm";

export async function POST() {
  try {
    const config = getLLMConfig();
    if (!config.apiKey) {
      return NextResponse.json({ error: "API key belum dikonfigurasi" }, { status: 400 });
    }

    const client = createLLMClient(config);
    const response = await client.chat.completions.create({
      model: config.model,
      messages: [{ role: "user", content: "Say hello in one word." }],
      max_tokens: 10,
    });

    return NextResponse.json({
      success: true,
      model: response.model,
      response: response.choices[0]?.message?.content,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Koneksi gagal" },
      { status: 500 }
    );
  }
}
