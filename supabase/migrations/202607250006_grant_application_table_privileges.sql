grant usage on schema public to anon, authenticated, service_role;

grant select, update
on public.learner_profiles
to authenticated;

grant select, insert, update, delete
on public.learning_events, public.lesson_progress, public.review_cards,
  public.study_sessions
to authenticated;

grant select, insert, update, delete
on public.user_roles
to authenticated;

grant select, insert, update
on public.content_revisions
to authenticated;

grant select
on public.audit_logs
to authenticated;

grant select
on public.billing_products, public.billing_prices
to anon, authenticated;

grant select, insert, update
on public.billing_orders
to authenticated;

grant select
on public.entitlements
to authenticated;

grant all privileges
on all tables in schema public
to service_role;

grant usage, select
on all sequences in schema public
to service_role;
