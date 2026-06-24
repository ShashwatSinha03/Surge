-- Surge: Sprint 1 Schema
-- users, quests, quest_members

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums

CREATE TYPE template_type AS ENUM (
  'saas', 'hackathon', 'portfolio', 'mobile_app', 'open_source', 'custom'
);

CREATE TYPE quest_state AS ENUM (
  'draft', 'active', 'paused', 'completed', 'archived', 'deleted'
);

CREATE TYPE member_role AS ENUM (
  'owner', 'admin', 'member'
);

-- Users

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_clerk_id ON users (clerk_user_id);

-- Quests

CREATE TABLE quests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  template_type template_type NOT NULL,
  owner_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        quest_state NOT NULL DEFAULT 'draft',
  health_score  DECIMAL(5,2) CHECK (health_score IS NULL OR (health_score >= 0 AND health_score <= 100)),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quests_owner ON quests (owner_id);
CREATE INDEX idx_quests_status ON quests (status);
CREATE INDEX idx_quests_updated ON quests (updated_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_quests_updated_at
  BEFORE UPDATE ON quests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Quest Members

CREATE TABLE quest_members (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id  UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      member_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(quest_id, user_id)
);

CREATE INDEX idx_members_quest ON quest_members (quest_id);
CREATE INDEX idx_members_user ON quest_members (user_id);

-- Row Level Security

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own" ON users
  FOR SELECT
  USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "users_insert_service" ON users
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "quests_read_members" ON quests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quest_members
      WHERE quest_members.quest_id = quests.id
        AND quest_members.user_id = (
          SELECT id FROM users WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    )
    OR owner_id = (
      SELECT id FROM users WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY "members_read_members" ON quest_members
  FOR SELECT
  USING (
    quest_id IN (
      SELECT quest_members.quest_id FROM quest_members
      WHERE user_id = (
        SELECT id FROM users WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      )
    )
  );
