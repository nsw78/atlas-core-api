// ATLAS Unified API Client
// Single source of truth for all HTTP communication with the backend.

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1`;
const AUTH_STORAGE_KEY = 'atlas-auth';
const DEFAULT_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details: Record<string, unknown> | undefined;

  constructor(
    status: number,
    message: string,
    code = 'UNKNOWN_ERROR',
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Request / response types
// ---------------------------------------------------------------------------

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
  /** Per-request timeout in milliseconds. Defaults to 30 000. */
  timeout?: number;
  /** When true the Authorization header is NOT attached. Useful for login. */
  skipAuth?: boolean;
}

// ---------------------------------------------------------------------------
// Token helpers (SSR-safe)
// ---------------------------------------------------------------------------

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    // Support both flat { accessToken } and nested { state: { token } } shapes
    return parsed?.accessToken ?? parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

function clearAuthAndRedirect(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
  // Only redirect if we are not already on /login
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

// ---------------------------------------------------------------------------
// ApiClient
// ---------------------------------------------------------------------------

class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;

  constructor(baseUrl: string, defaultTimeout = DEFAULT_TIMEOUT_MS) {
    this.baseUrl = baseUrl;
    this.defaultTimeout = defaultTimeout;
  }

  // ---- URL builder --------------------------------------------------------

  private buildUrl(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
    }
    return url.toString();
  }

  // ---- Core request -------------------------------------------------------

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const {
      method = 'GET',
      body,
      headers = {},
      params,
      timeout = this.defaultTimeout,
      skipAuth = false,
    } = options;

    // -- Request interceptor: attach bearer token --
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (!skipAuth) {
      const token = getAccessToken();
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    // -- AbortController for timeout --
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(this.buildUrl(path, params), {
        method,
        headers: requestHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        credentials: 'include',
      });

      clearTimeout(timeoutId);

      // -- Response interceptor: handle 401 --
      if (response.status === 401) {
        clearAuthAndRedirect();
        throw new ApiError(401, 'apiErrors.unauthorized', 'UNAUTHORIZED');
      }

      if (!response.ok) {
        let errorBody: { message?: string; code?: string; details?: Record<string, unknown> };
        try {
          errorBody = await response.json();
        } catch {
          errorBody = { message: response.statusText };
        }
        throw new ApiError(
          response.status,
          errorBody.message || response.statusText,
          errorBody.code || `HTTP_${response.status}`,
          errorBody.details,
        );
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as unknown as T;
      }

      return (await response.json()) as T;
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      // Re-throw ApiError as-is
      if (error instanceof ApiError) {
        throw error;
      }

      // Timeout
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError(
          408,
          `Request to ${path} timed out after ${timeout}ms`,
          'TIMEOUT',
        );
      }

      // Network / other errors
      const message = error instanceof Error ? error.message : 'apiErrors.networkError';
      throw new ApiError(0, message, 'NETWORK_ERROR');
    }
  }

  // ---- Convenience methods ------------------------------------------------

  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>) {
    return this.request<T>(path, { params });
  }

  post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return this.request<T>(path, { method: 'POST', body, ...options });
  }

  put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return this.request<T>(path, { method: 'PUT', body, ...options });
  }

  patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return this.request<T>(path, { method: 'PATCH', body, ...options });
  }

  delete<T>(path: string, options?: Omit<RequestOptions, 'method'>) {
    return this.request<T>(path, { method: 'DELETE', ...options });
  }
}

// ---------------------------------------------------------------------------
// Singleton export (preserves existing import patterns)
// ---------------------------------------------------------------------------

export const api = new ApiClient(API_BASE);
export default api;
