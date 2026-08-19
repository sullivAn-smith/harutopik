# Egress optimization — Phase 4 report

## Production outcome

Phase 4 audited all vocabulary image references before making changes.

- `vocabulary_items.image_url`: 2 active rows.
- Active Supabase Storage images: 1 JPEG, 42,474 bytes, 736×460.
- Active external images: 1 PNG from `static.vecteezy.com`, 46,971 bytes, 350×350; it does not contribute to Supabase Storage egress.
- Draft/revision snapshot image references: 5.
- Published lesson snapshot image references: 0. Learner lessons receive the current image from `vocabulary_items` during normalization.
- Storage bucket objects: 130; most are not current master references and must not be treated as active learner images without a full reference audit.

Converting the only active Supabase JPEG to WebP produced 44,304 bytes, 4.31% larger than the original. The optimizer correctly skipped it. The Phase 4 apply run made zero uploads, zero URL replacements, and deleted nothing.

This no-op is intentional: replacing a small image with a larger file would increase egress. Existing uploads already produce WebP with immutable one-year browser caching.

## Safety tooling

- `npm run optimize:vocabulary-images` performs a read-only dry run.
- `npm run optimize:vocabulary-images -- --apply` only replaces images when the generated WebP is smaller.
- Manifests are written under `/tmp` by default and include old/new URL mappings for rollback.
- Migration `202608190081` adds a service-role-only transaction that updates `vocabulary_items`, revision snapshots, and published snapshots atomically.
- Original Storage objects are never deleted by the optimizer.

## Where image references live in the database

Current master URLs:

```sql
select id, hangul, image_url
from public.vocabulary_items
where image_url is not null
order by hangul;
```

Image URLs embedded in editing/revision snapshots:

```sql
select
  revision.id as revision_id,
  revision.content_id as lesson_id,
  word ->> 'id' as vocabulary_id,
  word ->> 'imageUrl' as image_url
from public.content_revisions revision
cross join lateral jsonb_array_elements(
  case
    when jsonb_typeof(revision.payload -> 'vocabulary') = 'array'
      then revision.payload -> 'vocabulary'
    else '[]'::jsonb
  end
) word
where word ? 'imageUrl'
order by revision.content_id, revision.version;
```

Image URLs embedded in learner published snapshots:

```sql
select
  catalog.content_id as lesson_id,
  word ->> 'id' as vocabulary_id,
  word ->> 'imageUrl' as image_url
from public.published_catalog catalog
cross join lateral jsonb_array_elements(
  case
    when jsonb_typeof(catalog.payload -> 'vocabulary') = 'array'
      then catalog.payload -> 'vocabulary'
    else '[]'::jsonb
  end
) word
where catalog.content_type = 'lesson'
  and word ? 'imageUrl'
order by catalog.content_id;
```

Physical files in Supabase Storage:

```sql
select
  bucket_id,
  name as storage_path,
  (metadata ->> 'size')::bigint as size_bytes,
  metadata ->> 'mimetype' as mime_type,
  created_at
from storage.objects
where bucket_id = 'vocabulary-images'
order by size_bytes desc;
```

`vocabulary_items.image_url` is the authoritative current image location. `content_revisions.payload.vocabulary[*].imageUrl` and `published_catalog.payload.vocabulary[*].imageUrl` are JSON snapshot locations. `storage.objects` records physical bucket objects, including files that may no longer be referenced.

Do not delete apparent orphan files solely from one query. Check all three reference locations and retain a rollback window first.
