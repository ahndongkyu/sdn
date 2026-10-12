begin;

alter table public.matches add column formation_revision integer not null default 0;
alter table public.goals add column scorer_guest_id uuid references public.guests(id);
alter table public.goals add column assist_guest_id uuid references public.guests(id);
alter table public.goals add constraint goals_one_scorer check (num_nonnulls(scorer_id, scorer_guest_id) <= 1);
alter table public.goals add constraint goals_one_assist check (num_nonnulls(assist_id, assist_guest_id) <= 1);
alter table public.guests add constraint guests_id_match_unique unique(id, match_id);
alter table public.goals add constraint goals_scorer_guest_match foreign key(scorer_guest_id, match_id) references public.guests(id, match_id);
alter table public.goals add constraint goals_assist_guest_match foreign key(assist_guest_id, match_id) references public.guests(id, match_id);

-- 모든 포메이션 저장은 경기 행을 잠그고 읽었던 버전을 확인한다.
drop function public.save_match_formation(uuid, jsonb);
create function public.save_match_formation(p_match_id uuid, p_layout jsonb, p_revision integer)
returns integer language plpgsql security invoker set search_path = public as $$
declare v_revision integer; v_status text;
begin
  if not coalesce(is_manager(), false) then raise exception '운영진만 포메이션을 저장할 수 있어요.'; end if;
  select formation_revision, status into v_revision, v_status from matches where id=p_match_id for update;
  if not found then raise exception '경기를 찾을 수 없어요.'; end if;
  if v_status='cancelled' then raise exception '취소된 경기는 포메이션을 수정할 수 없어요.'; end if;
  if p_revision is distinct from v_revision then
    raise exception '다른 운영진이 포메이션을 변경했어요. 내 입력을 보관하고 최신 기록을 확인해주세요.';
  end if;
  if p_layout is null or jsonb_typeof(p_layout)<>'object' then raise exception '포메이션 형식이 올바르지 않아요.'; end if;
  delete from formations where match_id=p_match_id;
  insert into formations(match_id,name,layout) values(p_match_id,'custom',p_layout);
  update matches set formation_revision=formation_revision+1 where id=p_match_id returning formation_revision into v_revision;
  return v_revision;
end;
$$;
revoke all on function public.save_match_formation(uuid,jsonb,integer) from public;
grant execute on function public.save_match_formation(uuid,jsonb,integer) to authenticated;

