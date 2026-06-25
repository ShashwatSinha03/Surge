# Surge Architecture

## Why Events Exist

Every business mutation in Surge emits exactly one immutable domain event. Events form an append-only log of every state change. This enables:

- **Auditability**: Every action, milestone claim, invite, and role change is recorded with actor identity and timestamp.
- **Activity Intelligence (Sprint 5)**: Events are projected into a human-readable timeline with grouping, filtering, and cursor pagination.
- **Future features**: Realtime sync (Sprint 6), notifications (Sprint 7), and the health/momentum engine (Sprint 8) all consume the event stream.
- **Debugging**: When state drifts, the event log is the source of truth for reconstruction.

## Why Transactions Use `pg` (Direct PostgreSQL)

The Supabase JS client (`@supabase/supabase-js`) operates over HTTP via PostgREST. It does not support multi-statement transactions (`BEGIN`/`COMMIT`/`ROLLBACK`).

Because transactional consistency between business state and event history is non-negotiable, we use a direct `pg` connection (`node-postgres`) for all write operations. The connection pool uses Supabase's **session pooler** (port 6543), which provides dedicated sessions capable of transactional control.

## Why Reads Use Supabase JS Client

Reads do not require transactional guarantees. The Supabase JS client provides:

- **Type-safe queries** via the PostgREST API
- **Built-in connection management** through Supabase's infrastructure
- **Simplicity** — no connection pool management needed for reads

The architecture separates concerns: `pg` for transactional writes, Supabase client for everything else.

## Domain Service Philosophy

Every domain mutation follows the same contract:

```
Route Handler (thin orchestration)
  → Zod Validation (input safety)
  → Authorization Check (membership + role)
  → Domain Service (business logic)
    → executeDomainMutation (transaction + event)
      → Repository (raw persistence)
      → → Database
```

### `executeDomainMutation()` — The Single Entry Point

All mutations go through `executeDomainMutation()`, which:

1. Opens a database transaction
2. Executes the domain mutation (via repository)
3. Looks up the actor's name and avatar_url from the users table
4. Creates a minimal entity snapshot for the event metadata
5. Includes the actor snapshot (name, avatar_url) in the event metadata
6. Inserts exactly one event row
7. Commits the transaction
8. Rolls back everything if any step fails

This guarantees that business state and event history never diverge, and that every event carries immutable actor identity for historical rendering.

### Idempotency via `event_key`

Events carry an optional `event_key` (unique constraint). Keys follow the pattern `{EVENT_TYPE}:{entityId}`. If the same mutation is retried (e.g., network failure → client retry), `executeDomainMutation()` detects the existing key, skips re-execution, and returns the original event. No duplicate events.

### Domain Result

Services return a typed `DomainResult`:

```typescript
{ success: true, entity: Record<string, unknown>, event: Record<string, unknown> }
// or
{ success: false, error: string }
```

This keeps services framework-independent — they don't import `NextResponse`, `Request`, or any HTTP concept.

## Repository Philosophy

Repositories contain only persistence logic — raw SQL queries via the `QueryExecutor` passed from the active transaction. They contain:

- No business rules
- No authorization checks
- No validation

They receive a `query` function from `executeDomainMutation()` and return raw database rows.

Read-side repositories (like `activityRepository.ts`) use the Supabase JS client and are not transactional.

## Folder Structure

```
features/{domain}/
  schemas.ts            # Zod validation schemas
  repositories/
    {domain}Repository.ts  # Raw SQL persistence
  services/
    {action}.ts           # Domain service → calls executeDomainMutation + repository
```

## Activity Intelligence (Sprint 5)

### Architecture

```
Domain Service
  ↓
Event
  ↓
events table
  ↓
activityRepository (cursor-paginated reads via Supabase)
  ↓
activityService (orchestrates repo + projection)
  ↓
activityProjection (raw events → ActivityEntry)
  ↓
Formatter (per event type in registry)
  ↓
API (GET /api/quests/[questId]/activity)
  ↓
UI (ActivityTimeline client component)
```

The frontend **never** consumes raw events. All projection happens server-side.

### Projection Layer

Located in `src/features/activity/activityProjection.ts`. Converts raw database rows into presentation objects. Each event is:

1. Resolved to a registry entry (maps event_type → icon, importance, category, formatter)
2. Formatted with the actor snapshot from event metadata
3. Grouped with adjacent events (same actor, same time window)

### Activity Registry

Located in `src/features/activity/activityRegistry.ts`. A central Record mapping every `EventType` to:

- `icon` — Lucide icon name
- `importance` — LOW | NORMAL | HIGH | CRITICAL
- `category` — 'actions' | 'milestones' | 'members'
- `format(event, actor)` — returns `{ title, subtitle }`
- `groupKey(event)` — returns a grouping key string

