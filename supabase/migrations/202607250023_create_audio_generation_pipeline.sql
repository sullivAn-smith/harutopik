insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) values (
  'vocabulary-audio',
  'vocabulary-audio',
  true,
  2097152,
  array['audio/mpeg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table public.audio_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  vocabulary_id text not null references public.vocabulary_items(id) on delete cascade,
  source_text text not null check (char_length(trim(source_text)) between 1 and 500),
  source_hash text not null check (char_length(source_hash) = 64),
  provider text not null default 'google_cloud_tts',
  voice text not null,
  status text not null default 'queued' check (
    status in ('queued', 'processing', 'completed', 'failed')
  ),
  attempts integer not null default 0 check (attempts >= 0),
  storage_path text,
  error_message text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  unique (vocabulary_id, provider, voice, source_hash)
);

create index audio_generation_jobs_status_idx
on public.audio_generation_jobs (status, created_at);

alter table public.audio_generation_jobs enable row level security;

create policy "Content staff reads own audio jobs"
on public.audio_generation_jobs for select
to authenticated
using (
  created_by = (select auth.uid())
  or public.has_app_role(array['admin']::public.app_role[])
);

create policy "Content staff creates audio jobs"
on public.audio_generation_jobs for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and public.has_app_role(array['content_editor','admin']::public.app_role[])
);

grant select, insert on public.audio_generation_jobs to authenticated;
grant all privileges on public.audio_generation_jobs to service_role;

insert into public.audit_logs (
  actor_id, action, entity_type, entity_id, metadata
) values (
  null,
  'audio.pipeline.created',
  'system',
  'vocabulary-audio',
  jsonb_build_object(
    'provider', 'google_cloud_tts',
    'bucket', 'vocabulary-audio',
    'delivery', 'public_cdn'
  )
);
