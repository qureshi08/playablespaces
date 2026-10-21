// Time of day, 5.5 to 23.5 hours. Keyframes of light and sky, blended smoothly between.
// The sun swings round the flat: low through the left (dining) window in the morning, behind the flat
// around midday, low and gold over the open front-right in the evening. After dark the moon and the lamps.
import * as THREE from 'three';
import { clamp, smooth, lerp } from './util.js';

export const H_MIN = 5.5, H_MAX = 23.5;
export const SUNRISE = 5.9, SUNSET = 20.3;

// sun = sun strength, moon = moonlight, hemi = sky fill, env = reflections, exp = exposure, lamps = 0..1
const KEYS = [
  { h: 5.5, sun: 0, sunC: '#ff9a6a', moon: 0.12, hemi: 0.15, sky: '#56669a', gnd: '#1c1922', env: 0.22, exp: 1.12, lamps: 1, zen: '#0e1830', hor: '#3a4470', glow: '#ff8a5a', gk: 0, tower: '#141a2a', mist: '#2a3350', lit: 1, sea: '#0c1426' },
  { h: 6.5, sun: 0.9, sunC: '#ff9c6a', moon: 0.05, hemi: 0.24, sky: '#8a92b8', gnd: '#3a2e2c', env: 0.32, exp: 1.07, lamps: 0.7, zen: '#2a3d6e', hor: '#f0a07a', glow: '#ffb070', gk: 0.9, tower: '#2a2f44', mist: '#8a7f92', lit: 0.5, sea: '#3a4766' },
  { h: 8, sun: 2.4, sunC: '#ffd2a0', moon: 0, hemi: 0.32, sky: '#b8c6e0', gnd: '#5a4a3e', env: 0.42, exp: 0.98, lamps: 0, zen: '#5d86c4', hor: '#ffd8b0', glow: '#ffe0b0', gk: 0.6, tower: '#5a6478', mist: '#b7bccb', lit: 0.05, sea: '#5d7a9e' },
  { h: 10.5, sun: 2.8, sunC: '#fff0dc', moon: 0, hemi: 0.4, sky: '#c8d6ee', gnd: '#6a5a4a', env: 0.52, exp: 0.88, lamps: 0, zen: '#4f86d0', hor: '#dbe8f5', glow: '#fff4e0', gk: 0.3, tower: '#6a7488', mist: '#c4ccd8', lit: 0, sea: '#4f77a6' },
  { h: 13, sun: 3, sunC: '#fff6ea', moon: 0, hemi: 0.44, sky: '#cbd8ef', gnd: '#6e5e4e', env: 0.56, exp: 0.84, lamps: 0, zen: '#4a83d0', hor: '#e0ecf8', glow: '#fff6e8', gk: 0.2, tower: '#6c768a', mist: '#c8d0dc', lit: 0, sea: '#4a76a8' },
  { h: 16.2, sun: 2.8, sunC: '#ffe8c8', moon: 0, hemi: 0.4, sky: '#c8cce0', gnd: '#6a5646', env: 0.5, exp: 0.88, lamps: 0, zen: '#5684c8', hor: '#f2e2c8', glow: '#ffd8a0', gk: 0.35, tower: '#646a7c', mist: '#c9c3c3', lit: 0, sea: '#4e6f9a' },
  { h: 18.4, sun: 2.6, sunC: '#ffb066', moon: 0, hemi: 0.3, sky: '#b9a898', gnd: '#6a4a36', env: 0.44, exp: 0.95, lamps: 0.4, zen: '#3b4f8a', hor: '#ffb070', glow: '#ffa050', gk: 1, tower: '#3a3a4c', mist: '#b08070', lit: 0.35, sea: '#4a4a66' },
  { h: 19.4, sun: 1, sunC: '#ff7a4a', moon: 0.05, hemi: 0.26, sky: '#8d8296', gnd: '#3a2a2a', env: 0.36, exp: 1, lamps: 0.85, zen: '#26315e', hor: '#e0806a', glow: '#ff7a50', gk: 1, tower: '#22263a', mist: '#6a5070', lit: 0.75, sea: '#2a2c48' },
  { h: 20.4, sun: 0, sunC: '#ff6a40', moon: 0.12, hemi: 0.2, sky: '#5a6a9a', gnd: '#1d1a24', env: 0.26, exp: 1.08, lamps: 1, zen: '#121c3a', hor: '#2e3866', glow: '#ff8a5a', gk: 0.25, tower: '#141a2c', mist: '#2a3354', lit: 1, sea: '#0e1630' },
  { h: 23.5, sun: 0, sunC: '#ff6a40', moon: 0.14, hemi: 0.15, sky: '#56669a', gnd: '#1c1922', env: 0.22, exp: 1.12, lamps: 1, zen: '#0b1428', hor: '#283160', glow: '#ff8a5a', gk: 0, tower: '#121726', mist: '#262e4a', lit: 1, sea: '#0a1222' },
];
const COLOR_KEYS = ['sunC', 'sky', 'gnd', 'zen', 'hor', 'glow', 'tower', 'mist', 'sea'];
KEYS.forEach(k => COLOR_KEYS.forEach(c => { k[c] = new THREE.Color(k[c]); }));

