import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import type { Backend } from '../backend/types';
import type { CatColor, Profile } from '../types';
import { CAT_COLORS, T } from '../theme';
import { CatBody } from '../components/CatSvg';
import { Button, Sheet, showToast } from '../components/ui';
import { APP_VERSION } from '../version';
import StepEngine from '../../modules/step-engine';

/* 설정 — 닉네임/색, 상태·카운터 공개, 잠금화면 걸음, 화면 항상 켜기, 교실 나가기 */

const AWAKE_KEY = 'jjn-keep-awake';
const LOCK_SERVICE_KEY = 'jjn-lockscreen-service';

/** 저장된 '화면 항상 켜기' 설정을 앱 시작 시 복원 */
export async function restoreKeepAwake(): Promise<void> {
  try {
    if ((await AsyncStorage.getItem(AWAKE_KEY)) === '1') {
      await activateKeepAwakeAsync('desk');
    }
  } catch {}
}

/** 저장된 '잠금화면 걸음' 설정을 앱 시작 시 복원 (앱이 포그라운드일 때만 호출) */
export async function restoreLockScreenService(): Promise<void> {
  try {
    if (!StepEngine) return;
    if ((await AsyncStorage.getItem(LOCK_SERVICE_KEY)) === '1' && !StepEngine.isServiceRunning()) {
      StepEngine.startLockScreenService();
    }
  } catch {}
}

const SENSOR_LABEL: Record<string, string> = {
  'android-native': '걸음 칩 직접 연결 (삼성헬스 필요 없음)',
  'ios': '아이폰 센서 (하루 누적)',
  'android-hc': 'Health Connect (하루 누적)',
  'android-live': '기본 센서 (앱 사용 중만)',
  'sim': '데모 모드',
  'none': '연결 안 됨',
};

export function SettingsSheet({
  visible, onClose, backend, profile, onProfileChanged, onLeft, sensorKind, onReconnectSteps,
}: {
  visible: boolean; onClose: () => void;
  backend: Backend; profile: Profile;
  onProfileChanged: (p: Profile) => void;
  onLeft: () => void;
  sensorKind?: string;
  onReconnectSteps?: () => Promise<boolean>;
}) {
  const [nickname, setNickname] = useState(profile.nickname);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [keepAwake, setKeepAwake] = useState(false);
  const [lockService, setLockService] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(AWAKE_KEY).then(v => setKeepAwake(v === '1'));
    try { setLockService(!!StepEngine?.isServiceRunning()); } catch {}
  }, []);

  const toggleLockService = async (v: boolean) => {
    if (!StepEngine) return;
    setLockService(v);
    try {
      if (v) {
        // 알림 권한(안드13+)이 없으면 알림이 안 보이므로 함께 요청
        await StepEngine.requestPermissions().catch(() => null);
        StepEngine.startLockScreenService();
        showToast('이제 앱을 닫아도 잠금화면에서 걸음을 세요 🔒🐾');
      } else {
        StepEngine.stopLockScreenService();
      }
      await AsyncStorage.setItem(LOCK_SERVICE_KEY, v ? '1' : '0');
    } catch {}
  };

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

      {/* 잠금화면 걸음 서비스 (네이티브 걸음 엔진이 있는 빌드에서만) */}
      {StepEngine && (
        <View style={s.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.switchTitle}>잠금화면 걸음 🔒🐾</Text>
            <Text style={s.switchHint}>
              앱을 닫아도 알림으로 오늘 걸음이 잠금화면에 떠요 (캐시워크 방식)
            </Text>
          </View>
          <Switch
            value={lockService}
            onValueChange={v => { void toggleLockService(v); }}
            trackColor={{ true: T.accent, false: '#D9D2C2' }}
            thumbColor="#FFFFFF"
            testID="set-lock-service"
          />
        </View>
      )}

      {/* 걸음 다시 연결 */}
      {onReconnectSteps && (
        <View style={s.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.switchTitle}>걸음 다시 연결하기 👟</Text>
            <Text style={s.switchHint}>
              걸음이 안 잡힐 때 눌러주세요 — 권한 창이 다시 뜹니다
            </Text>
          </View>
          <Button
            label="연결" kind="soft" testID="set-reconnect-steps"
            style={{ paddingVertical: 9, paddingHorizontal: 14 }}
            onPress={async () => {
              const ok = await onReconnectSteps();
              showToast(ok ? '걸음이 연결됐어요! 걸어보세요 🐾' : '연결 실패 — 삼성헬스의 헬스 커넥트 공유 설정을 확인해 주세요');
            }}
          />
        </View>
      )}

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
        {sensorKind ? `  ·  👟 ${SENSOR_LABEL[sensorKind] ?? sensorKind}` : ''}
        {`  ·  잘지냥 v${APP_VERSION}`}
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
