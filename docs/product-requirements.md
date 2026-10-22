# Catchup - Product Requirements Document (PRD)

## 1. Executive Summary

**Product name:** Catchup
**Product concept:** A unified personal library for links and content users discover across social media, browsers, and other applications.

Users frequently save posts inside Instagram, TikTok, Facebook, send links via WhatsApp, or bookmark pages in browsers, only to forget where they saved them. Catchup solves this by allowing users to share content directly into Catchup from any app via the native share sheet, making it instantly retrievable from any authenticated device.

**Core value:** "Save once, find anywhere" - the critical differentiator is seamless native share-sheet integration.

## 2. Goals & Success Metrics

### Primary Goals
1. Enable frictionless saving of content via native OS share sheets (especially iOS)
2. Provide a unified inbox to retrieve saved content across all devices
3. Ensure reliability of share handling even with poor connectivity or malformed shares
4. Maintain user privacy with secure authentication and data isolation

### Success Metrics (MVP)
- Share success rate: > 99% of valid shared URLs are successfully saved
- Time to save: < 3 seconds from share selection to confirmation
- Cross-device retrieval: Shared item appears within 5 seconds on other devices
- Share acceptance: Works across major social apps (Instagram, TikTok, Facebook, WhatsApp, Chrome/Safari)

## 3. Target Users

- Mobile-first users who discover content across social platforms
- People who want a central, searchable repository of interesting links
- Users who switch between mobile and desktop

## 4. User Stories

### Critical (Share Integration)
- As a user, I want to share a post from Instagram/TikTok/Facebook to Catchup so I can save it for later
- As a user, I want Catchup to appear in the iOS share sheet when sharing content
- As a user, I want Catchup to appear in Android's share menu
- As a user, I want to save a link with minimal interaction (ideally 0-1 taps after selecting share target)
- As a user, I want to see confirmation when my item is saved

### Core Library
- As a user, I want to see all my saved items in an inbox sorted by recency
- As a user, I want to search for saved items by title or URL
- As a user, I want to filter items by source (e.g., Instagram, TikTok, YouTube)
- As a user, I want to open the original content in my browser
- As a user, I want to archive items I no longer need in my active inbox
- As a user, I want to restore or delete archived items

### Account & Sync
- As a user, I want to access my saved items from any device
- As a user, I want to register and log in securely
- As a user, I want to delete my account and all associated data
- As a user, I want my data to be private and isolated from other users

## 5. MVP Scope

### In Scope
- User registration, login, password recovery
- Authentication and secure session management
- Native share integration (iOS Share Extension + Android ACTION_SEND)
- Auto-save with minimal interaction
- Unified inbox with pagination
- Search (title, URL), filtering by source, sorting by save date
- Item detail view, open original URL
- Archive/restore, delete items
- Duplicate handling with explicit policy
- Cross-device sync
- Account settings, account deletion
- Privacy policy, terms of service
- Loading/empty/error/offline states
- Light/dark themes
- RTL-aware design foundation

### Out of Scope (MVP)
- AI summaries/recommendations
- Video downloading/transcription
- Importing existing platform saves
- Private social content access
- Social features/shared collections
- Advanced tags/collections
- Browser extensions
- Complex notifications
- Admin dashboard

## 6. Non-Functional Requirements

- **Reliability:** Share must work even if metadata extraction fails
- **Performance:** Inbox loads paginated, < 2s initial load
- **Security:** Server-authoritative authorization, SSRF protection for metadata fetch
- **Privacy:** No tracking of shared content beyond what's needed to store it
- **Accessibility:** WCAG AA target, proper contrast, touch targets ≥ 44pt
- **Scalability:** Pagination, efficient queries, proper indexing
- **Cross-platform:** Works identically in core flows across web/mobile

## 7. Assumptions & Open Questions

### Assumptions
- Users primarily share URLs from social apps
- Metadata extraction is best-effort enhancement
- Canonical URL is the source of truth

### Open Questions (to resolve)
1. **Apple Developer Account**: Current access ended. Do we need personal account or organization? What are requirements/costs? (Critical blocker for iOS distribution)
2. **Duplicate policy**: Treat as duplicate if NormalizedUrl matches same user? Or include source? Define behavior (merge vs skip vs update)
3. **Source detection**: How to infer source from URL/domain/app context?
4. **Metadata extraction**: Which fields to extract, timeout limits, size limits?
5. **Auth strategy**: Secure HttpOnly cookies (web) vs access/refresh tokens (mobile)? Need CORS/CSRF handling
6. **Offline behavior**: MVP likely online-only, but share during poor connectivity - how to handle?
7. **Share payload variations**: Different apps share full URLs, shortened, or just text. Need robust extraction

## 8. Acceptance Criteria

See testing strategy. Critical: Both Android and iOS share-to-save must work on real devices.