import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getBackend } from './src/backend';
import { useActivity } from './src/activity/useActivity';
import type { Profile } from './src/types';
import { T } from './src/theme';
import { CatBody } from './src/components/CatSvg';
import { ToastHost } from './src/components/ui';
import { Onboarding } from './src/screens/Onboarding';
import { ClassroomScreen } from './src/screens/ClassroomScreen';
import { restoreKeepAwake, restoreLockScreenService } from './src/screens/SettingsSheet';

/*
 * 잘지냥 — 앱 루트.
 * boot(세션 복원) → onboarding(프로필/교실 없음) → classroom(메인)
 * 루트 뷰가 모든 터치를 관찰해 활동 판정('active')에 쓴다 — 내용은 기록하지 않는다.
 */

type Route = 'boot' | 'onboarding' | 'classroom';

export default function App() {
  const backend = useMemo(() => getBackend(), []);
  const [route, setRoute] = useState<Route>('boot');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);

  const activity = useActivity(backend, route === 'classroom');
  const activityRef = useRef(activity);
  activityRef.current = activity;

  useEffect(() => {
    void restoreKeepAwake();
    void restoreLockScreenService();
    let alive = true;
    (async () => {
      try {
        const p = await backend.init();
        if (!alive) return;
        setProfile(p);
        if (!p) { setRoute('onboarding'); return; }
        const snap = await backend.getSnapshot();
        if (!alive) return;
        setRoute(snap.code ? 'classroom' : 'onboarding');
      } catch (e: any) {
        if (!alive) return;
        setBootError(String(e?.message ?? e));
        setRoute('onboarding');
      }
    })();
    return () => { alive = false; };
  }, [backend]);

  const finishOnboarding = async () => {
    const p = await backend.init();
    setProfile(p);
    setRoute('classroom');
  };

  return (
    <View
      style={st.root}
      // 터치 발생 사실만 기록 (제스처를 가로채지 않음)
      onStartShouldSetResponderCapture={() => {
        activityRef.current.recordTouch();
        return false;
      }}
    >
      <StatusBar style="dark" />

      {route === 'boot' && (
        <View style={st.boot}>
          <CatBody size={110} color="cream" mood="happy" />
          <Text style={st.bootText}>잘지냥</Text>
        </View>
      )}

      {route === 'onboarding' && (
        <Onboarding
          backend={backend}
          existingProfile={profile}
          onDone={() => { void finishOnboarding(); }}
        />
      )}

      {route === 'classroom' && profile && (
        <ClassroomScreen
          backend={backend}
          activity={activity}
          profile={profile}
          onProfileChanged={setProfile}
          onLeftClassroom={() => setRoute('onboarding')}
        />
      )}

      {bootError && route !== 'classroom' && (
        <Text style={st.bootError}>연결에 문제가 있어요: {bootError}</Text>
      )}

      <ToastHost />
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  bootText: { fontSize: 22, fontWeight: '900', color: T.ink, letterSpacing: 2 },
  bootError: {
    position: 'absolute', bottom: 30, alignSelf: 'center',
    fontSize: 11, color: T.danger, paddingHorizontal: 30, textAlign: 'center',
  },
});
