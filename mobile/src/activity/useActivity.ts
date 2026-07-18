import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStepProvider, StepProvider, StepProviderKind } from './stepProvider';
import type { Backend } from '../backend/types';
import type { PresenceState } from '../types';

/*
 * 활동 판정 훅 — 기획서 §6 그대로:
 *  - 최근 10분 걸음 ≥ 30보 → walking (active보다 우선)
 *  - 포그라운드 + 최근 5분 내 터치 → active
 *  - 그 외 → idle
 *  - 상태 전송: 변경 시에만 + 최소 1분 간격
 *
 * 별가루 적립: 걸음/터치를 로컬에 모았다가 100 단위가 차면 서버에 보낸다
 * (서버가 100 단위로 환산하므로 나머지는 이월 — 낭비 없음).
 */

const WALK_WINDOW = 10 * 60 * 1000;
const TOUCH_WINDOW = 5 * 60 * 1000;
const JUDGE_EVERY = 15 * 1000;
const SEND_MIN_GAP = 60 * 1000;
const STEP_POLL = 60 * 1000;
const CATCHUP_MAX = 24 * 60 * 60 * 1000;   // 앱이 꺼져 있던 걸음 캐치업 상한 (24시간)
const FLUSH_STEP_CHUNK = 2000;             // 서버 상식 상한과 동일 — 한 번에 이만큼씩만 전송
const LAST_SYNC_KEY = 'jjn-last-step-sync';

export interface Activity {
  myState: Exclude<PresenceState, 'private'>;
  providerKind: StepProviderKind;
  recordTouch: () => void;
  /** 데모(웹) 전용 */
  addSimSteps: (n: number) => void;
  addSimTouches: (n: number) => void;
}

