import React, { useRef, useState } from 'react';
import {
  Animated, KeyboardAvoidingView, Platform, Pressable,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import type { Backend } from '../backend/types';
import type { CatColor, Profile } from '../types';
import { CAT_COLORS, T } from '../theme';
import { CatBody } from '../components/CatSvg';
import { Button, showToast } from '../components/ui';
import { getStepProvider } from '../activity/stepProvider';

/*
 * 온보딩 — 기획서 화면 A.
 * ①소개 → ②닉네임 → ③고양이 색 → ④걸음 권한(건너뛰기 가능) → ⑤교실 만들기/참여
 */

type Step = 'intro' | 'nickname' | 'color' | 'permission' | 'gate' | 'created';

export function Onboarding({
  backend, existingProfile, onDone,
}: {
  backend: Backend;
  existingProfile: Profile | null;   // 프로필은 있는데 교실이 없는 경우 → gate부터
  onDone: () => void;
}) {
  const [step, setStep] = useState<Step>(existingProfile ? 'gate' : 'intro');
  const [nickname, setNickname] = useState(existingProfile?.nickname ?? '');
  const [color, setColor] = useState<CatColor>(existingProfile?.catColor ?? 'cream');
  const [code, setCode] = useState('');
  const [createdCode, setCreatedCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [joining, setJoining] = useState(false);

  const fade = useRef(new Animated.Value(1)).current;
  const go = (next: Step) => {
    Animated.sequence([
      Animated.timing(fade, { toValue: 0, duration: 120, useNativeDriver: false }),
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: false }),
    ]).start();
    setStep(next);
  };

  const stepIndex: Record<Step, number> = {
    intro: 0, nickname: 1, color: 2, permission: 3, gate: 4, created: 4,
  };

  const askPermission = async () => {
    setBusy(true);
    try {
      const p = await getStepProvider();
      const ok = await p.requestPermission();
      showToast(ok ? '걸음 준비 완료! 🐾' : '괜찮아요, 터치만으로도 살아있어요');
    } finally {
      setBusy(false);
      await ensureProfile();
      go('gate');
    }
  };

  const skipPermission = async () => {
    await ensureProfile();
    go('gate');
  };

  const ensureProfile = async () => {
    if (existingProfile) return;
    await backend.createProfile(nickname.trim(), color);
  };

  const createRoom = async () => {
    setBusy(true);
    try {
      const c = await backend.createClassroom();
      setCreatedCode(c);
      go('created');
    } finally { setBusy(false); }
  };

  const joinRoom = async () => {
    if (code.trim().length < 4) { setJoinError('코드를 확인해 주세요'); return; }
    setBusy(true);
    try {
      const r = await backend.joinClassroom(code);
      if (r === 'ok') { onDone(); return; }
      setJoinError(r === 'full' ? '이 교실은 자리가 다 찼어요 (최대 8명)' : '없는 코드예요. 다시 확인해 주세요');
    } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* 진행 점 */}
      <View style={s.dots}>
        {[0, 1, 2, 3, 4].map(i => (
          <View key={i} style={[s.dot, i === stepIndex[step] && s.dotOn]} />
        ))}
      </View>

      <Animated.View style={[s.body, { opacity: fade }]}>
        {step === 'intro' && (
          <View style={s.center}>
            <View style={s.heroCat}><CatBody size={150} color="cream" mood="happy" /></View>
            <Text style={s.title}>잘지냥</Text>
            <Text style={s.subtitle}>말 안 걸어도,{'\n'}잘 지내는 게 보여요</Text>
            <Text style={s.caption}>
              걸으면 뛰고, 폰을 만지면 필기하고, 조용하면 자요.{'\n'}
              내 고양이가 친구들에게 안부를 대신 전해요.
            </Text>
            <Button label="시작하기" onPress={() => go('nickname')} testID="ob-start" style={{ minWidth: 200 }} />
          </View>
        )}

        {step === 'nickname' && (
          <View style={s.center}>
            <Text style={s.stepTitle}>뭐라고 불러드릴까요?</Text>
            <Text style={s.stepHint}>실명·전화번호·이메일은 받지 않아요</Text>
            <TextInput
              style={s.input}
              value={nickname}
              onChangeText={t => setNickname(t.slice(0, 12))}
              placeholder="닉네임 (1~12자)"
              placeholderTextColor="#B7AF9E"
              autoFocus
              testID="ob-nickname"
            />
            <Button
              label="다음"
              onPress={() => go('color')}
              disabled={nickname.trim().length === 0}
              testID="ob-nickname-next"
              style={{ minWidth: 200 }}
            />
          </View>
        )}

        {step === 'color' && (
          <View style={s.center}>
            <Text style={s.stepTitle}>내 고양이를 골라주세요</Text>
            <Text style={s.stepHint}>색은 나중에 설정에서 바꿀 수 있어요</Text>
            <View style={s.colorRow}>
              {(['cream', 'cheese', 'gray'] as CatColor[]).map(ck => (
                <Pressable
                  key={ck}
                  onPress={() => setColor(ck)}
                  style={[s.colorCard, color === ck && s.colorCardOn]}
                  testID={`ob-color-${ck}`}
                >
                  <CatBody size={72} color={ck} mood={color === ck ? 'happy' : 'open'} />
                  <Text style={[s.colorLabel, color === ck && { color: '#8A5A2B' }]}>
                    {CAT_COLORS[ck].label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Button label="다음" onPress={() => go('permission')} testID="ob-color-next" style={{ minWidth: 200 }} />
          </View>
        )}

        {step === 'permission' && (
          <View style={s.center}>
            <Text style={{ fontSize: 44 }}>👟</Text>
            <Text style={s.stepTitle}>걸음을 읽어도 될까요?</Text>
            <Text style={s.caption}>
              걸음이 감지되면 고양이가 신나게 뛰어요.{'\n'}
              정확한 걸음 수는 친구에게 보이지 않아요 —{'\n'}
              "뛰는 중"이라는 모습만 전해져요.
            </Text>
            <Button label="좋아요, 읽어도 돼요" onPress={askPermission} disabled={busy} testID="ob-perm-ok" style={{ minWidth: 220 }} />
            <Pressable onPress={skipPermission} hitSlop={8} testID="ob-perm-skip">
              <Text style={s.skip}>건너뛰기 (터치만으로도 살아있어요)</Text>
            </Pressable>
          </View>
        )}

        {step === 'gate' && !joining && (
          <View style={s.center}>
            <View style={s.heroCat}><CatBody size={110} color={color} /></View>
            <Text style={s.stepTitle}>교실에 들어가 볼까요?</Text>
            <Text style={s.stepHint}>교실 하나에 최대 8명까지 함께해요</Text>
            <Button label="새 교실 만들기" onPress={createRoom} disabled={busy} testID="ob-create" style={{ minWidth: 220 }} />
            <Button label="초대코드 입력" kind="ghost" onPress={() => setJoining(true)} testID="ob-join" style={{ minWidth: 220 }} />
          </View>
        )}

        {step === 'gate' && joining && (
          <View style={s.center}>
            <Text style={s.stepTitle}>초대코드를 입력해 주세요</Text>
            <TextInput
              style={[s.input, s.codeInput]}
              value={code}
              onChangeText={t => { setCode(t.toUpperCase().slice(0, 6)); setJoinError(null); }}
              placeholder="ABC123"
              placeholderTextColor="#B7AF9E"
              autoCapitalize="characters"
              autoFocus
              testID="ob-code"
            />
            {joinError && <Text style={s.error}>{joinError}</Text>}
            <Button label="들어가기" onPress={joinRoom} disabled={busy || code.length < 4} testID="ob-join-go" style={{ minWidth: 200 }} />
            <Pressable onPress={() => { setJoining(false); setJoinError(null); }} hitSlop={8}>
              <Text style={s.skip}>뒤로</Text>
            </Pressable>
          </View>
        )}

        {step === 'created' && (
          <View style={s.center}>
            <Text style={{ fontSize: 40 }}>🎉</Text>
            <Text style={s.stepTitle}>교실이 생겼어요!</Text>
            <Text style={s.stepHint}>이 코드를 단톡방에 붙여넣으면 끝이에요</Text>
            <Pressable
              style={s.codeCard}
              onPress={async () => { await Clipboard.setStringAsync(createdCode); showToast('코드를 복사했어요 📋'); }}
              testID="ob-code-copy"
            >
              <Text style={s.codeText}>{createdCode}</Text>
              <Text style={s.codeCopyHint}>탭해서 복사</Text>
            </Pressable>
            <Button label="교실 들어가기" onPress={onDone} testID="ob-enter" style={{ minWidth: 220 }} />
          </View>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  dots: {
    flexDirection: 'row', gap: 7, justifyContent: 'center',
    marginTop: 64,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#E3DAC6' },
  dotOn: { backgroundColor: T.accent, width: 18 },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 60 },
  center: { alignItems: 'center', gap: 14 },
  heroCat: { marginBottom: 4 },
  title: { fontSize: 34, fontWeight: '900', color: T.ink, letterSpacing: 1 },
  subtitle: {
    fontSize: 21, fontWeight: '800', color: T.ink,
    textAlign: 'center', lineHeight: 30,
  },
  caption: {
    fontSize: 13.5, color: T.sub, textAlign: 'center', lineHeight: 21,
    marginBottom: 6,
  },
  stepTitle: { fontSize: 21, fontWeight: '800', color: T.ink, textAlign: 'center' },
  stepHint: { fontSize: 13, color: T.sub, marginBottom: 4 },
  input: {
    alignSelf: 'stretch', backgroundColor: T.card,
    borderWidth: 1.5, borderColor: T.cardLine, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 16, color: T.ink, textAlign: 'center', fontWeight: '700',
  },
  codeInput: { letterSpacing: 8, fontSize: 22 },
  error: { color: T.danger, fontSize: 13, fontWeight: '700' },
  skip: { color: T.sub, fontSize: 13.5, fontWeight: '600', padding: 6 },
  colorRow: { flexDirection: 'row', gap: 10, marginVertical: 8 },
  colorCard: {
    alignItems: 'center', gap: 2,
    backgroundColor: T.card, borderRadius: 18,
    borderWidth: 2, borderColor: T.cardLine,
    paddingVertical: 12, paddingHorizontal: 8, width: 100,
  },
  colorCardOn: { borderColor: T.accent, backgroundColor: T.accentSoft },
  colorLabel: { fontSize: 13, fontWeight: '800', color: T.sub },
  codeCard: {
    backgroundColor: T.card, borderRadius: 18,
    borderWidth: 2, borderColor: T.accent,
    paddingHorizontal: 34, paddingVertical: 18, alignItems: 'center', gap: 4,
  },
  codeText: { fontSize: 30, fontWeight: '900', color: T.ink, letterSpacing: 7 },
  codeCopyHint: { fontSize: 12, color: T.sub, fontWeight: '600' },
});
