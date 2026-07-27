create function public.claim_audio_generation_job()
returns setof public.audio_generation_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_id uuid;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'service_role_required';
  end if;

  select job.id into claimed_id
  from public.audio_generation_jobs job
  where job.status = 'queued'
    and job.attempts < 3
  order by job.created_at
  for update skip locked
  limit 1;

  if claimed_id is null then return; end if;

  return query
  update public.audio_generation_jobs job set
    status = 'processing',
    attempts = job.attempts + 1,
    started_at = now(),
    error_message = null
  where job.id = claimed_id
  returning job.*;
end;
$$;

revoke all on function public.claim_audio_generation_job() from public;
grant execute on function public.claim_audio_generation_job() to service_role;
