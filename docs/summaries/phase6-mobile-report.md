# Phase 6 — Mobile App Report

Status: **implemented, type-checked, linted, and bundled for both platforms.**
**Not run on a physical device or emulator** (see “What was not verified”).

## What was built

`apps/mobile` — Expo SDK 54 app using Expo Router, React 19.1, React Native
0.81.5. It is a development build (not Expo Go) because the share integration is
a native module.

### Dependency versions (aligned to Expo SDK 54)

| Package                                   | Version         |
| ----------------------------------------- | --------------- |
| expo                                      | 54.0.37         |
| react / react-native                      | 19.1.0 / 0.81.5 |
| expo-router                               | 6.0.24          |
| expo-share-intent                         | 5.1.1           |
| expo-secure-store                         | 15.0.8          |
| expo-system-ui                            | ~6.0.9          |
| @react-native-async-storage/async-storage | 2.2.0           |

`apps/share-poc` was upgraded to the same Expo/React Native line so the workspace
no longer carries two incompatible React type majors. Its native projects were
regenerated and still produce the expected `ACTION_SEND` filter and iOS Share
Extension.

### Screens

| Route                 | Purpose                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| `/`                   | Splash/gate: redirects to the inbox or sign-in.                                                           |
| `/login`, `/register` | Auth; field validation, API error mapping, pending state.                                                 |
| `/(tabs)/inbox`       | Searchable, filterable, sortable library with pull-to-refresh and cursor pagination; `+ Link` quick save. |
| `/(tabs)/archive`     | Archived items with the same list behaviour.                                                              |
| `/(tabs)/settings`    | Account email, member since, theme preference, sign out, delete account.                                  |
| `/item/[id]`          | Detail: metadata, original link, archive/restore, delete.                                                 |

### Share flow

`ShareIntentProvider` wraps the app; `ShareProcessor` consumes `useShareIntent`.

1. A link shared from another app arrives as `webUrl`, or is extracted from the
   shared text with a URL regex.
2. If signed in, it is POSTed to the API immediately. A native alert reports
   success or failure, and the inbox is refreshed.
3. If signed out, the URL is kept in AsyncStorage and an alert explains that it
   will be saved after sign-in. The sign-in screen opens; once a token exists the
   pending link is flushed automatically.
4. A share with no URL (plain text) is rejected with an explanation rather than
   saving nothing silently.
5. Lists also refresh on focus, when the app returns to the foreground, and when
   the share context bumps its refresh counter — so a share that foregrounds the
   app always shows up.

### Auth

`expo-secure-store` holds the access token. On cold start the token is validated
against `GET /api/user/me` before it is trusted; a 401 clears it, an offline
failure keeps it so the user can retry. Every list/detail call that gets a 401
clears the session and routes back to sign-in (the API’s security-stamp check
means deleted accounts and changed credentials invalidate tokens immediately).

### Data layer

`src/useItems.ts` centralises list behaviour:

- 350 ms debounced search over title/URL.
- Source chips (shared source list) and newest/oldest toggle.
- Cursor pagination (`limit=25`) with de-duplication by id when appending.
- Pull-to-refresh, focus refresh, foreground refresh, and share refresh.
- Stale-request guard so fast typing cannot render an older response.
- Explicit loading, busy, empty, inline-error, and retry states.

### UX

- Light/dark palette mirrors the web tokens; follows the system by default with a
  persisted manual override (System / Light / Dark).
- Minimum 48 pt controls, accessibility roles/labels/state on buttons, chips,
  radios and links, and pull-to-refresh.
- Native `Alert` is used only for destructive confirmation and transient share
  feedback — not as a general navigation pattern.
- Missing preview images fall back to a two-letter source tile.

## What was verified

Run and observed:

```
npm install --legacy-peer-deps                  -> resolves SDK 54 versions
npx tsc --noEmit (apps/mobile)                  -> clean
npx eslint .                                    -> clean (whole repo)
npx expo prebuild --platform android --clean    -> finished
npx expo prebuild --platform ios --clean        -> finished
npx expo export --platform android              -> Hermes bundle, 3.18 MB
npx expo export --platform ios                  -> Hermes bundle, 3.18 MB
```

Generated native output was inspected:

- `android/app/src/main/AndroidManifest.xml`: `MainActivity` has
  `android:launchMode="singleTask"` and a `SEND` intent filter for `text/*`.
- `ios/ShareExtension/`: `ShareViewController.swift`, storyboard, privacy manifest,
  `ShareExtensionPreprocessor.js`.
- `ios/Catchup/Catchup.entitlements` **and**
  `ios/ShareExtension/ShareExtension.entitlements` both contain
  `group.com.catchup.app`.
- `ShareExtension-Info.plist` activation rule accepts one web URL, one web page,
  and text.
- Prebuild reports `No DEVELOPMENT_TEAM found…`, confirming the signing blocker
  rather than hiding it.

The Metro export is meaningful: it resolves every import (including the workspace
`@catchup/contracts` types and `expo-share-intent`) and compiles the whole app for
both platforms. It does **not** prove runtime behaviour.

## What was not verified

These are not done yet and must not be claimed as working:

1. **No launch on a device or emulator.** The Android AVD `Pixel_8` exists, but a
   headless emulator launch previously segfaulted; `adb` is installed at
   `/home/sayed/Android/Sdk/platform-tools/adb` (not on `PATH`).
2. **No share-sheet acceptance run** from Chrome, Instagram, TikTok, Facebook,
   WhatsApp, or any other app; no cold-start vs. backgrounded comparison.
3. **No iOS device run.** Requires an Apple Developer team, provisioning for the
   app and the extension, and `DEVELOPMENT_TEAM`; no Mac is available, so this
   must go through EAS Build.
4. **No runtime UI review**: navigation transitions, keyboard avoidance, safe
   areas, alerts, SecureStore, and theme switching were not observed on a device.
5. **No mobile automated tests** (unit or E2E).

## Known limitations

1. **Token expiry.** The API issues a 60-minute access token with no refresh
   token, so the app signs the user out after an hour.
2. **Text/URL shares only.** `androidIntentFilters` is `text/*` and the iOS rule
   accepts web URLs/pages/text. Shared images and files are out of scope.
3. **No offline cache.** The list shows an error with Retry when the API is
   unreachable; previously loaded items are not persisted.
4. **Regex URL extraction.** Explicit `webUrl` values are preferred; text fallback
   takes the first `http(s)` token and can include trailing punctuation.
5. **No EAS configuration yet.** `eas.json`, a `projectId`, and credentials still
   need to be created for cloud iOS builds.
6. **Legal links are conditional.** They appear only when `EXPO_PUBLIC_WEB_URL` is
   set, since there is no deployed web URL yet.

## How to run

```bash
npm run db:start
npm run api:dev                       # bind to 0.0.0.0 if a phone must reach it

# terminal 2
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:5099 npm run mobile:android
# or, for an already-installed dev build:
EXPO_PUBLIC_API_BASE_URL=http://<LAN-IP>:5099 npm run mobile:start
```

Common API addressing mistakes:

- `localhost` inside an Android emulator points at the emulator, not the host —
  use `10.0.2.2`, or `adb reverse tcp:5099 tcp:5099`.
- A physical device needs the host’s LAN IP and an API bound to `0.0.0.0`
  (plus a firewall allowance).

## Next step

Run the share acceptance list in `docs/share-poc-testing.md` on the Android
emulator/device, then configure EAS for iOS and document the Apple Developer
blocker precisely.
