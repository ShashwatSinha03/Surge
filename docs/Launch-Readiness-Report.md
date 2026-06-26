# Surge — Launch Readiness Report

**Date:** June 26, 2026
**Auditor:** Principal QA Engineer
**Scope:** Full Production Acceptance Test — 14 workflows, 95+ files audited

---

## Executive Summary

Surge is architecturally sound with a clean separation of concerns (read/write split, server/client boundary, event-driven mutations). The codebase demonstrates strong patterns: provider-based extensibility, deterministic scoring, typed discriminated unions, and consistent error shapes.

**However, 4 critical bugs and 14 high-severity issues exist that must be resolved before production launch.** The most severe are: a state machine bug that entirely breaks unclaim functionality, a trend calculation bug that disables 75% of the Momentum Engine's trend analysis, a realtime channel lifecycle bug that causes premature connection loss, and a null-safety vulnerability across every mutation route.

**Launch Readiness Score: 6.2/10 — Not Ready**

---

## Overall Scores

| Category | Score | Assessment |
|----------|-------|------------|
| Architecture | 8.5/10 | Clean separation, strong patterns. Minor inconsistencies. |
| Backend | 6.5/10 | Transaction-safe but vulnerable to null crashes and silent DB failures. |
| Frontend | 7.0/10 | Good loading/empty states. Missing error boundaries and accessibility. |
| Realtime | 4.5/10 | Functional but has critical lifecycle bugs and memory leaks. |
| Security | 7.5/10 | Strong token generation. Some info leakage via error messages. |
| UX | 7.0/10 | Keyboard-first, clean typography. Loading states good, accessibility weak. |
| Performance | 6.5/10 | 10× redundant DB queries in momentum. No caching. Potential zombie channels. |
| Maintainability | 8.0/10 | Provider pattern, DSL, typed results. Some fragile string matching. |
| **Production Readiness** | **6.2/10** | **Not ready — critical bugs and hardening needed.** |

---

## CRITICAL Issues (Must Fix Before Launch)

### C1. State Machine Missing `claimed → open` Transition
**Severity: CRITICAL**
**File:** `src/lib/execution/state-machine.ts:5`
**Status: ❌ Failed**

The state machine defines `VALID_TRANSITIONS` as:
```typescript
claimed: ['completed', 'blocked'],
```
But the entire unclaim flow (`unclaimActionService`, `POST /api/actions/[id]/unclaim`) transitions actions from `claimed` to `open`. Since `canTransition('claimed', 'open')` returns `false`, every unclaim request returns 422.

**Fix:** Add `'open'` to `VALID_TRANSITIONS['claimed']`.

---

### C2. Momentum Engine: 3 of 4 Pillar Trends are Permanently Flat
**Severity: CRITICAL**
**File:** `src/features/momentum/pillars.ts:93,128,167`
**Status: ❌ Failed**

`evaluateOwnership`, `evaluateStability`, and `evaluateEngagement` all call `computeTrend(score, score)` — computing the trend of the current score against itself. This always produces `{ delta: 0, direction: 'stable' }`. The `prevSignals` parameter is only passed to `evaluateVelocity` at line 174.

**Impact:** Overall momentum trend only reflects velocity changes. Ownership, stability, and engagement trends show "stable" permanently. All downstream consumers (Mission Summary, Attention Required, Execution Highlights) receive partial trend data.

**Fix:** Pass `prevSignals` to all 4 pillar evaluators and compute trends against actual previous data.

---

### C3. Realtime Channel Lifecycle: No Reference Counting — Premature Destruction
**Severity: CRITICAL**
**File:** `src/features/realtime/realtimeManager.ts:17-22,55-62`
**Status: ❌ Failed**

`subscribeToQuest()` returns early with the existing channel if one exists — but never increments a reference count. When the first subscriber unmounts and calls its cleanup, it destroys the channel and removes the map entry. The second subscriber is now silently disconnected with no notification.

**Impact:** In quests with multiple realtime consumers (journey board + activity feed), the first consumer to unmount destroys the channel for both. The second consumer continues operating as if connected but receives no realtime updates.

