import type { AuthResponse, ItemsListResponse, SavedItem, User } from '@catchup/contracts';

/**
 * For a physical device or Android emulator, set EXPO_PUBLIC_API_BASE_URL.
 * - Android emulator reaches the host machine at http://10.0.2.2:5099
 * - A physical device needs the host's LAN IP, e.g. http://192.168.1.20:5099
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:5099';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ItemListParams {
  q?: string;
  source?: string;
  archived?: boolean;
  sort?: 'asc' | 'desc';
  limit?: number;
  cursor?: string;
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const { method = 'GET', body, token } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      error instanceof Error && error.name === 'AbortError'
        ? 'The request timed out. Check your connection and try again.'
        : 'Could not reach the server. Check your connection and try again.',
    );
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const envelope = parsed as { error?: { code?: string; message?: string } } | null;
    throw new ApiError(
      response.status,
      envelope?.error?.code ?? 'UNKNOWN',
      envelope?.error?.message ?? `Request failed (${response.status})`,
    );
  }

  return parsed as T;
}

export const api = {
  register(email: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: { email, password },
    });
  },

  login(email: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  },

  me(token: string): Promise<User> {
    return request<User>('/api/user/me', { token });
  },

  deleteAccount(token: string): Promise<void> {
    return request<void>('/api/user/me', { method: 'DELETE', token });
  },

  listItems(token: string, params: ItemListParams = {}): Promise<ItemsListResponse> {
    const search = new URLSearchParams();
    if (params.q) search.set('q', params.q);
    if (params.source) search.set('source', params.source);
    if (params.archived) search.set('archived', 'true');
    if (params.sort) search.set('sort', params.sort);
    if (params.limit) search.set('limit', String(params.limit));
    if (params.cursor) search.set('cursor', params.cursor);

    const query = search.toString();
    return request<ItemsListResponse>(`/api/items${query ? `?${query}` : ''}`, { token });
  },

  getItem(token: string, id: string): Promise<SavedItem> {
    return request<SavedItem>(`/api/items/${id}`, { token });
  },

  createItem(token: string, originalUrl: string): Promise<SavedItem> {
    return request<SavedItem>('/api/items', {
      method: 'POST',
      body: { originalUrl },
      token,
    });
  },

  archiveItem(token: string, id: string): Promise<SavedItem> {
    return request<SavedItem>(`/api/items/${id}/archive`, { method: 'PUT', token });
  },

  restoreItem(token: string, id: string): Promise<SavedItem> {
    return request<SavedItem>(`/api/items/${id}/restore`, { method: 'PUT', token });
  },

  deleteItem(token: string, id: string): Promise<void> {
    return request<void>(`/api/items/${id}`, { method: 'DELETE', token });
  },
};

/** Pull the first http(s) URL out of a shared block of text. */
export function extractUrl(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s<>"']+/i);
  return match ? match[0] : null;
}
