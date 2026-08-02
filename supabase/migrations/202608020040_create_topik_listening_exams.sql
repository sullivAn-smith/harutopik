create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exam-audio', 'exam-audio', true, 15728640,
  array['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table public.exam_sets (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  title text not null check (char_length(trim(title)) between 3 and 160),
  description text not null default '',
  level text not null default 'topik_i' check (level in ('topik_i', 'topik_ii')),
  duration_minutes integer not null default 40 check (duration_minutes between 1 and 180),
  instructions text not null default '',
  status text not null default 'draft' check (
    status in ('draft','pending_review','changes_requested','approved','published','unpublished','archived')
  ),
  version integer not null default 1 check (version > 0),
  created_by uuid not null default auth.uid() references auth.users(id),
  reviewed_by uuid references auth.users(id),
  review_note text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exam_sets(id) on delete cascade,
  position integer not null check (position > 0),
  section text not null default 'listening' check (section in ('listening','reading')),
  instruction text not null default '',
  prompt text not null default '',
  audio_url text,
  audio_text text,
  image_url text,
  play_limit integer not null default 1 check (play_limit between 1 and 10),
  options jsonb not null check (
    jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4
  ),
  correct_option smallint not null check (correct_option between 1 and 4),
  explanation text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_id, position)
);

create table public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exam_sets(id),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress','submitted','expired')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  current_position integer not null default 1 check (current_position > 0),
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  flagged jsonb not null default '[]'::jsonb check (jsonb_typeof(flagged) = 'array'),
  question_snapshot jsonb not null check (jsonb_typeof(question_snapshot) = 'array'),
  score integer,
  correct_count integer,
  total_questions integer not null check (total_questions > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index exam_sets_status_updated_idx on public.exam_sets(status, updated_at desc);
create index exam_sets_owner_updated_idx on public.exam_sets(created_by, updated_at desc);
create index exam_questions_exam_position_idx on public.exam_questions(exam_id, position);
create index exam_attempts_user_created_idx on public.exam_attempts(user_id, created_at desc);

alter table public.exam_sets enable row level security;
alter table public.exam_questions enable row level security;
alter table public.exam_attempts enable row level security;

create policy "Published exam metadata is readable"
on public.exam_sets for select
using (
  status = 'published'
  or created_by = (select auth.uid())
  or public.has_app_role(array['admin']::public.app_role[])
);

create policy "Editors create own exams"
on public.exam_sets for insert to authenticated
with check (
  created_by = (select auth.uid())
  and status = 'draft'
  and public.has_app_role(array['content_editor','admin']::public.app_role[])
);

create policy "Owners and admins update exams"
on public.exam_sets for update to authenticated
using (
  (created_by = (select auth.uid()) and status in ('draft','changes_requested'))
  or public.has_app_role(array['admin']::public.app_role[])
)
with check (
  created_by = (select auth.uid())
  or public.has_app_role(array['admin']::public.app_role[])
);

create policy "Staff reads exam questions"
on public.exam_questions for select to authenticated
using (
  exists (
    select 1 from public.exam_sets e
    where e.id = exam_id and (
      e.created_by = (select auth.uid())
      or public.has_app_role(array['admin']::public.app_role[])
    )
  )
);

create policy "Owners and admins manage exam questions"
on public.exam_questions for all to authenticated
using (
  exists (
    select 1 from public.exam_sets e
    where e.id = exam_id and (
      (e.created_by = (select auth.uid()) and e.status in ('draft','changes_requested'))
      or public.has_app_role(array['admin']::public.app_role[])
    )
  )
)
with check (
  exists (
    select 1 from public.exam_sets e
    where e.id = exam_id and (
      (e.created_by = (select auth.uid()) and e.status in ('draft','changes_requested'))
      or public.has_app_role(array['admin']::public.app_role[])
    )
  )
);

create policy "Learners read own attempts"
on public.exam_attempts for select to authenticated
using (user_id = (select auth.uid()) or public.has_app_role(array['admin']::public.app_role[]));

create policy "Learners create own attempts"
on public.exam_attempts for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "Learners update active attempts"
on public.exam_attempts for update to authenticated
using (user_id = (select auth.uid()) and status = 'in_progress')
with check (user_id = (select auth.uid()));

create policy "Content staff uploads exam audio"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'exam-audio'
  and public.has_app_role(array['content_editor','admin']::public.app_role[])
);

create policy "Content staff updates exam audio"
on storage.objects for update to authenticated
using (
  bucket_id = 'exam-audio'
  and public.has_app_role(array['content_editor','admin']::public.app_role[])
)
with check (
  bucket_id = 'exam-audio'
  and public.has_app_role(array['content_editor','admin']::public.app_role[])
);

create policy "Content staff deletes exam audio"
on storage.objects for delete to authenticated
using (
  bucket_id = 'exam-audio'
  and public.has_app_role(array['content_editor','admin']::public.app_role[])
);

