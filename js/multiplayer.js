/* ═══════════════════════════════════════════════════════
   봉고캣 모바일 — 실시간 멀티플레이
   공개 MQTT 브로커(WebSocket)를 통한 방(room) 기반 동기화.
   서버 구축 없이 초대 코드만으로 서로의 고양이를 연결한다.

   메시지 프로토콜 (JSON, 모두 같은 방 토픽으로 발행):
     hello    입장 인사 + 내 꾸미기 상태  → 기존 멤버들은 state로 응답
     state    내 상태 브로드캐스트 (하트비트 겸용, 25초 주기)
     outfit   꾸미기 변경 즉시 반영
     activity 화면 사용 시작/종료 (엣지 트리거 → 상대 화면에서 봉고 연주)
     emote    이모티콘 (상대 화면의 내 고양이가 말풍선을 띄움)
     pet      친구 고양이 쓰다듬기 (target에게만 의미 있음)
     bye      퇴장 (MQTT last-will로 비정상 종료도 커버)

   부재중 흔적(trace): 자리 비운 친구의 고양이를 쓰다듬으면
   retained 메시지로 개인 우편함 토픽에 남겨두고, 친구가
   돌아왔을 때 수신 → 처리 후 비운다. (답장 없는 안부)
     room/{코드}/mail/{받는이}/{보낸이}
   ═══════════════════════════════════════════════════════ */

'use strict';

