/* ═══════════════════════════════════════════════════════
   햄스터 목장 — 잠금화면 프로토타입
   방치형 + 수집 + 커뮤니티(친구 햄스터 실시간 시각화)
   ═══════════════════════════════════════════════════════ */

'use strict';

/* ── 아이템 카탈로그 ─────────────────────────────────── */

const RARITIES = {
  common:    { name: '커먼',     p: 0.60, color: '#9aa5b1', value: 5   },
  rare:      { name: '레어',     p: 0.25, color: '#4dabf7', value: 20  },
  epic:      { name: '에픽',     p: 0.12, color: '#b197fc', value: 60  },
  legendary: { name: '레전더리', p: 0.03, color: '#ffd43b', value: 250 },
};

const CATALOG = [
  // 모자
  { id: 'hat-cap',     type: 'hat', emoji: '🧢', name: '야구모자',   rarity: 'common' },
  { id: 'hat-ribbon',  type: 'hat', emoji: '🎀', name: '리본',       rarity: 'common' },
  { id: 'hat-leaf',    type: 'hat', emoji: '🍀', name: '네잎클로버', rarity: 'common' },
  { id: 'hat-flower',  type: 'hat', emoji: '🌸', name: '벚꽃',       rarity: 'common' },
  { id: 'hat-party',   type: 'hat', emoji: '🎉', name: '파티모자',   rarity: 'rare' },
  { id: 'hat-grad',    type: 'hat', emoji: '🎓', name: '학사모',     rarity: 'rare' },
  { id: 'hat-head',    type: 'hat', emoji: '🎧', name: '헤드폰',     rarity: 'rare' },
  { id: 'hat-tophat',  type: 'hat', emoji: '🎩', name: '신사모자',   rarity: 'epic' },
  { id: 'hat-wizard',  type: 'hat', emoji: '🪄', name: '마법사',     rarity: 'epic' },
  { id: 'hat-crown',   type: 'hat', emoji: '👑', name: '황금왕관',   rarity: 'legendary' },
  // 햄스터 스킨
  { id: 'skin-white',  type: 'skin', fur: '#eec27a', name: '골든햄',   rarity: 'common' },
  { id: 'skin-cream',  type: 'skin', fur: '#f6ecdb', name: '크림햄',   rarity: 'common' },
  { id: 'skin-gray',   type: 'skin', fur: '#c9cdd6', name: '회색햄',   rarity: 'common' },
  { id: 'skin-choco',  type: 'skin', fur: '#a47148', name: '초코햄',   rarity: 'rare' },
  { id: 'skin-pink',   type: 'skin', fur: '#f5c6d0', name: '핑크햄',   rarity: 'epic' },
  { id: 'skin-mint',   type: 'skin', fur: '#bfe6cf', name: '민트햄',   rarity: 'epic' },
  { id: 'skin-gold',   type: 'skin', fur: '#ffd34d', name: '황금햄',   rarity: 'legendary' },
  // 이모티콘 팩 (탭 반응에 사용)
  { id: 'emo-music',   type: 'emo', emoji: '🎵', name: '음표팩',   rarity: 'common',    pool: ['🎵', '🎶', '🎤'] },
  { id: 'emo-food',    type: 'emo', emoji: '🌻', name: '간식팩',   rarity: 'rare',      pool: ['🌻', '🌰', '🥕'] },
  { id: 'emo-magic',   type: 'emo', emoji: '✨', name: '반짝팩',   rarity: 'epic',      pool: ['✨', '🌟', '💫'] },
  { id: 'emo-royal',   type: 'emo', emoji: '💎', name: '보석팩',   rarity: 'legendary', pool: ['💎', '👑', '🏆'] },
];

const BASE_EMOJI = ['❤️', '🐹', '💕', '🌻', '🐾'];
const byId = id => CATALOG.find(i => i.id === id);

/* ── 상태 (localStorage 영속화) ──────────────────────── */

const SAVE_KEY = 'bongo-cat-mobile-v1';

const DEFAULT_STATE = {
  coins: 30,
  inv: { 'skin-white': 1 },                 // itemId → 보유 개수
  equipped: { hat: null, skin: 'skin-white' },
  presets: [],                              // {name, hat, skin}
  playerName: '목장주' + Math.floor(10 + Math.random() * 90),
  guestbook: [],   // 방명록: {name, kind, t, count}
  rosters: {},     // 방별 주민 명부: {코드: {id: {name, hat, skin, lastSeen}}}
  lastRoom: null,  // 마지막 방 — 앱 재실행 시 자동 재입장
  servers: [],     // 내 서버(목장) 목록: {code, name, t}
  friends: [
    { id: 'f1', name: '민지', skin: 'skin-cream', hat: 'hat-ribbon', on: true },
    { id: 'f2', name: '준호', skin: 'skin-gray',  hat: 'hat-cap',    on: true },
  ],
  taps: 0,
  shopSeed: null,
  shopDay: null,
};

let state;
try {
  state = Object.assign({}, DEFAULT_STATE, JSON.parse(localStorage.getItem(SAVE_KEY)));
} catch { state = { ...DEFAULT_STATE }; }

function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }

/* ── 유틸 ────────────────────────────────────────────── */

const $ = sel => document.querySelector(sel);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

function relTime(t) {
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return '방금';
  if (s < 3600) return Math.floor(s / 60) + '분 전';
  if (s < 86400) return Math.floor(s / 3600) + '시간 전';
  if (s < 172800) return '어제';
  return Math.floor(s / 86400) + '일 전';
}

/* 방명록 — 같은 사람의 같은 흔적이 10분 안에 반복되면 횟수만 올린다 */
function addGuestbook(name, kind, t = Date.now()) {
  const last = state.guestbook[0];
  if (last && last.name === name && last.kind === kind && t - last.t < 600000) {
    last.count = (last.count || 1) + 1;
    last.t = t;
  } else {
    state.guestbook.unshift({ name, kind, t, count: 1 });
    state.guestbook = state.guestbook.slice(0, 30);
  }
  save();
}

function roomRoster() {
  if (!MP.inRoom()) return {};
  return state.rosters[MP.roomCode()] || {};
}

function myEmojiPool() {
  const pool = [...BASE_EMOJI];
  for (const item of CATALOG) {
    if (item.type === 'emo' && state.inv[item.id]) pool.push(...item.pool);
  }
  return pool;
}

/* ── 햄스터 SVG (챗바퀴 · 노트북 소품 포함) ──────────── */

