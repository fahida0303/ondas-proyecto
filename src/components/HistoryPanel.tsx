import type { HistoryRecord } from '../hooks/useResonanceAnalyzer';
import { Download, Trash2 } from 'lucide-react';

interface HistoryPanelProps {
  history: HistoryRecord[];
  onClear: () => void;
}

export function HistoryPanel({ history, onClear }: HistoryPanelProps) {
  
  const exportToCSV = () => {
    if (history.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Fecha,Hora,Modo,Frecuencia Diapason (Hz),Frecuencia Detectada (Hz),Amplitud,Temperatura (C),Diametro Tubo (cm),Longitud (cm),Velocidad Teorica (m/s),Velocidad Experimental (m/s),Incertidumbre dv (m/s),Error (%)\n";

    history.forEach(row => {
      const date = new Date(row.timestamp);
      csvContent += `${date.toLocaleDateString()},${date.toLocaleTimeString()},${row.mode},${row.frequency},${row.detectedFrequency},${row.maxAmplitude},${row.temperature},${row.diameter},${row.length},${row.theoreticalSpeed},${row.experimentalSpeed},${row.speedUncertainty},${row.errorPercentage}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laboratorio_ondas_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass-panel" style={{ height: '100%' }}>
      <div className="panel-title">
        <span>Resultados Físicos</span>
        <div className="history-header-actions">
          <button className="btn-icon" onClick={exportToCSV} disabled={history.length === 0} title="Exportar a CSV">
            <Download size={18} />
          </button>
          <button className="btn-icon danger" onClick={onClear} disabled={history.length === 0} title="Borrar">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="history-list">
        {history.length === 0 ? (
          <div className="history-empty">
            <p>Sin resultados aún</p>
            <small>Encuentra un pico e ingresa su longitud.</small>
          </div>
        ) : (
          history.map((record) => (
            <div key={record.id} className="history-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.25rem' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--accent-color)' }}>
                  {record.experimentalSpeed} ± {record.speedUncertainty} m/s
                </span>
                <span style={{ fontSize: '0.8rem', color: record.errorPercentage > 5 ? 'var(--danger-color)' : 'var(--success-color)' }}>
                  {record.errorPercentage}% Error
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span>L = {record.length} cm</span>
                <span>T = {record.theoreticalSpeed} m/s</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span>Modo {record.mode} @ {record.frequency}Hz</span>
                <span>FFT {record.detectedFrequency || '—'}Hz</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
