alter type public.content_workflow_status add value if not exists 'changes_requested';
alter type public.content_workflow_status add value if not exists 'scheduled';
alter type public.content_workflow_status add value if not exists 'unpublished';
