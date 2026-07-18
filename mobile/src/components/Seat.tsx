import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import type { Member } from '../types';
import { abbreviate } from '../types';
import { CAT_COLORS, LINE, T, rand } from '../theme';
import { itemById } from '../data/items';
import { CatBody } from './CatSvg';
import { DeskProp } from './ItemAssets';

/*
 * 교실 좌석 — 카운터 배지 + 고양이(상태 애니메이션) + 책상(소품) + 이름표.
 * 상태별 연출:
 *  - walking: 힘찬 바운스 + 좌우 기울기 (제자리 달리기)
 *  - active:  앞발 교대 필기 + 이따금 ✏️ 반짝
 *  - idle:    눈 감고 느린 숨쉬기 + 💤
 *  - private: 커튼 친 창문
 */

const useLoop = (running: boolean, build: (v: Animated.Value) => Animated.CompositeAnimation) => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!running) { v.setValue(0); return; }
    const anim = Animated.loop(build(v));
    anim.start();
    return () => { anim.stop(); v.setValue(0); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);
  return v;
};

/* ── 하트 버스트 (쓰다듬) ────────────────────────── */

function HeartBurst({ trigger, small }: { trigger: number; small?: boolean }) {
  const [seeds, setSeeds] = useState<{ id: number; dx: number; delay: number }[]>([]);
  useEffect(() => {
    if (!trigger) return;
    const n = small ? 1 : 5;
    setSeeds(Array.from({ length: n }, (_, i) => ({
      id: trigger * 10 + i, dx: rand(-26, 26), delay: i * 70,
    })));
    const t = setTimeout(() => setSeeds([]), 1100);
    return () => clearTimeout(t);
  }, [trigger, small]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {seeds.map(sd => <Heart key={sd.id} dx={sd.dx} delay={sd.delay} />)}
    </View>
  );
}

function Heart({ dx, delay }: { dx: number; delay: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1, duration: 850, delay,
      easing: Easing.out(Easing.quad), useNativeDriver: false,
    }).start();
  }, [v, delay]);
  return (
    <Animated.Text style={{
      position: 'absolute', left: '50%', top: 26, fontSize: 15,
      transform: [
        { translateX: dx },
        { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -46] }) },
        { scale: v.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.4, 1.15, 0.9] }) },
      ],
      opacity: v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
    }}>💗</Animated.Text>
  );
}

/* ── 이펙트: 별 흩날림 / 연필 반짝임 ─────────────── */

function StarRain({ running }: { running: boolean }) {
  const v = useLoop(running, vv => Animated.timing(vv, {
    toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: false,
  }));
  if (!running) return null;
  const stars = [
    { left: 6, d: 0.0, ch: '✦' }, { left: 74, d: 0.35, ch: '⭐' },
    { left: 30, d: 0.55, ch: '✧' }, { left: 56, d: 0.8, ch: '✦' },
  ];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {stars.map((st, i) => {
        const p = v.interpolate({
          inputRange: [0, 1], outputRange: [0 - st.d, 1 - st.d], extrapolate: 'extend',
        });
        const mod = Animated.modulo(Animated.add(p, 1), 1);
        return (
          <Animated.Text key={i} style={{
            position: 'absolute', left: st.left, top: -6,
            fontSize: i % 2 ? 11 : 13, color: '#F0B429',
            transform: [{ translateY: Animated.multiply(mod, 78) }],
            opacity: Animated.multiply(
              mod.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] }), 0.9,
            ),
          }}>{st.ch}</Animated.Text>
        );
      })}
    </View>
  );
}

function PencilSparkle({ running }: { running: boolean }) {
  const v = useLoop(running, vv => Animated.sequence([
    Animated.timing(vv, { toValue: 1, duration: 500, useNativeDriver: false }),
    Animated.timing(vv, { toValue: 0, duration: 500, useNativeDriver: false }),
    Animated.delay(600),
  ]));
  if (!running) return null;
  return (
    <Animated.Text pointerEvents="none" style={{
      position: 'absolute', right: 8, bottom: 30, fontSize: 12,
      opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.1] }) }],
    }}>✨</Animated.Text>
  );
}

/* ── 커튼 친 창문 (상태 비공개) ──────────────────── */