Every event type has exactly one registry entry. No switch statements.

### Formatters

Each event type has its own formatter that returns a human-readable `{ title, subtitle }` pair. Examples:

| Event | Title |
|-------|-------|
| ACTION_CREATED | "{actor} added {title}" |
| ACTION_COMPLETED | "{actor} completed {title}" |
| MILESTONE_COMPLETED | "{actor} completed milestone {title}" |
| MEMBER_REMOVED | "{actor} removed {name}" |

### Importance Levels

| Level | Examples |
|-------|----------|
| LOW | Action Edited, Milestone Updated |
| NORMAL | Action Claimed, Action Created |
| HIGH | Action Completed, Member Removed, Role Changed |
| CRITICAL | Milestone Completed, Milestone Deleted, Member Removed |

### Actor Snapshots

Actor identity is stored immutably inside `event.metadata.actor` at event creation time. The `executeDomainMutation()` function queries `users` table during the transaction and stores `{ name, avatar_url }` in the metadata. This ensures historical rendering never needs to query the users table.

### Grouping

Server-side grouping in `activityProjection.ts`. Rules:

- Same actor name
- Consecutive in event order
- Within 5-minute time window

Groups are returned as `ActivityGroup` objects with child `items` that the UI renders as expandable sections.

### Activity API

`GET /api/quests/[questId]/activity`

**Query Parameters:**
- `limit` — number of items (1–100, default 20)
- `cursor` — ISO timestamp from the last item in the previous page
- `type` — filter: `all` (default), `actions`, `milestones`, `members`

**Response:**
```json
{
  "items": [
    { "type": "item", "id": "...", "title": "...", "actor": { "name": "...", "avatar_url": null }, "icon": "...", "importance": "HIGH", "timestamp": "..." },
    { "type": "group", "id": "...", "title": "...", "count": 3, "items": [...] }
  ],
  "nextCursor": "2025-06-25T02:30:00.000Z",
  "hasMore": true
}
```

**Pagination:** Cursor-based (no OFFSET). `cursor` is the `created_at` timestamp of the last item.

**Security:** Returns 404 for non-members. Only quest members can view activity.

### UI

- **Tab**: Activity tab in quest navigation (between Milestones and Team)
- **Timeline**: Newest-first, minimal spacing, premium typography
- **Filters**: All, Actions, Milestones, Members — rendered as pill buttons
- **Groups**: Expandable sections showing individual events on click
- **Empty State**: "Nothing has happened yet."
- **Load More**: Manual "Load more" button at bottom with cursor pagination

No analytics widgets, no giant cards.

## Tradeoffs of Current Implementation

1. **Direct `pg` dependency**: Adds a second database client alongside Supabase JS. Connection pooling must be carefully managed in serverless environments.
2. **No message broker**: Events are stored in PostgreSQL, not in Kafka/RabbitMQ. This keeps infrastructure simple but means future consumers must poll or read from the events table rather than subscribing to a stream.
3. **Pooler vs direct connection**: Using Supabase's session pooler adds a network hop. Direct DB connection would be faster but the pooler is required for connection management in serverless.
4. **Event key idempotency**: The UNIQUE constraint on `event_key` prevents duplicates but does not prevent the same logical mutation from being applied with different keys. Perfect idempotency would require application-level deduplication.
5. **Snapshot minimalism**: Event metadata stores only a few key fields (`title`, `status`, `name`, `email`, `role`, `template_type`). Full entity hydration requires joining with the main tables.
6. **Group time window**: The 5-minute grouping window is hardcoded. Future sprints may make this configurable per quest.
7. **No realtime**: Activity data is fetched on page load and via "Load more". No WebSocket or polling updates yet (planned for Sprint 6).

## Performance Considerations

### Indexes

After the Sprint 5 hardening audit, two additional indexes were added:

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `idx_events_quest_type_time` | events | `(quest_id, event_type, created_at DESC)` | Cursor-paginated activity with type filtering |
| `idx_actions_milestone_status` | actions | `(milestone_id, status)` | Milestone status calculation queries |

### Known Query Patterns

1. **Duplicate user lookups**: `getCallerMembership()` queries `users` by `clerk_user_id`, then most route handlers query the same again. At small scale this is negligible; at scale these should be batched via a cached resolver or merged into a single JOIN.

2. **SELECT \* in repositories**: All repository methods use `SELECT *`. For wide tables like `events` (includes JSONB metadata), this fetches more data than needed. The activity projection only needs a subset of columns. Premature optimization warning — revisit if query latency exceeds 50ms.

3. **N+1 in milestone page**: The milestones page fetches milestones, then actions, then owner names in 3 sequential queries. The owner name lookup uses `IN (...)` which is efficient. For <100 actions this is fine; for larger datasets, use a single JOIN query.

