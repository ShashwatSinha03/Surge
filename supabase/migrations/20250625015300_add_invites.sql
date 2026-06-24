-- Surge: Sprint 2 Schema
-- invites table with token security, RLS, and unique active constraint

CREATE TABLE invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id    UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  email       TEXT,
  token_hash  TEXT NOT NULL UNIQUE,
  invited_by  UUID NOT NULL REFERENCES users(id),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invites_quest ON invites (quest_id);
CREATE INDEX idx_invites_token_hash ON invites (token_hash);
CREATE INDEX idx_invites_expires ON invites (expires_at);

-- Prevent duplicate active invites for the same email within a quest.
-- An invite is "active" when not accepted and not revoked.
-- Expiration is enforced at the application level (NOW() is not IMMUTABLE).
CREATE UNIQUE INDEX idx_invites_active_email
  ON invites (quest_id, email)
  WHERE email IS NOT NULL
    AND accepted_at IS NULL
    AND revoked_at IS NULL;

-- Row Level Security
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Quest members can view invites for their quest
CREATE POLICY "invites_select_members" ON invites
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
