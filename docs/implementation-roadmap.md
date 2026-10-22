# Catchup - Implementation Roadmap

This roadmap follows the phases specified. Each phase has clear deliverables and gates.

## Phase 0: Requirements & Planning (Current)
**Goal:** Complete planning and technical investigation
**Status:** In Progress

**Deliverables:**
- [x] Product requirements doc
- [x] User flows
- [x] Screen specifications
- [x] Architecture
- [x] API contracts
- [x] Security requirements
- [ ] Implementation roadmap (this doc)
- [ ] Testing strategy
- [ ] Technical spike plan for share integration

**Gate:** Review plan, identify blockers, get approval to proceed to spike

## Phase 1: Share Integration Spike (CRITICAL GATE)
**Goal:** Prove iOS and Android share-to-save works on real devices
**Priority:** HIGHEST - blocks everything else
**Estimated:** 1-3 days investigation + testing

### Tasks
1. **Research**
   - [ ] Read Expo docs on share intents/extensions
   - [ ] Read iOS Share Extension docs
   - [ ] Read Android ACTION_SEND docs
   - [ ] Check available packages (expo-share-intent, react-native-share-menu, etc.)
   - [ ] Investigate EAS build for extensions

2. **Android POC**
   - [ ] Create minimal Expo app
   - [ ] Configure intent filter for ACTION_SEND
   - [ ] Handle incoming share
   - [ ] Test from Chrome, Instagram, WhatsApp
   - [ ] Verify payload parsing

3. **iOS POC**
   - [ ] Investigate Share Extension setup with Expo
   - [ ] Try with Config Plugin approach
   - [ ] Set up EAS build if possible
   - [ ] Test signing/distribution to physical iPhone (check Apple account status)
   - [ ] Test from Safari, social apps
   - [ ] Document blockers

4. **Documentation**
   - [ ] Technical Decision Record (TDR)
   - [ ] Go/No-Go recommendation
   - [ ] List exact blockers and solutions

**Gate:** Must have working POC on Android + clear path/blockers for iOS. If iOS fundamentally blocked, need alternative plan.

## Phase 2: UX/UI Design
**Goal:** Create wireframes and design system
**Status:** Pending Phase 1 gate

**Deliverables:**
- [ ] Low-fidelity wireframes for key screens
- [ ] High-fidelity designs (Figma or similar)
- [ ] Design tokens
- [ ] Component specs
- [ ] Dark/light themes
- [ ] Mobile and web layouts

**Gate:** Designs reviewed and approved

## Phase 3: Project Foundation
**Goal:** Set up monorepo and dev environment
**Status:** Pending

**Tasks:**
- [ ] Initialize pnpm workspace
- [ ] Create apps/web (Next.js), apps/mobile (Expo), apps/api (.NET)
- [ ] Setup packages/contracts, packages/tooling
- [ ] Configure linting, formatting (ESLint, Prettier)
- [ ] Setup TypeScript configs
- [ ] Local PostgreSQL setup instructions
- [ ] .gitignore, README
- [ ] Environment variable templates

**Gate:** All projects build/run locally

## Phase 4: Backend (ASP.NET Core API)
**Goal:** Core API with auth and items
**Status:** Pending

**Tasks:**
- [ ] Project structure (feature folders)
- [ ] DbContext, entities, migrations
- [ ] Authentication (register/login/refresh)
- [ ] SavedItems CRUD
- [ ] Search, filtering, pagination
- [ ] Archive/restore
- [ ] Metadata extraction service (with SSRF protection)
- [ ] Duplicate handling
- [ ] Authorization checks
- [ ] FluentValidation
- [ ] OpenAPI/Swagger
- [ ] Unit tests, integration tests

**Gate:** API passes tests, OpenAPI docs complete

## Phase 5: Web (Next.js)
**Goal:** Web app with full functionality
**Status:** Pending

**Tasks:**
- [ ] Auth flows
- [ ] Inbox, search, filters
- [ ] Item detail/preview
- [ ] Archive
- [ ] Settings
- [ ] API client with auth
- [ ] Responsive design
- [tag] Component tests, e2e basics

**Gate:** Core flows work on web

## Phase 6: Mobile (React Native + Expo)
**Goal:** Mobile app with share integration
**Status:** Pending

**Tasks:**
- [ ] Auth flows
- [ ] Inbox, search, filters
- [ ] Item detail
- [ ] Archive, Settings
- [ ] API integration
- [ ] Native share handling (using POC solution)
- [ ] Save confirmation UI
- [ ] Device testing

**Gate:** Share works on Android, path clear/proven on iOS

## Phase 7: Integration & Sync
**Goal:** Cross-device testing
**Status:** Pending

**Tasks:**
- [ ] Test share from Android → retrieve on web
- [ ] Test share from iOS → retrieve on web
- [ ] Duplicate handling verification
- [ ] Network failure scenarios
- [ ] Error handling improvements

**Gate:** All core e2e scenarios pass

## Phase 8: Security & Quality
**Goal:** Security hardening and testing
**Status:** Pending

**Tasks:**
- [ ] Authorization tests (cross-user access)
- [ ] SSRF protection tests
- [ ] Account deletion verification
- [ ] Regression testing
- [ ] Performance checks
- [ ] Privacy policy & terms finalized

**Gate:** Security checklist complete

## Phase 9: Release Preparation
**Goal:** Deploy to production
**Status:** Pending

**Tasks:**
- [ ] API deployment
- [ ] Web deployment
- [ ] Android build (APK/AAB)
- [ ] iOS build & distribution (if possible)
- [ ] TestFlight setup (if Apple account available)
- [ ] Deployment docs
- [ ] Recovery/runbook

**Gate:** Production ready or documented blockers

## Critical Path
**Share Integration (Phase 1)** is the critical path. Everything else depends on knowing the viable approach for iOS share extensions. Do not proceed to full implementation until Phase 1 gate is passed.