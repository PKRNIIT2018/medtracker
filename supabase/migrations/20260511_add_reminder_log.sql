-- Track reminder dispatch attempts for observability and deduplication
CREATE TABLE IF NOT EXISTS reminder_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type     CITEXT NOT NULL CHECK (reminder_type IN ('medication', 'sugar', 'water')),
  status            CITEXT NOT NULL CHECK (status IN ('sent', 'failed', 'skipped', 'duplicate')),
  push_subscription_id UUID REFERENCES push_subscriptions(id) ON DELETE SET NULL,
  error_message     VARCHAR(500),
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminder_log_user_sent ON reminder_log (user_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_reminder_log_sent_at   ON reminder_log (sent_at);

ALTER TABLE reminder_log ENABLE ROW LEVEL SECURITY;

-- Service role writes logs, users can read their own
DROP POLICY IF EXISTS "user_reminder_log_read" ON reminder_log;
CREATE POLICY "user_reminder_log_read"
  ON reminder_log
  FOR SELECT
  USING (user_id = auth.uid());
