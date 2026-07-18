import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path } from 'react-native-svg';
import { CAT_COLORS, LINE } from '../theme';
import { HatFragment, NeckFragment } from './ItemAssets';

/*
 * 고양이 본체 — 봉고캣 실루엣.
 * mood:  'open'(평상) | 'happy'(반쯤 감은 행복) | 'sleep'(잠)
 * pawUp: null(양발 내림) | 0 | 1 — 필기 시 좌우 앞발 교대
 * hatId/neckId: 착용 아이템 (SVG 좌표계 안에서 렌더 → 머리에 정확히 붙음)
 * glasses: 선생님 NPC용 안경
 */

export interface CatBodyProps {
  size?: number;
  color?: string;              // CAT_COLORS 키
  mood?: 'open' | 'happy' | 'sleep';
  pawUp?: 0 | 1 | null;
  hatId?: string | null;
  neckId?: string | null;
  glasses?: boolean;
}

export function CatBody({
  size = 96, color = 'cream', mood = 'open', pawUp = null,
  hatId = null, neckId = null, glasses = false,
}: CatBodyProps) {
  const c = CAT_COLORS[color] ?? CAT_COLORS.cream;
  const eyesOpen = mood === 'open';
  // 모자가 위로 튀어나갈 수 있어 viewBox 위 여백 확보
  return (
    <Svg width={size} height={size * (132 / 120)} viewBox="0 -28 120 132">
      {/* 꼬리 */}
      <Path d="M100 82 q20 -4 16 -26" fill="none" stroke={c.fur} strokeWidth={9} strokeLinecap="round" />
      <Path d="M100 82 q20 -4 16 -26" fill="none" stroke={LINE} strokeWidth={1.6} strokeLinecap="round" opacity={0.35} />
      {/* 귀 */}
      <Path d="M26 34 L34 6 L54 22 Z" fill={c.fur} stroke={LINE} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M94 34 L86 6 L66 22 Z" fill={c.fur} stroke={LINE} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M33 28 L37 13 L48 22 Z" fill="#FFB3C1" opacity={0.8} />
      <Path d="M87 28 L83 13 L72 22 Z" fill="#FFB3C1" opacity={0.8} />
      {/* 몸통 */}
      <Ellipse cx={60} cy={62} rx={44} ry={38} fill={c.fur} stroke={LINE} strokeWidth={2} />
      {/* 배 */}
      <Ellipse cx={60} cy={80} rx={25} ry={16} fill={c.belly} opacity={0.55} />
      {/* 눈 */}
      {eyesOpen ? (
        <G fill={LINE}>
          <Circle cx={45} cy={52} r={4} />
          <Circle cx={75} cy={52} r={4} />
        </G>
      ) : (
        <G stroke={LINE} strokeWidth={3} strokeLinecap="round" fill="none">
          <Path d="M39 53 q6 -7 12 0" />
          <Path d="M69 53 q6 -7 12 0" />
        </G>
      )}
      {/* 안경 (선생님) */}
      {glasses && (
        <G stroke={LINE} strokeWidth={2} fill="rgba(255,255,255,0.55)">
          <Circle cx={45} cy={52} r={8.5} />
          <Circle cx={75} cy={52} r={8.5} />
          <Line x1={53.5} y1={52} x2={66.5} y2={52} />
        </G>
      )}
      {/* 코 + ω 입 */}
      <Circle cx={60} cy={60} r={2.6} fill="#E8899E" />
      <Path d="M54 66 q3 4.5 6 0 q3 4.5 6 0" stroke={LINE} strokeWidth={2.4} strokeLinecap="round" fill="none" />
      {/* 수염 */}
      <G stroke={LINE} strokeWidth={1.4} opacity={0.45} strokeLinecap="round">
        <Line x1={24} y1={58} x2={8} y2={54} />
        <Line x1={24} y1={63} x2={8} y2={64} />
        <Line x1={96} y1={58} x2={112} y2={54} />
        <Line x1={96} y1={63} x2={112} y2={64} />
      </G>
      {/* 목 장식 (앞발보다 뒤) */}
      {neckId ? <NeckFragment id={neckId} /> : null}
      {/* 앞발 — 필기 시 교대로 든다 */}
      <G transform={pawUp === 0 ? 'translate(0,-11)' : undefined}>
        <Ellipse cx={44} cy={94} rx={9} ry={6.5} fill={c.fur} stroke={LINE} strokeWidth={2} />
      </G>
      <G transform={pawUp === 1 ? 'translate(0,-11)' : undefined}>
        <Ellipse cx={76} cy={94} rx={9} ry={6.5} fill={c.fur} stroke={LINE} strokeWidth={2} />
      </G>
      {/* 모자 (맨 위) */}
      {hatId ? <HatFragment id={hatId} /> : null}
    </Svg>
  );
}
