-- 기록·회원 관리·알림 발송의 무결성 보강

-- 비활성 회원은 운영진 알림 수신 대상에서 제외한다.
create or replace function manager_push_subs()
returns table (endpoint text, p256dh text, auth text)
language sql
security definer
set search_path = public
as $$
  select ps.endpoint, ps.p256dh, ps.auth
  from push_subscriptions ps
  join profiles p on p.id = ps.profile_id
  join members m on m.id = p.member_id
  where m.role in ('manager', 'admin')
    and m.status = 'active';
$$;

-- 일정 변경 알림을 알림함에도 남긴다.
alter table notification_events
  drop constraint if exists notification_events_kind_check;

alter table notification_events
  add constraint notification_events_kind_check
  check (kind in ('notice', 'match', 'reminder', 'lineup', 'result', 'approval', 'cancelled', 'updated'));

-- D-1 리마인드는 같은 경기·같은 날짜에 한 번만 발송한다.
create table if not exists reminder_deliveries (
  match_id uuid not null references matches(id) on delete cascade,
  reminder_date date not null,
  created_at timestamptz not null default now(),
  primary key (match_id, reminder_date)
);

alter table reminder_deliveries enable row level security;

-- 회원과 등번호를 한 트랜잭션으로 생성한다.
create or replace function public.create_member_with_numbers(
  p_name text,
  p_position1 position_code,
  p_position2 text,
  p_role text,
  p_numbers jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
  v_role member_role := 'member';
begin
  if not is_manager() then
    raise exception '운영진만 회원을 등록할 수 있습니다.';
  end if;
  if nullif(btrim(p_name), '') is null then
    raise exception '회원 이름을 입력해주세요.';
  end if;
  if exists (
    select 1 from members
    where status = 'active'
      and lower(btrim(name)) = lower(btrim(p_name))
  ) then
    raise exception '같은 이름의 활성 회원이 이미 있습니다.';
  end if;

  if is_admin() and p_role in ('member', 'manager', 'admin') then
    v_role := p_role::member_role;
  end if;

  insert into members (name, position1, position2, role)
  values (btrim(p_name), p_position1, nullif(btrim(coalesce(p_position2, '')), ''), v_role)
  returning id into v_member_id;

  insert into member_numbers (member_id, uniform, number)
  select v_member_id, value->>'uniform', (value->>'number')::int
  from jsonb_array_elements(coalesce(p_numbers, '[]'::jsonb)) value
  where nullif(value->>'uniform', '') is not null
    and coalesce(value->>'number', '') ~ '^[0-9]+$';

  return v_member_id;
end;
$$;

-- 회원 정보와 등번호 교체도 하나의 트랜잭션으로 처리한다.
create or replace function public.update_member_with_numbers(
  p_member_id uuid,
  p_name text,
  p_position1 position_code,
  p_position2 text,
  p_role text,
  p_numbers jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role member_role;
begin
  if not (is_manager() or current_member_id() = p_member_id) then
    raise exception '회원 정보를 수정할 권한이 없습니다.';
  end if;
  if nullif(btrim(p_name), '') is null then
    raise exception '회원 이름을 입력해주세요.';
  end if;
  if not exists (select 1 from members where id = p_member_id) then
    raise exception '회원 정보를 찾을 수 없습니다.';
  end if;
  if exists (
    select 1 from members
    where id <> p_member_id
      and status = 'active'
      and lower(btrim(name)) = lower(btrim(p_name))
  ) then
    raise exception '같은 이름의 활성 회원이 이미 있습니다.';
  end if;

  if is_admin() and p_role in ('member', 'manager', 'admin') then
    v_role := p_role::member_role;
    update members
    set name = btrim(p_name), position1 = p_position1,
        position2 = nullif(btrim(coalesce(p_position2, '')), ''), role = v_role
    where id = p_member_id;
  else
    update members
    set name = btrim(p_name), position1 = p_position1,
        position2 = nullif(btrim(coalesce(p_position2, '')), '')
    where id = p_member_id;
  end if;

  delete from member_numbers where member_id = p_member_id;
  insert into member_numbers (member_id, uniform, number)
  select p_member_id, value->>'uniform', (value->>'number')::int
  from jsonb_array_elements(coalesce(p_numbers, '[]'::jsonb)) value
  where nullif(value->>'uniform', '') is not null
    and coalesce(value->>'number', '') ~ '^[0-9]+$';
end;
$$;

-- 포메이션은 삭제·삽입 사이에 실패해도 기존 데이터가 남도록 원자적으로 저장한다.
create or replace function public.save_match_formation(
  p_match_id uuid,
  p_layout jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_manager() then
    raise exception '운영진만 포메이션을 저장할 수 있습니다.';
  end if;
  if not exists (select 1 from matches where id = p_match_id) then
    raise exception '경기를 찾을 수 없습니다.';
  end if;

  delete from formations where match_id = p_match_id;
  insert into formations (match_id, name, layout)
  values (p_match_id, 'custom', p_layout);
end;
$$;

grant execute on function public.create_member_with_numbers(text, position_code, text, text, jsonb) to authenticated;
grant execute on function public.update_member_with_numbers(uuid, text, position_code, text, text, jsonb) to authenticated;
grant execute on function public.save_match_formation(uuid, jsonb) to authenticated;
