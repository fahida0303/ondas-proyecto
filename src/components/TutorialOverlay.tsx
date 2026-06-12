import { useState } from 'react';
import {
  X, ChevronLeft, ChevronRight, Sparkles, Check,
  Hammer, Hand, Ruler, Thermometer, ArrowUpFromLine, VolumeX,
} from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

function Tex({ math, display = false }: { math: string; display?: boolean }) {
  const html = katex.renderToString(math, {
    displayMode: display,
    throwOnError: false,
  });
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

interface TutorialOverlayProps {
  onClose: () => void;
}

function SchemaSound() {
  return (
    <svg viewBox="0 0 320 200" className="tut-svg" role="img" aria-label="Fuente de sonido">
      <defs>
        <linearGradient id="metalG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#eaf2ff" />
          <stop offset="0.5" stopColor="#aebfda" />
          <stop offset="1" stopColor="#6b7a99" />
        </linearGradient>
        <radialGradient id="glowG" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#00e5ff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#00e5ff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g stroke="#00e5ff" fill="none" strokeWidth="3" strokeLinecap="round">
        <path d="M150 100 q18 -22 36 0 q18 22 36 0" opacity="0.9" />
        <path d="M150 100 q24 -34 48 0 q24 34 48 0" opacity="0.5" transform="translate(14,0)" />
        <path d="M150 100 q30 -46 60 0 q30 46 60 0" opacity="0.25" transform="translate(28,0)" />
      </g>

      <ellipse cx="78" cy="184" rx="46" ry="9" fill="#00e5ff" opacity="0.15" />
      <rect x="58" y="40" width="9" height="80" rx="4" fill="url(#metalG)" />
      <rect x="90" y="40" width="9" height="80" rx="4" fill="url(#metalG)" />
      <path d="M58 120 q0 24 22 24 q22 0 22 -24" fill="none" stroke="url(#metalG)" strokeWidth="9" />
      <rect x="74" y="142" width="9" height="34" rx="4" fill="url(#metalG)" />
      <circle cx="63" cy="40" r="11" fill="url(#glowG)" />
      <circle cx="94" cy="40" r="11" fill="url(#glowG)" />
    </svg>
  );
}

function SchemaTube() {
  return (
    <svg viewBox="0 0 320 220" className="tut-svg" role="img" aria-label="Tubo con onda estacionaria">
      <defs>
        <linearGradient id="glassG" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7fd9ff" stopOpacity="0.05" />
          <stop offset="0.5" stopColor="#cdefff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#7fd9ff" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="waterG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2ba6ec" />
          <stop offset="1" stopColor="#0d4f86" />
        </linearGradient>
      </defs>

      <rect x="120" y="18" width="80" height="176" fill="url(#glassG)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      <ellipse cx="160" cy="18" rx="40" ry="9" fill="#0b2233" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />

      <path d="M120 150 H200 V194 H120 Z" fill="url(#waterG)" opacity="0.92" />
      <ellipse cx="160" cy="150" rx="40" ry="8" fill="#5fc4f5" opacity="0.85" />
      <ellipse cx="160" cy="194" rx="40" ry="8" fill="#0d4f86" />

      <path
        d="M160 26 C 200 50 200 70 160 90 C 120 110 120 130 160 150"
        fill="none"
        stroke="#00e5ff"
        strokeWidth="3"
        opacity="0.95"
      />
      <path
        d="M160 26 C 120 50 120 70 160 90 C 200 110 200 130 160 150"
        fill="none"
        stroke="#00e5ff"
        strokeWidth="3"
        opacity="0.45"
      />

      <g fontSize="11" fontFamily="Inter, sans-serif">
        <circle cx="208" cy="40" r="4" fill="#00ff88" />
        <text x="216" y="44" fill="#00ff88">Vientre (boca)</text>
        <circle cx="208" cy="150" r="4" fill="#ffb703" />
        <text x="216" y="154" fill="#ffb703">Nodo (agua)</text>
      </g>
    </svg>
  );
}

function SchemaHarmonics() {
  const envelope = (cx: number, top: number, bottom: number, m: number, sign: 1 | -1) => {
    const H = bottom - top;
    const steps = 40;
    const w = 16;
    let d = '';
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const y = bottom - u * H;
      const amp = Math.sin((m * Math.PI) / 2 * u) * w * sign;
      d += i === 0 ? `M${cx + amp} ${y}` : ` L${cx + amp} ${y}`;
    }
    return d;
  };

  const tubes = [
    { cx: 60, m: 1, label: 'n = 1' },
    { cx: 160, m: 3, label: 'n = 3' },
    { cx: 260, m: 5, label: 'n = 5' },
  ];
  const top = 24;
  const bottom = 150;

  return (
    <svg viewBox="0 0 320 200" className="tut-svg" role="img" aria-label="Armónicos impares 1, 3 y 5">
      {tubes.map((t) => (
        <g key={t.m} fontFamily="Inter, sans-serif">
          <rect x={t.cx - 24} y={top} width="48" height={bottom - top}
            fill="rgba(125,217,255,0.06)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
          <ellipse cx={t.cx} cy={top} rx="24" ry="5" fill="#0b2233" stroke="rgba(255,255,255,0.3)" />
          <rect x={t.cx - 23} y={bottom - 14} width="46" height="14" fill="#1488d6" opacity="0.85" />
          <path d={envelope(t.cx, top, bottom - 14, t.m, 1)} fill="none" stroke="#00e5ff" strokeWidth="2.5" />
          <path d={envelope(t.cx, top, bottom - 14, t.m, -1)} fill="none" stroke="#00e5ff" strokeWidth="2.5" opacity="0.4" />
          <text x={t.cx} y="174" fill="#00e5ff" fontSize="13" fontWeight="700" textAnchor="middle">{t.label}</text>
          <text x={t.cx} y="190" fill="rgba(255,255,255,0.5)" fontSize="10" textAnchor="middle">{t.m} × λ/4</text>
        </g>
      ))}
    </svg>
  );
}

