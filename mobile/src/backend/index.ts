import type { Backend } from './types';
import { LocalBackend } from './local';

/*
 * 백엔드 선택:
 *  - .env에 EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY가 있으면 실서버
 *  - 없으면 로컬(오프라인/데모) 모드
 * 설정법: docs/SETUP-SUPABASE.md 참고
 */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

let instance: Backend | null = null;

export function getBackend(): Backend {
  if (instance) return instance;
  if (url && key) {
    // 지연 로드 — 로컬 모드에서 supabase-js 번들 초기화를 피한다
    const { SupabaseBackend } = require('./supabase') as typeof import('./supabase');
    instance = new SupabaseBackend(url, key);
  } else {
    instance = new LocalBackend();
  }
  return instance;
}
