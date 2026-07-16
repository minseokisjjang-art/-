import { StyleSheet, Text, View } from 'react-native';
import { DAY, NIGHT } from './theme';
import { POINT_UNIT, STARDUST_PER_UNIT } from './data';

/* 책상 — 교탁(큰 것)과 학생 책상(작은 것) 공용. 고양이가 뒤에 서면 앉은 것처럼 보인다 */
function Desk({ left, w, T, paper }) {
  return (
    <View style={{ position: 'absolute', bottom: 34, left, width: w }} pointerEvents="none">
      {paper && (
        <>
          <View style={{
            position: 'absolute', top: -7, left: w * 0.28,
            width: 26, height: 17, borderRadius: 2, backgroundColor: '#FFFFFF',
            transform: [{ rotate: '-7deg' }], zIndex: 2,
          }} />
          <Text style={{ position: 'absolute', top: -15, left: w * 0.56, fontSize: 13, zIndex: 2 }}>✏️</Text>
        </>
      )}
      <View style={{ height: 13, borderRadius: 4, backgroundColor: T.deskTop }} />
      <View style={{
        height: 32, marginHorizontal: 7, backgroundColor: T.deskBody,
        borderBottomLeftRadius: 4, borderBottomRightRadius: 4,
      }} />
    </View>
  );
}

/*
 * 교실 장면 — 칠판(시계 + 점수판) / 나무 바닥 / 교탁 / 학생 책상.
 * rows: [{ id, name, score, me, active }] — 점수판 칸. active면 ▲ 표시.
 * desks: { teacher: {left,w}, students: [{left,w}, …] }
 * night=true면 스탠바이(잠금화면 모드)용 소등 교실.
 */
export default function Scene({ night = false, time, dateStr, subline, rows = [], desks, children }) {
  const T = night ? NIGHT : DAY;
  return (
    <View style={[st.fill, { backgroundColor: T.wall }]}>
      {/* 칠판 — 낮에는 시계를 한 줄로 강등해 점수판이 주인공, 밤(스탠바이)에는 시계가 주인공 */}
      <View style={[st.board, { backgroundColor: T.boardBg, borderColor: T.boardFrame }]}>
        {night ? (
          <>
            <Text style={[st.boardTimeBig, { color: T.chalk }]}>{time}</Text>
            <Text style={[st.boardDate, { color: T.chalk }]}>{dateStr}</Text>
          </>
        ) : (
          <Text style={[st.boardHeader, { color: T.chalk }]}>{time} · {dateStr}</Text>
        )}
        {subline && <Text style={[st.boardSub, { color: T.chalk }]}>{subline}</Text>}
        <View style={[st.boardLine, { backgroundColor: T.chalk }]} />
        <Text style={[st.boardTitle, { color: T.chalk }]}>
          점수 = 걸음 👟 ＋ 상호작용 💗 · {POINT_UNIT.toLocaleString()}점 → ⭐{STARDUST_PER_UNIT}
        </Text>
        {rows.map(r => (
          <View key={r.id} style={st.row}>
            <Text style={[st.rowName, { color: T.chalk }]} numberOfLines={1}>
              {r.me ? '★ ' : ''}{r.name}
              {r.state ? <Text style={st.rowState}>  {r.state}</Text> : null}
            </Text>
            <Text style={[st.rowScore, { color: T.chalk }]} testID={`score-${r.id}`}>
              {r.score.toLocaleString()}<Text style={st.rowUp}>{r.active ? ' ▲' : '   '}</Text>
            </Text>
          </View>
        ))}
      </View>
      {/* 나무 바닥 */}
      <View style={[st.floor, { backgroundColor: T.floor }]} pointerEvents="none">
        {[28, 56, 84].map(p => (
          <View key={p} style={[st.plank, { bottom: `${p}%`, backgroundColor: T.floorLine }]} />
        ))}
      </View>
      <Text style={st.plant}>🪴</Text>

      {/* 고양이들 (책상 뒤 레이어) */}
      {children}

      {/* 책상 — 고양이보다 앞에 그려서 앉은 모습을 만든다 */}
      {desks && <Desk left={desks.teacher.left} w={desks.teacher.w} T={T} paper />}
      {desks && desks.students.map((d, i) => (
        <Desk key={i} left={d.left} w={d.w} T={T} />
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden' },
  board: {
    position: 'absolute', top: 54, alignSelf: 'center', width: '88%',
    borderWidth: 9, borderRadius: 10, padding: 12, paddingTop: 8,
  },
  boardHeader: {
    fontSize: 19, fontWeight: '800', letterSpacing: 0.5,
    textAlign: 'center', fontVariant: ['tabular-nums'], marginTop: 2,
  },
  boardTimeBig: {
    fontSize: 62, fontWeight: '800', letterSpacing: 2,
    textAlign: 'center', fontVariant: ['tabular-nums'],
  },
  boardDate: { fontSize: 13, fontWeight: '600', textAlign: 'center', opacity: 0.75, marginTop: -2 },
  boardSub: {
    fontSize: 15, fontWeight: '700', textAlign: 'center', opacity: 0.9,
    marginTop: 4, fontVariant: ['tabular-nums'],
  },
  boardLine: { height: 1, opacity: 0.25, marginVertical: 8 },
  boardTitle: { fontSize: 11.5, fontWeight: '700', opacity: 0.7, marginBottom: 5, letterSpacing: 0.5 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    paddingVertical: 2.5,
  },
  rowName: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  rowState: { fontSize: 13 },
  rowScore: { fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  rowUp: { fontSize: 12, color: '#A8E6B0' },
  floor: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: '56%',
  },
  plank: { position: 'absolute', left: 0, right: 0, height: 2 },
  plant: { position: 'absolute', bottom: 4, right: 8, fontSize: 26 },
});
