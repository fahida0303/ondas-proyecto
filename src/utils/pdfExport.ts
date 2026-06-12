import { jsPDF } from 'jspdf';
import type { HistoryRecord } from '../hooks/useResonanceAnalyzer';
import {
  theoreticalSpeedOfSound,
  endCorrection,
  regressionResult,
  LENGTH_UNCERTAINTY_CM,
  FREQ_UNCERTAINTY_HZ,
} from './physics';
import type { RegressionResult } from './physics';

// ── Colores y constantes de estilo ──────────────────────────────────────
const DARK_TEXT: [number, number, number] = [30, 30, 30];
const SECTION_COLOR: [number, number, number] = [20, 60, 120];
const SUBSECTION_COLOR: [number, number, number] = [40, 80, 140];
const ACCENT: [number, number, number] = [0, 100, 180];
const GRAY: [number, number, number] = [100, 100, 100];
const TABLE_HEADER_BG: [number, number, number] = [230, 240, 250];
const TABLE_ALT_BG: [number, number, number] = [245, 248, 252];
const BORDER_COLOR: [number, number, number] = [180, 195, 215];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_L = 25;
const MARGIN_R = 25;
const MARGIN_T = 30;
const MARGIN_B = 25;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;

// ── Helpers ─────────────────────────────────────────────────────────────

function addFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.line(MARGIN_L, PAGE_H - MARGIN_B + 5, PAGE_W - MARGIN_R, PAGE_H - MARGIN_B + 5);
  doc.text(
    `Asistente de Resonancia 3D — Reporte de Laboratorio`,
    MARGIN_L,
    PAGE_H - MARGIN_B + 10
  );
  doc.text(
    `Página ${pageNum} de ${totalPages}`,
    PAGE_W - MARGIN_R,
    PAGE_H - MARGIN_B + 10,
    { align: 'right' }
  );
}

function checkPage(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - MARGIN_B - 10) {
    doc.addPage();
    return MARGIN_T;
  }
  return y;
}

// ── Generador principal ─────────────────────────────────────────────────

