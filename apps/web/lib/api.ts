import type {
  ApiError,
  AuthResponse,
  ItemsListResponse,
  SavedItem,
  User,
} from '@catchup/contracts';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:5099';

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, string[]> | null,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }

  /** True when the session is missing/expired and the user must sign in again. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

export interface ListItemsParams {
  q?: string;
  source?: string;
  archived?: boolean;
  sort?: 'asc' | 'desc';
  limit?: number;
  cursor?: string;
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    // Auth state is per-request; never cache API responses.
    cache: 'no-store',
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const body = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const error = (body as ApiError | null)?.error;
    throw new ApiClientError(
      response.status,
      error?.code ?? 'UNKNOWN',
      error?.message ?? `Request failed with status ${response.status}`,
      error?.details,
    );
  }

  return body as T;
}

export const api = {
  register(email: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  login(email: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  me(token: string): Promise<User> {
    return request<User>('/api/user/me', { token });
  },

  deleteAccount(token: string): Promise<void> {
    return request<void>('/api/user/me', { method: 'DELETE', token });
  },

  listItems(token: string, params: ListItemsParams = {}): Promise<ItemsListResponse> {
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
      token,
      body: JSON.stringify({ originalUrl }),
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

export const KNOWN_SOURCES = [
  'Instagram',
  'TikTok',
  'Facebook',
  'YouTube',
  'X',
  'Reddit',
  'LinkedIn',
  'Pinterest',
  'Medium',
  'Substack',
  'Hacker News',
  'Threads',
  'Telegram',
  'WhatsApp',
  'Spotify',
  'GitHub',
  'Stack Overflow',
] as const;
