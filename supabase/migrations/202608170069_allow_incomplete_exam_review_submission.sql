-- Editors may submit an intentionally incomplete exam so admins can inspect
-- the current draft. Preview remains mandatory and only the owner/admin may
-- move an editable exam into the review queue.

create or replace function public.submit_exam_for_review(p_exam_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare target public.exam_sets;
begin
  select * into target from public.exam_sets where id = p_exam_id for update;
  if target.id is null then raise exception 'EXAM_NOT_FOUND'; end if;
  if target.created_by <> auth.uid() and not public.has_app_role(array['admin']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if target.status not in ('draft', 'changes_requested', 'unpublished') then raise exception 'INVALID_STATUS'; end if;
  if target.previewed_at is null or target.previewed_at < target.updated_at then raise exception 'PREVIEW_REQUIRED'; end if;

  update public.exam_sets
  set status = 'pending_review', review_note = null, updated_at = now()
  where id = p_exam_id;
end $$;

grant execute on function public.submit_exam_for_review(uuid) to authenticated;