export function Curtain({ size = 84 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 84 84" testID="curtain">
      <Rect x={8} y={8} width={68} height={68} rx={8} fill="#EAF3FA" stroke={T.boardFrame} strokeWidth={4} />
      <Rect x={6} y={4} width={72} height={7} rx={3.5} fill={T.boardFrame} />
      {/* 커튼 두 쪽 */}
      <Path d="M12 11 q10 30 0 65 L12 76 L40 76 Q30 42 40 11 z" fill={T.curtain} stroke={LINE} strokeWidth={1.6} />
      <Path d="M72 11 q-10 30 0 65 L72 76 L44 76 Q54 42 44 11 z" fill={T.curtain} stroke={LINE} strokeWidth={1.6} />
      <Path d="M40 11 Q31 42 40 76 M44 11 Q53 42 44 76" fill="none" stroke={T.curtainDark} strokeWidth={1.4} opacity={0.7} />
    </Svg>
  );
}

/* ── 카운터 배지 (머리 위, 톡톡 올라가는 연출) ───── */

function CounterBadge({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const pop = useRef(new Animated.Value(1)).current;
  const target = useRef(value);

  useEffect(() => {
    target.current = value;
    if (value === shown) return;
    // 톡톡 올라가는 카운트업
    const iv = setInterval(() => {
      setShown(prev => {
        const diff = target.current - prev;
        if (diff <= 0) { clearInterval(iv); return target.current; }
        const step = Math.max(1, Math.ceil(diff / 6));
        return prev + step;
      });
    }, 90);
    Animated.sequence([
      Animated.timing(pop, { toValue: 1.18, duration: 110, useNativeDriver: false }),
      Animated.spring(pop, { toValue: 1, bounciness: 10, useNativeDriver: false }),
    ]).start();
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Animated.View style={[st.counter, { transform: [{ scale: pop }] }]}>
      <Text style={st.counterText}>{abbreviate(shown)}</Text>
    </Animated.View>
  );
}

/* ── 좌석 셀 ─────────────────────────────────────── */

export function SeatCell({
  member, onPat, patFeedback, receivedPatPulse, hiddenFromFriends,
}: {
  member: Member;
  onPat?: (id: string) => void;          // 친구 좌석만
  patFeedback?: 'ok' | 'cooldown' | null;
  receivedPatPulse?: number;             // 내 좌석: 쓰다듬 받았을 때 연출
  hiddenFromFriends?: boolean;           // 내 좌석: 상태 비공개 중 표시
}) {
  const [pawFrame, setPawFrame] = useState<0 | 1>(0);
  const [burst, setBurst] = useState(0);
  const [smallBurst, setSmallBurst] = useState(0);
  const jumpY = useRef(new Animated.Value(0)).current;

  const state = member.state;
  const walking = state === 'walking';
  const active = state === 'active';
  const sleeping = state === 'idle';

  /* 필기 앞발 교대 */
  useEffect(() => {
    if (!active) return;
    const iv = setInterval(() => setPawFrame(f => (f === 0 ? 1 : 0)), 240);
    return () => clearInterval(iv);
  }, [active]);

  /* 달리기 바운스 */
  const run = useLoop(walking, v => Animated.sequence([
    Animated.timing(v, { toValue: 1, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: false }),
    Animated.timing(v, { toValue: 0, duration: 150, easing: Easing.in(Easing.quad), useNativeDriver: false }),
  ]));
  /* 잠 숨쉬기 */
  const breathe = useLoop(sleeping, v => Animated.sequence([
    Animated.timing(v, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
    Animated.timing(v, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
  ]));
  /* 💤 */
  const zzz = useLoop(sleeping, v => Animated.timing(v, {
    toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: false,
  }));

  /* 내 고양이가 쓰다듬 받았을 때 */
  useEffect(() => {
    if (receivedPatPulse) setBurst(b => b + 1);
  }, [receivedPatPulse]);

  /* 쓰다듬 결과 연출 */
  useEffect(() => {
    if (patFeedback === 'ok') setBurst(b => b + 1);
    if (patFeedback === 'cooldown') setSmallBurst(b => b + 1);
  }, [patFeedback]);

  const tap = () => {
    Animated.sequence([
      Animated.timing(jumpY, { toValue: -12, duration: 120, useNativeDriver: false }),
      Animated.spring(jumpY, { toValue: 0, bounciness: 12, useNativeDriver: false }),
    ]).start();
    if (!member.isMe && onPat) onPat(member.id);
  };

  const equippedItems = member.equipped
    .map(id => itemById(id))
    .filter((i): i is NonNullable<typeof i> => !!i);
  const hatId = equippedItems.find(i => i.slot === 'hat')?.id ?? null;
  const neckId = equippedItems.find(i => i.slot === 'neck')?.id ?? null;
  const deskId = equippedItems.find(i => i.slot === 'desk')?.id ?? null;
  const fxId = equippedItems.find(i => i.slot === 'effect')?.id ?? null;

  const isPrivate = state === 'private';

  return (
    <View style={st.cell} testID={`seat-${member.isMe ? 'me' : member.id}`}>
      {/* 카운터 */}
      <View style={st.counterRow}>
        {!isPrivate && member.totalCount !== null
          ? <CounterBadge value={member.totalCount} />
          : <View style={{ height: 22 }} />}
      </View>

      {/* 고양이 or 커튼 */}
      <Pressable onPress={tap} disabled={isPrivate} testID={`cat-${member.isMe ? 'me' : member.id}`}>
        <View style={st.catBox}>
          {isPrivate ? (
            <View testID="curtain-view"><Curtain size={86} /></View>
          ) : (
            <Animated.View style={{
              transform: [
                { translateY: Animated.add(jumpY, walking
                  ? run.interpolate({ inputRange: [0, 1], outputRange: [0, -9] })
                  : new Animated.Value(0)) },
                { rotate: walking
                  ? run.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '3deg'] })
                  : '0deg' },
                { scale: sleeping
                  ? breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] })
                  : 1 },
              ],
            }}>
              <CatBody
                size={92}
                color={member.catColor}
                mood={sleeping ? 'sleep' : 'open'}
                pawUp={active ? pawFrame : null}
                hatId={hatId}
                neckId={neckId}
              />
            </Animated.View>
          )}
          {/* 상태 부속 연출 */}
          {sleeping && !isPrivate && (
            <Animated.Text style={[st.zzz, {
              opacity: zzz.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateY: zzz.interpolate({ inputRange: [0, 1], outputRange: [4, -12] }) },
                { translateX: zzz.interpolate({ inputRange: [0, 1], outputRange: [0, 6] }) },
              ],
            }]}>💤</Animated.Text>
          )}
          {walking && !isPrivate && <Text style={st.dust}>💨</Text>}
          {fxId === 'fx_stars' && (walking || active) && !isPrivate && <StarRain running />}
          {fxId === 'fx_sparkle' && active && !isPrivate && <PencilSparkle running />}
          <HeartBurst trigger={burst} />
          <HeartBurst trigger={smallBurst} small />
          {hiddenFromFriends && (
            <View style={st.hiddenChip} testID="me-hidden">
              <Text style={st.hiddenChipText}>🔒 친구에겐 커튼</Text>
            </View>
          )}
        </View>
      </Pressable>

      {/* 책상 */}
      <View style={st.desk}>
        <View style={st.deskTop}>
          {deskId && <View style={st.deskProp}><DeskProp id={deskId} /></View>}
          {active && !isPrivate && <Text style={st.deskPencil}>📝</Text>}
        </View>
        <View style={st.deskFront} />
      </View>

      {/* 이름표 */}
      <View style={[st.namePlate, member.isMe && st.namePlateMe]}>
        <Text style={[st.nameText, member.isMe && st.nameTextMe]} numberOfLines={1}>
          {member.isMe ? `${member.nickname} (나)` : member.nickname}
          {member.isDemo ? ' ·데모' : ''}
        </Text>
      </View>
    </View>
  );
}

