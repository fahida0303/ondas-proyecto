/**
 * Motor de física del Asistente de Resonancia.
 *
 * Todas las funciones son puras (sin estado, sin React) para poder testearlas
 * y razonar sobre ellas de forma aislada. La práctica determina la velocidad
 * del sonido con un tubo resonante cerrado en el agua y abierto en la boca,
 * por lo que las resonancias ocurren en los armónicos impares:
 *
 *      L_n = (2n-1) · λ/4 - e        con  (2n-1) ∈ {1, 3, 5}  (= "modo")
 *
 * donde `e` es la corrección de extremo del vientre que sobresale de la boca.
 */

/** Incertidumbres instrumentales por defecto (1σ). */
export const LENGTH_UNCERTAINTY_CM = 0.2; // resolución típica al leer el nivel de agua
export const FREQ_UNCERTAINTY_HZ = 1.0; // tolerancia del diapasón / resolución FFT

/**
 * Velocidad teórica del sonido en aire seco a temperatura T (°C).
 * Usa la forma exacta v = v0·√(1 + T/273.15) en lugar de la lineal 331.4 + 0.6T,
 * más precisa lejos de 0 °C. v0 = 331.45 m/s.
 */
export function theoreticalSpeedOfSound(temperatureC: number): number {
  return 331.45 * Math.sqrt(1 + temperatureC / 273.15);
}

/** Corrección de extremo de un tubo con un solo extremo abierto: e ≈ 0.6·r = 0.3·D. */
export function endCorrection(diameterCm: number): number {
  return 0.3 * (diameterCm / 100);
}

export interface SinglePointResult {
  wavelength: number; // λ (m)
  experimentalSpeed: number; // v = f·λ (m/s)
  theoreticalSpeed: number; // v_teórica(T) (m/s)
  errorPercentage: number; // |v - v_teo| / v_teo · 100
  speedUncertainty: number; // Δv (m/s), propagación de incertidumbre
}

/**
 * Velocidad del sonido a partir de UNA sola resonancia, usando la corrección
 * de extremo estimada e = 0.3·D. Incluye propagación de incertidumbre:
 *
 *      Δv/v = √[ (Δf/f)² + (ΔL_ef/L_ef)² ]
 */
export function singlePointResult(params: {
  frequency: number;
  lengthCm: number;
  mode: number;
  diameterCm: number;
  temperature: number;
}): SinglePointResult {
  const { frequency, lengthCm, mode, diameterCm, temperature } = params;

  const lengthM = lengthCm / 100;
  const effectiveLength = lengthM + endCorrection(diameterCm);

  const wavelength = (4 * effectiveLength) / mode;
  const experimentalSpeed = wavelength * frequency;

  const theoreticalSpeed = theoreticalSpeedOfSound(temperature);
  const errorPercentage = Math.abs(
    ((experimentalSpeed - theoreticalSpeed) / theoreticalSpeed) * 100
  );

  const dL = LENGTH_UNCERTAINTY_CM / 100;
  const relUncertainty = Math.sqrt(
    Math.pow(FREQ_UNCERTAINTY_HZ / frequency, 2) +
      Math.pow(dL / effectiveLength, 2)
  );
  const speedUncertainty = experimentalSpeed * relUncertainty;

  return {
    wavelength,
    experimentalSpeed,
    theoreticalSpeed,
    errorPercentage,
    speedUncertainty,
  };
}

export interface PredictedResonance {
  mode: number; // armónico impar (2n-1): 1, 3, 5, 7...
  lengthCm: number; // longitud de columna de aire donde resuena (cm)
}

/**
 * Predice TODAS las longitudes de columna de aire que resuenan para una
 * frecuencia dada y que caben dentro del tubo. Como las resonancias del tubo
 * cerrado caen en los armónicos impares, aparecen cada λ/2:
 *
 *      L_m = m·λ/4 - e        con  m = 1, 3, 5, 7...
 */
export function predictedResonances(
  frequency: number,
  temperatureC: number,
  diameterCm: number,
  maxLengthCm: number
): PredictedResonance[] {
  const v = theoreticalSpeedOfSound(temperatureC);
  const lambda = v / frequency; // m
  const e = endCorrection(diameterCm); // m
  const out: PredictedResonance[] = [];

  for (let m = 1; m <= 199; m += 2) {
    const lengthCm = ((m * lambda) / 4 - e) * 100;
    if (lengthCm > maxLengthCm) break;
    if (lengthCm > 0) out.push({ mode: m, lengthCm });
  }
  return out;
}

