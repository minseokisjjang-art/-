import { StyleSheet, Text, View } from 'react-native';
import { DAY, NIGHT } from './theme';

/* 구름 — 둥근 사각형 두 개로 원본 CSS 구름을 포팅 */
function Cloud({ top, left, small, color }) {
  const w = small ? 52 : 78;
  const h = small ? 15 : 21;
  return (
    <View style={{ position: 'absolute', top, left }}>
      <View style={{ width: w, height: h, borderRadius: h, backgroundColor: color }} />
      <View style={{
        position: 'absolute', top: -h * 0.55, left: w * 0.24,
        width: w * 0.46, height: h * 1.25, borderRadius: h, backgroundColor: color,
      }} />
    </View>
  );
}

/*
 * 마당 장면 — 기존 PWA 잠금화면(#lockscreen)의 하늘/해/울타리/잔디 포팅.
 * night=true면 스탠바이(잠금화면 모드)용 밤 장면이 된다.
 */
export default function Scene({ night = false, children }) {
  const T = night ? NIGHT : DAY;
  return (
    <View style={[st.fill, { backgroundColor: T.sky }]}>
      <View style={[st.skyDeep, { backgroundColor: T.skyDeep }]} />
      {/* 해 / 달 */}
      <View style={[st.sun, { backgroundColor: T.sun }, night && st.moon]} />
      <Cloud top={96} left="12%" color={T.cloud} />
      <Cloud top={150} left="62%" small color={T.cloud} />
      {night && (
        <>
          <Text style={[st.star, { top: 90, left: '28%' }]}>✦</Text>
          <Text style={[st.star, { top: 140, left: '78%' }]}>✧</Text>
          <Text style={[st.star, { top: 60, left: '55%' }]}>✦</Text>
        </>
      )}
      {/* 울타리 */}
      <View style={st.fenceRow} pointerEvents="none">
        {Array.from({ length: 16 }).map((_, i) => (
          <View key={i} style={[st.picket, { backgroundColor: T.fence }]} />
        ))}
      </View>
      <View style={[st.rail, { backgroundColor: T.fence }]} pointerEvents="none" />
      {/* 잔디 */}
      <View style={[st.grass, { backgroundColor: T.grass, borderTopColor: T.grassDeep }]} pointerEvents="none" />
      <Text style={[st.flower, { left: '7%' }]}>🌻</Text>
      <Text style={[st.flower, { right: '7%' }]}>🌻</Text>
      <Text style={[st.flower, { left: '48%', fontSize: 13, bottom: 46 }]}>🌾</Text>
      {children}
    </View>
  );
}

const st = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden' },
  skyDeep: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%',
  },
  sun: {
    position: 'absolute', top: 76, right: '24%',
    width: 46, height: 46, borderRadius: 23,
    shadowColor: '#FFD93D', shadowOpacity: 0.7, shadowRadius: 18, shadowOffset: { width: 0, height: 0 },
  },
  moon: {
    shadowColor: '#F4EBC3',
    borderRadius: 23,
  },
  star: { position: 'absolute', color: '#F4EBC3', fontSize: 12, opacity: 0.9 },
  fenceRow: {
    position: 'absolute', left: 0, right: 0, bottom: 56, height: 34,
    flexDirection: 'row', justifyContent: 'space-evenly',
  },
  picket: { width: 7, height: 34, borderRadius: 3 },
  rail: {
    position: 'absolute', left: 0, right: 0, bottom: 74, height: 5, opacity: 0.9,
  },
  grass: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 58,
    borderTopWidth: 4,
  },
  flower: { position: 'absolute', bottom: 52, fontSize: 17 },
});
