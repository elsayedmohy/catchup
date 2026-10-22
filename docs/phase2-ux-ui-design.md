# Phase 2 - UX/UI Design

## Objectives
Create wireframes, design system, component specifications for mobile and web, with light/dark themes and responsive design.

## Design Principles (from requirements)
- Content-first, personal library aesthetic
- Clean, modern (not enterprise dashboard)
- Fast access to saved content
- Clear hierarchy, readable titles
- Accessible (WCAG AA target)
- Light/dark themes
- Future RTL support
- Mobile-optimized for save/retrieval, web-optimized for browsing

## Design Tokens

### Colors
```json
{
  "light": {
    "background": "#ffffff",
    "surface": "#f9fafb",
    "surface-elevated": "#ffffff",
    "text-primary": "#111827",
    "text-secondary": "#4b5563",
    "text-tertiary": "#6b7280",
    "border": "#e5e7eb",
    "border-subtle": "#f3f4f6",
    "primary": "#2563eb",
    "primary-hover": "#1d4ed8",
    "success": "#16a34a",
    "error": "#dc2626",
    "warning": "#ea580c"
  },
  "dark": {
    "background": "#0f172a",
    "surface": "#1e293b",
    "surface-elevated": "#334155",
    "text-primary": "#f1f5f9",
    "text-secondary": "#cbd5e1",
    "text-tertiary": "#94a3b8",
    "border": "#334155",
    "border-subtle": "#1e293b",
    "primary": "#3b82f6",
    "primary-hover": "#2563eb",
    "success": "#22c55e",
    "error": "#ef4444",
    "warning": "#f97316"
  }
}
```

### Typography
- **Font Stack:** System fonts (-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif)
- **Scale:** 12px, 14px, 16px, 18px, 20px, 24px, 30px, 36px
- **Weights:** 400, 500, 600, 700
- **Line heights:** 1.25, 1.5, 1.75

### Spacing (4pt scale)
4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96

### Border Radius
sm: 6px, md: 8px, lg: 12px, xl: 16px, full: 9999px

### Shadows
```json
{
  "sm": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  "md": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  "lg": "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)"
}
```

## Mobile Screens (React Native)

### 1. Inbox
**Layout:** FlatList of items
**Components:**
- Header: Logo/title "Inbox", search icon, settings
- ItemCard: Thumbnail (48x48 or larger), title (2 lines max), source/domain, relative time
- Empty state: Icon + text + "Share something to get started"
- Pull to refresh
- FAB or just header actions

### 2. Share Confirmation
**Purpose:** Handle incoming share (extension/main app)
**Layout:** Centered card/modal
**Elements:**
- Preview of URL/domain
- Status: "Saving..." with spinner, "Saved!" with checkmark, "Error" with message
- Auto-dismiss on success (2-3s) or manual close
- Retry button on error

### 3. Item Detail
**Layout:** ScrollView
**Elements:**
- Large thumbnail if available
- Title (large)
- Description
- Metadata: Source, Saved date, URL
- Actions: "Open Original", "Archive", "Delete"
- URL shown as tappable

### 4. Search/Filter
**Layout:** Search bar + filter chips + results
**Filters:** All, by source (Instagram, TikTok, etc.)
**Sort:** Recent first (default)

### 5. Archive
**Similar to Inbox** but shows archived items, actions are "Restore" and "Delete Permanently"

### 6. Settings
**Sections:** Account, Appearance (Theme toggle), About, Privacy Policy, Terms of Service, Delete Account (destructive), Sign Out

## Web Screens (Next.js)

### 1. Landing Page
**Hero section:**
- Headline: "Save links from any app. Find them all in one place."
- Subheading: "Share to Catchup and access your saved content anywhere."
- CTA: "Get Started" / "Sign In"
- Visual: Share sheet mockup

**Features:**
- Share from any app
- Unified inbox
- Search and filter
- Cross-device sync

### 2. Inbox Dashboard
**Layout:** Two-column or single column
- **Header:** Logo, search bar, user menu
- **Sidebar/Nav:** Inbox, Archive, Settings
- **Main:** List of items with more details
- **Optional:** Preview pane on right (desktop)
**Responsive:** Stack on mobile

### 3. Item Card (shared concept)
```tsx
interface ItemCardProps {
  item: SavedItem;
  onPress: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
}
```

## Component Library

### Core Components
- **Button:** Primary, secondary, ghost, destructive variants
- **Input:** Text, search with icon
- **Card:** Container with padding, border
- **ListItem:** For inbox items
- **EmptyState:** Reusable empty state
- **LoadingSpinner:** 
- **Avatar/Logo:**
- **Badge:** For source tags
- **ThemeToggle:** Light/dark/system

### Design Patterns
- Touch targets minimum 44x44pt
- Consistent spacing using tokens
- Focus states for accessibility
- Loading skeletons
- Error boundaries
- Toast notifications for actions

## Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px  
- Desktop: > 1024px

## Implementation Notes
- Use CSS variables for theming
- Implement theme context/provider
- System preference detection with manual override
- Store theme preference in localStorage
- Mobile: React Native StyleSheet with theme
- Web: Tailwind CSS or CSS modules with tokens

## Deliverables
- [x] Design tokens defined
- [x] Screen specifications for mobile and web
- [x] Component specifications
- [x] Responsive breakpoints
- [x] Theme strategy
- [x] Accessibility considerations
