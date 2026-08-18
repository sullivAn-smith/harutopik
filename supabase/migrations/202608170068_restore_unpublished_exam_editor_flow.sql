-- A release withdrawal hides an exam from learners. It must not lock the
-- original editor out of revising and re-submitting that same exam.

drop policy if exists "Owners and admins update exams" on public.exam_sets;
create policy "Owners and admins update exams"
on public.exam_sets for update to authenticated
using (
  (created_by = (select auth.uid()) and status in ('draft', 'changes_requested', 'unpublished'))
  or public.has_app_role(array['admin']::public.app_role[])
)
with check (
  created_by = (select auth.uid())
  or public.has_app_role(array['admin']::public.app_role[])
);

create or replace function public.save_exam_draft(p_exam_id uuid, p_exam jsonb, p_questions jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare target public.exam_sets; question jsonb;
begin
  select * into target from public.exam_sets where id = p_exam_id for update;
  if target.id is null then raise exception 'EXAM_NOT_FOUND'; end if;
  if target.created_by <> auth.uid() and not public.has_app_role(array['admin']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if target.status not in ('draft', 'changes_requested', 'unpublished') and not public.has_app_role(array['admin']::public.app_role[]) then raise exception 'INVALID_STATUS'; end if;

  update public.exam_sets set
    code = trim(p_exam->>'code'),
    title = trim(p_exam->>'title'),
    description = coalesce(trim(p_exam->>'description'), ''),
    level = case when p_exam->>'level' in ('topik_i', 'topik_ii') then p_exam->>'level' else target.level end,
    answer_review_policy = coalesce(nullif(p_exam->>'answerReviewPolicy', ''), 'immediate'),
    answer_review_available_at = case when p_exam->>'answerReviewPolicy' = 'after_date' then (p_exam->>'answerReviewAvailableAt')::timestamptz else null end,
    duration_minutes = (p_exam->>'listeningDurationMinutes')::integer + (p_exam->>'readingDurationMinutes')::integer,
    listening_duration_minutes = (p_exam->>'listeningDurationMinutes')::integer,
    reading_duration_minutes = (p_exam->>'readingDurationMinutes')::integer,
    instructions = coalesce(trim(p_exam->>'instructions'), ''),
    updated_at = now()
  where id = p_exam_id;

  delete from public.exam_questions where exam_id = p_exam_id;
  for question in select value from jsonb_array_elements(coalesce(p_questions, '[]'::jsonb)) loop
    insert into public.exam_questions(
      exam_id, position, section, audio_block_key, reading_type, passage_block_key, passage,
      answer_type, instruction, prompt, audio_url, audio_text, image_url, play_limit,
      options, option_images, correct_option, explanation
    ) values (
      p_exam_id, (question->>'position')::integer, question->>'section', nullif(trim(question->>'audioBlockKey'), ''),
      coalesce(nullif(question->>'readingType', ''), 'standard'), nullif(trim(question->>'passageBlockKey'), ''),
      coalesce(trim(question->>'passage'), ''), coalesce(nullif(question->>'answerType', ''), 'text'),
      coalesce(trim(question->>'instruction'), ''), coalesce(trim(question->>'prompt'), ''),
      nullif(trim(question->>'audioUrl'), ''), nullif(trim(question->>'audioText'), ''), nullif(trim(question->>'imageUrl'), ''),
      1, question->'options', coalesce(question->'optionImages', '["", "", "", ""]'::jsonb),
      (question->>'correctOption')::smallint, coalesce(trim(question->>'explanation'), '')
    );
  end loop;
end $$;

create or replace function public.submit_exam_for_review(p_exam_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare target public.exam_sets; listening_count integer; reading_count integer; invalid_count integer;
begin
  select * into target from public.exam_sets where id = p_exam_id for update;
  if target.id is null then raise exception 'EXAM_NOT_FOUND'; end if;
  if target.created_by <> auth.uid() and not public.has_app_role(array['admin']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if target.status not in ('draft', 'changes_requested', 'unpublished') then raise exception 'INVALID_STATUS'; end if;
  if target.previewed_at is null or target.previewed_at < target.updated_at then raise exception 'PREVIEW_REQUIRED'; end if;

  select
    count(*) filter(where section = 'listening'),
    count(*) filter(where section = 'reading'),
    count(*) filter(where jsonb_array_length(options) <> 4 or exists(select 1 from jsonb_array_elements_text(options) o where nullif(trim(o), '') is null))
  into listening_count, reading_count, invalid_count
  from public.exam_questions where exam_id = p_exam_id;

  if listening_count = 0 or reading_count = 0 or invalid_count > 0 then raise exception 'EXAM_NOT_READY'; end if;
  update public.exam_sets set status = 'pending_review', review_note = null, updated_at = now() where id = p_exam_id;
end $$;

grant execute on function public.save_exam_draft(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.submit_exam_for_review(uuid) to authenticated;
