import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/*
 * 오늘 걸음수 훅.
 *  - iOS:     CMPedometer가 앱이 꺼져 있어도 집계 → 자정 기준 오늘 누적을 폴링
 *  - Android: expo-sensors는 일일 누적 조회 미지원 → 앱 실행 중 걸음만 라이브 카운트
 *             (하루 누적은 브리프 v2의 다음 단계인 Health Connect에서)
 *  - 웹/센서 없음: 시뮬레이션 모드 (버튼으로 걸음 추가)
 *
 * source: 'checking' | 'ios-daily' | 'android-live' | 'sim'
 */
export default function useSteps() {
  const [steps, setSteps] = useState(0);
  const [source, setSource] = useState('checking');
  const [lastStepAt, setLastStepAt] = useState(0);
  const simBase = useRef(0);

  useEffect(() => {
    let alive = true;
    let sub = null;
    let poll = null;

    (async () => {
      if (Platform.OS === 'web') { setSource('sim'); return; }

      const available = await Pedometer.isAvailableAsync().catch(() => false);
      if (!available) { if (alive) setSource('sim'); return; }

      try {
        const perm = await Pedometer.requestPermissionsAsync();
        if (!perm.granted) { if (alive) setSource('sim'); return; }
      } catch {
        // 일부 기기는 권한 API가 없어도 센서가 동작한다 — 계속 진행
      }
      if (!alive) return;

      if (Platform.OS === 'ios') {
        setSource('ios-daily');
        const refresh = async () => {
          try {
            const r = await Pedometer.getStepCountAsync(startOfToday(), new Date());
            if (alive) setSteps(r.steps);
          } catch {}
        };
        refresh();
        poll = setInterval(refresh, 15000);
        sub = Pedometer.watchStepCount(() => {
          if (!alive) return;
          setLastStepAt(Date.now());
          refresh();
        });
      } else {
        setSource('android-live');
        sub = Pedometer.watchStepCount(r => {
          if (!alive) return;
          setSteps(simBase.current + r.steps);
          setLastStepAt(Date.now());
        });
      }
    })();

    return () => {
      alive = false;
      sub?.remove?.();
      if (poll) clearInterval(poll);
    };
  }, []);

  /* 시뮬레이션/데모: 산책한 것처럼 걸음을 추가 */
  const addSteps = useCallback(n => {
    simBase.current += n;
    setSteps(s => s + n);
    setLastStepAt(Date.now());
  }, []);

  return { steps, source, lastStepAt, addSteps };
}