4. **Pool connection limit**: The `pg` pool is configured with `max: 2` connections. In serverless environments with concurrent requests, this may become a bottleneck. Increase to `max: 5-10` if connection waits are observed.

## Security Considerations

### RLS Policies

All tables have Row Level Security enabled. Policies restrict SELECT to quest members via a subquery pattern:

```sql
quest_id IN (
  SELECT quest_members.quest_id FROM quest_members
  WHERE user_id = (
    SELECT id FROM users
    WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
)
```

The `events` table has no INSERT policy (RLS blocks client inserts by default). Events are only inserted by the backend service role via `executeDomainMutation()`.

### RBAC

| Role | Permissions |
|------|-------------|
| Owner | Full control: manage milestones, manage members, delete actions, change roles, manage invites |
| Admin | Manage milestones, manage invites, remove members (but cannot promote self or change roles) |
| Member | Read-only: view quest, milestones, actions, activity, members |

All unauthorized access returns 404 (not 403) to prevent information leakage about quest existence.

### Invite Token Security

- Tokens are generated via `crypto.randomBytes(32)` (256-bit entropy, base64url encoded)
- Only SHA-256 hash is stored in the database
- Raw token is returned exactly once on creation
- Partial unique index prevents duplicate active invites per email per quest
- Expiration enforced at application level (7-day default)

### Actor Snapshots

Every event carries an immutable `metadata.actor` snapshot (`{ name, avatar_url }`) captured at mutation time. This prevents time-of-read vs time-of-write inconsistencies in historical activity rendering.

## Transaction Guarantees

`executeDomainMutation()` provides:

- **Atomicity**: All mutations execute within `BEGIN`/`COMMIT`/`ROLLBACK`
- **Consistency**: Business state and event history never diverge
- **Isolation**: Each mutation runs in its own transaction (default PostgreSQL READ COMMITTED)
- **Durability**: Committed writes survive (backed by PostgreSQL WAL)

Every successful mutation emits exactly one event. If event insert fails, the transaction rolls back. If the mutation fails, no event is created.

### Idempotency

The `event_key` UNIQUE constraint on the `events` table prevents duplicate events. Keys follow `{EVENT_TYPE}:{entityId}`. If `executeDomainMutation()` detects an existing key, it skips re-execution.

**Important caveat**: Create operations (ACTION_CREATED, MILESTONE_CREATED, MEMBER_JOINED, MEMBER_INVITED) do not use `event_key` because the entity ID is unknown before insert. These operations are intrinsically idempotent — each call creates a new unique entity.

## Repository Philosophy

- **Transactional repositories** (in `features/{domain}/repositories/`) receive a `QueryExecutor` from the active transaction and use raw SQL via `pg`. They contain no business logic, no authorization, no validation.
- **Read repositories** (like `activityRepository.ts`) use the Supabase JS client. They are not transactional.
- **SELECT \*** is used for simplicity. Project to specific columns when query latency becomes a concern.

## Projection Philosophy

The activity system follows a strict pipeline:

```
Raw DB Row → Registry Lookup → Formatter → Projected Item → Grouping → API Response
```

- **No raw events** are ever exposed to the frontend
- **Registry pattern** eliminates switch statements — every event type has exactly one entry
- **Actor snapshots** eliminate JOINs to the users table for historical data
- **Grouping** happens server-side to minimize client work
- **Cursor pagination** uses `created_at` timestamps (no OFFSET)

## Future Scalability Notes

1. **Event volume**: The `events` table is append-only. Indexes on `(quest_id, created_at DESC)` keep activity queries fast. For quests with >100K events, consider partitioning by `quest_id` or archival to cold storage.

2. **Connection pooling**: The `pg` pool (`max: 2`) is tuned for current load. For production with concurrent users, increase to `max: 10-20` and consider Supabase's connection pooler or PgBouncer.

3. **Read/write split**: Reads use Supabase JS client (HTTP/PostgREST), writes use `pg` (direct SQL). This keeps reads simple and writes transactional. If read latency becomes an issue, add read replicas.

4. **No message broker**: Events are consumed by polling the `events` table. For realtime features (Sprint 6+), consider Postgres LISTEN/NOTIFY or Supabase Realtime.

5. **Activity filtering**: Type-based filtering (`type=actions|milestones|members`) currently filters in application code after fetching from DB. At scale, push this to SQL via the `idx_events_quest_type_time` index. The `activityRepository` already supports cursor-based filtering — extend the query with `AND event_type IN (...)` rather than client-side filtering.

## Platform Hardening (Sprint 5)

### Bugs Fixed