function catSVG() {
  return `
  <svg class="wheel" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <!-- 챗바퀴: 바깥 링 + 회전하는 살 -->
    <circle cx="60" cy="60" r="52" fill="none" stroke="#8A5A2B" stroke-width="6" opacity=".85"/>
    <circle cx="60" cy="60" r="46" fill="none" stroke="#B07C42" stroke-width="2" opacity=".5"/>
    <g class="spokes" stroke="#8A5A2B" stroke-width="3.5" opacity=".55" stroke-linecap="round">
      <line x1="60" y1="10" x2="60" y2="110"/>
      <line x1="16.7" y1="35" x2="103.3" y2="85"/>
      <line x1="16.7" y1="85" x2="103.3" y2="35"/>
    </g>
    <circle cx="60" cy="60" r="7" fill="#8A5A2B"/>
  </svg>
  <svg class="catsvg" viewBox="0 0 120 104" xmlns="http://www.w3.org/2000/svg">
    <!-- 귀 -->
    <circle class="fur fur-stroke" cx="38" cy="24" r="12"/>
    <circle class="fur fur-stroke" cx="82" cy="24" r="12"/>
    <circle cx="38" cy="25" r="6" fill="#ffb3c1" opacity=".8"/>
    <circle cx="82" cy="25" r="6" fill="#ffb3c1" opacity=".8"/>
    <!-- 몸통 -->
    <ellipse class="fur fur-stroke" cx="60" cy="62" rx="44" ry="38"/>
    <!-- 배 -->
    <ellipse cx="60" cy="78" rx="26" ry="18" fill="#fff" opacity=".55"/>
    <!-- 눈: 뜸 -->
    <g class="eyes-open" fill="#4a3222">
      <circle cx="45" cy="52" r="4"/>
      <circle cx="75" cy="52" r="4"/>
    </g>
    <!-- 눈: 행복/잠 -->
    <g class="eyes-happy" stroke="#4a3222" stroke-width="3" stroke-linecap="round" fill="none">
      <path d="M39 53 q6 -7 12 0"/>
      <path d="M69 53 q6 -7 12 0"/>
    </g>
    <!-- 코 + 입 -->
    <circle cx="60" cy="60" r="2.6" fill="#e8899e"/>
    <path d="M54 66 q3 4.5 6 0 q3 4.5 6 0" stroke="#4a3222" stroke-width="2.4"
      stroke-linecap="round" fill="none"/>
    <!-- 볼주머니 -->
    <ellipse cx="33" cy="63" rx="8" ry="6" fill="#ffb3c1" opacity=".6"/>
    <ellipse cx="87" cy="63" rx="8" ry="6" fill="#ffb3c1" opacity=".6"/>
    <!-- 수염 -->
    <g stroke="#4a3222" stroke-width="1.4" opacity=".45" stroke-linecap="round">
      <line x1="24" y1="58" x2="10" y2="55"/>
      <line x1="24" y1="63" x2="10" y2="64"/>
      <line x1="96" y1="58" x2="110" y2="55"/>
      <line x1="96" y1="63" x2="110" y2="64"/>
    </g>
    <!-- 앞발 -->
    <g class="paw paw-l"><ellipse class="fur fur-stroke" cx="44" cy="94" rx="9" ry="6.5"/></g>
    <g class="paw paw-r"><ellipse class="fur fur-stroke" cx="76" cy="94" rx="9" ry="6.5"/></g>
  </svg>
  <svg class="laptop" viewBox="0 0 64 42" xmlns="http://www.w3.org/2000/svg">
    <!-- 노트북: 화면 + 키보드 -->
    <rect x="12" y="2" width="40" height="26" rx="3" fill="#3d3345"/>
    <rect x="15" y="5" width="34" height="20" rx="2" fill="#9be7ff" opacity=".9"/>
    <rect x="17" y="8" width="18" height="2.5" rx="1" fill="#5aa9c9"/>
    <rect x="17" y="13" width="26" height="2.5" rx="1" fill="#5aa9c9"/>
    <rect x="17" y="18" width="22" height="2.5" rx="1" fill="#5aa9c9"/>
    <rect x="4" y="28" width="56" height="9" rx="3" fill="#6b7280"/>
    <rect x="9" y="30.5" width="46" height="4" rx="2" fill="#4b5563"/>
  </svg>`;
}

/* ── 고양이 클래스 ───────────────────────────────────── */

const field = $('#cat-field');
const cats = [];

class Cat {
  constructor(cfg) {
    // cfg: { id, name, isMe, skin, hat, lane, slot } — slot으로 초기 위치를 분산해 겹침 방지
    this.cfg = cfg;
    const span = Math.max(120, innerWidth - 150);
    const n = Math.max(1, cfg.slotCount || 1);
    const base = 20 + span * ((cfg.slot ?? 0) + .5) / n;
    this.x = Math.max(4, base + rand(-30, 30));
    this.dir = Math.random() < .5 ? -1 : 1;
    this.speed = rand(28, 44);           // px/초
    this.mode = 'idle';
    this.modeUntil = 0;
    this.friendActive = false;           // 친구 "타이핑 중" 상태
    this.lastBubble = 0;

    this.el = document.createElement('div');
    this.el.className = 'cat idle' + (cfg.isMe ? ' is-me' : '');
    this.el.dataset.id = cfg.id;
    this.el.innerHTML = `
      <div class="tag"><span class="dot"></span><span class="tname"></span></div>
      <div class="flip">
        <div class="bounce">
          <div class="hat"></div>
          ${catSVG()}
        </div>
      </div>`;
    const scale = cfg.isMe ? 1 : rand(.82, .92);
    this.el.style.zIndex = cfg.isMe ? 4 : 3;
    this.el.style.bottom = (cfg.lane ?? rand(6, 60)) + 'px';
    this.el.style.setProperty('--s', scale);
    this.scale = scale;
    this.applyLook();
    this.updateTag();
    this.bindTouch();
    field.appendChild(this.el);
    this.render();
  }

  applyLook() {
    const skin = byId(this.cfg.skin) || byId('skin-white');
    this.el.style.setProperty('--fur', skin.fur);
    const hat = this.cfg.hat ? byId(this.cfg.hat) : null;
    this.el.querySelector('.hat').textContent = hat ? hat.emoji : '';
  }

  updateTag() {
    const t = this.el.querySelector('.tname');
    if (this.cfg.isMe) {
      t.textContent = '내 햄스터';
    } else if (this.cfg.remote) {
      t.textContent = this.away
        ? `${this.cfg.name} · 자리 비움 💤`
        : this.friendActive
          ? `${this.cfg.name} · 폰 사용 중 ⌨️`
          : `${this.cfg.name} · 접속 중 🟢`;
    } else {
      t.textContent = this.friendActive
        ? `${this.cfg.name} · 타이핑 중 ⌨️`
        : `${this.cfg.name} · 휴식 중 💤`;
    }
    this.el.classList.toggle('active-friend', !!this.friendActive);
  }

