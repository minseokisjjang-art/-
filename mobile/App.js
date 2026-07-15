import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, StyleSheet,
  Text, TextInput, useWindowDimensions, View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import Scene from './src/Scene';
import Cat from './src/Cat';
import useClock from './src/useClock';
import useSteps from './src/useSteps';
import { DAY, NIGHT, rand } from './src/theme';

const SOURCE_LABEL = {
  'checking': '센서 확인 중…',
  'ios-daily': '오늘 걸음',
  'android-live': '앱 실행 후 걸음',
  'sim': '시뮬레이션',
};

const CAT_W = 130;

/* 친구 연동(Supabase) 전까지의 데모 주민 — 기존 PWA의 데모 친구를 계승 */
const DEMO_FRIENDS = [
  { id: 'f1', name: '민지', fur: '#F0D3A0', score: 1284 },
  { id: 'f2', name: '준호', fur: '#CDD2DC', score: 903 },
];

export default function App() {
  const { width } = useWindowDimensions();
  const { time, dateStr } = useClock();
  const { steps, source, lastStepAt, addSteps } = useSteps();

  const [memo, setMemo] = useState('');
  const [keys, setKeys] = useState(0);            // 오늘 타이핑한 글자 수
  const [drive, setDrive] = useState('free');
  const [standby, setStandby] = useState(false);
  const [friends, setFriends] = useState(DEMO_FRIENDS.map(f => ({ ...f, drive: 'free' })));

  /* 활동 시각 — 고양이의 큰 행동 방향(drive)을 정하는 재료 */
  const typingAt = useRef(Date.now());
  const touchAt = useRef(Date.now());
  const stepAt = useRef(0);
  useEffect(() => { stepAt.current = lastStepAt; }, [lastStepAt]);

  /* drive 결정 루프: 타이핑 > 걸음 > 낮잠 > 자율 */
  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now();
      let next = 'free';
      if (now - typingAt.current < 2500) next = 'bongo';
      else if (now - stepAt.current < 45000) next = 'active';
      else if (
        now - typingAt.current > 120000 &&
        now - touchAt.current > 120000 &&
        (stepAt.current === 0 || now - stepAt.current > 120000)
      ) next = 'sleep';
      setDrive(d => (d === next ? d : next));
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  /* 데모 친구 활동 시뮬레이션 — 걸음/필기에 따라 점수가 실제로 올라간다 */
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

  /* 스탠바이(잠금화면 모드): 화면이 꺼지지 않게 유지 */
  useEffect(() => {
    if (!standby) return;
    activateKeepAwakeAsync('standby').catch(() => {});
    return () => { deactivateKeepAwake('standby').catch(() => {}); };
  }, [standby]);

  /* 점수 = 걸음 + 타이핑 */
  const myScore = steps + keys;
  const rows = [
    { id: 'me', name: '나', score: myScore, me: true, active: drive === 'bongo' || drive === 'active' },
    ...friends.map(f => ({ id: f.id, name: `${f.name} (데모)`, score: f.score, active: f.drive !== 'free' })),
  ].sort((a, b) => b.score - a.score);

  /* 책상 배치 — 교탁(나) 왼쪽 앞, 학생 책상(친구) 오른쪽 */
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={st.root}
    >
      <StatusBar style={standby ? 'light' : 'dark'} hidden={standby} />

      <View style={st.sceneWrap}>
        <Scene night={standby} time={time} dateStr={dateStr} rows={rows} desks={desks}>
          {/* 배경 탭 → 스탠바이 종료 (고양이는 위 레이어라 계속 만질 수 있다) */}
          {standby && (
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setStandby(false)} />
          )}

          {!standby && (
            <View style={[st.stepsBadge, { backgroundColor: T.card }]}>
              <Text style={[st.stepsNum, { color: T.ink }]}>👟 {steps.toLocaleString()}</Text>
              <Text style={st.stepsLabel}>{SOURCE_LABEL[source]}</Text>
            </View>
          )}

          {/* 내 고양이 — 타이핑하면 교탁으로 가서 필기 */}
          <Cat
            name="나"
            drive={drive}
            fieldWidth={width}
            deskX={deskCenter(desks.teacher)}
            bottom={44}
            onPoke={() => { touchAt.current = Date.now(); }}
          />

          {/* 데모 친구 고양이들 — 각자 학생 책상에서 필기하거나 돌아다닌다 */}
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
            {source === 'sim' && (
              <Pressable style={st.chip} onPress={() => addSteps(100)}>
                <Text style={st.chipText}>👟 ＋100 걸음</Text>
              </Pressable>
            )}
            <Pressable style={st.chip} onPress={() => setStandby(true)}>
              <Text style={st.chipText}>🌙 스탠바이 (잠금화면 모드)</Text>
            </Pressable>
          </View>

          <View style={st.memoCard}>
            <Text style={st.memoTitle}>메모장 · 타이핑하면 고양이가 교탁에서 필기해요 ✍️</Text>
            <TextInput
              style={st.memoInput}
              multiline
              value={memo}
              placeholder="오늘 할 일, 떠오르는 생각…"
              placeholderTextColor="#9aa5b1"
              onChangeText={t => {
                setKeys(k => k + Math.max(0, t.length - memo.length));
                setMemo(t);
                typingAt.current = Date.now();
              }}
            />
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
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
    padding: 12, paddingBottom: 26, gap: 8,
  },
  buttonRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  chip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#E3E0D6',
  },
  chipText: { fontSize: 13, fontWeight: '700', color: '#3D3345' },
  memoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14, padding: 13,
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#E3E0D6',
  },
  memoTitle: { fontSize: 12.5, fontWeight: '700', color: '#7a8494', marginBottom: 6 },
  memoInput: {
    minHeight: 56, maxHeight: 110, fontSize: 15, color: '#3D3345',
    textAlignVertical: 'top',
  },
});
