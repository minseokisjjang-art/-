import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { CAT } from './theme';

/*
 * 고양이 SVG — 기존 PWA의 햄스터 SVG(js/app.js catSVG)를 고양이로 개조해 포팅.
 * mood:  'open'(평상) | 'happy'(반응) | 'sleep'(낮잠)
 * pawUp: null(양발 내림) | 0 | 1  — 봉고 연주 시 좌우 앞발을 번갈아 든다
 */
export function CatBody({ size = 120, mood = 'open', pawUp = null }) {
  const eyesOpen = mood === 'open';
  return (
    <Svg width={size} height={size * (104 / 120)} viewBox="0 0 120 104">
      {/* 꼬리 */}
      <Path
        d="M100 82 q20 -4 16 -26" fill="none"
        stroke={CAT.fur} strokeWidth="9" strokeLinecap="round"
      />
      <Path
        d="M100 82 q20 -4 16 -26" fill="none"
        stroke={CAT.line} strokeWidth="1.6" strokeLinecap="round" opacity="0.35"
      />
      {/* 귀 (뾰족) */}
      <Path d="M26 34 L34 6 L54 22 Z" fill={CAT.fur} stroke={CAT.line} strokeWidth="2" strokeLinejoin="round" />
      <Path d="M94 34 L86 6 L66 22 Z" fill={CAT.fur} stroke={CAT.line} strokeWidth="2" strokeLinejoin="round" />
      <Path d="M33 28 L37 13 L48 22 Z" fill={CAT.innerEar} opacity="0.8" />
      <Path d="M87 28 L83 13 L72 22 Z" fill={CAT.innerEar} opacity="0.8" />
      {/* 몸통(머리 겸용, 봉고캣 실루엣) */}
      <Ellipse cx="60" cy="62" rx="44" ry="38" fill={CAT.fur} stroke={CAT.line} strokeWidth="2" />
      {/* 배 */}
      <Ellipse cx="60" cy="80" rx="25" ry="16" fill="#FFFFFF" opacity="0.5" />
      {/* 눈 */}
      {eyesOpen ? (
        <G fill={CAT.line}>
          <Circle cx="45" cy="52" r="4" />
          <Circle cx="75" cy="52" r="4" />
        </G>
      ) : (
        <G stroke={CAT.line} strokeWidth="3" strokeLinecap="round" fill="none">
          <Path d="M39 53 q6 -7 12 0" />
          <Path d="M69 53 q6 -7 12 0" />
        </G>
      )}
      {/* 코 + ω 입 */}
      <Circle cx="60" cy="60" r="2.6" fill={CAT.nose} />
      <Path
        d="M54 66 q3 4.5 6 0 q3 4.5 6 0"
        stroke={CAT.line} strokeWidth="2.4" strokeLinecap="round" fill="none"
      />
      {/* 수염 */}
      <G stroke={CAT.line} strokeWidth="1.4" opacity="0.45" strokeLinecap="round">
        <Line x1="24" y1="58" x2="8" y2="54" />
        <Line x1="24" y1="63" x2="8" y2="64" />
        <Line x1="96" y1="58" x2="112" y2="54" />
        <Line x1="96" y1="63" x2="112" y2="64" />
      </G>
      {/* 앞발 — 봉고 연주 시 번갈아 든다 */}
      <G transform={pawUp === 0 ? 'translate(0,-11)' : undefined}>
        <Ellipse cx="44" cy="94" rx="9" ry="6.5" fill={CAT.fur} stroke={CAT.line} strokeWidth="2" />
      </G>
      <G transform={pawUp === 1 ? 'translate(0,-11)' : undefined}>
        <Ellipse cx="76" cy="94" rx="9" ry="6.5" fill={CAT.fur} stroke={CAT.line} strokeWidth="2" />
      </G>
    </Svg>
  );
}

/* 노트북 소품 — 원본 PWA에서 그대로 포팅. 타이핑(봉고) 중에만 보인다 */
export function Laptop({ width = 66 }) {
  return (
    <Svg width={width} height={width * (42 / 64)} viewBox="0 0 64 42">
      <Rect x="12" y="2" width="40" height="26" rx="3" fill="#3d3345" />
      <Rect x="15" y="5" width="34" height="20" rx="2" fill="#9be7ff" opacity="0.9" />
      <Rect x="17" y="8" width="18" height="2.5" rx="1" fill="#5aa9c9" />
      <Rect x="17" y="13" width="26" height="2.5" rx="1" fill="#5aa9c9" />
      <Rect x="17" y="18" width="22" height="2.5" rx="1" fill="#5aa9c9" />
      <Rect x="4" y="28" width="56" height="9" rx="3" fill="#6b7280" />
      <Rect x="9" y="30.5" width="46" height="4" rx="2" fill="#4b5563" />
    </Svg>
  );
}
