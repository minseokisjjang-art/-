import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Easing, Modal, Pressable, StyleSheet, Text, View,
} from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import type { Backend } from '../backend/types';
import type { InventoryEntry, OpenBoxResult, Wallet } from '../types';
import { RARITY_META, T, LINE } from '../theme';
import { BOX_PRICE, BOX_RATES, ITEMS, PITY_AFTER_COMMONS, SLOT_LABEL, itemById } from '../data/items';
import { Button, ProgressBar, Sheet, showToast } from '../components/ui';
import { CatBody } from '../components/CatSvg';
import { DeskProp } from './../components/ItemAssets';

/*
 * 사물함 — 별가루 잔액/오늘 적립 + 낡은 사물함(상자) + 보유 아이템/착용.
 * 확률 상시 표시, 개봉 연출 2초 이내(탭으로 스킵), 도감/수집률 없음.
 */

/* 낡은 사물함 일러스트 */
function LockerArt({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 1.25} viewBox="0 0 64 80">
      <Rect x={6} y={4} width={52} height={72} rx={6} fill="#8FA3B8" stroke={LINE} strokeWidth={2.4} />
      <Rect x={12} y={10} width={40} height={60} rx={4} fill="#A7BACC" stroke={LINE} strokeWidth={1.6} />
      <Line x1={20} y1={20} x2={44} y2={20} stroke={LINE} strokeWidth={2.4} strokeLinecap="round" />
      <Line x1={20} y1={27} x2={44} y2={27} stroke={LINE} strokeWidth={2.4} strokeLinecap="round" />
      <Circle cx={42} cy={46} r={3.4} fill="#5C6B7A" stroke={LINE} strokeWidth={1.4} />
      <Rect x={24} y={56} width={16} height={5} rx={2.5} fill="#7E93A8" />
    </Svg>
  );
}

/* 아이템 미리보기 — 모자/목장식은 미니 고양이에 착용해서 보여준다 */
export function ItemPreview({ itemId, size = 58 }: { itemId: string; size?: number }) {
  const item = itemById(itemId);
  if (!item) return null;
  if (item.slot === 'hat') return <CatBody size={size} hatId={itemId} />;
  if (item.slot === 'neck') return <CatBody size={size} neckId={itemId} />;
  if (item.slot === 'desk') {
    return (
      <View style={{ width: size, height: size * 1.1, alignItems: 'center', justifyContent: 'center' }}>
        <DeskProp id={itemId} size={Math.round(size * 0.52)} />
      </View>
    );
  }
  // effect
  return (
    <View style={{ width: size, height: size * 1.1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.5 }}>{itemId === 'fx_stars' ? '🌟' : '✨'}</Text>
    </View>
  );
}

/* 개봉 연출 — 흔들림 → 팡 → 결과 카드. 탭하면 즉시 결과. */
function RevealModal({
  result, onDone,
}: { result: OpenBoxResult | null; onDone: () => void }) {
  const [phase, setPhase] = useState<'shake' | 'result'>('shake');
  const shake = useRef(new Animated.Value(0)).current;
  const cardIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!result) return;
    setPhase('shake');
    cardIn.setValue(0);
    shake.setValue(0);
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 70, useNativeDriver: false }),
      Animated.timing(shake, { toValue: -1, duration: 70, useNativeDriver: false }),
    ]), { iterations: 6 });
    anim.start();
    const t = setTimeout(() => showResult(), 950);
    return () => { anim.stop(); clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const showResult = () => {
    setPhase('result');
    Animated.spring(cardIn, { toValue: 1, bounciness: 9, useNativeDriver: false }).start();
  };

  if (!result || result.result !== 'ok') return null;
  const meta = RARITY_META[result.rarity ?? 'common'];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDone}>
      <Pressable
        style={rs.backdrop}
        onPress={() => (phase === 'shake' ? showResult() : onDone())}
        testID="reveal-overlay"
      >
        {phase === 'shake' ? (
          <Animated.View style={{
            transform: [{ rotate: shake.interpolate({ inputRange: [-1, 1], outputRange: ['-6deg', '6deg'] }) }],
          }}>
            <LockerArt size={84} />
            <Text style={rs.shakeHint}>덜컹…</Text>
          </Animated.View>
        ) : (
          <Animated.View style={[rs.card, {
            shadowColor: meta.color,
            transform: [
              { scale: cardIn.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
            ],
            opacity: cardIn,
          }]} testID="reveal-card">
            <View style={[rs.glow, { backgroundColor: meta.glow, shadowColor: meta.color }]} />
            <View style={[rs.rarityChip, { backgroundColor: meta.color }]}>
              <Text style={rs.rarityText}>{meta.label}</Text>
            </View>
            <ItemPreview itemId={result.itemId!} size={92} />
            <Text style={rs.itemName}>{result.name}</Text>
            <Text style={rs.itemSlot}>{SLOT_LABEL[result.slot ?? 'hat']}</Text>
            {result.duplicate ? (
              <Text style={rs.dup}>이미 갖고 있어서 별가루 ⭐{result.refund} 돌려받았어요</Text>
            ) : (
              <Text style={rs.newTag}>NEW!</Text>
            )}
            <Text style={rs.tapHint}>탭해서 닫기</Text>
          </Animated.View>
        )}
      </Pressable>
    </Modal>
  );
}

