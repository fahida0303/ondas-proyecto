import { useState, useMemo } from 'react';
import type { HistoryRecord } from '../hooks/useResonanceAnalyzer';
import { singlePointResult } from '../utils/physics';
import { Calculator } from 'lucide-react';

interface CalculadorFisicoProps {
  mode: number;
  frequency: number;
  detectedFrequency: number;
  maxAmplitude: number;
  temperature: number;
  diameter: number;
  onSave: (record: HistoryRecord) => void;
  onDismiss: () => void;
}

export function CalculadorFisico({
  mode, frequency, detectedFrequency, maxAmplitude, temperature, diameter, onSave, onDismiss
}: CalculadorFisicoProps) {
  const [lengthCm, setLengthCm] = useState<number | ''>('');

  const hasMeasured = detectedFrequency > 0;
  const [freqSource, setFreqSource] = useState<'nominal' | 'measured'>(
    hasMeasured ? 'measured' : 'nominal'
  );
  const usedFrequency = freqSource === 'measured' && hasMeasured ? detectedFrequency : frequency;
  const freqDeviation = hasMeasured ? detectedFrequency - frequency : 0;

  const preview = useMemo(() => {
    if (lengthCm === '' || Number(lengthCm) <= 0) return null;
    return singlePointResult({
      frequency: usedFrequency,
      lengthCm: Number(lengthCm),
      mode,
      diameterCm: diameter,
      temperature,
    });
  }, [lengthCm, usedFrequency, mode, diameter, temperature]);

  const handleCalculate = () => {
    if (lengthCm === '' || !preview) return;

    const record: HistoryRecord = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      mode,
      frequency,
      detectedFrequency,
      usedFrequency,
      maxAmplitude,
      temperature,
      diameter,
      length: Number(lengthCm),
      theoreticalSpeed: Number(preview.theoreticalSpeed.toFixed(2)),
      experimentalSpeed: Number(preview.experimentalSpeed.toFixed(2)),
      speedUncertainty: Number(preview.speedUncertainty.toFixed(2)),
      errorPercentage: Number(preview.errorPercentage.toFixed(2)),
    };

    onSave(record);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px', borderColor: 'var(--border-active)', boxShadow: '0 0 50px rgba(0,229,255,0.2)' }}>
        <div className="modal-icon" style={{ color: 'var(--accent-color)' }}>
          <Calculator size={56} />
        </div>

        <h2 className="modal-title">Registrar longitud del pico</h2>

        <div className="modal-text" style={{ marginBottom: '1.5rem' }}>
          <p>Amplitud máxima de referencia: <strong>{maxAmplitude}</strong> (unidades relativas).</p>
          <p>Mira la cinta métrica: ¿qué longitud de aire marca el punto donde suena más fuerte?</p>
        </div>

        {hasMeasured && (
          <div className="form-group" style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
            <label className="form-label">Frecuencia para el cálculo</label>
            <div className="predictor-peaks">
              <button
                className={`predictor-peak-chip ${freqSource === 'measured' ? 'active' : ''}`}
                onClick={() => setFreqSource('measured')}
                title="Frecuencia real medida por el micrófono (recomendada)"
              >
                Medida: {detectedFrequency.toFixed(1)} Hz
              </button>
              <button
                className={`predictor-peak-chip ${freqSource === 'nominal' ? 'active' : ''}`}
                onClick={() => setFreqSource('nominal')}
                title="Frecuencia nominal grabada en el diapasón"
              >
                Nominal: {frequency} Hz
              </button>
            </div>
            {Math.abs(freqDeviation) > 2 && (
              <span className="form-hint" style={{ color: 'var(--warning-color)' }}>
                Tu fuente suena {Math.abs(freqDeviation).toFixed(1)} Hz {freqDeviation > 0 ? 'por encima' : 'por debajo'} de la nominal: usar la medida reduce el error en v = f·λ.
              </span>
            )}
          </div>
        )}

        <div className="form-group" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
          <label className="form-label">Longitud de aire L medida (cm)</label>
          <input
            type="number"
            className="form-input"
            style={{ fontSize: '1.5rem', textAlign: 'center', fontWeight: 'bold' }}
            value={lengthCm}
            onChange={(e) => setLengthCm(e.target.value === '' ? '' : Number(e.target.value))}
            autoFocus
            min="0"
            step="0.1"
            placeholder="ej. 16.5"
          />
        </div>

        {preview && (
          <div className="calc-preview">
            <div className="calc-preview-main">
              <span className="calc-preview-value">
                {preview.experimentalSpeed.toFixed(1)}
                <span className="calc-preview-pm"> ± {preview.speedUncertainty.toFixed(1)}</span>
                <span className="calc-preview-unit"> m/s</span>
              </span>
              <span
                className="calc-preview-error"
                style={{ color: preview.errorPercentage > 5 ? 'var(--danger-color)' : 'var(--success-color)' }}
              >
                {preview.errorPercentage.toFixed(2)}% vs teórico
              </span>
            </div>
            <div className="calc-preview-sub">
              <span>λ = {(preview.wavelength * 100).toFixed(1)} cm</span>
              <span>v teórica = {preview.theoreticalSpeed.toFixed(1)} m/s</span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn" style={{ background: 'rgba(255,255,255,0.1)' }} onClick={onDismiss}>
            Descartar Pico
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCalculate}
            disabled={!preview}
          >
            Calcular y Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
