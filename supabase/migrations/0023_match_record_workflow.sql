-- 경기 기록을 한 번에 저장하고, 수정 중 다른 운영진의 저장을 덮어쓰지 않는다.
alter table public.matches add column if not exists result_revision integer not null default 0;
alter table public.goals add column if not exists assist_pending boolean not null default false;

create or replace function public.save_match_record(
  p_match_id uuid,
  p_score_for integer,
  p_score_against integer,
  p_revision integer,
  p_goals jsonb default null
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_match matches%rowtype;
  v_goal record;
  v_first boolean;
begin
  if not coalesce(is_manager(), false) then
    raise exception '운영진만 경기 기록을 저장할 수 있어요.';
  end if;
  if p_score_for is null or p_score_against is null or p_score_for < 0 or p_score_against < 0 then
    raise exception '스코어는 0 이상의 정수로 입력해주세요.';
  end if;
  select * into v_match from matches where id = p_match_id for update;
  if not found then raise exception '경기를 찾을 수 없어요.'; end if;
  if v_match.status = 'cancelled' then raise exception '취소된 경기는 기록할 수 없어요.'; end if;
  if p_revision is distinct from v_match.result_revision then
    raise exception '다른 운영진이 기록을 변경했어요. 새로고침 후 다시 확인해주세요.';
  end if;

  if p_goals is not null then
    if jsonb_typeof(p_goals) <> 'array' then raise exception '득점 기록 형식이 올바르지 않아요.'; end if;
    if jsonb_array_length(p_goals) > p_score_for then raise exception '득점 기록이 팀 점수보다 많아요.'; end if;
    if (select count(*) <> count(distinct g.id) from jsonb_to_recordset(p_goals) as g(id uuid) where g.id is not null) then
      raise exception '중복된 득점 기록이 있어요.';
    end if;
    for v_goal in select * from jsonb_to_recordset(p_goals)
      as g(id uuid, scorer_id uuid, assist_id uuid, is_own_goal boolean, assist_pending boolean)
    loop
      if v_goal.id is not null and not exists(select 1 from goals where id = v_goal.id and match_id = p_match_id) then
        raise exception '기존 득점 기록이 변경됐어요. 새로고침해주세요.';
      end if;
      if coalesce(v_goal.is_own_goal, false) then
        if v_goal.scorer_id is not null or v_goal.assist_id is not null or coalesce(v_goal.assist_pending, false) then
          raise exception '상대 자책골에는 득점자와 도움을 지정할 수 없어요.';
        end if;
      else
        if v_goal.scorer_id is null and not exists(select 1 from goals where id = v_goal.id and match_id = p_match_id and scorer_id is null and not is_own_goal) then
          raise exception '득점자를 선택해주세요.';
        end if;
        if v_goal.scorer_id = v_goal.assist_id then raise exception '득점자와 도움은 같을 수 없어요.'; end if;
        if v_goal.assist_id is not null and coalesce(v_goal.assist_pending, false) then
          raise exception '도움 확인 상태를 다시 선택해주세요.';
        end if;
        -- 참석 명단이 나중에 바뀌어도 기존 선수 기록은 그대로 보존할 수 있다.
        if not exists(select 1 from goals where id = v_goal.id and match_id = p_match_id
          and scorer_id is not distinct from v_goal.scorer_id and assist_id is not distinct from v_goal.assist_id)
        and exists (
          select 1 from unnest(array[v_goal.scorer_id, v_goal.assist_id]) as player(id)
          where player.id is not null and not exists (
            select 1 from attendances where match_id = p_match_id and member_id = player.id and status = 'going'
          )
        ) then raise exception '참석자로 등록된 회원만 득점·도움을 기록할 수 있어요.'; end if;
      end if;
    end loop;
    delete from goals where match_id = p_match_id and id not in (
      select g.id from jsonb_to_recordset(p_goals) as g(id uuid) where g.id is not null
    );
    insert into goals(id, match_id, scorer_id, assist_id, is_own_goal, assist_pending)
    select coalesce(g.id, gen_random_uuid()), p_match_id, g.scorer_id, g.assist_id,
      coalesce(g.is_own_goal, false), coalesce(g.assist_pending, false)
    from jsonb_to_recordset(p_goals) as g(id uuid, scorer_id uuid, assist_id uuid, is_own_goal boolean, assist_pending boolean)
    on conflict(id) do update set scorer_id = excluded.scorer_id, assist_id = excluded.assist_id,
      is_own_goal = excluded.is_own_goal, assist_pending = excluded.assist_pending;
  end if;

  v_first := v_match.score_for is null and v_match.score_against is null;
  update matches set score_for = p_score_for, score_against = p_score_against, status = 'past',
    mom_vote_close = coalesce(mom_vote_close, now() + interval '1 hour'),
    result_revision = result_revision + 1
  where id = p_match_id;
  return v_first;
end;
$$;

create or replace function public.save_match_attendance(p_match_id uuid, p_changes jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_status text;
  v_change record;
  v_current text;
begin
  if not coalesce(is_manager(), false) then raise exception '운영진만 참석 명단을 저장할 수 있어요.'; end if;
  select status into v_status from matches where id = p_match_id for update;
  if not found then raise exception '경기를 찾을 수 없어요.'; end if;
  if v_status = 'cancelled' then raise exception '취소된 경기는 참석 명단을 수정할 수 없어요.'; end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'array' then raise exception '참석 명단 형식이 올바르지 않아요.'; end if;
  for v_change in select * from jsonb_to_recordset(p_changes) as c(member_id uuid, status text, expected_status text)
  loop
    if v_change.status is null or v_change.status not in ('going', 'notGoing', 'undecided') then
      raise exception '참석 상태를 다시 선택해주세요.';
    end if;
    if not exists(select 1 from members where id = v_change.member_id and status = 'active') then
      raise exception '비활성 회원은 참석 명단을 수정할 수 없어요.';
    end if;
    select status::text into v_current from attendances
      where match_id = p_match_id and member_id = v_change.member_id for update;
    if v_current is distinct from v_change.expected_status then
      raise exception '선택한 회원의 투표가 변경됐어요. 새로고침 후 다시 확인해주세요.';
    end if;
    insert into attendances(match_id, member_id, status, source)
      values(p_match_id, v_change.member_id, v_change.status::attend_status, 'manager')
      on conflict(match_id, member_id) do update set status = excluded.status, source = excluded.source
      where attendances.status::text is not distinct from v_change.expected_status;
    if not found then raise exception '선택한 회원의 투표가 변경됐어요. 새로고침 후 다시 확인해주세요.'; end if;
  end loop;
end;
$$;

revoke all on function public.save_match_record(uuid, integer, integer, integer, jsonb) from public;
revoke all on function public.save_match_attendance(uuid, jsonb) from public;
grant execute on function public.save_match_record(uuid, integer, integer, integer, jsonb) to authenticated;
grant execute on function public.save_match_attendance(uuid, jsonb) to authenticated;
