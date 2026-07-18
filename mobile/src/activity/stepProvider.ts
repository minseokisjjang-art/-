import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';

/*
 * 걸음 데이터 공급자 — 플랫폼 분기를 이 모듈 하나로 감싼다.
 *
 *  - ios:            expo-sensors Pedometer.getStepCountAsync (구간 조회 가능)
 *  - android-hc:     Health Connect(하루 누적·캐치업) + 기기 센서 실시간(즉각 반응) 하이브리드
 *                    ⚠ 삼성헬스→HC 동기화는 수 분 지연될 수 있어, 실시간 반응은 기기 센서가 담당
 *  - android-live:   폴백 — 기기 센서만 (앱 실행 중 실시간)
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

/* ── 기기 센서 실시간 누적 (안드로이드 공용) ────────── */

function makeLiveCounter() {
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
  const recent = (windowMs: number): number | null => {
    start();
    const cutoff = Date.now() - windowMs;
    events = events.filter(e => e.t > cutoff - 60 * 60 * 1000);
    const win = events.filter(e => e.t > cutoff);
    if (win.length === 0) return null;
    if (win.length === 1) return 0;
    return Math.max(0, win[win.length - 1].n - win[0].n);
  };
  return { start, recent };
}

/* ── sim ─────────────────────────────────────────── */

function makeSimProvider(): StepProvider {
  let events: { t: number; n: number }[] = [];
  return {
    kind: 'sim',
    async getRecentSteps(windowMs) {
      const cutoff = Date.now() - windowMs;
      events = events.filter(e => e.t > cutoff - 60 * 60 * 1000);
      return events.filter(e => e.t > cutoff).reduce((s, e) => s + e.n, 0);
    },
    addSimSteps(n) { events.push({ t: Date.now(), n }); },
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
      } catch { return null; }
    },
    addSimSteps() {},
    async requestPermission() {
      try {
        const p = await Pedometer.requestPermissionsAsync();
        return p.granted;
      } catch { return true; }
    },
  };
}

/* ── Android: Health Connect + 기기 센서 하이브리드 ── */

function makeHealthConnectProvider(hc: any): StepProvider {
  const live = makeLiveCounter();
  let inited = false;
  const ensureInit = async () => {
    if (inited) return;
    await hc.initialize();          // 앱 재시작 후 initialize 없이 읽으면 항상 실패한다
    inited = true;
  };

  const readHc = async (windowMs: number): Promise<number | null> => {
    try {
      await ensureInit();
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
    } catch { return null; }
  };

  return {
    kind: 'android-hc',
    async getRecentSteps(windowMs) {
      // 실시간 판정: 기기 센서가 즉각적, HC는 정확하지만 지연 → 둘 중 큰 값
      const [hcCount, liveCount] = await Promise.all([
        readHc(windowMs),
        Promise.resolve(live.recent(windowMs)),
      ]);
      if (hcCount === null && liveCount === null) return null;
      return Math.max(hcCount ?? 0, liveCount ?? 0);
    },
    addSimSteps() {},
    async requestPermission() {
      // 기기 센서 권한(ACTIVITY_RECOGNITION)도 함께 — 실시간 감지용
      try { await Pedometer.requestPermissionsAsync(); } catch {}
      try {
        await ensureInit();
        // 이미 허용돼 있으면 창을 다시 띄우지 않는다
        try {
          const granted = await hc.getGrantedPermissions();
          if (Array.isArray(granted) &&
              granted.some((g: any) => g?.recordType === 'Steps')) {
            live.start();
            return true;
          }
        } catch {}
        const res = await hc.requestPermission([
          { accessType: 'read', recordType: 'Steps' },
        ]);
        live.start();
        return Array.isArray(res) && res.length > 0;
      } catch {
        return false;
      }
    },
  };
}

/* ── Android 폴백: 기기 센서만 ────────────────────── */

function makeAndroidLiveProvider(): StepProvider {
  const live = makeLiveCounter();
  return {
    kind: 'android-live',
    async getRecentSteps(windowMs) { return live.recent(windowMs); },
    addSimSteps() {},
    async requestPermission() {
      try {
        const p = await Pedometer.requestPermissionsAsync();
        live.start();
        return p.granted;
      } catch { return true; }
    },
  };
}

/* ── 팩토리 ──────────────────────────────────────── */

let cached: StepProvider | null = null;

/** 걸음 다시 연결하기 — 감지부터 다시 수행 */
export function resetStepProvider(): void {
  cached = null;
}

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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const hc = require('react-native-health-connect');
    const status = await hc.getSdkStatus();
    const AVAILABLE = hc.SdkAvailabilityStatus?.SDK_AVAILABLE ?? 3;
    if (status === AVAILABLE || status === 3) {
      cached = makeHealthConnectProvider(hc);
      return cached;
    }
  } catch {}

  const ok = await Pedometer.isAvailableAsync().catch(() => false);
  cached = ok ? makeAndroidLiveProvider() : makeSimProvider();
  return cached;
}
