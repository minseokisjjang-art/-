import React from 'react';
import { Text } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { LINE } from '../theme';

/*
 * 아이템 에셋 — 모자/목 장식은 고양이 SVG(viewBox 0 0 120 104) 좌표계의 조각으로 그려
 * 머리·목에 정확히 붙는다. 책상 소품은 책상 위에 놓이는 독립 렌더러.
 */

/* ── 모자 (머리 y≈0..20, 중심 x=60) ─────────────── */

export function HatFragment({ id }: { id: string }) {
  switch (id) {
    case 'hat_straw': // 밀짚모자
      return (
        <G>
          <Ellipse cx={60} cy={16} rx={30} ry={7} fill="#E9C877" stroke={LINE} strokeWidth={1.8} />
          <Path d="M42 15 a18 13 0 0 1 36 0 z" fill="#F0D48C" stroke={LINE} strokeWidth={1.8} />
          <Rect x={42.5} y={9} width={35} height={4.5} fill="#D9534F" />
        </G>
      );
    case 'hat_cap': // 야구모자
      return (
        <G>
          <Path d="M40 16 a20 14 0 0 1 40 0 z" fill="#4D8ED6" stroke={LINE} strokeWidth={1.8} />
          <Ellipse cx={87} cy={15.5} rx={12} ry={4} fill="#3D77B8" stroke={LINE} strokeWidth={1.6} />
          <Circle cx={60} cy={4} r={2.6} fill="#3D77B8" stroke={LINE} strokeWidth={1.2} />
        </G>
      );
    case 'hat_paper': // 종이배 모자
      return (
        <G>
          <Path d="M38 16 L52 2 L60 10 L68 2 L82 16 z" fill="#FFFFFF" stroke={LINE} strokeWidth={1.8} />
          <Path d="M38 16 L82 16 L74 21 L46 21 z" fill="#EDEAE2" stroke={LINE} strokeWidth={1.8} />
        </G>
      );
    case 'hat_beret': // 베레모
      return (
        <G>
          <Path d="M38 14 q4 -14 24 -13 q20 1 20 12 q-6 5 -22 5 q-16 0 -22 -4 z"
            fill="#D6708B" stroke={LINE} strokeWidth={1.8} />
          <Line x1={60} y1={1} x2={60} y2={-3} stroke={LINE} strokeWidth={2.2} strokeLinecap="round" />
        </G>
      );
    case 'hat_beanie': // 털모자
      return (
        <G>
          <Path d="M41 16 a19 15 0 0 1 38 0 z" fill="#7BAE7F" stroke={LINE} strokeWidth={1.8} />
          <Rect x={40} y={12.5} width={40} height={6} rx={3} fill="#95C599" stroke={LINE} strokeWidth={1.4} />
          <Circle cx={60} cy={0} r={4.5} fill="#F3EEE2" stroke={LINE} strokeWidth={1.4} />
        </G>
      );
    case 'hat_wizard': // 마법사 모자
      return (
        <G>
          <Ellipse cx={60} cy={16} rx={26} ry={6} fill="#5C4BB8" stroke={LINE} strokeWidth={1.8} />
          <Path d="M46 14 Q57 -20 66 -24 Q64 -8 74 13 z" fill="#6D5BD0" stroke={LINE} strokeWidth={1.8} />
          <Path d="M63 -8 l1.7 3.4 3.7 .4 -2.7 2.5 .7 3.6 -3.4 -1.8 -3.2 1.8 .6 -3.6 -2.7 -2.5 3.7 -.4 z"
            fill="#FFD43B" />
        </G>
      );
    case 'hat_crown': // 반짝이는 왕관 (레전더리)
      return (
        <G>
          <Path d="M42 17 L44 2 L52 11 L60 -2 L68 11 L76 2 L78 17 z"
            fill="#FFD43B" stroke={LINE} strokeWidth={1.8} strokeLinejoin="round" />
          <Rect x={42} y={15} width={36} height={5} rx={2} fill="#F0B429" stroke={LINE} strokeWidth={1.4} />
          <Circle cx={52} cy={13} r={2} fill="#E64980" />
          <Circle cx={60} cy={12} r={2.2} fill="#4DABF7" />
          <Circle cx={68} cy={13} r={2} fill="#51CF66" />
        </G>
      );
    default:
      return null;
  }
}

/* ── 목 장식 (턱 아래 y≈72, 중심 x=60) ───────────── */

