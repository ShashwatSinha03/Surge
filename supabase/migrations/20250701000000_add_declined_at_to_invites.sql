ALTER TABLE invites ADD COLUMN declined_at TIMESTAMPTZ;

DROP INDEX IF EXISTS idx_invites_active_email;

CREATE UNIQUE INDEX idx_invites_active_email
  ON invites (quest_id, email)
  WHERE email IS NOT NULL
    AND accepted_at IS NULL
    AND revoked_at IS NULL
    AND declined_at IS NULL;
