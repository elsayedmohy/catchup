# Phase 6 — Mobile App Report

Status: **implemented and verified at runtime on an Android 15 emulator**, including
the real Android share sheet, a Chrome share, cold and warm starts, the signed-out
queue, search/filter/sort, quick save, and item archive/restore/delete. iOS is
still blocked on Apple Developer credentials.

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

## Runtime verification (Android 15 emulator)

Environment:

- AVD `Catchup_API35`, Android 15 (API 35), `sdk_gphone64_x86_64`, 3072 MB RAM.
- Emulator **35.6.11** (`build_id 13610412`) started with `-gpu host`. The
  originally installed 37.2.12 build segfaulted in bundled SwiftShader
  (`libGLESv2.so`) on this Fedora/Wayland host in every GPU and acceleration
  combination; see “Environment notes” below.
- API `http://localhost:5099`, reached from the emulator via `adb reverse
tcp:5099 tcp:5099` (the debug bundle used `http://localhost:5099`).

Checks performed and observed:

| Check                                                 | Result                                                                             |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `cmd package query-activities -a …SEND -t text/plain` | `com.catchup.app/.MainActivity` is registered with `launchMode=singleTask`.        |
| System share sheet (implicit `ACTION_SEND`)           | Catchup appears as a target; choosing it saves the link.                           |
| Share from Chrome (`example.com/chrome-share`)        | Saved; app foregrounded with the “Saved” confirmation.                             |
| Cold start (app force-stopped, explicit intent)       | Saved; item visible via the API immediately.                                       |
| Warm start (app already foregrounded)                 | `onNewIntent` is handled; saved.                                                   |
| Shared text containing a URL                          | URL extracted from the sentence and saved.                                         |
| Shared text with no URL                               | “No link found”; no item created.                                                  |
| Shortened URL (`https://bit.ly/3Q8kJ2m`)              | Saved; metadata fetch failure is non-fatal (`metadataStatus: Failed`).             |
| Metadata extraction                                   | `https://example.com/` → title “Example Domain”, `metadataStatus: Success`.        |
| Signed out, then share                                | “Sign in to save” alert; after login the pending link is saved automatically.      |
| Search (`text-around`)                                | One matching result; stale responses guarded.                                      |
| Source filter (Instagram on empty data)               | Empty state, no error.                                                             |
| Sort newest/oldest                                    | Order flips; oldest item (first ever share) is first after toggling.               |
| Quick save (`+ Link`)                                 | Saves from the inline row, refreshes the list, closes the form.                    |
| Item detail                                           | Shows source, original link, saved date, preview fallback.                         |
| Archive → API                                         | `GET /api/items?archived=true` returns the item; detail shows the “Archived” chip. |
| Restore                                               | Archived list becomes empty again.                                                 |
| Delete                                                | Confirmation alert; item disappears from the list and from the API.                |

Bug found and fixed during the run: the inbox subtitle was hard-coded to “newest
first” even when sorting oldest first. It now reflects `list.sort`
(`apps/mobile/src/components/ItemsScreen.tsx`), re-verified on the emulator.

## What was not verified

These are not done yet and must not be claimed as working:

1. **No physical Android device run.** All runtime evidence above is from the
   emulator. A release APK installs but cannot call a plain-HTTP API (see below).
2. **No shares from Instagram, TikTok, Facebook, or WhatsApp.** Those apps are not
   installed in the `google_apis` emulator image. The system share sheet, Chrome,
   and explicit intents all exercise the same `ACTION_SEND` path, so filter
   registration is proven; per-app UI differences are not.
3. **No iOS device run and no EAS cloud build yet.** Requires an Apple Developer
   team, provisioning for the app and the Share Extension, and `DEVELOPMENT_TEAM`;
   no Mac is available, so EAS Build is the only path.
4. **No mobile automated tests** (unit or E2E).
5. **Not observed:** keyboard-avoidance edge cases, safe-area behaviour on notched
   hardware, rotation, and accessibility services.

