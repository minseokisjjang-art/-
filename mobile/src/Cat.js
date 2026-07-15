import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { CatBody } from './CatSvg';
import { pick, rand } from './theme';

const EMOJI = ['❤️', '🐾', '🎵', '✨', '💕', '📚'];
const CAT_W = 130;

/*
 * 고양이 행동 컴포넌트 — 교실 버전.
 *
 * drive: 앱이 내려주는 큰 방향
 *  - 'bongo'  타이핑 중 → 교탁(deskX)까지 걸어가 앉아서 필기 ✍️
 *  - 'active' 걸음 감지 → 일어나서 신나게 걸어다님
 *  - 'sleep'  오래 조용함 → 엎드려 낮잠
 *  - 'free'   자율 행동 (두리번/어슬렁/제자리 필기 랜덤)
 *
 * deskX: 이 고양이의 책상 위치(wrap 기준 x). bongo일 때 여기로 간다.
 */
export default function Cat({
  name = '나', fur, size = 120, drive = 'free',
  fieldWidth = 360, deskX = 24, bottom = 42, onPoke,
}) {
  const [mode, setMode] = useState('idle');       // idle | walk | write | sleep
  const [dir, setDir] = useState(1);
  const [pawFrame, setPawFrame] = useState(0);
  const [bubble, setBubble] = useState(null);
  const [purring, setPurring] = useState(false);
  const [happy, setHappy] = useState(false);

  const xAnim = useRef(new Animated.Value(deskX)).current;
  const bounceY = useRef(new Animated.Value(0)).current;
  const jumpY = useRef(new Animated.Value(0)).current;
  const p = useRef({ x: deskX, dir: 1, speed: 36, mode: 'idle', modeUntil: 0 });
  const timers = useRef({});

  /* drive가 바뀌면 즉시 다시 생각한다 */
  useEffect(() => { p.current.modeUntil = 0; }, [drive]);

  /* 행동 루프 — think() + tick() */
  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now();
      const c = p.current;
      const setModeIf = next => { if (c.mode !== next) { c.mode = next; setMode(next); } };
      const setDirIf = d => { if (c.dir !== d) { c.dir = d; setDir(d); } };

      /* 타이핑 중 → 책상으로 이동 후 필기 (자율 행동보다 우선) */
      if (drive === 'bongo') {
        if (Math.abs(c.x - deskX) > 4) {
          setModeIf('walk');
          setDirIf(deskX > c.x ? 1 : -1);
          c.x += c.dir * 110 * 0.05;
          if ((c.dir > 0 && c.x >= deskX) || (c.dir < 0 && c.x <= deskX)) c.x = deskX;
          xAnim.setValue(c.x);
        } else {
          setDirIf(1);
          setModeIf('write');
        }
        return;
      }

      if (now >= c.modeUntil) {
        let next = 'idle';
        let dur = rand(2, 5);
        if (drive === 'sleep') { next = 'sleep'; dur = 3; }
        else if (drive === 'active') {
          next = Math.random() < 0.8 ? 'walk' : 'idle';
          dur = rand(2, 4);
          c.speed = rand(64, 92);            // 걸음 감지 중엔 일어나서 신나게
        } else {
          const r = Math.random();
          if (r < 0.42) { next = 'walk'; dur = rand(1.5, 4); c.speed = rand(28, 44); }
          else if (r < 0.58) { next = 'write'; dur = rand(1.5, 3); }
          else { next = 'idle'; dur = rand(2, 5); }
        }
        if (next === 'walk') setDirIf(Math.random() < 0.5 ? -1 : 1);
        c.modeUntil = now + dur * 1000;
        setModeIf(next);
      }

      if (c.mode === 'walk') {
        c.x += c.dir * c.speed * 0.05;
        const maxX = Math.max(8, fieldWidth - CAT_W - 8);
        if (c.x <= 8) { c.x = 8; setDirIf(1); }
        if (c.x >= maxX) { c.x = maxX; setDirIf(-1); }
        xAnim.setValue(c.x);
      }
    }, 50);
    return () => clearInterval(iv);
  }, [drive, fieldWidth, deskX, xAnim]);

  /* 통통 튀는 모션 — 걷는 중에만 (필기는 앉아 있으므로 없음) */
  useEffect(() => {
    if (mode === 'walk') {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(bounceY, { toValue: -4, duration: 130, useNativeDriver: false }),
        Animated.timing(bounceY, { toValue: 0, duration: 130, useNativeDriver: false }),
      ]));
      loop.start();
      return () => { loop.stop(); bounceY.setValue(0); };
    }
    bounceY.setValue(0);
  }, [mode, bounceY]);

  /* 필기 — 앞발을 천천히 번갈아 움직이며 가끔 ✍️ */
  useEffect(() => {
    if (mode !== 'write') return;
    const paw = setInterval(() => setPawFrame(f => 1 - f), 240);
    const note = setInterval(() => {
      setBubble({ e: '✍️', id: Date.now() });
      clearTimeout(timers.current.bubble);
      timers.current.bubble = setTimeout(() => setBubble(null), 1200);
    }, 3200);
    return () => { clearInterval(paw); clearInterval(note); };
  }, [mode]);

  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  const showBubble = e => {
    setBubble({ e, id: Date.now() });
    clearTimeout(timers.current.bubble);
    timers.current.bubble = setTimeout(() => setBubble(null), 1400);
  };

  /* 짧은 탭 → 폴짝 + 이모티콘 */
  const poke = () => {
    onPoke?.();
    showBubble(pick(EMOJI));
    setHappy(true);
    clearTimeout(timers.current.happy);
    timers.current.happy = setTimeout(() => setHappy(false), 1200);
    jumpY.setValue(0);
    Animated.sequence([
      Animated.timing(jumpY, { toValue: -20, duration: 140, useNativeDriver: false }),
      Animated.spring(jumpY, { toValue: 0, bounciness: 9, useNativeDriver: false }),
    ]).start();
  };

  /* 길게 누르기 → 쓰다듬기 */
  const purr = () => {
    onPoke?.();
    showBubble('💗');
    setPurring(true);
    clearTimeout(timers.current.purr);
    timers.current.purr = setTimeout(() => setPurring(false), 1600);
  };

  const mood = mode === 'sleep' ? 'sleep' : happy || purring ? 'happy' : 'open';
  const label =
    mode === 'write' ? '필기 ✍️'
    : mode === 'sleep' ? '잠 💤'
    : mode === 'walk' ? (drive === 'active' ? '걷는 중 👟' : '어슬렁 🐾')
    : '두리번 ⋯';

  return (
    <Animated.View
      style={[st.wrap, { bottom, zIndex: 200 - bottom, transform: [{ translateX: xAnim }] }]}
      pointerEvents="box-none"
    >
      {bubble && <Text style={st.bubble}>{bubble.e}</Text>}
      {mode === 'sleep' && !bubble && <Text style={st.bubble}>💤</Text>}
      {purring && <Text style={st.purr}>그르릉…</Text>}
      <Pressable onPress={poke} onLongPress={purr} delayLongPress={420} hitSlop={10}>
        <Animated.View
          style={{ transform: [{ translateY: Animated.add(bounceY, jumpY) }, { scaleX: dir === -1 ? -1 : 1 }] }}
        >
          <CatBody size={size} fur={fur} mood={mood} pawUp={mode === 'write' ? pawFrame : null} />
        </Animated.View>
      </Pressable>
      <View style={st.tag}><Text style={st.tagText}>{name} · {label}</Text></View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    width: CAT_W,
    alignItems: 'center',
  },
  bubble: {
    position: 'absolute',
    top: -36,
    fontSize: 26,
    zIndex: 3,
  },
  purr: {
    position: 'absolute',
    top: -10,
    fontSize: 13,
    color: '#7A5C43',
    fontWeight: '700',
    zIndex: 3,
  },
  tag: {
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.78)',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3D3345',
  },
});
