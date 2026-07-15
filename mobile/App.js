import { useEffect, useRef, useState } from 'react';
import {
  Animated, Pressable, StyleSheet, Text, useWindowDimensions, View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Scene from './src/Scene';
import Cat from './src/Cat';
import useClock from './src/useClock';
import useSteps from './src/useSteps';
import { DAY, NIGHT, rand } from './src/theme';
import {
  BONUS_PET, BONUS_TAP, DEFAULT_LINES,
  furById, hatById, POINT_UNIT, SPEAK_TICK_MS, STARDUST_PER_UNIT,
} from './src/data';
import { DressSheet, PetsSheet } from './src/Sheets';

const SOURCE_LABEL = {
  'checking': '센서 확인 중…',
  'ios-daily': '오늘 걸음',
  'android-live': '앱 실행 후 걸음',
  'sim': '데모 걸음',
};

const CAT_W = 130;
const SAVE_KEY = 'cat-yard-v1';

/* 친구 연동(Supabase) 전까지의 데모 주민 — 기존 PWA의 데모 친구를 계승 */
const DEMO_FRIENDS = [
  { id: 'f1', name: '민지', fur: '#F0D3A0', score: 1284 },
  { id: 'f2', name: '준호', fur: '#CDD2DC', score: 903 },
];

export default function App() {
  const { width } = useWindowDimensions();
  const { time, dateStr } = useClock();
  const { steps, source, lastStepAt, addSteps } = useSteps();

  const [drive, setDrive] = useState('free');
  const [standby, setStandby] = useState(false);
  const [friends, setFriends] = useState(DEMO_FRIENDS.map(f => ({ ...f, drive: 'free', until: 0 })));

  /* 포인트/보상 경제 */
  const [bonus, setBonus] = useState(0);               // 오늘 상호작용 보너스
  const [claimedUnits, setClaimedUnits] = useState(0); // 오늘 이미 별가루로 바꾼 단위 수
  const [stardust, setStardust] = useState(0);
  const [owned, setOwned] = useState({ hats: [], furs: ['fur-cream'] });
  const [equipped, setEquipped] = useState({ hat: null, fur: 'fur-cream' });

  /* 대사 / 쓰다듬 기록 */
  const [lines, setLines] = useState(DEFAULT_LINES);
  const [speech, setSpeech] = useState(null);
  const [petLog, setPetLog] = useState([]);
  const [unreadPets, setUnreadPets] = useState(0);
  const [petPulse, setPetPulse] = useState(0);
  const [sheet, setSheet] = useState(null);            // 'dress' | 'pets' | null

  /* 즉각 피드백 */
  const [flash, setFlash] = useState(null);            // 포인트 +N 표시
  const [toast, setToast] = useState(null);            // 별가루 획득 토스트

  const linesRef = useRef(lines);
  useEffect(() => { linesRef.current = lines; }, [lines]);
  const loaded = useRef(false);
  const dayRef = useRef(new Date().toDateString());
  const timers = useRef({});

  /* ── 저장/복원 (데모 쓰다듬은 영속화에서 제외) ── */
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SAVE_KEY);
        if (raw) {
          const s = JSON.parse(raw);
          setStardust(s.stardust ?? 0);
          setOwned(s.owned ?? { hats: [], furs: ['fur-cream'] });
          setEquipped(s.equipped ?? { hat: null, fur: 'fur-cream' });
          setLines(s.lines?.length ? s.lines : DEFAULT_LINES);
          setPetLog(s.petLog ?? []);
          if (s.date === dayRef.current) {
            setBonus(s.bonus ?? 0);
            setClaimedUnits(s.claimedUnits ?? 0);
          }
        }
      } catch {}
      loaded.current = true;
    })();
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(SAVE_KEY, JSON.stringify({
      date: dayRef.current,
      bonus, claimedUnits, stardust, owned, equipped, lines,
      petLog: petLog.filter(e => !e.demo),
    })).catch(() => {});
  }, [bonus, claimedUnits, stardust, owned, equipped, lines, petLog]);

  /* 자정 롤오버 — 스탠바이로 밤새 켜둬도 다음날 보상이 깨지지 않게 리셋 */
  useEffect(() => {
    const iv = setInterval(() => {
      const today = new Date().toDateString();
      if (today !== dayRef.current) {
        dayRef.current = today;
        setBonus(0);
        setClaimedUnits(0);
      }
    }, 60000);
    return () => clearInterval(iv);
  }, []);

  /* ── 활동 → 고양이 행동 방향 ──────────────────
     화면을 누르고 있는 동안 = 봉고캣의 '입력' → 필기가 최우선 */
  const holdRef = useRef(false);
  const holdUntilRef = useRef(0);
  const touchAt = useRef(Date.now());
  const stepAt = useRef(0);
  useEffect(() => { stepAt.current = lastStepAt; }, [lastStepAt]);

  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now();
      let next = 'free';
      if (holdRef.current || now < holdUntilRef.current) next = 'bongo';
      else if (now - stepAt.current < 45000) next = 'active';
      else if (
        now - touchAt.current > 120000 &&
        (stepAt.current === 0 || now - stepAt.current > 120000)
      ) next = 'sleep';
      setDrive(d => (d === next ? d : next));
    }, 500);
    return () => clearInterval(iv);
  }, []);

  /* ── 대사: 8초마다 설정된 확률로 추첨 ───────── */
  useEffect(() => {
    const iv = setInterval(() => {
      const ls = linesRef.current.filter(l => l.text.trim());
      if (!ls.length) return;
      const total = ls.reduce((s, l) => s + l.p, 0);
      const scale = total > 100 ? 100 / total : 1;
      let r = Math.random() * 100;
      for (const l of ls) {
        r -= l.p * scale;
        if (r < 0) { setSpeech({ text: l.text, id: Date.now() }); break; }
      }
    }, SPEAK_TICK_MS);
    return () => clearInterval(iv);
  }, []);

  /* ── 데모 친구: 20~45초 지속되는 상태 머신 (플립 소음 제거) ── */
  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now();
      setFriends(fs => fs.map(f => {
        if (now < f.until) {
          const inc = f.drive === 'active' ? Math.floor(rand(3, 10))
            : f.drive === 'bongo' ? Math.floor(rand(1, 5)) : 0;
          return inc ? { ...f, score: f.score + inc } : f;
        }
        const r = Math.random();
        const drive = r < 0.3 ? 'active' : r < 0.6 ? 'bongo' : 'free';
        return { ...f, drive, until: now + rand(20000, 45000) };
      }));
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  /* 데모 쓰다듬 — demo 표기, 보너스 미적립, 영속화 제외 (점수판 정직성) */
  const friendPets = (name) => {
    setPetLog(l => [{ name, t: Date.now(), demo: true }, ...l].slice(0, 50));
    setUnreadPets(u => u + 1);
    setPetPulse(p => p + 1);
  };

  useEffect(() => {
    const first = setTimeout(() => friendPets('민지'), 8000);
    const iv = setInterval(() => {
      if (Math.random() < 0.4) {
        friendPets(DEMO_FRIENDS[Math.floor(Math.random() * DEMO_FRIENDS.length)].name);
      }
    }, 25000);
    return () => { clearTimeout(first); clearInterval(iv); };
  }, []);

  /* ── 스탠바이(시계 모드): 화면 유지 + 안내문 페이드아웃 ── */
  const hintOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!standby) return;
    activateKeepAwakeAsync('standby').catch(() => {});
    hintOpacity.setValue(1);
    const anim = Animated.sequence([
      Animated.delay(5000),
      Animated.timing(hintOpacity, { toValue: 0, duration: 800, useNativeDriver: false }),
    ]);
    anim.start();
    return () => { anim.stop(); deactivateKeepAwake('standby').catch(() => {}); };
  }, [standby, hintOpacity]);

  /* ── 포인트 = 걸음 + 상호작용, 1,000마다 별가루 ── */
  const points = steps + bonus;
  const claimable = Math.max(0, Math.floor(points / POINT_UNIT) - claimedUnits);

  /* 포인트가 오를 때 +N 플래시 — 걷기→숫자 상승의 인과를 눈에 보이게 */
  const prevPoints = useRef(null);
  useEffect(() => {
    if (prevPoints.current === null) { prevPoints.current = points; return; }
    const diff = points - prevPoints.current;
    prevPoints.current = points;
    if (diff > 0) {
      setFlash({ n: diff, id: Date.now() });
      clearTimeout(timers.current.flash);
      timers.current.flash = setTimeout(() => setFlash(null), 1200);
    }
  }, [points]);

  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  const claim = () => {
    if (claimable <= 0) return;
    const gain = claimable * STARDUST_PER_UNIT;
    setStardust(s => {
      setToast({ text: `⭐ +${gain} 획득 · 잔고 ${(s + gain).toLocaleString()}`, id: Date.now() });
      return s + gain;
    });
    setClaimedUnits(u => u + claimable);
    clearTimeout(timers.current.toast);
    timers.current.toast = setTimeout(() => setToast(null), 1800);
  };

  const buy = (kind, item) => {
    if (stardust < item.price) return false;
    setStardust(s => s - item.price);
    setOwned(o => ({ ...o, [kind]: [...o[kind], item.id] }));
    setEquipped(e => (kind === 'hats' ? { ...e, hat: item.id } : { ...e, fur: item.id }));
    return true;
  };

  const equip = (kind, id) => {
    setEquipped(e => {
      if (kind === 'hats') return { ...e, hat: e.hat === id ? null : id };
      return { ...e, fur: id };
    });
  };

  const onPokeMe = kind => {
    touchAt.current = Date.now();
    setBonus(b => b + (kind === 'pet' ? BONUS_PET : BONUS_TAP));
  };

  /* ── 점수판/책상 배치 ────────────────────────── */
  const rows = [
    { id: 'me', name: '나', score: points, me: true, active: drive === 'active' || drive === 'bongo' },
    ...friends.map(f => ({ id: f.id, name: `${f.name} (데모)`, score: f.score, active: f.drive !== 'free' })),
  ].sort((a, b) => b.score - a.score);

  const desks = {
    teacher: { left: width * 0.06, w: 124 },
    students: [
      { left: width * 0.52, w: 86 },
      { left: width * 0.76, w: 86 },
    ],
  };
  const deskCenter = d => d.left + d.w / 2 - CAT_W / 2;

  const T = standby ? NIGHT : DAY;

  return (
    <View style={st.root}>
      <StatusBar style={standby ? 'light' : 'dark'} hidden={standby} />

      <View style={st.sceneWrap}>
        <Scene
          night={standby}
          time={time}
          dateStr={dateStr}
          subline={standby ? `👟 ${steps.toLocaleString()} · 오늘 ${points.toLocaleString()} P` : null}
          rows={rows}
          desks={desks}
        >
          {/* 봉고캣의 입력 번역: 화면을 누르고 있는 동안 내 고양이가 필기 */}
          {!standby && (
            <Pressable
              style={StyleSheet.absoluteFill}
              onPressIn={() => { holdRef.current = true; touchAt.current = Date.now(); }}
              onPressOut={() => { holdRef.current = false; holdUntilRef.current = Date.now() + 1500; }}
            />
          )}
          {/* 배경 탭 → 스탠바이 종료 */}
          {standby && (
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setStandby(false)} />
          )}

          {!standby && (
            <View style={[st.stepsBadge, { backgroundColor: T.card }]}>
              <Text style={[st.stepsNum, { color: T.ink }]}>👟 {steps.toLocaleString()}</Text>
              <Text style={st.starNum}>⭐ {stardust.toLocaleString()}</Text>
              {(source === 'sim' || source === 'checking') && (
                <Text style={st.stepsLabel}>{SOURCE_LABEL[source]}</Text>
              )}
            </View>
          )}

          {!standby && flash && (
            <Text style={st.flash}>＋{flash.n.toLocaleString()} P</Text>
          )}
          {toast && (
            <View style={st.toast}><Text style={st.toastText}>{toast.text}</Text></View>
          )}

          {/* 내 고양이 */}
          <Cat
            name="나"
            me
            quiet={standby}
            fur={furById(equipped.fur).color}
            hat={hatById(equipped.hat)?.emoji}
            drive={drive}
            fieldWidth={width}
            deskX={deskCenter(desks.teacher)}
            bottom={44}
            onPoke={onPokeMe}
            speech={speech}
            petPulse={petPulse}
            crown={claimable > 0
              ? `✨ 별가루 받기 +${(claimable * STARDUST_PER_UNIT).toLocaleString()}`
              : `오늘 ${points.toLocaleString()} P`}
            crownHot={claimable > 0}
            onCrownPress={claim}
          />

          {/* 데모 친구 고양이들 */}
          {friends.map((f, i) => (
            <Cat
              key={f.id}
              name={f.name}
              quiet={standby}
              fur={f.fur}
              size={104}
              drive={f.drive}
              fieldWidth={width}
              deskX={deskCenter(desks.students[i])}
              bottom={i === 0 ? 52 : 34}
            />
          ))}

          {/* 스탠바이 중에도 보상은 고정 버튼으로 받을 수 있게 (움직이는 크라운 대체) */}
          {standby && claimable > 0 && (
            <Pressable style={st.standbyClaim} onPress={claim} testID="standby-claim">
              <Text style={st.standbyClaimText}>
                ✨ 별가루 받기 +{(claimable * STARDUST_PER_UNIT).toLocaleString()}
              </Text>
            </Pressable>
          )}
          {standby && (
            <Animated.Text style={[st.standbyHint, { opacity: hintOpacity }]}>
              화면이 꺼지지 않아요 · 탭하면 돌아가요
            </Animated.Text>
          )}
        </Scene>
      </View>

      {!standby && (
        <View style={st.panel}>
          <View style={st.buttonRow}>
            <Pressable style={st.chip} onPress={() => setSheet('dress')}>
              <Text style={st.chipText}>🎨 꾸미기</Text>
            </Pressable>
            <Pressable style={st.chip} onPress={() => { setSheet('pets'); setUnreadPets(0); }}>
              <Text style={st.chipText}>💗 쓰다듬 기록</Text>
              {unreadPets > 0 && (
                <View style={st.dot} testID="pet-dot">
                  <Text style={st.dotText}>{unreadPets}</Text>
                </View>
              )}
            </Pressable>
            <Pressable style={st.chip} onPress={() => setStandby(true)}>
              <Text style={st.chipText}>🌙 시계 모드</Text>
            </Pressable>
            {source === 'sim' && (
              <Pressable style={[st.chip, st.chipDemo]} onPress={() => addSteps(500)}>
                <Text style={st.chipText}>데모: ＋500 걸음</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      <DressSheet
        visible={sheet === 'dress'}
        onClose={() => setSheet(null)}
        stardust={stardust}
        owned={owned}
        equipped={equipped}
        onBuy={buy}
        onEquip={equip}
        lines={lines}
        onChangeLines={setLines}
      />
      <PetsSheet
        visible={sheet === 'pets'}
        onClose={() => setSheet(null)}
        log={petLog}
      />
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: DAY.wall },
  sceneWrap: { flex: 1 },
  stepsBadge: {
    position: 'absolute', top: 8, right: 10,
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7,
    alignItems: 'flex-end',
  },
  stepsNum: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  starNum: { fontSize: 13, fontWeight: '800', color: '#B8860B', marginTop: 1, fontVariant: ['tabular-nums'] },
  stepsLabel: { fontSize: 10.5, fontWeight: '600', color: '#8a94a6', marginTop: 1 },
  flash: {
    position: 'absolute', top: 78, right: 14,
    fontSize: 14, fontWeight: '800', color: '#3E8E52',
    fontVariant: ['tabular-nums'],
  },
  toast: {
    position: 'absolute', top: 10, alignSelf: 'center',
    backgroundColor: 'rgba(61,51,69,0.92)',
    borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8,
    zIndex: 50,
  },
  toastText: { color: '#FFE9A8', fontSize: 13.5, fontWeight: '800' },
  standbyClaim: {
    position: 'absolute', bottom: 46, alignSelf: 'center',
    backgroundColor: '#FFE9A8', borderWidth: 1.5, borderColor: '#E8A93C',
    borderRadius: 999, paddingHorizontal: 20, paddingVertical: 12,
    zIndex: 300,
  },
  standbyClaimText: { fontSize: 15, fontWeight: '800', color: '#8A5A2B' },
  standbyHint: {
    position: 'absolute', bottom: 14, alignSelf: 'center',
    fontSize: 12, color: 'rgba(242,245,251,0.85)', fontWeight: '600',
  },
  panel: {
    backgroundColor: 'rgba(253,251,246,0.97)',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    marginTop: -18,
    padding: 12, paddingBottom: 24,
  },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#E3E0D6',
  },
  chipDemo: {
    borderWidth: 1, borderStyle: 'dashed', borderColor: '#C9C2B2',
    backgroundColor: 'transparent',
  },
  chipText: { fontSize: 13, fontWeight: '700', color: '#3D3345' },
  dot: {
    position: 'absolute', top: -5, right: -3,
    minWidth: 17, height: 17, borderRadius: 9,
    backgroundColor: '#E4574B', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  dotText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
});
