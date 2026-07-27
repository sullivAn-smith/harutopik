create type public.app_role as enum (
  'learner', 'content_editor', 'content_reviewer',
  'support_agent', 'billing_admin', 'admin'
);

create type public.content_workflow_status as enum (
  'draft', 'in_review', 'approved', 'published', 'archived'
);

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.content_revisions (
  id uuid primary key default gen_random_uuid(),
  content_id text not null,
  content_type text not null check (content_type in ('course', 'module', 'lesson')),
  version integer not null check (version > 0),
  status public.content_workflow_status not null default 'draft',
  payload jsonb not null,
  change_summary text not null default '',
  created_by uuid not null references auth.users(id),
  reviewed_by uuid references auth.users(id),
  published_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique (content_id, version)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index content_revisions_workflow_idx on public.content_revisions (status, updated_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, occurred_at desc);

create function public.has_app_role(required_roles public.app_role[])
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = any(required_roles)
  );
$$;

revoke all on function public.has_app_role(public.app_role[]) from public;
grant execute on function public.has_app_role(public.app_role[]) to authenticated;

alter table public.user_roles enable row level security;
alter table public.content_revisions enable row level security;
alter table public.audit_logs enable row level security;

create policy "Users read their own roles" on public.user_roles for select
using ((select auth.uid()) = user_id);

create policy "Admins manage roles" on public.user_roles for all
using (public.has_app_role(array['admin']::public.app_role[]))
with check (public.has_app_role(array['admin']::public.app_role[]));

create policy "Content staff read revisions" on public.content_revisions for select
using (public.has_app_role(array['content_editor','content_reviewer','admin']::public.app_role[]));

create policy "Editors create drafts" on public.content_revisions for insert
with check (
  created_by = (select auth.uid()) and status = 'draft'
  and public.has_app_role(array['content_editor','admin']::public.app_role[])
);

create policy "Editors update and submit drafts" on public.content_revisions for update
using (
  status = 'draft'
  and public.has_app_role(array['content_editor']::public.app_role[])
)
with check (
  status in ('draft', 'in_review')
  and public.has_app_role(array['content_editor']::public.app_role[])
);

create policy "Reviewers approve submitted content" on public.content_revisions for update
using (
  status = 'in_review'
  and public.has_app_role(array['content_reviewer']::public.app_role[])
)
with check (
  status in ('in_review', 'approved')
  and public.has_app_role(array['content_reviewer']::public.app_role[])
);

create policy "Admins manage content workflow" on public.content_revisions for update
using (public.has_app_role(array['admin']::public.app_role[]))
with check (public.has_app_role(array['admin']::public.app_role[]));

create policy "Admins read audit logs" on public.audit_logs for select
using (public.has_app_role(array['admin']::public.app_role[]));

insert into public.user_roles (user_id, role)
select id, 'learner'::public.app_role from auth.users on conflict do nothing;

create function public.handle_new_user_role()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'learner'::public.app_role) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_role_created
after insert on auth.users
for each row execute procedure public.handle_new_user_role();
