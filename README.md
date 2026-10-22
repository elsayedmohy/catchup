# Catchup

A unified personal library for links and content saved from across social media, browsers, and other apps via native share sheets.

## Features
- **Native Share Integration** - Save content directly from any app via iOS Share Extension or Android share menu
- **Unified Inbox** - All your saved links in one place, accessible from any device
- **Search & Filter** - Find saved items by title or URL, filter by source
- **Cross-Device Sync** - Access your library on web and mobile
- **Archive & Organize** - Keep your inbox clean

## Tech Stack
- **Web:** Next.js 15, React, TypeScript
- **Mobile:** React Native, Expo, TypeScript
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
npm run api:test     # 80 unit + integration tests (uses `catchup_test` DB)
npm run api:smoke    # end-to-end HTTP checks against a running API
```

### Configuration
Copy `.env.example` to `.env` and adjust. Key values:
- `ConnectionStrings__DefaultConnection` - PostgreSQL connection
- `Jwt__Key` - signing key (>= 32 chars; never use the dev value in production)
- `Cors__AllowedOrigins__*` - browser origins allowed to call the API

## Scripts
| Command | What it does |
| --- | --- |
| `npm run db:start` | Start the local PostgreSQL cluster on 5433 |
| `npm run api:dev` | Run the API on http://localhost:5099 |
| `npm run api:test` | Run the .NET test suite |
| `npm run api:smoke` | Run HTTP smoke tests against a running API |
| `npm run contracts:build` | Build the shared TypeScript contracts |
| `npm run lint` | Lint the workspace |
| `npm run format` | Format with Prettier |

## Documentation
See the [docs](./docs/) folder for detailed documentation:
- [Product Requirements](./docs/product-requirements.md)
- [Architecture](./docs/architecture.md)
- [API Contracts](./docs/api-contracts.md)
- [Security](./docs/security.md)
- [Share Integration Spike](./docs/share-integration-spike.md)
- [Implementation Roadmap](./docs/implementation-roadmap.md)
- [Testing Strategy](./docs/testing-strategy.md)

## License
MIT
