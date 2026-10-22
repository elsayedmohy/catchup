# Production deployment guide

Status: **the local/dev flow is verified; production hosting has not been
exercised.** This document describes the intended topology, the exact settings the
code reads, and the gaps that must be closed before a public launch. Commands are
templates, not a record of a completed deployment.

## Topology

```
Browser ──HTTPS──> Next.js web (BFF) ──HTTP(S)──> ASP.NET Core API ──> PostgreSQL
                        │                              ▲
                        └── HttpOnly session cookie   │
Mobile app (iOS/Android) ─────────HTTPS─────────────────┘
```

- The browser never receives the API token. Next.js server components/actions
  call the API and keep the token in the `catchup_session` HttpOnly cookie.
- Mobile clients call the API directly with a bearer token stored in
  `expo-secure-store`; they do not use cookies.
- Only the API talks to PostgreSQL. Neither the database nor the API’s Swagger
  endpoint should be internet-facing.

## 1. Database

Tested locally with PostgreSQL 18.6; any supported PostgreSQL 16+ release is
expected to work.

1. Create a dedicated role and database (`catchup`) with a strong password.
2. Keep the server on a private network; require TLS for remote connections.
3. Apply migrations as a deploy step — **the API does not migrate on startup**:

   ```bash
   # from apps/api, with dotnet-ef on PATH
   dotnet ef database update --connection "$ConnectionStrings__DefaultConnection"
   ```

   Or build a self-contained migration bundle once per release:

   ```bash
   dotnet ef migrations bundle -o migrate --self-contained
   ./migrate --connection "$ConnectionStrings__DefaultConnection"
   ```

   Existing migrations: `InitialCreate`, `AddSecurityStamp`.

4. Account deletion cascades to `SavedItems` (`DeleteBehavior.Cascade`); no
   orphan cleanup job is required.
5. Enable daily backups plus point-in-time recovery. Test a restore.

## 2. API (.NET 10)

Build and run:

```bash
dotnet publish apps/api -c Release -o /srv/catchup-api
ASPNETCORE_URLS=http://0.0.0.0:8080 ASPNETCORE_ENVIRONMENT=Production \
  dotnet /srv/catchup-api/api.dll
```

Put Caddy/Nginx/ALB in front for TLS. The API itself has no HTTPS redirection and
no forwarded-header middleware, so terminate TLS at the proxy and keep the proxy
hop on a private network.

### Configuration

All settings are standard ASP.NET Core configuration keys and can be supplied as
environment variables (`:` → `__`).

| Variable                               | Required | Notes                                                                            |
| -------------------------------------- | -------- | -------------------------------------------------------------------------------- |
| `ASPNETCORE_ENVIRONMENT`               | yes      | `Production` disables Swagger.                                                   |
| `ASPNETCORE_URLS`                      | yes      | e.g. `http://0.0.0.0:8080`.                                                      |
| `ConnectionStrings__DefaultConnection` | yes      | PostgreSQL connection string; keep it in the secret manager.                     |
| `Jwt__Key`                             | yes      | ≥ 32 bytes of high-entropy data. **Never use the `appsettings.json` dev value.** |
| `Jwt__Issuer` / `Jwt__Audience`        | yes      | Keep stable; changing them invalidates existing tokens.                          |
| `Jwt__ExpiryMinutes`                   | no       | Defaults to `60`.                                                                |
| `Cors__AllowedOrigins__0..n`           | yes      | Exact browser origins, e.g. `https://catchup.example.com`.                       |

Notes:

- There is **no refresh token**. Tokens expire after 60 minutes; users sign in
  again. Rotating `Jwt__Key` invalidates every token immediately.
- Swagger is only registered when `ASPNETCORE_ENVIRONMENT=Development`. Confirm it
  returns 404 in production.
- The app has **no health endpoint**. Add `MapGet("/health", …)` (or use a TCP/HTTP
  check on a real endpoint) before wiring a load balancer.
- Metadata extraction is synchronous and can take up to ~10 seconds (2 MB body,
  10 s timeout, ≤ 5 redirects). Set proxy read timeouts to at least 30 s.
- The fetcher blocks private/link-local targets and re-validates redirects, but
  also restrict outbound egress at the network layer (allow 80/443 only, deny
  cloud metadata ranges).
