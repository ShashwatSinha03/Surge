/**
 * Seed a demo quest with 5 months of realistic data.
 *
 * Usage: node scripts/seed-demo.mjs
 *
 * Prerequisites:
 * - .env.local must have SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * - You must be signed in to the app (the script looks up your user)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env vars from .env.local
function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env.local');
  const content = readFileSync(envPath, 'utf-8');
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    vars[key] = val;
  }
  return vars;
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// ─── Helpers ────────────────────────────────────────────────────────────────

function uid() {
  return crypto.randomUUID();
}

function monthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function minutesAgo(n) {
  const d = new Date();
  d.setMinutes(d.getMinutes() - n);
  return d.toISOString();
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  // 1. Look up the current user (first user in the system — the one running the script)
  const { data: users, error: userErr } = await supabase
    .from('users')
    .select('id, name, email')
    .limit(10);

  if (userErr || !users || users.length === 0) {
    console.error('No users found. Make sure you are signed in.');
    process.exit(1);
  }

  const me = users[0];
  console.log(`Found user: ${me.name} (${me.email})`);

  // 2. Create 4 fake team members
  const team = [
    { name: 'Alex Chen', email: 'alex@demo.surge', clerk_user_id: `demo_clerk_${uid()}` },
    { name: 'Maya Patel', email: 'maya@demo.surge', clerk_user_id: `demo_clerk_${uid()}` },
    { name: 'Jordan Lee', email: 'jordan@demo.surge', clerk_user_id: `demo_clerk_${uid()}` },
    { name: 'Sam Rivera', email: 'sam@demo.surge', clerk_user_id: `demo_clerk_${uid()}` },
  ];

  const teamIds = [];
  for (const member of team) {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', member.email)
      .maybeSingle();

    if (existing) {
      console.log(`  ${member.name} already exists`);
      teamIds.push(existing.id);
    } else {
      const { data: created, error } = await supabase
        .from('users')
        .insert({
          id: uid(),
          name: member.name,
          email: member.email,
          clerk_user_id: member.clerk_user_id,
          avatar_url: null,
        })
        .select('id')
        .single();

      if (error) {
        console.error(`  Failed to create ${member.name}:`, error.message);
        process.exit(1);
      }
      console.log(`  Created ${member.name}`);
      teamIds.push(created.id);
    }
  }

  // 3. Check if demo quest already exists (by title, idempotent)
  const demoTitle = 'Ship Surge Mobile';
  const { data: existingQuest } = await supabase
    .from('quests')
    .select('id')
    .eq('title', demoTitle)
    .maybeSingle();

  if (existingQuest) {
    // Delete and recreate
    console.log(`\nQuest "${demoTitle}" already exists. Deleting and recreating…`);
    await supabase.from('events').delete().eq('quest_id', existingQuest.id);
    await supabase.from('actions').delete().eq('quest_id', existingQuest.id);
    await supabase.from('milestones').delete().eq('quest_id', existingQuest.id);
    await supabase.from('quest_members').delete().eq('quest_id', existingQuest.id);
    await supabase.from('quests').delete().eq('id', existingQuest.id);
    console.log('  Old quest deleted.\n');
  }

  // 4. Create the quest — 5 months ago
  const questId = uid();
  const questCreated = monthsAgo(5);

  const { error: qErr } = await supabase.from('quests').insert({
    id: questId,
    title: demoTitle,
    description:
      'Building the mobile version of Surge — momentum tracking on the go. ' +
      'iOS and Android apps with real-time sync, push notifications, and offline support.',
    template_type: 'mobile_app',
    owner_id: me.id,
    status: 'active',
    health_score: null,
    created_at: questCreated,
    updated_at: questCreated,
  });

  if (qErr) {
    console.error('Failed to create quest:', qErr.message);
    process.exit(1);
  }
  console.log(`Created quest: ${demoTitle}`);

  // 5. Add members
  const allMembers = [me.id, ...teamIds];
  const memberRoles = ['owner', 'admin', 'member', 'member', 'member'];

  for (let i = 0; i < allMembers.length; i++) {
    await supabase.from('quest_members').insert({
      id: uid(),
      quest_id: questId,
      user_id: allMembers[i],
      role: memberRoles[i],
      joined_at: questCreated,
    });
  }
  console.log(`Added ${allMembers.length} team members`);

  // 6. Create milestones
  //    - 4 completed milestones (spread over months 1-4)
  //    - 2 open milestones (set in month 4-5, one has recent events)
  const withQuest = (ms) => ({ ...ms, quest_id: questId });

  const milestones = [
    withQuest({
      id: uid(), title: 'Design System & UI Kit',
      status: 'completed', position: 1,
      created_by: teamIds[0], created_at: monthsAgo(4.5),
    }),
    withQuest({
      id: uid(), title: 'Authentication & Onboarding',
      status: 'completed', position: 2,
      created_by: teamIds[1], created_at: monthsAgo(3.8),
    }),
    withQuest({
      id: uid(), title: 'Core Dashboard',
      status: 'completed', position: 3,
      created_by: me.id, created_at: monthsAgo(3),
    }),
    withQuest({
      id: uid(), title: 'Quest Management',
      status: 'completed', position: 4,
      created_by: teamIds[2], created_at: monthsAgo(2),
    }),
    withQuest({
      id: uid(), title: 'Notifications & Realtime',
      status: 'open', position: 5,
      created_by: teamIds[1], created_at: monthsAgo(1.5),
    }),
    withQuest({
      id: uid(), title: 'App Store Submission',
      status: 'open', position: 6,
      created_by: me.id, created_at: daysAgo(20),
    }),
  ];

  for (const ms of milestones) {
    const { error: msErr } = await supabase.from('milestones').insert(ms);
    if (msErr) {
      console.error(`  Failed to insert milestone "${ms.title}":`, msErr.message);
      console.error('  Data:', JSON.stringify(ms, null, 2));
      process.exit(1);
    }
  }
  console.log(`Created ${milestones.length} milestones`);

  // 7. Create actions with realistic distribution
  //    3-4 actions per milestone, some completed, some open, 1 blocked
  const actionsData = [
    // Design System & UI Kit (completed milestone — all actions completed)
    { milestone: milestones[0], actions: [
      { title: 'Define color palette & typography', owner: teamIds[0], status: 'completed', created: monthsAgo(4.4), daysToComplete: 5 },
      { title: 'Build component library', owner: teamIds[0], status: 'completed', created: monthsAgo(4.3), daysToComplete: 10 },
      { title: 'Create icon set', owner: teamIds[0], status: 'completed', created: monthsAgo(4.1), daysToComplete: 4 },
    ]},
    // Auth & Onboarding (completed milestone — all actions completed)
    { milestone: milestones[1], actions: [
      { title: 'Implement sign-in flow', owner: teamIds[1], status: 'completed', created: monthsAgo(3.7), daysToComplete: 7 },
      { title: 'Build onboarding screens', owner: me.id, status: 'completed', created: monthsAgo(3.5), daysToComplete: 6 },
      { title: 'Set up deep linking', owner: teamIds[1], status: 'completed', created: monthsAgo(3.3), daysToComplete: 5 },
    ]},
    // Core Dashboard (completed milestone — all actions completed)
    { milestone: milestones[2], actions: [
      { title: 'Build quest list view', owner: teamIds[2], status: 'completed', created: monthsAgo(2.9), daysToComplete: 8 },
      { title: 'Implement health widget', owner: me.id, status: 'completed', created: monthsAgo(2.7), daysToComplete: 6 },
      { title: 'Add momentum chart', owner: teamIds[2], status: 'completed', created: monthsAgo(2.5), daysToComplete: 7 },
      { title: 'Pull-to-refresh & loading states', owner: teamIds[0], status: 'completed', created: monthsAgo(2.3), daysToComplete: 3 },
    ]},
    // Quest Management (completed milestone — all actions completed)
    { milestone: milestones[3], actions: [
      { title: 'Create quest form', owner: teamIds[3], status: 'completed', created: monthsAgo(1.9), daysToComplete: 6 },
      { title: 'Milestone CRUD screens', owner: teamIds[2], status: 'completed', created: monthsAgo(1.7), daysToComplete: 8 },
      { title: 'Action assignment UI', owner: teamIds[3], status: 'completed', created: monthsAgo(1.5), daysToComplete: 5 },
    ]},
    // Notifications & Realtime (open milestone — mix of statuses)
    { milestone: milestones[4], actions: [
      { title: 'Push notification service', owner: teamIds[1], status: 'completed', created: monthsAgo(1.4), daysToComplete: 10 },
      { title: 'Realtime event sync', owner: teamIds[2], status: 'open', created: daysAgo(25), daysToComplete: null },
      { title: 'In-app notification center', owner: teamIds[3], status: 'open', created: daysAgo(15), daysToComplete: null },
      { title: 'Notification preferences', owner: null, status: 'open', created: daysAgo(10), daysToComplete: null },
    ]},
    // App Store Submission (open milestone — just created)
    { milestone: milestones[5], actions: [
      { title: 'Prepare app store assets', owner: teamIds[0], status: 'open', created: daysAgo(18), daysToComplete: null },
      { title: 'Beta testing plan', owner: me.id, status: 'open', created: daysAgo(15), daysToComplete: null },
      { title: 'Performance audit', owner: teamIds[1], status: 'open', created: daysAgo(12), daysToComplete: null },
    ]},
  ];

  // Add one blocked action
  const blockedActionId = uid();
  const blockedMilestone = milestones[4]; // Notifications milestone

  const allActionsFlat = [];

  for (const group of actionsData) {
    for (const a of group.actions) {
      const actionId = uid();
      const createdAt = a.created;
      const updatedAt = a.status === 'completed' && a.daysToComplete
        ? daysAgo(Math.round((Date.now() - new Date(createdAt).getTime()) / 86400000) - a.daysToComplete)
        : createdAt;

      const { error: actErr } = await supabase.from('actions').insert({
        id: actionId,
        quest_id: questId,
        milestone_id: group.milestone.id,
        title: a.title,
        description: null,
        status: a.status,
        owner_id: a.owner,
        created_by: a.owner ?? me.id,
        created_at: createdAt,
        updated_at: updatedAt,
      });
      if (actErr) {
        console.error(`  Failed to insert action "${a.title}":`, actErr.message);
        process.exit(1);
      }

      allActionsFlat.push({ id: actionId, ...a, milestoneId: group.milestone.id });
    }
  }

  // Add the blocked action separately
  const { error: blkErr } = await supabase.from('actions').insert({
    id: blockedActionId,
    quest_id: questId,
    milestone_id: blockedMilestone.id,
    title: 'WebSocket reconnection handling',
    description: null,
    status: 'blocked',
    owner_id: teamIds[2],
    created_by: teamIds[2],
    created_at: daysAgo(20),
    updated_at: daysAgo(5),
  });
  if (blkErr) {
    console.error('  Failed to insert blocked action:', blkErr.message);
    process.exit(1);
  }
  allActionsFlat.push({
    id: blockedActionId,
    title: 'WebSocket reconnection handling',
    owner: teamIds[2],
    status: 'blocked',
    milestoneId: blockedMilestone.id,
    created: daysAgo(20),
    daysToComplete: null,
  });

  console.log(`Created ${allActionsFlat.length} actions`);

  // 8. Create events to drive health calculation
  //    Events are the primary fuel for engagement scores and activity timeline.
  //    Spread events across all 5 months with all team members participating.

  const eventTypes = [
    'QUEST_CREATED', 'MILESTONE_CREATED', 'MILESTONE_COMPLETED',
    'ACTION_CREATED', 'ACTION_COMPLETED', 'ACTION_CLAIMED',
    'ACTION_BLOCKED', 'MEMBER_JOINED',
  ];

  const eventMetadata = (entity, changes = {}) => ({
    version: 1,
    entitySnapshot: {
      title: entity.title ?? '',
      status: entity.status ?? '',
    },
    changes,
    actor: {},
  });

  const events = [];

  // Quest created event
  events.push({
    quest_id: questId,
    actor_id: me.id,
    entity_type: 'QUEST',
    entity_id: questId,
    event_type: 'QUEST_CREATED',
    metadata: JSON.stringify(eventMetadata({ title: demoTitle, status: 'draft' }, { title: demoTitle })),
    created_at: questCreated,
  });

  // Member joined events
  for (let i = 0; i < allMembers.length; i++) {
    events.push({
      quest_id: questId,
      actor_id: allMembers[i],
      entity_type: 'MEMBER',
      entity_id: allMembers[i],
      event_type: 'MEMBER_JOINED',
      metadata: JSON.stringify(eventMetadata({ name: team[i]?.name ?? me.name }, { role: memberRoles[i] })),
      created_at: questCreated,
    });
  }

  // Milestone creation events
  for (const ms of milestones) {
    events.push({
      quest_id: questId,
      actor_id: ms.created_by,
      entity_type: 'MILESTONE',
      entity_id: ms.id,
      event_type: 'MILESTONE_CREATED',
      metadata: JSON.stringify(eventMetadata({ title: ms.title, status: ms.status })),
      created_at: ms.created_at,
    });

    // Completed milestones also get completion events
    if (ms.status === 'completed') {
      events.push({
        quest_id: questId,
        actor_id: ms.created_by,
        entity_type: 'MILESTONE',
        entity_id: ms.id,
        event_type: 'MILESTONE_COMPLETED',
        metadata: JSON.stringify(eventMetadata({ title: ms.title, status: 'completed' }, { status: 'completed' })),
        created_at: daysAgo(Math.round((Date.now() - new Date(ms.created_at).getTime()) / 86400000) - 2),
      });
    }
  }

  // Action creation and completion events
  for (const a of allActionsFlat) {
    events.push({
      quest_id: questId,
      actor_id: a.owner ?? me.id,
      entity_type: 'ACTION',
      entity_id: a.id,
      event_type: 'ACTION_CREATED',
      metadata: JSON.stringify(eventMetadata({ title: a.title, status: 'open' })),
      created_at: a.created,
    });

    if (a.owner) {
      events.push({
        quest_id: questId,
        actor_id: a.owner,
        entity_type: 'ACTION',
        entity_id: a.id,
        event_type: 'ACTION_CLAIMED',
        metadata: JSON.stringify(eventMetadata({ title: a.title, status: 'open' }, { owner_id: a.owner })),
        created_at: new Date(new Date(a.created).getTime() + 3600000).toISOString(), // 1 hour later
      });
    }

    if (a.status === 'completed') {
      events.push({
        quest_id: questId,
        actor_id: a.owner ?? me.id,
        entity_type: 'ACTION',
        entity_id: a.id,
        event_type: 'ACTION_COMPLETED',
        metadata: JSON.stringify(eventMetadata({ title: a.title, status: 'completed' }, { status: 'completed' })),
        created_at: a.daysToComplete
          ? daysAgo(Math.round((Date.now() - new Date(a.created).getTime()) / 86400000) - a.daysToComplete)
          : new Date(new Date(a.created).getTime() + 86400000 * 3).toISOString(),
      });
    }
  }

  // Blocked action event
  events.push({
    quest_id: questId,
    actor_id: teamIds[2],
    entity_type: 'ACTION',
    entity_id: blockedActionId,
    event_type: 'ACTION_BLOCKED',
    metadata: JSON.stringify(eventMetadata({ title: 'WebSocket reconnection handling', status: 'blocked' }, { status: 'blocked' })),
    created_at: daysAgo(5),
  });

  // Sprinkle in recent events for good engagement recency
  // Add a few small events in the last 2 days
  for (let i = 0; i < 5; i++) {
    const actorIdx = i % allMembers.length;
    events.push({
      quest_id: questId,
      actor_id: allMembers[actorIdx],
      entity_type: 'QUEST',
      entity_id: questId,
      event_type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      metadata: JSON.stringify({ version: 1, entitySnapshot: {}, changes: {}, actor: {} }),
      created_at: hoursAgo(i * 6),
    });
  }

  // Batch insert events in chunks of 100
  const CHUNK = 100;
  for (let i = 0; i < events.length; i += CHUNK) {
    const chunk = events.slice(i, i + CHUNK);
    const { error: evErr } = await supabase.from('events').insert(chunk);
    if (evErr) {
      console.error('  Failed to insert events chunk:', evErr.message);
      // Continue — some events may have been inserted
    }
  }

  console.log(`Created ${events.length} events across 5 months`);
  console.log(`\n✅ Demo quest "${demoTitle}" is ready!`);
  console.log(`   Quest ID: ${questId}`);
  console.log(`   View at: /quests/${questId}`);
}

function hoursAgo(n) {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d.toISOString();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