create or replace function public.save_match_record(
  p_match_id uuid, p_score_for integer, p_score_against integer, p_revision integer, p_goals jsonb default null
) returns boolean language plpgsql security invoker set search_path = public as $$
declare v_match matches%rowtype; v_goal record; v_first boolean;
begin
  if not coalesce(is_manager(),false) then raise exception '운영진만 경기 기록을 저장할 수 있어요.'; end if;
  if p_score_for is null or p_score_against is null or p_score_for<0 or p_score_against<0 then raise exception '스코어는 0 이상의 정수로 입력해주세요.'; end if;
  select * into v_match from matches where id=p_match_id for update;
  if not found then raise exception '경기를 찾을 수 없어요.'; end if;
  if v_match.status='cancelled' then raise exception '취소된 경기는 기록할 수 없어요.'; end if;
  if p_revision is distinct from v_match.result_revision then raise exception '다른 운영진이 기록을 변경했어요. 내 입력을 보관하고 최신 기록을 확인해주세요.'; end if;
  if p_goals is null then
    if (select count(*) from goals where match_id=p_match_id)>p_score_for then
      raise exception '기존 득점 기록보다 점수가 작아요. 득점 기록을 정리하고 함께 저장해주세요.';
    end if;
  else
    if jsonb_typeof(p_goals)<>'array' then raise exception '득점 기록 형식이 올바르지 않아요.'; end if;
    if jsonb_array_length(p_goals)>p_score_for then raise exception '득점 기록이 팀 점수보다 많아요.'; end if;
    if (select count(*)<>count(distinct g.id) from jsonb_to_recordset(p_goals) as g(id uuid) where g.id is not null) then raise exception '중복된 득점 기록이 있어요.'; end if;
    for v_goal in select * from jsonb_to_recordset(p_goals)
      as g(id uuid,scorer_id uuid,assist_id uuid,scorer_guest_id uuid,assist_guest_id uuid,is_own_goal boolean,assist_pending boolean)
    loop
      if v_goal.id is not null and not exists(select 1 from goals where id=v_goal.id and match_id=p_match_id) then raise exception '기존 득점 기록이 변경됐어요. 최신 기록을 확인해주세요.'; end if;
      if num_nonnulls(v_goal.scorer_id,v_goal.scorer_guest_id)>1 or num_nonnulls(v_goal.assist_id,v_goal.assist_guest_id)>1 then raise exception '득점자와 도움은 각각 한 명만 지정해주세요.'; end if;
      if coalesce(v_goal.is_own_goal,false) then
        if num_nonnulls(v_goal.scorer_id,v_goal.assist_id,v_goal.scorer_guest_id,v_goal.assist_guest_id)>0 or coalesce(v_goal.assist_pending,false) then raise exception '상대 자책골에는 득점자와 도움을 지정할 수 없어요.'; end if;
      else
        if v_goal.scorer_id is null and v_goal.scorer_guest_id is null and not exists(select 1 from goals where id=v_goal.id and match_id=p_match_id and scorer_id is null and scorer_guest_id is null and not is_own_goal) then raise exception '득점자를 선택해주세요.'; end if;
        if v_goal.scorer_id=v_goal.assist_id or v_goal.scorer_guest_id=v_goal.assist_guest_id then raise exception '득점자와 도움은 같을 수 없어요.'; end if;
        if num_nonnulls(v_goal.assist_id,v_goal.assist_guest_id)>0 and coalesce(v_goal.assist_pending,false) then raise exception '도움 확인 상태를 다시 선택해주세요.'; end if;
        if exists(select 1 from unnest(array[v_goal.scorer_guest_id,v_goal.assist_guest_id]) as player(id) where player.id is not null and not exists(select 1 from guests where id=player.id and match_id=p_match_id)) then raise exception '이번 경기 용병만 기록할 수 있어요.'; end if;
        if not exists(select 1 from goals where id=v_goal.id and match_id=p_match_id
          and scorer_id is not distinct from v_goal.scorer_id and assist_id is not distinct from v_goal.assist_id
          and scorer_guest_id is not distinct from v_goal.scorer_guest_id and assist_guest_id is not distinct from v_goal.assist_guest_id)
        and exists(select 1 from unnest(array[v_goal.scorer_id,v_goal.assist_id]) as player(id) where player.id is not null and not exists(select 1 from attendances where match_id=p_match_id and member_id=player.id and status='going')) then raise exception '참석자로 등록된 회원만 득점·도움을 기록할 수 있어요.'; end if;
      end if;
    end loop;
    delete from goals where match_id=p_match_id and id not in(select g.id from jsonb_to_recordset(p_goals) as g(id uuid) where g.id is not null);
    insert into goals(id,match_id,scorer_id,assist_id,scorer_guest_id,assist_guest_id,is_own_goal,assist_pending)
    select coalesce(g.id,gen_random_uuid()),p_match_id,g.scorer_id,g.assist_id,g.scorer_guest_id,g.assist_guest_id,coalesce(g.is_own_goal,false),coalesce(g.assist_pending,false)
      from jsonb_to_recordset(p_goals) as g(id uuid,scorer_id uuid,assist_id uuid,scorer_guest_id uuid,assist_guest_id uuid,is_own_goal boolean,assist_pending boolean)
    on conflict(id) do update set scorer_id=excluded.scorer_id,assist_id=excluded.assist_id,scorer_guest_id=excluded.scorer_guest_id,assist_guest_id=excluded.assist_guest_id,is_own_goal=excluded.is_own_goal,assist_pending=excluded.assist_pending;
  end if;
  v_first := v_match.score_for is null and v_match.score_against is null;
  update matches set score_for=p_score_for,score_against=p_score_against,status='past',result_revision=result_revision+1 where id=p_match_id;
  return v_first;
end;
$$;

-- 폐기한 투표 기능에 의존하지 않도록 회원 기록 보호를 유지한다.
create or replace function public.prevent_member_hard_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception '관리자만 회원을 비활성화할 수 있습니다.'; end if;
  if old.role='admin' and old.status='active' and not exists(select 1 from members where id<>old.id and role='admin' and status='active') then raise exception '마지막 활성 관리자 계정은 삭제할 수 없습니다.'; end if;
  if exists(select 1 from profiles where member_id=old.id)
    or exists(select 1 from attendances where member_id=old.id)
    or exists(select 1 from goals where scorer_id=old.id or assist_id=old.id)
    or exists(select 1 from notices where author_id=old.id)
    or exists(select 1 from match_comments where author_id=old.id)
    or exists(select 1 from comments where author_id=old.id)
    or exists(select 1 from attend_comments where author_id=old.id)
    or exists(select 1 from comment_likes where member_id=old.id)
    or exists(select 1 from notice_views where member_id=old.id) then raise exception '기록 또는 카카오 계정이 있는 회원은 삭제할 수 없습니다. 회원 비활성화를 사용하세요.'; end if;
  return old;
end;
$$;

drop table public.mvp_votes;
drop function public.validate_mvp_vote();
alter table public.matches drop column mvp_member_id;
alter table public.matches drop column mom_vote_close;
update public.notification_events set body=replace(body,' · MOM 투표에 참여해주세요','') where kind='result';

commit;
