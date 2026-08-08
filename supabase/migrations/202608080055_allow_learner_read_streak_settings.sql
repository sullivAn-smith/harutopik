-- Streak reward rules are public product behaviour, not sensitive account data.
-- Learners need read access so the help panel always reflects the active admin rule.
drop policy if exists "Admins read streak settings" on public.streak_settings;
drop policy if exists "Authenticated users read streak settings" on public.streak_settings;

create policy "Authenticated users read streak settings"
on public.streak_settings for select
to authenticated
using (true);
