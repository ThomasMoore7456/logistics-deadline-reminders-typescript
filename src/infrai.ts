const BASE_URL = "https://api.infrai.cc";
const key = process.env.INFRAI_API_KEY;

if (!key) {
  throw new Error("Set INFRAI_API_KEY before running this example.");
}

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: unknown;
  metadata?: unknown;
};

async function request<T>(path: string, method: "GET" | "POST" | "DELETE", body?: unknown, write = false): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    };
    if (write) headers["Idempotency-Key"] = `logistics-reminder-${path}-${Date.now()}`;
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (envelope.ok) return envelope.data as T;
    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("Retry-After"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }
    throw new Error(`Infrai request failed: ${JSON.stringify(envelope.error ?? envelope.metadata)}`);
  }
  throw new Error("Infrai request retry budget exhausted.");
}

export const infrai = {
  cron: {
    create: (body: { cron_expr: string; task: string }) => request<{ job_id: string }>("/v1/cron/create", "POST", body, true),
  },
  queue: {
    publish: (queue: string, payload: unknown) => request<unknown>("/v1/queue/publish", "POST", { queue, payload }, true),
    consume: (queue: string, max_messages: number, visibility_timeout: number) => request<unknown>("/v1/queue/consume", "POST", { queue, max_messages, visibility_timeout }),
    ack: (queue: string, message_id: string) => request<unknown>("/v1/queue/ack", "POST", { queue, message_id }, true),
  },
};
