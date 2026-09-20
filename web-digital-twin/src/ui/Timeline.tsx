import { useDigitalTwinStore, selectReplayFrames, selectReplayIndex, selectIsReplaying, selectReplayProgress } from '../state/store';
import { useMemo, useRef, useEffect } from 'react';

interface TimelineEvent {
  time: number;
  type: string;
  label: string;
  color: string;
  index: number;
}

const EVENT_COLORS: Record<string, string> = {
  WARNING: '#ffaa00',
  CRITICAL: '#ff3333',
  PIPE_RUPTURE: '#ff3333',
  VALVE_CLOSE: '#ff6644',
  SAFE_LATCHED: '#cc00cc',
  RESET: '#00cc66',
  FAULT: '#cc00cc',
  NORMAL: '#00cc66',
};

export function Timeline() {
  const replayFrames = useDigitalTwinStore(selectReplayFrames);
  const replayIndex = useDigitalTwinStore(selectReplayIndex);
  const isReplaying = useDigitalTwinStore(selectIsReplaying);
  const setReplayIndex = useDigitalTwinStore(s => s.setReplayIndex);

  const events = useMemo((): TimelineEvent[] => {
    const events: TimelineEvent[] = [];
    if (replayFrames.length === 0) return events;

    let lastState = '';
    let lastEvent = '';

    replayFrames.forEach((frame, index) => {
      if (frame.systemState !== lastState) {
        events.push({
          time: frame.simTime,
          type: 'state',
          label: frame.systemState,
          color: EVENT_COLORS[frame.systemState] || '#888',
          index,
        });
        lastState = frame.systemState;
      }

      if (frame.eventType !== 'NONE' && frame.eventType !== lastEvent) {
        events.push({
          time: frame.simTime,
          type: 'event',
          label: frame.eventType,
          color: EVENT_COLORS[frame.eventType] || '#ffaa00',
          index,
        });
        lastEvent = frame.eventType;
      }

      // Detect valve closures
      Object.entries(frame.valves).forEach(([valve, state]) => {
        if (state === 'CLOSED') {
          const prevFrame = replayFrames[index - 1];
          if (prevFrame && prevFrame.valves[valve as keyof typeof prevFrame.valves] === 'OPEN') {
            events.push({
              time: frame.simTime,
              type: 'valve',
              label: `${valve} CLOSED`,
              color: EVENT_COLORS.VALVE_CLOSE,
              index,
            });
          }
        }
      });
    });

    return events;
  }, [replayFrames]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width = canvas.clientWidth * dpr;
      const height = canvas.height = canvas.clientHeight * dpr;
      ctx.scale(dpr, dpr);
      const cssWidth = canvas.clientWidth;
      const cssHeight = canvas.clientHeight;

      ctx.fillStyle = '#0d0d1a';
      ctx.fillRect(0, 0, cssWidth, cssHeight);

      if (replayFrames.length < 2) return;

      const totalDuration = replayFrames[replayFrames.length - 1].simTime;
      if (totalDuration <= 0) return;

      // Time scale
      const timeToX = (time: number) => (time / totalDuration) * cssWidth;

      // Background grid
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        const x = (i / 10) * cssWidth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, cssHeight);
        ctx.stroke();
      }

      // Time labels
      ctx.fillStyle = '#666';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      for (let i = 0; i <= 10; i++) {
        const time = (i / 10) * totalDuration;
        const x = (i / 10) * cssWidth;
        ctx.fillText(`${time.toFixed(0)}s`, x, cssHeight - 2);
      }

      // Event markers
      events.forEach(event => {
        const x = timeToX(event.time);
        const markerHeight = event.type === 'state' ? cssHeight * 0.8 : cssHeight * 0.5;
        const yStart = (cssHeight - markerHeight) / 2;

        // Line
        ctx.strokeStyle = event.color;
        ctx.lineWidth = event.type === 'state' ? 2 : 1;
        ctx.setLineDash(event.type === 'event' ? [4, 4] : []);
        ctx.beginPath();
        ctx.moveTo(x, yStart);
        ctx.lineTo(x, yStart + markerHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        ctx.fillStyle = event.color;
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        const labelY = event.type === 'state' ? yStart - 4 : yStart + markerHeight + 14;
        ctx.fillText(event.label, x, labelY);

        // Dot at top
        ctx.fillStyle = event.color;
        ctx.beginPath();
        ctx.arc(x, yStart, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Current position indicator
      const currentTime = replayFrames[Math.min(replayIndex, replayFrames.length - 1)]?.simTime ?? 0;
      const currentX = timeToX(currentTime);

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(currentX, 0);
      ctx.lineTo(currentX, cssHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      // Current time label
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${currentTime.toFixed(1)}s`, currentX, 16);

      // Progress fill
      if (isReplaying) {
        ctx.fillStyle = 'rgba(0, 204, 102, 0.1)';
        ctx.fillRect(0, 0, currentX, cssHeight);
      }
    };

    draw();
  }, [replayFrames, replayIndex, isReplaying, events]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || replayFrames.length < 2) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const cssWidth = canvasRef.current.clientWidth;
    const totalDuration = replayFrames[replayFrames.length - 1].simTime;
    const targetTime = (x / cssWidth) * totalDuration;

    // Find closest frame
    let closestIndex = 0;
    let minDiff = Infinity;
    replayFrames.forEach((frame, index) => {
      const diff = Math.abs(frame.simTime - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = index;
      }
    });

    setReplayIndex(closestIndex);
  };

  return (
    <div className="timeline-container" ref={containerRef}>
      <div className="timeline-header">
        <h3>TIMELINE</h3>
        <span className="timeline-status">{isReplaying ? '▶ PLAYING' : '⏸ PAUSED'}</span>
      </div>
      <canvas
        ref={canvasRef}
        className="timeline-canvas"
        onClick={handleClick}
        width={800}
        height={60}
        style={{ width: '100%', height: '60px', cursor: 'pointer' }}
      />
      <div className="timeline-legend">
        {Object.entries(EVENT_COLORS).map(([type, color]) => (
          <span key={type} className="legend-item" style={{ borderColor: color }}>
            <span className="legend-color" style={{ backgroundColor: color }} />
            {type}
          </span>
        ))}
      </div>
    </div>
  );
}

export function EventMarkers() {
  const replayFrames = useDigitalTwinStore(selectReplayFrames);

  const events = useMemo(() => {
    const events: Array<{ time: number; label: string; color: string }> = [];
    if (replayFrames.length === 0) return events;

    let lastState = '';
    let lastEvent = '';

    replayFrames.forEach(frame => {
      if (frame.systemState !== lastState) {
        events.push({
          time: frame.simTime,
          label: frame.systemState,
          color: EVENT_COLORS[frame.systemState] || '#888',
        });
        lastState = frame.systemState;
      }

      if (frame.eventType !== 'NONE' && frame.eventType !== lastEvent) {
        events.push({
          time: frame.simTime,
          label: frame.eventType,
          color: EVENT_COLORS[frame.eventType] || '#ffaa00',
        });
        lastEvent = frame.eventType;
      }
    });

    return events;
  }, [replayFrames]);

  if (events.length === 0) return null;

  return (
    <div className="event-markers">
      {events.map((event, index) => (
        <div
          key={index}
          className="event-marker"
          style={{ borderLeftColor: event.color }}
          title={`${event.label} @ ${event.time.toFixed(1)}s`}
        >
          <span className="event-time">{event.time.toFixed(1)}s</span>
          <span className="event-label">{event.label}</span>
        </div>
      ))}
    </div>
  );
}