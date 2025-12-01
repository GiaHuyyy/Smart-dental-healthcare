type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

type ApiRequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  token?: string;
  abortSignal?: AbortSignal;
};

type ApiResponse<T> = {
  data: T;
  message?: string;
  status: number;
  raw: unknown;
};

const fallbackBaseUrl = process.env.EXPO_PUBLIC_API_URL;

const envBaseUrl = [
  process.env.EXPO_PUBLIC_BACKEND_URL,
  process.env.NEXT_PUBLIC_BACKEND_URL,
  process.env.BACKEND_URL,
]
  .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
  .at(0);

const rawBaseUrl = (envBaseUrl ?? fallbackBaseUrl).replace(/\/+$/, '');
export const API_BASE_URL = rawBaseUrl.endsWith('/api/v1') ? rawBaseUrl : `${rawBaseUrl}/api/v1`;

const normalizePath = (path: string): string => {
  if (!path) return '/';
  // If absolute URL, return as-is
  if (/^https?:\/\//i.test(path)) return path;

  let p = path.trim();
  if (!p.startsWith('/')) p = `/${p}`;

  // Avoid duplicating /api/v1 when base already contains it
  const baseHasApiV1 = API_BASE_URL.toLowerCase().endsWith('/api/v1');
  if (baseHasApiV1 && p.toLowerCase().startsWith('/api/v1')) {
    p = p.slice('/api/v1'.length);
    if (!p.startsWith('/')) p = `/${p}`;
  }

  return p;
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
  const { method = 'GET', body, headers = {}, token, abortSignal } = options;
  const normalized = normalizePath(path);
  const targetUrl = /^https?:\/\//i.test(normalized)
    ? normalized
    : `${API_BASE_URL}${normalized}`;

  const response = await fetch(targetUrl, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: abortSignal,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const rawPayload: unknown = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof rawPayload === 'string'
        ? rawPayload
        : (rawPayload as { message?: string; error?: string } | null)?.message ??
          (rawPayload as { message?: string; error?: string } | null)?.error ??
          'Đã có lỗi xảy ra';

    const error = new Error(message) as Error & { status?: number; details?: unknown };
    error.status = response.status;
    error.details = rawPayload;
    throw error;
  }

  const normalizedPayload =
    typeof rawPayload === 'object' && rawPayload !== null && 'data' in (rawPayload as Record<string, unknown>)
      ? ((rawPayload as { data: T }).data as T)
      : (rawPayload as T);

  return {
    data: normalizedPayload,
    message:
      typeof rawPayload === 'object' && rawPayload !== null
        ? ((rawPayload as { message?: string }).message ?? undefined)
        : undefined,
    status: response.status,
    raw: rawPayload,
  };
}

export function formatApiError(error: unknown, fallback = 'Đã có lỗi xảy ra'): string {
  if (error instanceof Error) {
    return error.message || fallback;
  }
  if (typeof error === 'string') {
    return error;
  }
  return fallback;
}
