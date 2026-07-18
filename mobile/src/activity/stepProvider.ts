import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';

/*
 * 걸음 데이터 공급자 — 플랫폼 분기를 이 모듈 하나로 감싼다.
 * 나머지 코드는 provider.kind와 getStepsSince()만 알면 된다.
 *
 *  - ios:            expo-sensors Pedometer.getStepCountAsync (구간 조회 가능)
 *  - android-hc:     react-native-health-connect (Health Connect READ_STEPS)
 *  - android-live:   폴백 — Pedometer.watchStepCount (앱 사용 중 실시간 누적)
 *  - sim:            웹/센서 없음 — 데모 버튼으로만 걸음 추가
 */

export type StepProviderKind = 'ios' | 'android-hc' | 'android-live' | 'sim' | 'none';

export interface StepProvider {
  kind: StepProviderKind;
  /** 최근 windowMs 동안의 걸음 수. 알 수 없으면 null */
  getRecentSteps(windowMs: number): Promise<number | null>;
  /** 데모 전용: 걸음 주입 (sim에서만 동작) */
  addSimSteps(n: number): void;
  /** 권한 요청 결과 */
  requestPermission(): Promise<boolean>;
}

/* ── sim ─────────────────────────────────────────── */

function makeSimProvider(): StepProvider {
  // 타임스탬프 기록으로 "최근 N분 걸음"을 흉내낸다
  let events: { t: number; n: number }[] = [];
  return {
    kind: 'sim',
    async getRecentSteps(windowMs) {
      const cutoff = Date.now() - windowMs;
      events = events.filter(e => e.t > cutoff - 60 * 60 * 1000);
      return events.filter(e => e.t > cutoff).reduce((s, e) => s + e.n, 0);
    },
    addSimSteps(n) {
      events.push({ t: Date.now(), n });
    },
    async requestPermission() { return true; },
  };
}

/* ── iOS ─────────────────────────────────────────── */

function makeIosProvider(): StepProvider {
  return {
    kind: 'ios',
    async getRecentSteps(windowMs) {
      try {
        const end = new Date();
        const start = new Date(end.getTime() - windowMs);
        const r = await Pedometer.getStepCountAsync(start, end);
        return r.steps;
      } catch {
        return null;
      }
    },
    addSimSteps() {},
    async requestPermission() {
      try {
        const p = await Pedometer.requestPermissionsAsync();
        return p.granted;
      } catch {
        return true; // 일부 기기는 권한 API 없이 동작
      }
    },
  };
}

/* ── Android: Health Connect ─────────────────────── */

function makeHealthConnectProvider(hc: any): StepProvider {
  return {
    kind: 'android-hc',
    async getRecentSteps(windowMs) {
      try {
        const end = new Date();
        const start = new Date(end.getTime() - windowMs);
        const res = await hc.readRecords('Steps', {
          timeRangeFilter: {
            operator: 'between',
            startTime: start.toISOString(),
            endTime: end.toISOString(),
          },
        });
        const records: any[] = res?.records ?? res ?? [];
        return records.reduce((s, r) => s + (r.count ?? 0), 0);
      } catch {
        return null;
      }
    },
    addSimSteps() {},
    async requestPermission() {
      try {
        await hc.initialize();
        const granted = await hc.requestPermission([
          { accessType: 'read', recordType: 'Steps' },
        ]);
        return Array.isArray(granted) && granted.length > 0;
      } catch {
        return false;
      }
    },
  };
}

/* ── Android 폴백: 앱 사용 중 실시간 감지 ─────────── */

function makeAndroidLiveProvider(): StepProvider {
  let events: { t: number; n: number }[] = [];
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    try {
      Pedometer.watchStepCount(r => {
        events.push({ t: Date.now(), n: r.steps });
      });
    } catch {}
  };
  return {
    kind: 'android-live',
    async getRecentSteps(windowMs) {
      start();
      const cutoff = Date.now() - windowMs;
      events = events.filter(e => e.t > cutoff - 60 * 60 * 1000);
      // watchStepCount는 구독 이후 누적치를 주므로, 최근 구간 델타로 환산
      const recent = events.filter(e => e.t > cutoff);
      if (recent.length < 2) return recent.length === 1 ? 0 : null;
      return Math.max(0, recent[recent.length - 1].n - recent[0].n);
    },
    addSimSteps() {},
    async requestPermission() {
      try {
        const p = await Pedometer.requestPermissionsAsync();
        return p.granted;
      } catch {
        return true;
      }
    },
  };
}

/* ── 팩토리 ──────────────────────────────────────── */

let cached: StepProvider | null = null;

export async function getStepProvider(): Promise<StepProvider> {
  if (cached) return cached;

  if (Platform.OS === 'web') {
    cached = makeSimProvider();
    return cached;
  }

  if (Platform.OS === 'ios') {
    const ok = await Pedometer.isAvailableAsync().catch(() => false);
    cached = ok ? makeIosProvider() : makeSimProvider();
    return cached;
  }

  // Android: Health Connect 우선, 실패 시 라이브 폴백
  try {
    // Expo Go/웹에는 네이티브 모듈이 없으므로 지연 require + 가드
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const hc = require('react-native-health-connect');
    const status = await hc.getSdkStatus();
    if (status === hc.SdkAvailabilityStatus?.SDK_AVAILABLE || status === 3) {
      cached = makeHealthConnectProvider(hc);
      return cached;
    }
  } catch {}

  const ok = await Pedometer.isAvailableAsync().catch(() => false);
  cached = ok ? makeAndroidLiveProvider() : makeSimProvider();
  return cached;
}