  setMode(mode, durSec) {
    this.mode = mode;
    this.modeUntil = performance.now() + durSec * 1000;
    this.el.classList.remove('idle', 'walking', 'tapping');
    this.el.classList.add(mode === 'walk' ? 'walking' : mode === 'bongo' ? 'tapping' : 'idle');
  }

  think(now) {
    if (now < this.modeUntil) return;
    // 자리 비운 친구의 고양이는 얌전히 지낸다 (동물의 숲 이웃처럼)
    if (this.cfg.remote && this.away) {
      if (Math.random() < .85) this.setMode('idle', rand(3, 7));
      else { this.dir = Math.random() < .5 ? -1 : 1; this.setMode('walk', rand(1, 2)); }
      return;
    }
    // 친구가 "타이핑 중"이면 주로 봉고를 두드린다 (PC판의 입력 실시간 시각화)
    if (!this.cfg.isMe && this.friendActive && Math.random() < .75) {
      this.setMode('bongo', rand(2, 5));
      return;
    }
    const r = Math.random();
    if (r < .38) {
      this.dir = Math.random() < .5 ? -1 : 1;
      this.setMode('walk', rand(1.5, 4));
    } else if (r < .68) {
      this.setMode('bongo', rand(1.5, 3.5));
    } else {
      this.setMode('idle', rand(2, 5));
    }
  }

  tick(dt, now) {
    this.think(now);
    if (this.mode === 'walk') {
      this.x += this.dir * this.speed * dt;
      const maxX = innerWidth - 112;
      if (this.x <= 4)    { this.x = 4;    this.dir = 1; }
      if (this.x >= maxX) { this.x = maxX; this.dir = -1; }
    }
    this.render();
  }

  render() {
    this.el.style.transform = `translateX(${this.x}px) scale(${this.scale})`;
    this.el.classList.toggle('face-left', this.dir === -1);
  }

  /* 터치 반응 */
  bindTouch() {
    let holdTimer = null;
    let purring = false;
    let purrInterval = null;

    const startPurr = () => {
      purring = true;
      this.el.classList.add('purring');
      this.setMode('idle', 99);
      purrInterval = setInterval(() => {
        const r = this.el.getBoundingClientRect();
        spawnHeart(r.left + r.width / 2 + rand(-24, 24), r.top + rand(0, 20));
        if (Math.random() < .4) spawnPurrText(r.left + r.width / 2 + rand(-30, 30), r.top - 6);
      }, 180);
    };

    const stop = () => {
      clearTimeout(holdTimer);
      holdTimer = null;
      if (purring) {
        purring = false;
        clearInterval(purrInterval);
        this.el.classList.remove('purring');
        this.setMode('idle', 1);
        addCoins(1, false);   // 쓰다듬어주면 코인 +1
        if (this.cfg.remote) this.sendPetToFriend();   // 친구에게 답장 없는 안부 전달
      }
    };

    this.el.addEventListener('pointerdown', e => {
      e.stopPropagation();
      holdTimer = setTimeout(startPurr, 420);   // 길게 누르면 쓰다듬기
    });
    this.el.addEventListener('pointerup', e => {
      e.stopPropagation();
      if (!purring && holdTimer) this.tapReact();   // 짧은 탭 → 이모티콘
      stop();
    });
    this.el.addEventListener('pointercancel', stop);
    this.el.addEventListener('pointerleave', () => { if (!purring) { clearTimeout(holdTimer); holdTimer = null; } });
  }

  /* 친구 고양이 쓰다듬기 전달 — 접속 중이면 실시간, 자리 비움이면 부재중 흔적 */
  sendPetToFriend() {
    if (!MP.inRoom()) return;
    const now = Date.now();
    if (this.lastPetSent && now - this.lastPetSent < 10000) return;   // 스팸 방지
    this.lastPetSent = now;
    if (MP.isOnline(this.cfg.id)) MP.pet(this.cfg.id);
    else MP.trace(this.cfg.id, 'pet');
    this.showBubble('💗');
  }

  tapReact(emoji) {
    const now = performance.now();
    if (now - this.lastBubble < 350) return;
    this.lastBubble = now;
    const chosen = emoji || pick(this.cfg.isMe ? myEmojiPool() : BASE_EMOJI);
    this.showBubble(chosen);
    if (this.cfg.isMe && MP.inRoom()) MP.emote(chosen);   // 친구 화면의 내 고양이도 반응
    this.el.classList.remove('jump');
    void this.el.offsetWidth;                 // 애니메이션 리트리거
    this.el.classList.add('jump');
    this.el.classList.add('happy');
    setTimeout(() => this.el.classList.remove('happy'), 1200);
    if (this.cfg.isMe) {
      state.taps++;
      if (state.taps % 25 === 0) dropItem('터치 보너스!');   // 상호작용 보상
      save();
    }
  }

  showBubble(emoji) {
    const b = document.createElement('div');
    b.className = 'bubble';
    b.textContent = emoji;
    this.el.appendChild(b);
    setTimeout(() => b.remove(), 1500);
  }
}

/* 파티클 */
function spawnHeart(x, y) {
  const h = document.createElement('div');
  h.className = 'heart-particle';
  h.textContent = pick(['❤️', '💕', '💗', '🩷']);
  h.style.left = x + 'px';
  h.style.top = y + 'px';
  document.body.appendChild(h);
  setTimeout(() => h.remove(), 1200);
}

function spawnPurrText(x, y) {
  const t = document.createElement('div');
  t.className = 'purr-text';
  t.textContent = pick(['찍찍!', '쌔근쌔근', '오물오물']);
  t.style.left = x + 'px';
  t.style.top = y + 'px';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1400);
}

/* ── 고양이 생성 ─────────────────────────────────────── */

let myCat;

function buildCats() {
  cats.length = 0;
  field.innerHTML = '';
  // 실시간 방에 들어가면 데모 친구 대신 진짜 멤버들의 고양이가 나온다
  const visibleFriends = MP.inRoom() ? [] : state.friends.filter(f => f.on);
  const total = 1 + visibleFriends.length + (MP.inRoom() ? Object.keys(roomRoster()).length : 0);
  myCat = new Cat({
    id: 'me', name: '나', isMe: true,
    skin: state.equipped.skin, hat: state.equipped.hat, lane: 10,
    slot: 0, slotCount: total,
  });
  cats.push(myCat);
  visibleFriends.forEach((f, i) => {
    cats.push(new Cat({
      id: f.id, name: f.name, skin: f.skin, hat: f.hat,
      lane: 34 + i * 26, slot: i + 1, slotCount: total,
    }));
  });
  syncRemoteCats();
}

