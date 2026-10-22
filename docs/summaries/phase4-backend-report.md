# Phase 4 — Backend API Report

Status: **implemented and verified locally**. Not deployed.

## What was built

`apps/api` — ASP.NET Core Web API on **.NET 10**, EF Core 10 + Npgsql,
FluentValidation, Swashbuckle/OpenAPI, BCrypt password hashing, JWT bearer auth.

### Endpoints

| Method | Route | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | – | 201, returns access token. 409 on duplicate email. |
| POST | `/api/auth/login` | – | 200, returns access token. 401 on bad credentials. |
| GET | `/api/items` | ✅ | Cursor pagination, `q`, `source`, `archived`, `sort`, `limit`. |
| POST | `/api/items` | ✅ | Saves URL, normalises it, best-effort metadata. Idempotent per user+URL. |
| GET | `/api/items/{id}` | ✅ | 404 (not 403) for other users' items. |
| PUT | `/api/items/{id}/archive` | ✅ | Sets `ArchivedAt`. |
| PUT | `/api/items/{id}/restore` | ✅ | Clears `ArchivedAt`. |
| DELETE | `/api/items/{id}` | ✅ | 204. |
| GET | `/api/user/me` | ✅ | Current user. |
| DELETE | `/api/user/me` | ✅ | Cascades items, rotates security stamp. |

Swagger UI at `/swagger`, JSON at `/swagger/v1/swagger.json`, global `Bearer` scheme.

### Domain model

- `User`: `Id`, `Email` (unique), `PasswordHash`, `SecurityStamp`, timestamps.
- `SavedItem`: `OriginalUrl`, `NormalizedUrl`, `Title`, `Description`, `ImageUrl`,
  `Source`, `SavedAt`, `ArchivedAt`, `MetadataStatus`, `UserId`.
- Indexes: `(UserId, SavedAt)`, `(UserId, NormalizedUrl)`, `(UserId, ArchivedAt)`.
- FK `SavedItems.UserId -> Users.Id` with `ON DELETE CASCADE`.

### Security behaviours implemented

- **Ownership on every item operation** — all queries filter by
  `UserId` from the JWT, never from the request body.
- **Cross-user access returns 404**, so item existence is not disclosed.
- **Token revocation** — `User.SecurityStamp` is embedded in every access token
  as the `sid` claim and validated against the DB on each authenticated request.
  Deleting an account or rotating the stamp immediately invalidates outstanding
  tokens. (This was caught by a test: stateless JWTs otherwise stayed valid
  after account deletion.)
- **SSRF-protected metadata fetch** (`SafeHttpFetcher`):
  - only `http`/`https`;
  - rejects embedded credentials;
  - resolves DNS and rejects loopback, RFC1918, link-local (incl. `169.254.169.254`),
    CGNAT, benchmarking, multicast and reserved ranges, and Unique-Local IPv6;
  - re-validates **every** redirect hop (max 5);
  - 10 s timeout, 2 MB response cap, no cookies, no proxy, no auto-redirect.
- **HTML treated as untrusted** — metadata values are HTML-decoded, markup-stripped,
  length-capped, and never rendered as markup.
- **URL allow-list** — only absolute `http(s)` URLs with no userinfo are accepted;
  `javascript:`, `file:`, `data:`, relative and malformed URLs are rejected.
- **Validation** — FluentValidation on register/login/create-item.
- **Consistent error envelope** — `{ "error": { "code", "message", "details" } }`
  via a global exception middleware.
- **Configurable CORS** — origins come from `Cors:AllowedOrigins`, not `AllowAnyOrigin`.
- **No secrets in logs** — no request bodies, tokens or password hashes are logged.

### Duplicate policy (explicit)

Same user + same `NormalizedUrl` → the existing item is returned with `200 OK`
instead of creating a new row. Normalisation lowercases scheme/host, strips
`www.`, drops known tracking params (`utm_*`, `fbclid`, `gclid`, …), sorts the
remaining query params, and removes trailing slashes. Paths and meaningful query
params are never altered.

### Metadata status semantics

`MetadataStatus` is now meaningful:

| Status | Meaning |
| --- | --- |
| `Pending` | Created, extraction not finished (reserved for background processing). |
| `Success` | Page fetched and at least one metadata field extracted. |
| `Skipped` | Page fetched but had no usable metadata. |
| `Failed` | Fetch/extraction failed. **The URL is still saved.** |

## Verification actually run

```
apps/api/tests  ->  82 passed, 0 failed
  - UrlNormalizerTests (normalisation, dedupe, source inference)
  - SsrfProtectionTests (IPv4/IPv6 address classification)
  - MetadataExtractorTests (OG/Twitter/title parsing, entity decoding, length caps)
  - ApiIntegrationTests (real PostgreSQL `catchup_test`, auth, ownership,
    idempotency, archive/restore, pagination, cursor edge cases, account deletion)

scripts/api-smoke-test.sh  ->  33 passed, 0 failed (live API over HTTP)
```

Database: local PostgreSQL **18.6** cluster at `127.0.0.1:5433` created by
`scripts/dev-db.sh`; migrations `InitialCreate` and `AddSecurityStamp` applied.

## Known limitations (deliberate, documented, not hidden)

1. **Metadata extraction runs inline** in `POST /api/items`. The response waits
   for the fetch (up to the 10 s timeout). The save still succeeds on failure,
   but p95 latency for slow sites is poor. Next step: move to a background
   worker/queue and return `MetadataStatus.Pending` immediately, with the client
   polling or receiving a push.
2. **No refresh tokens yet.** Access tokens last 60 minutes; there is no refresh
   or sliding session. The planned rotating-refresh design in `docs/architecture.md`
   is not implemented.
3. **No rate limiting** on `/api/auth/*` or `/api/items`. Brute-force and
   save-flood protection are not yet in place.
4. **Cursor pagination ties.** The cursor compares `SavedAt` strictly. Two items
   saved within the same microsecond for one user could theoretically cause a
   skip. Not reachable in practice with `DateTime.UtcNow` per insert, but not
   mathematically airtight.
5. **SSRF tests are unit-level** for address classification. End-to-end
   redirect-chain and DNS-rebinding behaviour is implemented but not exercised
   against a live attacker-controlled server.
6. **Search is `ILIKE '%term%'`** — no full-text index. Fine for MVP scale; slow
   past ~100k rows per user.
7. **No email verification / password reset.**

## Config

- `apps/api/appsettings.json` — production-shaped defaults (dev connection string).
- `apps/api/appsettings.Development.json` — local dev values.
- Every value can be overridden by env vars (`Jwt__Key`,
  `ConnectionStrings__DefaultConnection`, `Cors__AllowedOrigins__0`, …).

## How to run

```bash
npm run db:start      # local PostgreSQL on 5433
npm run api:dev       # API on http://localhost:5099
npm run api:test      # 82 tests
npm run api:smoke     # 33 HTTP checks
```

## Next

Phase 5 — web app (Next.js) against these endpoints, then Phase 6 — mobile app
with the share-intent wiring prototyped in `apps/share-poc`.