## Known limitations

1. **Release builds block cleartext HTTP.** The release manifest has no
   `usesCleartextTraffic`; Android rejects `http://` calls, so the release APK
   showed “Could not reach the server” against the dev API. This is correct for
   production (use HTTPS). For local device testing use `assembleDebug` (its
   manifest allows cleartext) plus Metro, or add a dev-only network-security
   config. Do **not** ship `usesCleartextTraffic=true`.
2. **Token expiry.** The API issues a 60-minute access token with no refresh
   token, so the app signs the user out after an hour.
3. **Text/URL shares only.** `androidIntentFilters` is `text/*` and the iOS rule
   accepts web URLs/pages/text. Shared images and files are out of scope.
4. **No offline cache.** The list shows an error with Retry when the API is
   unreachable; previously loaded items are not persisted.
5. **Regex URL extraction.** Explicit `webUrl` values are preferred; text fallback
   takes the first `http(s)` token and can include trailing punctuation.
6. **EAS credentials are not configured.** `eas.json` is present, but there is no
   `projectId` or Apple team until `eas init`/`eas credentials` are run with an
   account.
7. **Legal links are conditional.** They appear only when `EXPO_PUBLIC_WEB_URL` is
   set, since there is no deployed web URL yet.
8. **Dev warning banner.** Expo’s LogBox banner appeared once during the run
   (“Open debugger to view warnings”), but the warning did not appear in Metro
   output or `adb logcat -s ReactNativeJS` and was not reproducible. Development
   only; not observed in a release build.

## Environment notes (emulator on this host)

- The SDK’s **emulator 37.2.12** crashes with `SIGSEGV` in bundled SwiftShader
  (`libGLESv2.so`) on Fedora 44/Wayland, with or without KVM and with every
  `-gpu` mode. Coredump backtraces confirmed the GL thread.
- Workaround used: install **emulator 35.6.11** and run with `-gpu host`:

  ```bash
  $ANDROID_HOME/emulator/emulator -avd Catchup_API35 \
    -no-window -no-audio -no-boot-anim -gpu host -no-snapshot -no-metrics
  ```

  With KVM this boots Android 15 in about 21 seconds.

- Because the emulator’s `10.0.2.2` route to a loopback-bound API was unreliable
  here, the device tests used `adb reverse tcp:5099 tcp:5099` with a bundle built
  for `http://localhost:5099`.

## How to run (local device testing)

The debug build is the one that can reach the HTTP dev API:

```bash
# 1. API and web
npm run db:start
npm run api:dev

# 2. Debug APK
cd apps/mobile/android
JAVA_HOME=/path/to/jdk21 ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk

# 3. Ports: Metro + API
adb reverse tcp:8081 tcp:8081
adb reverse tcp:5099 tcp:5099

# 4. Metro with the API URL baked into the JS bundle
cd ../..
EXPO_PUBLIC_API_BASE_URL=http://localhost:5099 npx expo start --port 8081
```

For a release APK, point `EXPO_PUBLIC_API_BASE_URL` at an HTTPS API.

Sentinel commands used for share testing (note the quoting: the whole `am`
command must be one shell argument or spaces truncate `EXTRA_TEXT`):

```bash
adb shell "am start -n com.catchup.app/.MainActivity \
  -a android.intent.action.SEND -t text/plain \
  --es android.intent.extra.TEXT 'Look at https://example.com/page and more'"

# Prove the filter without launching the app:
adb shell cmd package query-activities -a android.intent.action.SEND -t text/plain | grep -A3 catchup
```

## Next step

Configure EAS (`eas init`, credentials, one iOS extension target) and run the
share acceptance list on a physical iPhone once an Apple Developer team is
available. On Android, repeat the same checklist on a physical device and, if
possible, from Instagram/TikTok/WhatsApp.