function SchemaChooseHarmonic() {
  const levels = [
    { y: 64, label: '1º', n: 'n=1' },
    { y: 110, label: '2º', n: 'n=3' },
    { y: 158, label: '3º', n: 'n=5' },
  ];
  return (
    <svg viewBox="0 0 320 200" className="tut-svg" role="img" aria-label="Cómo elegir el armónico bajando el agua">
      <defs>
        <linearGradient id="chGlass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7fd9ff" stopOpacity="0.05" />
          <stop offset="0.5" stopColor="#cdefff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#7fd9ff" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      <g>
        <rect x="150" y="6" width="5" height="20" rx="2" fill="#aebfda" />
        <rect x="162" y="6" width="5" height="20" rx="2" fill="#aebfda" />
        <rect x="156" y="26" width="5" height="8" fill="#aebfda" />
      </g>

      <rect x="120" y="34" width="80" height="156" fill="url(#chGlass)" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />
      <ellipse cx="160" cy="34" rx="40" ry="7" fill="#0b2233" stroke="rgba(255,255,255,0.3)" />

      {levels.map((l) => (
        <g key={l.n} fontFamily="Inter, sans-serif">
          <line x1="120" y1={l.y} x2="200" y2={l.y} stroke="#00e5ff" strokeWidth="2" strokeDasharray="5 4" />
          <circle cx="200" cy={l.y} r="5" fill="#00ff88" />
          <text x="212" y={l.y - 2} fill="#00ff88" fontSize="12" fontWeight="700">{l.label} ¡fuerte!</text>
          <text x="212" y={l.y + 11} fill="#00e5ff" fontSize="11">{l.n}</text>
        </g>
      ))}

      <g>
        <line x1="100" y1="44" x2="100" y2="176" stroke="#ffb703" strokeWidth="2.5" />
        <path d="M100 184 l-6 -10 h12 Z" fill="#ffb703" />
        <text x="96" y="40" fill="#ffb703" fontSize="10" fontFamily="Inter, sans-serif" textAnchor="middle">baja</text>
        <text x="96" y="50" fill="#ffb703" fontSize="10" fontFamily="Inter, sans-serif" textAnchor="middle" opacity="0">el agua</text>
      </g>
    </svg>
  );
}

