alter table public.exam_sets
  add column if not exists listening_duration_minutes integer not null default 40
    check (listening_duration_minutes between 1 and 180),
  add column if not exists reading_duration_minutes integer not null default 60
    check (reading_duration_minutes between 1 and 180);

alter table public.exam_attempts
  add column if not exists exam_version integer not null default 1 check (exam_version > 0),
  add column if not exists current_section text not null default 'listening'
    check (current_section in ('listening','reading','completed')),
  add column if not exists listening_expires_at timestamptz,
  add column if not exists reading_expires_at timestamptz,
  add column if not exists audio_plays jsonb not null default '{}'::jsonb
    check (jsonb_typeof(audio_plays) = 'object'),
  add column if not exists window_leave_count integer not null default 0
    check (window_leave_count >= 0),
  add column if not exists listening_score integer check (listening_score between 0 and 100),
  add column if not exists reading_score integer check (reading_score between 0 and 100);

alter table public.exam_questions
  drop constraint if exists exam_questions_exam_id_position_key;
alter table public.exam_questions
  add constraint exam_questions_exam_section_position_key
  unique (exam_id, section, position);

create table if not exists public.exam_window_events (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  section text not null check (section in ('listening','reading')),
  event_type text not null check (event_type in ('hidden','blur','fullscreen_exit')),
  occurred_at timestamptz not null default now()
);

create index if not exists exam_window_events_attempt_time_idx
  on public.exam_window_events(attempt_id, occurred_at desc);

alter table public.exam_window_events enable row level security;

create policy "Learners read own exam window events"
on public.exam_window_events for select to authenticated
using (user_id = (select auth.uid()) or public.has_app_role(array['admin']::public.app_role[]));

revoke all on public.exam_window_events from anon, authenticated;
grant all privileges on public.exam_window_events to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exam-images', 'exam-images', true, 10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Content staff uploads exam images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'exam-images'
  and public.has_app_role(array['content_editor','admin']::public.app_role[])
);

create policy "Content staff updates exam images"
on storage.objects for update to authenticated
using (
  bucket_id = 'exam-images'
  and public.has_app_role(array['content_editor','admin']::public.app_role[])
)
with check (
  bucket_id = 'exam-images'
  and public.has_app_role(array['content_editor','admin']::public.app_role[])
);

create policy "Content staff deletes exam images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'exam-images'
  and public.has_app_role(array['content_editor','admin']::public.app_role[])
);

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
    code = trim(p_exam->>'code'),
    title = trim(p_exam->>'title'),
    description = coalesce(trim(p_exam->>'description'), ''),
    duration_minutes = (p_exam->>'listeningDurationMinutes')::integer + (p_exam->>'readingDurationMinutes')::integer,
    listening_duration_minutes = (p_exam->>'listeningDurationMinutes')::integer,
    reading_duration_minutes = (p_exam->>'readingDurationMinutes')::integer,
    instructions = coalesce(trim(p_exam->>'instructions'), ''),
    updated_at = now()
  where id = p_exam_id;

  delete from public.exam_questions where exam_id = p_exam_id;
  for question in select value from jsonb_array_elements(coalesce(p_questions, '[]'::jsonb)) loop
    insert into public.exam_questions (
      exam_id, position, section, instruction, prompt, audio_url, audio_text,
      image_url, play_limit, options, correct_option, explanation
    ) values (
      p_exam_id,
      (question->>'position')::integer,
      question->>'section',
      coalesce(trim(question->>'instruction'), ''),
      coalesce(trim(question->>'prompt'), ''),
      nullif(trim(question->>'audioUrl'), ''),
      nullif(trim(question->>'audioText'), ''),
      nullif(trim(question->>'imageUrl'), ''),
      case when question->>'section' = 'listening' then 1 else 1 end,
      question->'options',
      (question->>'correctOption')::smallint,
      coalesce(trim(question->>'explanation'), '')
    );
  end loop;
end $$;