| Issue | File | Fix |
|-------|------|-----|
| Broken `event_key` preventing 2nd+ create | `createAction`, `createMilestone`, `createInvite`, `acceptInvite` services | Removed `eventKey` parameter for create operations — entity ID is unknown before insert |
| `ACTION_UPDATED` event never emitted | `src/app/api/actions/[id]/route.ts` | Replaced direct Supabase update with `executeDomainMutation()` |
| `QUEST_CREATED` event never emitted | `src/app/api/quests/route.ts` | Replaced two-step insert (quest + member) with transactional `createQuestService` |
| Stale quest overview placeholder | `quests/[questId]/page.tsx` | Updated "Milestones arrive in Sprint 3" to reflect current state |
| Dead code: `handle-transition.ts` | `src/lib/execution/` | Removed (replaced by domain services in Sprint 4) |
| Dead code: unused eventRepository methods | `src/features/events/repositories/` | Removed `getQuestEvents`, `getEventsByEntity`, `getEventsByActor` |
| Dead code: unused import in activityService | `src/features/activity/activityService.ts` | Removed `filterEventsByCategory` import |
| No-op filter assignment | `src/features/activity/activityService.ts` | Fixed both branches returning same value |

### Indexes Added

- `idx_events_quest_type_time` on `events (quest_id, event_type, created_at DESC)`
- `idx_actions_milestone_status` on `actions (milestone_id, status)`

### Known Issues (Documented, Not Fixed)

1. **Quest creation `event_key`**: The `QUEST_CREATED` event has no `event_key` because the quest ID is unknown before insert. Creating the same quest twice would create two events. Acceptable because quest creation is not a retry-sensitive operation.

2. **`MEMBER_JOINED` event without `quest_id`**: When an invite is accepted, the event's `quest_id` is empty (not known at event definition time). The event is still stored with correct actor snapshot. Quest ID can be backfilled from the invite record.

3. **No rate limiting**: Endpoints have no rate limiting. Add at the middleware level before production launch.

4. **No request logging**: API requests are not logged. Add structured logging (structured logging middleware or observability SDK).

## Realtime Collaboration (Sprint 6)

### Architecture

```
Client Mutation
  ↓
Optimistic Queue
  ↓
Optimistic UI (local state with _syncing flag)
  ↓
API Mutation
  ↓
Domain Service → Transaction → Event → Commit
  ↓
Supabase Realtime (postgres_changes on events table)
  ↓
Realtime Manager (channel lifecycle owner)
  ↓
Realtime Event Bus (single dispatch layer)
  ↓
Hooks (useMilestoneMutations, useRealtimeEvents)
  ↓
React Components (JourneyBoard, ActivityTimeline, etc.)
  ↓
State Reconciliation (server/event data always wins)
```

### Core Principle

The server is always the source of truth. The client may optimistically update the UI, but every optimistic update must be reconciled with the server. Client state is never authoritative.

### Realtime Flow

1. **Client Action** → Optimistic UI update (entity marked `_syncing: true`)
2. **API Mutation** → Server processes → Creates event → Commits transaction
3. **Supabase Realtime** broadcasts the event to all subscribed clients
4. **Realtime Manager** receives the event → passes to **Realtime Bus**
5. **Realtime Bus** dispatches to subscribers (Journey Board, Activity Feed)
6. **Reconciliation** → Events from self are ignored (already reconciled via API response); events from others update state

### Key Components

#### Realtime Manager (`features/realtime/realtimeManager.ts`)

Central owner of all Supabase Realtime channels. Components never interact with Supabase directly.

- Creates channels with namespaced keys (`surge:v1:quest:{questId}:events`)
- Tracks channel lifecycle (create, destroy, reconnect)
- Stores last event cursor for missed event replay
- Reports connection status changes to `ConnectionState`

#### Realtime Event Bus (`features/realtime/realtimeBus.ts`)

Single dispatch layer for all realtime events. Consumers subscribe to the bus with a callback and receive typed `RealtimeEvent` objects. Includes built-in event deduplication via a bounded LRU cache.

#### Connection State (`features/realtime/connection.ts`)

Tracks connection as one of: `connected`, `reconnecting`, `offline`, `syncing`. The Syncing state is active when any optimistic mutation is pending reconciliation. Exposes a subscription API for UI components.

States:
- **Connected** — Realtime channel is active
- **Syncing** — Connected + at least one optimistic mutation pending
- **Reconnecting** — Channel error or timeout, attempting reconnect
- **Offline** — Channel closed, no connection

#### Presence (`features/realtime/presence.ts`)

Lightweight presence using Supabase Realtime Presence. Ephemeral — never persisted to PostgreSQL.

- Heartbeat every 30 seconds
- Presence expires automatically when connection drops
- Payload: `{ userId, name, avatar, currentView, currentEntity, lastHeartbeat }`
- Displayed as avatar circles with hover tooltips (name + current view)

#### Optimistic Queue (`features/realtime/optimisticQueue.ts`)

Tracks every optimistic mutation through its lifecycle:

