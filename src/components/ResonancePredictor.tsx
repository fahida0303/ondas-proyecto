import { useState, useMemo, useEffect } from 'react';
import {
  predictedResonances,
  resonanceResponse,
  nearestResonance,
  theoreticalSpeedOfSound,
} from '../utils/physics';
import { Crosshair, ArrowUp, ArrowDown, CheckCircle2 } from 'lucide-react';

interface ResonancePredictorProps {
  frequency: number;
  temperature: number;
  diameter: number;
  /** Reporta la fracción de agua (0..1) para el nivel del tubo 3D. */
  onSimulatedWater: (fraction: number) => void;
}

export function ResonancePredictor({
  frequency,
  temperature,
  diameter,
  onSimulatedWater,
}: ResonancePredictorProps) {
  const [tubeLengthCm, setTubeLengthCm] = useState(50);
  const [airColumnCm, setAirColumnCm] = useState(8);

  const peaks = useMemo(
    () => predictedResonances(frequency, temperature, diameter, tubeLengthCm),
    [frequency, temperature, diameter, tubeLengthCm]
  );

  const v = theoreticalSpeedOfSound(temperature);
  const lambdaCm = (v / frequency) * 100;

  const response = resonanceResponse(airColumnCm, peaks);
  const responsePct = Math.round(response * 100);
  const nearest = nearestResonance(airColumnCm, peaks);

  // El nivel de agua del tubo 3D refleja siempre el slider del predictor.
  useEffect(() => {
    const fraction = Math.max(0, Math.min(1, 1 - airColumnCm / tubeLengthCm));
    onSimulatedWater(fraction);
  }, [airColumnCm, tubeLengthCm, onSimulatedWater]);

  // --- Curva de respuesta (SVG) ---
  const W = 300;
  const H = 120;
  const padL = 8;
  const padR = 8;
  const padT = 8;
  const padB = 20;

  const sx = (l: number) => padL + (l / tubeLengthCm) * (W - padL - padR);
  const sy = (r: number) => H - padB - r * (H - padT - padB);

  const curvePath = useMemo(() => {
    const N = 240;
    let d = '';
    for (let i = 0; i <= N; i++) {
      const l = (i / N) * tubeLengthCm;
      const r = resonanceResponse(l, peaks);
      d += `${i === 0 ? 'M' : 'L'} ${sx(l).toFixed(1)} ${sy(r).toFixed(1)} `;
    }
    return d;
  }, [peaks, tubeLengthCm]);

  return (
    <div className="glass-panel">
      <div className="panel-title">
        <span>Predictor de Resonancia</span>
        <Crosshair size={18} color="var(--accent-color)" />
      </div>

      <p className="form-hint" style={{ marginTop: '-0.5rem' }}>
        Indica el largo del tubo y mueve el nivel del agua: la app te dice dónde
        <strong> debería sonar más fuerte</strong> (λ = {lambdaCm.toFixed(1)} cm, picos cada {(lambdaCm / 2).toFixed(1)} cm).
      </p>

      <div className="value-grid">
        <div className="form-group">
          <label className="form-label">Largo del tubo (cm)</label>
          <input
            type="number"
            className="form-input"
            value={tubeLengthCm}
            min={5}
            max={200}
            step={1}
            onChange={(e) => {
              const v = Number(e.target.value);
              setTubeLengthCm(v);
              if (airColumnCm > v) setAirColumnCm(v);
            }}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Columna de aire (cm)</label>
          <input
            type="number"
            className="form-input"
            value={Number(airColumnCm.toFixed(1))}
            min={0}
            max={tubeLengthCm}
            step={0.1}
            onChange={(e) => setAirColumnCm(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Curva de respuesta esperada */}
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="predictor-plot" preserveAspectRatio="none">
        {/* relleno bajo la curva */}
        <path d={`${curvePath} L ${sx(tubeLengthCm)} ${sy(0)} L ${sx(0)} ${sy(0)} Z`} fill="rgba(0,229,255,0.12)" />
        {/* curva */}
        <path d={curvePath} fill="none" stroke="var(--accent-color)" strokeWidth={2} />

        {/* marcas de cada resonancia */}
        {peaks.map((p) => (
          <g key={p.mode}>
            <line x1={sx(p.lengthCm)} y1={sy(1)} x2={sx(p.lengthCm)} y2={sy(0)} stroke="rgba(0,255,136,0.4)" strokeDasharray="3 3" />
            <text x={sx(p.lengthCm)} y={H - 6} fill="var(--success-color)" fontSize={9} textAnchor="middle">
              {p.lengthCm.toFixed(0)}
            </text>
          </g>
        ))}

        {/* posición actual del nivel de agua */}
        <line x1={sx(airColumnCm)} y1={padT} x2={sx(airColumnCm)} y2={H - padB} stroke="var(--warning-color)" strokeWidth={2} />
        <circle cx={sx(airColumnCm)} cy={sy(response)} r={5} fill="var(--warning-color)" />
      </svg>

      {/* slider grande para el nivel de agua */}
      <input
        type="range"
        min={0}
        max={tubeLengthCm}
        step={0.1}
        value={airColumnCm}
        onChange={(e) => setAirColumnCm(Number(e.target.value))}
        className="predictor-slider"
      />

      {/* lectura de intensidad esperada */}
      <div className="predictor-readout">
        <div>
          <span className="value-label">Intensidad esperada</span>
          <div className="predictor-pct" style={{ color: responsePct > 80 ? 'var(--success-color)' : 'var(--accent-color)' }}>
            {responsePct}%
          </div>
        </div>
        <div className="predictor-bar-track">
          <div className="predictor-bar-fill" style={{ width: `${responsePct}%` }} />
        </div>
      </div>

      {/* guía: hacia dónde mover el agua */}
      {nearest && (
        <div
          className="predictor-guidance"
          style={{
            borderColor: Math.abs(nearest.deltaCm) < 0.4 ? 'var(--success-color)' : 'var(--warning-color)',
            color: Math.abs(nearest.deltaCm) < 0.4 ? 'var(--success-color)' : 'var(--text-primary)',
          }}
        >
          {Math.abs(nearest.deltaCm) < 0.4 ? (
            <>
              <CheckCircle2 size={20} />
              <span>¡Aquí! Resonancia del <strong>Modo {nearest.peak.mode}</strong> en L = {nearest.peak.lengthCm.toFixed(1)} cm.</span>
            </>
          ) : nearest.deltaCm > 0 ? (
            <>
              <ArrowDown size={20} />
              <span>
                <strong>Baja el agua ≈ {nearest.deltaCm.toFixed(1)} cm</strong> (alarga la columna) para el Modo {nearest.peak.mode} en {nearest.peak.lengthCm.toFixed(1)} cm.
              </span>
            </>
          ) : (
            <>
              <ArrowUp size={20} />
              <span>
                <strong>Sube el agua ≈ {Math.abs(nearest.deltaCm).toFixed(1)} cm</strong> (acorta la columna) para el Modo {nearest.peak.mode} en {nearest.peak.lengthCm.toFixed(1)} cm.
              </span>
            </>
          )}
        </div>
      )}

      {peaks.length === 0 && (
        <div className="predictor-guidance" style={{ borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }}>
          <span>El tubo es demasiado corto para resonar a {frequency} Hz. Necesitas al menos {((lambdaCm / 4)).toFixed(1)} cm de aire.</span>
        </div>
      )}

      {/* lista de resonancias predichas */}
      {peaks.length > 0 && (
        <div className="predictor-peaks">
          {peaks.map((p) => (
            <button
              key={p.mode}
              className={`predictor-peak-chip ${Math.abs(airColumnCm - p.lengthCm) < 0.4 ? 'active' : ''}`}
              onClick={() => setAirColumnCm(p.lengthCm)}
              title={`Ir al Modo ${p.mode}`}
            >
              Modo {p.mode}: {p.lengthCm.toFixed(1)} cm
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
