update public.exam_sets
set
  answer_review_policy = 'immediate',
  answer_review_available_at = null
where answer_review_policy is distinct from 'immediate'
   or answer_review_available_at is not null;

create or replace function public.force_immediate_exam_answer_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.answer_review_policy := 'immediate';
  new.answer_review_available_at := null;
  return new;
end;
$$;

drop trigger if exists exam_sets_force_immediate_answer_review on public.exam_sets;
create trigger exam_sets_force_immediate_answer_review
before insert or update of answer_review_policy, answer_review_available_at
on public.exam_sets
for each row
execute function public.force_immediate_exam_answer_review();

alter table public.exam_sets
  drop constraint if exists exam_sets_answer_review_policy_check;
alter table public.exam_sets
  add constraint exam_sets_answer_review_policy_check
  check (answer_review_policy = 'immediate');

alter table public.exam_sets
  drop constraint if exists exam_sets_answer_review_date_check;
alter table public.exam_sets
  add constraint exam_sets_answer_review_date_check
  check (answer_review_available_at is null);

comment on column public.exam_sets.answer_review_policy is
  'Kept for backward compatibility. All exams expose answers immediately after submission.';
comment on column public.exam_sets.answer_review_available_at is
  'Deprecated compatibility column. Always null because answers are available immediately.';
