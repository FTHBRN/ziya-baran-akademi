import { RunnerAssetConfig, DEFAULT_RUNNER_CONFIG, generateProceduralRunnerSpriteSheet } from './assets';

export interface GateOption {
  text: string;
  isCorrect: boolean;
  lane: -1 | 0 | 1;
  color: string;
}

export interface QuestionData {
  turkishWord: string;
  englishCorrect: string;
  options: GateOption[];
}

export interface CoinObject {
  lane: -1 | 0 | 1;
  z: number;
  collected: boolean;
}

export interface RoadsideDecor {
  side: -1 | 1; // Left or Right
  z: number;
  type: 'tree' | 'cone' | 'lamp';
}

export interface RunnerEngineCallbacks {
  onCorrectGate: (questionIndex: number, points: number) => void;
  onWrongGate: (questionIndex: number) => void;
  onCoinCollected: (points: number) => void;
  onFinishCourse: () => void;
}

export class RunnerEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: RunnerAssetConfig;
  private callbacks: RunnerEngineCallbacks;

  // Animation & loop
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private isRunning: boolean = false;

  // Procedural Sprite Sheet
  private spriteSheet: HTMLCanvasElement | null = null;
  private currentFrame: number = 0;
  private frameTimer: number = 0;

  // Road movement
  private roadOffset: number = 0;
  private baseSpeed: number = 550; // Z distance units per second
  private speed: number = 550;

  // Player state
  private playerLane: -1 | 0 | 1 = 0;
  private playerCurrentX: number = 0; // smoothly interpolated between -1, 0, 1
  private isStumbling: boolean = false;
  private stumbleTimer: number = 0;
  public feverMode: boolean = false;

  // Questions / Gates
  private questions: QuestionData[] = [];
  private currentQuestionIndex: number = 0;
  private gateZ: number = 1800; // Far horizon
  private isGateActive: boolean = false;
  private gatePassed: boolean = false;

  // Finish Line state
  private finishLineZ: number = 0;
  private isApproachingFinish: boolean = false;

  // Coins & Decor
  private coins: CoinObject[] = [];
  private decorList: RoadsideDecor[] = [];

  constructor(
    canvas: HTMLCanvasElement,
    questions: QuestionData[],
    callbacks: RunnerEngineCallbacks,
    config: RunnerAssetConfig = DEFAULT_RUNNER_CONFIG
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = config;
    this.questions = questions;
    this.callbacks = callbacks;

    if (typeof window !== 'undefined') {
      this.spriteSheet = generateProceduralRunnerSpriteSheet();
    }

    this.initDecorations();
    this.spawnNextGate();
  }

  private initDecorations() {
    this.decorList = [];
    for (let i = 0; i < 14; i++) {
      const z = i * 140 + 50;
      this.decorList.push({
        side: i % 2 === 0 ? -1 : 1,
        z,
        type: i % 3 === 0 ? 'cone' : 'tree',
      });
    }
  }

  private spawnNextGate() {
    if (this.currentQuestionIndex >= this.questions.length) {
      // All 10 questions done! Spawn finish line
      this.isApproachingFinish = true;
      this.finishLineZ = 1600;
      return;
    }

    this.gateZ = 1800;
    this.isGateActive = true;
    this.gatePassed = false;

    // Spawn 3-4 coins in the lane leading to the upcoming correct gate
    const currentQ = this.questions[this.currentQuestionIndex];
    const correctOption = currentQ?.options.find((o) => o.isCorrect);
    const targetLane = correctOption ? correctOption.lane : 0;

    this.coins = [];
    for (let c = 0; c < 3; c++) {
      this.coins.push({
        lane: targetLane,
        z: 900 + c * 180,
        collected: false,
      });
    }
  }

  // Swipe / Input Controls
  public moveLeft() {
    if (this.playerLane > -1) {
      this.playerLane = (this.playerLane - 1) as -1 | 0 | 1;
    }
  }

  public moveRight() {
    if (this.playerLane < 1) {
      this.playerLane = (this.playerLane + 1) as -1 | 0 | 1;
    }
  }

  public setLane(lane: -1 | 0 | 1) {
    this.playerLane = lane;
  }

  public getPlayerLane(): -1 | 0 | 1 {
    return this.playerLane;
  }

  public getCurrentQuestion(): QuestionData | null {
    if (this.currentQuestionIndex < this.questions.length) {
      return this.questions[this.currentQuestionIndex];
    }
    return null;
  }

  public getCurrentQuestionIndex(): number {
    return this.currentQuestionIndex;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private loop = (time: number) => {
    if (!this.isRunning) return;
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    this.update(dt);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    // 1. Speed tuning
    this.speed = this.feverMode ? this.baseSpeed * 1.35 : this.baseSpeed;
    const movement = this.speed * dt;

    // 2. Road scrolling
    this.roadOffset = (this.roadOffset + movement) % 100;

    // 3. Smooth player horizontal interpolation
    this.playerCurrentX += (this.playerLane - this.playerCurrentX) * 14 * dt;

    // 4. Character running sprite cycle
    this.frameTimer += dt * (this.feverMode ? 16 : 10);
    if (this.frameTimer >= 1) {
      this.frameTimer = 0;
      this.currentFrame = (this.currentFrame + 1) % this.config.character.frameCount;
    }

    // 5. Stumble recovery timer
    if (this.isStumbling) {
      this.stumbleTimer -= dt;
      if (this.stumbleTimer <= 0) {
        this.isStumbling = false;
      }
    }

    // 6. Update roadside decor
    for (const d of this.decorList) {
      d.z -= movement;
      if (d.z <= 0) {
        d.z = 1800 + Math.random() * 200;
        d.type = Math.random() < 0.4 ? 'cone' : 'tree';
      }
    }

    // 7. Update Coins & Collision
    for (const c of this.coins) {
      if (!c.collected) {
        c.z -= movement;
        // Collision check with player (player is at Z ~ 50)
        if (c.z > 20 && c.z < 80 && Math.abs(this.playerCurrentX - c.lane) < 0.45) {
          c.collected = true;
          this.callbacks.onCoinCollected(20);
        }
      }
    }

    // 8. Update Gates & Collision
    if (this.isGateActive) {
      this.gateZ -= movement;

      // Passing check (Player is around Z ~ 50)
      if (this.gateZ <= 65 && !this.gatePassed) {
        this.gatePassed = true;
        this.checkGateCollision();
      }

      // Past camera
      if (this.gateZ <= -100) {
        this.isGateActive = false;
        this.currentQuestionIndex++;
        this.spawnNextGate();
      }
    }

    // 9. Update Finish Line
    if (this.isApproachingFinish) {
      this.finishLineZ -= movement;
      if (this.finishLineZ <= 50) {
        this.isApproachingFinish = false;
        this.callbacks.onFinishCourse();
      }
    }
  }

  private checkGateCollision() {
    const currentQ = this.questions[this.currentQuestionIndex];
    if (!currentQ) return;

    // Nearest lane rounded
    const currentLane = Math.round(this.playerCurrentX) as -1 | 0 | 1;
    const chosenOption = currentQ.options.find((o) => o.lane === currentLane);

    if (chosenOption && chosenOption.isCorrect) {
      // SUCCESS!
      const basePoints = 100;
      this.callbacks.onCorrectGate(this.currentQuestionIndex, basePoints);
    } else {
      // MISTAKE!
      this.isStumbling = true;
      this.stumbleTimer = 0.5;
      this.callbacks.onWrongGate(this.currentQuestionIndex);
    }
  }

  // ==========================================
  // RENDERING ENGINE (PSEUDO-3D PROJECTION)
  // ==========================================
  private render() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, w, h);

    // 1. Sky & Distant Horizon (Vibrant Sunny School Environment)
    this.renderSkyAndHorizon(ctx, w, h);

    // 2. Road Projection
    this.renderRoad(ctx, w, h);

    // 3. Roadside Decor (Trees, Cones) sorted back-to-front
    this.renderDecor(ctx, w, h);

    // 4. Coins (sorted back-to-front)
    this.renderCoins(ctx, w, h);

    // 5. Gates (Approaching from distance)
    if (this.isGateActive) {
      this.renderGates(ctx, w, h);
    }

    // 6. Finish Line
    if (this.isApproachingFinish) {
      this.renderFinishLine(ctx, w, h);
    }

    // 7. Player Character
    this.renderPlayer(ctx, w, h);
  }

  // 1. Sky & Horizon
  private renderSkyAndHorizon(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const vY = h * this.config.road.vanishingPointYRatio;

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, vY);
    skyGrad.addColorStop(0, '#0284C7'); // Deep Sky Blue
    skyGrad.addColorStop(0.7, '#38BDF8');
    skyGrad.addColorStop(1, '#BAE6FD');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, vY);

    // Sun & Clouds
    ctx.beginPath();
    ctx.arc(w * 0.82, vY * 0.35, 28, 0, Math.PI * 2);
    ctx.fillStyle = '#FEF08A';
    ctx.fill();

    // Cute rolling green hills in background
    ctx.beginPath();
    ctx.moveTo(0, vY);
    ctx.quadraticCurveTo(w * 0.25, vY - 35, w * 0.5, vY);
    ctx.quadraticCurveTo(w * 0.75, vY - 45, w, vY);
    ctx.lineTo(w, vY + 10);
    ctx.lineTo(0, vY + 10);
    ctx.fillStyle = '#16A34A';
    ctx.fill();

    // Distant School building at horizon
    const schoolW = 90;
    const schoolH = 45;
    const schoolX = w / 2 - schoolW / 2;
    const schoolY = vY - schoolH + 5;

    ctx.fillStyle = '#FFF1F2';
    ctx.fillRect(schoolX, schoolY, schoolW, schoolH);
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1;
    ctx.strokeRect(schoolX, schoolY, schoolW, schoolH);

    // Red Roof
    ctx.beginPath();
    ctx.moveTo(schoolX - 5, schoolY);
    ctx.lineTo(w / 2, schoolY - 20);
    ctx.lineTo(schoolX + schoolW + 5, schoolY);
    ctx.closePath();
    ctx.fillStyle = '#EF4444';
    ctx.fill();

    // Little Clock
    ctx.beginPath();
    ctx.arc(w / 2, schoolY + 14, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#F8FAFC';
    ctx.fill();
    ctx.stroke();

    // Turkish flag on school roof
    ctx.beginPath();
    ctx.moveTo(w / 2, schoolY - 20);
    ctx.lineTo(w / 2, schoolY - 32);
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#E11D48';
    ctx.fillRect(w / 2, schoolY - 32, 12, 8);
  }

  // 2. Pseudo-3D Road
  private renderRoad(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const vY = h * this.config.road.vanishingPointYRatio;
    const bottomW = w * this.config.road.bottomRoadWidthRatio;
    const topW = w * this.config.road.topRoadWidthRatio;

    const leftBottom = (w - bottomW) / 2;
    const rightBottom = leftBottom + bottomW;
    const leftTop = w / 2 - topW / 2;
    const rightTop = w / 2 + topW / 2;

    // Grass borders
    ctx.fillStyle = '#22C55E';
    ctx.fillRect(0, vY, w, h - vY);

    // Sidewalks
    ctx.beginPath();
    ctx.moveTo(leftTop - 15, vY);
    ctx.lineTo(rightTop + 15, vY);
    ctx.lineTo(rightBottom + 40, h);
    ctx.lineTo(leftBottom - 40, h);
    ctx.closePath();
    ctx.fillStyle = '#94A3B8';
    ctx.fill();

    // Main Asphalt Road
    ctx.beginPath();
    ctx.moveTo(leftTop, vY);
    ctx.lineTo(rightTop, vY);
    ctx.lineTo(rightBottom, h);
    ctx.lineTo(leftBottom, h);
    ctx.closePath();
    ctx.fillStyle = '#1E293B';
    ctx.fill();

    // Road dashed dividing lines (2 lines for 3 lanes)
    const segments = 16;
    for (let i = 0; i < segments; i++) {
      const z = (i * 120 + this.roadOffset) % 1920;
      const t = 1 - z / 1920;
      const y = vY + (h - vY) * (t * t);
      const nextY = vY + (h - vY) * Math.pow(Math.min(t + 0.035, 1), 2);
      const currentRoadW = topW + (bottomW - topW) * (t * t);

      // Dash width and thickness
      const dashH = Math.max(nextY - y, 2);
      const dashW = Math.max(currentRoadW * 0.02, 2);

      // Left divider
      const xLeft = w / 2 - currentRoadW / 6;
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(xLeft - dashW / 2, y, dashW, dashH);

      // Right divider
      const xRight = w / 2 + currentRoadW / 6;
      ctx.fillRect(xRight - dashW / 2, y, dashW, dashH);
    }
  }

  // 3. Roadside Decor (Cones, Trees)
  private renderDecor(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const vY = h * this.config.road.vanishingPointYRatio;
    const bottomW = w * this.config.road.bottomRoadWidthRatio;
    const topW = w * this.config.road.topRoadWidthRatio;

    // Sort by Z descending (draw farthest first)
    const sorted = [...this.decorList].sort((a, b) => b.z - a.z);

    for (const item of sorted) {
      if (item.z <= 0 || item.z > 1800) continue;
      const t = 1 - item.z / 1800;
      const curveT = t * t;
      const y = vY + (h - vY) * curveT;
      const currentRoadW = topW + (bottomW - topW) * curveT;
      const x = w / 2 + item.side * (currentRoadW / 2 + 25 * (curveT + 0.2));
      const scale = 0.2 + curveT * 0.9;

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);

      if (item.type === 'cone') {
        // Traffic cone
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(10, 0);
        ctx.lineTo(0, -28);
        ctx.closePath();
        ctx.fillStyle = '#EA580C';
        ctx.fill();
        // White reflective stripe
        ctx.beginPath();
        ctx.moveTo(-5, -12);
        ctx.lineTo(5, -12);
        ctx.lineTo(3, -19);
        ctx.lineTo(-3, -19);
        ctx.closePath();
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
      } else {
        // Bushy tree
        ctx.fillStyle = '#854D0E';
        ctx.fillRect(-4, -15, 8, 15);
        ctx.beginPath();
        ctx.arc(0, -28, 18, 0, Math.PI * 2);
        ctx.fillStyle = '#15803D';
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // 4. Coins
  private renderCoins(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const vY = h * this.config.road.vanishingPointYRatio;
    const bottomW = w * this.config.road.bottomRoadWidthRatio;
    const topW = w * this.config.road.topRoadWidthRatio;

    for (const coin of this.coins) {
      if (coin.collected || coin.z <= 0 || coin.z > 1800) continue;
      const t = 1 - coin.z / 1800;
      const curveT = t * t;
      const y = vY + (h - vY) * curveT - 15 * curveT;
      const currentRoadW = topW + (bottomW - topW) * curveT;
      const laneOffset = coin.lane * (currentRoadW / 3);
      const x = w / 2 + laneOffset;
      const scale = 0.25 + curveT * 0.9;

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);

      // Gold coin
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fillStyle = '#FBBF24';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#D97706';
      ctx.stroke();

      // Inner star
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#78350F';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', 0, 1);

      ctx.restore();
    }
  }

  // 5. Triple Gates (Red, Green, Blue Arches from reference image)
  private renderGates(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const vY = h * this.config.road.vanishingPointYRatio;
    const bottomW = w * this.config.road.bottomRoadWidthRatio;
    const topW = w * this.config.road.topRoadWidthRatio;

    const currentQ = this.questions[this.currentQuestionIndex];
    if (!currentQ) return;

    const t = 1 - this.gateZ / 1800;
    const curveT = t * t;
    const y = vY + (h - vY) * curveT;
    const currentRoadW = topW + (bottomW - topW) * curveT;
    const scale = Math.max(0.18 + curveT * 1.05, 0.05);

    const gateWidth = (currentRoadW / 3) * 0.96;
    const gateHeight = gateWidth * 1.25;

    // Render 3 Gates in lanes: Left (-1), Center (0), Right (1)
    currentQ.options.forEach((opt) => {
      const laneOffset = opt.lane * (currentRoadW / 3);
      const x = w / 2 + laneOffset;

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);

      // Gate Arch Dimensions
      const gw = 100;
      const gh = 130;

      // Glowing Aura for Correct Gate
      if (opt.isCorrect) {
        ctx.shadowColor = '#22C55E';
        ctx.shadowBlur = 20 * scale;
      }

      // Arch outer body
      ctx.beginPath();
      ctx.roundRect(-gw / 2, -gh, gw, gh, [20, 20, 0, 0]);
      ctx.fillStyle = opt.color; // e.g. #E11D48, #22C55E, #0284C7
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      ctx.shadowBlur = 0; // reset shadow

      // Arch Portal inner cutout (tunnel through which player runs)
      ctx.beginPath();
      ctx.roundRect(-gw * 0.38, -gh * 0.75, gw * 0.76, gh * 0.75, [14, 14, 0, 0]);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.fill();

      // Top Header Text (The English Word e.g. "SCHOOL", "HOUSE", "STORY")
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(opt.text, 0, -gh + 18);

      // Center Icon (House, School, Book)
      ctx.font = '24px sans-serif';
      ctx.fillText(opt.isCorrect ? '🏫' : opt.lane === -1 ? '🏠' : '📖', 0, -gh * 0.42);

      // Road chevron arrows on the ground in front of correct gate
      if (opt.isCorrect) {
        ctx.fillStyle = '#86EFAC';
        ctx.beginPath();
        ctx.moveTo(0, 10);
        ctx.lineTo(-12, 24);
        ctx.lineTo(-6, 24);
        ctx.lineTo(0, 18);
        ctx.lineTo(6, 24);
        ctx.lineTo(12, 24);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    });
  }

  // 6. Finish Line Banner
  private renderFinishLine(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const vY = h * this.config.road.vanishingPointYRatio;
    const bottomW = w * this.config.road.bottomRoadWidthRatio;
    const topW = w * this.config.road.topRoadWidthRatio;

    const t = 1 - this.finishLineZ / 1800;
    const curveT = t * t;
    const y = vY + (h - vY) * curveT;
    const currentRoadW = topW + (bottomW - topW) * curveT;
    const scale = 0.2 + curveT * 0.9;

    ctx.save();
    ctx.translate(w / 2, y);
    ctx.scale(scale, scale);

    // Checkerboard Banner Arch
    const bw = currentRoadW / scale;
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(-bw / 2, -100, bw, 35);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#FFFFFF';
    ctx.strokeRect(-bw / 2, -100, bw, 35);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏁 BİTİŞ ÇİZGİSİ! 🏁', 0, -82);

    ctx.restore();
  }

  // 7. Player Character
  private renderPlayer(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const vY = h * this.config.road.vanishingPointYRatio;
    const bottomW = w * this.config.road.bottomRoadWidthRatio;
    const y = h * 0.88; // Fixed vertical height for player near bottom
    const currentRoadW = bottomW;
    const x = w / 2 + this.playerCurrentX * (currentRoadW / 3);

    ctx.save();
    ctx.translate(x, y);

    // Camera shake or tilt on stumble
    if (this.isStumbling) {
      ctx.rotate((Math.random() - 0.5) * 0.2);
      ctx.filter = 'brightness(1.5) sepia(0.8) hue-rotate(-50deg)';
    }

    if (this.feverMode) {
      // Fiery aura behind player
      ctx.beginPath();
      ctx.ellipse(0, 10, 36, 12, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
      ctx.fill();
    }

    // Draw sprite from generated sheet
    if (this.spriteSheet) {
      const fw = this.config.character.frameWidth;
      const fh = this.config.character.frameHeight;
      const sx = this.currentFrame * fw;

      // Render size
      const drawW = fw * 0.95;
      const drawH = fh * 0.95;

      ctx.drawImage(this.spriteSheet, sx, 0, fw, fh, -drawW / 2, -drawH + 15, drawW, drawH);
    }

    ctx.restore();
  }
}