create or replace function public.submit_exam_for_review(p_exam_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  target public.exam_sets;
  listening_count integer;
  reading_count integer;
  invalid_count integer;
begin
  select * into target from public.exam_sets where id = p_exam_id for update;
  if target.id is null then raise exception 'EXAM_NOT_FOUND'; end if;
  if target.created_by <> auth.uid() and not public.has_app_role(array['admin']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if target.status not in ('draft','changes_requested') then raise exception 'INVALID_STATUS'; end if;

  select
    count(*) filter (where section = 'listening'),
    count(*) filter (where section = 'reading'),
    count(*) filter (
      where jsonb_array_length(options) <> 4
        or (section = 'listening' and nullif(trim(audio_url), '') is null)
    )
  into listening_count, reading_count, invalid_count
  from public.exam_questions where exam_id = p_exam_id;

  if listening_count = 0 or reading_count = 0 or invalid_count > 0 then
    raise exception 'EXAM_NOT_READY';
  end if;
  update public.exam_sets set status = 'pending_review', updated_at = now() where id = p_exam_id;
end $$;

create or replace function public.consume_exam_audio_play(p_attempt_id uuid, p_question_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  target public.exam_attempts;
  question jsonb;
  used integer;
begin
  select * into target from public.exam_attempts where id = p_attempt_id for update;
  if target.id is null or target.user_id <> auth.uid() then raise exception 'ATTEMPT_NOT_FOUND'; end if;
  if target.status <> 'in_progress' or target.current_section <> 'listening' then raise exception 'INVALID_SECTION'; end if;
  if target.listening_expires_at is null or target.listening_expires_at <= now() then raise exception 'SECTION_EXPIRED'; end if;

  select value into question from jsonb_array_elements(target.question_snapshot)
  where value->>'id' = p_question_id::text and value->>'section' = 'listening';
  if question is null then raise exception 'QUESTION_NOT_FOUND'; end if;
  if (question->>'position')::integer <> target.current_position then raise exception 'QUESTION_LOCKED'; end if;
  used := coalesce((target.audio_plays->>p_question_id::text)::integer, 0);
  if used >= 1 then raise exception 'PLAY_LIMIT_REACHED'; end if;

  update public.exam_attempts
  set audio_plays = jsonb_set(audio_plays, array[p_question_id::text], to_jsonb(used + 1), true), updated_at = now()
  where id = p_attempt_id;
  return used + 1;
end $$;

create or replace function public.record_exam_window_event(p_attempt_id uuid, p_section text, p_event_type text)
returns integer language plpgsql security definer set search_path = public as $$
declare
  target public.exam_attempts;
begin
  select * into target from public.exam_attempts where id = p_attempt_id for update;
  if target.id is null or target.user_id <> auth.uid() then raise exception 'ATTEMPT_NOT_FOUND'; end if;
  if target.status <> 'in_progress' or target.current_section <> p_section then raise exception 'INVALID_SECTION'; end if;
  if p_event_type not in ('hidden','blur','fullscreen_exit') then raise exception 'INVALID_EVENT'; end if;

  if exists (
    select 1 from public.exam_window_events
    where attempt_id = p_attempt_id and occurred_at > now() - interval '2 seconds'
  ) then return target.window_leave_count; end if;

  insert into public.exam_window_events(attempt_id, user_id, section, event_type)
  values (p_attempt_id, auth.uid(), p_section, p_event_type);
  update public.exam_attempts set window_leave_count = window_leave_count + 1, updated_at = now()
  where id = p_attempt_id returning window_leave_count into target.window_leave_count;
  return target.window_leave_count;
end $$;

create or replace function public.hotfix_published_exam(p_exam_id uuid, p_exam jsonb, p_questions jsonb, p_reason text)
returns integer language plpgsql security definer set search_path = public as $$
declare
  target public.exam_sets;
  question jsonb;
  next_version integer;
begin
  if not public.has_app_role(array['admin']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'HOTFIX_REASON_REQUIRED'; end if;
  select * into target from public.exam_sets where id = p_exam_id for update;
  if target.id is null then raise exception 'EXAM_NOT_FOUND'; end if;
  if target.status <> 'published' then raise exception 'INVALID_STATUS'; end if;
  if not exists (select 1 from jsonb_array_elements(p_questions) q where q->>'section' = 'listening')
    or not exists (select 1 from jsonb_array_elements(p_questions) q where q->>'section' = 'reading') then
    raise exception 'EXAM_NOT_READY';
  end if;
  if exists (select 1 from jsonb_array_elements(p_questions) q where q->>'section' = 'listening' and nullif(trim(q->>'audioUrl'), '') is null) then
    raise exception 'EXAM_NOT_READY';
  end if;

  next_version := target.version + 1;
  update public.exam_sets set
    code = trim(p_exam->>'code'), title = trim(p_exam->>'title'),
    description = coalesce(trim(p_exam->>'description'), ''),
    listening_duration_minutes = (p_exam->>'listeningDurationMinutes')::integer,
    reading_duration_minutes = (p_exam->>'readingDurationMinutes')::integer,
    duration_minutes = (p_exam->>'listeningDurationMinutes')::integer + (p_exam->>'readingDurationMinutes')::integer,
    instructions = coalesce(trim(p_exam->>'instructions'), ''),
    version = next_version, updated_at = now()
  where id = p_exam_id;
  delete from public.exam_questions where exam_id = p_exam_id;
  for question in select value from jsonb_array_elements(p_questions) loop
    insert into public.exam_questions(exam_id,position,section,instruction,prompt,audio_url,audio_text,image_url,play_limit,options,correct_option,explanation)
    values (p_exam_id,(question->>'position')::integer,question->>'section',coalesce(trim(question->>'instruction'),''),coalesce(trim(question->>'prompt'),''),nullif(trim(question->>'audioUrl'),''),nullif(trim(question->>'audioText'),''),nullif(trim(question->>'imageUrl'),''),1,question->'options',(question->>'correctOption')::smallint,coalesce(trim(question->>'explanation'),''));
  end loop;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values (auth.uid(),'exam.hotfix_applied','exam',p_exam_id::text,jsonb_build_object('previous_version',target.version,'version',next_version,'reason',trim(p_reason)));
  return next_version;
end $$;

grant execute on function public.consume_exam_audio_play(uuid,uuid) to authenticated;
grant execute on function public.record_exam_window_event(uuid,text,text) to authenticated;
grant execute on function public.hotfix_published_exam(uuid,jsonb,jsonb,text) to authenticated;
