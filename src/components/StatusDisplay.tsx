import type { AnalyzerStatus } from '../hooks/useResonanceAnalyzer';
import { AlertTriangle, CheckCircle2, ClipboardPen } from 'lucide-react';

interface StatusDisplayProps {
  status: AnalyzerStatus;
  currentAmplitude: number;
  maxAmplitude: number;
  detectedFrequency: number;
  dominantFrequency: number;
  targetFrequency: number;
  resonanceLevel: number;
  maxFound: boolean;
  isClipping?: boolean;
  onRegister: () => void;
}

export function StatusDisplay({
  status,
  currentAmplitude,
  maxAmplitude,
  detectedFrequency,
  dominantFrequency,
  targetFrequency,
  resonanceLevel,
  maxFound,
  isClipping = false,
  onRegister
}: StatusDisplayProps) {

  const freqDeviation = detectedFrequency > 0 ? detectedFrequency - targetFrequency : null;
  const freqOnTarget = freqDeviation !== null && Math.abs(freqDeviation) <= 2;

  const getStatusText = () => {
    switch (status) {
      case 'idle': return 'Inactivo';
      case 'calibrating': return 'Calibrando ruido ambiental...';
      case 'waiting': return 'Esperando diapasón...';
      case 'stabilizing': return 'Estabilizando señal...';
      case 'measuring': return 'Midiendo resonancia...';
      default: return '';
    }
  };

  const getStatusDotClass = () => {
    switch (status) {
      case 'idle': return 'inactive';
      case 'calibrating': return 'waiting';
      case 'waiting':
      case 'stabilizing': return 'waiting';
      case 'measuring': return 'active';
      default: return 'inactive';
    }
  };

  return (
    <div className="glass-panel" style={{ overflow: 'hidden' }}>
      
      {/* Clipping Warning Overlay */}
      <div 
        className="clipping-overlay"
        style={{ opacity: isClipping ? 1 : 0 }}
      >
        <div className="clipping-content animate-bounce">
          <AlertTriangle size={48} style={{ margin: '0 auto' }} />
          <h3>¡Micrófono Saturado!</h3>
          <p>Aleja la fuente de sonido.</p>
        </div>
      </div>

      <div className="panel-title">
        <span>Estado de Análisis</span>
        <div className="status-badge" style={{ animation: status === 'calibrating' ? 'pulseGlow 2s infinite' : 'none' }}>
          <div className={`status-dot ${getStatusDotClass()}`}></div>
          <span>{getStatusText()}</span>
        </div>
      </div>

      <div className="value-grid">
        <div className="value-card">
          <div className="value-label">Amplitud Actual</div>
          <div className="value-number accent">{currentAmplitude}</div>
        </div>
        <div className="value-card">
          <div className="value-label">Amplitud Máxima</div>
          <div className="value-number warning">{maxAmplitude}</div>
        </div>
      </div>

      <div className="freq-readout">
        <div>
          <span className="value-label">Frecuencia detectada (FFT)</span>
          <div
            className="freq-readout-value"
            style={{ color: detectedFrequency > 0 ? 'var(--accent-color)' : 'var(--text-secondary)' }}
          >
            {detectedFrequency > 0 ? `${detectedFrequency.toFixed(1)} Hz` : '—'}
          </div>
          {detectedFrequency === 0 && dominantFrequency === 0 && (status === 'measuring' || status === 'waiting' || status === 'stabilizing') && (
            <small style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              sin tono en {targetFrequency}±15 Hz
            </small>
          )}
        </div>
        {freqDeviation !== null && (
          <div
            className="freq-deviation"
            style={{ color: freqOnTarget ? 'var(--success-color)' : 'var(--warning-color)' }}
          >
            {freqDeviation >= 0 ? '+' : ''}{freqDeviation.toFixed(1)} Hz
            <small>{freqOnTarget ? 'en diapasón' : 'desviado'}</small>
          </div>
        )}
      </div>

      {dominantFrequency > 0 && detectedFrequency === 0 && (
        <div className="alert" style={{ background: 'rgba(255,183,3,0.1)', border: '1px solid var(--warning-color)', color: 'var(--warning-color)' }}>
          <AlertTriangle className="alert-icon" />
          <div className="alert-content">
            <strong>Tono fuera de la banda objetivo</strong>
            <p>
              Suena un tono dominante de ≈ <strong>{dominantFrequency.toFixed(0)} Hz</strong>, pero el programa
              busca {targetFrequency} ± 15 Hz. Cambia la frecuencia del programa a ≈ {dominantFrequency.toFixed(0)} Hz
              o usa un diapasón de {targetFrequency} Hz.
            </p>
          </div>
        </div>
      )}

      <div className="progress-wrapper">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <span className="form-label">Nivel de Resonancia</span>
        </div>
        <div className="progress-container">
          <div 
            className="progress-bar" 
            style={{ 
              width: `${resonanceLevel}%`, 
              opacity: status === 'measuring' ? 1 : 0.3,
              background: status === 'calibrating' ? 'linear-gradient(90deg, #555, #888)' : undefined
            }}
          ></div>
          <div className="progress-text">
            {status === 'calibrating' ? '...' : `${resonanceLevel}%`}
          </div>
        </div>
      </div>

      {maxFound && status === 'measuring' && (
        <div className="alert alert-success">
          <CheckCircle2 className="alert-icon" />
          <div className="alert-content">
            <strong>Parece que pasaste el máximo</strong>
            <p>Vuelve al punto más fuerte (≈ {maxAmplitude}) y anota la longitud.</p>
          </div>
        </div>
      )}

      {status === 'measuring' && (
        <button className="btn btn-primary" onClick={onRegister}>
          <ClipboardPen size={18} />
          Anotar longitud del pico
        </button>
      )}
    </div>
  );
}
