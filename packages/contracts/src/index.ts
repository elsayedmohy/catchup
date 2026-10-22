// Shared TypeScript contracts for Catchup

export enum MetadataStatus {
  Pending = 'Pending',
  Success = 'Success',
  Failed = 'Failed',
  Skipped = 'Skipped',
}

export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SavedItem {
  id: string;
  userId: string;
  originalUrl: string;
  normalizedUrl: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  source: string | null;
  savedAt: string;
  archivedAt: string | null;
  metadataStatus: MetadataStatus;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface CreateItemRequest {
  originalUrl: string;
  title?: string;
}

export interface ItemsListResponse {
  items: SavedItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]> | null;
  };
}
