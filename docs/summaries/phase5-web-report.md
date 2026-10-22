# Phase 5 — Web App Report

Status: **implemented and manually verified in a real browser** against the live API.
Not deployed.

## What was built

`apps/web` — Next.js **16.4.2** (App Router, React 19.3, TypeScript), calling the
API **server-side only**.

### Security model

The access token is stored in an **HttpOnly, SameSite=Lax cookie** and is never
sent to the browser. All API calls happen in Server Components and Server Actions,
so client JavaScript never sees a bearer token. There is no `NEXT_PUBLIC_*` API
token, no localStorage token, and no client-side fetch of the API.

- `lib/session.ts` — cookie read/write helpers; `requireSessionToken()` redirects
  to `/login` when there is no session.
- `lib/api.ts` — typed server-side API client; maps the API error envelope to
  `ApiClientError`.
- `app/actions.ts` — Server Actions for register, login, logout, save, archive,
  restore, delete item, delete account.

### Pages

| Route | Purpose |
| --- | --- |
| `/` | Redirects to `/inbox` or `/login`. |
| `/login`, `/register` | Auth forms with field-level validation errors. |
| `/inbox` | Quick save, search, source filter, sort, paginated list, archive/delete. |
| `/archive` | Archived items with restore, search and filter. |
| `/items/[id]` | Detail: title, description, preview image, source, saved/archived dates, metadata status, open original, archive/restore/delete. |
| `/settings` | Account email, member since, account deletion. |
| `/privacy`, `/terms` | Required policy pages, linked from auth screens and settings. |
| `not-found`, `error`, `loading` | Not-found, error-with-retry, and skeleton loading states. |

### UX / design

- CSS-variable design tokens with automatic light/dark via
  `prefers-color-scheme`, plus a manual toggle that persists in `localStorage`
  and is applied before first paint (no theme flash).
- Content-first list: minimal borders, one soft panel per screen, no card grid.
- 44 px minimum interactive targets, visible focus rings, labelled form controls,
  `aria-current` navigation, `role="alert"` errors, `aria-live` loading skeleton.
- Logical CSS properties (`margin-block-end`, `border-block-end`, `inset`) for
  RTL-readiness. Full RTL QA not performed.
- **Destructive actions use inline two-step confirmation**, not native modal
  dialogs — matching the "no modals for every action" requirement.
- Search/filter state lives in the URL (`?q=&source=&sort=&cursor=`), so pages are
  linkable and back/forward works.
- Preview images use plain `<img>` with `referrerPolicy="no-referrer"` because
  they come from arbitrary remote hosts; the Next image optimiser would need
  wildcard remote patterns.

### Pagination

Cursor pagination from the API, exposed as "Older →" / "← Newest" links that keep
the current filters. Page size 30. This is link-based navigation rather than
infinite scroll — deliberate, so state stays in the URL and revalidation never
desynchronises an in-memory list.

## Verification actually run

Production build:

```
next build   -> compiled successfully, TypeScript clean
              routes: /, /_not-found, /archive, /inbox, /items/[id],
                      /login, /privacy, /register, /settings, /terms (all dynamic)
eslint apps/web -> 0 errors, 0 warnings
tsc --noEmit    -> clean
```

Manually driven in a real Chromium tab against the running API and PostgreSQL:

| Flow | Result |
| --- | --- |
| Register new account | Redirects to `/inbox`, empty state shown. |
| Save `https://example.com/?utm_source=sharecopy` | Item saved; title "Example Domain" extracted; source `example.com`; input cleared. |
| Duplicate/tracking params | Original URL preserved verbatim; normalisation used only for dedupe. |
| Search no match | "No matches" state with "Clear filters". |
| Search match | Item returned. |
| Item detail | Title, source, original link, saved date, "Details loaded" status. |
| Archive from detail | Status switches to Archived, restore action appears. |
| Archive list | Item listed; empty state after restore. |
| Restore | Item returns to inbox, archive empties. |
| Delete item | Inline "Delete permanently? / Delete / Cancel"; item removed after confirm. |
| Settings | Email and member-since shown. |
| Delete account | Two-step confirm; redirects to `/login`. |
| Login after deletion | Rejected with "Invalid email or password." (account + tokens gone). |
| Sign out | Redirects to `/login`. |
| Protected route while signed out | `/inbox` redirects to `/login`. |
| Privacy / terms | Render; linked from auth screens and settings. |
| Theme toggle | Sets `data-theme`, persists in `localStorage`, survives reload. |

## Known limitations

1. **No committed automated browser tests.** The flows above were scripted
   manually through the agent's browser. Playwright (or Next's own test runner)
   should be added so these become repeatable CI checks.
2. **Build-time API dependency is avoided**, but every page is dynamic because
   the root layout reads the session cookie. That is correct for an authenticated
   app, but it means no static optimisation.
3. **No optimistic UI.** Archive/delete wait for the server action and
   revalidation; on slow networks the buttons feel synchronous. Disabled/pending
   states are not yet shown on those buttons (the save and auth buttons do show
   pending states).
4. **No image proxy or cache.** Preview images are loaded directly from the
   source site, so some will fail or be blocked by referrer/CSP policies.
5. **RTL is prepared, not verified.** No Arabic/Hebrew QA pass.
6. **No export.** Account deletion is implemented; data export is not.
7. **Refresh tokens absent** (inherited from the API): the web session ends after
   the 60-minute access token expires and the user must sign in again.

## How to run

```bash
npm run db:start
npm run api:dev
npm run web:dev      # http://localhost:3000
```

`API_BASE_URL` overrides the API location (default `http://localhost:5099`).

## Next

Phase 6 — the Expo mobile app, reusing the `expo-share-intent` wiring already
proven in `apps/share-poc`.