function SchemaSteps() {
  const steps = [
    'Escribe la frecuencia de tu diapasón (viene grabada en el metal, ej. 440 Hz).',
    'Pon la temperatura del aula y el diámetro del tubo.',
    'Pulsa "Calibrar y Buscar Resonancia" y permite el micrófono.',
    'Haz sonar el diapasón sobre la boca y baja el agua despacio.',
    'Cuando la barra llegue al máximo, pulsa "Registrar". El 1er pico es n=1.',
    'Si caben más picos en tu tubo, repítelo con el 2º y 3º (n=3, n=5): más picos = menos error. Si solo hay uno, con n=1 basta.',
  ];
  return (
    <ol className="tut-steps">
      {steps.map((s, i) => (
        <li key={i}>
          <span className="tut-step-num">{i + 1}</span>
          <span className="tut-step-text">{s}</span>
        </li>
      ))}
    </ol>
  );
}

function SchemaOnePeak() {
  return (
    <svg viewBox="0 0 320 220" className="tut-svg" role="img" aria-label="Tubo corto: solo cabe la primera resonancia">
      <defs>
        <linearGradient id="opGlass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7fd9ff" stopOpacity="0.05" />
          <stop offset="0.5" stopColor="#cdefff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#7fd9ff" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      <rect x="110" y="30" width="70" height="130" fill="url(#opGlass)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      <ellipse cx="145" cy="30" rx="35" ry="6" fill="#0b2233" stroke="rgba(255,255,255,0.3)" />
      <line x1="110" y1="160" x2="180" y2="160" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" />
      <text x="98" y="100" fill="rgba(255,255,255,0.55)" fontSize="11" fontFamily="Inter, sans-serif"
        textAnchor="middle" transform="rotate(-90 98 100)">tubo: 50 cm</text>

      <line x1="110" y1="79" x2="180" y2="79" stroke="#00ff88" strokeWidth="2.5" strokeDasharray="6 4" />
      <circle cx="180" cy="79" r="5" fill="#00ff88" />
      <text x="190" y="76" fill="#00ff88" fontSize="12" fontWeight="700" fontFamily="Inter, sans-serif">n=1 → 19 cm ✓</text>
      <text x="190" y="90" fill="rgba(0,255,136,0.7)" fontSize="10" fontFamily="Inter, sans-serif">¡suena aquí!</text>

      <rect x="110" y="160" width="70" height="46" fill="none" stroke="rgba(255,71,87,0.4)" strokeWidth="1.5" strokeDasharray="5 5" />
      <line x1="110" y1="181" x2="180" y2="181" stroke="#ff4757" strokeWidth="2.5" strokeDasharray="6 4" opacity="0.8" />
      <circle cx="180" cy="181" r="5" fill="#ff4757" />
      <text x="190" y="178" fill="#ff4757" fontSize="12" fontWeight="700" fontFamily="Inter, sans-serif">n=3 → 58 cm ✗</text>
      <text x="190" y="192" fill="rgba(255,71,87,0.7)" fontSize="10" fontFamily="Inter, sans-serif">¡no cabe en el tubo!</text>

      <text x="160" y="216" fill="rgba(255,255,255,0.55)" fontSize="11" fontFamily="Inter, sans-serif" textAnchor="middle">
        Ejemplo: diapasón de 440 Hz (λ ≈ 78 cm) a 20 °C
      </text>
    </svg>
  );
}

