-- 가입 신청 거절 상태. 거절된 프로필은 승인 대기 목록에서 제외되며, 재신청하면 null로 초기화한다.
alter table profiles add column if not exists signup_rejected_at timestamptz;
