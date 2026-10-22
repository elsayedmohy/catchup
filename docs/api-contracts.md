# Catchup - API Contracts

Base URL: `https://api.catchup.app` (dev: `http://localhost:5000`)

All authenticated endpoints require valid access token (via Authorization header or cookie depending on strategy).

## 1. Authentication

### POST /api/auth/register
**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```
**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "createdAt": "2026-10-20T..."
  },
  "accessToken": "jwt...",
  "expiresIn": 3600
}
```
**Errors:** 400 (validation), 409 (email exists)

### POST /api/auth/login
**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```
**Response (200):**
```json
{
  "user": { "id": "uuid", "email": "user@example.com" },
  "accessToken": "jwt...",
  "expiresIn": 3600
}
```
**Errors:** 401 (invalid credentials)

### POST /api/auth/refresh
**Response (200):**
```json
{
  "accessToken": "jwt...",
  "expiresIn": 3600
}
```

### POST /api/auth/logout
**Response (204):** No content

## 2. Saved Items

### POST /api/items
**Auth required**
**Request:**
```json
{
  "originalUrl": "https://example.com/post/123",
  "title": "Optional title override"
}
```
**Response (201 or 200):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "originalUrl": "https://example.com/post/123",
  "normalizedUrl": "https://example.com/post/123",
  "title": "Post Title",
  "description": "...",
  "imageUrl": "https://...",
  "source": "example",
  "savedAt": "2026-10-20T...",
  "archivedAt": null,
  "metadataStatus": "Pending"
}
```
**Notes:** If duplicate (same normalizedUrl for user), may return existing item with 200 and possibly update timestamp. Must be idempotent.

### GET /api/items
**Auth required**
**Query params:**
- `cursor` (string, optional) - pagination cursor
- `limit` (int, default 20, max 100)
- `archived` (bool, default false)
- `q` (string, optional) - search in title/url
- `source` (string, optional) - filter by source
- `sort` (string, default 'desc') - 'asc' or 'desc' by savedAt

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "originalUrl": "https://...",
      "title": "...",
      "description": "...",
      "imageUrl": "https://...",
      "source": "instagram",
      "savedAt": "2026-10-20T...",
      "archivedAt": null,
      "metadataStatus": "Success"
    }
  ],
  "nextCursor": "cursor_token_or_null",
  "hasMore": true
}
```

### GET /api/items/{id}
**Auth required** - must own item
**Response (200):** Full item details
**Errors:** 404 (not found or not owned)

### PUT /api/items/{id}/archive
**Auth required**
**Response (200):** Updated item with archivedAt set

### PUT /api/items/{id}/restore
**Auth required**
**Response (200):** Updated item with archivedAt null

### DELETE /api/items/{id}
**Auth required**
**Response (204):** No content

## 3. User

### GET /api/user/me
**Auth required**
**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "createdAt": "2026-10-20T..."
}
```

### DELETE /api/user/me
**Auth required**
**Response (204):** No content
**Effect:** Permanently delete user and ALL saved items (cascade). Irreversible.

## 4. Error Responses

Standard error format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

**Common codes:** UNAUTHORIZED, FORBIDDEN, NOT_FOUND, VALIDATION_ERROR, CONFLICT, INTERNAL_ERROR

## 5. Notes
- All timestamps in ISO 8601 UTC
- IDs are GUIDs/UUIDs
- Pagination uses cursor-based for efficiency
- Never expose other users' data
- Metadata extraction is async - initial response may have metadataStatus Pending
