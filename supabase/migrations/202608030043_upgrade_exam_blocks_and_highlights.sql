alter table public.exam_questions
  add column if not exists audio_block_key text,
  add column if not exists answer_type text not null default 'text'
    check (answer_type in ('text', 'image')),
  add column if not exists option_images jsonb not null default '["", "", "", ""]'::jsonb
    check (jsonb_typeof(option_images) = 'array' and jsonb_array_length(option_images) = 4);

create table if not exists public.exam_highlights (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  question_id uuid not null,
  section text not null check (section in ('listening', 'reading')),
  source_field text not null check (source_field in ('instruction', 'prompt', 'option')),
  source_index smallint,
  selected_text text not null check (char_length(trim(selected_text)) between 1 and 120),
  prefix_text text not null default '',
  suffix_text text not null default '',
  color text not null default 'yellow' check (color in ('yellow', 'blue', 'pink')),
  created_at timestamptz not null default now()
);

create index if not exists exam_highlights_attempt_idx
  on public.exam_highlights(attempt_id, created_at);
create unique index if not exists exam_highlights_unique_selection_idx
  on public.exam_highlights(attempt_id, question_id, source_field, coalesce(source_index, -1), selected_text, prefix_text, suffix_text);

alter table public.exam_highlights enable row level security;
create policy "Learners manage own exam highlights"
on public.exam_highlights for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.exam_highlights to authenticated;
grant all privileges on public.exam_highlights to service_role;

