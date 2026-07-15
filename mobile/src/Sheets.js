import { useState } from 'react';
import {
  Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { FURS, HATS, relTime } from './data';

/* 하단 시트 공통 틀 — PWA의 바텀시트를 계승 */
function Sheet({ visible, title, onClose, children }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.grip} />
        <View style={s.header}>
          <Text style={s.title}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10}><Text style={s.close}>✕</Text></Pressable>
        </View>
        <ScrollView style={{ maxHeight: 440 }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ── 🎨 꾸미기 (모자/털색 + 대사) ────────────────── */

export function DressSheet({
  visible, onClose, stardust, owned, equipped, onBuy, onEquip, lines, onChangeLines,
}) {
  const [msg, setMsg] = useState(null);

  const press = (kind, item) => {
    const has = owned[kind].includes(item.id) || item.price === 0;
    if (has) {
      onEquip(kind, item.id);
      return;
    }
    if (!onBuy(kind, item)) {
      setMsg(`별가루가 부족해요 (${item.price}⭐ 필요)`);
      setTimeout(() => setMsg(null), 1600);
    }
  };

  const Item = ({ kind, item, swatch }) => {
    const has = owned[kind].includes(item.id) || item.price === 0;
    const on = equipped[kind === 'hats' ? 'hat' : 'fur'] === item.id;
    return (
      <Pressable style={[s.item, on && s.itemOn]} onPress={() => press(kind, item)}>
        {swatch
          ? <View style={[s.swatch, { backgroundColor: item.color }]} />
          : <Text style={s.itemEmoji}>{item.emoji}</Text>}
        <Text style={s.itemName}>{item.name}</Text>
        <Text style={[s.itemPrice, has && s.itemHave]}>
          {on ? '착용 중' : has ? '보유' : `${item.price} ⭐`}
        </Text>
      </Pressable>
    );
  };

  const setLine = (i, patch) =>
    onChangeLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  return (
    <Sheet visible={visible} title="꾸미기" onClose={onClose}>
      <View style={s.balanceRow}>
        <Text style={s.balance} testID="stardust-balance">⭐ {stardust.toLocaleString()}</Text>
        <Text style={s.balanceHint}>1,000포인트마다 별가루 10</Text>
      </View>
      {msg && <Text style={s.warn}>{msg}</Text>}

      <Text style={s.section}>🎩 모자 — 탭해서 구매/착용, 다시 탭하면 벗어요</Text>
      <View style={s.grid}>
        {HATS.map(h => <Item key={h.id} kind="hats" item={h} />)}
      </View>

      <Text style={s.section}>🎨 털색</Text>
      <View style={s.grid}>
        {FURS.map(f => <Item key={f.id} kind="furs" item={f} swatch />)}
      </View>

      <Text style={s.section}>💬 대사 — 8초마다 설정한 확률(%)로 말해요</Text>
      {lines.map((l, i) => (
        <View key={l.id} style={s.lineRow}>
          <TextInput
            style={s.lineInput}
            value={l.text}
            placeholder="대사 입력…"
            placeholderTextColor="#9aa5b1"
            onChangeText={t => setLine(i, { text: t })}
            testID={`line-text-${i}`}
          />
          <Pressable
            style={s.step} hitSlop={6} testID={`line-dec-${i}`}
            onPress={() => setLine(i, { p: Math.max(0, l.p - 5) })}
          ><Text style={s.stepText}>−</Text></Pressable>
          <Text style={s.prob}>{l.p}%</Text>
          <Pressable
            style={s.step} hitSlop={6} testID={`line-inc-${i}`}
            onPress={() => setLine(i, { p: Math.min(95, l.p + 5) })}
          ><Text style={s.stepText}>＋</Text></Pressable>
          <Pressable
            hitSlop={8} testID={`line-del-${i}`}
            onPress={() => onChangeLines(lines.filter((_, idx) => idx !== i))}
          ><Text style={s.del}>🗑</Text></Pressable>
        </View>
      ))}
      <Pressable
        style={s.addLine} testID="line-add"
        onPress={() => onChangeLines([...lines, { id: 'l' + Date.now(), text: '', p: 20 }])}
      >
        <Text style={s.addLineText}>＋ 대사 추가</Text>
      </Pressable>
    </Sheet>
  );
}

/* ── 💗 쓰다듬 기록 (나만 보기) ──────────────────── */

export function PetsSheet({ visible, onClose, log }) {
  return (
    <Sheet visible={visible} title="쓰다듬 기록" onClose={onClose}>
      <Text style={s.hint}>🔒 이 기록은 나만 볼 수 있어요</Text>
      {log.length === 0 && (
        <Text style={s.empty}>아직 아무도 쓰다듬지 않았어요.{'\n'}친구들이 놀러 오면 여기에 남아요 🐾</Text>
      )}
      {log.map((e, i) => (
        <View key={i} style={s.petRow}>
          <Text style={s.petText}>
            💗 <Text style={s.petName}>{e.name}</Text>님이 내 고양이를 쓰다듬었어요
            {e.demo ? <Text style={s.demoTag}>  데모</Text> : null}
          </Text>
          <Text style={s.petTime}>{relTime(e.t)}</Text>
        </View>
      ))}
    </Sheet>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: '#FDFBF6',
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: 16, paddingBottom: 30,
  },
  grip: {
    alignSelf: 'center', width: 40, height: 5, borderRadius: 3,
    backgroundColor: '#D9D4C8', marginBottom: 10,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 17, fontWeight: '800', color: '#3D3345' },
  close: { fontSize: 16, color: '#8a94a6', fontWeight: '700', padding: 4 },
  hint: { fontSize: 12.5, color: '#8a94a6', lineHeight: 18, marginBottom: 10 },

  balanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 6 },
  balance: { fontSize: 20, fontWeight: '800', color: '#B8860B', fontVariant: ['tabular-nums'] },
  balanceHint: { fontSize: 11.5, color: '#8a94a6' },
  warn: { fontSize: 12.5, color: '#C0392B', fontWeight: '700', marginBottom: 6 },
  section: { fontSize: 13, fontWeight: '700', color: '#7a8494', marginTop: 12, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  item: {
    width: '31%', alignItems: 'center', gap: 3,
    backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 10,
    borderWidth: 1.5, borderColor: '#EEEAE0',
  },
  itemOn: { borderColor: '#E8A93C', backgroundColor: '#FFF9EC' },
  itemEmoji: { fontSize: 26 },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)' },
  itemName: { fontSize: 12, fontWeight: '700', color: '#3D3345' },
  itemPrice: { fontSize: 11, fontWeight: '700', color: '#B8860B' },
  itemHave: { color: '#5B8A5E' },

  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  lineInput: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10,
    borderWidth: 1, borderColor: '#EEEAE0',
    paddingHorizontal: 10, paddingVertical: 7, fontSize: 14, color: '#3D3345',
  },
  step: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#EFEBE1',
    alignItems: 'center', justifyContent: 'center',
  },
  stepText: { fontSize: 15, fontWeight: '800', color: '#3D3345', lineHeight: 18 },
  prob: { width: 40, textAlign: 'center', fontSize: 13, fontWeight: '800', color: '#3D3345', fontVariant: ['tabular-nums'] },
  del: { fontSize: 15, opacity: 0.7 },
  addLine: {
    marginTop: 4, alignSelf: 'flex-start',
    backgroundColor: '#EFEBE1', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7,
  },
  addLineText: { fontSize: 13, fontWeight: '700', color: '#3D3345' },

  empty: { fontSize: 13.5, color: '#8a94a6', textAlign: 'center', lineHeight: 21, paddingVertical: 18 },
  petRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8E4D9',
  },
  petText: { fontSize: 13.5, color: '#3D3345', flexShrink: 1 },
  petName: { fontWeight: '800' },
  petTime: { fontSize: 11.5, color: '#9aa5b1', marginLeft: 8 },
  demoTag: { fontSize: 11, color: '#B4AC9C', fontWeight: '700' },
});
