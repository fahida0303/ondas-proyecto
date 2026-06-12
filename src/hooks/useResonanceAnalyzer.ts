import { useState, useEffect, useRef, useCallback } from 'react';

export type AnalyzerStatus = 'idle' | 'calibrating' | 'waiting' | 'stabilizing' | 'measuring';

export interface HistoryRecord {
  id: string;
  timestamp: number;
  mode: number;
  frequency: number;
  detectedFrequency: number; // frecuencia dominante medida por la FFT (Hz)
  maxAmplitude: number;
  temperature: number;
  diameter: number;
  length: number;
  theoreticalSpeed: number;
  experimentalSpeed: number;
  speedUncertainty: number; // Δv (m/s)
  errorPercentage: number;
}

interface UseResonanceAnalyzerProps {
  targetFrequency: number;
  mode: number;
}

export function useResonanceAnalyzer({ targetFrequency, mode }: UseResonanceAnalyzerProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [status, setStatus] = useState<AnalyzerStatus>('idle');
  const [currentAmplitude, setCurrentAmplitude] = useState(0);
  const [maxAmplitude, setMaxAmplitude] = useState(0);
  const [detectedFrequency, setDetectedFrequency] = useState(0); // Hz dominante en la banda
  const [dominantFrequency, setDominantFrequency] = useState(0); // Hz del tono dominante en TODO el espectro (si está fuera de banda)
  const [resonanceLevel, setResonanceLevel] = useState(0); // 0 to 100
  const [maxFound, setMaxFound] = useState(false);
  const [maxAmplitudeObserved, setMaxAmplitudeObserved] = useState(0);
  
  const [isClipping, setIsClipping] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const BANDWIDTH = 15; 
  const DEFAULT_NOISE_THRESHOLD = 20; 
  const STABILITY_FRAMES_REQ = 10;
  const DROP_FRAMES_REQ = 25; 
  const SMOOTHING_FACTOR = 0.85; 
  const DROP_TOLERANCE_PERCENT = 0.05; 
  const CALIBRATION_DURATION_MS = 3000;
  const CLIPPING_THRESHOLD = 250;

  const stateRef = useRef({
    smoothedAmplitude: 0,
    maxObserved: 0,
    stabilityCounter: 0,
    dropCounter: 0,
    status: 'idle' as AnalyzerStatus,
    maxFound: false,
    noiseThreshold: DEFAULT_NOISE_THRESHOLD,
    calibrationSamples: [] as number[],
    calibrationStartTime: 0
  });

  const stopCapture = useCallback(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    
    setIsCapturing(false);
    setStatus('idle');
    setIsClipping(false);
    stateRef.current.status = 'idle';
  }, []);

  const startCapture = useCallback(async () => {
    try {
      setMicError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false } 
      });
      
      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      
      analyser.fftSize = 16384; // mejor resolución en frecuencia (~2.9 Hz/bin a 48 kHz)
      analyser.smoothingTimeConstant = 0; // controlamos el suavizado nosotros (evita doble filtrado)
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      streamRef.current = stream;

      stateRef.current = {
        smoothedAmplitude: 0,
        maxObserved: 0,
        stabilityCounter: 0,
        dropCounter: 0,
        status: 'calibrating',
        maxFound: false,
        noiseThreshold: DEFAULT_NOISE_THRESHOLD,
        calibrationSamples: [],
        calibrationStartTime: performance.now()
      };
      
      setMaxAmplitude(0);
      setMaxAmplitudeObserved(0);
      setCurrentAmplitude(0);
      setDetectedFrequency(0);
      setDominantFrequency(0);
      setResonanceLevel(0);
      setMaxFound(false);
      setIsClipping(false);
      setStatus('calibrating');
      setIsCapturing(true);

      processAudio();
    } catch (err: any) {
      console.error('Error accessing microphone:', err);
      if (err.name === 'NotAllowedError') setMicError('NOT_ALLOWED');
      else if (err.name === 'NotFoundError') setMicError('NOT_FOUND');
      else setMicError('UNKNOWN');
    }
  }, [targetFrequency]);

  const processAudio = useCallback(() => {
    if (!analyserRef.current || !audioContextRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const sampleRate = audioContextRef.current.sampleRate;

    analyser.getByteFrequencyData(dataArray);

    const hzPerBin = sampleRate / analyser.fftSize;
    const minFreq = targetFrequency - BANDWIDTH;
    const maxFreq = targetFrequency + BANDWIDTH;
    const minBin = Math.max(0, Math.floor(minFreq / hzPerBin));
    const maxBin = Math.min(bufferLength - 1, Math.ceil(maxFreq / hzPerBin));

    let rawAmplitude = 0;
    let peakBin = minBin;
    let clippingDetected = false;

    for (let i = 0; i < bufferLength; i++) {
      if (dataArray[i] > CLIPPING_THRESHOLD) {
        clippingDetected = true;
        break;
      }
    }

    for (let i = minBin; i <= maxBin; i++) {
      if (dataArray[i] > rawAmplitude) {
        rawAmplitude = dataArray[i];
        peakBin = i;
      }
    }

    // Frecuencia dominante en TODO el espectro audible (para distinguir si el
    // tono real está dentro o fuera de la banda objetivo).
    const minAudibleBin = Math.max(1, Math.floor(80 / hzPerBin));
    let globalPeak = 0;
    let globalBin = minAudibleBin;
    for (let i = minAudibleBin; i < bufferLength - 1; i++) {
      if (dataArray[i] > globalPeak) {
        globalPeak = dataArray[i];
        globalBin = i;
      }
    }

    // Interpolación parabólica de 3 bins → precisión sub-bin (< 1 Hz).
    const refineFreq = (bin: number) => {
      const a = dataArray[bin - 1];
      const b = dataArray[bin];
      const c = dataArray[bin + 1];
      const denom = a - 2 * b + c;
      const d = denom !== 0 ? (0.5 * (a - c)) / denom : 0;
      const refined = bin + Math.max(-0.5, Math.min(0.5, d));
      return Math.round(refined * hzPerBin * 10) / 10;
    };

    const thr = stateRef.current.noiseThreshold;
    const inBandValid = rawAmplitude >= thr && peakBin > 0 && peakBin < bufferLength - 1;
    // El pico de la banda es "real" solo si domina el espectro (un tono fuera
    // de banda, como un 440 Hz cuando buscas 1024 Hz, tendría globalPeak >> rawAmplitude).
    const inBandIsDominant = rawAmplitude >= 0.5 * globalPeak;

    if (inBandValid && inBandIsDominant) {
      setDetectedFrequency(refineFreq(peakBin));
      setDominantFrequency(0);
    } else if (globalPeak >= Math.max(thr, 90) && globalBin > 0 && globalBin < bufferLength - 1) {
      // Hay un tono fuerte, pero está FUERA de la banda objetivo.
      setDetectedFrequency(0);
      setDominantFrequency(refineFreq(globalBin));
    } else {
      setDetectedFrequency(0);
      setDominantFrequency(0);
    }

    setIsClipping(clippingDetected);

    const st = stateRef.current;

    // Calibration Phase
    if (st.status === 'calibrating') {
      const now = performance.now();
      st.calibrationSamples.push(rawAmplitude);
      
      if (now - st.calibrationStartTime >= CALIBRATION_DURATION_MS) {
        const avgNoise = st.calibrationSamples.reduce((a, b) => a + b, 0) / Math.max(1, st.calibrationSamples.length);
        st.noiseThreshold = Math.max(DEFAULT_NOISE_THRESHOLD, Math.round(avgNoise + 15));
        
        st.status = 'waiting';
        setStatus('waiting');
      }
      
      setCurrentAmplitude(rawAmplitude);
      animationFrameRef.current = requestAnimationFrame(processAudio);
      return;
    }

    if (rawAmplitude < st.noiseThreshold) {
      st.stabilityCounter = 0;
      if (st.status !== 'waiting') {
        st.status = 'waiting';
        setStatus('waiting');
      }
      st.smoothedAmplitude = 0;
    } else {
      st.stabilityCounter++;
      
      if (st.status === 'waiting' && st.stabilityCounter < STABILITY_FRAMES_REQ) {
        st.status = 'stabilizing';
        setStatus('stabilizing');
      } else if (st.stabilityCounter >= STABILITY_FRAMES_REQ) {
        if (st.status !== 'measuring') {
          st.status = 'measuring';
          setStatus('measuring');
        }

        st.smoothedAmplitude = (st.smoothedAmplitude * SMOOTHING_FACTOR) + (rawAmplitude * (1 - SMOOTHING_FACTOR));
        const currentAmpRounded = Math.round(st.smoothedAmplitude);

        if (st.smoothedAmplitude > st.maxObserved) {
          st.maxObserved = st.smoothedAmplitude;
          st.dropCounter = 0; 
          st.maxFound = false; 
          
          setMaxAmplitude(Math.round(st.maxObserved));
          setMaxAmplitudeObserved(Math.round(st.maxObserved));
          setMaxFound(false);
        }

        const dropThreshold = st.maxObserved * (1 - DROP_TOLERANCE_PERCENT);
        if (st.smoothedAmplitude < dropThreshold && st.maxObserved > st.noiseThreshold * 2) {
          st.dropCounter++;
          if (st.dropCounter > DROP_FRAMES_REQ && !st.maxFound) {
            st.maxFound = true;
            setMaxFound(true);
            // In Phase 3, we don't automatically save to history here.
            // App.tsx will detect maxFound and show the Calculation Modal.
          }
        } else {
          st.dropCounter = Math.max(0, st.dropCounter - 1);
        }

        setCurrentAmplitude(currentAmpRounded);
        
        let level = 0;
        if (st.maxObserved > 0) {
          level = (st.smoothedAmplitude / st.maxObserved) * 100;
        }
        setResonanceLevel(Math.max(0, Math.min(100, Math.round(level))));
      }
    }

    animationFrameRef.current = requestAnimationFrame(processAudio);
  }, [targetFrequency, mode]);

  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, [stopCapture]);

  return {
    isCapturing,
    status,
    currentAmplitude,
    maxAmplitude,
    detectedFrequency,
    dominantFrequency,
    resonanceLevel,
    maxFound,
    setMaxFound, // Exposed to allow resetting the modal
    maxAmplitudeObserved,
    isClipping,
    micError,
    startCapture,
    stopCapture,
  };
}