1. **Pending** — mutation submitted, waiting for server
2. **Confirmed** — server responded successfully, waiting for realtime
3. **Failed** — server rejected, rollback triggered

The queue is prepared for future offline support but only manages pending→confirmed→removed lifecycle in this sprint.

#### Event Deduplicator (`features/realtime/eventDeduplicator.ts`)

Bounded LRU cache (default: 500 entries) preventing duplicate processing of the same realtime event delivery.

#### Reconciliation (`features/realtime/reconciliation.ts`)

Pure functions that apply events to milestone/action state:

- Sorts events by `created_at` then `id` (never trust network arrival order)
- Handles all action event types (CREATE, UPDATE, CLAIM, UNCLAIM, BLOCK, COMPLETE, DELETE)
- Handles all milestone event types (CREATE, UPDATE, COMPLETE, DELETE)
- Skips events for entities already matching the new state (idempotent)

#### useMilestoneMutations (`hooks/useMilestoneMutations.ts`)

The primary hook connecting Journey Board to realtime. Provides:

- All mutation functions with optimistic updates
- Automatic realtime subscription cleanup on unmount
- Snapshot-based rollback on API failure
- Syncing state management (beginSync/endSync on ConnectionState)
- Transparent temp ID replacement (optimistic temp IDs replaced with real UUIDs from API response)

### Optimistic UI Strategy

Every mutation follows:

```
Snapshot current state
→ Optimistic update (entity._syncing = true)
→ API call
→ On success: clear _syncing, replace temp IDs with real IDs
→ On error: restore snapshot, show error
→ On realtime event: skip if from self, apply if from other
```

The `_syncing` flag is rendered visually:
- Reduced opacity on syncing entities
- Spinning indicator next to syncing milestones/actions
- Connection indicator shows "Syncing..." when any mutation is pending

### Conflict Resolution

When two users mutate the same entity simultaneously:

1. Both clients optimistically update
2. First server transaction succeeds → creates event
3. Second server transaction fails → returns error
4. Second client rolls back optimistic state
5. First client's event is broadcast via Realtime
6. Second client's error handler displays: "This action was already claimed."

Server response always wins. The `event_key` UNIQUE constraint prevents duplicate events.

### Subscription Lifecycle

```
Component Mount
  → questId known
  → realtimeManager.subscribeToQuest(questId)
    → Creates Supabase channel: surge:v1:quest:{questId}:events
    → Sets up postgres_changes INSERT filter on events table
    → Dispatches to realtimeBus on event

Component Unmount
  → Cleanup function called
  → realtimeManager unsubscribes
    → supabase.removeChannel(channel)
    → Cleans up cursor tracking
```

### Activity Feed Realtime

The Activity Timeline subscribes to the realtime bus. When a new event arrives, it:
1. Increments a counter (debounce mechanism)
2. After 1s debounce, fetches the 5 most recent activity items from the API
3. Merges new items at the top (deduplicating by ID)
4. Old items remain, preserving the scroll position

### Connection Indicator

A small dot in the quest layout header area, next to presence avatars:
- Green: Connected
- Blue: Syncing (mutation pending)
- Yellow: Reconnecting
- Red: Offline

Always visible, non-distracting, with hover tooltip.

### Migration

```sql
-- Enables Realtime broadcasting for the events table
ALTER PUBLICATION supabase_realtime ADD TABLE events;
```

### Tradeoffs

1. **Supabase Realtime vs custom WebSocket**: Supabase Realtime uses PostgreSQL's replication slots and LISTEN/NOTIFY under the hood. This adds a small overhead compared to a custom WebSocket server but zero infrastructure cost.

2. **Optimistic UI complexity**: The snapshot/rollback pattern adds complexity to mutation handlers. Alternative approaches (pessimistic UI, stale-while-revalidate) would be simpler but provide worse UX for collaboration.

3. **postgres_changes filtering**: Filtering by `quest_id` happens server-side in PostgreSQL replication. This is efficient but adds 1:1 overhead per subscription. For thousands of concurrent quest views, consider connection pooling limits.

4. **Presence via Supabase vs custom**: Supabase Presence is ephemeral (in-memory, Redis-backed). It's lightweight and auto-expiring but has size limits (~1MB per channel). Adequate for current scale.

5. **No offline support**: The optimistic queue is prepared but offline queuing is explicitly out of scope for this sprint. The queue exists to prevent architecture changes when offline support is added later.

6. **Self-event filtering**: Events from the current user are ignored on the realtime path (already reconciled via API response). This assumes the API response arrives before or simultaneously with the realtime broadcast. If Realtime is significantly faster than the HTTP response, the optimistic state is confirmed early — functionally correct but could cause a brief visual flicker.

## Momentum Engine (Sprint 7)

