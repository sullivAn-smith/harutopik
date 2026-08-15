alter table public.user_word_progress
  add column if not exists memory_strength numeric not null default 0 check (memory_strength between 0 and 100),
  add column if not exists successful_recalls integer not null default 0 check (successful_recalls >= 0),
  add column if not exists total_recall_time_ms bigint not null default 0 check (total_recall_time_ms >= 0),
  add column if not exists last_recalled_at timestamptz;

create index if not exists speed_test_flash_recall_record_idx
  on public.speed_test_attempts(user_id,source_id,difficulty_level,reaction_direction,score desc,total_time_ms asc)
  where game_type = 'flash_reaction';

create or replace function public.update_flash_recall_metadata(
  p_attempt_id uuid,
  p_level text,
  p_direction text,
  p_answers jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  answer jsonb;
  current_strength numeric;
  sample_strength numeric;
begin
  if actor_id is null then raise exception 'UNAUTHENTICATED'; end if;
  if p_level not in ('easy','medium','hard') then raise exception 'INVALID_LEVEL'; end if;
  if p_direction not in ('ko_vi','vi_ko','mixed') then raise exception 'INVALID_DIRECTION'; end if;
  if not exists(select 1 from public.speed_test_attempts where id=p_attempt_id and user_id=actor_id and game_type='flash_reaction') then raise exception 'ATTEMPT_NOT_FOUND'; end if;

  update public.speed_test_attempts set difficulty_level=p_level,reaction_direction=p_direction where id=p_attempt_id and user_id=actor_id;
  for answer in select * from jsonb_array_elements(p_answers) loop
    select memory_strength into current_strength from public.user_word_progress where user_id=actor_id and vocabulary_id=answer->>'vocabularyId' for update;
    sample_strength := case
      when answer->>'result' <> 'correct' then 15
      when answer->>'grade' = 'perfect' then 100
      when answer->>'grade' = 'great' then 82
      else 65
    end;
    update public.user_word_progress set
      memory_strength=round(case when successful_recalls + wrong_count <= 1 then sample_strength else memory_strength*.72 + sample_strength*.28 end,2),
      successful_recalls=successful_recalls + case when answer->>'result'='correct' then 1 else 0 end,
      total_recall_time_ms=total_recall_time_ms + (answer->>'reactionTimeMs')::integer,
      last_recalled_at=now(),updated_at=now()
    where user_id=actor_id and vocabulary_id=answer->>'vocabularyId';
  end loop;
end;
$$;

revoke all on function public.update_flash_recall_metadata(uuid,text,text,jsonb) from public;
grant execute on function public.update_flash_recall_metadata(uuid,text,text,jsonb) to authenticated;
