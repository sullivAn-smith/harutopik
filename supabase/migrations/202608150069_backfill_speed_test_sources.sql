update public.speed_test_attempts
set source_kind = 'list',
    source_id = list_id::text
where list_id is not null
  and source_id = '';