/* ── 빈 책상 (초대 유도) ─────────────────────────── */

export function EmptySeat({ onInvite, showCta }: { onInvite: () => void; showCta: boolean }) {
  if (!showCta) {
    return (
      <View style={[st.cell, { opacity: 0.5 }]}>
        <View style={{ height: 22 }} />
        <View style={[st.catBox, { opacity: 0 }]} />
        <View style={st.desk}>
          <View style={st.deskTop} />
          <View style={st.deskFront} />
        </View>
        <View style={{ height: 24 }} />
      </View>
    );
  }
  return (
    <Pressable style={st.cell} onPress={onInvite} testID="empty-seat-invite">
      <View style={{ height: 22 }} />
      <View style={[st.catBox, st.inviteBox]}>
        <Text style={{ fontSize: 26 }}>🐾</Text>
        <Text style={st.inviteText}>친구를{'\n'}초대해보세요</Text>
      </View>
      <View style={st.desk}>
        <View style={[st.deskTop, { opacity: 0.55 }]} />
        <View style={[st.deskFront, { opacity: 0.55 }]} />
      </View>
      <View style={[st.namePlate, { backgroundColor: 'transparent' }]}>
        <Text style={[st.nameText, { color: T.sub }]}>코드 복사 📋</Text>
      </View>
    </Pressable>
  );
}

