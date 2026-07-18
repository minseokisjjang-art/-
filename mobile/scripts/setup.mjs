#!/usr/bin/env node
/*
 * 잘지냥 원커맨드 설치 도우미
 * 사용법:  cd mobile && npm run setup
 * 하는 일: ① .env 작성  ② 데이터베이스 설치(테이블/보안/추첨 함수)
 *          ③ 익명 로그인 활성화 여부 검사  ④ 연결 자가진단
 * 몇 번을 다시 실행해도 안전합니다.
 */
import { createInterface } from 'node:readline/promises';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const mobileDir = path.join(here, '..');
const sqlPath = path.join(mobileDir, '..', 'supabase', 'migrations', '0001_init.sql');

const cyan = t => `\x1b[36m${t}\x1b[0m`;
const green = t => `\x1b[32m${t}\x1b[0m`;
const red = t => `\x1b[31m${t}\x1b[0m`;
const bold = t => `\x1b[1m${t}\x1b[0m`;

console.log(`
${bold('🐾 잘지냥 서버 연결 도우미')}

먼저 딱 한 가지만 해주세요 (아직 안 했다면):
  ${cyan('https://supabase.com')} 가입 → New project (지역: Seoul) → 생성 완료까지 대기

그 다음, 대시보드에서 3개 값을 복사해 아래에 붙여넣으면 나머지는 제가 다 합니다.
`);

const rl = createInterface({ input: process.stdin, output: process.stdout });

const url = (await rl.question(
  `1) ${bold('Project URL')} (Project Settings → API → Project URL)\n   → `,
)).trim().replace(/\/$/, '');

const anon = (await rl.question(
  `2) ${bold('anon public 키')} (같은 화면의 anon public — 아주 긴 문자열)\n   → `,
)).trim();

const db = (await rl.question(
  `3) ${bold('DB 연결 문자열')} (상단 Connect 버튼 → URI 탭 → 복사, [YOUR-PASSWORD]는 프로젝트 비밀번호로 교체)\n   → `,
)).trim();

rl.close();
console.log('');

/* ── 입력 검증 ── */
if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url)) {
  console.log(red('✗ Project URL 형식이 이상해요. https://xxxx.supabase.co 모양이어야 합니다.'));
  process.exit(1);
}
if (anon.length < 60) {
  console.log(red('✗ anon 키가 너무 짧아요. "anon public" 항목의 긴 문자열을 복사했는지 확인해 주세요.'));
  process.exit(1);
}
if (!/^postgres(ql)?:\/\//.test(db)) {
  console.log(red('✗ DB 연결 문자열은 postgresql:// 로 시작해야 해요 (Connect → URI 탭).'));
  process.exit(1);
}
if (db.includes('[YOUR-PASSWORD]')) {
  console.log(red('✗ 연결 문자열의 [YOUR-PASSWORD] 부분을 프로젝트 만들 때 정한 비밀번호로 바꿔주세요.'));
  process.exit(1);
}

/* ── ① .env 작성 ── */
writeFileSync(
  path.join(mobileDir, '.env'),
  `EXPO_PUBLIC_SUPABASE_URL=${url}\nEXPO_PUBLIC_SUPABASE_ANON_KEY=${anon}\n`,
);
console.log(green('✓ 앱 연결 설정(.env) 저장 완료'));

/* ── ② DB 설치 ── */
let pg;
try {
  pg = (await import('pg')).default;
} catch {
  console.log(red('✗ 준비물이 없어요. 먼저 npm install 을 실행해 주세요.'));
  process.exit(1);
}
if (!existsSync(sqlPath)) {
  console.log(red(`✗ 설치 파일을 못 찾았어요: ${sqlPath}`));
  process.exit(1);
}
const sql = readFileSync(sqlPath, 'utf8');
const client = new pg.Client({ connectionString: db, ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
} catch (e) {
  console.log(red('✗ 데이터베이스 접속 실패: ') + e.message);
  console.log('  → 비밀번호가 맞는지, Connect → URI를 그대로 복사했는지 확인해 주세요.');
  process.exit(1);
}
try {
  await client.query(sql);
  const { rows } = await client.query('select count(*)::int as n from items');
  console.log(green(`✓ 데이터베이스 설치 완료 (아이템 ${rows[0].n}종 확인)`));
} catch (e) {
  console.log(red('✗ 데이터베이스 설치 중 오류: ') + e.message);
  process.exit(1);
} finally {
  await client.end();
}

/* ── ③ 익명 로그인 검사 ── */
try {
  const res = await fetch(`${url}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: '{}',
  });
  const body = await res.json().catch(() => ({}));
  if (res.ok && body?.id) {
    console.log(green('✓ 익명 로그인 작동 확인'));
  } else if (JSON.stringify(body).includes('anonymous')) {
    console.log(red('✗ 마지막 스위치 하나가 꺼져 있어요!'));
    console.log(`  → ${cyan(url.replace('https://', 'https://supabase.com/dashboard/project/').replace('.supabase.co', '') + '/auth/providers')}`);
    console.log('  → 위 주소에서 "Anonymous Sign-ins"를 켠 뒤, 이 명령을 다시 실행해 주세요.');
    process.exit(1);
  } else {
    console.log(red('△ 익명 로그인 확인 불가: ') + JSON.stringify(body).slice(0, 120));
  }
} catch (e) {
  console.log(red('△ 인증 서버 확인 실패(네트워크?): ') + e.message);
}

console.log(`
${bold(green('🎉 서버 연결 끝! 이제:'))}
  · 체험:            npx expo start --web
  · 갤럭시 APK 빌드:  npm run build:android  (expo.dev 무료 가입 필요, 최초 1회 로그인)
  · 앱에서 확인:      설정 맨 아래 "🌐 서버에 연결되어 있어요"
`);
