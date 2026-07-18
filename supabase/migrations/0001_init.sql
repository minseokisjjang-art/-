-- ═══════════════════════════════════════════════════════════════
-- 잘지냥 (JalJiNyang) — Supabase 스키마 v1
-- 사용법: Supabase 대시보드 → SQL Editor → 이 파일 전체 붙여넣고 Run
-- 사전 조건: Authentication → Providers → Anonymous Sign-ins 활성화
-- ═══════════════════════════════════════════════════════════════

-- ── 테이블 ──────────────────────────────────────────────────────

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 12),
  cat_color text not null default 'cream' check (cat_color in ('cream','cheese','gray')),
  share_status boolean not null default true,
  share_counter boolean not null default true,
  total_count bigint not null default 0,     -- 누적 활동(걸음+터치), 서버 검증 후 가산
  created_at timestamptz not null default now()
);

create table if not exists classrooms (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists classroom_members (
  classroom_id uuid not null references classrooms on delete cascade,
  profile_id uuid not null references profiles on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (classroom_id, profile_id)
);
-- MVP: 1인 1교실
create unique index if not exists one_classroom_per_profile on classroom_members (profile_id);

create table if not exists presence (
  profile_id uuid primary key references profiles on delete cascade,
  state text not null default 'idle' check (state in ('active','walking','idle')),
  updated_at timestamptz not null default now()
);

create table if not exists pats (
  id uuid primary key default gen_random_uuid(),
  from_profile uuid not null references profiles on delete cascade,
  to_profile uuid not null references profiles on delete cascade,
  classroom_id uuid not null references classrooms on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists pats_to_recent on pats (to_profile, created_at desc);

create table if not exists wallets (
  profile_id uuid primary key references profiles on delete cascade,
  balance int not null default 0 check (balance >= 0),
  earned_today int not null default 0,
  last_earned_date date,
  common_streak int not null default 0       -- 천장(피티) 카운트
);

create table if not exists items (
  id text primary key,
  name text not null,
  slot text not null check (slot in ('hat','neck','desk','effect')),
  rarity text not null check (rarity in ('common','rare','epic','legendary')),
  asset_key text not null
);

create table if not exists inventory (
  profile_id uuid not null references profiles on delete cascade,
  item_id text not null references items,
  equipped boolean not null default false,
  acquired_at timestamptz not null default now(),
  primary key (profile_id, item_id)
);

-- ── 아이템 시드 (24종) ──────────────────────────────────────────

insert into items (id, name, slot, rarity, asset_key) values
  -- 커먼 10
  ('hat_straw',    '밀짚모자',       'hat',    'common',    'hat_straw'),
  ('hat_cap',      '야구모자',       'hat',    'common',    'hat_cap'),
  ('hat_paper',    '종이배 모자',    'hat',    'common',    'hat_paper'),
  ('neck_ribbon',  '빨간 리본',      'neck',   'common',    'neck_ribbon'),
  ('neck_bell',    '방울 목걸이',    'neck',   'common',    'neck_bell'),
  ('neck_scarf_y', '노란 손수건',    'neck',   'common',    'neck_scarf_y'),
  ('desk_pencil',  '연필 한 자루',   'desk',   'common',    'desk_pencil'),
  ('desk_mug',     '무지 머그컵',    'desk',   'common',    'desk_mug'),
  ('desk_apple',   '사과',           'desk',   'common',    'desk_apple'),
  ('desk_eraser',  '지우개',         'desk',   'common',    'desk_eraser'),
  -- 레어 8
  ('hat_beret',    '베레모',         'hat',    'rare',      'hat_beret'),
  ('hat_beanie',   '털모자',         'hat',    'rare',      'hat_beanie'),
  ('neck_muffler', '체크 목도리',    'neck',   'rare',      'neck_muffler'),
  ('neck_star',    '별 목걸이',      'neck',   'rare',      'neck_star'),
  ('desk_plant',   '미니 화분',      'desk',   'rare',      'desk_plant'),
  ('desk_bento',   '도시락',         'desk',   'rare',      'desk_bento'),
  ('desk_gameboy', '게임보이',       'desk',   'rare',      'desk_gameboy'),
  ('fx_sparkle',   '연필 반짝임',    'effect', 'rare',      'fx_sparkle'),
  -- 에픽 4
  ('hat_wizard',   '마법사 모자',    'hat',    'epic',      'hat_wizard'),
  ('neck_bowtie',  '나비넥타이 카라','neck',   'epic',      'neck_bowtie'),
  ('desk_fishbowl','금붕어 어항',    'desk',   'epic',      'desk_fishbowl'),
  ('desk_laptop',  '노트북',         'desk',   'epic',      'desk_laptop'),
  -- 레전더리 2
  ('hat_crown',    '반짝이는 왕관',  'hat',    'legendary', 'hat_crown'),
  ('fx_stars',     '별이 흩날림',    'effect', 'legendary', 'fx_stars')
on conflict (id) do nothing;

-- ── 헬퍼 ────────────────────────────────────────────────────────

create or replace function same_classroom(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from classroom_members m1
    join classroom_members m2 on m1.classroom_id = m2.classroom_id
    where m1.profile_id = a and m2.profile_id = b
  );
$$;

-- ── RLS ─────────────────────────────────────────────────────────

alter table profiles          enable row level security;
alter table classrooms        enable row level security;
alter table classroom_members enable row level security;
alter table presence          enable row level security;
alter table pats              enable row level security;
alter table wallets           enable row level security;
alter table items             enable row level security;
alter table inventory         enable row level security;

-- profiles: 본인 전체, 같은 교실 멤버는 읽기만
drop policy if exists profiles_self on profiles;
create policy profiles_self on profiles for all    using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists profiles_mates on profiles;
create policy profiles_mates on profiles for select using (same_classroom(id, auth.uid()));

-- classrooms: 멤버만 읽기 (코드로 찾기는 RPC 내부에서만 — 코드 무차별 대입 차단)
drop policy if exists classrooms_member on classrooms;
create policy classrooms_member on classrooms for select using (
  exists (select 1 from classroom_members where classroom_id = id and profile_id = auth.uid())
);

-- classroom_members: 같은 교실 멤버끼리 읽기. 입장/퇴장은 RPC로만
drop policy if exists members_read on classroom_members;
create policy members_read on classroom_members for select using (
  exists (select 1 from classroom_members me
          where me.classroom_id = classroom_members.classroom_id
            and me.profile_id = auth.uid())
);

-- presence: 본인 전체 + (상태 공개 중인) 같은 교실 멤버 읽기
--   ⚠ share_status=false 차단은 서버 정책(여기)이 담당 — 클라이언트에서 숨기지 않는다
drop policy if exists presence_self on presence;
create policy presence_self on presence for all    using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists presence_mates on presence;
create policy presence_mates on presence for select using (
  same_classroom(profile_id, auth.uid())
  and exists (select 1 from profiles p where p.id = presence.profile_id and p.share_status = true)
);

-- pats: 받은 사람만 읽기 (무영수증 — 보낸 사람도 자기 기록을 다시 볼 수 없음), 쓰기는 RPC로만
drop policy if exists pats_read_mine on pats;
create policy pats_read_mine on pats for select using (to_profile = auth.uid());

-- wallets: 본인만
drop policy if exists wallets_self on wallets;
create policy wallets_self on wallets for select using (profile_id = auth.uid());

-- items: 모두 읽기
drop policy if exists items_read on items;
create policy items_read on items for select using (true);

-- inventory: 본인 전체 + 같은 교실 멤버의 '착용 중' 아이템만 읽기 (교실 렌더링용)
drop policy if exists inventory_self on inventory;
create policy inventory_self on inventory for select using (profile_id = auth.uid());
drop policy if exists inventory_mates on inventory;
create policy inventory_mates on inventory for select using (
  equipped = true and same_classroom(profile_id, auth.uid())
);

-- ── RPC (전부 SECURITY DEFINER — 클라이언트는 이 함수로만 상태를 바꾼다) ──

-- 프로필 생성/수정
create or replace function upsert_profile(p_nickname text, p_cat_color text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, nickname, cat_color) values (auth.uid(), p_nickname, p_cat_color)
  on conflict (id) do update set nickname = excluded.nickname, cat_color = excluded.cat_color;
  insert into presence (profile_id) values (auth.uid()) on conflict do nothing;
  insert into wallets  (profile_id) values (auth.uid()) on conflict do nothing;
end $$;

create or replace function set_sharing(p_share_status boolean, p_share_counter boolean)
returns void language sql security definer set search_path = public as $$
  update profiles set share_status = p_share_status, share_counter = p_share_counter
  where id = auth.uid();
$$;

-- 교실 생성 (6자리, 혼동 문자 제외)
create or replace function create_classroom()
returns text language plpgsql security definer set search_path = public as $$
declare
  chars constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
  cid uuid;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    begin
      insert into classrooms (invite_code) values (code) returning id into cid;
      exit;
    exception when unique_violation then end;
  end loop;
  delete from classroom_members where profile_id = auth.uid();
  insert into classroom_members (classroom_id, profile_id) values (cid, auth.uid());
  return code;
end $$;

-- 교실 참여 (최대 8명 검증)
create or replace function join_classroom(p_code text)
returns text language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
  cnt int;
begin
  select id into cid from classrooms where invite_code = upper(trim(p_code));
  if cid is null then return 'not_found'; end if;
  select count(*) into cnt from classroom_members where classroom_id = cid;
  if cnt >= 8 then return 'full'; end if;
  delete from classroom_members where profile_id = auth.uid();
  insert into classroom_members (classroom_id, profile_id) values (cid, auth.uid())
  on conflict do nothing;
  return 'ok';
end $$;

create or replace function leave_classroom()
returns void language sql security definer set search_path = public as $$
  delete from classroom_members where profile_id = auth.uid();
$$;

-- 상태 보고 (클라이언트 판정 결과)
create or replace function set_state(p_state text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_state not in ('active','walking','idle') then return; end if;
  insert into presence (profile_id, state, updated_at) values (auth.uid(), p_state, now())
  on conflict (profile_id) do update set state = excluded.state, updated_at = now();
end $$;

-- 쓰다듬 (10분 쿨다운은 서버가 판정)
create or replace function send_pat(p_to uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
begin
  if p_to = auth.uid() then return 'self'; end if;
  select m1.classroom_id into cid from classroom_members m1
  join classroom_members m2 on m1.classroom_id = m2.classroom_id
  where m1.profile_id = auth.uid() and m2.profile_id = p_to;
  if cid is null then return 'not_mate'; end if;
  if exists (select 1 from pats
             where from_profile = auth.uid() and to_profile = p_to
               and created_at > now() - interval '10 minutes') then
    return 'cooldown';
  end if;
  insert into pats (from_profile, to_profile, classroom_id) values (auth.uid(), p_to, cid);
  return 'ok';
end $$;

-- 별가루 적립 (서버 검증: 상식 상한 + 일일 상한 300)
--   걸음 100보 = ⭐10, 터치 100회 = ⭐5. 잔여 걸음/터치는 클라이언트가 이월 관리.
create or replace function record_activity(p_steps int, p_touches int)
returns json language plpgsql security definer set search_path = public as $$
declare
  daily_cap constant int := 300;
  steps int := least(greatest(p_steps, 0), 2000);    -- 10분당 2,000보 초과 절삭
  touches int := least(greatest(p_touches, 0), 3000);
  earn int;
  w wallets;
begin
  select * into w from wallets where profile_id = auth.uid() for update;
  if w is null then
    insert into wallets (profile_id) values (auth.uid()) returning * into w;
  end if;
  if w.last_earned_date is distinct from current_date then
    w.earned_today := 0;
    w.last_earned_date := current_date;
  end if;
  earn := (steps / 100) * 10 + (touches / 100) * 5;
  earn := least(earn, daily_cap - w.earned_today);
  if earn < 0 then earn := 0; end if;
  update wallets set
    balance = balance + earn,
    earned_today = w.earned_today + earn,
    last_earned_date = current_date
  where profile_id = auth.uid();
  update profiles set total_count = total_count + steps + touches where id = auth.uid();
  return json_build_object('granted', earn);
end $$;

-- 상자 개봉 (서버 추첨: 60/30/8/2, 천장, 중복 환급 — 전 과정 한 트랜잭션)
create or replace function open_box()
returns json language plpgsql security definer set search_path = public as $$
declare
  price constant int := 500;
  w wallets;
  roll numeric;
  pick_rarity text;
  picked items;
  dup boolean;
  refund int := 0;
begin
  select * into w from wallets where profile_id = auth.uid() for update;
  if w is null or w.balance < price then
    return json_build_object('result', 'insufficient');
  end if;

  roll := random() * 100;
  if roll < 2 then pick_rarity := 'legendary';
  elsif roll < 10 then pick_rarity := 'epic';
  elsif roll < 40 then pick_rarity := 'rare';
  else pick_rarity := 'common';
  end if;

  -- 천장: 커먼 10연속이면 레어 이상 확정
  if pick_rarity = 'common' and w.common_streak >= 10 then
    roll := random() * 40;  -- 30/8/2 비율 유지
    if roll < 2 then pick_rarity := 'legendary';
    elsif roll < 10 then pick_rarity := 'epic';
    else pick_rarity := 'rare';
    end if;
  end if;

  select * into picked from items where rarity = pick_rarity order by random() limit 1;

  dup := exists (select 1 from inventory where profile_id = auth.uid() and item_id = picked.id);
  if dup then
    refund := case picked.rarity
      when 'common' then 20 when 'rare' then 60
      when 'epic' then 160 when 'legendary' then 400 end;
  else
    insert into inventory (profile_id, item_id) values (auth.uid(), picked.id);
  end if;

  update wallets set
    balance = balance - price + refund,
    common_streak = case when picked.rarity = 'common' then w.common_streak + 1 else 0 end
  where profile_id = auth.uid();

  return json_build_object(
    'result', 'ok', 'item_id', picked.id, 'name', picked.name,
    'slot', picked.slot, 'rarity', picked.rarity,
    'duplicate', dup, 'refund', refund
  );
end $$;

-- 착용/해제 (슬롯당 1개)
create or replace function equip_item(p_item_id text)
returns void language plpgsql security definer set search_path = public as $$
declare
  s text;
begin
  select slot into s from items where id = p_item_id;
  if s is null then return; end if;
  if not exists (select 1 from inventory where profile_id = auth.uid() and item_id = p_item_id) then
    return;
  end if;
  update inventory set equipped = false
  where profile_id = auth.uid() and equipped
    and item_id in (select id from items where slot = s);
  update inventory set equipped = true
  where profile_id = auth.uid() and item_id = p_item_id;
end $$;

create or replace function unequip_slot(p_slot text)
returns void language sql security definer set search_path = public as $$
  update inventory set equipped = false
  where profile_id = auth.uid() and equipped
    and item_id in (select id from items where slot = p_slot);
$$;

-- 교실 화면용 스냅샷 (멤버 + 상태 + 착용 아이템 한 번에)
create or replace function classroom_snapshot()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'code', (select c.invite_code from classrooms c
             join classroom_members m on m.classroom_id = c.id
             where m.profile_id = auth.uid()),
    'members', coalesce((
      select json_agg(json_build_object(
        'id', p.id,
        'nickname', p.nickname,
        'catColor', p.cat_color,
        'shareStatus', p.share_status,
        'totalCount', case when p.share_counter or p.id = auth.uid() then p.total_count else null end,
        'state', case when p.share_status or p.id = auth.uid()
                      then coalesce((select pr.state from presence pr
                                     where pr.profile_id = p.id
                                       and pr.updated_at > now() - interval '30 minutes'), 'idle')
                      else 'private' end,
        'equipped', coalesce((
          select json_agg(i.item_id) from inventory i
          where i.profile_id = p.id and i.equipped), '[]'::json)
      ))
      from profiles p
      where same_classroom(p.id, auth.uid()) or p.id = auth.uid()
    ), '[]'::json)
  );
$$;

-- ── Realtime 발행 ───────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table presence;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table pats;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table inventory;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table classroom_members;
exception when duplicate_object then null; end $$;
