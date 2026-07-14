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
import { DAY, NIGHT } from './src/theme';

const SOURCE_LABEL = {
  'checking': '센서 확인 중…',
  'ios-daily': '오늘 걸음',
  'android-live': '앱 실행 후 걸음',
  'sim': '시뮬레이션',
};

export default function App() {
  const { width } = useWindowDimensions();
  const { time, dateStr } = useClock();
  const { steps, source, lastStepAt, addSteps } = useSteps();

  const [memo, setMemo] = useState('');
  const [drive, setDrive] = useState('free');
  const [standby, setStandby] = useState(false);

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

  /* 스탠바이(잠금화면 모드): 화면이 꺼지지 않게 유지 */
  useEffect(() => {
    if (!standby) return;
    activateKeepAwakeAsync('standby').catch(() => {});
    return () => { deactivateKeepAwake('standby').catch(() => {}); };
  }, [standby]);

  const T = standby ? NIGHT : DAY;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={st.root}
    >
      <StatusBar style={standby ? 'light' : 'dark'} hidden={standby} />

      <View style={st.sceneWrap}>
        <Scene night={standby}>
          {/* 배경 탭 → 스탠바이 종료 (고양이는 위 레이어라 계속 만질 수 있다) */}
          {standby && (
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setStandby(false)} />
          )}

          <View style={st.clockWrap} pointerEvents="none">
            <Text style={[st.time, standby && st.timeBig, { color: T.clock }]}>{time}</Text>
            <Text style={[st.date, { color: T.clock }]}>{dateStr}</Text>
          </View>

          {!standby && (
            <View style={[st.stepsBadge, { backgroundColor: T.card }]}>
              <Text style={st.stepsNum}>👟 {steps.toLocaleString()}</Text>
              <Text style={st.stepsLabel}>{SOURCE_LABEL[source]}</Text>
            </View>
          )}

          <Cat
            drive={drive}
            fieldWidth={width}
            onPoke={() => { touchAt.current = Date.now(); }}
          />

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
                <Text style={st.chipText}>👟 ＋100 산책</Text>
              </Pressable>
            )}
            <Pressable style={st.chip} onPress={() => setStandby(true)}>
              <Text style={st.chipText}>🌙 스탠바이 (잠금화면 모드)</Text>
            </Pressable>
          </View>

          <View style={st.memoCard}>
            <Text style={st.memoTitle}>메모장 · 타이핑하면 고양이가 봉고를 쳐요 🎹</Text>
            <TextInput
              style={st.memoInput}
              multiline
              value={memo}
              placeholder="오늘 할 일, 떠오르는 생각…"
              placeholderTextColor="#9aa5b1"
              onChangeText={t => { setMemo(t); typingAt.current = Date.now(); }}
            />
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: DAY.sky },
  sceneWrap: { flex: 1 },
  clockWrap: {
    position: 'absolute', top: '11%', left: 0, right: 0,
    alignItems: 'center',
  },
  time: {
    fontSize: 58, fontWeight: '800', letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  timeBig: { fontSize: 84 },
  date: { fontSize: 15, fontWeight: '600', opacity: 0.85, marginTop: 2 },
  stepsBadge: {
    position: 'absolute', top: 54, right: 14,
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7,
    alignItems: 'flex-end',
  },
  stepsNum: { fontSize: 16, fontWeight: '800', color: '#3D3345', fontVariant: ['tabular-nums'] },
  stepsLabel: { fontSize: 10.5, fontWeight: '600', color: '#8a94a6', marginTop: 1 },
  standbyHint: {
    position: 'absolute', bottom: 14, alignSelf: 'center',
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