export function exportToPDF(history: HistoryRecord[]) {
  if (history.length === 0) return;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = MARGIN_T;

  // ════════════════════════════════════════════════════════════════════
  // PORTADA
  // ════════════════════════════════════════════════════════════════════

  // Línea decorativa superior
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.8);
  doc.line(MARGIN_L, 40, PAGE_W - MARGIN_R, 40);

  // Título principal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...SECTION_COLOR);
  doc.text('Informe de Laboratorio', PAGE_W / 2, 55, { align: 'center' });

  doc.setFontSize(16);
  doc.setTextColor(...SUBSECTION_COLOR);
  doc.text('Velocidad del Sonido por Resonancia', PAGE_W / 2, 65, { align: 'center' });
  doc.text('en Tubo Cerrado', PAGE_W / 2, 73, { align: 'center' });

  // Línea decorativa inferior del título
  doc.setLineWidth(0.4);
  doc.line(MARGIN_L + 30, 78, PAGE_W - MARGIN_R - 30, 78);

  // Subtítulo
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(...GRAY);
  doc.text('Método de columna de aire variable', PAGE_W / 2, 87, { align: 'center' });

  // Info del documento
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  const timeStr = now.toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit'
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...DARK_TEXT);

  const infoY = 105;
  doc.text(`Fecha: ${dateStr}`, PAGE_W / 2, infoY, { align: 'center' });
  doc.text(`Hora: ${timeStr}`, PAGE_W / 2, infoY + 6, { align: 'center' });
  doc.text(`Mediciones registradas: ${history.length}`, PAGE_W / 2, infoY + 12, { align: 'center' });

  // Recuadro con resumen rápido
  const boxY = 130;
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.3);
  doc.setFillColor(248, 250, 255);
  doc.roundedRect(MARGIN_L + 10, boxY, CONTENT_W - 20, 40, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...SECTION_COLOR);
  doc.text('Resumen del Experimento', PAGE_W / 2, boxY + 8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...DARK_TEXT);

  const tempAvg = history.reduce((s, r) => s + r.temperature, 0) / history.length;
  const freqs = [...new Set(history.map(r => r.frequency))];
  const modes = [...new Set(history.map(r => r.mode))].sort((a, b) => a - b);

  doc.text(`Temperatura promedio: ${tempAvg.toFixed(1)} °C`, MARGIN_L + 16, boxY + 16);
  doc.text(`Frecuencias utilizadas: ${freqs.join(', ')} Hz`, MARGIN_L + 16, boxY + 22);
  doc.text(`Modos medidos: ${modes.join(', ')}`, MARGIN_L + 16, boxY + 28);
  doc.text(`Diámetro del tubo: ${history[0].diameter} cm`, MARGIN_L + 16, boxY + 34);

  // Pie de portada
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'Generado automáticamente por el Asistente de Resonancia 3D',
    PAGE_W / 2,
    PAGE_H - 30,
    { align: 'center' }
  );

  // ════════════════════════════════════════════════════════════════════
  // PÁGINAS DE CONTENIDO
  // ════════════════════════════════════════════════════════════════════
  doc.addPage();
  y = MARGIN_T;

  // ── § 1. Marco Teórico ────────────────────────────────────────────
  y = sectionTitle(doc, y, '1. Marco Teórico');

  y = paragraph(doc, y,
    'La resonancia acústica en un tubo cerrado en un extremo (por agua) y abierto en el otro ' +
    'se produce cuando la longitud de la columna de aire L coincide con un armónico impar de la ' +
    'longitud de onda. Las condiciones de contorno exigen un nodo de presión en el extremo ' +
    'cerrado y un vientre de presión en el extremo abierto.'
  );

  y = checkPage(doc, y, 20);
  y = equationBlock(doc, y, 'Condición de resonancia:   L_n = (2n − 1) · λ / 4 − e      donde n = 1, 2, 3, ...');

  y = paragraph(doc, y,
    'donde λ es la longitud de onda del sonido, n es el número del armónico (modo), y e es la ' +
    'corrección de extremo que compensa el hecho de que el vientre de presión se extiende ' +
    'ligeramente más allá de la boca del tubo.'
  );

  y = checkPage(doc, y, 20);
  y = equationBlock(doc, y, 'Corrección de extremo:   e = 0.3 · D');

  y = paragraph(doc, y,
    'La velocidad del sonido en aire depende de la temperatura según:'
  );

  y = checkPage(doc, y, 20);
  y = equationBlock(doc, y, 'v_teórica = 331.45 · √(1 + T/273.15)    [m/s]    (T en °C)');

  y = paragraph(doc, y,
    'Experimentalmente, la velocidad se determina a partir de la frecuencia conocida f y la ' +
    'longitud medida L mediante:'
  );

  y = checkPage(doc, y, 20);
  y = equationBlock(doc, y, 'v_exp = f · λ = f · 4(L + e) / (2n − 1)');

  // ── § 2. Procedimiento Experimental ───────────────────────────────
  y = checkPage(doc, y, 50);
  y = sectionTitle(doc, y, '2. Procedimiento Experimental');

  const steps = [
    'Se configuró la frecuencia del diapasón (o fuente sonora) en el sistema.',
    'Se ajustó la temperatura ambiente y el diámetro del tubo de resonancia.',
    'Se inició la captura de audio mediante el micrófono del dispositivo.',
    'El sistema calibró automáticamente el umbral de ruido ambiente durante 3 segundos.',
    'Se golpeó el diapasón y se colocó en la boca del tubo, variando lentamente la columna de agua.',
    'El analizador FFT detectó la frecuencia dominante en banda y siguió la amplitud en tiempo real.',
    'Cuando la amplitud alcanzó un máximo y cayó de forma sostenida (≥ 25 frames), el sistema identificó el pico de resonancia.',
    'Se registró la longitud de la columna de aire L correspondiente al máximo con una cinta métrica (±0.2 cm).',
    'El motor físico calculó automáticamente λ, v_exp, v_teórica, Δv y %Error.',
    'Se repitió el procedimiento para diferentes modos armónicos (1, 3, 5, ...) y/o frecuencias.',
  ];

  for (let i = 0; i < steps.length; i++) {
    y = checkPage(doc, y, 8);
    y = numberedItem(doc, y, i + 1, steps[i]);
  }

  // ── § 3. Propagación de Incertidumbres ────────────────────────────
  y = checkPage(doc, y, 50);
  y = sectionTitle(doc, y, '3. Propagación de Incertidumbres');

  y = paragraph(doc, y,
    `La incertidumbre instrumental en la longitud es ΔL = ${LENGTH_UNCERTAINTY_CM} cm y en la ` +
    `frecuencia ΔF = ${FREQ_UNCERTAINTY_HZ} Hz. La propagación se realiza sumando en cuadratura ` +
    'las contribuciones relativas:'
  );

  y = checkPage(doc, y, 20);
  y = equationBlock(doc, y, 'Δv / v = √[ (Δf/f)² + (ΔL/L_eff)² ]');

  y = paragraph(doc, y,
    'donde L_eff = L + e es la longitud efectiva de la columna de aire. Para el método de ' +
    'regresión (≥ 3 modos), se toma la mayor entre la incertidumbre estadística de la pendiente ' +
    'y el piso instrumental ΔL / √S_xx.'
  );

  // ── § 4. Datos Experimentales ─────────────────────────────────────
  y = checkPage(doc, y, 50);
  y = sectionTitle(doc, y, '4. Datos Experimentales');

  y = paragraph(doc, y,
    `Se registraron ${history.length} mediciones. La siguiente tabla presenta los datos ` +
    'recolectados con sus cálculos asociados:'
  );

  // Tabla de datos
  y = checkPage(doc, y, 30);
  y = dataTable(doc, y, history);

  // ── § 5. Resultados por Punto Individual ──────────────────────────
  y = checkPage(doc, y, 50);
  y = sectionTitle(doc, y, '5. Resultados por Punto Individual');

  for (let i = 0; i < history.length; i++) {
    const r = history[i];
    y = checkPage(doc, y, 35);
    y = subsectionTitle(doc, y, `5.${i + 1}. Medición ${i + 1}`);

    const date = new Date(r.timestamp);
    const vTheo = theoreticalSpeedOfSound(r.temperature);
    const e_cm = endCorrection(r.diameter) * 100;
    const L_eff = r.length + e_cm;
    const lambda_cm = (4 * (L_eff / 100)) / r.mode * 100;

    const lines = [
      `Fecha/Hora: ${date.toLocaleDateString('es-CO')} ${date.toLocaleTimeString('es-CO')}`,
      `Modo armónico: n = ${r.mode}    |    Frecuencia nominal: f = ${r.frequency} Hz`,
      `Frecuencia detectada (FFT): f_det = ${r.detectedFrequency || '—'} Hz    |    Frecuencia usada: f_u = ${r.usedFrequency} Hz`,
      `Temperatura: T = ${r.temperature} °C    |    Diámetro: D = ${r.diameter} cm`,
      `Longitud medida: L = ${r.length} cm    |    Corrección: e = ${e_cm.toFixed(2)} cm    |    L_eff = ${L_eff.toFixed(2)} cm`,
      `λ = 4·L_eff / n = 4·${L_eff.toFixed(2)} / ${r.mode} = ${lambda_cm.toFixed(2)} cm`,
      `v_exp = f · λ = ${r.usedFrequency} × ${(lambda_cm / 100).toFixed(4)} = ${r.experimentalSpeed} m/s`,
      `v_teórica = 331.45·√(1 + ${r.temperature}/273.15) = ${vTheo.toFixed(2)} m/s`,
      `Δv = ${r.speedUncertainty} m/s    |    Error = |v_exp − v_teó| / v_teó × 100 = ${r.errorPercentage}%`,
    ];

    for (const line of lines) {
      y = checkPage(doc, y, 5);
      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...DARK_TEXT);

      // Split long lines
      const splitLines = doc.splitTextToSize(line, CONTENT_W - 4);
      for (const sl of splitLines) {
        y = checkPage(doc, y, 4);
        doc.text(sl, MARGIN_L + 2, y);
        y += 4;
      }
    }
    y += 3;

    // Veredicto
    y = checkPage(doc, y, 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    if (r.errorPercentage <= 5) {
      doc.setTextColor(0, 120, 60);
      doc.text(`✓ Error aceptable (${r.errorPercentage}% ≤ 5%)`, MARGIN_L + 2, y);
    } else {
      doc.setTextColor(180, 60, 0);
      doc.text(`⚠ Error elevado (${r.errorPercentage}% > 5%)`, MARGIN_L + 2, y);
    }
    y += 8;
  }

  // ── § 6. Análisis por Regresión ───────────────────────────────────
  const byFreq = new Map<number, HistoryRecord[]>();
  for (const r of history) {
    const arr = byFreq.get(r.frequency) ?? [];
    arr.push(r);
    byFreq.set(r.frequency, arr);
  }

  const regressions: { frequency: number; temperature: number; records: HistoryRecord[]; result: RegressionResult }[] = [];
  for (const [freq, records] of byFreq) {
    const res = regressionResult(
      records.map(r => ({ mode: r.mode, lengthCm: r.length })),
      freq
    );
    if (res) {
      regressions.push({ frequency: freq, temperature: records[0].temperature, records, result: res });
    }
  }

  y = checkPage(doc, y, 50);
  y = sectionTitle(doc, y, '6. Análisis por Regresión Lineal');

  if (regressions.length === 0) {
    y = paragraph(doc, y,
      'No se dispone de suficientes datos (se requieren al menos 2 modos distintos con la misma ' +
      'frecuencia) para realizar un análisis por regresión.'
    );
  } else {
    y = paragraph(doc, y,
      'El método de regresión ajusta una recta L_n = (λ/4)·n − e a los datos, donde la ' +
      'pendiente da directamente λ/4 y el intercepto con el eje vertical mide la corrección de ' +
      'extremo e sin necesidad de suponerla. Esto elimina una fuente de sesgo sistemático.'
    );

    y = checkPage(doc, y, 15);
    y = equationBlock(doc, y, 'L_n = (λ/4) · n  −  e        →        v = f · λ = f · 4 · pendiente');

    for (const group of regressions) {
      const { result } = group;
      const vTheo = theoreticalSpeedOfSound(group.temperature);
      const errorPct = Math.abs(((result.speed - vTheo) / vTheo) * 100);
      const consistent = result.speedUncertainty > 0 &&
        Math.abs(result.speed - vTheo) <= result.speedUncertainty;

      y = checkPage(doc, y, 45);
      y = subsectionTitle(doc, y, `Grupo: f = ${group.frequency} Hz`);

      const regLines = [
        `Modos analizados: ${result.modes.join(', ')}    |    Puntos: n = ${result.nPoints}`,
        `λ medida = ${(result.wavelength * 100).toFixed(2)} cm`,
        `Corrección de extremo medida: e = ${(result.endCorrectionMeasured * 100).toFixed(3)} cm`,
        `R² = ${result.rSquared.toFixed(6)}`,
        `v_regresión = ${result.speed.toFixed(2)} ± ${result.speedUncertainty.toFixed(2)} m/s`,
        `v_teórica = ${vTheo.toFixed(2)} m/s`,
        `Error = ${errorPct.toFixed(2)}%`,
      ];

      for (const line of regLines) {
        y = checkPage(doc, y, 5);
        doc.setFont('courier', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...DARK_TEXT);
        doc.text(line, MARGIN_L + 2, y);
        y += 4.5;
      }

      y += 2;
      y = checkPage(doc, y, 8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      if (consistent) {
        doc.setTextColor(0, 120, 60);
        doc.text(`✓ Compatible con la teoría (desviación ${errorPct.toFixed(2)}%, dentro de ±Δv)`, MARGIN_L + 2, y);
      } else {
        doc.setTextColor(180, 60, 0);
        doc.text(`⚠ Desviación ${errorPct.toFixed(2)}% fuera de la banda de incertidumbre`, MARGIN_L + 2, y);
      }
      y += 10;
    }
  }

  // ── § 7. Conclusiones ─────────────────────────────────────────────
  y = checkPage(doc, y, 50);
  y = sectionTitle(doc, y, '7. Conclusiones');

  // Calcular estadísticas globales
  const speeds = history.map(r => r.experimentalSpeed);
  const errors = history.map(r => r.errorPercentage);
  const avgSpeed = speeds.reduce((s, v) => s + v, 0) / speeds.length;
  const avgError = errors.reduce((s, v) => s + v, 0) / errors.length;
  const minError = Math.min(...errors);
  const maxError = Math.max(...errors);
  const vTheoGlobal = theoreticalSpeedOfSound(tempAvg);

  y = paragraph(doc, y,
    `Se realizaron ${history.length} mediciones de la velocidad del sonido mediante resonancia en ` +
    `un tubo cerrado a una temperatura promedio de ${tempAvg.toFixed(1)} °C.`
  );

  y = paragraph(doc, y,
    `La velocidad teórica esperada a esta temperatura es v_teó = ${vTheoGlobal.toFixed(2)} m/s. ` +
    `La velocidad experimental promedio obtenida fue v_exp = ${avgSpeed.toFixed(2)} m/s.`
  );

  y = paragraph(doc, y,
    `El error porcentual promedio fue de ${avgError.toFixed(2)}%, con un rango entre ` +
    `${minError.toFixed(2)}% y ${maxError.toFixed(2)}%.`
  );

  if (avgError <= 5) {
    y = paragraph(doc, y,
      'Los resultados obtenidos son consistentes con el valor teórico dentro del margen de ' +
      'error experimental aceptable (≤ 5%), validando el método de resonancia en tubo cerrado ' +
      'como una técnica precisa para la determinación de la velocidad del sonido.'
    );
  } else {
    y = paragraph(doc, y,
      'El error promedio supera el 5%, lo que sugiere posibles fuentes de error sistemático como: ' +
      'desalineación del diapasón, fluctuaciones de temperatura, imprecisiones en la medición ' +
      'de la columna de aire, o ruido ambiental que afecta la detección de frecuencia.'
    );
  }

  if (regressions.length > 0) {
    const bestReg = regressions.sort((a, b) => b.result.nPoints - a.result.nPoints)[0];
    y = paragraph(doc, y,
      `El análisis por regresión lineal con ${bestReg.result.nPoints} modos a ` +
      `${bestReg.frequency} Hz produjo v = ${bestReg.result.speed.toFixed(2)} ± ` +
      `${bestReg.result.speedUncertainty.toFixed(2)} m/s con R² = ` +
      `${bestReg.result.rSquared.toFixed(4)}, lo cual proporciona una estimación más robusta ` +
      'al no depender del valor supuesto de la corrección de extremo.'
    );
  }

  // ── § 8. Referencias ──────────────────────────────────────────────
  y = checkPage(doc, y, 40);
  y = sectionTitle(doc, y, '8. Referencias');

  const refs = [
    'Kinsler, L. E., et al. "Fundamentals of Acoustics." John Wiley & Sons.',
    'Serway, R. A. & Jewett, J. W. "Physics for Scientists and Engineers." Cengage Learning.',
    'Young, H. D. & Freedman, R. A. "University Physics with Modern Physics." Pearson.',
    'Levine, H. & Schwinger, J. "On the radiation of sound from an unflanged circular pipe." Phys. Rev. 73, 383 (1948).',
  ];
  for (let i = 0; i < refs.length; i++) {
    y = checkPage(doc, y, 5);
    y = refItem(doc, y, i + 1, refs[i]);
  }

  // ── Numerar páginas ───────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }

  // ── Descargar ─────────────────────────────────────────────────────
  doc.save(`informe_laboratorio_resonancia_${now.getTime()}.pdf`);
}

