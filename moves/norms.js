// Published norms behind "better than X% of people". Every table names its source.
export const PROFILE = [
  { k: 'age', label: 'Your age', def: 25, global: true },
  { k: 'sex', label: 'Sex (for the norms)', type: 'select', options: ['Male', 'Female'], def: 'Male', global: true },
];
const erf = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const Phi = z => 0.5 * (1 + erf(z / Math.SQRT2));
const pct = p => Math.round(Math.max(1, Math.min(99, p)));

// Countermovement jump by flight time. Canadian Health Measures Survey, Hoffmann et al. 2019 (n about 5,200),
// percentiles P5, P25, P50, P75, P95 in cm. https://doi.org/10.25318/82-003-x201901000002-eng
const VJ = {
  Male: { '20 to 24': [32.6, 42.8, 49.4, 55.5, 63.8], '30 to 34': [30.1, 39.7, 45.8, 51.5, 59.1], '40 to 44': [27.5, 35.7, 41.1, 46.3, 53.3] },
  Female: { '20 to 24': [22.8, 28.0, 31.8, 35.8, 41.4], '30 to 34': [21.7, 27.0, 30.9, 34.8, 40.7], '40 to 44': [20.1, 25.2, 29.1, 33.0, 38.7] },
};
export function jumpRank(cm, age, sex) {
  const band = age < 27 ? '20 to 24' : age < 37 ? '30 to 34' : '40 to 44', row = VJ[sex === 'Female' ? 'Female' : 'Male'][band], P = [5, 25, 50, 75, 95];
  let p; if (cm <= row[0]) p = 5 * cm / row[0]; else if (cm >= row[4]) p = 95 + 4 * Math.min(1, (cm - row[4]) / 10);
  else for (let i = 0; i < 4; i++) if (cm <= row[i + 1]) { p = P[i] + (P[i + 1] - P[i]) * (cm - row[i]) / (row[i + 1] - row[i]); break; }
  return { p: pct(p), who: (sex === 'Female' ? 'women' : 'men') + ' aged ' + band, src: 'Canadian Health Measures Survey' };
}

// One leg stance, eyes closed, seconds (test capped at 30 s). Springer et al. 2007, n = 549, mean (SD).
// https://www.sralab.org/rehabilitation-measures/timed-unipedal-stance-test-single-leg-support-one-leg-stance-test
const BAL = [[49, 20.7, 9.5, '20 to 49'], [59, 6.1, 4.7, '50 to 59'], [69, 2.0, 4.7, '60 to 69'], [200, 1.0, 3.9, '70 to 79']];
export function balanceRank(s, age) { const [, m, sd, band] = BAL.find(b => age <= b[0]); return { p: pct(Phi((Math.min(s, 30) - m) / sd) * 100), who: 'people aged ' + band, src: 'Springer 2007' }; }

// Plank hold, college students, mean (SD) seconds. Strand et al. 2014, n = 471.
// https://scholars.lmu.edu/en/publications/norms-for-an-isometric-muscle-endurance-test/
export function plankRank(s, sex) { const [m, sd] = sex === 'Female' ? [83, 63] : [124, 72]; return { p: pct(Phi((s - m) / sd) * 100), who: (sex === 'Female' ? 'women' : 'men') + ' in a college study', src: 'Strand 2014' }; }

// Visual reaction time online: median about 0.273 s, log normal spread about 0.25 (online test data, not peer reviewed).
export function reactionRank(s) { return { p: pct((1 - Phi(Math.log(s / 0.273) / 0.25)) * 100), who: 'people taking online reaction tests', src: 'online test data' }; }

export const rankLine = r => 'Better than ' + r.p + '% of ' + r.who;
