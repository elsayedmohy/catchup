# Catchup - Testing Strategy

## 1. Backend Testing

### Unit Tests
- **Domain:** URL normalization, source extraction logic
- **Validation:** Input validation rules
- **Utilities:** Parsing, formatting, etc.

### Integration Tests
- **Auth:** Register, login, refresh, logout
- **Items:** CRUD, search, filter, archive/restore, delete
- **Ownership:** Verify users can't access others' items
- **Duplicates:** Duplicate policy behavior
- **Pagination:** Cursor-based pagination

### Security Tests
- **Authorization:** Cross-user access attempts
- **SSRF:** Test blocked IPs, private ranges, localhost, redirects
- **Input sanitization:** Malformed URLs, XSS attempts

**Tools:** xUnit, NUnit, or MSTest; EF Core InMemory/SQLite for tests

## 2. Web Testing

### Component Tests
- **Forms:** Login/register validation
- **Lists:** Inbox empty/loading/error states
- **Components:** Item cards, search, filters

### Integration Tests
- **Routes:** Protected route behavior
- **API:** Mock API responses
- **Auth flow:** Login/logout

### E2E Tests (where practical)
- **Core flows:** Login → view inbox, search
- **Save simulation:** Via API (since share is mobile-native)

**Tools:** Vitest/Jest, React Testing Library, Playwright

## 3. Mobile Testing

### Unit Tests
- **Payload parsing:** Extract URL from various share formats
- **URL validation:** Handle edge cases

### Integration Tests
- **Share handling:** Mock share intents
- **API calls:** Mock responses
- **State:** Auth, inbox state

### Device Testing (Critical)
- **Android real device/emulator:**
  - Share from Chrome, Instagram, TikTok, Facebook, WhatsApp
  - Plain text, full URL, shortened URL
  - Share while app closed, in background, open
  - No URL in share → error
  - Network failure during save
  
- **iOS real device:**
  - Same scenarios as Android
  - Share Extension lifecycle (app killed, backgrounded)
  - Auth in extension context
  - Extension timeout handling
  - Install via TestFlight/EAS if possible

## 4. Core E2E Acceptance Scenarios

Must pass on real devices:

1. **Android → Web:** Save link from Android, retrieve on web
2. **iOS → Web:** Save link from iPhone, retrieve on web  
3. **Duplicate handling:** Save same link twice - verify policy
4. **Search:** Search by title and URL
5. **Archive/Restore:** Archive and restore item
6. **Cross-user isolation:** User A cannot see User B's items
7. **Metadata failure:** Metadata extraction fails → URL still saved
8. **Network failure:** Network fails → no false success, show retry
9. **Account deletion:** Delete account → all data removed per policy
10. **Share variations:** Shortened URLs, text with embedded URL, messy shares

## 5. Edge Cases to Test

- Empty share (no URL/text)
- Very long URLs
- Non-HTTP(S) schemes (data:, file:, javascript:) - must reject
- Private/internal URLs - metadata fetch must be blocked
- Malformed HTML for metadata
- Slow network
- App killed during share
- Authentication expires during share
- Multiple rapid shares

## 6. Test Execution Requirements

- **No claiming success:** Only count tests that actually ran and passed
- **Document results:** Record pass/fail with evidence
- **Real devices:** iOS testing must be on physical iPhone
- **Regression:** Run relevant tests after changes
- **CI:** Add where feasible (unit/integration)

## 7. Acceptance Criteria per Milestone
- Each milestone must have tests executed and results documented
- Share integration (Phase 1) requires documented device test results
- All acceptance scenarios must pass before release