/* ── 선생님 NPC (혼자일 때) ──────────────────────── */

export function TeacherSeat() {
  const sway = useLoop(true, v => Animated.sequence([
    Animated.timing(v, { toValue: 1, duration: 2100, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
    Animated.timing(v, { toValue: 0, duration: 2100, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
  ]));
  return (
    <View style={st.teacherWrap} testID="teacher-npc">
      <Animated.View style={{
        transform: [{ rotate: sway.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '2deg'] }) }],
      }}>
        <CatBody size={86} color="cream" glasses neckId="neck_bowtie" />
      </Animated.View>
      <View style={st.podium}>
        <View style={st.podiumTop}><Text style={{ fontSize: 14 }}>📖</Text></View>
        <View style={st.podiumFront} />
      </View>
      <View style={st.namePlate}>
        <Text style={st.nameText}>선생님</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  cell: { width: '50%', alignItems: 'center', paddingVertical: 6 },
  counterRow: { height: 24, justifyContent: 'flex-end', marginBottom: 1 },
  counter: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2.5,
    borderWidth: StyleSheet.hairlineWidth, borderColor: T.cardLine,
  },
  counterText: {
    fontSize: 11, fontWeight: '800', color: T.ink,
    fontVariant: ['tabular-nums'],
  },
  catBox: {
    width: 104, height: 104, alignItems: 'center', justifyContent: 'flex-end',
  },
  zzz: { position: 'absolute', top: 6, right: 8, fontSize: 15 },
  hiddenChip: {
    position: 'absolute', top: 2, alignSelf: 'center',
    backgroundColor: 'rgba(61,51,69,0.85)', borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 2.5,
  },
  hiddenChipText: { color: '#FFF6E3', fontSize: 9.5, fontWeight: '800' },
  dust: { position: 'absolute', bottom: 8, left: -2, fontSize: 13, opacity: 0.7 },

  desk: { width: 118, marginTop: -16 },
  deskTop: {
    height: 15, borderRadius: 5, backgroundColor: T.deskTop,
    borderWidth: 1.5, borderColor: 'rgba(74,50,34,0.5)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  deskProp: { marginTop: -14 },
  deskPencil: { fontSize: 11, marginTop: -12 },
  deskFront: {
    height: 22, marginHorizontal: 7, backgroundColor: T.deskFront,
    borderBottomLeftRadius: 5, borderBottomRightRadius: 5,
  },

  namePlate: {
    marginTop: 5, backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 999, paddingHorizontal: 11, paddingVertical: 3,
    maxWidth: 130,
  },
  namePlateMe: { backgroundColor: T.accentSoft, borderWidth: 1, borderColor: T.accent },
  nameText: { fontSize: 12, fontWeight: '700', color: T.ink },
  nameTextMe: { color: '#8A5A2B' },

  inviteBox: {
    width: 96, height: 96, borderRadius: 18,
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#D9CDB4',
    alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  inviteText: { fontSize: 12, fontWeight: '700', color: T.sub, textAlign: 'center', lineHeight: 17 },

  teacherWrap: { alignItems: 'center', marginBottom: 4 },
  podium: { width: 96, marginTop: -14 },
  podiumTop: {
    height: 14, borderRadius: 4, backgroundColor: '#9A6A38',
    borderWidth: 1.5, borderColor: 'rgba(74,50,34,0.5)',
    alignItems: 'center',
  },
  podiumFront: {
    height: 30, marginHorizontal: 5, backgroundColor: '#7C5128',
    borderBottomLeftRadius: 4, borderBottomRightRadius: 4,
  },
});