An execution intelligence system that evaluates quest health using immutable events and domain state. No AI, no ML, no opaque scoring — every score is explainable.

### Architecture

```
Events / Actions / Milestones (PostgreSQL)
  ↓
Signal Extraction (features/momentum/signals.ts)
  ↓
Behavior Analysis (features/momentum/behavior.ts)
  ↓
Pillar Evaluation (features/momentum/pillars.ts)
  ↓
Momentum Calculation (features/momentum/calculator.ts)
  ↓
Mission Summary + Highlights (features/momentum/summary.ts)
  ↓
Recommendations (features/momentum/recommendations.ts)
  ↓
API → Mission Control UI
```

The system evaluates behavior first. Scores come afterwards.

### Four Pillars

| Pillar | What It Measures | Key Signals |
|--------|-----------------|-------------|
| **Velocity** | Work completion pace | completed actions/milestones, completion rate, 7-day completion trend |
| **Ownership** | Clarity of responsibility | claimed/unclaimed ratio, owner distribution, orphaned work |
| **Stability** | Execution friction | blocked actions, stale milestones, long-running actions |
| **Engagement** | Team participation | active members, event recency, participation evenness |

Each pillar returns:
- `score` (0–100, explainable)
- `summary` (one-line narrative)
- `strengths` and `weaknesses` (human-readable lists)
- `signals` (the raw data that produced the score)
- `trend` (delta model: `{ current, previous, delta, direction }`)

### Overall Momentum

Weighted combination of the four pillars:

```
momentum = velocity * 0.30 + ownership * 0.25 + stability * 0.25 + engagement * 0.20
```

Weights are version-controlled in `features/momentum/weights.ts`. No database storage — only introduce DB overrides if product requirements demand user customization.

### Trend Model

Delta-based: compare current 7-day window vs previous 7-day window.
- `direction: 'up'` when delta ≥ +5
- `direction: 'down'` when delta ≤ -5
- `direction: 'stable'` otherwise

Thresholds in `weights.ts` (`TREND_THRESHOLDS`). Configurable without code changes.

### Signal Extraction

Signals are first-class domain objects with context, not raw primitives:

```typescript
// Instead of: { blockedActions: 4 }
// The system returns:
{ blockedActions: { count: 4, severity: 'high', items: [ ... ] } }
```

Signal extraction queries three sources in parallel:
- `actions` table (statuses, owners, creation dates)
- `milestones` table (statuses, creation dates)
- `events` table (recent activity, actor IDs)

### Behavior Analysis

A qualitative assessment layer between signals and scoring:

- **Velocity**: pace (`accelerating | steady | slowing | stalled`), consistency score, bottleneck descriptions
- **Ownership**: clarity (`clear | mixed | unclear`), coverage percentage, risk descriptions
- **Stability**: health (`stable | at-risk | unstable`), friction descriptions, blocker descriptions
- **Engagement**: health (`engaged | moderate | disengaged`), participation description, concern descriptions

### Recommendations

Deterministic rules that reference real entities:

| Condition | Recommendation | Priority |
|-----------|---------------|----------|
| Blocked actions > 0 | Named blocked actions with milestone context | high |
| Unclaimed ratio > 50% | Explicit count and assignment suggestions | high |
| Stale milestones > 0 | Named milestones with inactivity duration | medium |
| Completion rate < 30% | Completion ratio and call to focus | medium |
| No activity > 7 days | Days since last event | medium |
| Velocity declining | Current vs previous completion count | medium |
| Long-running actions > 0 | Named actions with age | low |
| No active members | Total team size, call to action | low |

Every recommendation includes `title`, `description`, `priority`, `reason`, `relatedSignals`, and optionally `affectedEntity` with `type`, `id`, and `label`.

### API

```
GET /api/quests/[questId]/momentum
```

Returns:
```json
{
  "mission": { "status": "healthy|attention|critical", "summary": "...", "attentionLevel": "low|medium|high" },
  "momentum": { "overall": 72, "trend": { "current": 72, "previous": 68, "delta": 4, "direction": "up" } },
  "highlights": [ { "type": "positive|warning", "label": "actions completed", "count": 5 } ],
  "pillars": { "velocity": { "score": 80, "summary": "...", "strengths": [], "weaknesses": [], "signals": {}, "trend": {} }, ... },
  "recommendations": [ { "title": "...", "description": "...", "priority": "high", "reason": "...", "relatedSignals": [], "affectedEntity": {} } ],
  "lastCalculated": "2026-06-25T..."
}
```

### UI — Mission Control

Route: `/quests/[questId]/mission-control`

Page hierarchy (typography-first, no charts, no graphs):
1. **Mission Summary** — status badge, narrative summary, attention level
2. **Execution Highlights** — positive/warning badges (e.g., "5 actions completed", "3 blocked actions")
3. **Overall Momentum** — large score, trend indicator, delta
4. **Four Pillars** — 2×2 grid with score, trend, summary, top weakness
5. **Attention Required** — highlighted callout for lowest pillar
6. **Recommended Next Actions** — ordered list with priority badges

