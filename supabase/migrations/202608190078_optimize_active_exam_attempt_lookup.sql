create index if not exists exam_attempts_active_lookup_idx
  on public.exam_attempts(user_id, exam_id, attempt_mode, started_at desc)
  where status = 'in_progress';
