import { randomBytes } from "crypto";

const RESERVED = new Set([
  "admin",
  "api",
  "login",
  "collection",
  "add",
  "achievements",
  "stats",
  "profile",
  "settings",
  "support",
  "u",
  "bot",
  "demo",
  "kaps",
]);

export function slugify(input: string): string {
  const transliterated = input
    .trim()
    .toLowerCase()
    .replace(/[а-яё]/g, (char) => {
      const map: Record<string, string> = {
        а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
        и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
        с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
        ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
      };
      return map[char] ?? "";
    })
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  return transliterated || "collector";
}

export function randomSuffix(length = 4): string {
  return randomBytes(4).toString("hex").slice(0, length);
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED.has(slug);
}