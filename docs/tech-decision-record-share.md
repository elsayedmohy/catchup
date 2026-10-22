# Technical Decision Record (TDR): Native Share Integration

**Date:** 2026-10-20  
**Status:** Proposed (pending POC validation)  
**Decision Makers:** Product/Engineering  
**Criticality:** High

## Problem Statement
Catchup needs to receive shared content from other apps via native share sheets on iOS and Android. The most important requirement is native share-sheet integration, particularly on iOS.

## Options Considered

### Option 1: expo-share-intent (Recommended)
- **What:** Config plugin + native module providing Share Extension (iOS) and ACTION_SEND handling (Android)
- **Pros:**
  - Expo-first, good config plugin support
  - Single API for both platforms
  - Redirects to main app - simplifies logic
  - Handles URLs, text, images, files
  - Actively maintained, good documentation
  - Can be configured via app.json
- **Cons:**
  - Requires development build (not Expo Go) - expected
  - No iOS custom view (not needed)
  - Extension lifecycle constraints inherit from iOS
- **Complexity:** Medium (low if POC works)
- **Platform coverage:** iOS + Android

### Option 2: Custom iOS Share Extension + React Native Linking
- **What:** Write native iOS Share Extension, use App Groups for communication
- **Pros:** Full control over iOS behavior, optimal for constraints
- **Cons:** Requires native Swift/ObjC, more complex in Expo (needs custom native code), harder to maintain
- **Complexity:** High
- **Platform coverage:** Need separate Android solution

### Option 3: react-native-share-menu
- **What:** Older library
- **Pros:** Works in some cases
- **Cons:** Less Expo-native, less maintained, more setup friction
- **Complexity:** Medium

## Recommendation
**Option 1: Use `expo-share-intent`**

Reasoning:
1. Fastest path to test both platforms
2. Matches monorepo with Expo
3. Single codebase for handling shares
4. Good examples and community
5. Configurable via app.json/plugin - fits EAS workflow
6. Provides same redirect behavior on both platforms

## Key Technical Considerations

### Authentication Across Extension & Main App
iOS Share Extension runs in separate process. Options:
- Store tokens in Keychain with App Group sharing
- Redirect to main app to authenticate if needed
- For MVP, if not authenticated, prompt auth in context (extension can show UI if small) but better to open main app via URL scheme

With expo-share-intent, it opens main app with deep link containing share data. So auth can be handled in main app - preferred.

### Network from Extension
Possible but constrained on iOS. Better to open main app and handle save there - aligns with expo-share-intent's approach.

### URL Extraction Strategy
Need robust extraction:
1. Use `shareIntent.webUrl` if present (preferred)
2. Extract URLs from `shareIntent.text` using regex
3. Handle cases where only plain text
4. Normalize URLs (preserve original but also normalized)

### Duplicate Handling
Return existing if normalized URL exists for user (idempotent). May bump savedAt to bring to top.

### Metadata Extraction
Async, best-effort. Must not block save. Save with URL only if fails.

## Security Considerations
- Validate URLs (scheme http/https only)
- SSRF protection on backend for metadata fetch (separate concern)
- Don't trust share data - sanitize

## Unknowns to Resolve via POC
1. **Apple Developer account status** - Can we build/sign for physical iPhone? Free account limitations?
2. **iOS signing for Share Extension** - Separate target, needs provisioning
3. **How different apps format shares** (Instagram/TikTok/Facebook/WhatsApp) - payload variations
4. **Lifecycle on iOS**: Extension killed, app backgrounded, etc.
5. **EAS Build works with extensions** - Yes in general, but need to verify

## Decision
Proceed with POC using `expo-share-intent`. If iOS is blocked by account/signing, document blocker with exact requirements to unblock. Do not abandon iOS requirement - document minimum steps.