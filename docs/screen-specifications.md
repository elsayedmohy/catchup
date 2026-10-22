# Catchup - Screen Specifications

## Design Principles
- Content-first, minimal UI
- Clean, modern library aesthetic (not enterprise dashboard)
- Light/dark themes
- Mobile-optimized for save/retrieval, web-optimized for browsing
- Accessible (44pt minimum touch targets, good contrast)
- Future RTL support

## 1. Mobile Screens (React Native + Expo)

### 1.1 Welcome/Onboarding
- **Purpose:** Introduce product, highlight share-to-save
- **Elements:**
  - App logo/name
  - Hero: "Save links from any app in one place"
  - Key benefit: Show share sheet illustration/text
  - Primary CTA: "Get Started" / "Sign In"
- **States:** Initial only

### 1.2 Login
- **Purpose:** Authenticate existing users
- **Fields:** Email, Password
- **Actions:** Sign In, Forgot Password, Go to Sign Up
- **States:** Loading, Error, Validation

### 1.3 Registration
- **Purpose:** Create account
- **Fields:** Email, Password, Confirm Password
- **Actions:** Sign Up, Go to Sign In
- **Validation:** Server-side authoritative
- **States:** Loading, Error

### 1.4 Password Recovery
- **Purpose:** Reset forgotten password
- **Fields:** Email
- **Actions:** Send Reset Link, Back to Login
- **States:** Success confirmation, Error

### 1.5 Inbox (Home)
- **Purpose:** Primary list of saved items
- **Layout:** List (FlatList) with cards/items
- **Elements:**
  - Header: "Inbox" or logo, Search icon, Settings/Profile
  - List items: Thumbnail (if available), Title, Source/domain, Saved time (relative)
  - Pull to refresh
  - Infinite scroll/pagination
- **States:** Loading, Empty (with CTA), Error + Retry, Offline
- **Actions:** Tap item → Detail, Long press? Maybe later, Archive, Delete

### 1.6 Share Handling / Save Confirmation
- **Purpose:** Handle incoming shares (separate UI for extension context)
- **Elements:**
  - Preview: URL, extracted title/domain if available
  - Status: Saving..., Success, Error
  - Actions: Save (if manual confirm needed), Cancel/Close
  - Auto-progress: Prefer auto-save with confirmation toast/banner
- **Critical:** Minimal UI, fast completion. Must work in iOS Share Extension constraints
- **States:** Processing, Success, Error (with retry)

### 1.7 Search & Filtered Results
- **Purpose:** Find saved items
- **Elements:** Search bar (debounced), Filter by source chips, Sort (Recent/Oldest), Results list
- **States:** Empty results, Loading

### 1.8 Saved Item Details
- **Purpose:** Full view of item
- **Elements:** Full title, Description, Large thumbnail, Source, Original URL, SavedAt, Metadata status
- **Actions:** Open in Browser, Archive, Delete, Share original URL
- **States:** Loading, Error

### 1.9 Archive
- **Purpose:** View archived items
- **Layout:** Similar to Inbox, filtered to archived
- **Actions:** Restore, Delete permanently
- **States:** Empty, List

### 1.10 Settings & Account
- **Purpose:** Account management, preferences
- **Sections:** Account (Email), Theme (Light/Dark/System), About, Privacy Policy, Terms, Delete Account, Sign Out
- **Actions:** Theme toggle, Open policies (webview or external), Delete account (destructive with confirmation)

### 1.11 Error/Empty States
- **Empty Inbox:** Illustration + "No saved items yet" + "Share something to get started"
- **Network Error:** "Connection issue" + Retry
- **No Results:** "No results for [query]"
- **Share Error:** Specific, actionable messages

## 2. Web Screens (Next.js App Router)

### 2.1 Landing Page
- **Purpose:** Marketing/home, conversion
- **Sections:** Hero, "How it works" (Share → Save → Find), Platform logos, CTA (Get Started/Sign In), Footer (Privacy/Terms)
- **Responsive:** Desktop-first, mobile-friendly

### 2.2 Login/Register/Password Recovery
- **Purpose:** Auth flows
- **Layout:** Centered card, clean form
- **Responsive:** Works on mobile

### 2.3 Inbox Dashboard
- **Purpose:** Main library view
- **Layout:** Sidebar or top nav + List/grid + Optional detail panel
- **Elements:** Search, Filters (source), Sort, View toggle, Archive link, Settings
- **Responsive:** Desktop shows richer layout, mobile collapses to list

### 2.4 Search Results
- **Purpose:** Search view with filters
- **Similar to Inbox with query context**

### 2.5 Item Details/Preview
- **Purpose:** View item content
- **Options:** Detail page or slide-in drawer (desktop preferred for speed)
- **Actions:** Open original, Archive, Delete

### 2.6 Archive
- **Purpose:** Archived items management

### 2.7 Account Settings
- **Purpose:** User preferences & account

### 2.8 Legal Pages
- **Privacy Policy, Terms of Service** - static markdown/pages

### 2.9 Not Found/Error Pages
- 404, 500 with appropriate messaging

## Design Tokens (Suggested)
- **Colors:** Primary, background (light/dark), surface, text primary/secondary, error, success, border
- **Spacing:** 4pt scale (4,8,12,16,20,24,32,40,48)
- **Typography:** System font stack, sizes 12/14/16/18/20/24/32
- **Radius:** 8-12px
- **Elevation:** Subtle shadows for dark/light
- **Breakpoints:** sm 640, md 768, lg 1024, xl 1280

No excessive gradients, decorative animations, or dense widgets. Prioritize readability and speed.