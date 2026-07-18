import { EARN } from '../data/items';

/*
 * 별가루 적립 계산 — 로컬 모드 전용 (서버 모드에서는 record_activity SQL이 담당).
 * 규칙은 SQL과 동일: 100보=⭐10, 터치100=⭐5, 일일 상한 300, 걸음 상식 상한 2000.
 */
export function computeEarn(
  steps: number,
  touches: number,
  earnedToday: number,
): number {
  const s = Math.min(Math.max(steps, 0), EARN.stepsSanityCap);
  const t = Math.min(Math.max(touches, 0), 3000);
  let earn =
    Math.floor(s / EARN.perSteps.unit) * EARN.perSteps.star +
    Math.floor(t / EARN.perTouches.unit) * EARN.perTouches.star;
  earn = Math.min(earn, EARN.dailyCap - earnedToday);
  return Math.max(earn, 0);
}

export const todayKey = () => new Date().toDateString();
