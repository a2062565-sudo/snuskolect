import { z } from "zod";

const visionSchema = z.object({
  text: z.string().default(""),
  manufacturer: z.string().default(""),
  brand: z.string().default(""),
  flavor: z.string().default(""),
  strength: z.string().default(""),
});

export interface VisionResult {
  text: string;
  manufacturer: string;
  brand: string;
  flavor: string;
  strength: string;
}

export function isVisionConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/**
 * Optional vision fallback. Only called when local OCR produced too little text.
 * The result is used as additional OCR text; rarity is NEVER taken from AI.
 */
export async function analyzeImageWithVision(image: Buffer): Promise<VisionResult | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 700,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You extract text and visible metadata from a photograph of a snus can lid. Never guess. If information is not visible, return an empty string. Return only valid JSON with keys: text, manufacturer, brand, flavor, strength. The text must be a literal transcription, not an interpretation.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract the exact visible text and, only if clearly printed, manufacturer, brand, flavor and strength.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${image.toString("base64")}`,
                  detail: "high",
                },
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) return null;
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return null;

    const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
    const parsed = visionSchema.safeParse(JSON.parse(cleaned));
    if (!parsed.success) return null;
    return parsed.data;
  } catch {
    return null;
  }
}