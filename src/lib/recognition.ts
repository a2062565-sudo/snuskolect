import type { Rarity, ScanRecognition } from "./types";

export interface CatalogManufacturer {
  id: string;
  name: string;
  aliases: string[];
  models: {
    id: string;
    brand: string;
    name: string;
    rarity: Rarity;
    flavor: string | null;
    strength: string | null;
    description: string | null;
    aliases: string[];
    keywords: string[];
  }[];
}

export interface MatchedModel {
  model: CatalogManufacturer["models"][number];
  manufacturer: CatalogManufacturer;
  score: number;
  alias: string;
}

export interface MatchedManufacturer {
  manufacturer: CatalogManufacturer;
  score: number;
  alias: string;
}

export function normalizeSearch(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[ÅÄÖÆØåäöæø]/g, (char) => {
      const map: Record<string, string> = {
        Å: "A", Ä: "A", Ö: "O", Æ: "AE", Ø: "O",
        å: "a", ä: "a", ö: "o", æ: "ae", ø: "o",
      };
      return map[char] ?? char;
    })
    .replace(/[Ёё]/g, "Е")
    .toUpperCase()
    .replace(/[^A-ZА-Я0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function cleanOcrText(text: string): string {
  return text
    .replace(/\r/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .slice(0, 1600)
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = temp;
    }
  }
  return previous[b.length];
}

function fuzzyTokenMatch(sourceToken: string, targetToken: string): boolean {
  if (sourceToken === targetToken) return true;
  if (sourceToken.length >= 8 && targetToken.length >= 8) {
    return levenshtein(sourceToken, targetToken) <= 2;
  }
  if (sourceToken.length >= 5 && targetToken.length >= 5) {
    return levenshtein(sourceToken, targetToken) <= 1;
  }
  return false;
}

function phrasePresent(text: string, alias: string): boolean {
  const words = text.split(" ");
  const aliasWords = alias.split(" ").filter(Boolean);
  if (aliasWords.length === 0) return false;
  if (aliasWords.length === 1) {
    return words.some((word) => fuzzyTokenMatch(word, aliasWords[0]));
  }

  for (let i = 0; i <= words.length - aliasWords.length; i++) {
    let allMatch = true;
    for (let j = 0; j < aliasWords.length; j++) {
      if (!fuzzyTokenMatch(words[i + j], aliasWords[j])) {
        allMatch = false;
        break;
      }
    }
    if (allMatch) return true;
  }

  // Some OCR engines split a long brand across lines. Allow ordered words anywhere.
  let cursor = 0;
  let matches = 0;
  for (const aliasWord of aliasWords) {
    const found = words.findIndex((word, index) => index >= cursor && fuzzyTokenMatch(word, aliasWord));
    if (found >= 0) {
      matches += 1;
      cursor = found + 1;
    }
  }
  return matches === aliasWords.length;
}

function aliasScore(text: string, alias: string): number | null {
  const normalizedAlias = normalizeSearch(alias);
  if (normalizedAlias.length < 3) return null;
  if (!phrasePresent(text, normalizedAlias)) return null;
  const words = normalizedAlias.split(" ").length;
  return words * 1000 + normalizedAlias.length;
}

export function matchModel(text: string, catalog: CatalogManufacturer[]): MatchedModel | null {
  const normalized = normalizeSearch(text);
  if (!normalized) return null;
  let best: MatchedModel | null = null;

  for (const manufacturer of catalog) {
    for (const model of manufacturer.models) {
      const candidates = [
        ...model.aliases,
        ...model.keywords,
        `${model.brand} ${model.name}`,
      ];
      for (const alias of candidates) {
        const score = aliasScore(normalized, alias);
        if (score !== null && (!best || score > best.score)) {
          best = { model, manufacturer, score, alias };
        }
      }
    }
  }

  return best;
}

export function matchManufacturer(
  text: string,
  catalog: CatalogManufacturer[],
): MatchedManufacturer | null {
  const normalized = normalizeSearch(text);
  if (!normalized) return null;
  let best: MatchedManufacturer | null = null;

  for (const manufacturer of catalog) {
    const candidates = [manufacturer.name, ...manufacturer.aliases];
    for (const alias of candidates) {
      const score = aliasScore(normalized, alias);
      if (score !== null && (!best || score > best.score)) {
        best = { manufacturer, score, alias };
      }
    }
  }

  return best;
}

const FLAVORS: [string[], string][] = [
  [["COOL MINT", "COOLMINT", "ХОЛОДНАЯ МЯТА"], "холодная мята"],
  [["PEPPERMINT", "ПЕППЕРМИНТ"], "перечная мята"],
  [["SPEARMINT", "СПИРМINT"], "мята"],
  [["WINTERGREEN", "ЗИМНЯЯ МЯТА"], "зимняя мята"],
  [["MENTHOL", "МЕНТОЛ"], "ментол"],
  [["MINT", "МЯТА"], "мята"],
  [["LICORICE", "LIQUORICE", "ЛАКРИЦА", "СОЛОДКА"], "лакрица"],
  [["JALAPENO", "JALAPEÑO", "ХАЛАПЕНЬО"], "халапеньо и лайм"],
  [["LIME", "ЛАЙМ"], "лайм"],
  [["LEMON", "ЛИМОН"], "лимон"],
  [["CITRUS", "ЦИТРУС"], "цитрус"],
  [["MANGO", "МАНГО"], "манго"],
  [["WATERMELON", "АРБУЗ"], "арбуз"],
  [["RASPBERRY", "МАЛИНА"], "малина"],
  [["BLUEBERRY", "ЧЕРНИКА"], "черника"],
  [["STRAWBERRY", "ЗЕМЛЯНИКА"], "земляника"],
  [["RUBY BERRY", "RUBY", "ЯГОДЫ"], "ягоды"],
  [["BERRY", "ЯГОД"], "ягоды"],
  [["GRAPE", "ВИНОГРАД"], "виноград"],
  [["PINEAPPLE", "АНАНАС"], "ананас"],
  [["APPLE", "ЯБЛОКО"], "яблоко"],
  [["ESPRESSO", "ЭСПРЕССО"], "эспрессо"],
  [["COFFEE", "КОФЕ"], "кофе"],
  [["MOCHA", "МОКА"], "мокко"],
  [["VANILLA", "ВАНИЛЬ"], "ваниль"],
  [["CINNAMON", "КОРИЦА"], "корица"],
  [["COLA", "КОЛА"], "кола"],
  [["ENERGY", "ЭНЕРГИЯ"], "энергия"],
  [["GINGER", "ИМБИРЬ"], "имбирь"],
  [["WHISKY", "WHISKEY", "ВИСКИ"], "виски"],
  [["PORT", "ПОРТВЕЙН"], "портвейн"],
  [["HJORTRON", "CLOUDBERRY", "МОРОШКА"], "морошка"],
  [["BERGAMOT", "БЕРГАМОТ"], "бергамот"],
  [["ANISE", "АНИС"], "анис"],
  [["BLACK PEPPER", "PEPPER", "ПЕРЕЦ"], "чёрный перец"],
  [["HERBAL", "ТРАВЫ"], "травы"],
  [["SPICED", "ПРЯНОСТИ"], "пряности"],
  [["ORIGINAL", "ОРИГИНАЛЬНЫЙ"], "оригинальный"],
];

export function detectFlavor(text: string): string | null {
  const normalized = normalizeSearch(text);
  for (const [needles, label] of FLAVORS) {
    if (needles.some((needle) => phrasePresent(normalized, normalizeSearch(needle)))) {
      return label;
    }
  }
  return null;
}

export function detectStrength(text: string): string | null {
  const upper = text.toUpperCase();
  const match = upper.match(
    /(\d{1,2}(?:[.,]\d)?)\s*(?:MG|МГ)(?:\s*\/\s*(G|Г|ГРАММ|ПОРЦ(?:ИЯ|ИИ)?|PORTION))?/,
  );
  if (match) {
    const amount = match[1].replace(",", ".");
    if (match[2]) {
      const unit = /G|Г|ГРАММ/i.test(match[2]) ? "мг/г" : "мг";
      return `${amount} ${unit}`;
    }
    return `${amount} мг`;
  }

  const phrases: [RegExp, string][] = [
    [/ULTRA\s+STRONG|УЛЬТРА\s+СИЛЬН/, "Ultra Strong"],
    [/EXTRA\s+STRONG|ЭКСТРА\s+СИЛЬН/, "Extra Strong"],
    [/SUPER\s+STRONG/, "Super Strong"],
    [/STRONG|СИЛЬН/, "Strong"],
    [/SLIM|СЛИМ/, "Slim"],
    [/MINI|МИНИ/, "Mini"],
    [/WHITE|БЕЛ/, "White"],
  ];
  for (const [regex, label] of phrases) {
    if (regex.test(upper)) return label;
  }
  return null;
}

export interface RecognitionOptions {
  catalog: CatalogManufacturer[];
  confidence: number;
  source?: "tesseract" | "vision" | "mixed";
  minConfidence?: number;
}

export interface RecognitionOutcome {
  reliable: boolean;
  failureReason: string | null;
  recognition: ScanRecognition;
}

function buildDescription(
  model: MatchedModel | null,
  manufacturer: MatchedManufacturer | null,
  ocrText: string,
): string {
  const parts: string[] = [];
  if (model?.model.description) parts.push(model.model.description);
  if (ocrText) parts.push(`Текст с крышки:\n${ocrText}`);
  if (parts.length === 0 && manufacturer) {
    parts.push(`Производитель: ${manufacturer.manufacturer.name}`);
  }
  return parts.join("\n\n").slice(0, 4000);
}

export function recognizeCatalogText(
  rawText: string,
  options: RecognitionOptions,
): RecognitionOutcome {
  const ocrText = cleanOcrText(rawText);
  const minConfidence = options.minConfidence ?? (Number(process.env.OCR_MIN_CONFIDENCE ?? 30) || 30);
  const alphanumeric = (ocrText.match(/[A-Za-zА-Яа-я0-9]/g) ?? []).length;
  const compact = ocrText.replace(/\s+/g, "");
  const alphanumericRatio = compact.length ? alphanumeric / compact.length : 0;
  const readableWords = normalizeSearch(ocrText).split(" ").filter((word) => word.length >= 2);
  const readable = alphanumericRatio >= 0.55 && readableWords.length >= 2;

  const modelMatch = matchModel(ocrText, options.catalog);
  const manufacturerMatch = modelMatch
    ? { manufacturer: modelMatch.manufacturer, score: modelMatch.score, alias: modelMatch.alias }
    : matchManufacturer(ocrText, options.catalog);

  const hasCatalogMatch = Boolean(modelMatch || manufacturerMatch);
  const reliable =
    hasCatalogMatch ||
    (alphanumeric >= 8 && readable && options.confidence >= Math.max(minConfidence, 45));

  if (!reliable) {
    return {
      reliable: false,
      failureReason:
        "Не удалось уверенно прочитать крышку. Убедитесь, что текст в фокусе, нет бликов, и сделайте новое фото.",
      recognition: {
        manufacturerId: null,
        manufacturerName: null,
        capModelId: null,
        brandName: null,
        productName: null,
        flavor: null,
        strength: null,
        rarity: "UNDETERMINED",
        description: ocrText,
        recognizedText: ocrText,
        confidence: options.confidence,
        warning: null,
        matchedAlias: null,
        source: options.source ?? "tesseract",
      },
    };
  }

  const model = modelMatch?.model ?? null;
  const manufacturer = manufacturerMatch?.manufacturer ?? null;
  const flavor = model?.flavor ?? detectFlavor(ocrText);
  const strength = model?.strength ?? detectStrength(ocrText);
  const rarity: Rarity = model?.rarity ?? "UNDETERMINED";

  let warning: string | null = null;
  if (!model && manufacturer) {
    warning =
      "Производитель распознан, но конкретная модель отсутствует в каталоге. Редкость не определена — её можно исправить в панели администратора.";
  } else if (!model && !manufacturer && alphanumeric >= 4) {
    warning =
      "Текст прочитан, но крышки нет в каталоге. Производитель и редкость не определены. Проверьте описание перед сохранением.";
  }

  return {
    reliable: true,
    failureReason: null,
    recognition: {
      manufacturerId: manufacturer?.id ?? null,
      manufacturerName: manufacturer?.name ?? null,
      capModelId: model?.id ?? null,
      brandName: model?.brand ?? null,
      productName: model?.name ?? null,
      flavor,
      strength,
      rarity,
      description: buildDescription(modelMatch, manufacturerMatch, ocrText),
      recognizedText: ocrText,
      confidence: Math.round(options.confidence),
      warning,
      matchedAlias: modelMatch?.alias ?? manufacturerMatch?.alias ?? null,
      source: options.source ?? "tesseract",
    },
  };
}