function SchemaTips() {
  const tips = [
    { Icon: Hammer, text: 'Golpea el diapasón con algo blando (goma, suela). Nunca contra la mesa: suena con armónicos falsos y se daña.' },
    { Icon: Hand, text: 'Sostenlo horizontal a 1–2 cm de la boca, sin tocar el vidrio. El sonido se apaga rápido: vuelve a golpear en cada ajuste.' },
    { Icon: Ruler, text: 'Los picos se repiten cada λ/2. Si ya encontraste uno, el siguiente está exactamente media longitud de onda más abajo.' },
    { Icon: Thermometer, text: 'Mide la temperatura REAL del aula: v cambia ≈ 0.6 m/s por cada °C. No supongas 20 °C.' },
    { Icon: ArrowUpFromLine, text: 'El vientre sobresale un poquito de la boca del tubo. Por eso se suma e = 0.3·D a la longitud medida.' },
    { Icon: VolumeX, text: 'Haz silencio al medir: el micrófono filtra tu frecuencia, pero el ruido fuerte cercano puede engañar al pico.' },
  ];
  return (
    <ul className="tut-tips">
      {tips.map((t, i) => (
        <li key={i}>
          <span className="tut-tip-icon"><t.Icon size={18} /></span>
          <span className="tut-step-text">{t.text}</span>
        </li>
      ))}
    </ul>
  );
}