/* 실시간 멤버 + 주민 명부(자리 비운 친구 포함)를 고양이 필드에 반영 */
function syncRemoteCats() {
  const online = new Map(MP.inRoom() ? MP.members().map(m => [m.id, m]) : []);
  const roster = { ...roomRoster() };
  for (const [id, m] of online) {
    roster[id] = { name: m.name, hat: m.hat, skin: m.skin, active: m.active, lastSeen: Date.now() };
  }
  const ids = MP.inRoom() ? Object.keys(roster) : [];

  for (const c of [...cats]) {
    if (c.cfg.remote && !ids.includes(c.cfg.id)) {
      c.el.remove();
      cats.splice(cats.indexOf(c), 1);
    }
  }

  ids.forEach((id, i) => {
    const info = roster[id];
    const isOnline = online.has(id);
    let c = cats.find(x => x.cfg.id === id);
    if (!c) {
      c = new Cat({
        id, name: info.name, skin: info.skin, hat: info.hat, remote: true,
        lane: 34 + (i % 4) * 22, slot: i + 1, slotCount: ids.length + 1,
      });
      cats.push(c);
      if (isOnline) toastMsg(`<b>${info.name}</b>의 햄스터가 놀러왔어요! 🎉`);
    } else if (isOnline && c.away) {
      toastMsg(`<b>${info.name}</b>(이)가 돌아왔어요! 👋`);
    }
    c.cfg.name = info.name;
    c.cfg.skin = info.skin;
    c.cfg.hat = info.hat;
    c.away = !isOnline;
    c.friendActive = isOnline && !!online.get(id).active;
    c.el.classList.toggle('away', c.away);
    c.applyLook();
    c.updateTag();
  });
}

/* 메인 루프 */
let lastT = performance.now();
function loop(now) {
  const dt = Math.min(.05, (now - lastT) / 1000);
  lastT = now;
  for (const c of cats) c.tick(dt, now);
  requestAnimationFrame(loop);
}

/* ── 친구 활동 시뮬레이션 (데모: 실제 서비스는 WebSocket) ── */

function simulateFriends() {
  setInterval(() => {
    for (const cat of cats) {
      if (cat.cfg.isMe || cat.cfg.remote) continue;   // 진짜 친구는 실제 신호로만 움직인다
      if (Math.random() < .3) {
        cat.friendActive = !cat.friendActive;
        cat.updateTag();
      }
      // 활동 중인 친구는 가끔 이모티콘을 보낸다 → 간접 대화의 유대감
      if (cat.friendActive && Math.random() < .35) {
        cat.tapReact(pick(['❤️', '😺', '☕', '🔥', '💪', '🎵']));
      }
    }
  }, 4000);
}

/* 내가 화면을 만지면 내 고양이가 봉고를 두드림 (PC판 키 입력의 모바일 번역)
   방에 있으면 "사용 중" 신호를 친구들에게 전파 — 시작/종료 시에만 전송해 트래픽 최소화 */
let mpActive = false;
let mpIdleTimer = null;

function noteMyActivity(holdSec = 2) {
  myCat.setMode('bongo', holdSec);   // 챗바퀴 굴리기
  if (!MP.inRoom()) return;
  if (!mpActive) { mpActive = true; MP.activity(true); }
  clearTimeout(mpIdleTimer);
  mpIdleTimer = setTimeout(() => { mpActive = false; MP.activity(false); }, 6000);
}

/* 화면을 누르고 있는 동안 내 햄스터가 챗바퀴를 굴린다 */
let screenHeld = false;

$('#lockscreen').addEventListener('pointerdown', e => {
  if (e.target.closest('.cat') || e.target.closest('button')) return;
  screenHeld = true;
  noteMyActivity(600);   // 누르는 동안 계속
});

function releaseScreen() {
  if (!screenHeld) return;
  screenHeld = false;
  noteMyActivity(1.2);   // 손을 떼면 잠깐 더 돌고 멈춤
}

$('#lockscreen').addEventListener('pointerup', releaseScreen);
$('#lockscreen').addEventListener('pointercancel', releaseScreen);

/* ── 실시간 방 연결 ──────────────────────────────────── */

/* 지금 접속 중인 멤버를 마을 주민 명부에 기록 (자리 비워도 고양이가 남도록) */
function updateRoster() {
  if (!MP.inRoom()) return;
  const code = MP.roomCode();
  const r = state.rosters[code] = state.rosters[code] || {};
  for (const m of MP.members()) {
    r[m.id] = { name: m.name, hat: m.hat, skin: m.skin, lastSeen: Date.now() };
  }
  // 명부는 최근 본 8명까지
  const ids = Object.keys(r).sort((a, b) => r[b].lastSeen - r[a].lastSeen);
  for (const id of ids.slice(8)) delete r[id];
  save();
}

/* 내 고양이가 쓰다듬받았을 때의 연출 */
function receivePet(name, offline = false, t = Date.now()) {
  addGuestbook(name, 'pet', t);
  toastMsg(offline
    ? `<b>${name}</b>(이)가 다녀갔어요 — 내 햄스터를 쓰다듬어줬어요 🐾`
    : `<b>${name}</b>(이)가 내 햄스터를 쓰다듬어줬어요 🐾`);
  myCat.el.classList.add('happy');
  myCat.showBubble('💗');
  const r = myCat.el.getBoundingClientRect();
  for (let i = 0; i < 6; i++) {
    setTimeout(() => spawnHeart(r.left + r.width / 2 + rand(-26, 26), r.top + rand(0, 24)), i * 120);
  }
  setTimeout(() => myCat.el.classList.remove('happy'), 2000);
  renderFriends();
}

