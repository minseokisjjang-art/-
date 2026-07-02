/* ═══════════════════════════════════════════════════════
   봉고캣 모바일 — 잠금화면 프로토타입
   방치형 + 수집 + 커뮤니티(친구 고양이 실시간 시각화)
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
  // 고양이 스킨
  { id: 'skin-white',  type: 'skin', fur: '#fffaf2', name: '하양냥',   rarity: 'common' },
  { id: 'skin-cream',  type: 'skin', fur: '#ffe8c2', name: '크림냥',   rarity: 'common' },
  { id: 'skin-gray',   type: 'skin', fur: '#c9cdd6', name: '회색냥',   rarity: 'common' },
  { id: 'skin-choco',  type: 'skin', fur: '#b08968', name: '초코냥',   rarity: 'rare' },
  { id: 'skin-pink',   type: 'skin', fur: '#ffd1dc', name: '핑크냥',   rarity: 'epic' },
  { id: 'skin-mint',   type: 'skin', fur: '#b5ead7', name: '민트냥',   rarity: 'epic' },
  { id: 'skin-gold',   type: 'skin', fur: '#ffe066', name: '황금냥',   rarity: 'legendary' },
  // 이모티콘 팩 (탭 반응에 사용)
  { id: 'emo-music',   type: 'emo', emoji: '🎵', name: '음표팩',   rarity: 'common',    pool: ['🎵', '🎶', '🎤'] },
  { id: 'emo-food',    type: 'emo', emoji: '🐟', name: '간식팩',   rarity: 'rare',      pool: ['🐟', '🍙', '🥛'] },
  { id: 'emo-magic',   type: 'emo', emoji: '✨', name: '반짝팩',   rarity: 'epic',      pool: ['✨', '🌟', '💫'] },
  { id: 'emo-royal',   type: 'emo', emoji: '💎', name: '보석팩',   rarity: 'legendary', pool: ['💎', '👑', '🏆'] },
];

const BASE_EMOJI = ['❤️', '😺', '💕', '😸', '🐾'];
const byId = id => CATALOG.find(i => i.id === id);

/* ── 상태 (localStorage 영속화) ──────────────────────── */

const SAVE_KEY = 'bongo-cat-mobile-v1';

