-- The server-side Supabase client runs as service_role. It bypasses RLS, but
-- PostgreSQL table privileges are still required for PostgREST requests.
-- Keep this grant intentionally narrow: admin reads configuration/streaks and
-- manages banner schedules; streak mutations still go through RPC functions.
grant select on public.streak_settings to service_role;
grant select on public.user_streaks to service_role;
grant select, insert, update, delete on public.streak_banner_campaigns to service_role;
