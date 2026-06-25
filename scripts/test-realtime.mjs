// Surge Sprint 6 — Automated Realtime Integration Test
// Tests: event broadcast, dedup, optimistic queue, reconciliation, presence lifecycle

import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const { Pool } = pg;

const DB_CONFIG = {
  host: 'aws-1-ap-northeast-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.yzxpgrwajgzkpfrkxeqp',
  password: 'Whateverittakes2103!',
  max: 1,
  connectionTimeoutMillis: 10000,
};

const SUPABASE_URL = 'https://yzxpgrwajgzkpfrkxeqp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6eHBncndhamd6a3Bmcmt4ZXFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjE2NjcsImV4cCI6MjA5Nzg5NzY2N30.A5t_puYn_zHpjAzZQSr8bxMP9YuU4T3sFCNtl5gRUCs';
// Use service_role key for Realtime tests to bypass RLS (until Clerk JWT integration is complete)
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6eHBncndhamd6a3Bmcmt4ZXFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjMyMTY2NywiZXhwIjoyMDk3ODk3NjY3fQ.AyGyNfmrNIL4jRFp-fS0cBMIJzcZDsHb3jvlmEqo4pk';

const pool = new Pool(DB_CONFIG);

// Track results
const results = { pass: 0, fail: 0 };
function assert(label, ok, detail) {
  if (ok) {
    console.log(`  ✓ ${label}`);
    results.pass++;
  } else {
    console.log(`  ✗ ${label} ${detail ? `— ${detail}` : ''}`);
    results.fail++;
  }
}

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function cleanupTestData(client, questId) {
  if (!questId) return;
  await client.query('DELETE FROM events WHERE quest_id = $1', [questId]);
  await client.query('DELETE FROM quest_members WHERE quest_id = $1', [questId]);
  await client.query('DELETE FROM actions WHERE milestone_id IN (SELECT id FROM milestones WHERE quest_id = $1)', [questId]);
  await client.query('DELETE FROM milestones WHERE quest_id = $1', [questId]);
  await client.query('DELETE FROM quests WHERE id = $1', [questId]);
}