export function useActivity(backend: Backend, enabled: boolean): Activity {
  const [myState, setMyState] = useState<Exclude<PresenceState, 'private'>>('idle');
  const [providerKind, setProviderKind] = useState<StepProviderKind>('none');

  const provider = useRef<StepProvider | null>(null);
  const lastTouchAt = useRef(0);
  const recentSteps = useRef(0);          // 최근 10분 걸음 (판정용)
  const stepBaselineTotal = useRef(0);    // 적립용 누적 관측치
  const pendingSteps = useRef(0);         // 적립 대기 걸음
  const pendingTouches = useRef(0);       // 적립 대기 터치
  const lastSentState = useRef<string>('');
  const lastSentAt = useRef(0);
  const lastObservedRecent = useRef(0);

  const recordTouch = useCallback(() => {
    lastTouchAt.current = Date.now();
    pendingTouches.current += 1;
  }, []);

  const addSimTouches = useCallback((n: number) => {
    lastTouchAt.current = Date.now();
    pendingTouches.current += n;
  }, []);

  const addSimSteps = useCallback((n: number) => {
    provider.current?.addSimSteps(n);
    pendingSteps.current += n;
    recentSteps.current += n;
  }, []);

  /* provider 준비 + 캐치업:
     앱이 꺼져 있던 동안(폰은 켜짐)의 걸음은 OS(iOS CMPedometer / Health Connect)가
     계속 집계하므로, 다시 열 때 마지막 동기화 이후 구간을 한 번에 읽어 적립한다.
     (터치는 앱이 꺼지면 기록 불가 — 백그라운드 추적을 하지 않는 프라이버시 원칙) */
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    (async () => {
      const p = await getStepProvider();
      if (!alive) return;
      provider.current = p;
      setProviderKind(p.kind);

      if (p.kind === 'ios' || p.kind === 'android-hc') {
        try {
          const raw = await AsyncStorage.getItem(LAST_SYNC_KEY);
          const last = raw ? parseInt(raw, 10) : 0;
          if (last > 0) {
            const windowMs = Math.min(Date.now() - last, CATCHUP_MAX);
            if (windowMs > WALK_WINDOW) {
              const n = await p.getRecentSteps(windowMs);
              if (alive && n !== null && n > 0) pendingSteps.current += n;
              // 최근 10분 구간 이중 적립 방지 — 관측 기준선을 현재값으로 맞춘다
              const recent = await p.getRecentSteps(WALK_WINDOW);
              if (alive && recent !== null) {
                lastObservedRecent.current = recent;
                recentSteps.current = recent;
              }
            }
          }
          await AsyncStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
        } catch {}
      }
    })();
    return () => { alive = false; };
  }, [enabled]);

  /* 걸음 폴링 — 최근 10분 조회 + 적립 대기 누적 */
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const poll = async () => {
      const p = provider.current;
      if (!p || p.kind === 'sim') return; // sim은 addSimSteps가 직접 채움
      const n = await p.getRecentSteps(WALK_WINDOW);
      if (!alive || n === null) return;
      recentSteps.current = n;
      // 새로 관측된 걸음만 적립 대기에 더한다 (10분 창 이동 근사)
      const delta = Math.max(0, n - lastObservedRecent.current);
      lastObservedRecent.current = n;
      pendingSteps.current += delta;
      void AsyncStorage.setItem(LAST_SYNC_KEY, String(Date.now())).catch(() => {});
    };
    void poll();
    const iv = setInterval(poll, STEP_POLL);
    const sub = AppState.addEventListener('change', s => { if (s === 'active') void poll(); });
    return () => { alive = false; clearInterval(iv); sub.remove(); };
  }, [enabled]);

  /* sim 걸음 창 감쇠 (10분 지난 걸음 제거) */
  useEffect(() => {
    if (!enabled) return;
    const iv = setInterval(async () => {
      const p = provider.current;
      if (p?.kind === 'sim') {
        const n = await p.getRecentSteps(WALK_WINDOW);
        if (n !== null) recentSteps.current = n;
      }
    }, 30 * 1000);
    return () => clearInterval(iv);
  }, [enabled]);

  /* 판정 + 전송 루프 */
  useEffect(() => {
    if (!enabled) return;
    const judge = () => {
      const now = Date.now();
      let next: Exclude<PresenceState, 'private'> = 'idle';
      if (recentSteps.current >= 30) next = 'walking';
      else if (
        AppState.currentState === 'active' &&
        now - lastTouchAt.current < TOUCH_WINDOW
      ) next = 'active';
      setMyState(prev => (prev === next ? prev : next));

      const changed = next !== lastSentState.current;
      const dueGap = now - lastSentAt.current >= SEND_MIN_GAP;
      if ((changed && dueGap) || (changed && lastSentState.current === '')) {
        lastSentState.current = next;
        lastSentAt.current = now;
        void backend.setMyState(next);
      }
    };
    judge();
    const iv = setInterval(judge, JUDGE_EVERY);
    return () => clearInterval(iv);
  }, [enabled, backend]);

  /* 적립 플러시 — 100 단위가 차면 서버로 (나머지는 이월) */
  useEffect(() => {
    if (!enabled) return;
    const flush = async () => {
      // 서버의 회당 상식 상한(2,000보)에 맞춰 캐치업 걸음도 잘리지 않게 나눠 보낸다
      const s = Math.min(FLUSH_STEP_CHUNK, Math.floor(pendingSteps.current / 100) * 100);
      const t = Math.min(3000, Math.floor(pendingTouches.current / 100) * 100);
      if (s === 0 && t === 0) return;
      pendingSteps.current -= s;
      pendingTouches.current -= t;
      try {
        await backend.recordActivity(s, t);
      } catch {
        // 실패 시 되돌려서 다음에 재시도
        pendingSteps.current += s;
        pendingTouches.current += t;
      }
    };
    const iv = setInterval(flush, 20 * 1000);
    const sub = AppState.addEventListener('change', st => {
      if (st !== 'active') void flush();
    });
    return () => { clearInterval(iv); sub.remove(); void flush(); };
  }, [enabled, backend]);

  return { myState, providerKind, recordTouch, addSimSteps, addSimTouches };
}
