import { useEffect, useRef, useState } from 'react';
import {
  theoreticalSpeedOfSound,
  endCorrection,
  predictedResonances,
  resonanceResponse,
  nearestResonance,
} from '../utils/physics';
import { AudioWaveform } from 'lucide-react';

// Modelo físico exacto de la onda en la columna de aire (tubo cerrado por el
// agua, abierto en la boca), dibujado a escala real en cm.
//
// A diferencia de una caricatura de "modo m", aquí el número de onda lo fija
// la frecuencia del diapasón: k = 2π/λ con λ = v(T)/f. La superficie del agua
// impone siempre un nodo de desplazamiento, así que la respuesta forzada es
//
//   s(x,t) = A·sin(kx)·cos(ωt)          (desplazamiento, x desde el agua)
//   p(x,t) = −ρv²·∂s/∂x ∝ −cos(kx)·cos(ωt)   (presión acústica)
//
// El antinodo abierto solo coincide con la boca cuando L+e = m·λ/4 (m impar):
// el modo no se impone, emerge de la longitud de columna, igual que en el
// experimento. La amplitud A sigue la misma curva lorentziana que usa el
// Predictor (resonanceResponse), y e = 0.3·D es la misma corrección de
// extremo que usa la calculadora: ninguna magnitud se inventa aquí.

interface StandingWaveModelProps {
  frequency: number;
  temperature: number;
  diameter: number;
  airColumnCm: number;
  tubeLengthCm: number;
}

// Periodo visual de una oscilación completa (s); el factor de ralentizado
// mostrado es f·DISPLAY_PERIOD_S.
const DISPLAY_PERIOD_S = 3;

function niceStep(range: number): number {
  const raw = range / 6;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const frac = raw / pow;
  if (frac < 1.5) return pow;
  if (frac < 3.5) return 2 * pow;
  if (frac < 7.5) return 5 * pow;
  return 10 * pow;
}

