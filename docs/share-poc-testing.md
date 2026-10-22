# Share POC Testing Guide

> This guide covers the original standalone POC in `apps/share-poc`. The real
> app's Android share acceptance run is recorded in
> [summaries/phase6-mobile-report.md](./summaries/phase6-mobile-report.md).

## POC Location

`apps/share-poc/` - Minimal Expo app using `expo-share-intent`

## Prerequisites

- Node.js and npm installed
- Android device or emulator
- For iOS: Physical iPhone (no Mac available, need EAS Build)
- Expo CLI/EAS CLI

## Setup

```bash
cd apps/share-poc
npm install
```

## Android Testing

### Option 1: Run on connected device/emulator

```bash
npx expo run:android
```

### Option 2: Development build

```bash
npx expo prebuild --platform android --clean
npx expo run:android
```

### Test Cases

1. **Chrome** - Share a webpage URL
2. **Instagram** - Share a post/reel (may share URL or deeplink)
3. **TikTok** - Share content
4. **Facebook** - Share post
5. **WhatsApp** - Share a URL/link
6. **Plain text with URL** - Share text containing http(s)://
7. **Shortened URL** - bit.ly, t.co, etc.
8. **Text without URL** - Should show error/no URL extracted
9. **Share with app closed** - Kill app, share to it
10. **Share with app in background**

**Expected:** App opens, shows payload, extracts URL in blue box.

## iOS Testing

**Important:** iOS Share Extension requires development/distribution build. Expo Go doesn't support extensions.

### Check Apple Developer Account Status

Current situation: Previous employer access ended. Need to check:

- Do we have access to any Apple Developer account?
- Can we use free account for development?
- What are limitations?

### Try EAS Build

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios --profile development
```

Free Apple Developer account limitations:

- May not be able to use some capabilities (like Share Extensions in some cases)
- Limited to specific bundle IDs
- Need to verify

### Test on Physical iPhone

1. Build with EAS
2. Install on iPhone via QR code/link
3. Test sharing from Safari
4. Test from social apps
5. Check if extension appears in share sheet

## What to Document

For each test:

- App/platform and version
- Source app
- Payload received (copy from POC)
- URL extracted successfully (yes/no)
- Notes/issues
- Screenshots if possible

## Known Issues to Watch For

- iOS extension not appearing in share sheet → signing/provisioning issue
- App doesn't open on share → intent/filter misconfiguration
- URL not extracted → parsing issue
- Crashes on share → lifecycle issue

## POC Code

The POC logs everything and displays extracted URL. Reset button clears state.
