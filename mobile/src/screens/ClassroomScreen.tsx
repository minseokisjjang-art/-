import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import type { Backend } from '../backend/types';
import type { Activity } from '../activity/useActivity';
import type { Member, PatEntry, Profile } from '../types';
import { T } from '../theme';
import { EmptySeat, SeatCell } from '../components/Seat';
import { showToast } from '../components/ui';
import { PatBoxSheet } from './PatBoxSheet';
import { SettingsSheet } from './SettingsSheet';
import { LockerSheet } from './LockerSheet';

/*
 * 교실 — 메인 화면 (앱의 90%).
 * 칠판 헤더 + 좌석 그리드(최대 8) + 하단 바(기척함/사물함/설정).
 * 혼자면 선생님 NPC, 빈 자리 하나는 초대 유도.
 */

const STATE_LABEL: Record<string, string> = {
  active: '필기 중 ✏️', walking: '뛰는 중 👟', idle: '자는 중 💤', private: '',
};

export function ClassroomScreen({
  backend, activity, profile, onProfileChanged, onLeftClassroom,
}: {
  backend: Backend;
  activity: Activity;
  profile: Profile;
  onProfileChanged: (p: Profile) => void;
  onLeftClassroom: () => void;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [pats, setPats] = useState<PatEntry[]>([]);
  const [unread, setUnread] = useState(0);
  const [sheet, setSheet] = useState<'pats' | 'locker' | 'settings' | null>(null);
  const [patFeedback, setPatFeedback] = useState<Record<string, 'ok' | 'cooldown' | null>>({});
  const [receivedPulse, setReceivedPulse] = useState(0);
  const seenPatIds = useRef<Set<string>>(new Set());
  const firstPatsLoad = useRef(true);

  const refreshSnapshot = useCallback(async () => {
    const snap = await backend.getSnapshot();
    setCode(snap.code);
    // 내 상태는 로컬 판정이 가장 신선하다
    setMembers(snap.members.map(m =>
      m.isMe && m.state !== 'private' ? { ...m, state: activity.myState } : m,
    ));
  }, [backend, activity.myState]);

  /* 내 카운터 = 서버 총계 + 아직 서버에 안 보낸 세션 활동 (터치 즉시 반응) */
  const withLiveCounter = (m: Member): Member =>
    m.isMe && m.totalCount !== null
      ? { ...m, totalCount: m.totalCount + activity.pendingLive }
      : m;

  const refreshPats = useCallback(async (countUnread: boolean) => {
    const list = await backend.getPats();
    setPats(list);
    if (firstPatsLoad.current) {
      // 첫 로드는 전부 읽음 처리 (앱 켤 때마다 배지가 쌓여 보이는 것 방지)
      list.forEach(p => seenPatIds.current.add(p.id));
      firstPatsLoad.current = false;
      return;
    }
    if (countUnread) {
      let fresh = 0;
      for (const p of list) {
        if (!seenPatIds.current.has(p.id)) { seenPatIds.current.add(p.id); fresh += 1; }
      }
      if (fresh > 0) {
        setUnread(u => u + fresh);
        setReceivedPulse(x => x + 1);
        if (Platform.OS !== 'web') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
      }
    }
  }, [backend]);

  useEffect(() => {
    void refreshSnapshot();
    void refreshPats(false);
    const u1 = backend.on('members', () => { void refreshSnapshot(); });
    const u2 = backend.on('pats', () => { void refreshPats(true); });
    const iv = setInterval(() => { void refreshSnapshot(); }, 30 * 1000); // 실시간 이벤트 유실 대비 폴백
    return () => { u1(); u2(); clearInterval(iv); };
  }, [backend, refreshSnapshot, refreshPats]);

  /* 내 상태가 바뀌면 내 좌석 즉시 갱신 */
  useEffect(() => {
    setMembers(ms => ms.map(m =>
      m.isMe && m.state !== 'private' ? { ...m, state: activity.myState } : m,
    ));
  }, [activity.myState]);

  const copyCode = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    showToast('초대코드를 복사했어요 📋');
  };

  const pat = async (id: string) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    const r = await backend.sendPat(id);
    setPatFeedback(f => ({ ...f, [id]: null }));
    requestAnimationFrame(() =>
      setPatFeedback(f => ({ ...f, [id]: r === 'ok' ? 'ok' : 'cooldown' })),
    );
  };

  const openPats = () => { setSheet('pats'); setUnread(0); };

  const me = members.find(m => m.isMe);
  const seats: (Member | 'invite' | 'empty')[] = [...members];
  while (seats.length < 8) seats.push(seats.length === members.length ? 'invite' : 'empty');

  const isSim = activity.providerKind === 'sim' && backend.kind === 'local';

  return (
    <View style={s.root}>
      {/* 칠판 헤더 */}
      <View style={s.headerWrap}>
        <View style={s.board}>
          <Text style={s.boardTitle}>🐾 잘지냥</Text>
          <Text style={s.boardSub}>
            {me ? `나는 지금 ${STATE_LABEL[me.state] || '잘 지내는 중'}` : '오늘도 잘 지내는 중'}
          </Text>
        </View>
        <Pressable style={s.codeChip} onPress={copyCode} testID="code-chip">
          <Text style={s.codeChipLabel}>초대코드</Text>
          <Text style={s.codeChipText}>{code ?? '------'} 📋</Text>
        </Pressable>
      </View>

      {/* 데모 패널 (웹/센서 없음 + 로컬 모드에서만) */}
      {isSim && (
        <View style={s.demoRow}>
          <DemoChip label="＋500 걸음" testID="demo-steps" onPress={() => activity.addSimSteps(500)} />
          <DemoChip label="＋100 터치" testID="demo-touch" onPress={() => activity.addSimTouches(100)} />
          <DemoChip label="⭐＋500" testID="demo-stars" onPress={() => backend.demo?.grantStars(500)} />
          <DemoChip label="친구 입장" testID="demo-friends" onPress={() => backend.demo?.addFriends()} />
          <DemoChip label="쓰다듬 받기" testID="demo-pat" onPress={() => backend.demo?.receivePat()} />
        </View>
      )}

      {/* 교실 */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.floorPad} showsVerticalScrollIndicator={false}>
        {/* 나무 바닥 패널 — 책상들이 허공에 뜨지 않게 접지 */}
        <View style={s.floorPanel}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={[s.plank, { top: 96 + i * 118 }]} />
          ))}
          <View style={s.grid}>
            {seats.map((seat, i) => {
              if (seat === 'invite') return <EmptySeat key={`e${i}`} onInvite={copyCode} showCta />;
              if (seat === 'empty') return <EmptySeat key={`e${i}`} onInvite={copyCode} showCta={false} />;
              return (
                <SeatCell
                  key={seat.id}
                  member={withLiveCounter(seat)}
                  onPat={seat.isMe ? undefined : pat}
                  patFeedback={seat.isMe ? null : patFeedback[seat.id]}
                  receivedPatPulse={seat.isMe ? receivedPulse : undefined}
                  hiddenFromFriends={seat.isMe && !profile.shareStatus}
                />
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* 하단 바 */}
      <View style={s.tabbar}>
        <TabButton emoji="💗" label="기척함" onPress={openPats} badge={unread} testID="tab-pats" />
        <TabButton emoji="🎒" label="사물함" onPress={() => setSheet('locker')} testID="tab-locker" />
        <TabButton emoji="⚙️" label="설정" onPress={() => setSheet('settings')} testID="tab-settings" />
      </View>

      {/* 시트 */}
      <PatBoxSheet visible={sheet === 'pats'} onClose={() => setSheet(null)} pats={pats} />
      <LockerSheet visible={sheet === 'locker'} onClose={() => setSheet(null)} backend={backend} />
      <SettingsSheet
        visible={sheet === 'settings'}
        onClose={() => setSheet(null)}
        backend={backend}
        profile={profile}
        onProfileChanged={onProfileChanged}
        onLeft={() => { setSheet(null); onLeftClassroom(); }}
        sensorKind={activity.providerKind}
        onReconnectSteps={activity.reconnectSteps}
      />
    </View>
  );
}

function DemoChip({ label, onPress, testID }: { label: string; onPress: () => void; testID: string }) {
  return (
    <Pressable style={s.demoChip} onPress={onPress} testID={testID}>
      <Text style={s.demoChipText}>{label}</Text>
    </Pressable>
  );
}

function TabButton({
  emoji, label, onPress, badge, testID,
}: { emoji: string; label: string; onPress: () => void; badge?: number; testID: string }) {
  return (
    <Pressable style={s.tab} onPress={onPress} testID={testID}>
      <View>
        <Text style={s.tabEmoji}>{emoji}</Text>
        {!!badge && badge > 0 && (
          <View style={s.badge} testID={`${testID}-badge`}>
            <Text style={s.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={s.tabLabel}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.wall },
  headerWrap: {
    paddingTop: Platform.OS === 'web' ? 18 : 54,
    paddingHorizontal: 16, paddingBottom: 6,
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  },
  board: {
    flex: 1, backgroundColor: T.boardBg,
    borderWidth: 6, borderColor: T.boardFrame, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  boardTitle: { color: T.chalk, fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  boardSub: { color: T.chalk, fontSize: 11.5, fontWeight: '600', opacity: 0.8, marginTop: 2 },
  codeChip: {
    backgroundColor: T.card, borderRadius: 12,
    borderWidth: 1.5, borderColor: T.cardLine,
    paddingHorizontal: 11, paddingVertical: 7, alignItems: 'center',
  },
  codeChipLabel: { fontSize: 9.5, fontWeight: '700', color: T.sub },
  codeChipText: { fontSize: 13, fontWeight: '900', color: T.ink, letterSpacing: 1.5, marginTop: 1 },

  demoRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    paddingHorizontal: 16, paddingVertical: 4,
  },
  demoChip: {
    borderWidth: 1, borderStyle: 'dashed', borderColor: '#C9C2B2',
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
  },
  demoChipText: { fontSize: 11, fontWeight: '700', color: T.sub },

  floorPad: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 96 },
  floorPanel: {
    backgroundColor: 'rgba(201,153,94,0.18)',
    borderRadius: 26, paddingTop: 8, paddingBottom: 4,
    overflow: 'hidden',
  },
  plank: {
    position: 'absolute', left: 8, right: 8, height: 2,
    backgroundColor: 'rgba(122,79,38,0.08)', borderRadius: 1,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },

  tabbar: {
    position: 'absolute', left: 14, right: 14, bottom: 16,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, borderColor: T.cardLine,
    paddingVertical: 9,
    shadowColor: '#3A2E20', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  tab: { flex: 1, alignItems: 'center', gap: 1 },
  tabEmoji: { fontSize: 20 },
  tabLabel: { fontSize: 10.5, fontWeight: '800', color: T.ink },
  badge: {
    position: 'absolute', top: -4, right: -12,
    backgroundColor: '#E4574B', minWidth: 17, height: 17, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  badgeText: { color: '#FFF', fontSize: 9.5, fontWeight: '900' },
});
