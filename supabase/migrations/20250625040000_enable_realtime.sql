-- Surge: Sprint 6 — Enable Realtime for events table
-- Allows Supabase Realtime to broadcast event INSERTs

ALTER PUBLICATION supabase_realtime ADD TABLE events;
