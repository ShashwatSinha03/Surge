# Surge Architecture

## Why Events Exist

Every business mutation in Surge emits exactly one immutable domain event. Events form an append-only log of every state change. This enables:

- **Auditability**: Every action, milestone claim, invite, and role change is recorded with actor identity and timestamp.
- **Future features**: Activity feeds (Sprint 5), realtime sync (Sprint 6), notifications (Sprint 7), and the health/momentum engine (Sprint 8) all consume the event stream.
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
3. Creates a minimal entity snapshot for the event metadata
4. Inserts exactly one event row
5. Commits the transaction
6. Rolls back everything if any step fails

This guarantees that business state and event history never diverge.

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

## Folder Structure

```
features/{domain}/
  schemas.ts            # Zod validation schemas
  repositories/
    {domain}Repository.ts  # Raw SQL persistence
  services/
    {action}.ts           # Domain service → calls executeDomainMutation + repository
```

## Future Event Consumers

Documented here for architectural awareness. No implementation before its sprint.

| Sprint | Consumer | Description |
|--------|----------|-------------|
| 5 | Activity Feed | UI that reads `events` table to render a chronological activity stream |
| 6 | Realtime Sync | WebSocket layer that pushes events to connected clients |
| 7 | Notifications | Filter events by type/actor/quest and dispatch user notifications |
| 8 | Momentum Engine | Aggregate events to compute health scores, momentum metrics |

## Tradeoffs of Current Implementation

1. **Direct `pg` dependency**: Adds a second database client alongside Supabase JS. Connection pooling must be carefully managed in serverless environments.
2. **No message broker**: Events are stored in PostgreSQL, not in Kafka/RabbitMQ. This keeps infrastructure simple but means future consumers must poll or read from the events table rather than subscribing to a stream.
3. **Pooler vs direct connection**: Using Supabase's session pooler adds a network hop. Direct DB connection would be faster but the pooler is required for connection management in serverless.
4. **Event key idempotency**: The UNIQUE constraint on `event_key` prevents duplicates but does not prevent the same logical mutation from being applied with different keys. Perfect idempotency would require application-level deduplication.
5. **Snapshot minimalism**: Event metadata stores only a few key fields (`title`, `status`, `name`, `email`, `role`, `template_type`). Full entity hydration requires joining with the main tables.
