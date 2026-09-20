import type { ValidatedTelemetry } from '../telemetry';

export interface ReplayFrame {
  timestamp: number;
  simTime: number;
  frame: ValidatedTelemetry;
}

export interface ReplaySession {
  version: number;
  source: string;
  recordedAt: number;
  duration: number;
  frames: ReplayFrame[];
}

export class ReplayManager {
  private frames: ReplayFrame[] = [];
  private isRecording = false;
  private startTime = 0;
  private onFrameRecorded?: (frame: ReplayFrame) => void;

  startRecording(onFrameRecorded?: (frame: ReplayFrame) => void) {
    this.frames = [];
    this.isRecording = true;
    this.startTime = performance.now();
    this.onFrameRecorded = onFrameRecorded;
  }

  stopRecording(): ReplaySession | null {
    if (!this.isRecording) return null;
    this.isRecording = false;

    const session: ReplaySession = {
      version: 1,
      source: 'WEB_DIGITAL_TWIN',
      recordedAt: Date.now(),
      duration: this.frames.length > 0 ? this.frames[this.frames.length - 1].simTime : 0,
      frames: this.frames,
    };

    return session;
  }

  recordFrame(frame: ValidatedTelemetry) {
    if (!this.isRecording) return;

    const replayFrame: ReplayFrame = {
      timestamp: performance.now(),
      simTime: frame.simTime,
      frame,
    };

    this.frames.push(replayFrame);
    this.onFrameRecorded?.(replayFrame);
  }

  getFrames(): ReplayFrame[] {
    return [...this.frames];
  }

  isRecordingActive(): boolean {
    return this.isRecording;
  }

  getFrameCount(): number {
    return this.frames.length;
  }

  exportToJson(): string {
    const session = this.stopRecording();
    if (!session) return '{}';
    return JSON.stringify(session);
  }

  exportToJsonLines(): string {
    const session = this.stopRecording();
    if (!session) return '';
    return session.frames.map(f => JSON.stringify(f)).join('\n');
  }

  static importFromJson(json: string): ReplaySession | null {
    try {
      const parsed = JSON.parse(json);
      if (!parsed.frames || !Array.isArray(parsed.frames)) return null;
      return parsed as ReplaySession;
    } catch {
      return null;
    }
  }

  static importFromJsonLines(jsonLines: string): ReplaySession | null {
    try {
      const lines = jsonLines.trim().split('\n').filter(l => l.length > 0);
      const frames: ReplayFrame[] = lines.map(l => JSON.parse(l));
      return {
        version: 1,
        source: 'WEB_DIGITAL_TWIN',
        recordedAt: Date.now(),
        duration: frames.length > 0 ? frames[frames.length - 1].simTime : 0,
        frames,
      };
    } catch {
      return null;
    }
  }
}

export class ReplayPlayer {
  private frames: ReplayFrame[] = [];
  private currentIndex = 0;
  private isPlaying = false;
  private speed = 1;
  private lastTickTime = 0;
  private animationFrame: number | null = null;
  private onFrame: (frame: ValidatedTelemetry, index: number, total: number) => void;
  private onEnd?: () => void;

  constructor(onFrame: (frame: ValidatedTelemetry, index: number, total: number) => void, onEnd?: () => void) {
    this.onFrame = onFrame;
    this.onEnd = onEnd;
  }

  loadSession(session: ReplaySession) {
    this.frames = session.frames;
    this.currentIndex = 0;
    this.isPlaying = false;
  }

  loadFrames(frames: ReplayFrame[]) {
    this.frames = frames;
    this.currentIndex = 0;
    this.isPlaying = false;
  }

  play() {
    if (this.isPlaying || this.frames.length === 0) return;
    this.isPlaying = true;
    this.lastTickTime = performance.now();
    this.tick();
  }

  pause() {
    this.isPlaying = false;
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  stop() {
    this.pause();
    this.currentIndex = 0;
    if (this.frames.length > 0) {
      this.onFrame(this.frames[0].frame, 0, this.frames.length);
    }
  }

  seek(index: number) {
    const clamped = Math.max(0, Math.min(this.frames.length - 1, index));
    this.currentIndex = clamped;
    if (this.frames[clamped]) {
      this.onFrame(this.frames[clamped].frame, clamped, this.frames.length);
    }
  }

  setSpeed(speed: number) {
    this.speed = Math.max(0.1, Math.min(4, speed));
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getTotalFrames(): number {
    return this.frames.length;
  }

  getProgress(): number {
    if (this.frames.length <= 1) return 0;
    return this.currentIndex / (this.frames.length - 1);
  }

  getCurrentSimTime(): number {
    if (this.currentIndex >= this.frames.length) return 0;
    return this.frames[this.currentIndex].simTime;
  }

  getTotalDuration(): number {
    if (this.frames.length === 0) return 0;
    return this.frames[this.frames.length - 1].simTime;
  }

  isPlayingState(): boolean {
    return this.isPlaying;
  }

  private tick = () => {
    if (!this.isPlaying || this.frames.length === 0) return;

    const now = performance.now();
    const deltaTime = (now - this.lastTickTime) / 1000 * this.speed;
    this.lastTickTime = now;

    const targetSimTime = this.getCurrentSimTime() + deltaTime;

    while (this.currentIndex < this.frames.length - 1 &&
           this.frames[this.currentIndex + 1].simTime <= targetSimTime) {
      this.currentIndex++;
    }

    if (this.currentIndex >= this.frames.length - 1) {
      this.onFrame(this.frames[this.frames.length - 1].frame, this.frames.length - 1, this.frames.length);
      this.pause();
      this.onEnd?.();
      return;
    }

    this.onFrame(this.frames[this.currentIndex].frame, this.currentIndex, this.frames.length);
    this.animationFrame = requestAnimationFrame(this.tick);
  };
}

export function createReplayPlayer(
  onFrame: (frame: ValidatedTelemetry, index: number, total: number) => void,
  onEnd?: () => void
): ReplayPlayer {
  return new ReplayPlayer(onFrame, onEnd);
}