# Catchup - Architecture

## 1. Overview

Catchup is a cross-platform system with:
- **Web:** Next.js App Router (TypeScript, React)
- **Mobile:** React Native + Expo (TypeScript)
- **Backend:** ASP.NET Core Web API (.NET 10) with EF Core
- **Database:** PostgreSQL
- **Shared:** TypeScript contracts in packages/contracts

Monorepo managed with pnpm workspaces. No Turborepo initially.

## 2. Repository Structure

```text
catchup/
├── apps/
│   ├── web/           # Next.js web app
│   ├── mobile/        # React Native Expo app
│   └── api/           # ASP.NET Core API
├── packages/
│   ├── contracts/     # Shared TypeScript types/schemas
│   └── tooling/       # Shared configs (eslint, tsconfig, etc.)
├── docs/              # Documentation (this folder)
├── pnpm-workspace.yaml
└── README.md
```

## 3. System Architecture

```text
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   iOS App    │     │ Android App  │     │   Web App    │
│ (RN + Share  │     │ (RN + Intent)│     │  (Next.js)   │
│  Extension)  │     │              │     │              │
└─────────────┘     └─────────────┘     └─────────────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │ HTTPS/REST
                            ▼
                    ┌─────────────────┐
                    │  ASP.NET Core   │
                    │      API        │
                    └─────────────────┘
                            │
                            ▼
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    └─────────────────┘
```

## 4. Share Integration Architecture (Critical)

### Android
- **Mechanism:** `ACTION_SEND` intent filter in AndroidManifest
- **Payload:** `text/plain` with URL/text, sometimes `EXTRA_TEXT`, `EXTRA_STREAM`
- **Handling:** React Native receives via Linking/ShareIntent or native module
- **Flow:** App/Activity receives intent → parse payload → extract URL → save to API (if auth) or prompt auth
- **Expo:** Use `expo-share-intent` or configure intent filters. Need to verify official support.

### iOS
- **Mechanism:** Share Extension (separate app extension target)
- **Constraints:**
  - Runs in separate process, limited memory/time
  - Cannot always make long-running network requests
  - May not have access to app's keychain in same way
  - UI is constrained (modal/sheet style)
  - Authentication tricky - need to share auth or route to main app
- **Payload:** `NSExtensionItem` with attachments (URL, text)
- **Flow:** Extension receives share → parse → may need to open main app via URL scheme or save via shared container/API
- **Approach:** With Expo, may need `expo-share-intent` plugin or custom native code (Config Plugin) or development build
- **Critical:** Must test on real device; Expo Go won't support extensions

**Key decision points:**
1. Can Expo handle iOS Share Extension fully via plugins? Or need bare workflow / custom native?
2. How to handle auth across extension and main app (shared Keychain/App Group)?
3. Network from extension - iOS allows but with constraints
4. Fallback: Open main app for full flow if extension too limited

## 5. Backend Architecture

### Structure (Feature-oriented)
```text
apps/api/
├── src/
│   ├── Features/           # Feature folders (Users, SavedItems, Auth)
│   │   ├── Auth/
│   │   ├── SavedItems/
│   │   └── Users/
│   ├── Data/               # DbContext, Migrations
│   ├── Shared/             # Common utilities, middleware, extensions
│   └── Program.cs
└── tests/
```

Avoid generic repositories/CRUD abstractions unless justified. Use EF Core directly in features or simple services.

### Domain Model (MVP)

```csharp
// User
public class User {
  public Guid Id { get; set; }
  public string Email { get; set; } = string.Empty;
  public string PasswordHash { get; set; } = string.Empty;
  public DateTime CreatedAt { get; set; }
  public DateTime UpdatedAt { get; set; }
  public ICollection<SavedItem> SavedItems { get; set; } = new();
}

// SavedItem
public class SavedItem {
  public Guid Id { get; set; }
  public Guid UserId { get; set; }
  public User User { get; set; } = null!;
  public string OriginalUrl { get; set; } = string.Empty;
  public string NormalizedUrl { get; set; } = string.Empty;
  public string? Title { get; set; }
  public string? Description { get; set; }
  public string? ImageUrl { get; set; }
  public string? Source { get; set; } // e.g., instagram, tiktok, youtube, unknown
  public DateTime SavedAt { get; set; }
  public DateTime? ArchivedAt { get; set; }
  public MetadataStatus MetadataStatus { get; set; } = MetadataStatus.Pending;
}

public enum MetadataStatus {
  Pending, Success, Failed, Skipped
}
```

