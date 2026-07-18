#!/usr/bin/env node
/*
 * 잘지냥 클라우드 설치 (GitHub Actions에서 실행)
 * SUPABASE_ACCESS_TOKEN 하나로: 프로젝트 생성(없으면) → 익명 로그인 켜기 →
 * 데이터베이스 설치 → 검증 → anon 키 조회까지 전부 자동.
 * 출력: GITHUB_OUTPUT에 url / anon
 */
import { readFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://api.supabase.com/v1';
const token = process.env.SUPABASE_ACCESS_TOKEN;
const here = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(here, '..', '..', 'supabase', 'migrations', '0001_init.sql');

const summary = (line) => {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, line + '\n');
  console.log(line);
};
const fail = (msg) => { summary(`❌ ${msg}`); process.exit(1); };

if (!token) {
  fail(
    'SUPABASE_ACCESS_TOKEN 시크릿이 없어요.\n' +
    '→ https://supabase.com/dashboard/account/tokens 에서 토큰을 만들고,\n' +
    '→ GitHub 저장소 Settings → Secrets and variables → Actions → New repository secret\n' +
    '   이름: SUPABASE_ACCESS_TOKEN, 값: 복사한 토큰',
  );
}

const api = async (method, p, body) => {
  const res = await fetch(API + p, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { ok: res.ok, status: res.status, json };
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ── 1. 프로젝트 찾기/만들기 ── */
console.log('1) 프로젝트 확인 중…');
const projects = await api('GET', '/projects');
if (!projects.ok) fail(`Supabase 접속 실패(${projects.status}) — 토큰이 올바른지 확인해 주세요: ${JSON.stringify(projects.json).slice(0, 200)}`);

let proj = (projects.json || []).find(p => p.name === 'jaljinyang');
let createdNow = false;
let dbPass = null;

if (!proj) {
  const orgs = await api('GET', '/organizations');
  if (!orgs.ok || !orgs.json?.length) fail('Supabase 조직을 찾지 못했어요 — supabase.com에 가입되어 있는지 확인해 주세요.');
  dbPass = 'Jjn' + Math.random().toString(36).slice(2, 10) + 'x' + Math.random().toString(36).slice(2, 10) + '9!';
  console.log('   프로젝트가 없어서 새로 만들어요 (1~2분)…');
  const created = await api('POST', '/projects', {
    name: 'jaljinyang',
    organization_id: orgs.json[0].id,
    region: 'ap-northeast-2',
    db_pass: dbPass,
  });
  if (!created.ok) fail(`프로젝트 생성 실패: ${JSON.stringify(created.json).slice(0, 300)}`);
  proj = created.json;
  createdNow = true;
}
const ref = proj.id;
const url = `https://${ref}.supabase.co`;
console.log(`   프로젝트: ${proj.name} (${ref})`);

/* ── 2. 준비될 때까지 대기 ── */
console.log('2) 프로젝트 준비 대기…');
for (let i = 0; i < 60; i++) {
  const st = await api('GET', `/projects/${ref}`);
  const status = st.json?.status;
  if (status === 'ACTIVE_HEALTHY') break;
  if (i === 59) fail(`프로젝트가 준비되지 않았어요 (상태: ${status}). 잠시 후 다시 실행해 주세요.`);
  await sleep(6000);
}
console.log('   준비 완료');

/* ── 3. 익명 로그인 켜기 ── */
console.log('3) 익명 로그인 활성화…');
const auth = await api('PATCH', `/projects/${ref}/config/auth`, {
  external_anonymous_users_enabled: true,
});
if (!auth.ok) summary(`△ 익명 로그인 자동 설정 실패(${auth.status}) — 대시보드 Authentication → Sign In/Providers에서 Anonymous를 수동으로 켜주세요.`);
else console.log('   완료');

/* ── 4. 데이터베이스 설치 ── */
console.log('4) 데이터베이스 설치…');
const sql = readFileSync(sqlPath, 'utf8');
const mig = await api('POST', `/projects/${ref}/database/query`, { query: sql });
if (!mig.ok) fail(`데이터베이스 설치 실패: ${JSON.stringify(mig.json).slice(0, 400)}`);
const check = await api('POST', `/projects/${ref}/database/query`, {
  query: 'select count(*)::int as n from items',
});
const n = Array.isArray(check.json) ? check.json[0]?.n : check.json?.[0]?.n;
if (n !== 24) summary(`△ 아이템 수 확인 이상(${n}) — 동작엔 문제 없을 수 있어요.`);
console.log(`   완료 (아이템 ${n}종)`);

/* ── 5. anon 키 조회 ── */
console.log('5) 앱용 열쇠 조회…');
const keys = await api('GET', `/projects/${ref}/api-keys`);
const anon = (keys.json || []).find(k => k.name === 'anon')?.api_key;
if (!anon) fail('anon 키를 찾지 못했어요.');

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `url=${url}\nanon=${anon}\n`);
}

summary('## ✅ 서버 설치 완료');
summary(`- 프로젝트: \`${ref}\` (${createdNow ? '새로 생성' : '기존 사용'})`);
summary(`- 앱 연결 값 (컴퓨터에서 로컬 실행 시 mobile/.env에 사용):`);
summary('```');
summary(`EXPO_PUBLIC_SUPABASE_URL=${url}`);
summary(`EXPO_PUBLIC_SUPABASE_ANON_KEY=${anon}`);
summary('```');
if (createdNow && dbPass) {
  summary(`- 🔑 DB 비밀번호(새로 생성됨, 메모해 두세요): \`${dbPass}\``);
}