/* ── 사물함 시트 본체 ─────────────────────────────── */

export function LockerSheet({
  visible, onClose, backend,
}: {
  visible: boolean; onClose: () => void; backend: Backend;
}) {
  const [wallet, setWallet] = useState<Wallet>({ balance: 0, earnedToday: 0, dailyCap: 300 });
  const [inv, setInv] = useState<InventoryEntry[]>([]);
  const [reveal, setReveal] = useState<OpenBoxResult | null>(null);
  const [opening, setOpening] = useState(false);

  const refresh = async () => {
    setWallet(await backend.getWallet());
    setInv(await backend.getInventory());
  };

  useEffect(() => {
    if (visible) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    const u1 = backend.on('wallet', () => { void refresh(); });
    const u2 = backend.on('inventory', () => { void refresh(); });
    return () => { u1(); u2(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend]);

  const open = async () => {
    if (opening) return;
    setOpening(true);
    try {
      const r = await backend.openBox();
      if (r.result === 'insufficient') {
        showToast('별가루가 조금 더 필요해요 ⭐');
        return;
      }
      setReveal(r);
    } finally { setOpening(false); }
  };

  const capReached = wallet.earnedToday >= wallet.dailyCap;
  const bySlot = useMemo(() => {
    const owned = new Set(inv.map(i => i.itemId));
    const equipped = new Set(inv.filter(i => i.equipped).map(i => i.itemId));
    return (['hat', 'neck', 'desk', 'effect'] as const).map(slot => ({
      slot,
      items: ITEMS.filter(i => i.slot === slot && owned.has(i.id))
        .map(i => ({ ...i, equipped: equipped.has(i.id) })),
    })).filter(g => g.items.length > 0);
  }, [inv]);

  return (
    <>
      <Sheet visible={visible} title="사물함" onClose={onClose} testID="locker">
        {/* 지갑 */}
        <View style={s.wallet}>
          <View style={s.walletTop}>
            <Text style={s.balance} testID="star-balance">⭐ {wallet.balance.toLocaleString()}</Text>
            <Text style={s.earned}>오늘 ⭐{wallet.earnedToday}/{wallet.dailyCap}</Text>
          </View>
          <ProgressBar value={wallet.earnedToday} max={wallet.dailyCap} />
          <Text style={s.walletHint}>
            {capReached
              ? '오늘은 충분히 모았어요 😺'
              : '걸음 100보 = ⭐10 · 터치 100회 = ⭐5'}
          </Text>
        </View>

        {/* 상자 */}
        <View style={s.boxCard}>
          <LockerArt size={54} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={s.boxTitle}>낡은 사물함</Text>
            <Text style={s.rates}>
              {BOX_RATES.map(r => `${RARITY_META[r.rarity].label} ${r.pct}%`).join(' · ')}
            </Text>
            <Text style={s.pity}>커먼이 {PITY_AFTER_COMMONS}번 연속이면 다음엔 레어 이상이 나와요</Text>
          </View>
          <Button
            label={`⭐${BOX_PRICE} 열기`}
            onPress={open}
            disabled={wallet.balance < BOX_PRICE || opening}
            testID="open-box"
            style={{ paddingHorizontal: 16, paddingVertical: 11 }}
          />
        </View>

        {/* 보유 아이템 */}
        {bySlot.length === 0 ? (
          <View style={s.empty}>
            <Text style={{ fontSize: 30 }}>🎒</Text>
            <Text style={s.emptyText}>아직 아이템이 없어요.{'\n'}걷고 만지면 별가루가 모여요.</Text>
          </View>
        ) : bySlot.map(g => (
          <View key={g.slot} style={{ marginTop: 14 }}>
            <Text style={s.slotLabel}>{SLOT_LABEL[g.slot]}</Text>
            <View style={s.grid}>
              {g.items.map(item => {
                const meta = RARITY_META[item.rarity];
                return (
                  <Pressable
                    key={item.id}
                    style={[s.item, { borderColor: item.equipped ? T.accent : T.cardLine }]}
                    onPress={async () => {
                      if (item.equipped) {
                        await backend.unequip(item.slot);
                        showToast('벗었어요');
                      } else {
                        await backend.equip(item.id);
                        showToast(`${item.name} 착용! 교실에도 바로 보여요`);
                      }
                    }}
                    testID={`item-${item.id}`}
                  >
                    <View style={[s.rarityBar, { backgroundColor: meta.color }]} />
                    <ItemPreview itemId={item.id} size={46} />
                    <Text style={s.itemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={[s.itemState, item.equipped && { color: '#8A5A2B' }]}>
                      {item.equipped ? '착용 중' : meta.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </Sheet>

      <RevealModal result={reveal} onDone={() => setReveal(null)} />
    </>
  );
}

const rs = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(30,24,18,0.78)',
    alignItems: 'center', justifyContent: 'center',
  },
  shakeHint: { color: '#D8CDB8', textAlign: 'center', marginTop: 14, fontSize: 13, fontWeight: '700' },
  card: {
    backgroundColor: T.bg, borderRadius: 24, paddingVertical: 26, paddingHorizontal: 34,
    alignItems: 'center', gap: 6, minWidth: 240, overflow: 'hidden',
    shadowOpacity: 0.9, shadowRadius: 30, shadowOffset: { width: 0, height: 0 },
  },
  glow: {
    position: 'absolute', top: 52, alignSelf: 'center',
    width: 150, height: 150, borderRadius: 75, opacity: 0.55,
    shadowOpacity: 0.8, shadowRadius: 40, shadowOffset: { width: 0, height: 0 },
  },
  rarityChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 6 },
  rarityText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  itemName: { fontSize: 19, fontWeight: '900', color: T.ink, marginTop: 4 },
  itemSlot: { fontSize: 12.5, color: T.sub, fontWeight: '700' },
  newTag: { fontSize: 13, fontWeight: '900', color: T.accent, marginTop: 4, letterSpacing: 1 },
  dup: { fontSize: 12.5, color: T.sub, marginTop: 4, textAlign: 'center' },
  tapHint: { fontSize: 11.5, color: '#B9B09D', marginTop: 12 },
});

const s = StyleSheet.create({
  wallet: {
    backgroundColor: T.card, borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth, borderColor: T.cardLine,
    padding: 14, gap: 8, marginBottom: 10,
  },
  walletTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  balance: { fontSize: 22, fontWeight: '900', color: '#B8860B', fontVariant: ['tabular-nums'] },
  earned: { fontSize: 12.5, fontWeight: '700', color: T.sub, fontVariant: ['tabular-nums'] },
  walletHint: { fontSize: 11.5, color: T.sub },
  boxCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: T.card, borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth, borderColor: T.cardLine,
    padding: 14,
  },
  boxTitle: { fontSize: 15.5, fontWeight: '800', color: T.ink },
  rates: { fontSize: 11, color: T.sub, fontWeight: '700' },
  pity: { fontSize: 10.5, color: '#B4AC9C' },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 26 },
  emptyText: { fontSize: 13, color: T.sub, textAlign: 'center', lineHeight: 20 },
  slotLabel: { fontSize: 12.5, fontWeight: '800', color: T.sub, marginBottom: 7 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  item: {
    width: '31%', alignItems: 'center', gap: 3,
    backgroundColor: T.card, borderRadius: 14, borderWidth: 2,
    paddingTop: 10, paddingBottom: 8, overflow: 'hidden',
  },
  rarityBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
  itemName: { fontSize: 11.5, fontWeight: '800', color: T.ink, paddingHorizontal: 4 },
  itemState: { fontSize: 10.5, fontWeight: '700', color: T.sub },
});