### File Structure

```
src/features/momentum/
├── types.ts              — All domain types (MomentumResponse, PillarEvaluation, signals, etc.)
├── weights.ts            — Default weights, trend thresholds, configurable constants
├── repository.ts         — Supabase read queries (actions, milestones, events, members)
├── signals.ts            — Structured signal extraction (parallel queries, signal enrichment)
├── behavior.ts           — Qualitative behavior analysis from signals
├── pillars.ts            — Four pillar evaluations (score + strengths/weaknesses + trend)
├── calculator.ts         — Weighted momentum combination
├── summary.ts            — Mission summary + execution highlights generation
└── recommendations.ts    — Deterministic, context-aware recommendations
```

### Key Design Decisions

1. **Behavior-first**: The system evaluates execution behavior (pace, clarity, health, engagement) before computing scores. The behavior layer provides the narrative; the numeric layer provides the measurement.

2. **Signals as domain objects**: Signals carry context (severity, item lists, entity references) so recommendations never need to re-query the database.

3. **File-based weights**: Weights live in `weights.ts`, not the database. Only introduce persistence when product demands user-customizable weights.

4. **Delta trend model**: `{ current, previous, delta, direction }` preserves full information. Classification (`up | down | stable`) is a derived property with configurable thresholds.

5. **API follows existing conventions**: Route at `/api/quests/[questId]/momentum` (consistent with activity, members endpoints). No `/api/v1` prefix.

6. **No AI/ML**: Every score is a weighted formula. Every recommendation is a deterministic rule. Every trend is a comparison of two windows.

### Testing

42 integration tests in `scripts/test-momentum.ts` covering:
- Signal extraction data shapes
- Blocked actions → reduced stability
- Unclaimed actions → reduced ownership
- Completion → increased velocity
- Recommendation entity references
- Mission summary status transitions
- Trend determinism (same inputs → same outputs)
- Weight calculator accuracy
- API contract shape validation

## Command Experience (Sprint 8)

A keyboard-first interaction model where the Command Palette becomes the primary way to navigate and operate Surge.

### Philosophy

Every frequent workflow is accessible through commands, search, or shortcuts. The keyboard is the fastest way to interact with the application. The mouse is optional for navigation.

Commands are modular, context-aware, and declarative. Adding new functionality means adding a new provider, not editing a monolithic registry.

### Architecture

```
⌘K → Command Palette
       ↓
Command Registry (composes providers)
       ↓
Search Engine (client-side commands + server-side entities)
       ↓
Executor → Application
```

The palette is a single global component mounted once in `app/(protected)/layout.tsx`.

### Command Provider Pattern

Commands are organized by provider, not by type. Each provider exports `getCommands(context)`. The central registry composes all providers:

- **navigationProvider** — Global page navigation (Quests, New Quest, Settings)
- **questProvider** — Quest-specific views (Milestones, Mission Control, Activity, Team)
- **actionProvider** — Action creation workflows
- **milestoneProvider** — Milestone creation workflows
- **memberProvider** — Member management workflows

Future features add commands by creating new providers, never by editing the registry.

### Command DSL

Commands are declared through `defineCommand()`:

```typescript
defineCommand({
  id: 'quest:milestones',
  title: 'View Milestones',
  description: 'Open the milestones board',
  group: getGroup('navigation'),
  keywords: ['board', 'tasks', 'actions'],
  icon: ClipboardList,
  availability: (ctx) => !!ctx.questId,
  visible: (ctx) => !!ctx.questId,
  run: (ctx) => navigate(`/quests/${ctx.questId}/milestones`, ctx),
})
```

Every command follows the same structure: id, title, description, group, keywords, icon, availability, visible, run. Commands self-determine their visibility and availability based on the current execution context. This replaces hardcoded rules inside the palette component.

### Execution Context

Commands receive a rich context object:

```typescript
type ExecutionContext = {
  pathname: string;       // Current route
  questId?: string;       // Current quest (if in quest context)
  questTitle?: string;    // Current quest title
  role?: MemberRole;      // Caller's role
  userId?: string;        // Caller's user ID
  close: () => void;      // Close the palette
};
```

Commands call `close()` after navigation. Creation workflows may keep the palette open for rapid successive execution.

### Search Engine

Search operates on two tiers:

**Client-side (commands + pages):**
- Static commands always available
- Searched by exact match → prefix → keywords → fuzzy
- Recent execution boosts ranking

**Server-side (entities via `/api/search`):**
- Quests (across all quests)
- Actions (within current quest)
- Milestones (within current quest)
- Members (within current quest)
- Fetched via `features/search/providers/` — each provider encapsulates one entity type
- API route is a thin orchestrator — no business logic