const MP_HANDLERS = {
  getName: () => state.playerName,
  getOutfit: () => ({ hat: state.equipped.hat, skin: state.equipped.skin }),
  getServerName: () => (currentServer() || {}).name || '',
  onServerName: sname => {   // 서버 이름은 개설자가 정한 것을 참가자가 전달받아 채운다
    const s = currentServer();
    if (s && sname && s.name === '이름 없는 목장') { s.name = sname; save(); renderFriends(); }
  },
  onMembers: () => { updateRoster(); syncRemoteCats(); renderFriends(); },
  onPet: sender => receivePet(sender.name),
  onTrace: msg => { if (msg.kind === 'pet') receivePet(msg.name || '친구', true, msg.t); },
  onActivity: (id, active) => {
    const c = cats.find(x => x.cfg.id === id);
    if (!c) return;
    c.friendActive = active;
    c.updateTag();
    if (active) c.setMode('bongo', 3);
  },
  onEmote: (id, emoji) => {
    const c = cats.find(x => x.cfg.id === id);
    if (c) c.tapReact(emoji);
  },
  onStatus: s => {
    if (s === 'connected') {
      toastMsg(`방 <b>${MP.roomCode()}</b>에 연결됐어요! 친구를 기다리는 중… 📡`);
      buildCats();
      renderFriends();
    } else if (s === 'error') {
      toastMsg('연결에 실패했어요. 잠시 후 다시 시도해주세요 😿');
      MP.leave();
      renderFriends();
    } else if (s === 'left') {
      buildCats();
      renderFriends();
    }
  },
};

/* 서버(목장) 목록 관리 */
function upsertServer(code, name) {
  code = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  let s = state.servers.find(x => x.code === code);
  if (!s) {
    s = { code, name: name || '이름 없는 목장', t: Date.now() };
    state.servers.unshift(s);
    state.servers = state.servers.slice(0, 10);
  } else {
    if (name) s.name = name;
    s.t = Date.now();
  }
  save();
  return s;
}

function currentServer() {
  return state.servers.find(x => x.code === MP.roomCode());
}

function joinRoom(code, name) {
  upsertServer(code, name);
  MP.join(code, MP_HANDLERS);
  state.lastRoom = MP.roomCode();   // 다음에 앱을 열면 자동으로 이 목장에 재입장
  save();
  renderFriends();
}

function leaveRoom() {
  state.lastRoom = null;
  save();
  MP.leave();
}

