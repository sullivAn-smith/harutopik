alter table public.exam_sets
  add column if not exists previewed_at timestamptz;

create table if not exists public.exam_revisions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exam_sets(id) on delete cascade,
  version integer not null,
  status text not null,
  snapshot jsonb not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (exam_id, version)
);

create index if not exists exam_revisions_exam_version_idx
  on public.exam_revisions(exam_id, version desc);

alter table public.exam_revisions enable row level security;
create policy "Exam staff read revision history" on public.exam_revisions for select to authenticated
using (exists(select 1 from public.exam_sets e where e.id=exam_id and (e.created_by=(select auth.uid()) or public.has_app_role(array['admin']::public.app_role[]))));
revoke all on public.exam_revisions from anon, authenticated;
grant all privileges on public.exam_revisions to service_role;

create or replace function public.record_exam_revision(p_exam_id uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare target public.exam_sets; next_version integer;
begin
  select * into target from public.exam_sets where id=p_exam_id for update;
  if target.id is null then raise exception 'EXAM_NOT_FOUND'; end if;
  if target.created_by<>auth.uid() and not public.has_app_role(array['admin']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  select coalesce(max(version),0)+1 into next_version from public.exam_revisions where exam_id=p_exam_id;
  insert into public.exam_revisions(exam_id,version,status,snapshot,created_by)
  values(p_exam_id,next_version,target.status,jsonb_build_object(
    'exam',to_jsonb(target)-'created_by'-'reviewed_by',
    'questions',(select coalesce(jsonb_agg(to_jsonb(q) order by q.section,q.position),'[]'::jsonb) from public.exam_questions q where q.exam_id=p_exam_id)
  ),auth.uid());
  update public.exam_sets set previewed_at=null where id=p_exam_id;
  return next_version;
end $$;

create or replace function public.mark_exam_previewed(p_exam_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  update public.exam_sets set previewed_at=now()
  where id=p_exam_id and (created_by=auth.uid() or public.has_app_role(array['admin']::public.app_role[]));
  if not found then raise exception 'EXAM_NOT_FOUND'; end if;
end $$;

create or replace function public.submit_exam_for_review(p_exam_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare target public.exam_sets; listening_count integer; reading_count integer; invalid_count integer;
begin
  select * into target from public.exam_sets where id=p_exam_id for update;
  if target.id is null then raise exception 'EXAM_NOT_FOUND'; end if;
  if target.created_by<>auth.uid() and not public.has_app_role(array['admin']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if target.status not in ('draft','changes_requested') then raise exception 'INVALID_STATUS'; end if;
  if target.previewed_at is null or target.previewed_at<target.updated_at then raise exception 'PREVIEW_REQUIRED'; end if;
  select count(*) filter(where section='listening'),count(*) filter(where section='reading'),
    count(*) filter(where jsonb_array_length(options)<>4 or exists(select 1 from jsonb_array_elements_text(options) o where nullif(trim(o),'') is null))
  into listening_count,reading_count,invalid_count from public.exam_questions where exam_id=p_exam_id;
  if listening_count=0 or reading_count=0 or invalid_count>0 then raise exception 'EXAM_NOT_READY'; end if;
  update public.exam_sets set status='pending_review',updated_at=now() where id=p_exam_id;
end $$;

grant execute on function public.record_exam_revision(uuid) to authenticated;
grant execute on function public.mark_exam_previewed(uuid) to authenticated;
