interface SettingsPanelProps {
  targetFrequency: number;
  setTargetFrequency: (freq: number) => void;
  mode: number;
  setMode: (mode: number) => void;
  temperature: number;
  setTemperature: (temp: number) => void;
  diameter: number;
  setDiameter: (d: number) => void;
  isCapturing: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function SettingsPanel({
  targetFrequency,
  setTargetFrequency,
  mode,
  setMode,
  temperature,
  setTemperature,
  diameter,
  setDiameter,
  isCapturing,
  onStart,
  onStop
}: SettingsPanelProps) {
  return (
    <div className="glass-panel">
      <h2 className="panel-title">Variables del Laboratorio</h2>
      
      <div className="value-grid">
        <div className="form-group">
          <label className="form-label" htmlFor="frequency">Frecuencia (Hz)</label>
          <input
            id="frequency"
            type="number"
            className="form-input"
            value={targetFrequency}
            onChange={(e) => setTargetFrequency(Number(e.target.value))}
            disabled={isCapturing}
            min="10"
            max="20000"
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="mode">Armónico</label>
          <select
            id="mode"
            className="form-select"
            value={mode}
            onChange={(e) => setMode(Number(e.target.value))}
            disabled={isCapturing}
          >
            <option value={1}>1 (n=1)</option>
            <option value={3}>3 (n=3)</option>
            <option value={5}>5 (n=5)</option>
          </select>
        </div>
      </div>

      <div className="value-grid" style={{ marginTop: '0.5rem' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="temperature">Temperatura (°C)</label>
          <input
            id="temperature"
            type="number"
            className="form-input"
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            disabled={isCapturing}
            step="0.1"
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="diameter">Diámetro Tubo (cm)</label>
          <input
            id="diameter"
            type="number"
            className="form-input"
            value={diameter}
            onChange={(e) => setDiameter(Number(e.target.value))}
            disabled={isCapturing}
            step="0.1"
            min="0.1"
          />
        </div>
      </div>
      <span className="form-hint" style={{ marginTop: '-0.5rem', display: 'block', textAlign: 'center' }}>
        El diámetro corrige el error del vientre físico ($e \approx 0.3 D$).
      </span>

      <div style={{ marginTop: '0.5rem' }}>
        {!isCapturing ? (
          <button className="btn btn-primary" onClick={onStart}>
            Calibrar y Buscar Resonancia
          </button>
        ) : (
          <button className="btn btn-danger" onClick={onStop}>
            Detener Captura
          </button>
        )}
      </div>
    </div>
  );
}