const MP = (() => {
  const BROKERS = [
    'wss://broker.emqx.io:8084/mqtt',
    'wss://broker.hivemq.com:8884/mqtt',
  ];
  const TOPIC_PREFIX = 'bongocat-mobile/v1/room/';
  const HEARTBEAT_MS = 25000;
  const PRUNE_AFTER_MS = 70000;   // 하트비트 2회 이상 놓치면 오프라인 처리

  let client = null;
  let room = null;
  let connected = false;
  let brokerIdx = 0;
  let failTimer = null;
  let hbTimer = null;
  let pruneTimer = null;
  let handlers = {};
  const members = new Map();      // id → {id, name, hat, skin, active, lastSeen}

  const myId = (() => {
    let id = localStorage.getItem('bongo-mp-id');
    if (!id) {
      id = 'p' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem('bongo-mp-id', id);
    }
    return id;
  })();

  function customBroker() {
    return new URLSearchParams(location.search).get('broker');
  }

  function topic() { return TOPIC_PREFIX + room; }

  function publish(type, payload = {}) {
    if (!client || !room) return;
    client.publish(topic(), JSON.stringify({
      ...payload, type, from: myId, name: handlers.getName(),
    }));
  }

  function myOutfit() {
    const o = handlers.getOutfit();
    const sname = handlers.getServerName ? handlers.getServerName() : '';
    return sname ? { ...o, sname } : o;
  }

  function join(code, h) {
    leave(true);
    handlers = h;
    room = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!room) return;
    connected = false;
    h.onStatus('connecting');

    const url = customBroker() || BROKERS[brokerIdx % BROKERS.length];
    client = mqtt.connect(url, {
      clientId: 'bongo_' + myId + '_' + Math.random().toString(16).slice(2, 6),
      clean: true,
      connectTimeout: 8000,
      reconnectPeriod: 3000,
      will: {
        topic: TOPIC_PREFIX + room,
        payload: JSON.stringify({ type: 'bye', from: myId }),
        qos: 0, retain: false,
      },
    });

    // 브로커 접속 실패 시 예비 브로커로 자동 전환
    failTimer = setTimeout(() => {
      if (!connected && !customBroker() && brokerIdx < BROKERS.length - 1) {
        brokerIdx++;
        join(room, handlers);
      } else if (!connected) {
        handlers.onStatus('error');
      }
    }, 10000);

    client.on('connect', () => {
      const mailFilter = `${TOPIC_PREFIX}${room}/mail/${myId}/+`;
      client.subscribe([topic(), mailFilter], err => {
        if (err) { handlers.onStatus('error'); return; }
        connected = true;
        clearTimeout(failTimer);
        handlers.onStatus('connected');
        publish('hello', myOutfit());
      });
    });

    client.on('message', (t, buf) => {
      if (t.includes('/mail/')) { handleTrace(t, buf); return; }
      let msg;
      try { msg = JSON.parse(buf.toString()); } catch { return; }
      if (!msg || typeof msg !== 'object' || msg.from === myId) return;
      handleMessage(msg);
    });

    client.on('offline', () => { if (connected) handlers.onStatus('reconnecting'); });

    hbTimer = setInterval(() => publish('state', myOutfit()), HEARTBEAT_MS);
    pruneTimer = setInterval(() => {
      let changed = false;
      const now = Date.now();
      for (const [id, m] of members) {
        if (now - m.lastSeen > PRUNE_AFTER_MS) { members.delete(id); changed = true; }
      }
      if (changed) handlers.onMembers();
    }, 10000);
  }

  function handleMessage(msg) {
    if (msg.type === 'bye') {
      if (members.delete(msg.from)) handlers.onMembers();
      return;
    }
    let m = members.get(msg.from);
    if (!m) {
      m = {
        id: msg.from, name: msg.name || '친구',
        hat: msg.hat ?? null, skin: msg.skin || 'skin-white',
        active: false, lastSeen: Date.now(),
      };
      members.set(msg.from, m);
      handlers.onMembers();
    }
    m.lastSeen = Date.now();
    if (msg.name) m.name = msg.name;

    switch (msg.type) {
      case 'hello':
        m.hat = msg.hat ?? null;
        m.skin = msg.skin || m.skin;
        if (msg.sname && handlers.onServerName) handlers.onServerName(msg.sname);
        handlers.onMembers();
        // 새 멤버가 나를 알 수 있게 내 상태를 응답 (응답 폭주 방지용 랜덤 지연)
        setTimeout(() => publish('state', myOutfit()), 200 + Math.random() * 800);
        break;
      case 'state':
      case 'outfit':
        m.hat = msg.hat ?? null;
        m.skin = msg.skin || m.skin;
        if (msg.sname && handlers.onServerName) handlers.onServerName(msg.sname);
        handlers.onMembers();
        break;
      case 'activity':
        m.active = !!msg.active;
        handlers.onActivity(m.id, m.active);
        break;
      case 'emote':
        if (typeof msg.emoji === 'string' && msg.emoji.length <= 8) {
          handlers.onEmote(m.id, msg.emoji);
        }
        break;
      case 'pet':
        if (msg.target === myId && handlers.onPet) handlers.onPet(m);
        break;
    }
  }

  /* 부재중 흔적 수신 — 처리한 뒤 retained 메시지를 비운다 */
  function handleTrace(t, buf) {
    if (!buf.length) return;   // 비우기 메시지
    let msg;
    try { msg = JSON.parse(buf.toString()); } catch { return; }
    if (!msg || msg.type !== 'trace' || msg.from === myId) return;
    if (handlers.onTrace) handlers.onTrace(msg);
    client.publish(t, '', { retain: true });
  }

  function leave(silent) {
    clearTimeout(failTimer);
    clearInterval(hbTimer);
    clearInterval(pruneTimer);
    if (client) {
      try { publish('bye'); client.end(true); } catch { /* 이미 끊긴 연결 */ }
    }
    client = null;
    room = null;
    connected = false;
    members.clear();
    if (!silent && handlers.onMembers) handlers.onMembers();
    if (!silent && handlers.onStatus) handlers.onStatus('left');
  }

  return {
    join,
    leave: () => leave(false),
    inRoom: () => !!room,
    isConnected: () => connected,
    roomCode: () => room,
    members: () => [...members.values()],
    activity: active => publish('activity', { active }),
    emote: emoji => publish('emote', { emoji }),
    outfit: () => publish('outfit', myOutfit()),
    pet: targetId => publish('pet', { target: targetId }),
    trace: (targetId, kind) => {
      if (!client || !room) return;
      client.publish(`${TOPIC_PREFIX}${room}/mail/${targetId}/${myId}`,
        JSON.stringify({ type: 'trace', kind, from: myId, name: handlers.getName(), t: Date.now() }),
        { retain: true });
    },
    isOnline: id => members.has(id),
    newCode: () =>
      Array.from({ length: 5 }, () =>
        'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join(''),
  };
})();
