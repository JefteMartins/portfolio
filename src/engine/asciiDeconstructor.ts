import type { BackgroundConfig } from '../types';

export type RenderStageName = 'RAW' | 'DRIFT' | 'PARTICLE' | 'HYBRID' | 'BINARY';

export interface EngineTelemetry {
  progress: number;
  stageIndex: number;
  stageName: RenderStageName;
  cellSize: number;
  isCustomMedia: boolean;
  mediaLabel: string;
}

const DRIFT_ASCII_RAMP = [' ', '.', ':', '-', '=', '+', '*', '#', '%', '@'] as const;
const DRIFT_TRAIL_CHARS = ['.', '·', ':', '-', '+'] as const;
const HYBRID_RAMP = [' ', '·', ':', '-', '0', '+', '0', '1', '#', '1'] as const;
const CROSSFADE_DURATION = 0.5;
const MAX_DRIFT_PARTICLES = 1100;

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Hash espacial determinístico em [0, 1)
function cellHash(col: number, row: number): number {
  let n = (col * 374761393 + row * 668265263) ^ 0x5bf03635;
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function cellHash2(col: number, row: number): number {
  let n = (col * 1274126177 + row * 374761393) ^ 0x27d4eb2d;
  n = (n ^ (n >>> 15)) * 668265263;
  return ((n ^ (n >>> 13)) >>> 0) / 4294967296;
}

export class AsciiDeconstructor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private sampleCanvas: HTMLCanvasElement;
  private sampleCtx: CanvasRenderingContext2D;

  // Canvas offscreen dedicado à composição suave do crossfade entre vídeo A e B
  private videoMixCanvas: HTMLCanvasElement;
  private videoMixCtx: CanvasRenderingContext2D;

  private fallbackCanvas: HTMLCanvasElement;
  private fallbackCtx: CanvasRenderingContext2D;

  // Buffer 32-bit reutilizável + cache esparso de carimbos de glifos para 60 FPS sem GC
  private glyphCanvas: HTMLCanvasElement;
  private glyphCtx: CanvasRenderingContext2D;
  private glyphImageData: ImageData | null = null;
  private glyphBuf32: Uint32Array | null = null;
  private glyphScale = 1;
  private stampCanvas: HTMLCanvasElement;
  private stampCtx: CanvasRenderingContext2D;
  private stampCache = new Map<number, Int16Array>();

  // Memória de luminância do frame anterior para emitir partículas no rastro de movimento do DRIFT
  private prevLum: Float32Array = new Float32Array(0);
  private prevCols = 0;
  private prevRows = 0;

  // Pool tipado (zero GC) para partículas persistentes que se desprendem e voam no estágio DRIFT
  private pX = new Float32Array(MAX_DRIFT_PARTICLES);
  private pY = new Float32Array(MAX_DRIFT_PARTICLES);
  private pVx = new Float32Array(MAX_DRIFT_PARTICLES);
  private pVy = new Float32Array(MAX_DRIFT_PARTICLES);
  private pLife = new Float32Array(MAX_DRIFT_PARTICLES);
  private pMaxLife = new Float32Array(MAX_DRIFT_PARTICLES);
  private pR = new Uint8Array(MAX_DRIFT_PARTICLES);
  private pG = new Uint8Array(MAX_DRIFT_PARTICLES);
  private pB = new Uint8Array(MAX_DRIFT_PARTICLES);
  private pCharIdx = new Uint8Array(MAX_DRIFT_PARTICLES);
  private pCursor = 0;

  private config: BackgroundConfig;
  private imageEl: HTMLImageElement | null = null;
  private imageReady = false;

  // Duplo elemento <video> (A e B) com ciclo manual e crossfade de 0.5s
  private videoA: HTMLVideoElement | null = null;
  private videoB: HTMLVideoElement | null = null;
  private activeVideo: HTMLVideoElement | null = null;
  private standbyVideo: HTMLVideoElement | null = null;
  private videoReady = false;
  private isCrossfading = false;
  private videoLoopCount = 0;

  private customObjectUrl: string | null = null;
  private isCustomMedia = false;
  private mediaLabel = 'background.mp4';

  private width = 0;
  private height = 0;
  private dpr = 1;

  private targetProgress = 0;
  private currentProgress = 0;

  private targetPointerX = 0;
  private targetPointerY = 0;
  private pointerX = 0;
  private pointerY = 0;

  private reducedMotion = false;
  private rafId = 0;
  private startTime = performance.now();
  private lastFrameTime = performance.now();
  private fpsFrames = 0;
  private fpsWindowStart = performance.now();

  private histogram = new Uint32Array(64);
  private onTelemetry?: (state: EngineTelemetry) => void;

  constructor(
    canvas: HTMLCanvasElement,
    config: BackgroundConfig,
    onTelemetry?: (state: EngineTelemetry) => void
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Canvas 2D context indisponível.');
    }
    this.ctx = ctx;
    this.config = config;
    this.onTelemetry = onTelemetry;

    this.sampleCanvas = document.createElement('canvas');
    const sCtx = this.sampleCanvas.getContext('2d', { willReadFrequently: true });
    if (!sCtx) {
      throw new Error('Offscreen sample context indisponível.');
    }
    this.sampleCtx = sCtx;

    this.videoMixCanvas = document.createElement('canvas');
    const vCtx = this.videoMixCanvas.getContext('2d', { alpha: false });
    if (!vCtx) {
      throw new Error('Video mix offscreen context indisponível.');
    }
    this.videoMixCtx = vCtx;

    this.glyphCanvas = document.createElement('canvas');
    const gCtx = this.glyphCanvas.getContext('2d');
    if (!gCtx) {
      throw new Error('Glyph buffer context indisponível.');
    }
    this.glyphCtx = gCtx;

    this.stampCanvas = document.createElement('canvas');
    this.stampCanvas.width = 36;
    this.stampCanvas.height = 36;
    const stCtx = this.stampCanvas.getContext('2d', { willReadFrequently: true });
    if (!stCtx) {
      throw new Error('Stamp context indisponível.');
    }
    this.stampCtx = stCtx;

    this.fallbackCanvas = document.createElement('canvas');
    this.fallbackCanvas.width = 640;
    this.fallbackCanvas.height = 360;
    const fCtx = this.fallbackCanvas.getContext('2d');
    if (!fCtx) {
      throw new Error('Fallback canvas context indisponível.');
    }
    this.fallbackCtx = fCtx;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion = motionQuery.matches;
    motionQuery.addEventListener('change', (e) => {
      this.reducedMotion = e.matches;
      this.syncVideoPlayback();
    });

    if ('fonts' in document) {
      document.fonts.ready.then(() => {
        this.stampCache.clear();
      });
    }

    this.handleResize = this.handleResize.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.tick = this.tick.bind(this);
  }

  public start(): void {
    this.handleResize();
    window.addEventListener('resize', this.handleResize, { passive: true });
    window.addEventListener('pointermove', this.handlePointerMove, { passive: true });
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    this.canvas.setAttribute('data-video-loop-count', '0');
    this.canvas.setAttribute('data-crossfading', 'false');

    this.loadDefaultMedia();
    this.rafId = requestAnimationFrame(this.tick);
  }

  public destroy(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('pointermove', this.handlePointerMove);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.cleanupCustomUrl();
    this.teardownVideos();
  }

  public setScrollProgress(progress: number): void {
    this.targetProgress = clamp(progress, 0, 1);
  }

  public loadCustomFile(file: File): void {
    this.cleanupCustomUrl();
    const url = URL.createObjectURL(file);
    this.customObjectUrl = url;
    this.isCustomMedia = true;
    this.mediaLabel = file.name;
    this.pLife.fill(0);

    if (file.type.startsWith('video/')) {
      this.imageReady = false;
      this.setupVideoPair(url);
    } else {
      this.pauseAllVideos();
      this.videoReady = false;
      this.isCrossfading = false;
      this.canvas.setAttribute('data-crossfading', 'false');
      this.setupImage(url);
    }
  }

  public resetToDefaultMedia(): void {
    if (!this.isCustomMedia) return;
    this.cleanupCustomUrl();
    this.isCustomMedia = false;
    this.pLife.fill(0);
    this.loadDefaultMedia();
  }

  private cleanupCustomUrl(): void {
    if (this.customObjectUrl) {
      URL.revokeObjectURL(this.customObjectUrl);
      this.customObjectUrl = null;
    }
  }

  private loadDefaultMedia(): void {
    this.mediaLabel = 'background.jpg';
    this.setupImage(this.config.imageSrc);
    if (this.config.videoSrc) {
      this.setupVideoPair(this.config.videoSrc);
    }
  }

  private setupImage(src: string): void {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (img.naturalWidth > 0) {
        this.imageEl = img;
        this.imageReady = true;
      }
    };
    img.onerror = () => {
      if (!this.isCustomMedia) {
        this.imageReady = false;
      }
    };
    img.src = src;
  }

  private createVideoElement(): HTMLVideoElement {
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.loop = false;
    return v;
  }

  private pauseAllVideos(): void {
    if (this.videoA) this.videoA.pause();
    if (this.videoB) this.videoB.pause();
  }

  private teardownVideos(): void {
    for (const v of [this.videoA, this.videoB]) {
      if (!v) continue;
      v.pause();
      v.onloadeddata = null;
      v.onerror = null;
      v.removeAttribute('src');
      v.load();
    }
    this.videoA = null;
    this.videoB = null;
    this.activeVideo = null;
    this.standbyVideo = null;
    this.videoReady = false;
    this.isCrossfading = false;
  }

  private setupVideoPair(src: string): void {
    if (!this.videoA) this.videoA = this.createVideoElement();
    if (!this.videoB) this.videoB = this.createVideoElement();

    this.pauseAllVideos();
    this.videoReady = false;
    this.isCrossfading = false;
    this.videoLoopCount = 0;
    this.activeVideo = this.videoA;
    this.standbyVideo = this.videoB;
    this.canvas.setAttribute('data-video-loop-count', '0');
    this.canvas.setAttribute('data-crossfading', 'false');

    const vA = this.videoA;
    const vB = this.videoB;

    vA.onloadeddata = () => {
      if (vA.videoWidth > 0) {
        this.videoReady = true;
        if (!this.isCustomMedia) {
          this.mediaLabel = src.split('/').pop() || 'background.mp4';
        }
        vB.pause();
        if (vB.readyState >= 1) {
          vB.currentTime = 0;
        }
        this.syncVideoPlayback();
      }
    };

    vB.onloadeddata = () => {
      if (this.standbyVideo === vB && !this.isCrossfading) {
        vB.pause();
        if (vB.currentTime !== 0) {
          vB.currentTime = 0;
        }
      }
    };

    vA.onerror = () => {
      this.videoReady = false;
    };
    vB.onerror = () => {};

    vA.src = src;
    vB.src = src;
    vA.load();
    vB.load();
  }

  private syncVideoPlayback(): void {
    if (!this.videoReady || !this.activeVideo) return;

    if (this.reducedMotion || document.hidden) {
      this.pauseAllVideos();
      return;
    }

    if (this.isCrossfading && this.standbyVideo) {
      const duration = this.activeVideo.duration;
      const validDuration =
        Number.isFinite(duration) && duration > CROSSFADE_DURATION * 2;
      if (!validDuration || this.activeVideo.ended || this.activeVideo.currentTime >= duration) {
        this.completeCrossfadeSwap();
      } else {
        this.activeVideo.play().catch(() => {});
        this.standbyVideo.play().catch(() => {});
      }
      return;
    }

    if (this.standbyVideo) {
      this.standbyVideo.pause();
      if (this.standbyVideo.readyState >= 1 && this.standbyVideo.currentTime !== 0) {
        this.standbyVideo.currentTime = 0;
      }
    }
    this.activeVideo.play().catch(() => {});
  }

  private handleVisibilityChange(): void {
    if (!this.videoReady || !this.activeVideo) return;

    if (document.hidden) {
      this.pauseAllVideos();
    } else {
      this.lastFrameTime = performance.now();
      this.syncVideoPlayback();
    }
  }

  private isVideoPlayable(v: HTMLVideoElement | null): v is HTMLVideoElement {
    return v !== null && v.readyState >= 2 && v.videoWidth > 0 && v.videoHeight > 0;
  }

  private completeCrossfadeSwap(): void {
    if (!this.activeVideo || !this.standbyVideo) {
      this.isCrossfading = false;
      this.canvas.setAttribute('data-crossfading', 'false');
      return;
    }

    const previous = this.activeVideo;
    this.activeVideo = this.standbyVideo;
    this.standbyVideo = previous;
    this.isCrossfading = false;

    previous.pause();
    try {
      previous.currentTime = 0;
    } catch {
      // Ignora erro de seek se buffer ainda estiver reiniciando
    }

    this.videoLoopCount++;
    this.canvas.setAttribute('data-video-loop-count', String(this.videoLoopCount));
    this.canvas.setAttribute('data-crossfading', 'false');

    if (!this.reducedMotion && !document.hidden && this.activeVideo.paused) {
      this.activeVideo.play().catch(() => {});
    }
  }

  private resolveVideoFrame(): {
    source: CanvasImageSource;
    sw: number;
    sh: number;
    isLiveVideo: boolean;
  } | null {
    const active = this.activeVideo;
    const standby = this.standbyVideo;
    if (!this.videoReady || !this.isVideoPlayable(active)) {
      return null;
    }

    const vw = active.videoWidth;
    const vh = active.videoHeight;
    const duration = active.duration;
    const hasValidDuration =
      Number.isFinite(duration) && duration > CROSSFADE_DURATION * 2;

    if (!this.reducedMotion && !document.hidden && hasValidDuration && standby) {
      const timeRemaining = duration - active.currentTime;

      if (!this.isCrossfading && timeRemaining <= CROSSFADE_DURATION) {
        this.isCrossfading = true;
        this.canvas.setAttribute('data-crossfading', 'true');
        if (standby.readyState >= 1) {
          standby.currentTime = 0;
        }
        standby.play().catch(() => {});
      }

      if (this.isCrossfading) {
        const rawAlpha = active.ended
          ? 1
          : clamp(1 - timeRemaining / CROSSFADE_DURATION, 0, 1);
        const alpha = smoothstep(0, 1, rawAlpha);

        if (this.videoMixCanvas.width !== vw || this.videoMixCanvas.height !== vh) {
          this.videoMixCanvas.width = vw;
          this.videoMixCanvas.height = vh;
        }

        const mCtx = this.videoMixCtx;
        mCtx.globalAlpha = 1;
        mCtx.drawImage(active, 0, 0, vw, vh);

        if (this.isVideoPlayable(standby) && alpha > 0) {
          mCtx.globalAlpha = alpha;
          mCtx.drawImage(standby, 0, 0, vw, vh);
        }
        mCtx.globalAlpha = 1;

        if (rawAlpha >= 1 || active.ended || timeRemaining <= 0.016) {
          this.completeCrossfadeSwap();
        }

        return {
          source: this.videoMixCanvas,
          sw: vw,
          sh: vh,
          isLiveVideo: true
        };
      }
    } else if (!this.reducedMotion && !document.hidden && active.ended) {
      active.currentTime = 0;
      active.play().catch(() => {});
    }

    return {
      source: active,
      sw: vw,
      sh: vh,
      isLiveVideo: !active.paused
    };
  }

  private handleResize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(window.innerWidth, 1);
    this.height = Math.max(window.innerHeight, 1);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.glyphScale = this.width <= 768 ? Math.min(this.dpr, 1.5) : 1;
    const gw = Math.max(1, Math.round(this.width * this.glyphScale));
    const gh = Math.max(1, Math.round(this.height * this.glyphScale));
    this.glyphCanvas.width = gw;
    this.glyphCanvas.height = gh;
    this.glyphImageData = this.glyphCtx.createImageData(gw, gh);
    this.glyphBuf32 = new Uint32Array(this.glyphImageData.data.buffer);
    this.pLife.fill(0);
  }

  private handlePointerMove(e: PointerEvent): void {
    if (this.reducedMotion) return;
    const nx = (e.clientX / Math.max(this.width, 1)) * 2 - 1;
    const ny = (e.clientY / Math.max(this.height, 1)) * 2 - 1;
    this.targetPointerX = clamp(nx, -1, 1);
    this.targetPointerY = clamp(ny, -1, 1);
  }

  private getGlyphStamp(fontPx: number, ch: string, weight: 400 | 600 = 400): Int16Array {
    const key = (weight === 600 ? 1000000 : 0) + fontPx * 10000 + ch.charCodeAt(0);
    const cached = this.stampCache.get(key);
    if (cached) return cached;

    const size = this.stampCanvas.width;
    const half = size >> 1;
    const sCtx = this.stampCtx;

    sCtx.clearRect(0, 0, size, size);
    sCtx.fillStyle = '#FFFFFF';
    sCtx.font = `${weight} ${fontPx}px "JetBrains Mono", ui-monospace, SFMono-Regular, Consolas, monospace`;
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.fillText(ch, half, half);

    const data = sCtx.getImageData(0, 0, size, size).data;
    const temp: number[] = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const a = data[(y * size + x) * 4 + 3];
        if (a >= 22) {
          temp.push(x - half, y - half, a);
        }
      }
    }

    const stamp = new Int16Array(temp);
    this.stampCache.set(key, stamp);
    return stamp;
  }

  private blitStamp(
    buf32: Uint32Array,
    gw: number,
    gh: number,
    stamp: Int16Array,
    cx: number,
    cy: number,
    cr: number,
    cg: number,
    cb: number,
    cellAlpha255: number,
    bgAlpha: number
  ): void {
    for (let s = 0; s < stamp.length; s += 3) {
      const px = cx + stamp[s];
      const py = cy + stamp[s + 1];
      if (px < 0 || px >= gw || py < 0 || py >= gh) continue;

      const weight = (stamp[s + 2] * cellAlpha255) >> 8;
      if (weight <= 2) continue;

      const outR = 7 + (((cr - 7) * weight) >> 8);
      const outG = 8 + (((cg - 8) * weight) >> 8);
      const outB = 10 + (((cb - 10) * weight) >> 8);
      const outA = bgAlpha + (((255 - bgAlpha) * weight) >> 8);

      buf32[py * gw + px] = ((outA << 24) | (outB << 16) | (outG << 8) | outR) >>> 0;
    }
  }

  /**
   * Desenha um grão luminoso (1x1 ou 2x2 com brilho aditivo suave) para o modo 02 PARTICLE
   */
  private blitGrain(
    buf32: Uint32Array,
    gw: number,
    gh: number,
    px: number,
    py: number,
    radius: number,
    cr: number,
    cg: number,
    cb: number,
    alpha255: number,
    bgAlpha: number
  ): void {
    if (px < 1 || px >= gw - 1 || py < 1 || py >= gh - 1) return;

    const outR = 7 + (((cr - 7) * alpha255) >> 8);
    const outG = 8 + (((cg - 8) * alpha255) >> 8);
    const outB = 10 + (((cb - 10) * alpha255) >> 8);
    const outA = bgAlpha + (((255 - bgAlpha) * alpha255) >> 8);
    const coreColor = ((outA << 24) | (outB << 16) | (outG << 8) | outR) >>> 0;

    buf32[py * gw + px] = coreColor;

    if (radius >= 2) {
      buf32[py * gw + (px + 1)] = coreColor;
      buf32[(py + 1) * gw + px] = coreColor;
      const edgeA = alpha255 >> 1;
      const eR = 7 + (((cr - 7) * edgeA) >> 8);
      const eG = 8 + (((cg - 8) * edgeA) >> 8);
      const eB = 10 + (((cb - 10) * edgeA) >> 8);
      const eOutA = bgAlpha + (((255 - bgAlpha) * edgeA) >> 8);
      buf32[(py + 1) * gw + (px + 1)] = ((eOutA << 24) | (eB << 16) | (eG << 8) | eR) >>> 0;
    }
  }

  private spawnDriftParticle(
    x: number,
    y: number,
    r: number,
    g: number,
    b: number,
    seed: number,
    scale: number
  ): void {
    const i = this.pCursor;
    this.pCursor = (this.pCursor + 1) % MAX_DRIFT_PARTICLES;

    this.pX[i] = x;
    this.pY[i] = y;
    // Corrente de deriva suave para a esquerda/diagonal como em drift.mp4
    this.pVx[i] = -(34 + seed * 68) * scale;
    this.pVy[i] = (-18 + ((seed * 17.3) % 1) * 32) * scale;
    const maxL = 0.55 + ((seed * 9.7) % 1) * 0.85;
    this.pMaxLife[i] = maxL;
    this.pLife[i] = maxL;
    this.pR[i] = r;
    this.pG[i] = g;
    this.pB[i] = b;
    this.pCharIdx[i] = Math.floor(((seed * 23.1) % 1) * DRIFT_TRAIL_CHARS.length);
  }

  private updateProceduralFallback(timeSec: number): CanvasImageSource {
    const fCtx = this.fallbackCtx;
    const w = this.fallbackCanvas.width;
    const h = this.fallbackCanvas.height;

    fCtx.fillStyle = '#07080A';
    fCtx.fillRect(0, 0, w, h);

    const cx = w * 0.72;
    const cy = h * 0.5;
    const t = this.reducedMotion ? 1.4 : timeSec * 0.55;

    for (let i = 1; i <= 5; i++) {
      const radius = 38 * i + Math.sin(t * 1.4 - i) * 4;
      fCtx.strokeStyle = `rgba(185, 205, 225, ${0.075 - i * 0.011})`;
      fCtx.lineWidth = 1.6;
      fCtx.beginPath();
      fCtx.arc(cx, cy, Math.max(radius, 8), 0, Math.PI * 2);
      fCtx.stroke();
    }

    for (let k = 0; k < 2; k++) {
      const baseAngle = t + k * Math.PI;
      const orbitR = 58;

      for (let seg = 0; seg < 18; seg++) {
        const u = seg / 17;
        const a = baseAngle - u * 1.28;
        const wobble = Math.sin(t * 2.4 + u * 5.2 + k) * 5 * u;
        const r = orbitR + wobble;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r * 0.88;
        const size = (1 - u * 0.78) * 18 * (1 + Math.sin(u * Math.PI) * 0.35);
        const alpha = (1 - u * 0.72) * 0.92;

        const grad = fCtx.createRadialGradient(px, py, 0, px, py, Math.max(size * 1.35, 2));
        grad.addColorStop(0, `rgba(246, 248, 252, ${alpha})`);
        grad.addColorStop(0.55, `rgba(198, 212, 228, ${alpha * 0.65})`);
        grad.addColorStop(1, 'rgba(7, 8, 10, 0)');

        fCtx.fillStyle = grad;
        fCtx.beginPath();
        fCtx.arc(px, py, size * 1.35, 0, Math.PI * 2);
        fCtx.fill();
      }
    }

    return this.fallbackCanvas;
  }

  private getActiveSource(timeSec: number): {
    source: CanvasImageSource;
    sw: number;
    sh: number;
    isLiveVideo: boolean;
  } {
    const videoFrame = this.resolveVideoFrame();
    if (videoFrame) {
      return videoFrame;
    }
    if (this.imageReady && this.imageEl && this.imageEl.naturalWidth > 0) {
      return {
        source: this.imageEl,
        sw: this.imageEl.naturalWidth,
        sh: this.imageEl.naturalHeight,
        isLiveVideo: false
      };
    }
    return {
      source: this.updateProceduralFallback(timeSec),
      sw: this.fallbackCanvas.width,
      sh: this.fallbackCanvas.height,
      isLiveVideo: false
    };
  }

  private computeCoverCrop(sw: number, sh: number, destW: number, destH: number) {
    const overscan = 1.045;
    const targetW = destW * overscan;
    const targetH = destH * overscan;

    const scale = Math.max(targetW / sw, targetH / sh);
    const drawW = sw * scale;
    const drawH = sh * scale;

    const isPortrait = destW / destH < 0.88;
    const anchorX = this.isCustomMedia
      ? 0.5
      : isPortrait
        ? this.config.mobileFocalX
        : this.config.desktopFocalX;
    const anchorY = this.isCustomMedia ? 0.5 : this.config.focalY;

    const parallaxAmpX = this.reducedMotion ? 0 : 14;
    const parallaxAmpY = this.reducedMotion ? 0 : 10;

    const dx = (destW - drawW) * anchorX - this.pointerX * parallaxAmpX;
    const dy = (destH - drawH) * anchorY - this.pointerY * parallaxAmpY;

    return { dx, dy, drawW, drawH };
  }

  private drawRawLayer(
    source: CanvasImageSource,
    sw: number,
    sh: number,
    isLiveVideo: boolean,
    timeSec: number,
    alpha: number
  ): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const { dx, dy, drawW, drawH } = this.computeCoverCrop(sw, sh, w, h);

    ctx.save();
    ctx.globalAlpha = alpha;

    if (this.reducedMotion) {
      ctx.drawImage(source, dx, dy, drawW, drawH);
      ctx.restore();
      return;
    }

    const sliceHeight = 12;
    const waveAmp = isLiveVideo ? 1.15 : 2.6;
    const scaleY = sh / drawH;

    for (let y = 0; y < h; y += sliceHeight) {
      const shSlice = Math.min(sliceHeight, h - y);
      const sy = (y - dy) * scaleY;
      const syHeight = shSlice * scaleY;

      if (sy + syHeight <= 0 || sy >= sh) continue;

      const clampedSy = Math.max(0, sy);
      const clampedSh = Math.min(sh - clampedSy, syHeight);
      if (clampedSh <= 0) continue;

      const wave =
        Math.sin(y * 0.018 + timeSec * 1.35) * waveAmp +
        Math.cos(y * 0.009 - timeSec * 0.85) * (waveAmp * 0.55);

      ctx.drawImage(
        source,
        0,
        clampedSy,
        sw,
        clampedSh,
        dx + wave,
        y + (clampedSy - sy) / scaleY,
        drawW,
        clampedSh / scaleY
      );
    }

    ctx.restore();
  }

  /**
   * 5 estágios contínuos:
   * 01 RAW (0.00–0.18) -> 02 DRIFT micro-ASCII + rastro (0.18–0.40) -> 03 PARTICLE nuvem de grãos (0.40–0.62)
   * -> 04 HYBRID transição p/ binário (0.62–0.82) -> 05 BIN P&B alta legibilidade (0.82–1.00)
   */
  private computeCellSize(p: number): number {
    if (p <= 0.36) {
      // DRIFT: grade fina e detalhada de micro-ASCII (~7.2px) como em drift.mp4
      return 7.2;
    }
    if (p <= 0.62) {
      // PARTICLE: alta densidade de amostragem (~5.6px) para silhueta de poeira luminosa fina
      const toParticle = smoothstep(0.36, 0.45, p);
      return lerp(7.2, 5.6, toParticle);
    }
    if (p <= 0.82) {
      // HYBRID: expande para grade técnica (~11.0px–12.6px)
      const toHybrid = smoothstep(0.58, 0.68, p);
      const hybridBase = lerp(11.0, 12.6, clamp((p - 0.62) / 0.2, 0, 1));
      return lerp(5.6, hybridBase, toHybrid);
    }
    const toBin = smoothstep(0.78, 0.86, p);
    const binBase = lerp(13.4, 14.2, clamp((p - 0.82) / 0.18, 0, 1));
    return lerp(12.6, binBase, toBin);
  }

  private drawGlyphDeconstruction(
    source: CanvasImageSource,
    sw: number,
    sh: number,
    p: number,
    timeSec: number,
    dt: number,
    overlayAlpha: number
  ): number {
    const w = this.width;
    const h = this.height;
    const buf32 = this.glyphBuf32;
    const imgData = this.glyphImageData;
    if (!buf32 || !imgData) return 0;

    const gw = this.glyphCanvas.width;
    const gh = this.glyphCanvas.height;
    const gScale = this.glyphScale;

    const cellSize = this.computeCellSize(p);
    const cols = Math.max(12, Math.ceil(w / cellSize));
    const rows = Math.max(12, Math.ceil(h / cellSize));

    if (this.sampleCanvas.width !== cols || this.sampleCanvas.height !== rows) {
      this.sampleCanvas.width = cols;
      this.sampleCanvas.height = rows;
    }

    const totalCells = cols * rows;
    const hasPrevGrid = this.prevCols === cols && this.prevRows === rows && this.prevLum.length === totalCells;
    if (!hasPrevGrid) {
      this.prevLum = new Float32Array(totalCells);
      this.prevCols = cols;
      this.prevRows = rows;
    }

    this.sampleCtx.fillStyle = '#07080A';
    this.sampleCtx.fillRect(0, 0, cols, rows);

    const crop = this.computeCoverCrop(sw, sh, cols, rows);
    const sampleParallaxScale = cols / Math.max(w, 1);
    const sdx =
      crop.dx + this.pointerX * (this.reducedMotion ? 0 : 14) * (1 - sampleParallaxScale);
    const sdy =
      crop.dy + this.pointerY * (this.reducedMotion ? 0 : 10) * (1 - sampleParallaxScale);

    this.sampleCtx.drawImage(source, sdx, sdy, crop.drawW, crop.drawH);
    const pixels = this.sampleCtx.getImageData(0, 0, cols, rows).data;

    // Histograma rápido (64 bins) com pico real p99.5 para separar figura (peixes) do fundo (água)
    this.histogram.fill(0);
    for (let i = 0; i < pixels.length; i += 4) {
      const lum = (pixels[i] * 77 + pixels[i + 1] * 150 + pixels[i + 2] * 29) >> 8;
      this.histogram[lum >> 2]++;
    }

    let acc = 0;
    let p45Bin = 2;
    let p995Bin = 58;
    const target45 = totalCells * 0.45;
    const target995 = totalCells * 0.995;
    for (let b = 0; b < 64; b++) {
      acc += this.histogram[b];
      if (acc <= target45) p45Bin = b;
      if (acc <= target995) p995Bin = b;
    }
    const floorLum = p45Bin / 63;
    const peakLum = Math.max(floorLum + 0.28, p995Bin / 63);
    const invLumSpan = 1 / (peakLum - floorLum);

    const driftToParticle = smoothstep(0.36, 0.45, p);
    const particleToHybrid = smoothstep(0.58, 0.67, p);
    const hybridToBin = smoothstep(0.78, 0.86, p);

    // Envelope ativo do emissor de partículas derivantes no estágio 02 DRIFT (0.18–0.40)
    const driftEmitterWeight =
      smoothstep(0.14, 0.22, p) * (1 - smoothstep(0.37, 0.48, p));

    const bgAlpha = Math.round(clamp(overlayAlpha, 0, 1) * 255);
    const bgPacked = ((bgAlpha << 24) | (10 << 16) | (8 << 8) | 7) >>> 0;
    buf32.fill(bgPacked);

    const scaledCell = cellSize * gScale;
    const fontPx = Math.max(7, Math.round(scaledCell * 0.98));
    const waveEnabled = !this.reducedMotion;
    let spawnsThisFrame = 0;
    const maxSpawnsPerFrame = 42;

    for (let r = 0; r < rows; r++) {
      const rowWaveOffset = waveEnabled
        ? Math.round(Math.sin(r * 0.22 + timeSec * 1.5) * 0.5)
        : 0;
      const baseCy = Math.round((r + 0.5) * scaledCell);

      for (let c = 0; c < cols; c++) {
        const cellIdx = r * cols + c;
        const sc = clamp(c + rowWaveOffset, 0, cols - 1);
        const idx = (r * cols + sc) * 4;
        const pr = pixels[idx];
        const pg = pixels[idx + 1];
        const pb = pixels[idx + 2];

        const rawLum = (pr * 0.299 + pg * 0.587 + pb * 0.114) / 255;
        const prevL = hasPrevGrid ? this.prevLum[cellIdx] : rawLum;
        this.prevLum[cellIdx] = rawLum;

        const normLum = clamp((rawLum - floorLum) * invLumSpan, 0, 1);

        // Emissão de rastro DRIFT: onde o peixe acabou de passar (queda de luminância) ou bordas luminosas em movimento
        if (
          waveEnabled &&
          driftEmitterWeight > 0.05 &&
          spawnsThisFrame < maxSpawnsPerFrame
        ) {
          const lumDrop = prevL - rawLum;
          const isWake = lumDrop > 0.065 && prevL > 0.22;
          const isGlowingEdge = normLum > 0.26 && normLum < 0.72;
          const hSpawn = cellHash2(c + ((timeSec * 30) | 0), r);

          if ((isWake && hSpawn > 0.35) || (isGlowingEdge && hSpawn > 0.965)) {
            const baseCx = Math.round((c + 0.5) * scaledCell);
            const grayP = Math.min(250, Math.round(Math.max(prevL, rawLum) * 255 + 32));
            const pColR = Math.min(255, Math.round(lerp(grayP, pr, 0.32)));
            const pColG = Math.min(255, Math.round(lerp(grayP, pg, 0.35)));
            const pColB = Math.min(255, Math.round(lerp(grayP + 10, pb, 0.45)));
            this.spawnDriftParticle(baseCx, baseCy, pColR, pColG, pColB, hSpawn, gScale);
            spawnsThisFrame++;
          }
        }

        if (rawLum < 0.03) continue;

        const hVal = cellHash(c, r);
        const hVal2 = cellHash2(c, r);
        const shimmer = waveEnabled
          ? Math.sin(timeSec * 2.3 + hVal * Math.PI * 2) * 0.02
          : 0;
        const sNormLum = clamp(normLum + shimmer, 0, 1);

        // 1 = DRIFT (micro-ASCII + água azul-ardósia + rastro), 2 = PARTICLE (nuvem de grãos), 3 = HYBRID, 4 = BIN
        let mode: 1 | 2 | 3 | 4 = 1;
        if (hybridToBin > 0 && hVal < hybridToBin) {
          mode = 4;
        } else if (particleToHybrid > 0 && hVal < particleToHybrid) {
          mode = 3;
        } else if (driftToParticle > 0 && hVal < driftToParticle) {
          mode = 2;
        }

        const baseCx = Math.round((c + 0.5) * scaledCell);

        if (mode === 2) {
          // ESTÁGIO 3: PARTICLE (baseado em particle.mp4)
          // Fundo preto puro; carpas renderizadas como nuvem densa de grãos finos luminosos com jitter orgânico
          if (normLum < 0.11) continue;

          if (normLum < 0.24 && hVal > (normLum - 0.11) * 5.2) continue;

          const grainCount = normLum > 0.62 ? 3 : normLum > 0.34 ? 2 : 1;
          const jitterAmp = scaledCell * 0.72;
          const gray = Math.min(255, Math.round(normLum * 255 + 24));
          const cr = Math.min(255, Math.round(lerp(gray, pr, 0.52)) + 10);
          const cg = Math.min(255, Math.round(lerp(gray, pg, 0.52)) + 10);
          const cb = Math.min(255, Math.round(lerp(gray, pb, 0.58)) + 12);

          for (let g = 0; g < grainCount; g++) {
            const phase = waveEnabled ? timeSec * 1.6 + g * 2.1 + hVal * 9.0 : g * 2.1;
            const jx = (cellHash(c * 3 + g, r) - 0.5) * jitterAmp + Math.sin(phase) * 0.8 * gScale;
            const jy = (cellHash2(c, r * 3 + g) - 0.5) * jitterAmp + Math.cos(phase * 0.9) * 0.8 * gScale;
            const px = Math.round(baseCx + jx);
            const py = Math.round(baseCy + jy);
            const radius = normLum > 0.58 && g === 0 ? 2 : 1;
            const grainAlpha = Math.round(
              clamp((0.35 + normLum * 0.65) * (g === 0 ? 1 : 0.78), 0.18, 1) * overlayAlpha * 255
            );
            this.blitGrain(buf32, gw, gh, px, py, radius, cr, cg, cb, grainAlpha, bgAlpha);
          }
          continue;
        }

        let ch = '';
        let stampWeight: 400 | 600 = 400;
        let cr = 243;
        let cg = 245;
        let cb = 248;
        let cellAlpha255 = 255;

        if (mode === 1) {
          // ESTÁGIO 2: DRIFT (baseado em drift.mp4)
          // Malha fina e super detalhada de micro-ASCII: água em azul-ardósia sutil + carpas brancas de alta definição
          if (normLum < 0.055) continue;
          const boosted = Math.pow(sNormLum, 0.78);
          const rampIdx = clamp(
            Math.floor(boosted * DRIFT_ASCII_RAMP.length),
            1,
            DRIFT_ASCII_RAMP.length - 1
          );
          ch = DRIFT_ASCII_RAMP[rampIdx];

          if (normLum >= 0.36) {
            // Corpo das carpas super nítido em branco/prata com leve nuance quente/fria (~32% cor)
            if (normLum >= 0.66) stampWeight = 600;
            const gray = Math.min(255, Math.round(170 + boosted * 85));
            cr = Math.min(255, Math.round(lerp(gray, pr, 0.32)));
            cg = Math.min(255, Math.round(lerp(gray, pg, 0.34)));
            cb = Math.min(255, Math.round(lerp(gray + 4, pb, 0.38)));
            cellAlpha255 = Math.round(clamp(0.55 + boosted * 0.45, 0.45, 1) * overlayAlpha * 255);
          } else {
            // Ondulações concêntricas da água em azul-aço frio discreto como em drift.mp4
            const tWater = clamp(normLum / 0.36, 0, 1);
            cr = Math.round(lerp(56, 118, tWater));
            cg = Math.round(lerp(82, 148, tWater));
            cb = Math.round(lerp(116, 186, tWater));
            cellAlpha255 = Math.round(lerp(0.14, 0.56, tWater) * overlayAlpha * 255);
          }
        } else if (mode === 3) {
          // ESTÁGIO 4: HYBRID — cristalização de micro-ASCII/partículas para grade binária monocromática
          if (normLum < 0.065) continue;
          const boosted = Math.pow(normLum, 0.85);
          const rampIdx = clamp(
            Math.floor(boosted * HYBRID_RAMP.length),
            1,
            HYBRID_RAMP.length - 1
          );
          ch = HYBRID_RAMP[rampIdx];
          if (normLum >= 0.62) stampWeight = 600;

          const baseShade = Math.min(248, Math.round(125 + boosted * 123));
          cr = Math.min(255, Math.round(lerp(baseShade, pr, 0.08)));
          cg = Math.min(255, Math.round(lerp(baseShade, pg, 0.08)));
          cb = Math.min(255, Math.round(lerp(Math.min(255, baseShade + 5), pb, 0.1)));

          const alphaFactor =
            normLum < 0.28
              ? lerp(0.10, 0.30, (normLum - 0.065) / 0.215)
              : lerp(0.38, 0.94, clamp((normLum - 0.28) / 0.62, 0, 1));
          cellAlpha255 = Math.round(alphaFactor * overlayAlpha * 255);
        } else {
          // ESTÁGIO 5: BINARY — P&B puro apenas '0' e '1' com separação nítida carpas vs. água
          const bitFlip = waveEnabled && Math.sin(timeSec * 3.0 + hVal * 19.0) > 0.93;

          if (normLum >= 0.52) {
            ch = bitFlip && normLum < 0.68 ? '0' : '1';
            stampWeight = 600;
            const tCore = clamp((normLum - 0.52) / 0.36, 0, 1);
            const shade = Math.round(lerp(236, 255, tCore));
            cr = shade;
            cg = shade;
            cb = shade;
            cellAlpha255 = Math.round(lerp(0.84, 1.0, tCore) * overlayAlpha * 255);
          } else if (normLum >= 0.28) {
            const tEdge = (normLum - 0.28) / 0.24;
            ch = tEdge > 0.58 ? (bitFlip ? '0' : '1') : '0';
            const shade = Math.round(lerp(175, 228, tEdge));
            cr = shade;
            cg = shade;
            cb = shade;
            cellAlpha255 = Math.round(lerp(0.36, 0.76, tEdge) * overlayAlpha * 255);
          } else if (normLum >= 0.065) {
            if (normLum < 0.16 && ((c + r) & 1) !== 0) continue;
            if (normLum < 0.10 && (c & 1) !== 0) continue;
            ch = '0';
            const tWater = (normLum - 0.065) / 0.215;
            const shade = Math.round(lerp(115, 155, tWater));
            cr = shade;
            cg = shade;
            cb = shade;
            cellAlpha255 = Math.round(lerp(0.06, 0.2, tWater * tWater) * overlayAlpha * 255);
          } else {
            continue;
          }
        }

        // Pequena variação orgânica na célula de DRIFT para reforçar textura viva
        const jitterX = mode === 1 && normLum < 0.34 && hVal2 > 0.85 && waveEnabled ? -1 : 0;
        const stamp = this.getGlyphStamp(fontPx, ch, stampWeight);
        this.blitStamp(
          buf32,
          gw,
          gh,
          stamp,
          baseCx + jitterX,
          baseCy,
          cr,
          cg,
          cb,
          cellAlpha255,
          bgAlpha
        );
      }
    }

    // Atualiza e renderiza o pool persistente de partículas voando do estágio DRIFT
    const particleFontPx = Math.max(7, Math.round(6.4 * gScale));
    for (let i = 0; i < MAX_DRIFT_PARTICLES; i++) {
      const life = this.pLife[i];
      if (life <= 0) continue;

      const nextLife = life - dt;
      this.pLife[i] = nextLife;
      if (nextLife <= 0 || driftEmitterWeight <= 0.01) continue;

      if (waveEnabled) {
        this.pX[i] += this.pVx[i] * dt;
        this.pY[i] += (this.pVy[i] + Math.sin(timeSec * 2.4 + i) * 14 * gScale) * dt;
        // Leve desaceleração fluida na água
        this.pVx[i] *= 0.985;
        this.pVy[i] *= 0.985;
      }

      const lifeRatio = clamp(nextLife / this.pMaxLife[i], 0, 1);
      const pAlpha = Math.round(
        lifeRatio * lifeRatio * 0.88 * driftEmitterWeight * overlayAlpha * 255
      );
      if (pAlpha <= 8) continue;

      const ch = DRIFT_TRAIL_CHARS[this.pCharIdx[i]];
      const stamp = this.getGlyphStamp(particleFontPx, ch, 400);
      this.blitStamp(
        buf32,
        gw,
        gh,
        stamp,
        Math.round(this.pX[i]),
        Math.round(this.pY[i]),
        this.pR[i],
        this.pG[i],
        this.pB[i],
        pAlpha,
        bgAlpha
      );
    }

    this.glyphCtx.putImageData(imgData, 0, 0);
    this.ctx.drawImage(this.glyphCanvas, 0, 0, w, h);

    return cellSize;
  }

  private resolveStage(p: number): { index: number; name: RenderStageName } {
    if (p < 0.18) return { index: 0, name: 'RAW' };
    if (p < 0.4) return { index: 1, name: 'DRIFT' };
    if (p < 0.62) return { index: 2, name: 'PARTICLE' };
    if (p < 0.82) return { index: 3, name: 'HYBRID' };
    return { index: 4, name: 'BINARY' };
  }

  private tick(now: number): void {
    const timeSec = (now - this.startTime) * 0.001;
    const dt = clamp((now - this.lastFrameTime) * 0.001, 0.001, 0.05);
    this.lastFrameTime = now;

    this.fpsFrames++;
    if (now - this.fpsWindowStart >= 500) {
      const measuredFps = Math.round((this.fpsFrames * 1000) / (now - this.fpsWindowStart));
      this.canvas.setAttribute('data-fps', String(measuredFps));
      this.fpsFrames = 0;
      this.fpsWindowStart = now;
    }

    this.currentProgress += (this.targetProgress - this.currentProgress) * 0.14;
    if (Math.abs(this.targetProgress - this.currentProgress) < 0.0004) {
      this.currentProgress = this.targetProgress;
    }

    this.pointerX += (this.targetPointerX - this.pointerX) * 0.06;
    this.pointerY += (this.targetPointerY - this.pointerY) * 0.06;

    const p = this.currentProgress;
    const { source, sw, sh, isLiveVideo } = this.getActiveSource(timeSec);

    this.ctx.fillStyle = '#07080A';
    this.ctx.fillRect(0, 0, this.width, this.height);

    let activeCellSize = 0;

    if (p <= 0.13) {
      this.drawRawLayer(source, sw, sh, isLiveVideo, timeSec, 1);
    } else if (p < 0.21) {
      const t = smoothstep(0.13, 0.21, p);
      this.drawRawLayer(source, sw, sh, isLiveVideo, timeSec, 1);
      activeCellSize = this.drawGlyphDeconstruction(
        source,
        sw,
        sh,
        Math.max(p, 0.181),
        timeSec,
        dt,
        t
      );
    } else {
      activeCellSize = this.drawGlyphDeconstruction(source, sw, sh, p, timeSec, dt, 1);
    }

    if (this.onTelemetry) {
      const stage = this.resolveStage(p);
      this.onTelemetry({
        progress: p,
        stageIndex: stage.index,
        stageName: stage.name,
        cellSize: activeCellSize,
        isCustomMedia: this.isCustomMedia,
        mediaLabel: this.mediaLabel
      });
    }

    this.rafId = requestAnimationFrame(this.tick);
  }
}
