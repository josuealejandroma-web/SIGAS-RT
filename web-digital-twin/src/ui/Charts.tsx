import { useDigitalTwinStore, selectFrameHistory } from '../state/store';
import { useMemo, useRef, useEffect } from 'react';
import type { ValidatedTelemetry } from '../telemetry';

interface ChartDataPoint {
  time: number;
  value: number;
}

interface ChartConfig {
  id: string;
  label: string;
  color: string;
  extractor: (frame: ValidatedTelemetry) => number | null;
  min: number;
  max: number;
  unit: string;
}

const CHART_CONFIGS: ChartConfig[] = [
  {
    id: 'PL',
    label: 'PL Pressure',
    color: '#ff6644',
    extractor: f => f.pressure?.PL ?? null,
    min: 0,
    max: 30,
    unit: 'mbar',
  },
  {
    id: 'living_flow',
    label: 'Living Flow',
    color: '#44aaff',
    extractor: f => f.flow?.living ?? null,
    min: 0,
    max: 20,
    unit: 'L/min',
  },
  {
    id: 'Z3_gas',
    label: 'Gas Z3 (Living)',
    color: '#ffaa00',
    extractor: f => f.gas?.Z3?.adc ?? null,
    min: 0,
    max: 4095,
    unit: 'ADC',
  },
];

export function LiveCharts() {
  const latestFrame = useDigitalTwinStore(s => s.latestFrame);
  const massFlow = latestFrame?.flowUnit === 'kg/s' || latestFrame?.source === 'MATLAB_SIM';
  const configs = useMemo(() => CHART_CONFIGS.map(c => c.id === 'living_flow' && massFlow ? {...c, unit: 'kg/s', max: Math.max(0.001, ...useDigitalTwinStore.getState().frameHistory.map(f => Math.abs(f.flow.living))) * 1.1} : c), [massFlow, latestFrame?.runId]);
  const frameHistory = useDigitalTwinStore(selectFrameHistory);
  const canvasRefs = useRef<Record<string, HTMLCanvasElement>>({});
  const animationRef = useRef<number | null>(null);

  const chartData = useMemo(() => {
    const data: Record<string, ChartDataPoint[]> = {};
    const maxPoints = 180;

    configs.forEach(config => {
      data[config.id] = [];
    });

    const recentFrames = frameHistory.slice(-maxPoints);
    recentFrames.forEach(frame => {
      const time = frame.simTime;
      configs.forEach(config => {
        const value = config.extractor(frame);
        if (value !== null) {
          data[config.id].push({ time, value });
        }
      });
    });

    return data;
  }, [frameHistory, configs]);

  const selectedChartId = useRef<string>(CHART_CONFIGS[0].id);

  useEffect(() => {
    const draw = () => {
      configs.forEach(config => {
        const canvas = canvasRefs.current[config.id];
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const points = chartData[config.id];
        const dpr = window.devicePixelRatio || 1;
        const width = canvas.width = canvas.clientWidth * dpr;
        const height = canvas.height = canvas.clientHeight * dpr;
        ctx.scale(dpr, dpr);
        const cssWidth = canvas.clientWidth;
        const cssHeight = canvas.clientHeight;

        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, cssWidth, cssHeight);

        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
          const y = (i / 4) * cssHeight;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(cssWidth, y);
          ctx.stroke();
        }

        ctx.fillStyle = '#888';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
          const val = config.max - (i / 4) * (config.max - config.min);
          const y = (i / 4) * cssHeight + 3;
          ctx.fillText(`${(config.unit === 'kg/s' ? val.toExponential(1) : val.toFixed(0))}${config.unit}`, cssWidth - 4, y);
        }

        if (points.length > 1) {
          ctx.strokeStyle = config.color;
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();

          points.forEach((point, i) => {
            const x = ((point.time - points[0].time) / Math.max(0.001, points[points.length - 1].time - points[0].time)) * cssWidth;
            const y = cssHeight - ((point.value - config.min) / (config.max - config.min)) * cssHeight;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });

          ctx.stroke();

          const lastPoint = points[points.length - 1];
          const lastX = cssWidth;
          const lastY = cssHeight - ((lastPoint.value - config.min) / (config.max - config.min)) * cssHeight;

          ctx.fillStyle = config.color;
          ctx.beginPath();
          ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = config.color;
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'right';
          ctx.fillText(`${lastPoint.value.toPrecision(3)}${config.unit}`, lastX - 8, lastY - 8);
        }

        ctx.fillStyle = '#fff';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(config.label, 8, 16);

        if (selectedChartId.current === config.id) {
          ctx.strokeStyle = config.color;
          ctx.lineWidth = 2;
          ctx.strokeRect(1, 1, cssWidth - 2, cssHeight - 2);
        }
      });

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [chartData, configs]);

  return (
    <div className="charts-container">
      <div className="charts-header">
        <h3>HISTORIAL DEL ESCENARIO</h3>
        <div className="chart-selector">
          {configs.map(config => (
            <button
              key={config.id}
              className={`chart-select-btn ${selectedChartId.current === config.id ? 'active' : ''}`}
              onClick={() => { selectedChartId.current = config.id; }}
              style={{ borderColor: config.color }}
            >
              {config.label}
            </button>
          ))}
        </div>
      </div>

      <div className="charts-grid">
        {configs.map(config => (
          <div key={config.id} className={`chart-wrapper ${selectedChartId.current === config.id ? 'selected' : ''}`}>
            <canvas
              ref={el => { if (el) canvasRefs.current[config.id] = el; }}
              className="chart-canvas"
              width={400}
              height={150}
            />
          </div>
        ))}
      </div>

      <div className="chart-time-window">
        Últimas 180 muestras · tiempo simulado
      </div>
    </div>
  );
}

export function MiniChart({ data, color, min, max, label, unit }: {
  data: ChartDataPoint[];
  color: string;
  min: number;
  max: number;
  label: string;
  unit: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width = canvas.clientWidth * dpr;
    const height = canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    if (data.length < 2) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();

    data.forEach((point, i) => {
      const x = (i / (data.length - 1)) * cssWidth;
      const y = cssHeight - ((point.value - min) / (max - min)) * cssHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();
  }, [data, color, min, max]);

  return (
    <div className="mini-chart" title={label}>
      <canvas ref={canvasRef} className="mini-chart-canvas" width={120} height={40} />
      <div className="mini-chart-label">{label}</div>
    </div>
  );
}
