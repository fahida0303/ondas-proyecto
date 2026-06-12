// Motor de física del Asistente de Resonancia: tubo cerrado en el agua y abierto
// en la boca. Resuena en armónicos impares: L_n = (2n-1)·λ/4 - e.

// Incertidumbres instrumentales por defecto (1σ).
export const LENGTH_UNCERTAINTY_CM = 0.2;
export const FREQ_UNCERTAINTY_HZ = 1.0;

// Mide la velocidad teórica del sonido en aire seco a temperatura T (°C).
export function theoreticalSpeedOfSound(temperatureC: number): number {
  return 331.45 * Math.sqrt(1 + temperatureC / 273.15);
}

// Mide la corrección de extremo del vientre que sobresale de la boca: e = 0.3·D.
export function endCorrection(diameterCm: number): number {
  return 0.3 * (diameterCm / 100);
}

export interface SinglePointResult {
  wavelength: number;
  experimentalSpeed: number;
  theoreticalSpeed: number;
  errorPercentage: number;
  speedUncertainty: number;
}

// Mide la velocidad del sonido a partir de UNA resonancia (asume e = 0.3·D) y
// propaga la incertidumbre: Δv/v = √[(Δf/f)² + (ΔL/L)²].
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
  mode: number;
  lengthCm: number;
}

// Predice las longitudes de columna de aire que resuenan y caben en el tubo
// (armónicos impares, cada λ/2): L_m = m·λ/4 - e.
export function predictedResonances(
  frequency: number,
  temperatureC: number,
  diameterCm: number,
  maxLengthCm: number
): PredictedResonance[] {
  const v = theoreticalSpeedOfSound(temperatureC);
  const lambda = v / frequency;
  const e = endCorrection(diameterCm);
  const out: PredictedResonance[] = [];

  for (let m = 1; m <= 199; m += 2) {
    const lengthCm = ((m * lambda) / 4 - e) * 100;
    if (lengthCm > maxLengthCm) break;
    if (lengthCm > 0) out.push({ mode: m, lengthCm });
  }
  return out;
}

// Mide la respuesta esperada (0..1) de una columna de aire como curva de Lorentz
// por pico: 1 en el pico, cae al alejarse.
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

// Encuentra el pico de resonancia más cercano (deltaCm > 0 ⇒ alargar la columna).
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
  return { peak: best, deltaCm: best.lengthCm - airColumnCm };
}

export interface RegressionPoint {
  mode: number;
  lengthCm: number;
}

export interface RegressionResult {
  speed: number;
  speedUncertainty: number;
  wavelength: number;
  endCorrectionMeasured: number;
  rSquared: number;
  nPoints: number;
  modes: number[];
}

// Mide la velocidad por regresión de L_n = (λ/4)·n - e: la pendiente da λ (y v)
// sin suponer e, y e se mide como -intercepto. Δv combina el error estadístico
// de la pendiente (n≥3) con el piso instrumental ΔL/√Sxx, tomando el mayor.
export function regressionResult(
  points: RegressionPoint[],
  frequency: number
): RegressionResult | null {
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
  if (sxx === 0) return null;

  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;

  const wavelength = 4 * slope;
  const speed = frequency * wavelength;
  const endCorrectionMeasured = -intercept;

  const rSquared = syy === 0 ? 1 : (sxy * sxy) / (sxx * syy);

  const dL = LENGTH_UNCERTAINTY_CM / 100;
  const instrumentalSlopeErr = dL / Math.sqrt(sxx);
  let slopeErr = instrumentalSlopeErr;
  if (n >= 3) {
    let residualSS = 0;
    for (let i = 0; i < n; i++) {
      const predicted = slope * xs[i] + intercept;
      residualSS += (ys[i] - predicted) ** 2;
    }
    const slopeStdErr = Math.sqrt(residualSS / (n - 2) / sxx);
    slopeErr = Math.max(slopeStdErr, instrumentalSlopeErr);
  }
  const speedUncertainty = frequency * 4 * slopeErr;

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