create or replace function public.submit_exam_for_review(p_exam_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare target public.exam_sets; listening_count integer; reading_count integer; invalid_count integer;
begin
  select * into target from public.exam_sets where id=p_exam_id for update;
  if target.id is null then raise exception 'EXAM_NOT_FOUND'; end if;
  if target.created_by<>auth.uid() and not public.has_app_role(array['admin']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if target.status not in ('draft','changes_requested') then raise exception 'INVALID_STATUS'; end if;
  select
    count(*) filter(where section='listening'),
    count(*) filter(where section='reading'),
    count(*) filter(where jsonb_array_length(options)<>4
      or exists(select 1 from jsonb_array_elements_text(options) option_value where nullif(trim(option_value),'') is null)
      or (answer_type='image' and (
        jsonb_array_length(option_images)<>4
        or exists(select 1 from jsonb_array_elements_text(option_images) image_value where nullif(trim(image_value),'') is null)
      )))
  into listening_count,reading_count,invalid_count
  from public.exam_questions where exam_id=p_exam_id;
  if listening_count=0 or reading_count=0 or invalid_count>0 then raise exception 'EXAM_NOT_READY'; end if;
  update public.exam_sets set status='pending_review',review_note=null,updated_at=now() where id=p_exam_id;
end $$;

create or replace function public.save_exam_draft(p_exam_id uuid, p_exam jsonb, p_questions jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare target public.exam_sets; question jsonb;
begin
  select * into target from public.exam_sets where id = p_exam_id for update;
  if target.id is null then raise exception 'EXAM_NOT_FOUND'; end if;
  if target.created_by <> auth.uid() and not public.has_app_role(array['admin']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if target.status not in ('draft','changes_requested') and not public.has_app_role(array['admin']::public.app_role[]) then raise exception 'INVALID_STATUS'; end if;
  update public.exam_sets set
    code=trim(p_exam->>'code'), title=trim(p_exam->>'title'), description=coalesce(trim(p_exam->>'description'),''),
    duration_minutes=(p_exam->>'listeningDurationMinutes')::integer+(p_exam->>'readingDurationMinutes')::integer,
    listening_duration_minutes=(p_exam->>'listeningDurationMinutes')::integer,
    reading_duration_minutes=(p_exam->>'readingDurationMinutes')::integer,
    instructions=coalesce(trim(p_exam->>'instructions'),''), updated_at=now()
  where id=p_exam_id;
  delete from public.exam_questions where exam_id=p_exam_id;
  for question in select value from jsonb_array_elements(coalesce(p_questions,'[]'::jsonb)) loop
    insert into public.exam_questions(
      exam_id,position,section,audio_block_key,answer_type,instruction,prompt,audio_url,audio_text,
      image_url,play_limit,options,option_images,correct_option,explanation
    ) values (
      p_exam_id,(question->>'position')::integer,question->>'section',nullif(trim(question->>'audioBlockKey'),''),
      coalesce(nullif(question->>'answerType',''),'text'),coalesce(trim(question->>'instruction'),''),
      coalesce(trim(question->>'prompt'),''),nullif(trim(question->>'audioUrl'),''),nullif(trim(question->>'audioText'),''),
      nullif(trim(question->>'imageUrl'),''),1,question->'options',coalesce(question->'optionImages','["", "", "", ""]'::jsonb),
      (question->>'correctOption')::smallint,coalesce(trim(question->>'explanation'),'')
    );
  end loop;
end $$;

create or replace function public.hotfix_published_exam(p_exam_id uuid, p_exam jsonb, p_questions jsonb, p_reason text)
returns integer language plpgsql security definer set search_path = public as $$
declare target public.exam_sets; question jsonb; next_version integer;
begin
  if not public.has_app_role(array['admin']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if nullif(trim(p_reason),'') is null then raise exception 'HOTFIX_REASON_REQUIRED'; end if;
  select * into target from public.exam_sets where id=p_exam_id for update;
  if target.id is null then raise exception 'EXAM_NOT_FOUND'; end if;
  if target.status <> 'published' then raise exception 'INVALID_STATUS'; end if;
  if not exists(select 1 from jsonb_array_elements(p_questions) q where q->>'section'='listening')
    or not exists(select 1 from jsonb_array_elements(p_questions) q where q->>'section'='reading') then raise exception 'EXAM_NOT_READY'; end if;
  next_version:=target.version+1;
  update public.exam_sets set
    code=trim(p_exam->>'code'),title=trim(p_exam->>'title'),description=coalesce(trim(p_exam->>'description'),''),
    listening_duration_minutes=(p_exam->>'listeningDurationMinutes')::integer,
    reading_duration_minutes=(p_exam->>'readingDurationMinutes')::integer,
    duration_minutes=(p_exam->>'listeningDurationMinutes')::integer+(p_exam->>'readingDurationMinutes')::integer,
    instructions=coalesce(trim(p_exam->>'instructions'),''),version=next_version,updated_at=now()
  where id=p_exam_id;
  delete from public.exam_questions where exam_id=p_exam_id;
  for question in select value from jsonb_array_elements(p_questions) loop
    insert into public.exam_questions(
      exam_id,position,section,audio_block_key,answer_type,instruction,prompt,audio_url,audio_text,
      image_url,play_limit,options,option_images,correct_option,explanation
    ) values (
      p_exam_id,(question->>'position')::integer,question->>'section',nullif(trim(question->>'audioBlockKey'),''),
      coalesce(nullif(question->>'answerType',''),'text'),coalesce(trim(question->>'instruction'),''),
      coalesce(trim(question->>'prompt'),''),nullif(trim(question->>'audioUrl'),''),nullif(trim(question->>'audioText'),''),
      nullif(trim(question->>'imageUrl'),''),1,question->'options',coalesce(question->'optionImages','["", "", "", ""]'::jsonb),
      (question->>'correctOption')::smallint,coalesce(trim(question->>'explanation'),'')
    );
  end loop;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'exam.hotfix_applied','exam',p_exam_id::text,jsonb_build_object('previous_version',target.version,'version',next_version,'reason',trim(p_reason)));
  return next_version;
end $$;

create or replace function public.consume_exam_audio_play(p_attempt_id uuid, p_question_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare target public.exam_attempts; question jsonb; play_key text; used integer;
begin
  select * into target from public.exam_attempts where id=p_attempt_id for update;
  if target.id is null or target.user_id<>auth.uid() then raise exception 'ATTEMPT_NOT_FOUND'; end if;
  if target.status<>'in_progress' or target.current_section<>'listening' then raise exception 'INVALID_SECTION'; end if;
  if target.listening_expires_at is null or target.listening_expires_at<=now() then raise exception 'SECTION_EXPIRED'; end if;
  select value into question from jsonb_array_elements(target.question_snapshot)
    where value->>'id'=p_question_id::text and value->>'section'='listening';
  if question is null then raise exception 'QUESTION_NOT_FOUND'; end if;
  if (question->>'position')::integer<>target.current_position then raise exception 'QUESTION_LOCKED'; end if;
  play_key:=coalesce(nullif(question->>'audio_block_key',''),p_question_id::text);
  used:=coalesce((target.audio_plays->>play_key)::integer,0);
  if used>=1 then raise exception 'PLAY_LIMIT_REACHED'; end if;
  update public.exam_attempts set audio_plays=jsonb_set(audio_plays,array[play_key],to_jsonb(used+1),true),updated_at=now()
    where id=p_attempt_id;
  return used+1;
end $$;

grant execute on function public.save_exam_draft(uuid,jsonb,jsonb) to authenticated;
grant execute on function public.submit_exam_for_review(uuid) to authenticated;
grant execute on function public.hotfix_published_exam(uuid,jsonb,jsonb,text) to authenticated;
grant execute on function public.consume_exam_audio_play(uuid,uuid) to authenticated;
