const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const longDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: string | Date): string {
  return dateFormatter.format(new Date(value)).replace(".", "");
}

export function formatLongDate(value: string | Date): string {
  return longDateFormatter.format(new Date(value));
}

export function formatDateTime(value: string | Date): string {
  return dateTimeFormatter.format(new Date(value)).replace(".", "");
}

export function relativeTime(value: string | Date): string {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} ${plural(minutes, "минуту", "минуты", "минут")} назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${plural(hours, "час", "часа", "часов")} назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${plural(days, "день", "дня", "дней")} назад`;
  return formatDate(value);
}

export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const tail = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (tail > 1 && tail < 5) return few;
  if (tail === 1) return one;
  return many;
}

export function capCount(n: number): string {
  return `${n} ${plural(n, "крышка", "крышки", "крышек")}`;
}

export function achievementCount(n: number): string {
  return `${n} ${plural(n, "достижение", "достижения", "достижений")}`;
}

export function number(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

export function percent(value: number): string {
  return `${Math.round(value)}%`;
}

export function maskTelegramId(id: string): string {
  if (id.length <= 4) return id;
  return `${id.slice(0, 2)}•••${id.slice(-2)}`;
}