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

// Push ups to failure, full reps. Adults: CSEP-PATH, Payne et al. 2000 (https://doi.org/10.1139/h00-028), the push up
// standard ACSM adopted; P5, P25, P50, P75, P95 as mapped from its rating cut points (fitnessnorms.pages.dev/strength/push-ups/).
// Adult women's table is the knee push up, so a full rep from a woman is ranked against an easier test: her rank can only be
// understated, never inflated. Under 20: FitnessGram, Santos et al. 2014, n = 22,048, full push ups for both sexes.
const PU = {
  Male: [[15, 4, 10, 14, 20, 31], [16, 6, 11, 16, 23, 33], [17, 7, 13, 18, 25, 36], [19, 8, 15, 20, 27, 38],
    [29, 8, 22, 25, 29, 40], [39, 5, 17, 19, 22, 35], [49, 4, 13, 15, 17, 30], [59, 3, 10, 11, 13, 26], [200, 2, 8, 9, 11, 22]],
  Female: [[15, 2, 5, 8, 12, 21], [16, 2, 5, 8, 13, 21], [17, 2, 5, 9, 14, 22], [19, 2, 6, 10, 14, 23],
    [29, 4, 15, 18, 21, 35], [39, 3, 13, 16, 20, 31], [49, 2, 11, 13, 15, 29], [59, 0, 7, 9, 11, 27], [200, 0, 5, 8, 12, 20]],
};
const BANDS = [[15, 'under 16'], [16, 'aged 16'], [17, 'aged 17'], [19, 'aged 18 to 19'], [29, 'aged 20 to 29'], [39, 'aged 30 to 39'], [49, 'aged 40 to 49'], [59, 'aged 50 to 59'], [200, 'aged 60 and up']];
export function pushupRank(n, age, sex) {
  const f = /^(female|women)$/i.test(sex || ''), i = PU.Male.findIndex(r => (+age || 25) <= r[0]), row = PU[f ? 'Female' : 'Male'][i].slice(1), P = [5, 25, 50, 75, 95];
  let p;
  if (n <= row[0]) p = row[0] ? 5 * n / row[0] : 5;
  else if (n >= row[4]) p = 95 + 4 * Math.min(1, (n - row[4]) / 10);
  else for (let k = 0; k < 4; k++) if (n <= row[k + 1]) { p = row[k + 1] === row[k] ? P[k + 1] : P[k] + (P[k + 1] - P[k]) * (n - row[k]) / (row[k + 1] - row[k]); break; }
  return { p: pct(p), who: (f ? 'women ' : 'men ') + BANDS[i][1], src: i < 4 ? 'FitnessGram norms' : 'Canadian fitness test norms (CSEP)' };
}
