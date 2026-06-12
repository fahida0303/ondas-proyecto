import { useEffect, useRef } from 'react';

interface ResonanceVisualizerProps {
  mode: number;
  resonanceLevel: number;
}

export function ResonanceVisualizer({ mode, resonanceLevel }: ResonanceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerY = height / 2;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      timeRef.current += 0.05;
      const t = timeRef.current;

      const minAmplitude = 5;
      const maxAvailableAmplitude = (height / 2) * 0.8;
      const targetAmplitude = minAmplitude + (maxAvailableAmplitude - minAmplitude) * (resonanceLevel / 100);

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.8)';
      ctx.lineWidth = 3;
      
      const numPoints = 200;
      
      for (let i = 0; i <= numPoints; i++) {
        const x = (i / numPoints) * width;
        const k = (mode * Math.PI) / (2 * width);
        const envelope = Math.sin(k * (width - x));
        const y = centerY - targetAmplitude * envelope * Math.cos(t);
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.4)';
      ctx.lineWidth = 2;
      for (let i = 0; i <= numPoints; i++) {
        const x = (i / numPoints) * width;
        const k = (mode * Math.PI) / (2 * width);
        const envelope = Math.sin(k * (width - x));
        const y = centerY - targetAmplitude * envelope * Math.cos(t + Math.PI);
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1;
      for (let i = 0; i <= numPoints; i++) {
        const x = (i / numPoints) * width;
        const k = (mode * Math.PI) / (2 * width);
        const envelope = Math.abs(Math.sin(k * (width - x)));
        const y1 = centerY - targetAmplitude * envelope;
        if (i === 0) ctx.moveTo(x, y1);
        else ctx.lineTo(x, y1);
      }
      ctx.stroke();
      
      ctx.beginPath();
      for (let i = 0; i <= numPoints; i++) {
        const x = (i / numPoints) * width;
        const k = (mode * Math.PI) / (2 * width);
        const envelope = Math.abs(Math.sin(k * (width - x)));
        const y2 = centerY + targetAmplitude * envelope;
        if (i === 0) ctx.moveTo(x, y2);
        else ctx.lineTo(x, y2);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [mode, resonanceLevel]);

  return (
    <div className="glass-panel visualizer-container">
      <div className="visualizer-header">
        <h2>Onda Estacionaria</h2>
        <p>Tubo cerrado a la derecha - Modo {mode}</p>
      </div>
      
      <div 
        className="glow-bg"
        style={{ opacity: resonanceLevel / 100 }}
      ></div>

      <div className="canvas-wrapper">
        <canvas ref={canvasRef} className="canvas-element" />

        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px',
          background: 'rgba(255,255,255,0.2)', borderLeft: '1px solid rgba(255,255,255,0.5)', borderRadius: '0 4px 4px 0'
        }}></div>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: '32px',
          borderTop: '1px solid rgba(255,255,255,0.2)', borderBottom: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '24px 0 0 24px', opacity: 0.5
        }}></div>
      </div>
    </div>
  );
}
