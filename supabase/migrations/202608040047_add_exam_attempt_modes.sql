alter table public.exam_attempts
  add column if not exists attempt_mode text not null default 'full';

alter table public.exam_attempts
  drop constraint if exists exam_attempts_attempt_mode_check;

alter table public.exam_attempts
  add constraint exam_attempts_attempt_mode_check
  check (attempt_mode in ('listening', 'reading', 'full'));

comment on column public.exam_attempts.attempt_mode is
  'Learner-selected scope: listening only, reading only, or full simulation.';
