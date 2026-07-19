import { Platform } from 'react-native';

/*
 * StepEngine 네이티브 모듈의 JS 입구.
 * 안드로이드 개발 빌드에만 존재한다 — 웹/Expo Go/iOS에서는 null이라서
 * 호출부가 안전하게 폴백(HC/기기센서/데모)으로 넘어간다.
 */

interface PermissionResponse {
  granted: boolean;
  status: string;
  canAskAgain?: boolean;
}

export interface StepEngineNative {
  /** 걸음 칩 존재 여부 (동기) */
  hasStepSensor(): boolean;
  /** 부팅 이후 칩 누적 걸음. 칩 무응답 시 마지막 관측값, 그것도 없으면 null */
  getCumulativeSteps(): Promise<number | null>;
  /** 활동(걸음) + 알림 권한 요청 */
  requestPermissions(): Promise<PermissionResponse>;
  getPermissions(): Promise<PermissionResponse>;
  /** 잠금화면 걸음 서비스 — 앱이 포그라운드일 때 호출 */
  startLockScreenService(): void;
  stopLockScreenService(): void;
  isServiceRunning(): boolean;
  /** 서비스가 세어 둔 잠금해제(기척) 횟수 — 읽는 순간 리셋 */
  takeUnlockCount(): number;
}

let native: StepEngineNative | null = null;

if (Platform.OS === 'android') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { requireNativeModule } = require('expo-modules-core');
    native = requireNativeModule('StepEngine');
  } catch {
    native = null;
  }
}

export default native;