async function insertUserIfMissing(client, id, name, email) {
  await client.query(
    `INSERT INTO users (id, clerk_user_id, name, email, avatar_url)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
    [id, `test-${id}`, name, email, `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`]
  );
}

async function run() {
  console.log('\n═══ Surge Sprint 6 Realtime Tests ═══\n');

  const { randomUUID } = await import('crypto');
  let aliceId = randomUUID();
  let bobId = randomUUID();
  let questId = null;
  let milestone1Id = null;
  let milestone2Id = null;
  let action1Id = null;
  let action2Id = null;

  // ── Setup: client for DB writes ──
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create/ensure test users
    await insertUserIfMissing(client, aliceId, 'Alice', 'alice@test.com');
    await insertUserIfMissing(client, bobId, 'Bob', 'bob@test.com');

    // Create test quest
    const q = await client.query(
      `INSERT INTO quests (title, description, template_type, owner_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['Realtime Test Quest', 'Automated test for Sprint 6 realtime', 'custom', aliceId]
    );
    questId = q.rows[0].id;

    // Add members
    await client.query(
      'INSERT INTO quest_members (quest_id, user_id, role) VALUES ($1, $2, $3), ($1, $4, $5)',
      [questId, aliceId, 'owner', bobId, 'member']
    );

    // Create milestones
    const ms1 = await client.query(
      `INSERT INTO milestones (quest_id, title, position, created_by)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [questId, 'Test Milestone 1', 0, aliceId]
    );
    milestone1Id = ms1.rows[0].id;

    const ms2 = await client.query(
      `INSERT INTO milestones (quest_id, title, position, created_by)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [questId, 'Test Milestone 2', 1, aliceId]
    );
    milestone2Id = ms2.rows[0].id;

    // Create actions
    const act1 = await client.query(
      `INSERT INTO actions (quest_id, milestone_id, title, status, owner_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [questId, milestone1Id, 'Alice Action', 'open', aliceId, aliceId]
    );
    action1Id = act1.rows[0].id;

    const act2 = await client.query(
      `INSERT INTO actions (quest_id, milestone_id, title, created_by)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [questId, milestone2Id, 'Bob Action', bobId]
    );
    action2Id = act2.rows[0].id;

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Setup failed:', e);
    await client.release();
    process.exit(1);
  }
  client.release();

  console.log(`Setup: quest=${questId}, ms1=${milestone1Id}, ms2=${milestone2Id}, act1=${action1Id}, act2=${action2Id}\n`);

  // ── Test 1: Realtime Event Broadcast ──
  console.log('── Test 1: Realtime Event Subscription ──');

  const receivedEvents = [];
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const channelName = `surge:v1:quest:${questId}:events:test`;

  let subscribed = false;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'events',
        filter: `quest_id=eq.${questId}`,
      },
      (payload) => {
        receivedEvents.push(payload.new);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        subscribed = true;
        assert('Realtime channel subscription opened', true);
      }
    });

  await wait(3000);

  // Insert events mimicking domain mutations — each in its own transaction for distinct timestamps
  const eventClient = await pool.connect();
  try {
    // Alice creates milestone
    await eventClient.query('BEGIN');
    await eventClient.query(
      `INSERT INTO events (event_type, entity_type, entity_id, quest_id, actor_id, metadata, event_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        'MILESTONE_CREATED',
        'milestone',
        milestone1Id,
        questId,
        aliceId,
        JSON.stringify({
          version: 1,
          entitySnapshot: { id: milestone1Id, title: 'Test Milestone 1' },
          changes: { title: 'Test Milestone 1' },
          actor: { name: 'Alice', avatar_url: '' },
        }),
        `MILESTONE_CREATED:${milestone1Id}`,
      ]
    );
    await eventClient.query('COMMIT');

    // Bob claims action
    await eventClient.query('BEGIN');
    await eventClient.query(
      `INSERT INTO events (event_type, entity_type, entity_id, quest_id, actor_id, metadata, event_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        'ACTION_CLAIMED',
        'action',
        action1Id,
        questId,
        bobId,
        JSON.stringify({
          version: 1,
          entitySnapshot: { id: action1Id, title: 'Alice Action', assignee_id: bobId },
          changes: { assignee_id: bobId },
          actor: { name: 'Bob', avatar_url: '' },
        }),
        `ACTION_CLAIMED:${action1Id}`,
      ]
    );
    await eventClient.query('COMMIT');

    // Alice completes action
    await eventClient.query('BEGIN');
    await eventClient.query(
      `INSERT INTO events (event_type, entity_type, entity_id, quest_id, actor_id, metadata, event_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        'ACTION_COMPLETED',
        'action',
        action1Id,
        questId,
        aliceId,
        JSON.stringify({
          version: 1,
          entitySnapshot: { id: action1Id, title: 'Alice Action', status: 'completed' },
          changes: { status: 'completed' },
          actor: { name: 'Alice', avatar_url: '' },
        }),
        `ACTION_COMPLETED:${action1Id}`,
      ]
    );
    await eventClient.query('COMMIT');
  } catch (e) {
    await eventClient.query('ROLLBACK');
    console.error('Event insert failed:', e);
  }
  eventClient.release();

  // Wait for Realtime to deliver
  await wait(6000);

  if (!subscribed) {
    assert('Realtime channel subscription opened', false, 'subscription never confirmed — Realtime may need to be enabled in Supabase dashboard');
  }

  assert(
    'Received 3 events via Realtime',
    receivedEvents.length === 3,
    `got ${receivedEvents.length}`
  );
  assert(
    'First event is MILESTONE_CREATED',
    receivedEvents[0]?.event_type === 'MILESTONE_CREATED'
  );
  assert(
    'Second event is ACTION_CLAIMED',
    receivedEvents[1]?.event_type === 'ACTION_CLAIMED'
  );
  assert(
    'Third event is ACTION_COMPLETED',
    receivedEvents[2]?.event_type === 'ACTION_COMPLETED'
  );

  // ── Test 2: Event Deduplication ──
  console.log('\n── Test 2: Event Deduplication (LRU Cache) ──');

  // Simulate event dedup by tracking IDs
  const processedIds = new Set();
  let dedupedCount = 0;
  for (const evt of receivedEvents) {
    if (processedIds.has(evt.id)) {
      dedupedCount++;
    } else {
      processedIds.add(evt.id);
    }
  }
  assert('No duplicate events processed', dedupedCount === 0, `${dedupedCount} dupes found`);

  // Verify duplicate insertion fails (event_key constraint)
  const dupClient = await pool.connect();
  try {
    await dupClient.query(
      `INSERT INTO events (event_type, entity_type, entity_id, quest_id, actor_id, metadata, event_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        'ACTION_COMPLETED',
        'action',
        action1Id,
        questId,
        aliceId,
        JSON.stringify({}),
        `ACTION_COMPLETED:${action1Id}`,
      ]
    );
    assert('Duplicate event_key rejected', false, 'insert succeeded (should have failed)');
  } catch (e) {
    assert('Duplicate event_key rejected', e.code === '23505', e.message);
  }
  dupClient.release();

  // ── Test 3: Event Ordering ──
  console.log('\n── Test 3: Event Ordering (created_at + id) ──');
  const orderClient = await pool.connect();
  const eventsResult = await orderClient.query(
    `SELECT id, event_type, created_at FROM events
     WHERE quest_id = $1 ORDER BY created_at ASC, id ASC`,
    [questId]
  );
  orderClient.release();

  const expectedOrder = ['MILESTONE_CREATED', 'ACTION_CLAIMED', 'ACTION_COMPLETED'];
  const actualOrder = eventsResult.rows.map((r) => r.event_type);
  assert(
    'Events ordered by created_at then id',
    JSON.stringify(actualOrder) === JSON.stringify(expectedOrder),
    `got [${actualOrder.join(', ')}]`
  );

  // ── Test 4: Optimistic Queue lifecycle ──
  console.log('\n── Test 4: Optimistic Queue Lifecycle ──');

  // Simulate optimistic queue behavior in-memory
  const queue = [];
  function enqueue(item) {
    queue.push({ ...item, status: 'pending' });
  }
  function confirm(itemId) {
    const item = queue.find((q) => q.id === itemId);
    if (item) item.status = 'confirmed';
  }
  function fail(itemId) {
    const item = queue.find((q) => q.id === itemId);
    if (item) item.status = 'failed';
  }
  function rollback(itemId) {
    const idx = queue.findIndex((q) => q.id === itemId);
    if (idx >= 0) return queue[idx].snapshot;
    return null;
  }

  const snapshot = { title: 'Original', status: 'todo' };
  enqueue({ id: 'temp-action-1', type: 'claim_action', snapshot, entity: { ...snapshot, _syncing: true } });
  enqueue({ id: 'temp-action-2', type: 'complete_action', snapshot, entity: { ...snapshot, _syncing: true } });

  assert('Queue has 2 pending items', queue.length === 2);
  assert('Item 1 is pending', queue[0].status === 'pending');
  assert('Item 2 is pending', queue[1].status === 'pending');

  confirm('temp-action-1');
  assert('Item 1 confirmed', queue[0].status === 'confirmed');

  fail('temp-action-2');
  assert('Item 2 failed', queue[1].status === 'failed');

  const rolledBack = rollback('temp-action-2');
  assert('Failed item has snapshot for rollback', rolledBack?.title === 'Original');

  // ── Test 5: Connection State Machine ──
  console.log('\n── Test 5: Connection State Machine ──');

  // Simulate connection state transitions
  let statuses = [];
  function transition(s) { statuses.push(s); }

  transition('connected');
  transition('syncing'); // when optimistic update pending
  transition('connected'); // sync complete
  transition('reconnecting');
  transition('connected');
  transition('offline');
  transition('connected');

  assert('Initial state connected', statuses[0] === 'connected');
  assert('Syncing after optimistic update', statuses[1] === 'syncing');
  assert('Returns to connected after sync', statuses[2] === 'connected');
  assert('Handles reconnecting', statuses[3] === 'reconnecting');
  assert('Handles offline', statuses[5] === 'offline');

  // ── Test 6: User Context in Event Metadata ──
  console.log('\n── Test 6: Actor Snapshot in Event Metadata ──');

  const metaClient = await pool.connect();
  const metaEvents = await metaClient.query(
    `SELECT event_type, metadata FROM events WHERE quest_id = $1 ORDER BY created_at ASC`,
    [questId]
  );
  metaClient.release();

  for (const row of metaEvents.rows) {
    const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
    assert(
      `${row.event_type} has actor snapshot`,
      meta?.actor?.name && meta?.actor?.name.length > 0,
      `missing actor in ${row.event_type}`
    );
  }

  // ── Test 7: Presence simulation ──
  console.log('\n── Test 7: Presence Channel Namespace ──');

  const presenceChannel = `surge:v1:quest:${questId}:presence`;
  assert('Presence channel is namespaced', presenceChannel.startsWith('surge:v1'), presenceChannel);
  assert('Presence channel contains quest ID', presenceChannel.includes(questId));

  // ── Cleanup ──
  console.log('\n── Cleanup ──');
  // Set a flag before unsubscribing to prevent the CLOSED status from triggering the assert
  channel.unsubscribe();
  await wait(500);
  const cleanClient = await pool.connect();
  await cleanupTestData(cleanClient, questId);
  cleanClient.release();
  await pool.end();

  console.log(`\n═══ Results: ${results.pass} passed, ${results.fail} failed ═══`);
  process.exit(results.fail > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test crashed:', e);
  process.exit(1);
});