const out = Object.fromEntries(COLOR_KEYS.map(c => [c, new THREE.Color()]));
export function sample(h) {
  h = clamp(h, H_MIN, H_MAX);
  let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1].h < h) i++;
  const a = KEYS[i], b = KEYS[i + 1], t = smooth(0, 1, (h - a.h) / (b.h - a.h));
  for (const k in a) {
    if (k === 'h') continue;
    if (a[k] instanceof THREE.Color) out[k].copy(a[k]).lerp(b[k], t);
    else out[k] = lerp(a[k], b[k], t);
  }
  out.h = h;
  return out;
}

// sun direction: azimuth measured from +z towards +x (degrees), elevation above the floor
const D2R = Math.PI / 180;
export function sunAngles(h) {
  const t = clamp((h - SUNRISE) / (SUNSET - SUNRISE), 0, 1);
  const az = -90 - t * 225;                                  // left -> behind -> front right
  const el = 6 + 54 * Math.sin(Math.PI * t) ** 0.8;           // low at both ends, ~60 degrees at midday
  return { az, el };
}
export function moonAngles(h) {
  const t = clamp((h - SUNSET) / (H_MAX - SUNSET), 0, 1);
  return { az: 60 + t * 70, el: 22 + 26 * Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.1)) };
}
export function dirFrom({ az, el }, v = new THREE.Vector3()) {
  return v.set(Math.cos(el * D2R) * Math.sin(az * D2R), Math.sin(el * D2R), Math.cos(el * D2R) * Math.cos(az * D2R));
}
export const isNight = h => h > SUNSET + 0.05 || h < SUNRISE - 0.05;

// where the sun or moon sprite sits for the path drawn around the plinth
export const ARC_R = 8.6, ARC_C = new THREE.Vector3(0, 0.4, 0);
export function bodyPos(h, v = new THREE.Vector3()) {
  const ang = isNight(h) ? moonAngles(h) : sunAngles(h);
  return dirFrom(ang, v).multiplyScalar(ARC_R).add(ARC_C);
}

// gradient for the time slider track: horizon colours across the day
export function sliderGradient() {
  const stops = [];
  for (const h of [5.5, 6.4, 8, 12.8, 16.5, 18.5, 19.6, 21, 23.5]) {
    const s = sample(h), c = s.hor.clone().lerp(s.sunC, h > 6 && h < 20 ? 0.35 : 0);
    stops.push(`#${c.getHexString()} ${((h - H_MIN) / (H_MAX - H_MIN) * 100).toFixed(1)}%`);
  }
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

export const fmt = h => { const m = Math.round(h * 60); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
