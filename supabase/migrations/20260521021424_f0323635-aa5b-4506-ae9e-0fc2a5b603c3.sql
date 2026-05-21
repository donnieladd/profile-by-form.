
-- Re-create with explicit search_path already set (covered) and lock down EXECUTE
revoke execute on function public.has_role(uuid, app_role) from public, anon, authenticated;
grant execute on function public.has_role(uuid, app_role) to authenticated, service_role;

revoke execute on function public.is_team_member(uuid) from public, anon, authenticated;
grant execute on function public.is_team_member(uuid) to authenticated, service_role;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
-- handle_new_user is only called by trigger, not directly; keep execute available to service_role
grant execute on function public.handle_new_user() to service_role;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
grant execute on function public.set_updated_at() to service_role;
