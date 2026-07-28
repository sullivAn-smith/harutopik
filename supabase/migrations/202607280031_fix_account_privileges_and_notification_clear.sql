grant all privileges
on public.account_management, public.role_change_history, public.notifications
to service_role;

grant usage, select
on all sequences in schema public
to service_role;

grant delete
on public.notifications
to authenticated;

create policy "Users delete own notifications"
on public.notifications for delete
using ((select auth.uid()) = user_id);
