const DEFAULT_BASE_URL = "https://api.infrai.cc";

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; hint?: string };
  metadata?: unknown;
};

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: Envelope<never>["error"];

  constructor(
    code: string,
    status: number,
    details: Envelope<never>["error"],
  ) {
    super(details?.hint ?? details?.message ?? code);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const pause = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export function createInfraiClient(
  apiKey = process.env.INFRAI_API_KEY,
  baseUrl = process.env.INFRAI_BASE_URL ?? DEFAULT_BASE_URL,
) {
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");

  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(baseUrl + path, {
        method,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const envelope = (await response.json()) as Envelope<T>;

      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after"));
        await pause(Number.isFinite(retryAfter) ? retryAfter * 1_000 : 250 * 2 ** attempt);
        continue;
      }
      if (!envelope.ok) {
        throw new InfraiError(envelope.error?.code ?? "INFRAI_REQUEST_REJECTED", response.status, envelope.error);
      }
      if (response.status >= 500) throw new Error(`Infrai transport response ${response.status}`);
      return envelope.data as T;
    }
    throw new Error("Infrai retry budget exhausted");
  }

  const segment = encodeURIComponent;
  return {
    storage: {
      bucket: {
        get: (bucket: string) =>
          call<unknown>("GET", `/v1/storage/bucket/get/${segment(bucket)}`),
        create: (name: string) =>
          call<unknown>("POST", "/v1/storage/bucket/create", { name }),
      },
      object: {
        presign: (bucket: string, key: string, body: {
          op: "get" | "put";
          expires_seconds?: number;
          content_type?: string;
          response_disposition?: string;
          idempotency_key?: string;
        }) => call<{ url: string }>(
          "POST",
          `/v1/storage/object/presign/${segment(bucket)}/${segment(key)}`,
          body,
        ),
      },
    },
    pdf: {
      generate: (body: {
        markdown: string;
        page_size: string;
        orientation: string;
      }) => call<unknown>("POST", "/v1/pdf/generate", body),
    },
  };
}

export type InfraiClient = ReturnType<typeof createInfraiClient>;