// ── Funciones de formato ────────────────────────────────────────────────

function sectionTitle(doc: jsPDF, y: number, title: string): number {
  y = checkPage(doc, y, 15);
  y += 4;

  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.6);
  doc.line(MARGIN_L, y - 2, PAGE_W - MARGIN_R, y - 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...SECTION_COLOR);
  doc.text(title, MARGIN_L, y + 5);
  return y + 12;
}

function subsectionTitle(doc: jsPDF, y: number, title: string): number {
  y = checkPage(doc, y, 10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...SUBSECTION_COLOR);
  doc.text(title, MARGIN_L, y);
  return y + 6;
}

function paragraph(doc: jsPDF, y: number, text: string): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...DARK_TEXT);

  const lines = doc.splitTextToSize(text, CONTENT_W);
  for (const line of lines) {
    y = checkPage(doc, y, 5);
    doc.text(line, MARGIN_L, y);
    y += 4.5;
  }
  return y + 3;
}

function equationBlock(doc: jsPDF, y: number, eq: string): number {
  y = checkPage(doc, y, 14);

  // Fondo del bloque de ecuación
  doc.setFillColor(245, 247, 252);
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.2);
  doc.roundedRect(MARGIN_L + 5, y - 4, CONTENT_W - 10, 10, 1.5, 1.5, 'FD');

  // Línea accent izquierda
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(1.2);
  doc.line(MARGIN_L + 5, y - 4, MARGIN_L + 5, y + 6);

  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...ACCENT);
  doc.text(eq, MARGIN_L + 10, y + 2.5);
  return y + 14;
}

