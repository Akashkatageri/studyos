import React from 'react';

export interface DuoAvatarConfig {
  skinTone: number;
  hairStyle: number;
  hairColor: number;
  expression: number;
  glasses: number;
  clothing: number;
  clothingColor: number;
  background: number;
}

export const DEFAULT_AVATAR_CONFIG: DuoAvatarConfig = {
  skinTone: 1,
  hairStyle: 0,
  hairColor: 0,
  expression: 0,
  glasses: 0,
  clothing: 0,
  clothingColor: 1,
  background: 0,
};

// StudyOS Palette Definitions
export const SKIN_TONES = [
  '#F5D0A9', // Fair
  '#FFCDB2', // Peach
  '#E0A96D', // Golden Sand
  '#C68642', // Warm Bronze
  '#8D5524', // Deep Chestnut
  '#4A2E16', // Ebony
];

export const HAIR_COLORS = [
  '#1C1C1E', // Charcoal Black
  '#4A3728', // Dark Brown
  '#8B4513', // Chestnut Brown
  '#D4A373', // Golden Blonde
  '#E76F51', // Auburn Red
  '#9D4EDD', // Cyber Purple
  '#3A86FF', // Electric Blue
  '#6C757D', // Silver Grey
];

export const CLOTHING_COLORS = [
  '#1C242C', // Obsidian Dark
  '#845EC2', // Royal Purple
  '#6C5CE7', // Electric Indigo
  '#1CB0F6', // Cyber Blue
  '#F4B400', // Gold XP
  '#FF5E7E', // Vibrant Coral
  '#2ECC71', // Emerald Green
  '#E0E6ED', // Pure White
];

export const BACKGROUND_COLORS = [
  '#845EC2', // Royal Purple
  '#6C5CE7', // Electric Indigo
  '#1CB0F6', // Cyber Blue
  '#F4B400', // Gold XP
  '#0C0F17', // Deep Obsidian
  '#FF5E7E', // Vibrant Coral
];

export const EXPRESSION_NAMES = ['Happy', 'Focused', 'Confident', 'Curious', 'Excited'];
export const GLASSES_NAMES = ['None', 'Round', 'Square', 'Sunglasses', 'Gold Wire'];
export const CLOTHING_NAMES = ['Turtleneck', 'Hoodie', 'T-Shirt', 'Jacket', 'Sweater'];
export const HAIRSTYLE_NAMES = [
  'Short Sweep',
  'Buzz Cut',
  'Wavy Side',
  'Curly Top',
  'Bob Cut',
  'Spiky Hair',
  'Clean Bald',
  'Long Waves',
  'High Ponytail',
  'Space Buns',
  'Side Braid',
  'Pixie Cut',
  'Curly Shoulder',
  'Straight Long',
];

/** Compact string format: d:st.hs.hc.ex.gl.cl.cc.bg */
export function encodeAvatarConfig(config: DuoAvatarConfig): string {
  const { skinTone, hairStyle, hairColor, expression, glasses, clothing, clothingColor, background } = config;
  return `d:${skinTone}.${hairStyle}.${hairColor}.${expression}.${glasses}.${clothing}.${clothingColor}.${background}`;
}

export function parseAvatarConfig(str: string | undefined | null): DuoAvatarConfig | null {
  if (!str || typeof str !== 'string' || !str.startsWith('d:')) return null;
  try {
    const parts = str.slice(2).split('.').map(n => parseInt(n, 10));
    if (parts.length < 8 || parts.some(isNaN)) return null;
    return {
      skinTone: Math.max(0, Math.min(SKIN_TONES.length - 1, parts[0])),
      hairStyle: Math.max(0, Math.min(HAIRSTYLE_NAMES.length - 1, parts[1])),
      hairColor: Math.max(0, Math.min(HAIR_COLORS.length - 1, parts[2])),
      expression: Math.max(0, Math.min(EXPRESSION_NAMES.length - 1, parts[3])),
      glasses: Math.max(0, Math.min(GLASSES_NAMES.length - 1, parts[4])),
      clothing: Math.max(0, Math.min(CLOTHING_NAMES.length - 1, parts[5])),
      clothingColor: Math.max(0, Math.min(CLOTHING_COLORS.length - 1, parts[6])),
      background: Math.max(0, Math.min(BACKGROUND_COLORS.length - 1, parts[7])),
    };
  } catch {
    return null;
  }
}

