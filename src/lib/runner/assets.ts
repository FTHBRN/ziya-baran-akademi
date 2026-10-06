// Modular Asset Configuration for Pseudo-3D Runner (Kelime Koşusu)

export interface CharacterSpriteConfig {
  // If imageUrl is provided, engine draws from this sprite sheet
  spriteSheetUrl?: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameRate: number; // frames per second
}

export interface GateVisualConfig {
  archWidth: number;
  archHeight: number;
  correctColor: string;
  correctBorder: string;
  wrongColor: string;
  wrongBorder: string;
  fontFamily: string;
}

export interface RoadVisualConfig {
  laneCount: number; // typically 3: Left (-1), Center (0), Right (1)
  roadColor: string;
  curbColorA: string;
  curbColorB: string;
  stripeColor: string;
  vanishingPointYRatio: number; // 0.35 to 0.45 of canvas height
  bottomRoadWidthRatio: number; // 0.75 to 0.85 of canvas width
  topRoadWidthRatio: number; // 0.08 to 0.12 of canvas width
}

export interface RunnerAssetConfig {
  character: CharacterSpriteConfig;
  gates: GateVisualConfig;
  road: RoadVisualConfig;
}

export const DEFAULT_RUNNER_CONFIG: RunnerAssetConfig = {
  character: {
    frameWidth: 96,
    frameHeight: 128,
    frameCount: 6,
    frameRate: 10,
  },
  gates: {
    archWidth: 140,
    archHeight: 160,
    correctColor: '#22C55E',
    correctBorder: '#15803D',
    wrongColor: '#E11D48',
    wrongBorder: '#9F1239',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  road: {
    laneCount: 3,
    roadColor: '#334155',
    curbColorA: '#E2E8F0',
    curbColorB: '#EF4444',
    stripeColor: '#F8FAFC',
    vanishingPointYRatio: 0.38,
    bottomRoadWidthRatio: 0.82,
    topRoadWidthRatio: 0.08,
  },
};

/**
 * Procedural Dynamic Runner Sprite Generator
 * Generates an HD 6-frame running cycle of the backpack kid (viewed from back)
 * so the game runs immediately with 0 external network image dependency!
 */
export function generateProceduralRunnerSpriteSheet(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const frameWidth = 96;
  const frameHeight = 128;
  const frameCount = 6;

  canvas.width = frameWidth * frameCount;
  canvas.height = frameHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Running cycle stride offsets for legs and arms
  const legOffsets = [
    { left: -14, right: 14, bounce: 0 },
    { left: -8, right: 8, bounce: -4 },
    { left: 0, right: 0, bounce: -6 },
    { left: 14, right: -14, bounce: 0 },
    { left: 8, right: -8, bounce: -4 },
    { left: 0, right: 0, bounce: -6 },
  ];

  for (let i = 0; i < frameCount; i++) {
    const frameX = i * frameWidth;
    const { left: legL, right: legR, bounce } = legOffsets[i];

    ctx.save();
    ctx.translate(frameX + frameWidth / 2, frameHeight / 2 + bounce);

    // 1. Shadow underneath
    ctx.beginPath();
    ctx.ellipse(0, 52 - bounce, 24, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fill();

    // 2. Legs / Jeans (Running stride)
    // Left leg
    ctx.beginPath();
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2563EB'; // Blue jeans
    ctx.moveTo(-10, 20);
    ctx.lineTo(-10 + legL * 0.4, 38);
    ctx.lineTo(-10 + legL, 50);
    ctx.stroke();

    // Left shoe (Red & White sneaker)
    ctx.beginPath();
    ctx.arc(-10 + legL, 52, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#EF4444';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-10 + legL, 54, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Right leg
    ctx.beginPath();
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1D4ED8';
    ctx.moveTo(10, 20);
    ctx.lineTo(10 + legR * 0.4, 38);
    ctx.lineTo(10 + legR, 50);
    ctx.stroke();

    // Right shoe
    ctx.beginPath();
    ctx.arc(10 + legR, 52, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#EF4444';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(10 + legR, 54, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // 3. Torso / Jacket (White with Red sleeves)
    ctx.beginPath();
    ctx.roundRect(-20, -15, 40, 36, [10]);
    ctx.fillStyle = '#F8FAFC'; // White jacket body
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#CBD5E1';
    ctx.stroke();

    // Red sleeves swinging
    ctx.beginPath();
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#DC2626';
    ctx.moveTo(-18, -10);
    ctx.lineTo(-26 - legR * 0.5, 8); // Arm counter-balances leg
    ctx.stroke();

    ctx.beginPath();
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#DC2626';
    ctx.moveTo(18, -10);
    ctx.lineTo(26 - legL * 0.5, 8);
    ctx.stroke();

    // 4. Blue Backpack (with Crown logo like in the reference image!)
    ctx.beginPath();
    ctx.roundRect(-16, -12, 32, 28, [8]);
    ctx.fillStyle = '#0284C7'; // Sky Blue Backpack
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0369A1';
    ctx.stroke();

    // Golden Crown on Backpack
    ctx.beginPath();
    ctx.moveTo(-7, 2);
    ctx.lineTo(-7, -4);
    ctx.lineTo(-3, -1);
    ctx.lineTo(0, -6);
    ctx.lineTo(3, -1);
    ctx.lineTo(7, -4);
    ctx.lineTo(7, 2);
    ctx.closePath();
    ctx.fillStyle = '#FACC15';
    ctx.fill();

    // Backpack straps
    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#075985';
    ctx.moveTo(-12, -12);
    ctx.lineTo(-12, 12);
    ctx.moveTo(12, -12);
    ctx.lineTo(12, 12);
    ctx.stroke();

    // 5. Head & Messy Brown Hair (Viewed from back)
    // Neck
    ctx.fillStyle = '#FBCFE8';
    ctx.fillRect(-6, -24, 12, 8);

    // Head base
    ctx.beginPath();
    ctx.arc(0, -28, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#5C3821'; // Brown hair base
    ctx.fill();

    // Stylized Spiky Hair Strands
    ctx.beginPath();
    ctx.arc(-8, -32, 7, 0, Math.PI * 2);
    ctx.arc(0, -36, 8, 0, Math.PI * 2);
    ctx.arc(8, -32, 7, 0, Math.PI * 2);
    ctx.arc(-11, -26, 6, 0, Math.PI * 2);
    ctx.arc(11, -26, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#452210';
    ctx.fill();

    ctx.restore();
  }

  return canvas;
}