function numberedItem(doc: jsPDF, y: number, num: number, text: string): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...ACCENT);
  doc.text(`${num}.`, MARGIN_L + 2, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK_TEXT);
  const lines = doc.splitTextToSize(text, CONTENT_W - 10);
  for (let i = 0; i < lines.length; i++) {
    y = checkPage(doc, y, 4.5);
    doc.text(lines[i], MARGIN_L + 8, y);
    y += 4.5;
  }
  return y + 1.5;
}

function refItem(doc: jsPDF, y: number, num: number, text: string): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK_TEXT);
  doc.text(`[${num}]`, MARGIN_L, y);
  const lines = doc.splitTextToSize(text, CONTENT_W - 12);
  for (const line of lines) {
    y = checkPage(doc, y, 4);
    doc.text(line, MARGIN_L + 10, y);
    y += 4;
  }
  return y + 2;
}

function dataTable(doc: jsPDF, y: number, history: HistoryRecord[]): number {
  const headers = ['#', 'Modo', 'f (Hz)', 'L (cm)', 'T (°C)', 'v_exp', 'v_teó', 'Δv', 'Error%'];
  const colWidths = [8, 12, 18, 16, 14, 22, 22, 18, 18];
  const tableW = colWidths.reduce((s, w) => s + w, 0);
  const startX = MARGIN_L + (CONTENT_W - tableW) / 2;

  const rowH = 6;

  // Encabezado
  y = checkPage(doc, y, 10);
  doc.setFillColor(...TABLE_HEADER_BG);
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.2);
  doc.rect(startX, y - 4, tableW, rowH, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...SECTION_COLOR);

  let x = startX;
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], x + colWidths[i] / 2, y, { align: 'center' });
    x += colWidths[i];
  }
  y += rowH - 2;

  // Filas
  for (let r = 0; r < history.length; r++) {
    y = checkPage(doc, y, rowH + 2);
    const rec = history[r];

    if (r % 2 === 1) {
      doc.setFillColor(...TABLE_ALT_BG);
      doc.rect(startX, y - 3.5, tableW, rowH, 'F');
    }
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.1);
    doc.rect(startX, y - 3.5, tableW, rowH);

    const values = [
      `${r + 1}`,
      `${rec.mode}`,
      `${rec.usedFrequency}`,
      `${rec.length}`,
      `${rec.temperature}`,
      `${rec.experimentalSpeed}`,
      `${rec.theoreticalSpeed}`,
      `${rec.speedUncertainty}`,
      `${rec.errorPercentage}`,
    ];

    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...DARK_TEXT);

    x = startX;
    for (let i = 0; i < values.length; i++) {
      doc.text(values[i], x + colWidths[i] / 2, y + 0.5, { align: 'center' });
      x += colWidths[i];
    }
    y += rowH;
  }

  return y + 6;
}
