import { useEffect, useRef, useState } from 'react';
import {
  Pressable, StyleSheet, Text, useWindowDimensions, View,
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
  BONUS_FRIEND_PET, BONUS_PET, BONUS_TAP, DEFAULT_LINES,
  furById, hatById, POINT_UNIT, SPEAK_TICK_MS, STARDUST_PER_UNIT,
} from './src/data';
import { DressSheet, LinesSheet, PetsSheet } from './src/Sheets';

const SOURCE_LABEL = {
  'checking': '센서 확인 중…',
  'ios-daily': '오늘 걸음',
  'android-live': '앱 실행 후 걸음',
  'sim': '시뮬레이션',
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
  const [friends, setFriends] = useState(DEMO_FRIENDS.map(f => ({ ...f, drive: 'free' })));

  /* 포인트/보상 경제 */
  const [bonus, setBonus] = useState(0);            // 오늘 상호작용 보너스
  const [claimedUnits, setClaimedUnits] = useState(0); // 오늘 이미 별가루로 바꾼 1만 단위 수
  const [stardust, setStardust] = useState(0);
  const [owned, setOwned] = useState({ hats: [], furs: ['fur-cream'] });
  const [equipped, setEquipped] = useState({ hat: null, fur: 'fur-cream' });

  /* 대사 / 쓰다듬 기록 */
  const [lines, setLines] = useState(DEFAULT_LINES);
  const [speech, setSpeech] = useState(null);
  const [petLog, setPetLog] = useState([]);
  const [unreadPets, setUnreadPets] = useState(0);
  const [petPulse, setPetPulse] = useState(0);
  const [sheet, setSheet] = useState(null);         // 'dress' | 'lines' | 'pets' | null

  const linesRef = useRef(lines);
  useEffect(() => { linesRef.current = lines; }, [lines]);
  const loaded = useRef(false);

  /* ── 저장/복원 ─────────────────────────────── */
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
          if (s.date === new Date().toDateString()) {
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
      date: new Date().toDateString(),
      bonus, claimedUnits, stardust, owned, equipped, lines, petLog,
    })).catch(() => {});
  }, [bonus, claimedUnits, stardust, owned, equipped, lines, petLog]);

  /* ── 활동 → 고양이 행동 방향 ────────────────── */
  const touchAt = useRef(Date.now());
  const stepAt = useRef(0);
  useEffect(() => { stepAt.current = lastStepAt; }, [lastStepAt]);

  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now();
      let next = 'free';
      if (now - stepAt.current < 45000) next = 'active';
      else if (
        now - touchAt.current > 120000 &&
        (stepAt.current === 0 || now - stepAt.current > 120000)
      ) next = 'sleep';
      setDrive(d => (d === next ? d : next));
    }, 1000);
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

  /* ── 데모 친구: 활동 시뮬레이션 + 가끔 내 고양이를 쓰다듬어 줌 ── */
  useEffect(() => {
    const iv = setInterval(() => {
      setFriends(fs => fs.map(f => {
        const r = Math.random();
        if (r < 0.35) return { ...f, drive: 'active', score: f.score + Math.floor(rand(5, 30)) };
        if (r < 0.60) return { ...f, drive: 'bongo', score: f.score + Math.floor(rand(2, 9)) };
        return { ...f, drive: 'free' };
      }));
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  const friendPets = (name) => {
    setPetLog(l => [{ name, t: Date.now() }, ...l].slice(0, 50));
    setUnreadPets(u => u + 1);
    setBonus(b => b + BONUS_FRIEND_PET);
    setPetPulse(p => p + 1);
  };

  useEffect(() => {
    // 데모: 시작 8초 뒤 민지가 인사로 쓰다듬고, 이후 이따금 랜덤
    const first = setTimeout(() => friendPets('민지'), 8000);
    const iv = setInterval(() => {
      if (Math.random() < 0.4) {
        friendPets(DEMO_FRIENDS[Math.floor(Math.random() * DEMO_FRIENDS.length)].name);
      }
    }, 25000);
    return () => { clearTimeout(first); clearInterval(iv); };
  }, []);

  /* ── 스탠바이(잠금화면 모드) ─────────────────── */
  useEffect(() => {
    if (!standby) return;
    activateKeepAwakeAsync('standby').catch(() => {});
    return () => { deactivateKeepAwake('standby').catch(() => {}); };
  }, [standby]);

  /* ── 포인트 = 걸음 + 상호작용, 1만마다 별가루 ─── */
  const points = steps + bonus;
  const claimable = Math.floor(points / POINT_UNIT) - claimedUnits;

  const claim = () => {
    if (claimable <= 0) return;
    setStardust(s => s + claimable * STARDUST_PER_UNIT);
    setClaimedUnits(u => u + claimable);
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
    { id: 'me', name: '나', score: points, me: true, active: drive === 'active' },
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
        <Scene night={standby} time={time} dateStr={dateStr} rows={rows} desks={desks}>
          {standby && (
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setStandby(false)} />
          )}

          {!standby && (
            <View style={[st.stepsBadge, { backgroundColor: T.card }]}>
              <Text style={[st.stepsNum, { color: T.ink }]}>👟 {steps.toLocaleString()}</Text>
              <Text style={st.stepsLabel}>{SOURCE_LABEL[source]}</Text>
            </View>
          )}

          {/* 내 고양이 — 머리 위 오늘의 포인트, 1만마다 별가루 받기 */}
          <Cat
            name="나"
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
              fur={f.fur}
              size={104}
              drive={f.drive}
              fieldWidth={width}
              deskX={deskCenter(desks.students[i])}
              bottom={i === 0 ? 52 : 34}
            />
          ))}

          {standby && (
            <Text style={st.standbyHint}>화면이 꺼지지 않아요 · 탭하면 돌아가요</Text>
          )}
        </Scene>
      </View>

      {!standby && (
        <View style={st.panel}>
          <View style={st.buttonRow}>
            <Pressable style={st.chip} onPress={() => setSheet('dress')}>
              <Text style={st.chipText}>🎨 꾸미기</Text>
            </Pressable>
            <Pressable style={st.chip} onPress={() => setSheet('lines')}>
              <Text style={st.chipText}>💬 대사 설정</Text>
            </Pressable>
            <Pressable style={st.chip} onPress={() => { setSheet('pets'); setUnreadPets(0); }}>
              <Text style={st.chipText}>
                💗 쓰다듬 기록{unreadPets > 0 ? ` (${unreadPets})` : ''}
              </Text>
            </Pressable>
            <Pressable style={st.chip} onPress={() => setStandby(true)}>
              <Text style={st.chipText}>🌙 스탠바이</Text>
            </Pressable>
            {source === 'sim' && (
              <Pressable style={st.chip} onPress={() => addSteps(500)}>
                <Text style={st.chipText}>👟 ＋500 걸음</Text>
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
      />
      <LinesSheet
        visible={sheet === 'lines'}
        onClose={() => setSheet(null)}
        lines={lines}
        onChange={setLines}
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
  stepsLabel: { fontSize: 10.5, fontWeight: '600', color: '#8a94a6', marginTop: 1 },
  standbyHint: {
    position: 'absolute', bottom: 10, alignSelf: 'center',
    fontSize: 12, color: 'rgba(242,245,251,0.6)', fontWeight: '600',
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
  chipText: { fontSize: 13, fontWeight: '700', color: '#3D3345' },
});
