alter table public.audio_generation_jobs
  add column if not exists speaking_rate text not null default '-12%',
  add column if not exists output_format text not null
    default 'audio-24khz-48kbitrate-mono-mp3';

with ranked_jobs as (
  select
    id,
    row_number() over (
      partition by provider, voice, source_hash
      order by
        case status when 'completed' then 0 else 1 end,
        created_at
    ) as duplicate_rank
  from public.audio_generation_jobs
)
delete from public.audio_generation_jobs jobs
using ranked_jobs ranked
where jobs.id = ranked.id
  and ranked.duplicate_rank > 1;

create unique index if not exists audio_generation_jobs_global_cache_key
on public.audio_generation_jobs (provider, voice, source_hash);

insert into public.audit_logs (
  actor_id,
  action,
  entity_type,
  entity_id,
  metadata
) values (
  null,
  'audio.pipeline.provider_changed',
  'system',
  'vocabulary-audio',
  jsonb_build_object(
    'provider', 'azure',
    'voice', 'ko-KR-SunHiNeural',
    'cache_scope', 'global_by_source_hash',
    'delivery', 'supabase_public_cdn'
  )
);
