export class ApiClientError extends Error {
  status: number;
  code: string;
  data: Record<string, unknown> | null;

  constructor(
    message: string,
    status: number,
    code = "UNKNOWN",
    data: Record<string, unknown> | null = null,
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export async function apiFetch<T>(input: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(input, { ...init, headers });
  } catch {
    throw new ApiClientError(
      "Нет связи с сервером. Проверьте интернет и попробуйте снова.",
      0,
      "NETWORK",
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok) {
    const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
    const message =
      record && typeof record.error === "string"
        ? record.error
        : `Ошибка ${response.status}. Попробуйте ещё раз.`;
    throw new ApiClientError(
      message,
      response.status,
      record && typeof record.code === "string" ? record.code : "UNKNOWN",
      record,
    );
  }

  return payload as T;
}

export function postJson<T>(url: string, body: unknown): Promise<T> {
  return apiFetch<T>(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function patchJson<T>(url: string, body: unknown): Promise<T> {
  return apiFetch<T>(url, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function putJson<T>(url: string, body: unknown): Promise<T> {
  return apiFetch<T>(url, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}
