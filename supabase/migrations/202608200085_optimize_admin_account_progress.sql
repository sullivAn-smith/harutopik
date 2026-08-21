-- Paginated, read-only account summaries for the admin account directory.
-- The function reads auth.users but is executable by service_role only.

create index if not exists lesson_progress_admin_summary_idx
  on public.lesson_progress (user_id, lesson_id, status)
  include (completion_percent, last_studied_at);

create or replace function public.get_managed_accounts_page(
  p_query text default '',
  p_role text default null,
  p_status text default null,
  p_plan text default null,
  p_offset integer default 0,
  p_limit integer default 20,
  p_user_id uuid default null
)
returns table (
  user_id uuid,
  email text,
  display_name text,
  primary_role text,
  is_locked boolean,
  last_sign_in_at timestamptz,
  completed_lessons bigint,
  in_progress_lessons bigint,
  published_lessons bigint,
  overall_progress integer,
  last_studied_at timestamptz,
  subscription text,
  content_count bigint,
  total_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with role_summary as (
    select
      role.user_id,
      case
        when bool_or(role.role = 'admin') then 'admin'
        when bool_or(role.role = 'content_editor') then 'content_editor'
        else 'learner'
      end as primary_role
    from public.user_roles as role
    group by role.user_id
  ), pro_users as (
    select entitlement.user_id
    from public.entitlements as entitlement
    where entitlement.status = 'active'
      and entitlement.starts_at <= now()
      and (
        entitlement.ends_at is null
        or entitlement.ends_at > now()
      )
    group by entitlement.user_id
  ), filtered_users as (
    select
      auth_user.id as user_id,
      coalesce(auth_user.email, '')::text as email,
      coalesce(profile.display_name, 'Chưa đặt tên')::text as display_name,
      coalesce(role.primary_role, 'learner')::text as primary_role,
      (
        coalesce(management.is_locked, false)
        or (
          auth_user.banned_until is not null
          and auth_user.banned_until > now()
        )
      ) as is_locked,
      auth_user.last_sign_in_at,
      auth_user.created_at,
      (pro.user_id is not null) as is_pro
    from auth.users as auth_user
    left join public.learner_profiles as profile
      on profile.id = auth_user.id
    left join role_summary as role
      on role.user_id = auth_user.id
    left join public.account_management as management
      on management.user_id = auth_user.id
    left join pro_users as pro
      on pro.user_id = auth_user.id
    where (
        p_user_id is null
        or auth_user.id = p_user_id
      )
      and (
        nullif(trim(coalesce(p_query, '')), '') is null
        or coalesce(auth_user.email, '') ilike
          '%' || trim(p_query) || '%'
        or coalesce(profile.display_name, '') ilike
          '%' || trim(p_query) || '%'
      )
      and (
        p_role is null
        or coalesce(role.primary_role, 'learner') = p_role
      )
      and (
        p_status is null
        or (
          p_status = 'locked'
          and (
            coalesce(management.is_locked, false)
            or (
              auth_user.banned_until is not null
              and auth_user.banned_until > now()
            )
          )
        )
        or (
          p_status = 'active'
          and not (
            coalesce(management.is_locked, false)
            or (
              auth_user.banned_until is not null
              and auth_user.banned_until > now()
            )
          )
        )
      )
      and (
        p_plan is null
        or (p_plan = 'pro' and pro.user_id is not null)
        or (p_plan = 'free' and pro.user_id is null)
      )
  ), page_users as (
    select
      filtered.*,
      count(*) over () as total_count
    from filtered_users as filtered
    order by filtered.created_at desc, filtered.user_id
    offset greatest(coalesce(p_offset, 0), 0)
    limit least(greatest(coalesce(p_limit, 20), 1), 100)
  ), published_total as (
    select count(*)::bigint as lesson_count
    from public.published_catalog as catalog
    where catalog.content_type = 'lesson'
  ), progress_summary as (
    select
      progress.user_id,
      count(*) filter (
        where progress.status = 'completed'
      )::bigint as completed_lessons,
      count(*) filter (
        where progress.status = 'in_progress'
      )::bigint as in_progress_lessons,
      coalesce(sum(
        case
          when progress.status = 'completed' then 100
          else greatest(
            0,
            least(100, coalesce(progress.completion_percent, 0))
          )
        end
      ), 0)::numeric as progress_sum,
      max(progress.last_studied_at) as last_studied_at
    from page_users as page_user
    join public.lesson_progress as progress
      on progress.user_id = page_user.user_id
    join public.published_catalog as catalog
      on catalog.content_id = progress.lesson_id
      and catalog.content_type = 'lesson'
    group by progress.user_id
  ), content_summary as (
    select
      revision.created_by as user_id,
      count(*)::bigint as content_count
    from page_users as page_user
    join public.content_revisions as revision
      on revision.created_by = page_user.user_id
    group by revision.created_by
  )
  select
    page_user.user_id,
    page_user.email,
    page_user.display_name,
    page_user.primary_role,
    page_user.is_locked,
    page_user.last_sign_in_at,
    coalesce(progress.completed_lessons, 0)::bigint,
    coalesce(progress.in_progress_lessons, 0)::bigint,
    published.lesson_count,
    case
      when published.lesson_count = 0 then 0
      else round(
        coalesce(progress.progress_sum, 0)
          / published.lesson_count::numeric
      )::integer
    end as overall_progress,
    progress.last_studied_at,
    case
      when page_user.is_pro then 'Haru Pro'
      else 'Haru Free'
    end::text as subscription,
    coalesce(content.content_count, 0)::bigint,
    page_user.total_count
  from page_users as page_user
  cross join published_total as published
  left join progress_summary as progress
    on progress.user_id = page_user.user_id
  left join content_summary as content
    on content.user_id = page_user.user_id
  order by page_user.created_at desc, page_user.user_id;
$$;

revoke all on function public.get_managed_accounts_page(
  text,
  text,
  text,
  text,
  integer,
  integer,
  uuid
) from public, anon, authenticated;

grant execute on function public.get_managed_accounts_page(
  text,
  text,
  text,
  text,
  integer,
  integer,
  uuid
) to service_role;