- Application logs do not include request bodies or tokens. Keep default log
  levels, ship stdout to your log stack, and avoid adding email/URL logging.
- **Rate limiting is not implemented in the app.** Add per-IP limits at the edge
  and consider per-account limits for `POST /api/auth/login` and
  `POST /api/items`.

## 3. Web (Next.js 16)

```bash
API_BASE_URL=https://api.catchup.example npm run web:build
API_BASE_URL=https://api.catchup.example NODE_ENV=production npm run web:start
```

| Variable       | Required | Notes                                                                           |
| -------------- | -------- | ------------------------------------------------------------------------------- |
| `API_BASE_URL` | yes      | Server-side API base URL. Use a private address if web and API share a network. |
| `NODE_ENV`     | yes      | `production` marks the session cookie `Secure`; serve the site over HTTPS.      |

- The session cookie is `HttpOnly`, `SameSite=Lax`, `Path=/`, 60-minute max age.
- `next.config.ts` currently has no `output: "standalone"`. Either deploy with
  `next start` plus `node_modules`, or add standalone output before using a slim
  container.
- The web server must be able to reach the API; the browser never calls it.
- No CSP/security-header middleware is configured yet. Add HSTS, CSP,
  `X-Content-Type-Options`, and a referrer policy at the proxy or in Next.

## 4. Mobile (EAS Build)

`apps/mobile/eas.json` defines `preview` (internal APK) and `production`
(AAB with auto-incremented versions) profiles. The API URL in that file is a
**placeholder** and must be replaced (or supplied through EAS environment
variables) before building.

```bash
cd apps/mobile
npx eas-cli login
npx eas-cli init                 # creates the project and writes extra.eas.projectId
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform ios --profile preview
```

### iOS

1. Join the Apple Developer Program and note the Team ID.
2. `eas credentials` creates the distribution certificate and provisioning
   profiles for **both** bundle identifiers:
   - `com.catchup.app`
   - `com.catchup.app.ShareExtension`
3. Enable the **App Groups** capability for both identifiers with
   `group.com.catchup.app` (the config plugin generates the entitlements, but the
   capability must exist on the App IDs).
4. EAS runs `expo prebuild` on its macOS workers, so the Share Extension target is
   generated from the `expo-share-intent` plugin config; no Mac is required
   locally.

Without an Apple Developer team, iOS builds stop at signing. This is the current
blocker.

### Android

- The release APK used for emulator testing was signed with the **debug keystore**
  (the generated `android/` folder is gitignored). Never ship that artifact.
  `eas credentials` generates and stores a production keystore for EAS builds;
  verify the final artifact with
  `apksigner verify --print-certs app-release.apk`.
- Release builds correctly reject cleartext HTTP. Point
  `EXPO_PUBLIC_API_BASE_URL` at an HTTPS endpoint; do not enable
  `usesCleartextTraffic` for production.
- The Android share target is `text/*` only (by design).

## 5. Launch checklist

- [ ] HTTPS on web and API; HTTP redirects at the proxy.
- [ ] `Jwt__Key` generated and stored in a secret manager; dev default removed.
- [ ] Production database migrated, private, backed up, restore tested.
- [ ] CORS restricted to the real web origin (and any future browser clients).
- [ ] Swagger returns 404 in production.
- [ ] Edge rate limits and request-size limits configured.
- [ ] Outbound egress restricted for the metadata fetcher.
- [ ] Mobile builds use the production HTTPS API URL and a real signing key.
- [ ] Privacy policy and terms URLs configured (`EXPO_PUBLIC_WEB_URL`).
- [ ] Log retention and alerting configured.

## 6. Known production gaps

1. No refresh tokens, email verification, or password reset.
2. No rate limiting, lockout, or CAPTCHA on auth endpoints.
3. Metadata extraction is synchronous; a slow target delays the save response.
4. Search uses `ILIKE` without a trigram/full-text index; fine at small scale.
5. Cursor pagination can tie on identical `SavedAt` values.
6. No automated database backups, metrics, tracing, or on-call dashboards yet.
7. No CSP/security headers on the web app.
8. No E2E test suite in CI; verification so far is manual plus API tests.
