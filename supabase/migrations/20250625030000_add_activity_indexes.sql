-- Surge: Sprint 5 — Activity Intelligence indexes
-- Improves cursor-paginated activity queries with type filtering

CREATE INDEX IF NOT EXISTS idx_events_quest_type_time
  ON events (quest_id, event_type, created_at DESC);

-- Supports milestone status calculation queries
CREATE INDEX IF NOT EXISTS idx_actions_milestone_status
  ON actions (milestone_id, status);