function shareRoomLink() {
  const s = currentServer();
  const url = location.origin + location.pathname + '?room=' + MP.roomCode()
    + (s && s.name ? '&n=' + encodeURIComponent(s.name) : '');
  const text = `🐹 햄스터 목장 "${s ? s.name : ''}"에 놀러와!\n${url}`;
  if (navigator.share) {
    navigator.share({ text, url }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(text).then(
      () => toastMsg('초대 링크를 복사했어요. 친구에게 붙여넣기 하세요 📋'),
      () => toastMsg(`초대 링크: ${url}`));
  }
}

/* 초대 링크(?room=CODE&n=이름)로 들어왔거나, 마지막 목장이 있으면 자동 재입장 */
const urlParams = new URLSearchParams(location.search);
const urlRoom = urlParams.get('room') || state.lastRoom;
if (urlRoom) setTimeout(() => joinRoom(urlRoom, urlParams.get('n') || undefined), 800);

/* ── 아이템 드랍 (가챠) ──────────────────────────────── */

function rollRarity() {
  let r = Math.random();
  for (const [key, info] of Object.entries(RARITIES)) {
    if (r < info.p) return key;
    r -= info.p;
  }
  return 'common';
}

function gacha() {
  const rarity = rollRarity();
  const pool = CATALOG.filter(i => i.rarity === rarity);
  return pick(pool);
}

function dropItem(reason) {
  const item = gacha();
  state.inv[item.id] = (state.inv[item.id] || 0) + 1;
  save();
  toastItem(item, reason);
  renderDress();
  renderMarket();
}

function toastItem(item, reason) {
  const r = RARITIES[item.rarity];
  const t = document.createElement('div');
  t.className = 'toast' + (item.rarity === 'legendary' ? ' legendary' : '');
  t.style.setProperty('--rc', r.color);
  const visual = item.type === 'skin'
    ? `<span class="t-emoji" style="display:inline-block;width:28px;height:28px;border-radius:50%;background:${item.fur};border:2px solid #fff5"></span>`
    : `<span class="t-emoji">${item.emoji}</span>`;
  t.innerHTML = `${visual}<div><div><b>${item.name}</b> 획득! <span style="opacity:.6;font-size:12px">${reason || ''}</span></div>
    <div class="t-rarity">${r.name}</div></div>`;
  $('#toast-area').appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

function toastMsg(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span class="t-emoji">🐾</span><div>${msg}</div>`;
  $('#toast-area').appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

/* 방치 보상: 주기적으로 아이템이 들어온다 (데모용으로 가속) */
setInterval(() => dropItem('함께한 시간 보상'), 40000);
setTimeout(() => dropItem('첫 만남 선물 🎁'), 5000);

/* 코인 */
function addCoins(n, quiet = true) {
  state.coins += n;
  save();
  $('#coin-count').textContent = state.coins;
  if (!quiet) toastMsg(`🪙 +${n} 코인`);
}

/* ── 시계 ────────────────────────────────────────────── */

function tickClock() {
  const d = new Date();
  $('#clock-time').textContent =
    String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  $('#clock-date').textContent =
    d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' });
}
setInterval(tickClock, 1000);
tickClock();

/* ── 하단 시트 UI ────────────────────────────────────── */

const sheet = $('#sheet');
const backdrop = $('#sheet-backdrop');

function openSheet() {
  sheet.hidden = false;
  backdrop.hidden = false;
  renderDress(); renderFriends(); renderMarket();
}
function closeSheet() { sheet.hidden = true; backdrop.hidden = true; }

$('#swipe-hint').addEventListener('click', openSheet);
backdrop.addEventListener('click', closeSheet);

/* 잠금화면에서 위로 스와이프 → 시트 열기 */
let swipeY = null;
$('#lockscreen').addEventListener('touchstart', e => { swipeY = e.touches[0].clientY; }, { passive: true });
$('#lockscreen').addEventListener('touchend', e => {
  if (swipeY !== null && swipeY - e.changedTouches[0].clientY > 90) openSheet();
  swipeY = null;
}, { passive: true });

document.querySelectorAll('#sheet-tabs .tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#sheet-tabs .tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    $('#tab-' + btn.dataset.tab).classList.add('active');
  });
});

/* ── 꾸미기 탭 ───────────────────────────────────────── */

function itemCardHTML(item, opts = {}) {
  const r = RARITIES[item.rarity];
  const count = state.inv[item.id] || 0;
  const owned = count > 0;
  const equipped = state.equipped.hat === item.id || state.equipped.skin === item.id;
  const selected = fitting.hat === item.id || fitting.skin === item.id;
  const visual = item.type === 'skin'
    ? `<div class="i-swatch" style="background:${item.fur}"></div>`
    : `<div class="i-emoji">${item.emoji}</div>`;
  return `<div class="item-card ${owned ? '' : 'locked'} ${equipped ? 'equipped' : ''} ${selected ? 'selected' : ''}"
    style="--rc:${r.color}" data-id="${item.id}" data-act="${opts.act || 'fit'}">
    ${count > 1 ? `<span class="i-count">×${count}</span>` : ''}
    ${visual}
    <div class="i-name">${item.name}</div>
    <div class="i-sub">${opts.sub || r.name}</div>
  </div>`;
}

/* 입어보기(피팅) 상태 — 확정을 눌러야 실제 룩에 적용된다 */
let fitting = { hat: null, skin: 'skin-white' };
let fittingInit = false;

function fittingPreviewHTML() {
  const skin = byId(fitting.skin) || byId('skin-white');
  const hat = fitting.hat ? byId(fitting.hat) : null;
  const hatOwned = !fitting.hat || (state.inv[fitting.hat] || 0) > 0;
  const skinOwned = (state.inv[fitting.skin] || 0) > 0;
  const canConfirm = hatOwned && skinOwned;
  const dirty = fitting.hat !== state.equipped.hat || fitting.skin !== state.equipped.skin;
  return `
    <div class="fit-card">
      <div class="fit-stage">
        <div class="fit-ham" style="--fur:${skin.fur}">
          <div class="hat">${hat ? hat.emoji : ''}</div>
          ${catSVG()}
        </div>
      </div>
      <div class="fit-info">
        ${skin.name}${hat ? ' + ' + hat.name : ''}
        ${dirty ? '<span class="fit-badge">입어보는 중</span>' : '<span class="fit-badge on">착용 중</span>'}
      </div>
      ${canConfirm ? '' : '<p class="hint-text" style="margin:4px 0">미보유 아이템이 있어요 — 장터에서 구해보세요 🛒</p>'}
      <button class="btn primary wide" id="fit-confirm" ${(!dirty || !canConfirm) ? 'disabled' : ''}>✅ 확정</button>
      <button class="btn wide" id="fit-reset" ${dirty ? '' : 'disabled'}>↩ 되돌리기</button>
    </div>`;
}

function renderDress() {
  if (!fittingInit) {
    fitting = { hat: state.equipped.hat, skin: state.equipped.skin };
    fittingInit = true;
  }
  const scrollY = $('#sheet-body') ? $('#sheet-body').scrollTop : 0;

  const hats = CATALOG.filter(i => i.type === 'hat');
  const skins = CATALOG.filter(i => i.type === 'skin');
  const emos = CATALOG.filter(i => i.type === 'emo');

  const presetRows = state.presets.map((p, idx) => {
    const hat = p.hat ? byId(p.hat) : null;
    const skin = byId(p.skin);
    return `<div class="row">
      <span class="r-emoji">${hat ? hat.emoji : '🐹'}</span>
      <div class="r-main">
        <div class="r-title">${p.name}</div>
        <div class="r-sub">${skin.name}${hat ? ' + ' + hat.name : ''}</div>
      </div>
      <button class="btn primary" data-preset-apply="${idx}">입어보기</button>
      <button class="btn danger" data-preset-del="${idx}">✕</button>
    </div>`;
  }).join('') || `<p class="hint-text">마음에 드는 조합을 저장해두고 한 번에 입어보세요.</p>`;

  $('#tab-dress').innerHTML = `
    <p class="hint-text" style="margin-top:8px">왼쪽에서 아이템을 누르면 오른쪽 햄스터가 입어봐요.
    <b>확정</b>을 눌러야 실제 룩이 바뀝니다.</p>
    <div class="dress-split">
      <div class="dress-left">
        <div class="sec-title">🎩 모자</div>
        <div class="item-grid small">${hats.map(i => itemCardHTML(i)).join('')}</div>
        <div class="sec-title">🐹 스킨</div>
        <div class="item-grid small">${skins.map(i => itemCardHTML(i)).join('')}</div>
      </div>
      <div class="dress-right">${fittingPreviewHTML()}</div>
    </div>
    <div class="sec-title">💬 이모티콘 팩 <span style="opacity:.5;font-weight:400">— 보유하면 탭 반응에 추가</span></div>
    <div class="item-grid">${emos.map(i => itemCardHTML(i, { act: 'none', sub: i.pool.join(' ') })).join('')}</div>
    <div class="sec-title">💾 프리셋</div>
    <div class="row-list">${presetRows}</div>
    <button class="btn primary wide" id="save-preset">지금 입어본 조합을 프리셋으로 저장</button>
    <p class="hint-text">아이템은 화면을 켜두거나 햄스터와 놀아주면 자동으로 들어와요. (커먼 60% ~ 레전더리 3%)</p>`;

  /* 아이템 탭 → 입어보기 (실제 적용은 확정 버튼에서) */
  $('#tab-dress').querySelectorAll('.item-card').forEach(card => {
    card.addEventListener('click', () => {
      const item = byId(card.dataset.id);
      if (card.dataset.act === 'none') {
        if (!state.inv[item.id]) toastMsg('아직 없는 팩이에요. 장터를 구경해보세요! 🛒');
        return;
      }
      if (item.type === 'hat') {
        fitting.hat = fitting.hat === item.id ? null : item.id;
      } else if (item.type === 'skin') {
        fitting.skin = item.id;
      }
      renderDress();
    });
  });

  const confirmBtn = $('#fit-confirm');
  if (confirmBtn) confirmBtn.addEventListener('click', () => {
    state.equipped.hat = fitting.hat;
    state.equipped.skin = fitting.skin;
    save();
    myCat.cfg.hat = state.equipped.hat;
    myCat.cfg.skin = state.equipped.skin;
    myCat.applyLook();
    myCat.tapReact('✨');
    if (MP.inRoom()) {
      MP.outfit();   // 친구들 화면의 내 햄스터에도 즉시 반영
      toastMsg('룩 확정! 친구들 화면에도 바로 적용됐어요 ✨');
    } else {
      toastMsg('룩 확정! ✨');
    }
    renderDress();
  });

  const resetBtn = $('#fit-reset');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    fitting = { hat: state.equipped.hat, skin: state.equipped.skin };
    renderDress();
  });

  $('#save-preset').addEventListener('click', () => {
    if (state.presets.length >= 4) { toastMsg('프리셋은 4개까지 저장할 수 있어요.'); return; }
    state.presets.push({
      name: `세팅 ${state.presets.length + 1}`,
      hat: fitting.hat,
      skin: fitting.skin,
    });
    save();
    renderDress();
  });

  $('#tab-dress').querySelectorAll('[data-preset-apply]').forEach(b =>
    b.addEventListener('click', () => {
      const p = state.presets[+b.dataset.presetApply];
      fitting = { hat: p.hat, skin: p.skin };
      toastMsg('프리셋을 입어봤어요 — 확정을 눌러 적용하세요');
      renderDress();
    }));

  $('#tab-dress').querySelectorAll('[data-preset-del]').forEach(b =>
    b.addEventListener('click', () => {
      state.presets.splice(+b.dataset.presetDel, 1);
      save();
      renderDress();
    }));

  if ($('#sheet-body')) $('#sheet-body').scrollTop = scrollY;
}

/* ── 친구 탭 ─────────────────────────────────────────── */

function renderFriends() {
  const inRoom = MP.inRoom();

  let liveSection;
  if (inRoom) {
    const online = new Map(MP.members().map(m => [m.id, m]));
    const roster = { ...roomRoster() };
    for (const [id, m] of online) roster[id] = { ...roster[id], name: m.name, hat: m.hat, active: m.active };
    const ids = Object.keys(roster).sort((a, b) => (online.has(b) ? 1 : 0) - (online.has(a) ? 1 : 0));

    const memberRows = ids.map(id => {
      const m = roster[id];
      const isOn = online.has(id);
      const status = !isOn
        ? `자리 비움 💤 · ${m.lastSeen ? relTime(m.lastSeen) + '까지 있었어요' : ''}`
        : m.active ? '지금 폰 사용 중 ⌨️' : '접속 중 🟢';
      return `<div class="row" ${isOn ? '' : 'style="opacity:.7"'}>
        <span class="r-emoji">${m.hat ? byId(m.hat).emoji : '🐱'}</span>
        <div class="r-main">
          <div class="r-title">${m.name}</div>
          <div class="r-sub">${status}</div>
        </div>
        ${isOn ? `<button class="btn primary" data-wave="${id}">👋 인사</button>` : ''}
      </div>`;
    }).join('')
      || '<p class="hint-text">아직 아무도 없어요. 아래 버튼으로 초대 링크를 보내보세요!</p>';

    const bookRows = state.guestbook.slice(0, 10).map(g => `<div class="row">
      <span class="r-emoji">🐾</span>
      <div class="r-main">
        <div class="r-title">${g.name}${g.count > 1 ? ` <span style="opacity:.6;font-size:12px">×${g.count}</span>` : ''}</div>
        <div class="r-sub">내 햄스터를 쓰다듬고 갔어요 · ${relTime(g.t)}</div>
      </div>
    </div>`).join('')
      || '<p class="hint-text">아직 흔적이 없어요. 친구도 내 햄스터를 쓰다듬어줄 수 있어요.</p>';

    const server = currentServer();
    liveSection = `
      <div class="sec-title">🏡 ${server ? server.name : '내 목장'}
        <span style="opacity:.5;font-weight:400">${MP.isConnected() ? '연결됨' : '연결 중…'}</span></div>
      <div class="invite-code">${MP.roomCode()}</div>
      <button class="btn primary wide" id="share-room">📤 초대 링크 보내기 (카톡 등)</button>
      <div class="sec-title">👥 목장 멤버들</div>
      <div class="row-list">${memberRows}</div>
      <p class="hint-text">자리 비운 친구의 햄스터도 <b>꾹 눌러 쓰다듬어</b> 줄 수 있어요.
      친구가 돌아오면 "다녀갔어요 🐾" 흔적이 전달됩니다. 답장은 필요 없어요.</p>
      <div class="sec-title">📖 방명록 <span style="opacity:.5;font-weight:400">— 다녀간 흔적</span></div>
      <div class="row-list">${bookRows}</div>
      <button class="btn danger wide" id="leave-room">로비로 나가기</button>`;
  } else {
    liveSection = `
      <div class="sec-title">📡 멀티플레이 로비</div>
      <p class="hint-text">서버(목장)를 만들어 초대 링크를 보내면, 친구의 햄스터가 <b>진짜로</b>
      내 목장에 나타나요. 친구가 폰을 쓰는 동안 친구 햄스터가 실시간으로 챗바퀴를 굴립니다.</p>`;
  }

  /* 서버 로비 — 내 목장 목록 / 새 서버 개설 / 코드 참가 */
  const serverRows = state.servers.map(s => {
    const isCur = inRoom && MP.roomCode() === s.code;
    return `<div class="row" ${isCur ? 'style="border:1px solid rgba(230,160,80,.7)"' : ''}>
      <span class="r-emoji">🏡</span>
      <div class="r-main">
        <div class="r-title">${s.name}</div>
        <div class="r-sub">코드 ${s.code}${isCur ? ' · 접속 중' : ''}</div>
      </div>
      ${isCur ? '' : `<button class="btn primary" data-server-join="${s.code}">입장</button>
      <button class="btn danger" data-server-del="${s.code}">✕</button>`}
    </div>`;
  }).join('') || '<p class="hint-text">아직 서버가 없어요. 아래에서 첫 목장을 만들어보세요!</p>';

  const lobbySection = `
    <div class="sec-title">🗂 내 서버 목록</div>
    <div class="row-list">${serverRows}</div>
    <div class="sec-title">➕ 새 서버 만들기</div>
    <div class="friend-input">
      <input id="server-name" placeholder="목장 이름 (예: 우리집 목장)" maxlength="12">
      <button class="btn primary" id="create-room">개설</button>
    </div>
    <div class="sec-title">🔑 초대 코드로 참가</div>
    <div class="friend-input">
      <input id="join-code" placeholder="코드 5자리 입력 (예: AB3CD)" maxlength="5"
        autocapitalize="characters" autocomplete="off">
      <button class="btn primary" id="join-room">참가</button>
    </div>`;

  const demoSection = inRoom ? '' : (() => {
    const rows = state.friends.map(f => {
      const cat = cats.find(c => c.cfg.id === f.id);
      const status = !f.on ? '내 화면에서 숨김'
        : cat && cat.friendActive ? '지금 열심히 타이핑 중 ⌨️' : '휴식 중 💤';
      return `<div class="row">
        <span class="r-emoji">${f.hat ? byId(f.hat).emoji : '🐱'}</span>
        <div class="r-main">
          <div class="r-title">${f.name}의 햄스터</div>
          <div class="r-sub">${status}</div>
        </div>
        <button class="btn" data-friend-toggle="${f.id}">${f.on ? '숨기기' : '보이기'}</button>
      </div>`;
    }).join('');
    return `
      <div class="sec-title">🤖 데모 친구 <span style="opacity:.5;font-weight:400">— 혼자일 때 심심하지 않게</span></div>
      <div class="row-list">${rows}</div>
      <p class="hint-text">데모 친구는 가상의 햄스터예요. 서버에 들어가면 진짜 친구들로 바뀝니다.</p>`;
  })();

  $('#tab-friends').innerHTML = `
    <div class="sec-title">🏷️ 내 이름 <span style="opacity:.5;font-weight:400">— 친구 화면에 표시돼요</span></div>
    <div class="friend-input">
      <input id="player-name" value="${state.playerName}" maxlength="8">
      <button class="btn" id="save-name">저장</button>
    </div>
    ${liveSection}
    ${lobbySection}
    ${demoSection}`;

  $('#save-name').addEventListener('click', () => {
    const n = $('#player-name').value.trim();
    if (!n) return;
    state.playerName = n;
    save();
    if (MP.inRoom()) MP.outfit();   // 이름은 모든 메시지에 실려 자연 전파됨
    toastMsg(`이제 친구들에게 <b>${n}</b>(으)로 보여요!`);
  });

  if (inRoom) {
    $('#share-room').addEventListener('click', shareRoomLink);
    $('#leave-room').addEventListener('click', leaveRoom);
    $('#tab-friends').querySelectorAll('[data-wave]').forEach(b =>
      b.addEventListener('click', () => {
        closeSheet();
        myCat.tapReact('👋');
      }));
  } else {
    $('#tab-friends').querySelectorAll('[data-friend-toggle]').forEach(b =>
      b.addEventListener('click', () => {
        const f = state.friends.find(x => x.id === b.dataset.friendToggle);
        f.on = !f.on;
        save();
        buildCats();
        renderFriends();
      }));
  }

  /* 로비 공통 — 서버 개설 / 코드 참가 / 목록 입장·삭제 */
  $('#create-room').addEventListener('click', () => {
    const name = $('#server-name').value.trim() || '내 목장';
    joinRoom(MP.newCode(), name);
  });
  $('#join-room').addEventListener('click', () => {
    const code = $('#join-code').value.trim();
    if (code.length < 4) { toastMsg('코드 5자리를 입력해주세요.'); return; }
    joinRoom(code);
  });
  $('#tab-friends').querySelectorAll('[data-server-join]').forEach(b =>
    b.addEventListener('click', () => joinRoom(b.dataset.serverJoin)));
  $('#tab-friends').querySelectorAll('[data-server-del]').forEach(b =>
    b.addEventListener('click', () => {
      state.servers = state.servers.filter(s => s.code !== b.dataset.serverDel);
      save();
      renderFriends();
    }));
}

/* ── 장터 탭 ─────────────────────────────────────────── */

function todayKey() { return new Date().toISOString().slice(0, 10); }

function shopItems() {
  // 하루 단위로 고정되는 4개 상품
  if (state.shopDay !== todayKey() || !state.shopSeed) {
    state.shopDay = todayKey();
    const shuffled = [...CATALOG].sort(() => Math.random() - .5);
    state.shopSeed = shuffled.slice(0, 4).map(i => i.id);
    save();
  }
  return state.shopSeed.map(byId).filter(Boolean);
}

function renderMarket() {
  const dupes = CATALOG.filter(i => (state.inv[i.id] || 0) > 1);
  const dupeRows = dupes.map(i => {
    const r = RARITIES[i.rarity];
    const visual = i.type === 'skin'
      ? `<span class="r-emoji" style="display:inline-block;width:26px;height:26px;border-radius:50%;background:${i.fur};border:2px solid #fff4"></span>`
      : `<span class="r-emoji">${i.emoji}</span>`;
    return `<div class="row">
      ${visual}
      <div class="r-main">
        <div class="r-title">${i.name} <span style="color:${r.color};font-size:11px">${r.name}</span></div>
        <div class="r-sub">보유 ×${state.inv[i.id]} · 중복분 판매 가능</div>
      </div>
      <button class="btn gold" data-sell="${i.id}">🪙 ${r.value}에 팔기</button>
    </div>`;
  }).join('') || '<p class="hint-text">중복 아이템이 생기면 여기서 팔 수 있어요.</p>';

  const shopRows = shopItems().map(i => {
    const r = RARITIES[i.rarity];
    const price = r.value * 2;
    const visual = i.type === 'skin'
      ? `<span class="r-emoji" style="display:inline-block;width:26px;height:26px;border-radius:50%;background:${i.fur};border:2px solid #fff4"></span>`
      : `<span class="r-emoji">${i.emoji}</span>`;
    return `<div class="row">
      ${visual}
      <div class="r-main">
        <div class="r-title">${i.name} <span style="color:${r.color};font-size:11px">${r.name}</span></div>
        <div class="r-sub">${state.inv[i.id] ? '이미 보유 중' : '다른 목장주가 내놓은 매물'}</div>
      </div>
      <button class="btn primary" data-buy="${i.id}" ${state.coins < price ? 'disabled' : ''}>🪙 ${price}</button>
    </div>`;
  }).join('');

  $('#tab-market').innerHTML = `
    <p class="hint-text">보유 코인: <b>🪙 ${state.coins}</b> — 햄스터를 쓰다듬거나 중복 아이템을 팔면 코인이 모여요.</p>
    <div class="sec-title">🏷️ 오늘의 장터 매물</div>
    <div class="row-list">${shopRows}</div>
    <div class="sec-title">📦 내 중복 아이템 팔기</div>
    <div class="row-list">${dupeRows}</div>
    <p class="hint-text">※ 실제 서비스에서는 유저 간 거래(등록/구매)가 서버를 통해 이뤄집니다.</p>`;

  $('#tab-market').querySelectorAll('[data-sell]').forEach(b =>
    b.addEventListener('click', () => {
      const i = byId(b.dataset.sell);
      if ((state.inv[i.id] || 0) < 2) return;
      state.inv[i.id]--;
      addCoins(RARITIES[i.rarity].value, false);
      renderMarket(); renderDress();
    }));

  $('#tab-market').querySelectorAll('[data-buy]').forEach(b =>
    b.addEventListener('click', () => {
      const i = byId(b.dataset.buy);
      const price = RARITIES[i.rarity].value * 2;
      if (state.coins < price) return;
      state.coins -= price;
      state.inv[i.id] = (state.inv[i.id] || 0) + 1;
      save();
      $('#coin-count').textContent = state.coins;
      toastItem(i, '장터 구매');
      renderMarket(); renderDress();
    }));
}

/* ── 시작 ────────────────────────────────────────────── */

$('#coin-count').textContent = state.coins;
buildCats();
simulateFriends();
requestAnimationFrame(loop);

addEventListener('resize', () => {
  for (const c of cats) c.x = Math.min(c.x, Math.max(4, innerWidth - 112));
});