function SchemaSettings() {
  const knobs = [
    { label: 'Frecuencia', c: '#00e5ff', v: 0.7 },
    { label: 'Armónico', c: '#00ff88', v: 0.3 },
    { label: 'Temperatura', c: '#ffb703', v: 0.55 },
    { label: 'Diámetro', c: '#ff7eb6', v: 0.4 },
  ];
  return (
    <svg viewBox="0 0 320 200" className="tut-svg" role="img" aria-label="Configurar variables">
      {knobs.map((k, i) => {
        const x = 40 + i * 72;
        return (
          <g key={k.label} fontFamily="Inter, sans-serif">
            <ellipse cx={x} cy="150" rx="22" ry="6" fill={k.c} opacity="0.18" />
            <circle cx={x} cy="86" r="26" fill="#11151f" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
            <circle cx={x} cy="86" r="26" fill="none" stroke={k.c} strokeWidth="4"
              strokeDasharray={`${k.v * 130} 200`} strokeLinecap="round"
              transform={`rotate(120 ${x} 86)`} opacity="0.9" />
            <line x1={x} y1="86" x2={x + Math.cos((k.v * 4.2 - 2.1)) * 16}
              y2={86 + Math.sin((k.v * 4.2 - 2.1)) * 16} stroke={k.c} strokeWidth="3" strokeLinecap="round" />
            <circle cx={x} cy="86" r="4" fill={k.c} />
            <text x={x} y="130" fill="rgba(255,255,255,0.7)" fontSize="11" textAnchor="middle">{k.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function SchemaPeak() {
  const bars = [0.2, 0.35, 0.55, 0.8, 1, 0.8, 0.55, 0.35, 0.2];
  return (
    <svg viewBox="0 0 320 200" className="tut-svg" role="img" aria-label="Buscar el pico de resonancia">
      <defs>
        <linearGradient id="barG" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#00e5ff" />
          <stop offset="1" stopColor="#00ff88" />
        </linearGradient>
      </defs>
      {bars.map((b, i) => {
        const x = 30 + i * 30;
        const h = b * 120;
        const peak = b === 1;
        return (
          <g key={i}>
            <rect x={x} y={170 - h} width="20" height={h} rx="5"
              fill={peak ? 'url(#barG)' : 'rgba(0,229,255,0.25)'} />
            {peak && <circle cx={x + 10} cy={170 - h - 14} r="7" fill="#00ff88">
              <animate attributeName="r" values="6;9;6" dur="1.2s" repeatCount="indefinite" />
            </circle>}
          </g>
        );
      })}
      <line x1="20" y1="170" x2="300" y2="170" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
      <text x="160" y="40" fill="#00ff88" fontSize="14" fontFamily="Inter, sans-serif"
        fontWeight="700" textAnchor="middle">¡Pico = Resonancia!</text>
    </svg>
  );
}

function SchemaResult() {
  return (
    <svg viewBox="0 0 320 200" className="tut-svg" role="img" aria-label="Resultado: velocidad del sonido">
      <defs>
        <linearGradient id="cardG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgba(0,229,255,0.18)" />
          <stop offset="1" stopColor="rgba(0,255,136,0.1)" />
        </linearGradient>
      </defs>
      <rect x="40" y="50" width="240" height="100" rx="16" fill="url(#cardG)"
        stroke="rgba(0,229,255,0.4)" strokeWidth="1.5" />
      <text x="160" y="86" fill="rgba(255,255,255,0.6)" fontSize="12"
        fontFamily="Inter, sans-serif" textAnchor="middle">Velocidad del sonido</text>
      <text x="160" y="120" fill="#00e5ff" fontSize="30" fontFamily="monospace"
        fontWeight="700" textAnchor="middle">343 ± 2 m/s</text>
      <g fontFamily="Inter, sans-serif" fontSize="11">
        <circle cx="92" cy="172" r="5" fill="#00ff88" />
        <text x="102" y="176" fill="rgba(255,255,255,0.7)">Guarda cada medida</text>
        <circle cx="210" cy="172" r="5" fill="#ffb703" />
        <text x="220" y="176" fill="rgba(255,255,255,0.7)">Error mínimo</text>
      </g>
    </svg>
  );
}

function SchemaFormulas() {
  const formulas = [
    { what: 'Longitud de onda', eq: '\\lambda = \\dfrac{4\\,(L + e)}{n}', note: 'L = columna de aire, n = armónico' },
    { what: 'Velocidad del sonido', eq: 'v = f \\cdot \\lambda', note: 'f = frecuencia' },
    { what: 'Corrección de la boca', eq: 'e = 0.3\\,D', note: 'D = diámetro del tubo' },
    { what: 'Velocidad teórica', eq: 'v = 331.45\\sqrt{1 + \\tfrac{T}{273.15}}', note: 'T = temperatura (°C)' },
    { what: 'Error', eq: '\\dfrac{|v - v_{\\text{teó}}|}{v_{\\text{teó}}}\\times 100', note: 'qué tan cerca estás (%)' },
    { what: 'Incertidumbre', eq: '\\Delta v = v\\sqrt{\\left(\\tfrac{\\Delta f}{f}\\right)^2 + \\left(\\tfrac{\\Delta L}{L}\\right)^2}', note: 'el ± de tu resultado' },
  ];
  return (
    <div className="tut-formulas">
      {formulas.map((f) => (
        <div className="tut-formula" key={f.what}>
          <div className="tut-formula-what">{f.what}</div>
          <div className="tut-formula-eq">
            <Tex math={f.eq} display />
          </div>
          <div className="tut-formula-note">{f.note}</div>
        </div>
      ))}
    </div>
  );
}

interface Step {
  badge: string;
  title: string;
  body: string;
  Schema: () => React.JSX.Element;
}

const STEPS: Step[] = [
  {
    badge: 'Bienvenida',
    title: '¿Qué hace esta app?',
    body:
      'Es tu asistente de laboratorio para medir la velocidad del sonido. Tú haces sonar una frecuencia dentro de un tubo y la app te ayuda a encontrar el punto exacto de resonancia y a calcular el resultado con poco error.',
    Schema: SchemaSound,
  },
  {
    badge: 'La idea',
    title: 'Onda atrapada en el tubo',
    body:
      'Dentro del tubo el sonido rebota y forma una "onda estacionaria". En la boca (arriba) el aire se mueve mucho: eso es un VIENTRE. Sobre el agua (abajo) el aire casi no se mueve: eso es un NODO. Cuando encajan perfecto, el sonido se oye fortísimo.',
    Schema: SchemaTube,
  },
  {
    badge: '¿Qué es?',
    title: 'El armónico (1, 3 o 5)',
    body:
      'Como el tubo está cerrado por el agua y abierto por la boca, solo resuena en los armónicos IMPARES. El número n te dice cuántos "cuartos de onda" (λ/4) caben en el aire: n=1 es la primera resonancia (la más larga) y n=3, n=5 son las siguientes. Esa n es la que entra en la fórmula de abajo.',
    Schema: SchemaHarmonics,
  },
  {
    badge: 'En la práctica',
    title: '¿Qué armónico pongo?',
    body:
      'No se elige al azar: lo marca DÓNDE suena más fuerte. Haz sonar el diapasón sobre la boca y baja el agua despacio. El 1er punto donde el sonido es máximo es n=1, el 2º es n=3 y el 3º es n=5. Para empezar simple, quédate con n=1: es el primero y el más claro.',
    Schema: SchemaChooseHarmonic,
  },
  {
    badge: 'Caso real',
    title: '¿Y si solo suena en UN punto?',
    body:
      '¡Es normal! Significa que tu tubo es corto para esa frecuencia: el siguiente pico (n=3) necesitaría más aire del que cabe. No es problema: registra ese único pico como n=1 y la app calcula la velocidad igual, corrigiendo con e = 0.3·D. Si quieres más picos, usa un diapasón más agudo (λ más corta) o revisa el Predictor: te dice cuántos caben en TU tubo.',
    Schema: SchemaOnePeak,
  },
  {
    badge: 'Paso 1',
    title: 'Configura tus variables',
    body:
      'En el panel izquierdo escribe la Frecuencia (Hz), elige el Armónico (1, 3 o 5), y pon la Temperatura y el Diámetro del tubo. Estos dos últimos sirven para corregir el resultado y hacerlo más exacto.',
    Schema: SchemaSettings,
  },
  {
    badge: 'Paso 2',
    title: 'Busca el pico',
    body:
      'Pulsa "Calibrar y Buscar Resonancia" para activar el micrófono. Cambia el nivel de agua poco a poco y observa la barra de amplitud: cuando llega al máximo, ¡encontraste la resonancia! Ese es tu pico.',
    Schema: SchemaPeak,
  },
  {
    badge: 'Fórmulas',
    title: 'Cómo se calcula cada cosa',
    body:
      'Estas son las fórmulas que la app usa por ti. Tú solo das los datos (frecuencia, longitud, temperatura, diámetro) y ella encuentra la velocidad del sonido y su margen de error.',
    Schema: SchemaFormulas,
  },
  {
    badge: 'Paso 3',
    title: 'Registra y obtén el resultado',
    body:
      'Guarda cada pico que encuentres. Con tus medidas la app calcula la velocidad del sonido con su margen de error y dibuja la regresión. Cuantos más picos registres, más preciso será tu resultado.',
    Schema: SchemaResult,
  },
  {
    badge: 'Física fina',
    title: 'Consejos para medir bien',
    body: 'Detalles que separan una medida regular de una excelente:',
    Schema: SchemaTips,
  },
  {
    badge: 'Resumen',
    title: 'Paso a paso para usar la app',
    body: 'Sigue este orden el día de la presentación:',
    Schema: SchemaSteps,
  },
];

export function TutorialOverlay({ onClose }: TutorialOverlayProps) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const Schema = current.Schema;

  const next = () => (isLast ? onClose() : setStep((s) => s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="modal-overlay tut-overlay" onClick={onClose}>
      <div className="tut-card" onClick={(e) => e.stopPropagation()}>
        <button className="tut-close" onClick={onClose} title="Cerrar tutorial" aria-label="Cerrar">
          <X size={20} />
        </button>

        <div className="tut-badge">
          <Sparkles size={14} />
          <span>{current.badge}</span>
        </div>

        <div className="tut-schema-frame">
          <Schema />
        </div>

        <h2 className="tut-title">{current.title}</h2>
        <p className="tut-body">{current.body}</p>

        <div className="tut-dots">
          {STEPS.map((_, i) => (
            <button
              key={i}
              className={`tut-dot ${i === step ? 'active' : ''}`}
              onClick={() => setStep(i)}
              aria-label={`Ir al paso ${i + 1}`}
            />
          ))}
        </div>

        <div className="tut-nav">
          <button className="btn btn-icon tut-prev" onClick={prev} disabled={step === 0}>
            <ChevronLeft size={18} /> Atrás
          </button>
          <button className="btn btn-primary tut-next" onClick={next}>
            {isLast ? (
              <>
                <Check size={18} /> ¡Empezar!
              </>
            ) : (
              <>
                Siguiente <ChevronRight size={18} />
              </>
            )}
          </button>
        </div>

        {!isLast && (
          <button className="tut-skip" onClick={onClose}>
            Saltar tutorial
          </button>
        )}
      </div>
    </div>
  );
}
