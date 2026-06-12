import { useMemo } from 'react';
import type { HistoryRecord } from '../hooks/useResonanceAnalyzer';
import { regressionResult, theoreticalSpeedOfSound } from '../utils/physics';
import type { RegressionResult } from '../utils/physics';
import { TrendingUp } from 'lucide-react';

interface RegressionPanelProps {
  history: HistoryRecord[];
}

interface Group {
  frequency: number;
  temperature: number;
  records: HistoryRecord[];
  result: RegressionResult;
}

function RegressionPlot({ group }: { group: Group }) {
  const W = 240;
  const H = 130;
  const padL = 34;
  const padB = 22;
  const padT = 10;
  const padR = 10;

  const points = group.records.map((r) => ({ x: r.mode, y: r.length }));
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);

  const minX = 0;
  const maxX = Math.max(...xs) + 1;
  const minY = 0;
  const maxY = Math.max(...ys) * 1.15;

  const sx = (x: number) => padL + ((x - minX) / (maxX - minX)) * (W - padL - padR);
  const sy = (y: number) => H - padB - ((y - minY) / (maxY - minY)) * (H - padT - padB);

  const slopeCm = (group.result.wavelength / 4) * 100;
  const interceptCm = -group.result.endCorrectionMeasured * 100;
  const lineY = (x: number) => slopeCm * x + interceptCm;

  return (
    <svg width={W} height={H} className="regression-plot">
      <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgba(255,255,255,0.2)" />
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgba(255,255,255,0.2)" />

      <line
        x1={sx(minX)}
        y1={sy(lineY(minX))}
        x2={sx(maxX)}
        y2={sy(lineY(maxX))}
        stroke="var(--accent-color)"
        strokeWidth={2}
        strokeDasharray="4 3"
      />

      {points.map((p, i) => (
        <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={4} fill="var(--success-color)" />
      ))}

      <text x={W / 2} y={H - 4} fill="var(--text-secondary)" fontSize={9} textAnchor="middle">
        modo (2n-1)
      </text>
      <text
        x={10}
        y={H / 2}
        fill="var(--text-secondary)"
        fontSize={9}
        textAnchor="middle"
        transform={`rotate(-90 10 ${H / 2})`}
      >
        L (cm)
      </text>
    </svg>
  );
}

export function RegressionPanel({ history }: RegressionPanelProps) {
  const groups = useMemo<Group[]>(() => {
    const byFreq = new Map<number, HistoryRecord[]>();
    for (const r of history) {
      const arr = byFreq.get(r.frequency) ?? [];
      arr.push(r);
      byFreq.set(r.frequency, arr);
    }

    const result: Group[] = [];
    for (const [frequency, records] of byFreq) {
      const res = regressionResult(
        records.map((r) => ({ mode: r.mode, lengthCm: r.length })),
        frequency
      );
      if (res) {
        result.push({
          frequency,
          temperature: records[0].temperature,
          records: records.slice().sort((a, b) => a.mode - b.mode),
          result: res,
        });
      }
    }
    return result.sort((a, b) => b.result.nPoints - a.result.nPoints);
  }, [history]);

  const distinctModesByFreq = useMemo(() => {
    const m = new Map<number, Set<number>>();
    for (const r of history) {
      const s = m.get(r.frequency) ?? new Set<number>();
      s.add(r.mode);
      m.set(r.frequency, s);
    }
    return m;
  }, [history]);

  const bestPending = useMemo(() => {
    let best: { frequency: number; modes: Set<number> } | null = null;
    for (const [frequency, modes] of distinctModesByFreq) {
      if (modes.size < 2 && (!best || modes.size > best.modes.size)) {
        best = { frequency, modes };
      }
    }
    return best;
  }, [distinctModesByFreq]);

  return (
    <div className="glass-panel">
      <div className="panel-title">
        <span>Velocidad por Regresión</span>
        <TrendingUp size={18} color="var(--accent-color)" />
      </div>

      {groups.length === 0 ? (
        <div className="history-empty" style={{ padding: '1rem 0' }}>
          <p>Método de diferencia de modos</p>
          <small>
            Mide la resonancia en al menos <strong>2 modos distintos</strong> (1, 3, 5)
            con el mismo diapasón. La pendiente da v <em>sin</em> suponer la corrección de extremo.
          </small>
          {bestPending && (
            <small style={{ display: 'block', marginTop: '0.75rem', color: 'var(--warning-color)' }}>
              {bestPending.frequency} Hz: tienes el modo {[...bestPending.modes].join(', ')}.
              Captura otro modo para activar el ajuste.
            </small>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {groups.map((group) => {
            const { result } = group;
            const vTheo = theoreticalSpeedOfSound(group.temperature);
            const errorPct = Math.abs(((result.speed - vTheo) / vTheo) * 100);
            const consistent =
              result.speedUncertainty > 0 &&
              Math.abs(result.speed - vTheo) <= result.speedUncertainty;

            return (
              <div key={group.frequency} className="regression-group">
                <div className="regression-head">
                  <span className="regression-freq">{group.frequency} Hz</span>
                  <span className="regression-modes">
                    modos {result.modes.join(', ')} · n={result.nPoints}
                  </span>
                </div>

                <div className="regression-speed">
                  {result.speed.toFixed(1)}
                  {result.speedUncertainty > 0 && (
                    <span className="regression-pm"> ± {result.speedUncertainty.toFixed(1)}</span>
                  )}
                  <span className="regression-unit"> m/s</span>
                </div>

                <RegressionPlot group={group} />

                <div className="regression-metrics">
                  <div>
                    <span className="value-label">λ medida</span>
                    <strong>{(result.wavelength * 100).toFixed(1)} cm</strong>
                  </div>
                  <div>
                    <span className="value-label">Corrección e</span>
                    <strong>{(result.endCorrectionMeasured * 100).toFixed(2)} cm</strong>
                  </div>
                  <div>
                    <span className="value-label">R²</span>
                    <strong>{result.rSquared.toFixed(4)}</strong>
                  </div>
                  <div>
                    <span className="value-label">v teórica</span>
                    <strong>{vTheo.toFixed(1)} m/s</strong>
                  </div>
                </div>

                <div
                  className="regression-verdict"
                  style={{ color: consistent ? 'var(--success-color)' : 'var(--warning-color)' }}
                >
                  {consistent
                    ? `✓ Compatible con la teoría (error ${errorPct.toFixed(2)}%)`
                    : `Desviación ${errorPct.toFixed(2)}% (fuera de ±Δv)`}
                  {result.nPoints === 2 && ' · con un 3ᵉʳ modo, Δv será estadístico'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