grant select, insert, update on public.exam_sets, public.exam_questions to authenticated;
grant delete on public.exam_questions to authenticated;
revoke all on public.exam_attempts from anon, authenticated;
grant all privileges on public.exam_sets, public.exam_questions, public.exam_attempts to service_role;

create or replace function public.save_exam_draft(p_exam_id uuid, p_exam jsonb, p_questions jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  target public.exam_sets;
  question jsonb;
begin
  select * into target from public.exam_sets where id = p_exam_id for update;
  if target.id is null then raise exception 'EXAM_NOT_FOUND'; end if;
  if target.created_by <> auth.uid() and not public.has_app_role(array['admin']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if target.status not in ('draft','changes_requested') and not public.has_app_role(array['admin']::public.app_role[]) then raise exception 'INVALID_STATUS'; end if;

  update public.exam_sets set
    code = trim(p_exam->>'code'), title = trim(p_exam->>'title'),
    description = coalesce(trim(p_exam->>'description'), ''),
    duration_minutes = (p_exam->>'durationMinutes')::integer,
    instructions = coalesce(trim(p_exam->>'instructions'), ''), updated_at = now()
  where id = p_exam_id;

  delete from public.exam_questions where exam_id = p_exam_id;
  for question in select value from jsonb_array_elements(coalesce(p_questions, '[]'::jsonb)) loop
    insert into public.exam_questions (
      exam_id, position, section, instruction, prompt, audio_url, audio_text,
      image_url, play_limit, options, correct_option, explanation
    ) values (
      p_exam_id, (question->>'position')::integer, 'listening',
      coalesce(trim(question->>'instruction'), ''), coalesce(trim(question->>'prompt'), ''),
      nullif(trim(question->>'audioUrl'), ''), nullif(trim(question->>'audioText'), ''),
      nullif(trim(question->>'imageUrl'), ''), coalesce((question->>'playLimit')::integer, 1),
      question->'options', (question->>'correctOption')::smallint,
      coalesce(trim(question->>'explanation'), '')
    );
  end loop;
end $$;

create or replace function public.submit_exam_for_review(p_exam_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  target public.exam_sets;
  invalid_count integer;
begin
  select * into target from public.exam_sets where id = p_exam_id for update;
  if target.id is null then raise exception 'EXAM_NOT_FOUND'; end if;
  if target.created_by <> auth.uid() and not public.has_app_role(array['admin']::public.app_role[]) then
    raise exception 'FORBIDDEN';
  end if;
  if target.status not in ('draft','changes_requested') then raise exception 'INVALID_STATUS'; end if;
  select count(*) into invalid_count from public.exam_questions q
  where q.exam_id = p_exam_id and (
    q.section <> 'listening' or nullif(trim(q.audio_url), '') is null
    or jsonb_array_length(q.options) <> 4
  );
  if not exists(select 1 from public.exam_questions where exam_id = p_exam_id) or invalid_count > 0 then
    raise exception 'EXAM_NOT_READY';
  end if;
  update public.exam_sets set status = 'pending_review', updated_at = now() where id = p_exam_id;
end $$;

create or replace function public.review_exam(p_exam_id uuid, p_decision text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_app_role(array['admin']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if p_decision not in ('approved','changes_requested') then raise exception 'INVALID_DECISION'; end if;
  update public.exam_sets set
    status = p_decision,
    review_note = nullif(trim(p_note), ''),
    reviewed_by = auth.uid(),
    updated_at = now()
  where id = p_exam_id and status = 'pending_review';
  if not found then raise exception 'INVALID_STATUS'; end if;
end $$;

create or replace function public.publish_exam(p_exam_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_app_role(array['admin']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  update public.exam_sets set status = 'published', published_at = now(), updated_at = now()
  where id = p_exam_id and status = 'approved';
  if not found then raise exception 'INVALID_STATUS'; end if;
end $$;

create or replace function public.change_exam_release(p_exam_id uuid, p_action text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_app_role(array['admin']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if p_action = 'unpublish' then
    update public.exam_sets set status = 'unpublished', updated_at = now() where id = p_exam_id and status = 'published';
  elsif p_action = 'cancel_approval' then
    update public.exam_sets set status = 'pending_review', updated_at = now() where id = p_exam_id and status = 'approved';
  else raise exception 'INVALID_ACTION';
  end if;
  if not found then raise exception 'INVALID_STATUS'; end if;
end $$;

grant execute on function public.submit_exam_for_review(uuid) to authenticated;
grant execute on function public.review_exam(uuid,text,text) to authenticated;
grant execute on function public.publish_exam(uuid) to authenticated;
grant execute on function public.save_exam_draft(uuid,jsonb,jsonb) to authenticated;
grant execute on function public.change_exam_release(uuid,text) to authenticated;
