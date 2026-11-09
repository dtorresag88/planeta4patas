-- =====================================================================
-- 008 · Equipo: quitar (y devolver) el acceso al panel
-- Se desactiva en vez de borrar: queda historial y es reversible.
-- =====================================================================
alter table public.admins add column if not exists disabled_at timestamptz;
alter table public.admin_invites add column if not exists revoked_at timestamptz;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid() and a.disabled_at is null);
$$;

create or replace function public.claim_admin_invite()
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_email text; v_confirmed timestamptz;
begin
  select lower(email), email_confirmed_at into v_email, v_confirmed from auth.users where id = auth.uid();
  if v_email is null or v_confirmed is null then return false; end if;
  if not exists (select 1 from public.admin_invites where email = v_email and accepted_at is null and revoked_at is null) then
    return public.is_admin();
  end if;
  insert into public.admins(user_id) values (auth.uid())
  on conflict (user_id) do update set disabled_at = null;
  update public.admin_invites set accepted_at = now() where email = v_email;
  return true;
end; $$;

create or replace function public.admin_invite(p_email text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_uid uuid; v_actor text; v_email text := lower(trim(p_email));
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Correo inválido'; end if;
  select email into v_actor from auth.users where id = auth.uid();
  select id into v_uid from auth.users where lower(email) = v_email and email_confirmed_at is not null;
  if v_uid is not null then
    insert into public.admins(user_id) values (v_uid) on conflict (user_id) do update set disabled_at = null;
    return 'added';
  end if;
  insert into public.admin_invites(email, invited_by) values (v_email, v_actor)
  on conflict (email) do update set accepted_at = null, revoked_at = null, invited_by = excluded.invited_by;
  return 'invited';
end; $$;

create or replace function public.admin_remove(p_email text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_email text := lower(trim(coalesce(p_email, ''))); v_uid uuid;
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  select id into v_uid from auth.users where lower(email) = v_email;
  if v_uid = auth.uid() then raise exception 'No puedes quitarte el acceso a ti mismo'; end if;
  update public.admin_invites set revoked_at = now() where email = v_email and accepted_at is null;
  if v_uid is not null then
    update public.admins set disabled_at = now() where user_id = v_uid and disabled_at is null;
  end if;
  return 'removed';
end; $$;
revoke execute on function public.admin_remove(text) from public, anon;
grant execute on function public.admin_remove(text) to authenticated;

create or replace function public.admin_team()
returns table(user_id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, pending boolean)
language sql stable security definer set search_path = '' as $$
  select a.user_id, u.email::text, a.created_at, u.last_sign_in_at, false
    from public.admins a join auth.users u on u.id = a.user_id
   where a.disabled_at is null and public.is_admin()
  union all
  select null, i.email, i.created_at, null, true
    from public.admin_invites i
   where i.accepted_at is null and i.revoked_at is null and public.is_admin();
$$;
