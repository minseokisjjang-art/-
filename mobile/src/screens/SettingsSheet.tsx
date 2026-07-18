import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import type { Backend } from '../backend/types';
import type { CatColor, Profile } from '../types';
import { CAT_COLORS, T } from '../theme';
import { CatBody } from '../components/CatSvg';
import { Button, Sheet, showToast } from '../components/ui';

/* 설정 — 닉네임/색, 상태·카운터 공개, 화면 항상 켜기, 교실 나가기 */

const AWAKE_KEY = 'jjn-keep-awake';

/** 저장된 '화면 항상 켜기' 설정을 앱 시작 시 복원 */
export async function restoreKeepAwake(): Promise<void> {
  try {
    if ((await AsyncStorage.getItem(AWAKE_KEY)) === '1') {
      await activateKeepAwakeAsync('desk');
    }
  } catch {}
}

export function SettingsSheet({
  visible, onClose, backend, profile, onProfileChanged, onLeft,
}: {
  visible: boolean; onClose: () => void;
  backend: Backend; profile: Profile;
  onProfileChanged: (p: Profile) => void;
  onLeft: () => void;
}) {
  const [nickname, setNickname] = useState(profile.nickname);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [keepAwake, setKeepAwake] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(AWAKE_KEY).then(v => setKeepAwake(v === '1'));
  }, []);

  const toggleAwake = async (v: boolean) => {
    setKeepAwake(v);
    try {
      if (v) {
        await activateKeepAwakeAsync('desk');
        showToast('책상에 세워두면 교실이 계속 보여요 📌');
      } else {
        await deactivateKeepAwake('desk');
      }
      await AsyncStorage.setItem(AWAKE_KEY, v ? '1' : '0');
    } catch {}
  };

  const patch = async (p: Partial<Profile>) => {
    const next = await backend.updateProfile(p);
    onProfileChanged(next);
  };

  return (
    <Sheet visible={visible} title="설정" onClose={onClose} testID="settings">
      {/* 닉네임 */}
      <Text style={s.label}>닉네임</Text>
      <View style={s.nickRow}>
        <TextInput
          style={s.input}
          value={nickname}
          onChangeText={t => setNickname(t.slice(0, 12))}
          testID="set-nickname"
        />
        <Button
          label="저장" kind="soft"
          onPress={async () => {
            if (!nickname.trim()) return;
            await patch({ nickname: nickname.trim() });
            showToast('닉네임을 바꿨어요');
          }}
          style={{ paddingVertical: 11 }}
        />
      </View>

      {/* 고양이 색 */}
      <Text style={s.label}>고양이 색</Text>
      <View style={s.colorRow}>
        {(['cream', 'cheese', 'gray'] as CatColor[]).map(ck => (
          <Pressable
            key={ck}
            style={[s.colorCard, profile.catColor === ck && s.colorCardOn]}
            onPress={async () => { await patch({ catColor: ck }); }}
            testID={`set-color-${ck}`}
          >
            <CatBody size={54} color={ck} />
            <Text style={s.colorLabel}>{CAT_COLORS[ck].label}</Text>
          </Pressable>
        ))}
      </View>

      {/* 공개 설정 */}
      <View style={s.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.switchTitle}>내 상태 보여주기</Text>
          <Text style={s.switchHint}>끄면 친구에게 커튼 친 창문으로 보여요</Text>
        </View>
        <Switch
          value={profile.shareStatus}
          onValueChange={v => { void patch({ shareStatus: v }); }}
          trackColor={{ true: T.accent, false: '#D9D2C2' }}
          thumbColor="#FFFFFF"
          testID="set-share-status"
        />
      </View>
      <View style={s.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.switchTitle}>활동 카운터 보여주기</Text>
          <Text style={s.switchHint}>끄면 머리 위 숫자가 친구에게 보이지 않아요</Text>
        </View>
        <Switch
          value={profile.shareCounter}
          onValueChange={v => { void patch({ shareCounter: v }); }}
          trackColor={{ true: T.accent, false: '#D9D2C2' }}
          thumbColor="#FFFFFF"
          testID="set-share-counter"
        />
      </View>

      {/* 화면 항상 켜기 (책상 모드) */}
      <View style={s.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.switchTitle}>화면 항상 켜기 📌</Text>
          <Text style={s.switchHint}>
            {Platform.OS === 'android'
              ? '책상에 세워두는 모드. 전원 버튼을 눌러도 잠금화면 위에 교실이 떠요'
              : '책상에 세워두는 모드. 앱이 켜져 있는 동안 화면이 꺼지지 않아요'}
          </Text>
        </View>
        <Switch
          value={keepAwake}
          onValueChange={v => { void toggleAwake(v); }}
          trackColor={{ true: T.accent, false: '#D9D2C2' }}
          thumbColor="#FFFFFF"
          testID="set-keep-awake"
        />
      </View>

      {/* 교실 나가기 */}
      <View style={s.leaveBox}>
        {!confirmLeave ? (
          <Pressable onPress={() => setConfirmLeave(true)} testID="set-leave">
            <Text style={s.leaveText}>교실 나가기</Text>
          </Pressable>
        ) : (
          <View style={{ gap: 10 }}>
            <Text style={s.leaveConfirmText}>
              정말 나갈까요? 초대코드가 있으면 언제든 다시 들어올 수 있어요.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
              <Button label="나가기" kind="ghost" testID="set-leave-yes"
                onPress={async () => { await backend.leaveClassroom(); setConfirmLeave(false); onLeft(); }} />
              <Button label="머무르기" kind="soft" onPress={() => setConfirmLeave(false)} />
            </View>
          </View>
        )}
      </View>

      <Text style={s.mode}>
        {backend.kind === 'supabase' ? '🌐 서버에 연결되어 있어요' : '📴 오프라인(로컬) 모드 — docs/SETUP-SUPABASE.md 참고'}
      </Text>
    </Sheet>
  );
}

const s = StyleSheet.create({
  label: { fontSize: 12.5, fontWeight: '800', color: T.sub, marginTop: 6, marginBottom: 7 },
  nickRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
  input: {
    flex: 1, backgroundColor: T.card,
    borderWidth: 1.5, borderColor: T.cardLine, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, fontWeight: '700', color: T.ink,
  },
  colorRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  colorCard: {
    flex: 1, alignItems: 'center', paddingVertical: 10, gap: 2,
    backgroundColor: T.card, borderRadius: 14,
    borderWidth: 2, borderColor: T.cardLine,
  },
  colorCardOn: { borderColor: T.accent, backgroundColor: T.accentSoft },
  colorLabel: { fontSize: 12, fontWeight: '700', color: T.sub },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: T.card, borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth, borderColor: T.cardLine,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8,
  },
  switchTitle: { fontSize: 14, fontWeight: '800', color: T.ink },
  switchHint: { fontSize: 11.5, color: T.sub, marginTop: 2 },
  leaveBox: { alignItems: 'center', marginTop: 14, paddingVertical: 6 },
  leaveText: { color: T.danger, fontSize: 13.5, fontWeight: '700', padding: 6 },
  leaveConfirmText: { fontSize: 13, color: T.ink, textAlign: 'center', lineHeight: 19 },
  mode: { fontSize: 11, color: '#B4AC9C', textAlign: 'center', marginTop: 14 },
});
