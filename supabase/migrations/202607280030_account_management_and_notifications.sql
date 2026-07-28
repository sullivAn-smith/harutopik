create table public.account_management (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_locked boolean not null default false,
  locked_at timestamptz,
  locked_by uuid references auth.users(id),
  lock_reason text,
  updated_at timestamptz not null default now()
);

create table public.role_change_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  previous_roles public.app_role[] not null default '{}',
  new_role public.app_role not null,
  changed_by uuid not null references auth.users(id),
  reason text not null,
  changed_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in (
    'content_submitted',
    'content_approved',
    'content_changes_requested'
  )),
  title text not null,
  message text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index role_change_history_user_idx
  on public.role_change_history (user_id, changed_at desc);
create index notifications_user_unread_idx
  on public.notifications (user_id, read_at, created_at desc);

alter table public.account_management enable row level security;
alter table public.role_change_history enable row level security;
alter table public.notifications enable row level security;

create policy "Admins read account management"
on public.account_management for select
using (public.has_app_role(array['admin']::public.app_role[]));

create policy "Admins read role history"
on public.role_change_history for select
using (public.has_app_role(array['admin']::public.app_role[]));

create policy "Users read own notifications"
on public.notifications for select
using ((select auth.uid()) = user_id);

create policy "Users update own notifications"
on public.notifications for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select on public.account_management, public.role_change_history to authenticated;
grant select, update on public.notifications to authenticated;

create function public.set_user_primary_role(
  p_user_id uuid,
  p_role public.app_role,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  old_roles public.app_role[];
  admin_count integer;
begin
  if not public.has_app_role(array['admin']::public.app_role[]) then
    raise exception 'insufficient_privilege';
  end if;
  if p_role not in ('learner', 'content_editor', 'admin') then
    raise exception 'unsupported_primary_role';
  end if;
  if char_length(trim(p_reason)) < 3 then
    raise exception 'role_change_reason_required';
  end if;

  perform pg_advisory_xact_lock(hashtext('harutopik-role-management'));
  select coalesce(array_agg(role order by role::text), '{}'::public.app_role[])
  into old_roles
  from public.user_roles
  where user_id = p_user_id;

  if 'admin'::public.app_role = any(old_roles) and p_role <> 'admin' then
    select count(distinct user_id) into admin_count
    from public.user_roles where role = 'admin';
    if admin_count <= 1 then
      raise exception 'cannot_remove_last_admin';
    end if;
  end if;

  delete from public.user_roles where user_id = p_user_id;
  insert into public.user_roles (user_id, role, granted_by)
  values (p_user_id, p_role, actor_id);

  insert into public.role_change_history (
    user_id, previous_roles, new_role, changed_by, reason
  ) values (
    p_user_id, old_roles, p_role, actor_id, trim(p_reason)
  );
end;
$$;

revoke all on function public.set_user_primary_role(uuid, public.app_role, text) from public;
grant execute on function public.set_user_primary_role(uuid, public.app_role, text) to authenticated;
