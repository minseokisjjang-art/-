import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { CatBody, Laptop } from './CatSvg';
import { pick, rand } from './theme';

const EMOJI = ['❤️', '🐾', '🎵', '✨', '💕', '🌻'];
const CAT_W = 130;

/*
 * 고양이 행동 컴포넌트 — 기존 PWA의 Cat 클래스(think/tick/터치 반응)를 포팅.
 *
 * drive: 앱이 내려주는 큰 방향
 *  - 'bongo'  방금 타이핑 중 → 봉고 연주
 *  - 'active' 최근 걸음 감지 → 신나게 뛰어다님
 *  - 'sleep'  오래 조용함 → 낮잠
 *  - 'free'   자율 행동 (어슬렁/봉고/멍때리기 랜덤)
 */
export default function Cat({ drive = 'free', fieldWidth = 360, onPoke }) {
  const [mode, setMode] = useState('idle');       // idle | walk | bongo | sleep
  const [dir, setDir] = useState(1);
  const [pawFrame, setPawFrame] = useState(0);
  const [bubble, setBubble] = useState(null);
  const [purring, setPurring] = useState(false);
  const [happy, setHappy] = useState(false);

  const xAnim = useRef(new Animated.Value(24)).current;
  const bounceY = useRef(new Animated.Value(0)).current;
  const jumpY = useRef(new Animated.Value(0)).current;
  const p = useRef({ x: 24, dir: 1, speed: 36, mode: 'idle', modeUntil: 0 });
  const timers = useRef({});

  /* drive가 바뀌면 즉시 다시 생각한다 */
  useEffect(() => { p.current.modeUntil = 0; }, [drive]);

  /* 행동 루프 — 원본의 think() + tick() */
  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now();
      const c = p.current;

      if (now >= c.modeUntil) {
        let next = 'idle';
        let dur = rand(2, 5);
        if (drive === 'bongo') { next = 'bongo'; dur = 1; }
        else if (drive === 'sleep') { next = 'sleep'; dur = 3; }
        else if (drive === 'active') {
          next = Math.random() < 0.8 ? 'walk' : 'idle';
          dur = rand(2, 4);
          c.speed = rand(64, 92);            // 걸음 감지 중엔 달리기
        } else {
          const r = Math.random();
          if (r < 0.42) { next = 'walk'; dur = rand(1.5, 4); c.speed = rand(28, 44); }
          else if (r < 0.62) { next = 'bongo'; dur = rand(1.5, 3); }
          else { next = 'idle'; dur = rand(2, 5); }
        }
        if (next === 'walk') {
          c.dir = Math.random() < 0.5 ? -1 : 1;
          setDir(c.dir);
        }
        c.modeUntil = now + dur * 1000;
        if (c.mode !== next) { c.mode = next; setMode(next); }
      }

      if (c.mode === 'walk') {
        c.x += c.dir * c.speed * 0.05;
        const maxX = Math.max(8, fieldWidth - CAT_W - 8);
        if (c.x <= 8) { c.x = 8; c.dir = 1; setDir(1); }
        if (c.x >= maxX) { c.x = maxX; c.dir = -1; setDir(-1); }
        xAnim.setValue(c.x);
      }
    }, 50);
    return () => clearInterval(iv);
  }, [drive, fieldWidth, xAnim]);

  /* 통통 튀는 모션 — 걷기/봉고 중에만 */
  useEffect(() => {
    if (mode === 'walk' || mode === 'bongo') {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(bounceY, { toValue: -4, duration: 130, useNativeDriver: false }),
        Animated.timing(bounceY, { toValue: 0, duration: 130, useNativeDriver: false }),
      ]));
      loop.start();
      return () => { loop.stop(); bounceY.setValue(0); };
    }
    bounceY.setValue(0);
  }, [mode, bounceY]);

  /* 봉고 연주 — 앞발 번갈아 들기 */
  useEffect(() => {
    if (mode !== 'bongo') return;
    const iv = setInterval(() => setPawFrame(f => 1 - f), 150);
    return () => clearInterval(iv);
  }, [mode]);

  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  const showBubble = e => {
    setBubble({ e, id: Date.now() });
    clearTimeout(timers.current.bubble);
    timers.current.bubble = setTimeout(() => setBubble(null), 1400);
  };

  /* 짧은 탭 → 폴짝 + 이모티콘 (원본 tapReact) */
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

  /* 길게 누르기 → 쓰다듬기 (원본 purr) */
  const purr = () => {
    onPoke?.();
    showBubble('💗');
    setPurring(true);
    clearTimeout(timers.current.purr);
    timers.current.purr = setTimeout(() => setPurring(false), 1600);
  };

  const mood = mode === 'sleep' ? 'sleep' : happy || purring ? 'happy' : 'open';
  const label =
    mode === 'bongo' ? '봉고 🎹'
    : mode === 'sleep' ? '낮잠 💤'
    : mode === 'walk' ? (drive === 'active' ? '산책 👟' : '어슬렁 🐾')
    : '멍 ⋯';

  return (
    <Animated.View style={[st.wrap, { transform: [{ translateX: xAnim }] }]} pointerEvents="box-none">
      {bubble && <Text style={st.bubble}>{bubble.e}</Text>}
      {mode === 'sleep' && !bubble && <Text style={st.bubble}>💤</Text>}
      {purring && <Text style={st.purr}>그르릉…</Text>}
      <Pressable onPress={poke} onLongPress={purr} delayLongPress={420} hitSlop={10}>
        <Animated.View
          style={{ transform: [{ translateY: Animated.add(bounceY, jumpY) }, { scaleX: dir === -1 ? -1 : 1 }] }}
        >
          <CatBody mood={mood} pawUp={mode === 'bongo' ? pawFrame : null} />
          {mode === 'bongo' && <View style={st.laptop}><Laptop /></View>}
        </Animated.View>
      </Pressable>
      <View style={st.tag}><Text style={st.tagText}>내 고양이 · {label}</Text></View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 58,
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
  laptop: {
    position: 'absolute',
    bottom: -10,
    alignSelf: 'center',
  },
  tag: {
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3D3345',
  },
});
