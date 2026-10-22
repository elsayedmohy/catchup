# Catchup — Project Status

Last updated: 22 October 2026.

## Phase overview

| Phase | Scope                                                     | Status                                                        | Report                                                 |
| ----- | --------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------ |
| 0     | Requirements, flows, architecture, API and security specs | Done                                                          | [phase0-summary.md](./phase0-summary.md)               |
| 1     | Native share integration spike (`expo-share-intent`)      | Done (config verified)                                        | [phase1-report.md](./phase1-report.md)                 |
| 2     | UX/UI design system and screen specs                      | Done                                                          | `docs/phase2-ux-ui-design.md`                          |
| 3     | Monorepo foundation, shared contracts, tooling            | Done                                                          | —                                                      |
| 4     | ASP.NET Core API, EF Core, auth, saved items, metadata    | Done (82 tests + 33 smoke checks passing)                     | [phase4-backend-report.md](./phase4-backend-report.md) |
| 5     | Next.js web app                                           | Done (browser-verified end to end)                            | [phase5-web-report.md](./phase5-web-report.md)         |
| 6     | Expo mobile app + share handling                          | Done on an Android 15 emulator; iOS build blocked on Apple ID | [phase6-mobile-report.md](./phase6-mobile-report.md)   |

## What exists now

```
catchup/
├── apps/
│   ├── api/          # ASP.NET Core .NET 10 + EF Core + PostgreSQL
│   ├── web/          # Next.js 16 App Router, server-side session (BFF)
│   ├── mobile/       # Expo SDK 54 + Expo Router + share extension + eas.json
│   └── share-poc/    # Original spike, kept as a minimal reference
├── packages/
│   ├── contracts/    # Shared TypeScript API types (built)
│   └── tooling/      # Shared ESLint / Prettier / TS config
├── scripts/          # Local PostgreSQL cluster + API smoke test
└── docs/             # Product, architecture, security, deployment, summaries
```

## Verified vs. not verified

**Actually run and passing**

- API: `dotnet build`, `dotnet test` (82/82), live smoke suite (33/33),
  Swagger document served in Development with bearer auth.
- Web: `next build`, ESLint, `tsc --noEmit`; full manual browser pass —
  register, save with metadata extraction, search, filter, sort, detail,
  archive, restore, delete, account deletion, sign-out, route protection,
  privacy/terms, theme toggle.
- Mobile static/native: `tsc --noEmit`, repo-wide ESLint, `expo prebuild` for
  Android and iOS, `expo export` for both platforms; generated Android manifest
  and iOS Share Extension + App Groups inspected.
- Mobile runtime on Android 15 emulator:
  - release and debug APKs built; debug APK installed and driven through
    `uiautomator`;
  - `ACTION_SEND` filter registered for `com.catchup.app/.MainActivity`;
  - system share sheet shows Catchup; choosing it saves the link;
  - Chrome share saves the page URL;
  - cold start (force-stopped) and warm/foreground shares both save;
  - text containing a URL is extracted; plain text with no URL is rejected;
  - shortened URLs save with metadata failure handled gracefully;
  - metadata success verified (`Example Domain` from `example.com`);
  - signed-out share is queued and saved automatically after login;
  - search, source filter, newest/oldest sort, quick save, detail,
    archive/restore, and delete all verified against the API.
- A UI bug found during that run (subtitle said “newest first” while sorting
  oldest) was fixed and re-verified.
- One important production finding: **Android release builds block cleartext
  HTTP**, so the release APK cannot reach the local dev API. This is correct for
  production; local device testing uses the debug build.

**Not verified**

- Any physical Android device (all runtime evidence is from the emulator).
- Shares from Instagram, TikTok, Facebook, or WhatsApp; those apps are not in the
  emulator image. Chrome and the system chooser prove the same `ACTION_SEND` path.
- iOS builds or device runs: needs an Apple Developer team and `DEVELOPMENT_TEAM`;
  EAS Build is the only path without a Mac. `eas.json` exists, but `eas init` and
  credentials have not been run.
- Automated browser or mobile E2E tests (the web and mobile passes were scripted
  manually).

## Known product/technical gaps

- Access tokens last 60 minutes with no refresh token; users re-authenticate.
- No data export, email verification, password reset, or rate limiting.
- Metadata extraction is synchronous on save and best-effort.
- Mobile saves text/URL shares only (no images/files), and has no offline cache.
- No production deployment yet. The intended topology and hardening checklist are
  in [deployment.md](../deployment.md); nothing has been hosted.
- Search is unindexed `ILIKE`; cursor ties are possible on identical `SavedAt`.
- Privacy/terms pages exist on web; mobile links to them only when
  `EXPO_PUBLIC_WEB_URL` is configured.

## Immediate next steps

1. Run the share checklist on a physical Android device, ideally from Instagram,
   TikTok, Facebook, and WhatsApp, and record the results in the mobile report.
2. Once an Apple Developer team is available: `eas init`, configure credentials
   and the App Group for both iOS bundle IDs, and run `eas build -p ios`.
3. Add Playwright coverage for the web flows already verified manually.
4. Deploy the API/web/database using [deployment.md](../deployment.md) and validate
   TLS, migrations, CORS, and backups in a staging environment.
