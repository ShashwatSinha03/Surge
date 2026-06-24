-- Surge: Sprint 3 Schema
-- milestones, actions, state machine enums, RLS

CREATE TYPE milestone_status AS ENUM ('open', 'completed');

CREATE TYPE action_status AS ENUM ('open', 'claimed', 'blocked', 'completed');

CREATE TABLE milestones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id    UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  status      milestone_status NOT NULL DEFAULT 'open',
  position    INTEGER NOT NULL,
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_milestones_quest ON milestones (quest_id, position);

CREATE TABLE actions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id      UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  milestone_id  UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  status        action_status NOT NULL DEFAULT 'open',
  owner_id      UUID REFERENCES users(id),
  created_by    UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_actions_milestone ON actions (milestone_id);
CREATE INDEX idx_actions_quest ON actions (quest_id);
CREATE INDEX idx_actions_owner ON actions (owner_id);

CREATE TRIGGER set_actions_updated_at
  BEFORE UPDATE ON actions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;

-- Quest members can view milestones
CREATE POLICY "milestones_select_members" ON milestones
  FOR SELECT
  USING (
    quest_id IN (
      SELECT quest_members.quest_id FROM quest_members
      WHERE user_id = (
        SELECT id FROM users
        WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      )
    )
  );

-- Quest members can view actions
CREATE POLICY "actions_select_members" ON actions
  FOR SELECT
  USING (
    quest_id IN (
      SELECT quest_members.quest_id FROM quest_members
      WHERE user_id = (
        SELECT id FROM users
        WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      )
    )
  );
