-- Content editors are allowed to leave the change note empty when creating or
-- updating a draft. The CMS functions intentionally normalize an empty note
-- to NULL, so the column must reflect that optional domain rule.
alter table public.content_revisions
alter column change_summary drop not null;
