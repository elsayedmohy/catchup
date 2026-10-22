# Catchup - Share Integration Spike Plan

## Objective
Prove that Catchup can receive shared content via native share sheets on Android and iOS, extract URLs reliably, and save them. This is the critical gate before building the full app.

## Research Findings

### Available Solutions

#### 1. [expo-share-intent](https://github.com/achorein/expo-share-intent) (Recommended candidate)
- **Supports:** iOS Share Extension + Android ACTION_SEND
- **Expo compatible:** Yes, uses config plugin, works with dev builds and EAS
- **Behavior:** Redirects to main app when shared (single logic in main app) - matches our needs
- **Content types:** URLs, text, images, videos, files
- **iOS:** Configures Share Extension via config plugin, requires dev build (not Expo Go)
- **Android:** Configures intent filters
- **Activation rules:** Configurable per content type
- **Recent:** Actively maintained, supports Expo SDK 54/55/56/57
- **Pros:** Simple API with hooks, handles both platforms, good docs/examples
- **Cons:** iOS extension has constraints (lifecycle), custom view not supported (but we don't need it), needs dev build

#### 2. react-native-share-menu
- Older library, less Expo-first
- May need more manual native config

#### 3. Custom implementation
- iOS Share Extension from scratch in Swift/ObjC - complex, time-consuming
- Android intent handling - easier but still work

**Recommendation:** Start with `expo-share-intent` as it's the most Expo-friendly and actively maintained solution that matches our architecture.

### iOS Share Extension Considerations
- **Cannot use Expo Go** - need development build
- **EAS Build required** for testing on physical device (or local build with Mac)
- **App Groups/Keychain sharing** may be needed for auth - need to investigate
- **Extension has time/memory limits** - keep processing minimal
- **Network requests allowed** but should be fast/fail gracefully
- **No guaranteed background execution** - save quickly or open main app
- **Apple Developer account** needed for distribution/signing (current access ended per requirements)

### Android Considerations
- **Works with dev build** or even can test with `expo run:android`
- **Intent filters configured via plugin**
- **Can handle while app in background/killed**
- **Easier to test**

## POC Scope

### Minimal POC App Structure
```
apps/share-poc/
├── app/ (or App.tsx)
├── app.json with expo-share-intent plugin
└── package.json
```

### Android Test Plan
1. Create minimal Expo app with expo-share-intent
2. Configure for text/URL sharing
3. Build and install on Android device/emulator
4. Test shares from:
   - Chrome (URL)
   - Instagram (may share URL or text)
   - TikTok
   - WhatsApp (URL/text)
   - Notes app
5. Verify payload extraction (webUrl, text)
6. Test edge cases: shortened URL, text with URL, no URL
7. Document results

### iOS Test Plan
1. Configure same plugin for iOS
2. Check Apple Developer account status (CRITICAL)
3. Try EAS build for development
4. Install on physical iPhone
5. Test from Safari, social apps
6. Test extension lifecycle
7. Document signing requirements and blockers

## Implementation Steps

### Step 1: Create POC
```bash
cd /home/sayed/Code/Alpha/Catchup/apps
npx create-expo-app@latest share-poc --template blank-typescript
cd share-poc
npx expo install expo-share-intent expo-linking
```

### Step 2: Configure app.json
Add plugin and scheme as per expo-share-intent docs.

### Step 3: Create minimal handler
```tsx
import { useShareIntent } from "expo-share-intent";
import { useEffect } from "react";
import { Text, View } from "react-native";

export default function App() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  
  useEffect(() => {
    if (hasShareIntent) {
      console.log("Share:", shareIntent);
      // Extract URL
      const url = shareIntent.webUrl || extractUrl(shareIntent.text);
      console.log("Extracted URL:", url);
      // For POC just display
    }
  }, [hasShareIntent]);
  
  return (
    <View>
      <Text>Catchup Share POC</Text>
      {hasShareIntent && <Text>{JSON.stringify(shareIntent)}</Text>}
    </View>
  );
}
```

### Step 4: Test Android
```bash
npx expo prebuild --platform android --clean
npx expo run:android
# or use EAS
```

### Step 5: Test iOS (if possible)
```bash
npx expo prebuild --platform ios --clean
# Check if can build
npx expo run:ios # needs Mac
# or use EAS Build
eas build --platform ios --profile development
```

## Go/No-Go Criteria

**GO if:**
- Android: Successfully receives shares from >= 3 apps, extracts URLs correctly
- iOS: Can build and install on device, receives shares from Safari and >=1 social app
- URL extraction works for common cases
- Handles edge cases reasonably

**NO-GO / NEED ALTERNATIVE if:**
- iOS Share Extension cannot be configured without Mac/expensive setup
- Apple Developer account completely unavailable and blocks all distribution
- Library doesn't work as advertised
- Extension too constrained for our needs

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| No Apple Developer account | High | High (stated) | Document exact requirements, try free account limitations, consider TestFlight needs |
| No Mac for local iOS build | High | High | Use EAS Build (cloud), can build on Linux via EAS |
| Expo Go doesn't support extensions | High | Certain | Must use dev build - expected |
| iOS extension auth issues | High | Medium | May need to route to main app for auth, or use shared Keychain |
| Different apps share different formats | Medium | High | Robust URL extraction (regex), handle text-only |
| Network from extension fails | Medium | Medium | Save locally or queue, open main app for full flow |

## Documentation Required
- Test results for each app/platform
- Screenshots/videos if possible
- Payload examples from different apps
- Blockers with exact error messages
- Recommended solution and next steps
- Apple Developer Program requirements and costs

## Next Actions
1. Check if we can proceed with creating POC
2. Research current expo-share-intent version compatibility
3. Start Android POC first (easier)
4. Investigate iOS signing situation
5. Document everything