const DEFAULT_STATE = {
  coins: 30,
  inv: { 'skin-white': 1 },                 // itemId → 보유 개수
  equipped: { hat: null, skin: 'skin-white' },
  presets: [],                              // {name, hat, skin}
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

function myEmojiPool() {
  const pool = [...BASE_EMOJI];
  for (const item of CATALOG) {
    if (item.type === 'emo' && state.inv[item.id]) pool.push(...item.pool);
  }
  return pool;
}

/* ── 고양이 SVG ──────────────────────────────────────── */

function catSVG() {
  return `
  <svg class="catsvg" viewBox="0 0 120 104" xmlns="http://www.w3.org/2000/svg">
    <!-- 귀 -->
    <path class="fur fur-stroke" d="M30 44 L20 10 L50 28 Z"/>
    <path class="fur fur-stroke" d="M90 44 L100 10 L70 28 Z"/>
    <path d="M31 38 L26 20 L42 30 Z" fill="#ffb3c1" opacity=".8"/>
    <path d="M89 38 L94 20 L78 30 Z" fill="#ffb3c1" opacity=".8"/>
    <!-- 얼굴+몸 -->
    <ellipse class="fur fur-stroke" cx="60" cy="62" rx="42" ry="36"/>
    <!-- 눈: 뜸 -->
    <g class="eyes-open" fill="#3b3149">
      <circle cx="45" cy="56" r="4"/>
      <circle cx="75" cy="56" r="4"/>
    </g>
    <!-- 눈: 행복 ^^ -->
    <g class="eyes-happy" stroke="#3b3149" stroke-width="3" stroke-linecap="round" fill="none">
      <path d="M39 57 q6 -7 12 0"/>
      <path d="M69 57 q6 -7 12 0"/>
    </g>
    <!-- 입 ω -->
    <path d="M53 67 q3.5 5 7 0 q3.5 5 7 0" stroke="#3b3149" stroke-width="2.6"
      stroke-linecap="round" fill="none"/>
    <!-- 볼터치 -->
    <ellipse cx="35" cy="66" rx="6" ry="4" fill="#ffb3c1" opacity=".65"/>
    <ellipse cx="85" cy="66" rx="6" ry="4" fill="#ffb3c1" opacity=".65"/>
    <!-- 앞발 -->
    <g class="paw paw-l"><ellipse class="fur fur-stroke" cx="34" cy="95" rx="12" ry="8"/></g>
    <g class="paw paw-r"><ellipse class="fur fur-stroke" cx="86" cy="95" rx="12" ry="8"/></g>
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
        <div class="hat"></div>
        ${catSVG()}
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
      t.textContent = '내 봉고캣';
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

  tapReact(emoji) {
    const now = performance.now();
    if (now - this.lastBubble < 350) return;
    this.lastBubble = now;
    this.showBubble(emoji || pick(this.cfg.isMe ? myEmojiPool() : BASE_EMOJI));
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
  t.textContent = pick(['그르릉…', '골골골', '냐앙~']);
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
  const visibleFriends = state.friends.filter(f => f.on);
  const total = 1 + visibleFriends.length;
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
      if (cat.cfg.isMe) continue;
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

/* 내가 화면을 만지면 내 고양이가 봉고를 두드림 (PC판 키 입력의 모바일 번역) */
$('#lockscreen').addEventListener('pointerdown', e => {
  if (e.target.closest('.cat') || e.target.closest('button')) return;
  myCat.setMode('bongo', 2);
});

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
  const visual = item.type === 'skin'
    ? `<div class="i-swatch" style="background:${item.fur}"></div>`
    : `<div class="i-emoji">${item.emoji}</div>`;
  return `<div class="item-card ${owned ? '' : 'locked'} ${equipped ? 'equipped' : ''}"
    style="--rc:${r.color}" data-id="${item.id}" data-act="${opts.act || 'equip'}">
    ${count > 1 ? `<span class="i-count">×${count}</span>` : ''}
    ${visual}
    <div class="i-name">${item.name}</div>
    <div class="i-sub">${opts.sub || r.name}</div>
  </div>`;
}

function renderDress() {
  const hats = CATALOG.filter(i => i.type === 'hat');
  const skins = CATALOG.filter(i => i.type === 'skin');
  const emos = CATALOG.filter(i => i.type === 'emo');

  const presetRows = state.presets.map((p, idx) => {
    const hat = p.hat ? byId(p.hat) : null;
    const skin = byId(p.skin);
    return `<div class="row">
      <span class="r-emoji">${hat ? hat.emoji : '🐱'}</span>
      <div class="r-main">
        <div class="r-title">${p.name}</div>
        <div class="r-sub">${skin.name}${hat ? ' + ' + hat.name : ''}</div>
      </div>
      <button class="btn primary" data-preset-apply="${idx}">적용</button>
      <button class="btn danger" data-preset-del="${idx}">✕</button>
    </div>`;
  }).join('') || `<p class="hint-text">마음에 드는 조합을 저장해두고 한 번에 바꿔보세요.</p>`;

  $('#tab-dress').innerHTML = `
    <div class="sec-title">🎩 모자 <span style="opacity:.5;font-weight:400">— 탭해서 착용/해제</span></div>
    <div class="item-grid">${hats.map(i => itemCardHTML(i)).join('')}</div>
    <div class="sec-title">🐱 고양이 스킨</div>
    <div class="item-grid">${skins.map(i => itemCardHTML(i)).join('')}</div>
    <div class="sec-title">💬 이모티콘 팩 <span style="opacity:.5;font-weight:400">— 보유하면 탭 반응에 추가</span></div>
    <div class="item-grid">${emos.map(i => itemCardHTML(i, { act: 'none', sub: i.pool.join(' ') })).join('')}</div>
    <div class="sec-title">💾 프리셋</div>
    <div class="row-list">${presetRows}</div>
    <button class="btn primary wide" id="save-preset">현재 세팅 프리셋으로 저장</button>
    <p class="hint-text">아이템은 화면을 켜두거나 고양이와 놀아주면 자동으로 들어와요. (커먼 60% ~ 레전더리 3%)</p>`;

  $('#tab-dress').querySelectorAll('.item-card').forEach(card => {
    card.addEventListener('click', () => {
      const item = byId(card.dataset.id);
      if (!state.inv[item.id]) { toastMsg(`아직 없는 아이템이에요. 장터를 구경해보세요! 🛒`); return; }
      if (card.dataset.act === 'none') return;
      if (item.type === 'hat') {
        state.equipped.hat = state.equipped.hat === item.id ? null : item.id;
      } else if (item.type === 'skin') {
        state.equipped.skin = item.id;
      }
      save();
      myCat.cfg.hat = state.equipped.hat;
      myCat.cfg.skin = state.equipped.skin;
      myCat.applyLook();
      myCat.tapReact('✨');
      renderDress();
      // PC판처럼: 내 새 아이템은 친구 화면에도 즉시 반영 (데모에서는 안내만)
      toastMsg('친구들 화면의 내 고양이에도 바로 적용됐어요 ✨');
    });
  });

  $('#save-preset').addEventListener('click', () => {
    if (state.presets.length >= 4) { toastMsg('프리셋은 4개까지 저장할 수 있어요.'); return; }
    state.presets.push({
      name: `세팅 ${state.presets.length + 1}`,
      hat: state.equipped.hat,
      skin: state.equipped.skin,
    });
    save();
    renderDress();
  });

  $('#tab-dress').querySelectorAll('[data-preset-apply]').forEach(b =>
    b.addEventListener('click', () => {
      const p = state.presets[+b.dataset.presetApply];
      if (p.hat && !state.inv[p.hat]) { toastMsg('프리셋의 모자를 더 이상 보유하고 있지 않아요.'); return; }
      state.equipped.hat = p.hat;
      state.equipped.skin = state.inv[p.skin] ? p.skin : state.equipped.skin;
      save();
      myCat.cfg.hat = state.equipped.hat;
      myCat.cfg.skin = state.equipped.skin;
      myCat.applyLook();
      renderDress();
    }));

  $('#tab-dress').querySelectorAll('[data-preset-del]').forEach(b =>
    b.addEventListener('click', () => {
      state.presets.splice(+b.dataset.presetDel, 1);
      save();
      renderDress();
    }));
}

/* ── 친구 탭 ─────────────────────────────────────────── */

let inviteCode = null;

function renderFriends() {
  const rows = state.friends.map(f => {
    const cat = cats.find(c => c.cfg.id === f.id);
    const status = !f.on ? '내 화면에서 숨김'
      : cat && cat.friendActive ? '지금 열심히 타이핑 중 ⌨️' : '휴식 중 💤';
    return `<div class="row">
      <span class="r-emoji">${f.hat ? byId(f.hat).emoji : '🐱'}</span>
      <div class="r-main">
        <div class="r-title">${f.name}의 봉고캣</div>
        <div class="r-sub">${status}</div>
      </div>
      <button class="btn" data-friend-toggle="${f.id}">${f.on ? '숨기기' : '보이기'}</button>
      <button class="btn primary" data-friend-emo="${f.id}" ${f.on ? '' : 'disabled'}>👋 인사</button>
    </div>`;
  }).join('') || '<p class="hint-text">아직 친구가 없어요. 아래에서 초대해보세요!</p>';

  $('#tab-friends').innerHTML = `
    <p class="hint-text">친구를 초대하면 내 잠금화면에 친구의 고양이가 함께 살아요.
    친구가 폰이나 PC를 쓰는 동안 친구 고양이가 실시간으로 봉고를 두드려요 —
    말 없이도 "지금 함께 있다"는 느낌을 받아보세요.</p>
    <div class="sec-title">👥 내 친구들</div>
    <div class="row-list">${rows}</div>
    <div class="sec-title">✉️ 친구 초대</div>
    <div class="invite-code" id="invite-code">${inviteCode || '·····'}</div>
    <button class="btn primary wide" id="gen-code">${inviteCode ? '초대 코드 복사' : '초대 코드 만들기'}</button>
    <div class="sec-title">🔑 코드로 친구 추가 (데모)</div>
    <div class="friend-input">
      <input id="friend-name" placeholder="친구 이름 입력" maxlength="8">
      <button class="btn primary" id="add-friend">추가</button>
    </div>
    <p class="hint-text">※ 프로토타입에서는 친구 활동이 시뮬레이션됩니다. 실제 서비스는 WebSocket으로
    친구의 입력 신호를 실시간 동기화합니다. (README 로드맵 참고)</p>`;

  $('#gen-code').addEventListener('click', () => {
    if (!inviteCode) {
      inviteCode = Array.from({ length: 5 }, () => pick([...'ABCDEFGHJKMNPQRSTUVWXYZ23456789'])).join('');
      renderFriends();
      return;
    }
    navigator.clipboard?.writeText(`봉고캣 모바일에서 함께해요! 초대 코드: ${inviteCode}`).then(
      () => toastMsg('초대 코드를 복사했어요 📋'),
      () => toastMsg(`초대 코드: ${inviteCode}`));
  });

  $('#add-friend').addEventListener('click', () => {
    const name = $('#friend-name').value.trim();
    if (!name) return;
    if (state.friends.length >= 5) { toastMsg('친구는 5명까지 함께할 수 있어요.'); return; }
    state.friends.push({
      id: 'f' + Date.now(),
      name,
      skin: pick(CATALOG.filter(i => i.type === 'skin')).id,
      hat: Math.random() < .7 ? pick(CATALOG.filter(i => i.type === 'hat')).id : null,
      on: true,
    });
    save();
    buildCats();
    renderFriends();
    toastMsg(`${name}의 고양이가 놀러왔어요! 🎉`);
  });

  $('#tab-friends').querySelectorAll('[data-friend-toggle]').forEach(b =>
    b.addEventListener('click', () => {
      const f = state.friends.find(x => x.id === b.dataset.friendToggle);
      f.on = !f.on;
      save();
      buildCats();
      renderFriends();
    }));

  $('#tab-friends').querySelectorAll('[data-friend-emo]').forEach(b =>
    b.addEventListener('click', () => {
      const cat = cats.find(c => c.cfg.id === b.dataset.friendEmo);
      if (!cat) return;
      closeSheet();
      myCat.tapReact('👋');
      setTimeout(() => cat.tapReact(pick(['👋', '❤️', '😸'])), 700);
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
        <div class="r-sub">${state.inv[i.id] ? '이미 보유 중' : '다른 집사가 내놓은 매물'}</div>
      </div>
      <button class="btn primary" data-buy="${i.id}" ${state.coins < price ? 'disabled' : ''}>🪙 ${price}</button>
    </div>`;
  }).join('');

  $('#tab-market').innerHTML = `
    <p class="hint-text">보유 코인: <b>🪙 ${state.coins}</b> — 고양이를 쓰다듬거나 중복 아이템을 팔면 코인이 모여요.</p>
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
