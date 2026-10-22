# Catchup — Project Status

Last updated: 22 October 2026.

## Phase overview

| Phase | Scope                                                     | Status                                              | Report                                                 |
| ----- | --------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------ |
| 0     | Requirements, flows, architecture, API and security specs | Done                                                | [phase0-summary.md](./phase0-summary.md)               |
| 1     | Native share integration spike (`expo-share-intent`)      | Done (config verified, no device run)               | [phase1-report.md](./phase1-report.md)                 |
| 2     | UX/UI design system and screen specs                      | Done                                                | `docs/phase2-ux-ui-design.md`                          |
| 3     | Monorepo foundation, shared contracts, tooling            | Done                                                | —                                                      |
| 4     | ASP.NET Core API, EF Core, auth, saved items, metadata    | Done (82 tests + 33 smoke checks passing)           | [phase4-backend-report.md](./phase4-backend-report.md) |
| 5     | Next.js web app                                           | Done (browser-verified end to end)                  | [phase5-web-report.md](./phase5-web-report.md)         |
| 6     | Expo mobile app + share handling                          | Built, type-checked, bundled; **not device-tested** | [phase6-mobile-report.md](./phase6-mobile-report.md)   |

## What exists now

```
catchup/
├── apps/
│   ├── api/          # ASP.NET Core .NET 10 + EF Core + PostgreSQL
│   ├── web/          # Next.js 16 App Router, server-side session (BFF)
│   ├── mobile/       # Expo SDK 54 + Expo Router + share extension
│   └── share-poc/    # Original spike, kept as a minimal reference
├── packages/
│   ├── contracts/    # Shared TypeScript API types (built)
│   └── tooling/      # Shared ESLint / Prettier / TS config
├── scripts/          # Local PostgreSQL cluster + API smoke test
└── docs/             # Product, architecture, security, summaries
```

## Verified vs. not verified

**Actually run and passing**

- API: `dotnet build`, `dotnet test` (82/82), live smoke suite (33/33),
  Swagger document served in Development with bearer auth.
- Web: `next build`, ESLint, `tsc --noEmit`; full manual browser pass —
  register, save with metadata extraction, search, filter, sort, detail,
  archive, restore, delete, account deletion, sign-out, route protection,
  privacy/terms, theme toggle.
- Mobile: `tsc --noEmit`, repo-wide ESLint, `expo prebuild` for Android and iOS,
  `expo export` for Android and iOS (Hermes bundles). Generated Android manifest
  and iOS Share Extension + App Groups inspected.

**Not verified**

- Any share-sheet flow on a real Android app (Chrome, Instagram, TikTok, Facebook,
  WhatsApp, cold start vs. backgrounded).
- Running the mobile app at all on a device or emulator; runtime UI, keyboard,
  SecureStore, alerts.
- iOS device builds: needs an Apple Developer team and `DEVELOPMENT_TEAM`;
  EAS Build is the only path without a Mac.
- Automated browser or mobile E2E tests (the web pass was scripted manually).

## Known product/technical gaps

- Access tokens last 60 minutes with no refresh token; users re-authenticate.
- No data export, email verification, password reset, or rate limiting.
- Metadata extraction is synchronous on save and best-effort.
- Mobile saves text/URL shares only (no images/files), and has no offline cache.
- No production deployment yet; no EAS configuration yet.
- Privacy/terms pages exist on web; mobile links to them only when
  `EXPO_PUBLIC_WEB_URL` is configured.

## Immediate next steps

1. Boot the Android emulator or a physical device and run
   `docs/share-poc-testing.md` against `apps/mobile`.
2. Add EAS Build (`eas.json`, `projectId`) and document iOS signing setup.
3. Add Playwright coverage for the web flows already verified manually.
4. Prepare production deployment notes (secrets, migrations, reverse proxy, TLS,
   API base URLs).
