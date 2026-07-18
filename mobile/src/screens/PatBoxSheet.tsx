import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PatEntry } from '../types';
import { T } from '../theme';
import { Sheet } from '../components/ui';

/* 기척함 — 받은 쓰다듬 보관함 (최근 7일). 답장 버튼 없음, 그냥 보는 화면. */

export function PatBoxSheet({
  visible, onClose, pats,
}: {
  visible: boolean; onClose: () => void; pats: PatEntry[];
}) {
  // 날짜 라벨로 묶기
  const groups: { day: string; entries: PatEntry[] }[] = [];
  for (const p of pats) {
    const g = groups.find(x => x.day === p.dayLabel);
    if (g) g.entries.push(p);
    else groups.push({ day: p.dayLabel, entries: [p] });
  }

  return (
    <Sheet visible={visible} title="기척함" onClose={onClose} testID="patbox">
      <Text style={s.hint}>💗 누가 내 고양이를 쓰다듬고 갔는지, 나만 볼 수 있어요</Text>

      {pats.length === 0 && (
        <View style={s.empty}>
          <Text style={{ fontSize: 34 }}>🐾</Text>
          <Text style={s.emptyText}>
            아직 기척이 없어요.{'\n'}친구들이 다녀가면 여기에 남아요.
          </Text>
        </View>
      )}

      {groups.map(g => (
        <View key={g.day} style={s.group}>
          <Text style={s.day}>{g.day}</Text>
          {g.entries.map(p => (
            <View key={p.id} style={s.row}>
              <Text style={s.rowHeart}>💗</Text>
              <Text style={s.rowText}>
                <Text style={s.rowName}>{p.fromNickname}</Text>
                {p.isDemo ? <Text style={s.demo}> ·데모</Text> : null}
                님이 {p.bucket} 쓰다듬고 갔어요
              </Text>
            </View>
          ))}
        </View>
      ))}
    </Sheet>
  );
}

const s = StyleSheet.create({
  hint: { fontSize: 12.5, color: T.sub, marginBottom: 14, lineHeight: 18 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 30 },
  emptyText: { fontSize: 13.5, color: T.sub, textAlign: 'center', lineHeight: 21 },
  group: { marginBottom: 12 },
  day: { fontSize: 12, fontWeight: '800', color: T.sub, marginBottom: 6, letterSpacing: 0.4 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: T.card, borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth, borderColor: T.cardLine,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 6,
  },
  rowHeart: { fontSize: 16 },
  rowText: { fontSize: 13.5, color: T.ink, flexShrink: 1, lineHeight: 19 },
  rowName: { fontWeight: '800' },
  demo: { color: '#B4AC9C', fontSize: 11.5, fontWeight: '700' },
});
