import { useState } from 'react';
import { TutorialOverlay } from './components/TutorialOverlay';
import { SettingsPanel } from './components/SettingsPanel';
import { StatusDisplay } from './components/StatusDisplay';
import { ResonanceVisualizer3D } from './components/ResonanceVisualizer3D';
import { ResonancePredictor } from './components/ResonancePredictor';
import { HistoryPanel } from './components/HistoryPanel';
import { RegressionPanel } from './components/RegressionPanel';
import { ErrorModal } from './components/ErrorModal';
import { CalculadorFisico } from './components/CalculadorFisico';
import { useResonanceAnalyzer } from './hooks/useResonanceAnalyzer';
import type { HistoryRecord } from './hooks/useResonanceAnalyzer';
import { Activity, Maximize, Minimize, HelpCircle } from 'lucide-react';

function App() {
  const [targetFrequency, setTargetFrequency] = useState<number>(440);
  const [mode, setMode] = useState<number>(1);
  const [temperature, setTemperature] = useState<number>(20);
  const [diameter, setDiameter] = useState<number>(3);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [simulatedWater, setSimulatedWater] = useState(0.5);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);

  const closeTutorial = () => setShowTutorial(false);

  const [history, setHistory] = useState<HistoryRecord[]>([]);

  const {
    isCapturing,
    status,
    currentAmplitude,
    maxAmplitude,
    detectedFrequency,
    dominantFrequency,
    resonanceLevel,
    maxFound,
    isClipping,
    micError,
    startCapture,
    stopCapture
  } = useResonanceAnalyzer({
    targetFrequency,
    mode
  });

  const handleStopCapture = () => {
    stopCapture();
    setShowCalculator(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false));
      }
    }
  };

  const handleClearHistory = () => {
    if (confirm('¿Estás seguro de que quieres borrar todo el historial?')) {
      setHistory([]);
    }
  };

  const handleSaveCalculation = (record: HistoryRecord) => {
    setHistory(prev => [record, ...prev]);
    setShowCalculator(false);
  };

  const handleDismissCalculation = () => {
    setShowCalculator(false);
  };

  return (
    <div className="app-wrapper">
      {showTutorial && <TutorialOverlay onClose={closeTutorial} />}

      <ErrorModal
        errorType={micError} 
        onDismiss={stopCapture} 
      />

      {showCalculator && (
        <CalculadorFisico
          mode={mode}
          frequency={targetFrequency}
          detectedFrequency={detectedFrequency}
          maxAmplitude={maxAmplitude}
          temperature={temperature}
          diameter={diameter}
          onSave={handleSaveCalculation}
          onDismiss={handleDismissCalculation}
        />
      )}

      <header className="app-header">
        <div className="app-title-container">
          <Activity size={32} color="var(--accent-color)" />
          <h1 className="app-title">Asistente de Resonancia 3D</h1>
        </div>
        <p className="app-subtitle">
          Localiza el pico, calcula la velocidad del sonido y minimiza el error experimental
        </p>
        
        <button
          className="btn-help"
          onClick={() => setShowTutorial(true)}
          title="Ver tutorial"
        >
          <HelpCircle size={20} />
        </button>

        <button
          className="btn-fullscreen"
          onClick={toggleFullscreen}
          title="Pantalla Completa"
        >
          {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>
      </header>

      <main className="main-layout">
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <SettingsPanel
            targetFrequency={targetFrequency}
            setTargetFrequency={setTargetFrequency}
            mode={mode}
            setMode={setMode}
            temperature={temperature}
            setTemperature={setTemperature}
            diameter={diameter}
            setDiameter={setDiameter}
            isCapturing={isCapturing}
            onStart={startCapture}
            onStop={handleStopCapture}
          />

          <StatusDisplay
            status={status}
            currentAmplitude={currentAmplitude}
            maxAmplitude={maxAmplitude}
            detectedFrequency={detectedFrequency}
            dominantFrequency={dominantFrequency}
            targetFrequency={targetFrequency}
            resonanceLevel={resonanceLevel}
            maxFound={maxFound}
            isClipping={isClipping}
            onRegister={() => setShowCalculator(true)}
          />
        </aside>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <ResonanceVisualizer3D
            mode={mode}
            resonanceLevel={resonanceLevel}
            waterFraction={simulatedWater}
            active={isCapturing}
          />
          <ResonancePredictor
            frequency={targetFrequency}
            temperature={temperature}
            diameter={diameter}
            onSimulatedWater={setSimulatedWater}
          />
        </section>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <RegressionPanel history={history} />
          <HistoryPanel
            history={history}
            onClear={handleClearHistory}
          />
        </aside>
      </main>
      
      <footer style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        Diseñado para prácticas de laboratorio de física | Motor Físico 3D Completo
      </footer>
    </div>
  );
}

export default App;