interface DuoAvatarSvgProps {
  config: DuoAvatarConfig;
  className?: string;
  size?: number;
  showBackground?: boolean;
}

export function DuoAvatarSvg({
  config,
  className = '',
  size,
  showBackground = true,
}: DuoAvatarSvgProps) {
  const skin = SKIN_TONES[config.skinTone] || SKIN_TONES[1];
  const hair = HAIR_COLORS[config.hairColor] || HAIR_COLORS[0];
  const cloth = CLOTHING_COLORS[config.clothingColor] || CLOTHING_COLORS[1];
  const bg = BACKGROUND_COLORS[config.background] || BACKGROUND_COLORS[0];

  const svgStyle: React.CSSProperties = {};
  if (size) {
    svgStyle.width = `${size}px`;
    svgStyle.height = `${size}px`;
  }

  return (
    <svg
      viewBox="0 0 200 200"
      style={svgStyle}
      preserveAspectRatio="xMidYMid slice"
      className={`select-none overflow-hidden ${!size && !className.includes('w-') ? 'w-full h-full' : ''} ${className}`}
    >
      {/* BACKGROUND */}
      {showBackground && (
        <rect x="0" y="0" width="200" height="200" fill={bg} />
      )}

      {/* LONG HAIR BACK LAYER */}
      {(config.hairStyle === 7 || config.hairStyle === 13) && (
        <g fill={hair}>
          <path d="M 44 48 C 44 20, 80 18, 100 18 C 120 18, 156 20, 156 48 L 162 135 Q 164 150 148 152 Q 138 140 144 110 L 146 58 C 146 42, 120 38, 100 38 C 80 38, 54 42, 54 58 L 56 110 Q 62 140 52 152 Q 36 150 38 135 Z" />
        </g>
      )}

      {/* CLOTHING & BODY */}
      <g id="body-clothing">
        {/* Torso Base */}
        <path
          d="M 45 160 C 45 140, 65 135, 100 135 C 135 135, 155 140, 155 160 L 165 220 L 35 220 Z"
          fill={cloth}
        />

        {/* Clothing Collar / Details */}
        {config.clothing === 0 && (
          /* Turtleneck Collar */
          <path
            d="M 75 125 L 125 125 L 120 148 L 80 148 Z"
            fill={cloth}
            stroke="rgba(0,0,0,0.15)"
            strokeWidth="2"
          />
        )}
        {config.clothing === 1 && (
          /* Hoodie Strings & V-Neck */
          <g>
            <path d="M 85 135 L 100 158 L 115 135" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinecap="round" />
            <circle cx="85" cy="162" r="3" fill="#FFF" />
            <circle cx="115" cy="162" r="3" fill="#FFF" />
          </g>
        )}
        {config.clothing === 2 && (
          /* T-Shirt Round Neck */
          <path d="M 82 135 C 82 148, 118 148, 118 135" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="3" />
        )}
        {config.clothing === 3 && (
          /* Jacket Zipper & Collar */
          <g>
            <path d="M 70 135 L 85 160 L 100 220" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
            <path d="M 130 135 L 115 160 L 100 220" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
            <line x1="100" y1="160" x2="100" y2="220" stroke="#F4B400" strokeWidth="2" />
          </g>
        )}
        {config.clothing === 4 && (
          /* Sweater Collar Crease */
          <path d="M 80 135 Q 100 145 120 135" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="4" strokeLinecap="round" />
        )}
      </g>

      {/* NECK */}
      <rect x="84" y="112" width="32" height="30" rx="8" fill={skin} />

      {/* HEAD BASE & EARS */}
      <g id="head">
        {/* Left Ear */}
        <circle cx="50" cy="85" r="13" fill={skin} />
        <circle cx="50" cy="85" r="7" fill="rgba(0,0,0,0.06)" />

        {/* Right Ear */}
        <circle cx="150" cy="85" r="13" fill={skin} />
        <circle cx="150" cy="85" r="7" fill="rgba(0,0,0,0.06)" />

        {/* Main Head Squircle Shape */}
        <rect x="54" y="42" width="92" height="88" rx="28" fill={skin} />
      </g>

      {/* EYES & BROWS */}
      <g id="eyes-expression">
        {/* Eye Whites */}
        <ellipse cx="78" cy="78" rx="14" ry="17" fill="#FFFFFF" />
        <ellipse cx="122" cy="78" rx="14" ry="17" fill="#FFFFFF" />

        {/* Pupils & Eye Expressions */}
        {config.expression === 0 && (
          /* Happy Pupils */
          <>
            <circle cx="81" cy="78" r="7" fill="#1E293B" />
            <circle cx="125" cy="78" r="7" fill="#1E293B" />
            <circle cx="83" cy="75" r="2.5" fill="#FFFFFF" />
            <circle cx="127" cy="75" r="2.5" fill="#FFFFFF" />
          </>
        )}
        {config.expression === 1 && (
          /* Focused / Determined */
          <>
            <circle cx="78" cy="80" r="6" fill="#1E293B" />
            <circle cx="122" cy="80" r="6" fill="#1E293B" />
            <circle cx="79" cy="78" r="2" fill="#FFFFFF" />
            <circle cx="123" cy="78" r="2" fill="#FFFFFF" />
            {/* Eyebrows angled inward */}
            <path d="M 66 61 L 88 66" stroke={hair} strokeWidth="4" strokeLinecap="round" />
            <path d="M 134 61 L 112 66" stroke={hair} strokeWidth="4" strokeLinecap="round" />
          </>
        )}
        {config.expression === 2 && (
          /* Confident / Smirk */
          <>
            <circle cx="81" cy="77" r="6.5" fill="#1E293B" />
            <circle cx="125" cy="77" r="6.5" fill="#1E293B" />
            <circle cx="83" cy="74" r="2" fill="#FFFFFF" />
            <circle cx="127" cy="74" r="2" fill="#FFFFFF" />
            {/* Raised left brow */}
            <path d="M 66 59 Q 78 57 88 62" stroke={hair} strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M 112 63 Q 122 61 134 63" stroke={hair} strokeWidth="4" strokeLinecap="round" fill="none" />
          </>
        )}
        {config.expression === 3 && (
          /* Curious */
          <>
            <circle cx="76" cy="76" r="7" fill="#1E293B" />
            <circle cx="120" cy="76" r="7" fill="#1E293B" />
            <circle cx="78" cy="73" r="2.5" fill="#FFFFFF" />
            <circle cx="122" cy="73" r="2.5" fill="#FFFFFF" />
            <path d="M 66 57 Q 78 52 90 58" stroke={hair} strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M 110 64 Q 122 64 134 64" stroke={hair} strokeWidth="4" strokeLinecap="round" fill="none" />
          </>
        )}
        {config.expression === 4 && (
          /* Excited */
          <>
            <circle cx="80" cy="76" r="7" fill="#1E293B" />
            <circle cx="124" cy="76" r="7" fill="#1E293B" />
            <circle cx="82" cy="73" r="3" fill="#FFFFFF" />
            <circle cx="126" cy="73" r="3" fill="#FFFFFF" />
            <path d="M 66 60 Q 78 55 90 60" stroke={hair} strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M 110 60 Q 122 55 134 60" stroke={hair} strokeWidth="4" strokeLinecap="round" fill="none" />
          </>
        )}

        {/* Default Brows if not drawn above */}
        {(config.expression === 0) && (
          <>
            <path d="M 68 62 Q 78 59 88 62" stroke={hair} strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <path d="M 112 62 Q 122 59 132 62" stroke={hair} strokeWidth="3.5" strokeLinecap="round" fill="none" />
          </>
        )}

        {/* NOSE */}
        <ellipse cx="100" cy="89" rx="4.5" ry="6" fill="rgba(0,0,0,0.15)" />

        {/* MOUTH */}
        {config.expression === 0 && (
          /* Gentle Curve Smile */
          <path d="M 88 102 Q 100 114 112 102" fill="none" stroke="#D9534F" strokeWidth="3.5" strokeLinecap="round" />
        )}
        {config.expression === 1 && (
          /* Determined Line Smile */
          <path d="M 90 105 Q 100 108 110 105" fill="none" stroke="#D9534F" strokeWidth="3.5" strokeLinecap="round" />
        )}
        {config.expression === 2 && (
          /* Smirk Smile */
          <path d="M 90 106 Q 104 112 114 100" fill="none" stroke="#D9534F" strokeWidth="3.5" strokeLinecap="round" />
        )}
        {config.expression === 3 && (
          /* Open O Smile */
          <path d="M 90 102 Q 100 116 110 102 Z" fill="#D9534F" stroke="#B03A2E" strokeWidth="1" />
        )}
        {config.expression === 4 && (
          /* Big Happy Open Mouth */
          <path d="M 86 100 Q 100 120 114 100 Z" fill="#D9534F" stroke="#900C3F" strokeWidth="1.5" />
        )}
      </g>

      {/* HAIRSTYLE FRONT LAYER */}
      <g id="hairstyle">
        {config.hairStyle === 0 && (
          /* Short Sweep */
          <path
            d="M 52 56 C 52 28, 80 20, 105 22 C 135 24, 150 42, 148 58 C 146 54, 140 48, 126 48 C 105 48, 85 58, 62 58 C 55 58, 52 57, 52 56 Z"
            fill={hair}
          />
        )}
        {config.hairStyle === 1 && (
          /* Buzz Cut */
          <path
            d="M 53 58 C 53 38, 70 34, 100 34 C 130 34, 147 38, 147 58 C 147 50, 132 42, 100 42 C 68 42, 53 50, 53 58 Z"
            fill={hair}
          />
        )}
        {config.hairStyle === 2 && (
          /* Wavy Side Part */
          <g>
            <path
              d="M 50 62 C 48 30, 85 18, 120 22 C 145 25, 152 45, 150 64 Q 135 44 110 44 Q 85 44 50 62 Z"
              fill={hair}
            />
            <path d="M 115 22 Q 105 38 95 44" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="2.5" />
          </g>
        )}
        {config.hairStyle === 3 && (
          /* Curly Top */
          <g fill={hair}>
            <circle cx="70" cy="36" r="14" />
            <circle cx="90" cy="28" r="16" />
            <circle cx="112" cy="30" r="15" />
            <circle cx="130" cy="40" r="13" />
            <circle cx="58" cy="48" r="12" />
            <rect x="54" y="44" width="92" height="15" fill={hair} />
          </g>
        )}
        {config.hairStyle === 4 && (
          /* Bob Cut */
          <g fill={hair}>
            <path d="M 46 48 C 46 22, 78 20, 100 20 C 122 20, 154 22, 154 48 L 156 96 Q 156 106 142 102 L 144 58 C 144 44, 122 40, 100 40 C 78 40, 56 44, 56 58 L 58 102 Q 44 106 44 96 Z" />
            <path d="M 56 48 L 144 48 Q 144 62 100 64 Q 56 62 56 48 Z" />
          </g>
        )}
        {config.hairStyle === 5 && (
          /* Spiky Hair */
          <g fill={hair}>
            <polygon points="60,48 70,22 80,44" />
            <polygon points="80,44 95,16 108,42" />
            <polygon points="108,42 122,18 135,48" />
            <rect x="54" y="42" width="92" height="14" />
          </g>
        )}
        {/* config.hairStyle === 6 is Clean Bald */}
        {config.hairStyle === 7 && (
          /* Long Waves Front Framing Bangs */
          <path
            d="M 54 48 C 65 38, 85 36, 100 42 C 115 36, 135 38, 146 48 C 135 44, 115 45, 100 52 C 85 45, 65 44, 54 48 Z"
            fill={hair}
          />
        )}
        {config.hairStyle === 8 && (
          /* High Ponytail */
          <g fill={hair}>
            <path d="M 52 54 C 52 30, 75 24, 100 24 C 125 24, 148 30, 148 54 Q 130 40 100 40 Q 70 40 52 54 Z" />
            <path d="M 112 26 C 135 10, 168 15, 172 45 C 174 65, 155 85, 148 95 C 144 85, 155 60, 148 45 C 142 32, 125 28, 112 26 Z" />
            <circle cx="114" cy="26" r="6" fill="#FF5E7E" />
          </g>
        )}
        {config.hairStyle === 9 && (
          /* Space Buns */
          <g fill={hair}>
            <circle cx="56" cy="24" r="16" />
            <circle cx="56" cy="24" r="7" fill="rgba(0,0,0,0.15)" />
            <circle cx="144" cy="24" r="16" />
            <circle cx="144" cy="24" r="7" fill="rgba(0,0,0,0.15)" />
            <path d="M 52 54 C 52 34, 75 30, 100 32 C 125 30, 148 34, 148 54 Q 130 42 100 44 Q 70 42 52 54 Z" />
          </g>
        )}
        {config.hairStyle === 10 && (
          /* Side Braid */
          <g fill={hair}>
            <path d="M 50 56 C 50 28, 80 20, 105 22 C 135 24, 152 42, 150 64 Q 130 44 100 44 Q 70 44 50 56 Z" />
            <ellipse cx="146" cy="74" rx="8" ry="11" />
            <ellipse cx="148" cy="90" rx="8" ry="11" />
            <ellipse cx="150" cy="106" rx="7" ry="10" />
            <ellipse cx="152" cy="120" rx="6" ry="9" />
            <rect x="146" y="126" width="10" height="4" rx="2" fill="#F4B400" />
          </g>
        )}
        {config.hairStyle === 11 && (
          /* Pixie Cut */
          <g fill={hair}>
            <path d="M 50 56 C 50 26, 75 22, 100 22 C 125 22, 150 26, 150 56 C 150 48, 138 42, 120 44 C 105 40, 85 40, 68 46 C 58 48, 50 52, 50 56 Z" />
            <path d="M 50 56 L 56 68 L 62 58 Z" />
            <path d="M 150 56 L 144 68 L 138 58 Z" />
          </g>
        )}
        {config.hairStyle === 12 && (
          /* Curly Shoulder Length */
          <g fill={hair}>
            <circle cx="50" cy="50" r="14" />
            <circle cx="46" cy="70" r="14" />
            <circle cx="48" cy="90" r="14" />
            <circle cx="150" cy="50" r="14" />
            <circle cx="154" cy="70" r="14" />
            <circle cx="152" cy="90" r="14" />
            <path d="M 50 48 C 50 24, 80 20, 100 20 C 120 20, 150 24, 150 48 Q 130 38 100 38 Q 70 38 50 48 Z" />
          </g>
        )}
        {config.hairStyle === 13 && (
          /* Straight Long Front Framing */
          <path
            d="M 56 45 C 70 38, 88 38, 100 44 C 112 38, 130 38, 144 45 C 132 40, 114 40, 100 46 C 86 40, 68 40, 56 45 Z"
            fill={hair}
          />
        )}
      </g>

      {/* GLASSES */}
      {config.glasses > 0 && (
        <g id="glasses">
          {config.glasses === 1 && (
            /* Round Glasses */
            <g fill="none" stroke="#1E293B" strokeWidth="4">
              <circle cx="78" cy="78" r="16" />
              <circle cx="122" cy="78" r="16" />
              <line x1="94" y1="78" x2="106" y2="78" strokeWidth="3.5" />
              <line x1="48" y1="74" x2="62" y2="78" strokeWidth="3" />
              <line x1="152" y1="74" x2="138" y2="78" strokeWidth="3" />
            </g>
          )}
          {config.glasses === 2 && (
            /* Square Glasses */
            <g fill="none" stroke="#1E293B" strokeWidth="4.5">
              <rect x="61" y="64" width="34" height="28" rx="6" />
              <rect x="105" y="64" width="34" height="28" rx="6" />
              <line x1="95" y1="74" x2="105" y2="74" strokeWidth="4" />
              <line x1="48" y1="72" x2="61" y2="74" strokeWidth="3" strokeLinecap="round" />
              <line x1="152" y1="72" x2="139" y2="74" strokeWidth="3" strokeLinecap="round" />
            </g>
          )}
          {config.glasses === 3 && (
            /* Cool Sunglasses */
            <g fill="#0F172A" stroke="#000" strokeWidth="2">
              <path d="M 60 66 L 96 66 L 92 90 C 92 94, 64 94, 64 90 Z" />
              <path d="M 104 66 L 140 66 L 136 90 C 136 94, 108 94, 108 90 Z" />
              <line x1="96" y1="70" x2="104" y2="70" stroke="#0F172A" strokeWidth="5" />
              {/* White Glare Lines */}
              <line x1="66" y1="70" x2="78" y2="86" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinecap="round" />
              <line x1="110" y1="70" x2="122" y2="86" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinecap="round" />
            </g>
          )}
          {config.glasses === 4 && (
            /* Gold Wire Frames */
            <g fill="none" stroke="#F4B400" strokeWidth="3">
              <circle cx="78" cy="78" r="16" />
              <circle cx="122" cy="78" r="16" />
              <path d="M 94 74 Q 100 70 106 74" />
              <line x1="48" y1="76" x2="62" y2="78" />
              <line x1="152" y1="76" x2="138" y2="78" />
            </g>
          )}
        </g>
      )}
    </svg>
  );
}
