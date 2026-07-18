import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View, ViewStyle,
} from 'react-native';
import { T } from '../theme';
import { Emitter } from '../backend/types';

/* ── 버튼/칩 ─────────────────────────────────────── */

export function Button({
  label, onPress, kind = 'primary', disabled, testID, style,
}: {
  label: string; onPress: () => void;
  kind?: 'primary' | 'ghost' | 'soft'; disabled?: boolean; testID?: string;
  style?: ViewStyle;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, { toValue: 0.96, useNativeDriver: false, speed: 40 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: false, speed: 40 }).start()}
    >
      <Animated.View style={[
        s.btn,
        kind === 'primary' && s.btnPrimary,
        kind === 'ghost' && s.btnGhost,
        kind === 'soft' && s.btnSoft,
        disabled && { opacity: 0.4 },
        { transform: [{ scale }] },
        style,
      ]}>
        <Text style={[
          s.btnText,
          kind === 'primary' && { color: '#FFFFFF' },
          kind === 'ghost' && { color: T.ink },
          kind === 'soft' && { color: T.ink },
        ]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/* ── 바텀시트 ────────────────────────────────────── */

export function Sheet({
  visible, title, onClose, children, testID,
}: {
  visible: boolean; title: string; onClose: () => void;
  children: React.ReactNode; testID?: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet} testID={testID}>
        <View style={s.grip} />
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12} testID={`${testID ?? 'sheet'}-close`}>
            <Text style={s.sheetClose}>✕</Text>
          </Pressable>
        </View>
        <ScrollView
          style={{ maxHeight: 520 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
          <View style={{ height: 8 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ── 진행 바 ─────────────────────────────────────── */

export function ProgressBar({ value, max, color = T.star }: { value: number; max: number; color?: string }) {
  const pct = Math.max(0, Math.min(1, max === 0 ? 0 : value / max));
  return (
    <View style={s.progressTrack}>
      <View style={[s.progressFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

/* ── 토스트 ──────────────────────────────────────── */

const toastBus = new Emitter();
let toastMsg = '';

export function showToast(msg: string) {
  toastMsg = msg;
  toastBus.emit('toast');
}

export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => toastBus.on('toast', () => {
    setMsg(toastMsg);
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: false }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 240, useNativeDriver: false })
        .start(() => setMsg(null));
    }, 1700);
  }), [opacity]);

  if (!msg) return null;
  return (
    <Animated.View pointerEvents="none" style={[s.toast, { opacity }]}>
      <Text style={s.toastText}>{msg}</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  btn: {
    borderRadius: 999, paddingHorizontal: 22, paddingVertical: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: T.ink },
  btnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5, borderColor: T.cardLine,
  },
  btnSoft: { backgroundColor: T.accentSoft },
  btnText: { fontSize: 15, fontWeight: '800' },

  backdrop: { flex: 1, backgroundColor: 'rgba(40,32,25,0.4)' },
  sheet: {
    backgroundColor: T.bg,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 18, paddingBottom: 26, paddingTop: 8,
  },
  grip: {
    alignSelf: 'center', width: 42, height: 5, borderRadius: 3,
    backgroundColor: '#DAD2C2', marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: T.ink },
  sheetClose: { fontSize: 17, color: T.sub, fontWeight: '700', padding: 4 },

  progressTrack: {
    height: 8, borderRadius: 4, backgroundColor: '#EFE7D6', overflow: 'hidden',
  },
  progressFill: { height: 8, borderRadius: 4 },

  toast: {
    position: 'absolute', top: 64, alignSelf: 'center', zIndex: 999,
    backgroundColor: 'rgba(61,51,69,0.94)',
    borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10,
  },
  toastText: { color: '#FFF6E3', fontSize: 13.5, fontWeight: '800' },
});
