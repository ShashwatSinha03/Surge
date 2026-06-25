# Surge Engineering Scorecard — Sprint 5

## Scores

| Category | Score (1-10) | Assessment |
|----------|:------------:|------------|
| **Architecture** | 8 | Clean layered architecture with clear separation of concerns. Event-driven with strong transactional guarantees. Some inconsistencies in service adoption. |
| **Backend** | 7 | Domain services pattern is strong. Route handlers mostly thin. Action PATCH and Quest creation now fixed to use the event system. Duplicate user queries remain. |
| **Database** | 7 | Well-structured schema with proper FK, enums, RLS. Two missing indexes added. SELECT * everywhere. No migration automation for schema changes. |
| **Frontend** | 6 | Functional but has large client components, unused imports, stale placeholders, missing error boundaries. No loading states on activity page. |
| **Performance** | 6 | Duplicate queries in most route handlers. N+1 in milestone page (minor). Pool limit of 2 is tight. Missing composite index for activity filtering — now added. |
| **Security** | 8 | Strong RBAC with 404-on-403 pattern. Invite token hashing is correct. RLS on all tables. No client-side event insertion. Actor snapshots in events. |
| **Maintainability** | 7 | Folder structure is clean. Registry pattern eliminates switch statements. Some large components need splitting. Dead code removed. |
| **Scalability** | 5 | No message broker (events polled from Postgres). Pool connection limit will bottleneck under load. No read replicas. Adequate for current scale (<100 users). |
| **Documentation** | 8 | Architecture.md covers decisions, tradeoffs, and sprint history. Sprint 5 audit findings documented. Missing: runbook, deployment guide, environment setup. |

**Overall Score: 6.9 / 10**

---

## Critical Issues (Must Fix Before Production)

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| C1 | No rate limiting on any endpoint | Critical | Open |
| C2 | No request logging / observability | Critical | Open |
| C3 | Pool connection limit of 2 in serverless | High | Open |
| C4 | `MEMBER_JOINED` event stored without quest_id | High | Open |
| C5 | Action update PATCH not emitting events | Critical | ✅ Fixed |
| C6 | Quest creation not emitting events | Critical | ✅ Fixed |
| C7 | Broken event_key preventing 2nd+ entity creation | Critical | ✅ Fixed |
| C8 | No error boundary or loading state for activity page | Medium | Open |

## Recommended Improvements

| # | Improvement | Effort | Impact |
|---|-------------|--------|--------|
| R1 | Eliminate duplicate user queries by caching clerk_user_id → UUID mapping in the request scope (e.g., AsyncLocalStorage) | Medium | High |
| R2 | Add Zod validation for activity API query params (cursor, type) | Low | Medium |
| R3 | Add loading.tsx and error.tsx for activity page | Low | Medium |
| R4 | Increase pg pool max from 2 to 10 | Low | High |
| R5 | Split journey-board.tsx into smaller components (MilestoneSection, ActionRow, ActionForm) | Medium | Low |
| R6 | Add VIEW or function for milestone status calculation instead of client-side logic | Medium | Low |
| R7 | Standardize API error response shape across all endpoints | Medium | Medium |

## Optional Improvements

| # | Improvement | Effort |
|---|-------------|--------|
| O1 | Backfill missing quest_id on MEMBER_JOINED events | Low |
| O2 | Add CHECK constraint on events.event_type | Low |
| O3 | Add CHECK (position > 0) on milestones.position | Low |
| O4 | Switch to kebab-case URL patterns consistently | Low |
| O5 | Add composite index on (quest_id, created_at DESC) for sidebar recent quests | Low |

---

## Changes Made This Sprint

### Fixed
- **4 broken event_key patterns** — createAction, createMilestone, createInvite, acceptInvite no longer use keys that prevent 2nd+ creation
- **Action PATCH now emits ACTION_UPDATED** — migrated from direct Supabase update to `executeDomainMutation()`
- **Quest creation now emits QUEST_CREATED** — migrated from manual two-step insert to transactional `createQuestService`
- **Stale overview page** — placeholder updated from "Milestones arrive in Sprint 3"
- **Dead code removed** — `handle-transition.ts`, unused eventRepository methods, unused import in activityService
- **No-op filter assignment** — fixed in activityService.ts

### Added
- `idx_events_quest_type_time` on `events (quest_id, event_type, created_at DESC)` — supports cursor-paginated activity with type filtering
- `idx_actions_milestone_status` on `actions (milestone_id, status)` — speeds up milestone status calculation queries
- Sprint 5 hardening section in Architecture.md — performance, security, transaction, and repository documentation

### Left for Future Sprints
- Rate limiting (Sprint 6 / pre-launch)
- Request logging / observability
- Pool connection limit tuning
- Backfill MEMBER_JOINED quest_id
- Component splitting (journey-board.tsx, team-content.tsx)
- API error standardization
