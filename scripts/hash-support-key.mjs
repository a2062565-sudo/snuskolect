#!/usr/bin/env node
/**
 * Генерирует хеш секретного ключа поддержки для SUPPORT_KEY_HASH.
 *
 * Использование:
 *   npm run support:hash -- "секретный-ключ"
 *
 * Результат вида `scrypt:<salt>:<hash>` добавьте в .env:
 *   SUPPORT_KEY_HASH="scrypt:..."
 *
 * Сам ключ нигде не сохраняется — сервер умеет только проверять его хеш.
 * Двоеточия безопасны для .env: Next.js не раскрывает их как переменные.
 */
import { randomBytes, scryptSync } from "node:crypto";

const key = process.argv.slice(2).join(" ").trim();

if (!key) {
  console.error('Укажите ключ: npm run support:hash -- "ваш-секретный-ключ"');
  process.exit(1);
}

if (key.length < 8) {
  console.error("Ключ слишком короткий. Используйте минимум 8 символов.");
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const hash = scryptSync(key, salt, 32, { N: 16384, r: 8, p: 1 }).toString("hex");

// Двоеточия вместо "$" выбраны специально: Next.js раскрывает $переменные в .env.
console.log(`scrypt:${salt}:${hash}`);
