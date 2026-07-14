import { useEffect, useState } from 'react';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

/* 기기 로컬 시각(한국이면 KST) 기준 시계 */
export default function useClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return {
    time: `${hh}:${mm}`,
    dateStr: `${now.getMonth() + 1}월 ${now.getDate()}일 ${DAYS[now.getDay()]}요일`,
    hour: now.getHours(),
  };
}