### Search Provider Pattern

Search providers live in `features/search/providers/`:

- **questSearch** — Searches quests by title via Supabase ILIKE
- **actionSearch** — Searches actions by title within a quest
- **milestoneSearch** — Searches milestones by title within a quest
- **memberSearch** — Searches members by name/email within a quest

The `/api/search` route composes providers based on context (only fetches quests globally; only fetches actions/milestones/members when a questId is provided).

### Search Result Types

Results use discriminated union types — no generic `SearchResult`:

```typescript
type SearchResult = NavigationResult | QuestResult | ActionResult | MilestoneResult | MemberResult | CommandResult;
```

Each type contains only the fields required for rendering. The palette component switches on `result.type` to determine how to render and navigate.

### Palette UI Sections

The palette displays three sections:
1. **Recent** — Shown before typing. Last 10 executed commands from localStorage.
2. **Commands** — Matching static commands from the registry.
3. **Results** — Matching entities from server-side search.

Sections keep the palette organized. Users immediately distinguish between executable commands and searchable content.

### Local History & Analytics

**History:** Last 10 executed commands stored in localStorage (`surge-command-history`). Displayed before typing. Recent execution boosts future search ranking.

**Analytics:** Lightweight execution tracking stored locally (`surge-command-analytics`). Tracks `commandId`, `timestamp`, `executionDuration`, `success`. No backend, no telemetry.

### Shortcut Registry

Centralized keyboard shortcut system in `features/commands/shortcuts.ts`:

- Global `keydown` listener attached once
- Shortcuts registered via `registerGlobalShortcut(key, handler, metaKey?)`
- No scattered keyboard listeners across components
- Currently: `⌘K` / `Ctrl+K` toggles the palette

### Palette Behavior

- **Navigation commands** — Execute then close the palette
- **Creation workflows** — Navigate to creation UI and close
- **Entity selection** — Navigate to entity context and close
- **Escape** — Closes the palette at any time
- **Focus restoration** — Previous focus restored on close

### Accessibility

- Proper `role="dialog"` with `aria-modal="true"`
- Focus trap: focus cycles within the palette while open
- Arrow key navigation through results
- Enter to execute, Escape to close
- Previous focus restored on close
- Screen reader labels on all interactive elements

### File Structure

```
src/features/commands/
├── types.ts                — All domain types (Command, SearchResult, CommandContext, etc.)
├── groups.ts               — Group definitions with priority ordering
├── define.ts               — defineCommand() DSL helper
├── registry.ts             — Command registry (composes providers)
├── search.ts               — Client-side command search engine
├── executor.ts             — Command execution with analytics
├── history.ts              — Recent commands persistence (localStorage)
├── analytics.ts            — Execution analytics (localStorage)
├── shortcuts.ts            — Global keyboard shortcut registry
├── index.ts                — Barrel exports
└── providers/
    ├── navigationProvider.ts  — Global page navigation commands
    ├── questProvider.ts       — Quest-specific view commands
    ├── actionProvider.ts      — Action workflow commands
    ├── milestoneProvider.ts   — Milestone workflow commands
    └── memberProvider.ts      — Member management commands

src/features/search/
└── providers/
    ├── questSearch.ts         — Server-side quest search
    ├── actionSearch.ts        — Server-side action search (within quest)
    ├── milestoneSearch.ts     — Server-side milestone search (within quest)
    ├── memberSearch.ts        — Server-side member search (within quest)
    └── index.ts               — Barrel exports

src/components/commands/
└── command-palette.tsx        — Global Command Palette dialog

src/app/api/search/route.ts   — Search API orchestrator
```

### Key Design Decisions

1. **Provider pattern over flat registry**: Commands are organized by domain. Adding a new feature means creating a new provider, not editing a growing switch statement. Future extensibility without modding existing code.

2. **Search providers over inline queries**: Entity search follows the same pattern as command providers. The API route is a thin orchestrator. No business logic in route handlers.

3. **Client-side command search**: Static commands and pages are searched entirely client-side. No network request needed for command search. Server-side search only fetches entities.

4. **Discriminated result types**: Each result type carries exactly the fields it needs. The palette switches on `type` rather than checking optional properties. TypeScript exhaustiveness checking catches unhandled cases.

5. **Local analytics only**: Execution data stays in localStorage. No telemetry, no backend storage. Analytics are used exclusively for local search ranking improvements.

6. **Self-determined visibility**: Each command exposes `availability()` and `visible()` to determine its own context. The palette has no hardcoded rules about which commands appear where.

7. **Result grouping**: Three distinct sections (Recent, Commands, Results) prevent the "one long mixed list" antipattern. Users immediately understand what they're looking at.
