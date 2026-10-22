# Catchup - Security Requirements

## 1. Authentication & Authorization

### Authentication
- **Passwords:** Hash with strong algorithm (Argon2 or BCrypt). Never store plaintext.
- **Sessions/Tokens:** Access tokens short-lived (e.g., 15-60 min), refresh tokens longer but rotatable.
- **Rotation:** On refresh, invalidate old refresh token and issue new one (refresh token rotation)
- **Revocation:** Support logout, token revocation on password change/account deletion
- **Brute force:** Rate limiting on login/register endpoints

### Authorization
- **Server-authoritative:** Never trust client-supplied UserId
- **Ownership check:** Every item operation verifies `item.UserId == authenticatedUserId`
- **Resource isolation:** Users can only access their own data
- **Fail securely:** Return 404 (not 403) to avoid leaking resource existence

## 2. Web Security

- **CORS:** Restrict to known origins only
- **CSRF:** If using cookies for auth, implement CSRF protection (SameSite=Strict/Lax, CSRF tokens)
- **Secure cookies:** HttpOnly, Secure (HTTPS), SameSite
- **Headers:** Consider CSP, HSTS, X-Content-Type-Options, X-Frame-Options
- **XSS:** Sanitize user input in rendering; React helps but be careful

## 3. Mobile Security

- **Secure storage:** Use SecureStore (Expo) / Keychain (iOS) / EncryptedSharedPreferences (Android) for tokens
- **Certificate pinning:** Consider for production
- **Deep links/URL schemes:** Validate and sanitize
- **Biometric auth:** Nice to have, not required for MVP

## 4. SSRF Protection (Critical for Metadata Fetching)

Metadata extraction fetches user-submitted URLs - major attack vector.

**Requirements:**
- **Scheme allowlist:** Only `http://` and `https://`
- **Block private/reserved:** 
  - IPv4: 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16, 0.0.0.0/8, 100.64.0.0/10
  - IPv6: ::1, fc00::/7, fe80::/10, ::ffff:0:0/96
- **DNS resolution:** Resolve hostname to IP, check IP against blocklist
- **Redirects:** Follow redirects but validate each destination
- **Timeouts:** Connect timeout (e.g., 3s), read timeout (e.g., 5s)
- **Size limits:** Max response size (e.g., 5MB) to prevent memory exhaustion
- **No credentials:** Don't send auth headers/cookies
- **No user info:** Strip user:pass from URL
- **Disable redirects to dangerous hosts:** Recheck after each redirect
- **Block cloud metadata:** 169.254.169.254, etc.

**Implementation:** Use HttpClient with custom handler, DNS resolution checks.

## 5. Data Privacy & Deletion

- **Data isolation:** Strict per-user filtering
- **Account deletion:** DELETE /api/user/me must delete user and ALL associated SavedItems (cascade delete)
- **No third-party sharing:** Don't share user data
- **Minimal data:** Only store what's needed (URL, metadata, timestamps)
- **Logs:** Avoid logging full URLs with sensitive params? Or be careful
- **Privacy policy:** Required before public release

## 6. API Security

- **Input validation:** Server-side on all inputs (FluentValidation)
- **Rate limiting:** Auth endpoints, item creation
- **SQL injection:** EF Core parameterized queries (safe by default)
- **Error messages:** Don't leak stack traces in production
- **Secrets management:** Environment variables, never in code
- **HTTPS only:** In production

## 7. Share Extension Security (iOS)

- **Data sharing:** Use App Groups for sharing data between extension and main app if needed
- **Keychain sharing:** Use Keychain Access Groups carefully
- **Minimal permissions:** Extension needs minimal capabilities
- **Auth tokens:** Don't store long-lived sensitive tokens insecurely
- **Validation:** Validate all incoming shared data

## 8. Security Checklist for MVP
- [ ] Password hashing implemented
- [ ] AuthZ on all protected endpoints
- [ ] SSRF protection for metadata fetching
- [ ] Secure token storage on mobile
- [ ] CORS configured properly
- [ ] Account deletion tested and working
- [ ] No secrets in repo
- [ ] Input validation on all endpoints
- [ ] User data isolation verified by tests