**Indexes:** (UserId, SavedAt), (UserId, NormalizedUrl) for duplicate detection, (UserId, ArchivedAt)

### API Endpoints (REST)

**Auth:**
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/refresh
- POST /api/auth/forgot-password (future)
- POST /api/auth/reset-password (future)

**Saved Items:**
- POST /api/items - Create/save item
- GET /api/items?cursor=...&limit=20&archived=false&q=...&source=... - List
- GET /api/items/{id} - Get details
- PUT /api/items/{id}/archive
- PUT /api/items/{id}/restore
- DELETE /api/items/{id}
- DELETE /api/items - bulk? maybe not needed

**User:**
- GET /api/user/me
- DELETE /api/user/me (account deletion)

All protected endpoints require auth. User ownership enforced server-side.

### Metadata Extraction

- **When:** After saving item (async/background job or inline with timeout)
- **Sources:** OpenGraph tags, Twitter cards, <title>, meta description
- **Security:** SSRF protection (block private/internal IPs, validate redirects, timeouts, size limits)
- **Fallback:** If fails, save with URL only
- **Respect:** robots.txt? Maybe not required for MVP, but be mindful

## 6. Authentication Strategy

Need to support web and mobile. Consider tradeoffs:

**Option A:** Secure HttpOnly cookies (web) + tokens for mobile
- Pros: Secure for web, common
- Cons: CORS/CSRF complexity, cookies in React Native need care

**Option B:** Access + refresh tokens (JWT) stored securely
- Web: HttpOnly cookies or memory
- Mobile: SecureStore/Keychain
- Pros: Works well cross-platform
- Cons: Token management complexity

**Recommendation:** Access token (short-lived) + refresh token (rotated). Store refresh in HttpOnly cookie for web, in SecureStore/Keychain for mobile. Implement rotation + revocation.

## 7. Data Flow

### Share → Save Flow
1. Share received by app/extension with payload
2. Extract URL (regex + validation). Handle text with URLs
3. Normalize URL (scheme, host, path normalization - be careful not to break semantics)
4. Check auth state
5. Call POST /api/items with { originalUrl, ... }
6. API validates, checks duplicates (by normalizedUrl for user), saves
7. Queue metadata extraction (background)
8. Return saved item to client
9. Show confirmation

### Duplicate Policy (Proposed)
- If user already has SavedItem with same NormalizedUrl and not archived? Or any state?
- Options:
  1. **Skip**: Don't create duplicate, return existing item (idempotent)
  2. **Update timestamp**: Move to top of inbox (update SavedAt)
  3. **Allow**: Create separate entry
- **Recommendation:** Treat as duplicate if same NormalizedUrl for same user exists. Return existing item (or 409/200 with existing). Update SavedAt to bump to top? Or just prevent duplicates. Be explicit and test.

## 8. Security Considerations

- **AuthZ:** Every item operation must verify UserId matches authenticated user
- **SSRF:** For metadata fetch - allowlist schemes (http/https), block private ranges (127.0.0.0/8, 10.0.0.0/8, 192.168.0.0/16, 169.254.0.0/16, ::1, fc00::/7), resolve DNS, check redirects
- **Input validation:** FluentValidation on API, client validation as UX
- **Secrets:** Never commit keys, use env vars
- **CORS:** Strict origins
- **Rate limiting:** Consider for auth endpoints
- **Data deletion:** Hard delete or soft delete on account deletion - delete all user data
- **Logging:** No PII/secrets in logs

## 9. Deployment Considerations

- **API:** Can deploy to Railway/Render/Fly.io/etc. needs PostgreSQL
- **Web:** Vercel/Netlify
- **Mobile:** Expo EAS Build for Android/iOS
- **Env:** Separate dev/staging/prod

## 10. Technology Decisions Log (To Be Filled)

Will document in implementation decisions as we go.