# 잘지냥 서버(Supabase) 연결 가이드 — 비개발자용

> 앱은 서버 없이도 "오프라인 모드"로 동작하지만, **친구와 진짜로 연결**하려면
> 서버가 필요해요. 아래를 순서대로 따라 하면 10~15분 걸립니다. 전부 무료예요.

## 1. Supabase 프로젝트 만들기 (약 3분)

1. https://supabase.com 접속 → 가입(구글 계정이면 클릭 몇 번)
2. **New project** 클릭 → 이름은 `jaljinyang` 아무거나, 비밀번호는 만들어서 메모, 지역은 **Northeast Asia (Seoul)** 선택 → Create
3. 1~2분 기다리면 프로젝트가 준비됩니다

## 2. 익명 로그인 켜기 (1분)

1. 왼쪽 메뉴 **Authentication** → **Sign In / Providers**
2. **Anonymous Sign-ins** 스위치를 **켬**으로 → Save

## 3. 데이터베이스 설치 (2분)

1. 왼쪽 메뉴 **SQL Editor** → **New query**
2. 이 저장소의 `supabase/migrations/0001_init.sql` 파일 내용을 **전부 복사해서 붙여넣기**
3. 우하단 **Run** 클릭 → "Success" 가 뜨면 끝
   (테이블·보안 규칙·서버 추첨 함수가 한 번에 설치됩니다)

## 4. 열쇠 2개를 앱에 넣기 (2분)

1. 왼쪽 메뉴 **Project Settings**(톱니) → **API**
2. **Project URL**과 **anon public** 키를 복사
3. 컴퓨터에서 `mobile/` 폴더 안에 `.env` 라는 파일을 만들고 아래처럼 채우기:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...(아주 긴 문자열)
```

> ⚠️ `anon` 키는 앱에 넣어도 되는 공개용 열쇠예요 (보안은 서버의 RLS 규칙이 지킵니다).
> 같은 화면의 **service_role** 키는 **절대** 앱이나 카톡에 넣으면 안 됩니다.

4. 앱을 다시 시작하면 자동으로 서버 모드가 됩니다.
   확인법: 앱 → 설정 맨 아래에 "🌐 서버에 연결되어 있어요"라고 떠요.

## 5. 갤럭시에 개발 빌드 설치하기 (Health Connect 때문에 필요)

걸음 데이터(Health Connect)는 Expo Go 앱에서는 안 돌아가서, **내 전용 앱(개발 빌드)**을
한 번 만들어야 해요. 컴퓨터에 안드로이드 개발 환경을 깔 필요 없이 Expo의 클라우드
빌드(EAS)를 쓰는 걸 추천합니다:

```bash
cd mobile
npm install
npx eas-cli login          # expo.dev 계정 (무료 가입)
npx eas-cli build:configure
npx eas-cli build --profile development --platform android
```

10분쯤 후 빌드가 끝나면 **QR/링크**가 나와요 → 갤럭시에서 열어 APK 설치 →
컴퓨터에서 `npx expo start`를 켜두고 앱을 실행하면 연결됩니다.

- 갤럭시에서 걸음이 안 잡히면: 삼성헬스 앱 → 설정 → **헬스 커넥트(Health Connect)에
  데이터 공유**가 켜져 있는지 확인하세요 (갤럭시는 삼성헬스가 걸음을 기록합니다).
- 권한을 거부해도 앱은 정상 동작해요 — 터치만으로 살아있습니다.

아이폰 친구는: 위 명령에서 `--platform ios`로 빌드하려면 Apple 개발자 계정(연 $99)이
필요합니다. 테스트 단계에서는 아이폰은 Expo Go로도 대부분 동작해요
(걸음도 iOS는 Expo Go에서 됩니다).

## 6. 친구 배포 순서 (검증 시작!)

1. 내 폰에서 교실 만들기 → 초대코드 복사
2. 친구에게 APK(안드) 또는 Expo Go 실행법(아이폰) + 초대코드를 카톡으로 전달
3. 친구가 초대코드 입력 → 양쪽 교실에 서로의 고양이가 나타나면 성공 🎉

## 자주 묻는 것

- **돈 나가요?** Supabase 무료 티어(500MB, 5만 사용자)로 충분해요. 단, 1주일간 아무도
  안 쓰면 프로젝트가 잠자기 모드가 돼요 — 대시보드에서 Restore 버튼 한 번이면 깨어납니다.
- **오프라인 모드로 돌아가려면?** `.env` 파일을 지우면 됩니다 (로컬 저장은 따로 유지).