export function StandingWaveModel({
  frequency,
  temperature,
  diameter,
  airColumnCm,
  tubeLengthCm,
}: StandingWaveModelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const [showPressure, setShowPressure] = useState(true);
  const [showEnvelope, setShowEnvelope] = useState(true);

  const speed = theoreticalSpeedOfSound(temperature);
  const lambdaCm = (speed / frequency) * 100;
  const eCm = endCorrection(diameter) * 100;
  const effectiveLengthCm = airColumnCm + eCm;

  const peaks = predictedResonances(frequency, temperature, diameter, tubeLengthCm);
  const response = resonanceResponse(airColumnCm, peaks);
  const nearest = nearestResonance(airColumnCm, peaks);
  const atResonance = nearest !== null && Math.abs(nearest.deltaCm) < 0.4;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const k = (2 * Math.PI) / lambdaCm; // rad/cm, fijado por f y v(T)
    const L = airColumnCm;
    const xMax = Math.max(effectiveLengthCm, 0.001);
    // La forma sin(kx) es exacta; la escala vertical es la respuesta
    // lorentziana normalizada (la amplitud absoluta depende de cuán fuerte
    // se golpee el diapasón, no de la física del tubo).
    const ampScale = 0.06 + 0.94 * response;

    const draw = (nowMs: number) => {
      ctx.clearRect(0, 0, width, height);

      const padL = 14;
      const padR = 56;
      const padT = 26;
      const padB = 30;
      const plotW = width - padL - padR;
      const cy = padT + (height - padT - padB) / 2;
      const waveMaxPx = (height - padT - padB) / 2 - 12;
      const px = (xCm: number) => padL + (xCm / xMax) * plotW;

      const phase = Math.cos((2 * Math.PI * (nowMs / 1000)) / DISPLAY_PERIOD_S);
      const ampPx = waveMaxPx * ampScale;

      // Tubo a escala: paredes hasta la boca (x = L), agua a la izquierda.
      const wallTop = cy - waveMaxPx - 8;
      const wallBottom = cy + waveMaxPx + 8;
      ctx.fillStyle = 'rgba(20, 136, 214, 0.35)';
      ctx.fillRect(px(0) - 12, wallTop, 12, wallBottom - wallTop);
      ctx.strokeStyle = 'rgba(43, 166, 236, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px(0), wallTop);
      ctx.lineTo(px(0), wallBottom);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px(0), wallTop);
      ctx.lineTo(px(L), wallTop);
      ctx.moveTo(px(0), wallBottom);
      ctx.lineTo(px(L), wallBottom);
      ctx.stroke();

      // Corrección de extremo: el antinodo efectivo queda a e fuera de la boca.
      if (eCm > 0.01) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(px(L), wallTop);
        ctx.lineTo(px(xMax), wallTop);
        ctx.moveTo(px(L), wallBottom);
        ctx.lineTo(px(xMax), wallBottom);
        ctx.moveTo(px(xMax), wallTop);
        ctx.lineTo(px(xMax), wallBottom);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`+e = ${eCm.toFixed(1)} cm`, px(L) + 3, wallTop - 5);
      }

      // Eje de equilibrio y escala en cm.
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px(0), cy);
      ctx.lineTo(px(xMax), cy);
      ctx.stroke();

      const step = niceStep(xMax);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      for (let x = 0; x <= xMax + 0.001; x += step) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.moveTo(px(x), wallBottom + 2);
        ctx.lineTo(px(x), wallBottom + 7);
        ctx.stroke();
        ctx.fillText(`${Number(x.toFixed(1))}`, px(x), wallBottom + 18);
      }
      ctx.textAlign = 'left';
      ctx.fillText('cm', px(xMax) + 8, wallBottom + 18);

      const numPoints = 400;

      // Envolvente ±sin(kx): solo toca la pared del tubo en los antinodos reales.
      if (showEnvelope) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1;
        for (const sign of [1, -1]) {
          ctx.beginPath();
          for (let i = 0; i <= numPoints; i++) {
            const x = (i / numPoints) * xMax;
            const y = cy - sign * ampPx * Math.abs(Math.sin(k * x));
            if (i === 0) ctx.moveTo(px(x), y);
            else ctx.lineTo(px(x), y);
          }
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      // Presión acústica p ∝ −cos(kx)·cos(ωt): cuadratura espacial exacta con
      // el desplazamiento, antinodo de presión contra el agua.
      if (showPressure) {
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i <= numPoints; i++) {
          const x = (i / numPoints) * xMax;
          const y = cy - ampPx * -Math.cos(k * x) * phase;
          if (i === 0) ctx.moveTo(px(x), y);
          else ctx.lineTo(px(x), y);
        }
        ctx.stroke();
      }

      // Desplazamiento s = A·sin(kx)·cos(ωt): nodo exacto en el agua, siempre.
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i <= numPoints; i++) {
        const x = (i / numPoints) * xMax;
        const y = cy - ampPx * Math.sin(k * x) * phase;
        if (i === 0) ctx.moveTo(px(x), y);
        else ctx.lineTo(px(x), y);
      }
      ctx.stroke();

      // Nodos (x = nλ/2) y antinodos (x = (2n+1)λ/4) de desplazamiento en sus
      // posiciones reales — existan o no dentro del tubo en resonancia.
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      for (let n = 0; n * (lambdaCm / 2) <= xMax + 0.001 && n < 60; n++) {
        const x = n * (lambdaCm / 2);
        ctx.fillStyle = '#00e5ff';
        ctx.beginPath();
        ctx.arc(px(x), cy, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText('N', px(x), wallTop - 5);
      }
      ctx.fillStyle = '#00ff88';
      for (let n = 0; (2 * n + 1) * (lambdaCm / 4) <= xMax + 0.001 && n < 60; n++) {
        const x = (2 * n + 1) * (lambdaCm / 4);
        ctx.fillText('A', px(x), wallTop - 5);
      }

      // Etiquetas de los extremos.
      ctx.fillStyle = 'rgba(127, 184, 232, 0.85)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.save();
      ctx.translate(px(0) - 18, cy);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText('agua (nodo)', 0, 0);
      ctx.restore();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.save();
      ctx.translate(px(L) + (eCm > 0.01 ? 40 : 14), cy);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText('boca (abierto)', 0, 0);
      ctx.restore();

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      observer.disconnect();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [
    frequency,
    temperature,
    diameter,
    airColumnCm,
    tubeLengthCm,
    lambdaCm,
    eCm,
    effectiveLengthCm,
    response,
    showPressure,
    showEnvelope,
  ]);

  const slowdown = Math.round(frequency * DISPLAY_PERIOD_S);

  return (
    <div className="glass-panel">
      <div className="panel-title">
        <span>Onda Estacionaria — Modelo Físico</span>
        <AudioWaveform size={18} color="var(--accent-color)" />
      </div>

      <p className="form-hint" style={{ marginTop: '-0.5rem' }}>
        Dibujada a escala con k = 2πf/v(T): la frecuencia fija la longitud de onda y el agua impone
        el nodo. El antinodo cae en la boca <strong>solo</strong> si L + e = m·λ/4 (m impar).
        Animación ralentizada ×{slowdown.toLocaleString('es')}.
      </p>

      {airColumnCm < 0.5 ? (
        <div className="swm-empty">Sube la columna de aire en el Predictor para ver la onda.</div>
      ) : (
        <div className="swm-canvas-wrap">
          <canvas ref={canvasRef} className="swm-canvas" />
        </div>
      )}

      <div className="swm-toggles">
        <span className="swm-chip swm-chip-displacement">— s(x,t) desplazamiento</span>
        <button
          className={`predictor-peak-chip ${showPressure ? 'active' : ''}`}
          onClick={() => setShowPressure((v) => !v)}
        >
          p(x,t) presión
        </button>
        <button
          className={`predictor-peak-chip ${showEnvelope ? 'active' : ''}`}
          onClick={() => setShowEnvelope((v) => !v)}
        >
          envolvente
        </button>
      </div>

      <div className="swm-readout">
        <div>
          <span className="value-label">v (a {temperature} °C)</span>
          <div className="swm-value">{speed.toFixed(1)} m/s</div>
        </div>
        <div>
          <span className="value-label">λ = v/f</span>
          <div className="swm-value">{lambdaCm.toFixed(1)} cm</div>
        </div>
        <div>
          <span className="value-label">L + e</span>
          <div className="swm-value">{effectiveLengthCm.toFixed(1)} cm</div>
        </div>
        <div>
          <span className="value-label">(L + e) / (λ/4)</span>
          <div
            className="swm-value"
            style={{ color: atResonance ? 'var(--success-color)' : 'var(--text-primary)' }}
          >
            {(effectiveLengthCm / (lambdaCm / 4)).toFixed(2)}
          </div>
        </div>
      </div>

      <div
        className="swm-status"
        style={{
          borderColor: atResonance ? 'var(--success-color)' : 'var(--border-color)',
          color: atResonance ? 'var(--success-color)' : 'var(--text-secondary)',
        }}
      >
        {atResonance && nearest ? (
          <>
            En resonancia: <strong>Modo {nearest.peak.mode}</strong> — el cociente (L+e)/(λ/4) ≈{' '}
            {nearest.peak.mode} (impar) y el antinodo queda en la boca.
          </>
        ) : nearest ? (
          <>
            Fuera de resonancia: el nodo sigue en el agua pero el antinodo no coincide con la boca.
            Falta {Math.abs(nearest.deltaCm).toFixed(1)} cm para el Modo {nearest.peak.mode}.
          </>
        ) : (
          <>El tubo es demasiado corto: ninguna columna alcanza λ/4 − e a esta frecuencia.</>
        )}
      </div>
    </div>
  );
}
