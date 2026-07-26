-- 가입 승인 연결 무결성 + 권한 분리 + 기록 보존형 회원 관리

-- 한 명의 로스터 회원은 하나의 카카오 계정에만 연결할 수 있다.
create unique index if not exists profiles_one_member_account_idx
  on public.profiles (member_id)
  where member_id is not null;

-- 비활성 회원은 기존 로그인 세션이 남아 있어도 회원 권한을 사용할 수 없다.
create or replace function current_member_id()
returns uuid language sql stable security definer set search_path = public as $$
  select p.member_id
  from profiles p
  join members m on m.id = p.member_id
  where p.id = auth.uid() and m.status = 'active';
$$;

create or replace function app_role()
returns member_role language sql stable security definer set search_path = public as $$
  select m.role
  from members m
  join profiles p on p.member_id = m.id
  where p.id = auth.uid() and m.status = 'active';
$$;

-- 가입 신청을 새 회원으로 승인한다. 이름 충돌 시 명시적으로 허용한 경우에만 생성한다.
create or replace function public.approve_signup_as_new_member(
  p_profile_id uuid,
  p_allow_same_name boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile profiles%rowtype;
  v_member_id uuid;
  v_position1 position_code;
begin
  if not is_manager() then
    raise exception '운영진만 가입을 승인할 수 있습니다.';
  end if;

  select * into v_profile
  from profiles
  where id = p_profile_id
  for update;

  if not found then
    raise exception '가입 신청 정보를 찾을 수 없습니다.';
  end if;
  if v_profile.member_id is not null then
    raise exception '이미 회원 계정과 연결된 가입 신청입니다.';
  end if;
  if v_profile.signup_rejected_at is not null then
    raise exception '거절된 가입 신청입니다. 신청자가 정보를 다시 제출해야 합니다.';
  end if;
  if nullif(btrim(coalesce(v_profile.claimed_name, '')), '') is null then
    raise exception '신청자 이름이 없습니다.';
  end if;
  if not p_allow_same_name and exists (
    select 1
    from members
    where status = 'active'
      and lower(btrim(name)) = lower(btrim(v_profile.claimed_name))
  ) then
    raise exception '같은 이름의 기존 회원이 있습니다. 기존 회원 연결 또는 동명이인 등록을 선택하세요.';
  end if;

  v_position1 := case upper(coalesce(v_profile.claimed_position1, ''))
    when 'GK' then 'GK'::position_code
    when 'DF' then 'DF'::position_code
    when 'MF' then 'MF'::position_code
    when 'FW' then 'FW'::position_code
    else 'MF'::position_code
  end;

  insert into members (name, position1, position2, role, status)
  values (
    btrim(v_profile.claimed_name),
    v_position1,
    nullif(btrim(coalesce(v_profile.claimed_position2, '')), ''),
    'member',
    'active'
  )
  returning id into v_member_id;

  insert into member_numbers (member_id, uniform, number)
  select v_member_id, uniform, number
  from (
    values
      ('빨검'::text, v_profile.claimed_num_red),
      ('파랑'::text, v_profile.claimed_num_blue)
  ) as numbers(uniform, number)
  where number is not null;

  update profiles
  set member_id = v_member_id
  where id = p_profile_id;

  return v_member_id;
end;
$$;

-- 가입 신청을 기존 활성 회원과 연결한다.
create or replace function public.link_pending_profile(
  p_profile_id uuid,
  p_member_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile profiles%rowtype;
begin
  if not is_manager() then
    raise exception '운영진만 가입을 승인할 수 있습니다.';
  end if;

  select * into v_profile
  from profiles
  where id = p_profile_id
  for update;

  if not found then
    raise exception '가입 신청 정보를 찾을 수 없습니다.';
  end if;
  if v_profile.member_id is not null then
    raise exception '이미 회원 계정과 연결된 가입 신청입니다.';
  end if;
  if v_profile.signup_rejected_at is not null then
    raise exception '거절된 가입 신청입니다. 신청자가 정보를 다시 제출해야 합니다.';
  end if;
  if not exists (select 1 from members where id = p_member_id and status = 'active') then
    raise exception '연결할 수 없는 회원입니다.';
  end if;
  if exists (select 1 from profiles where member_id = p_member_id) then
    raise exception '선택한 회원은 이미 다른 카카오 계정과 연결돼 있습니다.';
  end if;

  update profiles
  set member_id = p_member_id
  where id = p_profile_id;
end;
$$;

grant execute on function public.approve_signup_as_new_member(uuid, boolean) to authenticated;
grant execute on function public.link_pending_profile(uuid, uuid) to authenticated;

-- 승인 화면 밖의 직접 API 호출로도 대기 프로필을 잘못 연결할 수 없게 한다.
create or replace function protect_profile_member_link()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.member_id is not distinct from old.member_id then
    return new;
  end if;
  if not is_manager() then
    raise exception '운영진만 회원 계정을 연결할 수 있습니다.';
  end if;
  if old.member_id is not null then
    raise exception '이미 연결된 계정은 이 화면에서 변경할 수 없습니다.';
  end if;
  if old.signup_rejected_at is not null then
    raise exception '거절된 가입 신청은 다시 제출된 뒤에 연결할 수 있습니다.';
  end if;
  if not exists (select 1 from members where id = new.member_id and status = 'active') then
    raise exception '활성 회원에게만 계정을 연결할 수 있습니다.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_member_link on profiles;
create trigger profiles_protect_member_link
  before update of member_id on profiles
  for each row execute function protect_profile_member_link();

-- 운영진은 일반 회원 정보만 관리하고, 관리자만 권한·상태를 변경한다.
create or replace function protect_member_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if not is_admin() and new.role <> 'member' then
      raise exception '관리자만 운영진 또는 관리자 권한을 부여할 수 있습니다.';
    end if;
    if not is_admin() then
      new.status := 'active';
    end if;
    return new;
  end if;

  if not is_admin() then
    new.role := old.role;
    new.status := old.status;
  end if;

  if old.role = 'admin'
     and old.status = 'active'
     and (new.role <> 'admin' or new.status <> 'active')
     and not exists (
       select 1 from members
       where id <> old.id and role = 'admin' and status = 'active'
     ) then
    raise exception '활성 관리자 계정은 최소 1명 필요합니다.';
  end if;
  return new;
end;
$$;

drop trigger if exists members_protect_role on members;
create trigger members_protect_role before insert or update on members
  for each row execute function protect_member_role();

-- 기록 또는 카카오 계정이 있는 회원은 삭제하지 않는다. 비활성화로만 관리한다.
create or replace function prevent_member_hard_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception '관리자만 회원을 비활성화할 수 있습니다.';
  end if;
  if old.role = 'admin' and old.status = 'active'
     and not exists (
       select 1 from members
       where id <> old.id and role = 'admin' and status = 'active'
     ) then
    raise exception '마지막 활성 관리자 계정은 삭제할 수 없습니다.';
  end if;
  if exists (select 1 from profiles where member_id = old.id)
     or exists (select 1 from attendances where member_id = old.id)
     or exists (select 1 from goals where scorer_id = old.id or assist_id = old.id)
     or exists (select 1 from mvp_votes where voter_id = old.id or target_id = old.id)
     or exists (select 1 from notices where author_id = old.id)
     or exists (select 1 from match_comments where author_id = old.id)
     or exists (select 1 from comments where author_id = old.id)
     or exists (select 1 from attend_comments where author_id = old.id)
     or exists (select 1 from comment_likes where member_id = old.id)
     or exists (select 1 from notice_views where member_id = old.id) then
    raise exception '기록 또는 카카오 계정이 있는 회원은 삭제할 수 없습니다. 회원 비활성화를 사용하세요.';
  end if;
  return old;
end;
$$;

drop trigger if exists members_prevent_hard_delete on members;
create trigger members_prevent_hard_delete before delete on members
  for each row execute function prevent_member_hard_delete();

-- REST API를 직접 호출해도 참석하지 않은 회원에게 MOM 투표할 수 없게 한다.
create or replace function validate_mvp_vote()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from attendances
    where match_id = new.match_id and member_id = new.voter_id and status = 'going'
  ) then
    raise exception '경기 참석자만 MOM 투표를 할 수 있습니다.';
  end if;
  if not exists (
    select 1 from attendances
    where match_id = new.match_id and member_id = new.target_id and status = 'going'
  ) then
    raise exception '경기 참석자만 MOM 후보가 될 수 있습니다.';
  end if;
  if not exists (
    select 1 from matches
    where id = new.match_id
      and status <> 'cancelled'
      and score_for is not null
      and mom_vote_close is not null
      and mom_vote_close > now()
  ) then
    raise exception '현재 MOM 투표 기간이 아닙니다.';
  end if;
  return new;
end;
$$;

drop trigger if exists mvp_votes_validate on mvp_votes;
create trigger mvp_votes_validate before insert or update on mvp_votes
  for each row execute function validate_mvp_vote();