/**
 * Respuesta de resonancia esperada (0..1) para una columna de aire dada.
 * Modela cada resonancia como una curva de Lorentz (campana) centrada en L_m;
 * el valor es 1 justo en un pico y cae suavemente al alejarse. `halfWidthCm`
 * controla qué tan "afilada" es la resonancia (ancho a media altura ≈ 2·hw).
 */
export function resonanceResponse(
  airColumnCm: number,
  peaks: PredictedResonance[],
  halfWidthCm = 1.2
): number {
  let best = 0;
  for (const p of peaks) {
    const x = (airColumnCm - p.lengthCm) / halfWidthCm;
    const val = 1 / (1 + x * x);
    if (val > best) best = val;
  }
  return best;
}

/** Pico de resonancia más cercano a una longitud de aire dada (o null si no hay). */
export function nearestResonance(
  airColumnCm: number,
  peaks: PredictedResonance[]
): { peak: PredictedResonance; deltaCm: number } | null {
  if (peaks.length === 0) return null;
  let best = peaks[0];
  for (const p of peaks) {
    if (Math.abs(p.lengthCm - airColumnCm) < Math.abs(best.lengthCm - airColumnCm)) {
      best = p;
    }
  }
  // deltaCm > 0 ⇒ hay que ALARGAR la columna (bajar el agua) para llegar al pico.
  return { peak: best, deltaCm: best.lengthCm - airColumnCm };
}

export interface RegressionPoint {
  mode: number; // (2n-1) ∈ {1, 3, 5}
  lengthCm: number;
}

export interface RegressionResult {
  /** Velocidad del sonido medida por la pendiente, SIN corrección supuesta. */
  speed: number; // v = f·λ (m/s)
  speedUncertainty: number; // Δv del error estándar de la pendiente (m/s)
  wavelength: number; // λ = 4·pendiente (m)
  /** Corrección de extremo MEDIDA: e = -ordenada al origen (m). */
  endCorrectionMeasured: number;
  rSquared: number; // bondad del ajuste lineal
  nPoints: number; // nº de modos distintos usados
  modes: number[]; // modos usados
}

/**
 * Método de diferencia de modos / regresión lineal.
 *
 * Ajustando L_n = (λ/4)·(2n-1) - e a varias resonancias, la pendiente da λ
 * (y por tanto v = f·λ) SIN necesidad de suponer la corrección de extremo: ésta
 * se cancela y aparece como la ordenada al origen (e = -intercepto), que se
 * mide empíricamente. Es el método de máxima precisión del laboratorio.
 *
 * Requiere al menos 2 modos distintos. La incertidumbre de v se obtiene del
 * error estándar de la pendiente (requiere ≥3 puntos para ser no nula).
 */
export function regressionResult(
  points: RegressionPoint[],
  frequency: number
): RegressionResult | null {
  // Promediar longitudes que comparten modo (más datos ⇒ mejor estimación).
  const byMode = new Map<number, number[]>();
  for (const p of points) {
    const arr = byMode.get(p.mode) ?? [];
    arr.push(p.lengthCm / 100);
    byMode.set(p.mode, arr);
  }

  const xs: number[] = [];
  const ys: number[] = [];
  for (const [mode, lengths] of byMode) {
    xs.push(mode);
    ys.push(lengths.reduce((a, b) => a + b, 0) / lengths.length);
  }

  const n = xs.length;
  if (n < 2) return null;

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - meanX) ** 2;
    sxy += (xs[i] - meanX) * (ys[i] - meanY);
    syy += (ys[i] - meanY) ** 2;
  }
  if (sxx === 0) return null; // todos los modos iguales

  const slope = sxy / sxx; // λ/4
  const intercept = meanY - slope * meanX; // -e

  const wavelength = 4 * slope;
  const speed = frequency * wavelength;
  const endCorrectionMeasured = -intercept;

  // Coeficiente de determinación.
  const rSquared = syy === 0 ? 1 : (sxy * sxy) / (sxx * syy);

  // Error estándar de la pendiente → Δv = f · 4 · SE(pendiente).
  let speedUncertainty = 0;
  if (n >= 3) {
    let residualSS = 0;
    for (let i = 0; i < n; i++) {
      const predicted = slope * xs[i] + intercept;
      residualSS += (ys[i] - predicted) ** 2;
    }
    const slopeStdErr = Math.sqrt(residualSS / (n - 2) / sxx);
    speedUncertainty = frequency * 4 * slopeStdErr;
  }

  return {
    speed,
    speedUncertainty,
    wavelength,
    endCorrectionMeasured,
    rSquared,
    nPoints: n,
    modes: xs.slice().sort((a, b) => a - b),
  };
}