**Fix:** Implement reference counting. Only destroy the channel when all subscribers have unsubscribed.

---

### C4. `user!.id` Null-Safety Crisis Across 10+ Mutation Routes
**Severity: CRITICAL**
**Files:** 10+ route files (actions/*, invites/*, milestones/*, members/*)
**Status: ❌ Failed**

Every mutation route that looks up the local `users` table uses a non-null assertion (`user!`) when passing the user ID downstream. If a Clerk-authenticated user has no corresponding local DB row (webhook race condition, user deletion, migration gap), the route throws:
```
TypeError: Cannot read properties of null (reading 'id')
```
This produces an unhandled 500 with no structured error response.

**Impact:** Complete denial of service for affected users. No error message, no retry guidance, no graceful degradation.

**Fix:** Add null checks after every `supabase.from('users').select('id').eq('clerk_user_id', clerkUserId).single()` call. Return a descriptive error (404 or 401) rather than crashing.

---

## HIGH Issues (Fix Before Launch)

### H1. `canRemoveMember` Bug — Uses Wrong Permission Function
**Severity: HIGH**
**File:** `src/app/api/quests/[questId]/members/[memberId]/route.ts:77`
**Status: ❌ Failed**

Line 77 checks `canChangeRoles(membership.role)` instead of `canRemoveMember(membership.role)`. `canChangeRoles` only allows `owner`, while `canRemoveMember` correctly allows both `owner` and `admin`.

**Impact:** Quest admins cannot remove members, despite the permission function existing for that purpose.

**Fix:** Change `canChangeRoles` to `canRemoveMember` on line 77.

---

### H2. Realtime Presence: `leave()` Never Called on Navigation
**Severity: HIGH**
**File:** `src/components/realtime/PresenceAvatars.tsx:12-15`, `src/features/realtime/presence.ts:67-79`
**Status: ❌ Failed**

`PresenceAvatars` subscribes to presence updates on mount but never calls `presenceManager.leave()`. When the user navigates away from a quest, the Supabase presence channel and heartbeat interval remain active indefinitely.

**Impact:** Users appear as "present" on quests they've left until the 30-second heartbeat timeout. Multiple ghost presences accumulate as users navigate between quests.

**Fix:** Call `presenceManager.leave()` in the component's cleanup function.

---

### H3. Zombie Channels: `destroyChannel` Called on Wrong Supabase Client
**Severity: HIGH**
**File:** `src/features/realtime/subscriptions.ts:43-48`, `realtimeManager.ts:59`
**Status: ❌ Failed**

`destroyChannel` always uses the default cached Supabase client (`createClient()`), but channels may have been created on a separate client instance (with `accessToken` at line 26). Calling `supabase.removeChannel(channel)` on the wrong client silently fails — the channel remains active on the server.

**Impact:** Zombie channels accumulate over time. Each zombie consumes a Supabase Realtime connection slot.

**Fix:** Track which Supabase client instance owns each channel and destroy it on the correct instance.

---

### H4. Momentum Repository Silently Swallows All DB Errors
**Severity: HIGH**
**File:** `src/features/momentum/repository.ts:6-106`
**Status: ❌ Failed**

Every repository method ignores the Supabase `{ error }` response. If a query fails (network error, permission denied, timeout), `data` is null and the `?? []` fallback silently returns empty arrays.

**Impact:** A DB failure produces plausible-but-incorrect momentum results — 0 actions means "stalled, no blockers, no owners." The API route's try/catch never catches these failures because no error is thrown. Users and Mission Control see misleading scores.

**Fix:** Check `error` after every Supabase query. Throw or return a typed error for all failure cases.

---

### H5. Ownership Pillar Score Capped at 80/100
**Severity: HIGH**
**File:** `src/features/momentum/pillars.ts:66`
**Status: ⚠ Partial**

The ownership formula maxes out at 80/100 (`claimScore * 0.6 + distScore - concPenalty - orphanPenalty` where max distScore is 20 and max claimScore is 100). Under ideal conditions, the score is `60 + 20 - 0 - 0 = 80`.

**Impact:** Ownership scores are compressed into the 0-80 range while other pillars use 0-100. Users see ownership consistently lower than other pillars even under perfect conditions. The weighted momentum calculation is skewed.

**Fix:** Adjust the formula to reach 100, or document the ceiling as intentional and adjust the weight accordingly.

---

### H6. Blocked Action `milestoneTitle` Never Populated
**Severity: HIGH**
**File:** `src/features/momentum/recommendations.ts:16`, `signals.ts:126-131`
**Status: ❌ Failed**

`BlockedSignal.items` use `ActionRef` which has `milestoneTitle` as an optional field, but `extractStabilitySignals` never populates it. All blocked action recommendations use the fallback path without milestone context.

**Impact:** Recommendation descriptions say "X is blocked in undefined" instead of "X is blocked in [milestone name]."

**Fix:** Join milestone titles during signal extraction.

---

### H7. Realtime: No Automatic Recovery After Disconnect
**Severity: HIGH**
**File:** `src/features/realtime/realtimeManager.ts:72-95`
**Status: ❌ Failed**

When a Supabase `CHANNEL_ERROR` or `TIMED_OUT` status fires, the connection state is set to `reconnecting` but nothing triggers a re-subscription. `replayMissedEvents` exists but is never called — not on reconnect, not on mount.

**Impact:** After a network interruption, the user sees "Reconnecting..." indefinitely. Events that occurred during the downtime are permanently lost. The cursor mechanism (`lastCursors`) is maintained but never used.

**Fix:** Wire `replayMissedEvents` into the channel lifecycle. Trigger re-subscription on status recovery.

---

### H8. Services Have Zero Input Validation (15/15 services)
**Severity: HIGH**
**File:** All 15 service files in `src/features/*/services/`
**Status: ❌ Failed**

No service performs any input validation. No Zod schemas, no type guards, no manual checks. `updateRole.ts:20` casts `newRole` as `any`, bypassing TypeScript entirely.

**Impact:** Empty titles, invalid UUIDs, malformed emails, and invalid role values can reach the database. DB constraints catch some of these (FKs, NOT NULL), but the error messages are cryptic.

**Fix:** Add Zod input schemas to every service. Validate at the service boundary, not just the API route boundary.

---

### H9. Realtime: Optimistic Snapshot Overwritten by Concurrent Mutations
**Severity: HIGH**
**File:** `src/hooks/useMilestoneMutations.ts:46-54`
**Status: ❌ Failed**

The `snapshot` function stores state under the single key `'current'`. If two mutations execute in quick succession (e.g., createMilestone + claimAction), the second call overwrites the first's saved state.

**Impact:** If the first mutation then fails, `rollbackToSnapshot` restores the second mutation's snapshot. This produces stale/incorrect state — the rolled-back state represents a point in time after the first mutation was applied, so the first mutation's effects are incompletely reverted.

**Fix:** Use per-mutation keys or a stack for snapshots.

---

### H10. Event Type Mismatch: Revoke Uses `MEMBER_INVITED`
**Severity: HIGH**
**File:** `src/features/invites/services/revokeInvite.ts:24`, `src/lib/events/types.ts`
**Status: ❌ Failed**

`revokeInviteService` emits `eventType: 'MEMBER_INVITED'` for a revoke operation. This is semantically incorrect — `MEMBER_INVITED` implies creation. There is no `INVITE_REVOKED` event type.

**Impact:** The event log falsely records a member invitation when an invite was revoked. Activity timelines show misleading entries. The event system is not a trustworthy audit trail for invites.

**Fix:** Add `INVITE_REVOKED` to `types.ts` and use it in `revokeInvite.ts`.

---

### H11. Missing Global Error Boundary
**Severity: HIGH**
**File:** `src/app/(protected)/layout.tsx` and all page components
**Status: ❌ Failed**

There is no `error.tsx` in any route segment. Any unhandled error in a server or client component produces either the Next.js development error overlay (dev) or a blank white page (production) with no user-facing message.

**Impact:** Any DB failure, network timeout, or rendering error results in a blank screen. Users have no indication of what went wrong or how to recover.

**Fix:** Add `error.tsx` at `(protected)/`, `quests/`, and `quests/[questId]/` route segments.

---

### H12. TOCTOU Race Conditions Across All Mutation Routes
**Severity: HIGH**
**Files:** All mutation routes (actions/*, milestones/*, members/*, invites/*)
**Status: ⚠ Partial**

Every mutation route follows this pattern:
1. Fetch entity (outside transaction)
2. Check state/permissions
3. Execute mutation (inside transaction)

The initial fetch is outside the transaction. A concurrent request could delete or modify the entity between steps 1 and 3.

**Impact:** Race conditions on state-machine operations. Two concurrent users could both claim the same action (first gets it, second finds it still unclaimed from their stale fetch, and claims it again — but the service call would succeed or fail based on the actual DB state at commit time).

**Fix:** Move the initial SELECT inside the transaction with `SELECT ... FOR UPDATE` to acquire a row-level lock.

---

### H13. Member Search API Fails Without Proper Error Handling
**Severity: HIGH**
**File:** `src/features/search/providers/memberSearch.ts:17-28`
**Status: ❌ Failed**

The `.users!inner` join in the Supabase query will fail if any quest member row has a `user_id` that references a deleted user record (orphaned FK). The `as any` cast at line 25 then silently produces `undefined` access errors.

**Impact:** Searching team members triggers a 500 error, breaking the entire search API for quest contexts. The member search provider has no error isolation — if one provider fails, the entire search fails.

**Fix:** Use `LEFT JOIN` instead of `!inner`, add error isolation in the search API route so one failing provider doesn't crash the entire search.

---

### H14. Fragile Error-String Matching Across API Routes
**Severity: HIGH**
**Files:** `invites/route.ts:41`, `invites/accept/route.ts:36-39`, `milestones/[id]/route.ts:129-131`
**Status: ❌ Failed**

Three routes parse error messages by substring matching:
- `result.error.includes('already exists')` → 409
- `result.error.includes('already')` → 410
- `result.error.includes('action(s)')` with regex extraction of count

If the service layer changes an error message, these branches silently change behavior — a 409 becomes a 500, or `actions_remaining` becomes `0`.

**Impact:** Brittle error handling that breaks silently. No TypeScript or test catches message changes.

**Fix:** Return typed error codes from the service layer (e.g., `{ code: 'DUPLICATE_INVITE', message: '...' }`). Switch on codes, not message content.

---

## MEDIUM Issues (Fix Before or Shortly After Launch)

### M1. No `loading.tsx` for Team, Activity, or Milestones Pages
**Files:** All use parent `[questId]/loading.tsx` which is generic
**Severity: Medium**

### M2. Mission Control Uses Array Indices as React Keys
**Files:** `mission-control-client.tsx:96,140`
**Severity: Medium**

### M3. Palette `role="listbox"` Items Missing `role="option"`
**File:** `command-palette.tsx:351`
**Severity: Medium**

### M4. Realtime Event Can Clear `_tempId` Before API Response → Duplicate Entity
**Files:** `reconciliation.ts:100`, `useMilestoneMutations.ts:199`
**Severity: Medium**

### M5. OptimisticQueue Entries Never Pruned (Memory Leak)
**File:** `optimisticQueue.ts:35-58`
**Severity: Medium**

### M6. Empty Sets Accumulate in RealtimeBus Subscriber Map
**File:** `realtimeBus.ts:14-16`
**Severity: Medium**

### M7. No UUID Validation on Any Path Parameter
**Files:** All 19 route files
**Severity: Medium**

### M8. Activity Route NaN Limit Bug
**File:** `activity/route.ts:24`
**Severity: Medium**

### M9. Webhook: `user.deleted` Not Handled
**File:** `webhooks/clerk/route.ts:55`
**Severity: Medium**

### M10. Missing Event Types for DB State Enum Values
**File:** `src/lib/events/types.ts`
**Severity: Medium**

### M11. Momentum: 10 DB Queries Instead of 4 (Redundant Fetching)
**File:** `signals.ts`
**Severity: Medium**

### M12. Momentum: Inactivity Threshold Inconsistency (7 vs ≤7)
**Files:** `behavior.ts:98,111`, `recommendations.ts:88`
**Severity: Medium**

### M13. No `generateRecommendations` Test Coverage
**File:** `test-momentum.ts`
**Severity: Medium**

### M14. AccessToken Mismatch in Channel Creation
**File:** `subscriptions.ts:32-38`
**Severity: Medium**

### M15. `acceptInvite.ts` Hybrid DB Access (Supabase + pg)
**File:** `acceptInvite.ts:13-18,34-59`
**Severity: Medium** — TOCTOU race between the initial invite lookup (Supabase, outside transaction) and the mutation (pg, inside transaction).

---

## LOW Issues (Post-Launch)

### L1. Missing `aria-hidden` on Skeleton, `aria-label` on buttons, `role="status"` on status indicators (accessibility pass)
### L2. GDPR: Actor PII (name, avatar) embedded immutably in event metadata
### L3. Ownership transfer impossible (`isValidRoleTransition` prohibits any `owner` role change)
### L4. Missing indexes on `milestones.created_by`, `actions.created_by`, `invites.invited_by`
### L5. No CHECK constraint on `events.event_type` or `events.entity_type`
### L6. Missing `milestones.position > 0` CHECK constraint
### L7. `clearDeduplicator()` never called on disconnect/reconnect cycle
### L8. Info leakage via 403 messages (members route reveals target is owner)
### L9. Dynamic import anomaly in `members/[memberId]` DELETE handler
### L10. `invites` partial unique index doesn't filter expired invites

---

## Workflow-by-Workflow Audit Results

### W1: New User Onboarding — ⚠ Partial
- ✅ Clerk auth flow
- ✅ Protected route redirects
- ✅ Webhook creates user record (with `user.deleted` gap)
- ✅ Sidebar renders correctly for new users
- ✅ Empty states work (quest list, no quests)
- ✅ Loading skeletons present
- ❌ `user!.id` crash risk if webhook hasn't fired (C4)
- ❌ No error boundary if any query fails
- ⚠ Theme persistence works but initial render flickers

### W2: Quest Management — ⚠ Partial
- ✅ Create quest (POST)
- ✅ List quests (GET)
- ❌ No QUEST_PAUSED, QUEST_COMPLETED, QUEST_DELETED, QUEST_ACTIVATED events
- ❌ No permission functions for edit/archive/delete quest
- ❌ Archiving quest emits QUEST_UPDATED, not QUEST_ARCHIVED (missing audit trail)
- ❌ TOCTOU race on all quest operations
- ❌ No pagination for quest list

### W3: Team Collaboration — ❌ Failed
- ✅ Invite generation and token security (cryptographically sound)
- ✅ Invite acceptance flow
- ✅ Expired/revoked invite handling
- ❌ `canRemoveMember` bug — admins cannot remove members (H1)
- ❌ `INVITE_REVOKED` event missing — revoke emits `MEMBER_INVITED` (H10)
- ❌ Realtime presence: ghost presences on navigation (H2)
- ❌ `as any` cast in member mapping
- ❌ Ownership transfer impossible (L3)

### W4: Execution Flow — ❌ Failed
- ✅ Create milestone and action
- ✅ Claim, block, complete actions
- ⚠ Delete milestone with conflict handling
- ❌ **Unclaim is entirely broken** — state machine forbids `claimed → open` (C1)
- ❌ Milestone status not recalculated on claim (only on unclaim/complete)
- ❌ TOCTOU races on all mutation endpoints (H12)
- ❌ Zero input validation across all services (H8)
- ❌ No `_syncing` check in milestone recalculation during realtime reconciliation (M4)

### W5: Mission Control — ❌ Failed
- ✅ UI renders and is responsive
- ✅ Four pillars display
- ✅ Mission summary with status dot
- ❌ 3 of 4 pillar trends permanently flat (C2)
- ❌ Ownership capped at 80/100 (H5)
- ❌ Blocked action `milestoneTitle` never populated (H6)
- ❌ DB errors silently produce wrong scores (H4)
- ❌ 10× redundant queries (M11)
- ❌ No NaN guard in calculator

### W6: Command Experience — ⚠ Partial
- ✅ ⌘K opens palette
- ✅ Arrow navigation, Enter executes, Escape closes
- ✅ Three sections: Recent, Commands, Results
- ✅ Focus trap works
- ❌ Palette items lack `role="option"` — screen reader broken (M3)
- ❌ No scroll-into-view on arrow navigation
- ❌ `requestAnimationFrame` focus is fragile
- ⚠ Client-side search works, server search has no error isolation

### W7: Realtime — ❌ Failed
- ✅ Event deduplication functional
- ✅ Presence subscription works initially
- ❌ **Channel lifecycle broken** — premature destruction (C3)
- ❌ No automatic recovery after disconnect (H7)
- ❌ Zombie channels from wrong client instance (H3)
- ❌ Optimistic snapshot overwrites on concurrent mutations (H9)
- ❌ OptimisticQueue memory leak (M5)
- ❌ Empty Sets memory leak in RealtimeBus (M6)
- ❌ Self-event filter not centralized
- ❌ No replayed events after reconnect

### W8: Activity System — ⚠ Partial
- ✅ Every mutation emits exactly one event
- ✅ Activity projection works correctly
- ✅ Event grouping by actor and time window
- ✅ Cursor pagination
- ❌ Side effects invisible in event log (milestone status changes)
- ❌ Empty entity IDs on create events
- ❌ `parseInt(NaN)` bug in limit parameter (M8)
- ⚠ Type filter casts directly without validation

### W9: Navigation — ⚠ Partial
- ✅ Sidebar renders recent quests
- ✅ Tab navigation works for all quest sections
- ✅ Command palette provides keyboard navigation
- ✅ Loading skeletons for quest list and detail
- ❌ Missing `aria-label` on sidebar nav
- ❌ Missing `aria-current="page"` on active link
- ❌ No 404 page for non-existent quests (uses `notFound()` which is correct)
- ❌ No error boundary

### W10: Error Handling — ❌ Failed
- ✅ Consistent error shape (400: `{ errors }`, others: `{ error }`)
- ✅ Info hiding via 404 on unauthorized access
- ❌ **`user!.id` crashes on 10+ routes** (C4)
- ❌ No error boundary anywhere (H11)
- ❌ Fragile error-string matching (H14)
- ❌ No retry mechanism for failed mutations
- ❌ Activity route has no error handling
- ⚠ Search route silently swallows errors

### W11: Multi-Tenant Security — ⚠ Partial
- ✅ RLS policies on all tables
- ✅ Quest membership checks on all routes
- ✅ 404 returns for unauthorized access (info hiding)
- ⚠ Some routes leak info via 403 messages (L8)
- ❌ Realtime channels aren't verified for quest membership — Supabase Realtime's `postgres_changes` does NOT filter by row-level security by default. A malicious subscriber to the events channel could receive events from quests they don't belong to.

### W12: Responsive & UI Audit — ⚠ Partial
- ✅ Consistent typography and spacing
- ✅ Clean dark/light theme
- ✅ Empty states for all data lists
- ✅ Hover states on all interactive elements
- ❌ Missing ARIA labels on many interactive elements
- ❌ Journey board action buttons invisible to keyboard users (hover-only)
- ❌ Unreadable on small screens (sidebar fixed-width 256px)

### W13: Performance — ❌ Failed
- ✅ Build compiles in ~2.5s
- ✅ No bundle warnings
- ❌ Momentum engine: 10× redundant DB queries (M11)
- ❌ No caching headers on momentum API
- ❌ No pagination on quest list, member list
- ❌ All-events query for milestone staleness is unbounded
- ❌ No request memoization for momentum queries
- ⚠ Realtime deduplication uses O(n) FIFO eviction

### W14: Codebase Health — ✅ Good
- ✅ Clean folder structure
- ✅ Provider-based extensibility
- ✅ No inconsistent naming
- ✅ TypeScript strict mode
- ✅ Small, focused components (most < 200 lines)
- ⚠ `claimAction.ts` and `updateMilestone.ts` have dead imports
- ⚠ `eventRepository.ts` is the only repository that doesn't accept `QueryExecutor` (inconsistent)
- ✅ No duplicate utilities found

---

## "If Surge were released publicly today, what are the remaining blockers?"

**Release is blocked by these 4 critical issues:**

1. **Unclaim is broken** (C1) — State machine forbids `claimed → open`. Any claimed action can never be unclaimed. This is a core workflow that every team will encounter within minutes of use.

2. **Momentum trends are wrong** (C2) — The Mission Control UI shows permanently "stable" trends for ownership, stability, and engagement. The entire trend analysis system appears functional but produces no useful data. Users will correctly distrust the momentum system.

3. **Realtime disconnects are permanent** (C3, H7) — The first subscriber to unmount kills the channel for everyone. After a network blip, reconnection never completes. Multiple realtime-dependent features (journey board, presence, activity feed) silently break.

4. **Auth-missing users get 500 errors** (C4) — Any user whose Clerk session exists but local DB row is missing (webhook race, migration, sync issue) cannot use the application. Every mutation returns an unhandled crash. No error message, no recovery path.

**Secondary blockers (should fix before launch):**

5. **Admins cannot remove members** (H1) — The role-check function is wrong. This is a single-character fix with zero regression risk.

6. **No error boundary** (H11) — Any unhandled error anywhere produces a blank page in production. This is unacceptable for launch.

7. **Multi-tenant realtime isolation** — Supabase Realtime channels are not RLS-filtered by default. Events from quest X could leak to a user who only belongs to quest Y. **This needs verification and mitigation before launch.**

---

## Recommended Stabilization Sprint Scope

### Sprint Zero (Pre-Launch): 5 Days

**Day 1 — Critical fixes (4 items):**
1. Fix state machine: add `'open'` to `claimed` transitions (`state-machine.ts:5`)
2. Fix trend calculation: pass `prevSignals` to all 4 pillar evaluators (`pillars.ts:93,128,167`)
3. Fix realtime reference counting: implement ref-counted channel lifecycle (`realtimeManager.ts:17-62`)
4. Fix null safety: add null checks after all `users` table lookups (all route files)

**Day 2 — High-priority fixes (8 items):**
1. Fix `canRemoveMember` permission check (`members/[memberId]/route.ts:77`)
2. Add `INVITE_REVOKED` event type + fix `revokeInvite.ts`
3. Add missing loading.tsx files (team, activity, milestones)
4. Fix momentum repository error handling (`repository.ts`)
5. Fix realtime presence cleanup (`PresenceAvatars.tsx`)
6. Fix zombie channel destruction (`subscriptions.ts`)
7. Add error boundary (`error.tsx` at all route segment levels)
8. Wire `replayMissedEvents` after reconnect (`realtimeManager.ts`)

**Day 3 — User-facing issues (6 items):**
1. Fix ownership pillar scoring ceiling (pillars.ts:66)
2. Populate `milestoneTitle` in blocked action signals
3. Fix Mission Control React keys (use stable IDs, not array indices)
4. Fix palette ARIA (add `role="option"` and `aria-selected`)
5. Add UUID validation across all route handlers
6. Fix activity route NaN limit handling

**Day 4 — Hardening (7 items):**
1. Add Zod input validation to all 15 services
2. Fix optimistic snapshot overwriting (per-mutation keys)
3. Prune OptimisticQueue confirmed entries
4. Clean up RealtimeBus empty Sets
5. Fix momentum redundant queries (cache per request)
6. Add `error.tsx` at all segment levels
7. Verify multi-tenant Realtime isolation

**Day 5 — Verification + Release:**
1. End-to-end workflow testing (all 14 workflows)
2. Load test momentum endpoint
3. Browser-based multi-tab realtime testing
4. Security scan for info leakage
5. Generate and verify all loading/empty/error states
6. Production build + smoke test

---

*Report generated by Principal QA Engineer. Findings based on static code analysis of 95+ source files across all layers (API routes, services, repositories, components, hooks, providers, migrations, configuration). No dynamic/runtime testing performed.*
