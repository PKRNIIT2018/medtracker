-- Enable pg_cron and pg_net for scheduled reminder dispatch
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the send-reminders edge function every 15 minutes
SELECT cron.schedule(
  'send-reminders',
  '*/15 * * * *',
  $$SELECT net.http_post(
    url:='https://fafihdtfjskvjjxebsmw.supabase.co/functions/v1/send-reminders',
    headers:='{"Content-Type":"application/json"}'::jsonb
  )$$
);