export function NeckFragment({ id }: { id: string }) {
  switch (id) {
    case 'neck_ribbon': // 빨간 리본
      return (
        <G>
          <Path d="M60 76 L46 68 Q43 76 46 84 z" fill="#E4574B" stroke={LINE} strokeWidth={1.6} />
          <Path d="M60 76 L74 68 Q77 76 74 84 z" fill="#E4574B" stroke={LINE} strokeWidth={1.6} />
          <Circle cx={60} cy={76} r={4} fill="#C0392B" stroke={LINE} strokeWidth={1.4} />
        </G>
      );
    case 'neck_bell': // 방울 목걸이
      return (
        <G>
          <Path d="M40 72 Q60 82 80 72" fill="none" stroke="#B0413E" strokeWidth={3.4} strokeLinecap="round" />
          <Circle cx={60} cy={80} r={5} fill="#FFD43B" stroke={LINE} strokeWidth={1.5} />
          <Line x1={60} y1={80} x2={60} y2={84} stroke={LINE} strokeWidth={1.4} />
        </G>
      );
    case 'neck_scarf_y': // 노란 손수건
      return (
        <G>
          <Path d="M42 71 Q60 80 78 71 L60 92 z" fill="#F2CE4B" stroke={LINE} strokeWidth={1.6} strokeLinejoin="round" />
        </G>
      );
    case 'neck_muffler': // 체크 목도리
      return (
        <G>
          <Path d="M38 70 Q60 82 82 70 L82 78 Q60 90 38 78 z" fill="#C25B4E" stroke={LINE} strokeWidth={1.6} />
          <Rect x={64} y={76} width={9} height={16} rx={2} fill="#C25B4E" stroke={LINE} strokeWidth={1.6} />
          <Line x1={46} y1={72.5} x2={46} y2={80.5} stroke="#E8B54B" strokeWidth={2.4} />
          <Line x1={56} y1={74.5} x2={56} y2={82.5} stroke="#E8B54B" strokeWidth={2.4} />
          <Line x1={68.5} y1={78} x2={68.5} y2={91} stroke="#E8B54B" strokeWidth={2.4} />
        </G>
      );
    case 'neck_star': // 별 목걸이
      return (
        <G>
          <Path d="M42 72 Q60 81 78 72" fill="none" stroke="#8A6FC2" strokeWidth={2.6} strokeLinecap="round" />
          <Path d="M60 78 l2 4 4.4 .5 -3.2 3 .8 4.3 -4 -2.1 -4 2.1 .8 -4.3 -3.2 -3 4.4 -.5 z"
            fill="#FFD43B" stroke={LINE} strokeWidth={1.2} />
        </G>
      );
    case 'neck_bowtie': // 나비넥타이 카라
      return (
        <G>
          <Path d="M44 70 Q60 79 76 70 L76 76 Q60 85 44 76 z" fill="#FFFFFF" stroke={LINE} strokeWidth={1.6} />
          <Path d="M60 79 L48 73 Q46 79 48 85 z" fill="#3D3345" />
          <Path d="M60 79 L72 73 Q74 79 72 85 z" fill="#3D3345" />
          <Circle cx={60} cy={79} r={3} fill="#5C5470" />
        </G>
      );
    default:
      return null;
  }
}

/* ── 책상 소품 (책상 위 독립 렌더) ────────────────── */

export function DeskProp({ id, size = 17 }: { id: string; size?: number }) {
  const emojiMap: Record<string, string> = {
    desk_pencil: '✏️',
    desk_apple: '🍎',
    desk_plant: '🪴',
    desk_bento: '🍱',
    desk_gameboy: '🎮',
    desk_laptop: '💻',
  };
  if (emojiMap[id]) {
    return <Text style={{ fontSize: size, lineHeight: size + 3 }}>{emojiMap[id]}</Text>;
  }
  if (id === 'desk_mug') {
    return (
      <Svg width={size} height={size} viewBox="0 0 20 20">
        <Rect x={3} y={5} width={11} height={12} rx={2.5} fill="#F3EEE2" stroke={LINE} strokeWidth={1.4} />
        <Path d="M14 8 a3.4 3.4 0 0 1 0 7" fill="none" stroke={LINE} strokeWidth={1.4} />
        <Path d="M6 3 q1 -2 2 0 M10 3 q1 -2 2 0" fill="none" stroke="#B8AFA0" strokeWidth={1.1} strokeLinecap="round" />
      </Svg>
    );
  }
  if (id === 'desk_eraser') {
    return (
      <Svg width={size} height={size} viewBox="0 0 20 20">
        <Rect x={2} y={7} width={16} height={8} rx={2} fill="#F5A8B8" stroke={LINE} strokeWidth={1.4} />
        <Rect x={2} y={7} width={6.5} height={8} rx={2} fill="#7FA8D9" stroke={LINE} strokeWidth={1.4} />
      </Svg>
    );
  }
  if (id === 'desk_fishbowl') {
    return (
      <Svg width={size + 2} height={size + 2} viewBox="0 0 22 22">
        <Path d="M4 8 a8 8 0 1 0 14 0 q-2 -2 -7 -2 t-7 2" fill="rgba(150,205,235,0.75)" stroke={LINE} strokeWidth={1.4} />
        <Path d="M8 13 q2.4 -2.6 5 0 q-2.4 2.6 -5 0 z" fill="#F08C42" />
        <Path d="M13 13 l2.6 -1.8 v3.6 z" fill="#F08C42" />
        <Circle cx={9.4} cy={12.6} r={0.6} fill={LINE} />
      </Svg>
    );
  }
  return null;
}
