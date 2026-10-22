# Catchup - User Flows

## 1. Critical Flow: Share Content into Catchup

This is the primary product flow and must work reliably on iOS and Android.

### Flow 1A: Share URL from Mobile App (iOS/Android)

```text
1. User discovers content in app (Instagram/TikTok/Facebook/WhatsApp/Chrome/Safari)
2. User taps Share button
3. System share sheet appears
4. User selects "Catchup" from share destinations
5. Catchup receives share intent (payload: URL/text)
6. App validates and extracts usable URL
7. If authenticated: Save item (with metadata extraction best-effort)
8. Show save confirmation (success/failure with appropriate messaging)
9. Return to originating app (or stay in Catchup based on platform behavior)
```

**Key considerations:**
- iOS Share Extension has lifecycle constraints (limited time, no guaranteed network in all states)
- Must work with shortened URLs, text-only shares, or mixed content
- Should require minimal user interaction when possible
- On failure, preserve the URL and show clear error

### Flow 1B: Share with Authentication Required

```text
1. User shares content to Catchup
2. App detects not authenticated
3. Present login/registration UI in share context
4. User authenticates
5. Return to share flow and save item
6. Show confirmation
```

**Constraint:** iOS Share Extension UI is constrained; authentication flow must work within extension or route to main app appropriately.

## 2. Inbox & Retrieval

### Flow 2: View Inbox
```text
1. User opens Catchup (mobile app or web)
2. Authenticates if needed
3. Inbox loads with paginated recent items
4. User sees list with thumbnail, title, source, saved time
5. Tap/click item → Item detail or open original URL
```

### Flow 3: Search & Filter
```text
1. User taps search
2. Types query (title or URL)
3. Results update (debounced)
4. User can filter by source
5. User can sort by date
```

### Flow 4: Archive & Restore
```text
1. User selects item(s) or action on item
2. Archive → moves to Archive view
3. Archive view shows archived items
4. Restore moves back to Inbox
5. Delete permanently removes item
```

## 3. Account Management

### Flow 5: Registration & Login
```text
1. User opens app/web
2. Choose Sign Up or Sign In
3. Enter credentials
4. Validate server-side
5. Establish session
6. Redirect to Inbox
```

### Flow 6: Account Deletion
```text
1. User goes to Settings → Account
2. Select "Delete Account"
3. Confirm destructive action (modal/confirmation)
4. API deletes all user data (items, account)
5. Sign out and show confirmation
6. Data is irrecoverable per policy
```

## 4. Cross-Device Sync

### Flow 7: Cross-Device Retrieval
```text
1. User shares item on Device A (mobile)
2. Item saved to backend
3. User opens Catchup on Device B (web/mobile)
4. Inbox refreshes/pulls latest items
5. New item appears in Inbox (within seconds)
```

## 5. Edge Cases

- **No URL in share**: Extract from text if present; if none, show error "No valid URL found"
- **Shortened URL**: Store original shared URL; can normalize later but preserve original
- **Duplicate share**: Apply defined duplicate policy (see PRD)
- **Network failure during share**: Show retryable error, don't claim success
- **Metadata fetch fails**: Save with URL only, mark metadata status, continue
- **Share while offline**: MVP - show error, prompt to retry when online
- **App killed during share (iOS)**: Extension must handle lifecycle gracefully

All flows prioritize reliability of the share flow over polish.