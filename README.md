# Catchup

A unified personal library for links and content saved from across social media, browsers, and other apps via native share sheets.

## Features

- **Native Share Integration** - Save content directly from any app via iOS Share Extension or Android share menu
- **Unified Inbox** - All your saved links in one place, accessible from any device
- **Search & Filter** - Find saved items by title or URL, filter by source
- **Cross-Device Sync** - Access your library on web and mobile
- **Archive & Organize** - Keep your inbox clean

## Status

The MVP is implemented. The API has 82 passing tests and 33 live smoke checks; the
web app is built and was exercised end-to-end in a browser; the Android app was
run on an Android 15 emulator, including the real system share sheet, a Chrome
share, cold/warm starts, and the signed-out queue. iOS is implemented but has not
been built or run because it needs an Apple Developer team. Details and remaining
gaps: [final summary](./docs/summaries/final-summary.md) and
[mobile report](./docs/summaries/phase6-mobile-report.md).

## Tech Stack

- **Web:** Next.js 16 (App Router), React 19, TypeScript
- **Mobile:** React Native, Expo SDK 54, Expo Router, TypeScript
- **Backend:** ASP.NET Core Web API (.NET 10), Entity Framework Core, FluentValidation
- **Database:** PostgreSQL
- **Monorepo:** npm workspaces

## Project Structure

```
catchup/
├── apps/
│   ├── web/          # Next.js web app
│   ├── mobile/       # React Native Expo app
│   ├── api/          # ASP.NET Core API
│   └── share-poc/    # Share integration POC
├── packages/
│   ├── contracts/    # Shared TypeScript types
│   └── tooling/      # Shared ESLint/Prettier/TS configs
├── scripts/          # Dev DB + API smoke test helpers
└── docs/             # Documentation
```

## Getting Started

### Prerequisites

- Node.js 20+
- .NET 10 SDK
- PostgreSQL 16+ (or use the bundled dev cluster script)
- Android Studio/SDK (for Android development)
- Xcode (for iOS on a Mac) or EAS Build (cloud iOS builds, no Mac required)

### 1. Install dependencies

```bash
npm install
```

### 2. Start a local database

The repo ships a script that creates a user-owned PostgreSQL cluster on port `5433`
(no root access or system password needed):

```bash
npm run db:start     # initialise + start, creates `catchup` and `catchup_test`
npm run db:status
npm run db:stop
npm run db:reset     # wipe and recreate
```

If you prefer your own PostgreSQL, set `ConnectionStrings__DefaultConnection`
(or edit `apps/api/appsettings.Development.json`) to point at it.

### 3. Run the API

```bash
npm run api:dev      # http://localhost:5099, Swagger at /swagger
```

Apply migrations if you point at a fresh database:

```bash
cd apps/api
dotnet ef database update      # requires: dotnet tool install --global dotnet-ef
```

### 4. Verify the API

```bash
npm run api:test     # 82 unit + integration tests (uses `catchup_test` DB)
npm run api:smoke    # end-to-end HTTP checks against a running API
```

### 5. Run the web app

```bash
npm run web:dev      # http://localhost:3000 (expects the API on :5099)
```

The web app talks to the API **server-side only**: the access token lives in an
HttpOnly cookie, so no token is exposed to browser JavaScript. Set `API_BASE_URL`
if the API is not on `http://localhost:5099`.

```bash
npm run web:build && npm run web:start
```

### 6. Run the mobile app

The app uses `expo-share-intent`, which adds a native iOS Share Extension and an
Android `ACTION_SEND` filter. **Expo Go cannot run it** — you need a development
build:

```bash
npm run mobile:prebuild            # generates android/ and ios/ (already gitignored)
npm run mobile:android             # build + install on a connected device/emulator
npm run mobile:start               # Metro, for an already-installed dev build
```

Set the API address before starting Metro, because the device cannot reach your
laptop's `localhost`:

```bash
# Android emulator
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:5099 npm run mobile:start
# Physical device (same Wi-Fi)
EXPO_PUBLIC_API_BASE_URL=http://<your-LAN-IP>:5099 npm run mobile:start
```

The Android emulator must be able to reach the API; bind the API to `0.0.0.0`
or use `adb reverse tcp:5099 tcp:5099` with `http://localhost:5099`.

### HTTP, release builds, and EAS

Android release builds reject cleartext HTTP by default — that is intentional. Use
a **development build** (its debug manifest allows cleartext) with the local HTTP
API. With `adb reverse`, Metro and the API can both use loopback:

```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:5099 tcp:5099
EXPO_PUBLIC_API_BASE_URL=http://localhost:5099 npm run mobile:start
```

For a self-contained test APK without Metro:

```bash
cd apps/mobile/android
JAVA_HOME=/path/to/jdk21 ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Point production builds at an HTTPS API; never enable `usesCleartextTraffic` for
production. Cloud builds use [`apps/mobile/eas.json`](./apps/mobile/eas.json):

```bash
cd apps/mobile
npx eas-cli init                 # writes extra.eas.projectId
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform ios --profile preview
```

Replace the placeholder API URL in `eas.json` (or supply it through EAS
environment variables) first. iOS requires an Apple Developer team for the app
**and** the Share Extension, with the App Group `group.com.catchup.app` enabled on
both App IDs. Without a Mac, EAS Build is the only path. See
[Deployment](./docs/deployment.md).

### Configuration

Copy `.env.example` to `.env` and adjust. Key values:

- `ConnectionStrings__DefaultConnection` - PostgreSQL connection
- `Jwt__Key` - signing key (>= 32 chars; never use the dev value in production)
- `Cors__AllowedOrigins__*` - browser origins allowed to call the API
- `API_BASE_URL` - server-side API URL for the web app
- `EXPO_PUBLIC_API_BASE_URL` - API URL reachable from the phone/emulator

## Scripts

| Command                         | What it does                                     |
| ------------------------------- | ------------------------------------------------ |
| `npm run db:start`              | Start the local PostgreSQL cluster on 5433       |
| `npm run api:dev`               | Run the API on http://localhost:5099             |
| `npm run api:test`              | Run the .NET test suite                          |
| `npm run api:smoke`             | Run HTTP smoke tests against a running API       |
| `npm run web:dev`               | Run the Next.js web app on http://localhost:3000 |
| `npm run web:build`             | Production build of the web app                  |
| `npm run mobile:prebuild`       | Generate native Android/iOS projects             |
| `npm run mobile:android`        | Build and install the Android dev build          |
| `npm run mobile:start`          | Start Metro for the mobile dev build             |
| `scripts/android-share-test.sh` | Send a test share to Catchup on a device         |
| `npm run contracts:build`       | Build the shared TypeScript contracts            |
| `npm run lint`                  | Lint the workspace                               |
| `npm run format`                | Format with Prettier                             |

## Documentation

See the [docs](./docs/) folder for detailed documentation:

- [Product Requirements](./docs/product-requirements.md)
- [Architecture](./docs/architecture.md)
- [API Contracts](./docs/api-contracts.md)
- [Security](./docs/security.md)
- [Share Integration Spike](./docs/share-integration-spike.md)
- [Implementation Roadmap](./docs/implementation-roadmap.md)
- [Testing Strategy](./docs/testing-strategy.md)
- [Deployment](./docs/deployment.md)
- [Final Summary](./docs/summaries/final-summary.md)
- [Backend Report](./docs/summaries/phase4-backend-report.md)
- [Web Report](./docs/summaries/phase5-web-report.md)
- [Mobile Report](./docs/summaries/phase6-mobile-report.md)

## License

MIT
