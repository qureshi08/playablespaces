// The product registry: every piece a room can place, under a stable id.
// The stand-ins are the generic pieces the first flat was built with. Real products (KIT_PLAN step 3)
// go one per file in this folder and are added with addProduct().
// PIECE_ORDER is also each id's number inside share links, so ids are only ever appended, never reordered.
import { PIECES as STANDINS, PIECE_ORDER as STANDIN_ORDER } from './standins.js';
export { GLOWS, GLOW_BASE, paintPrint, paintPair } from './standins.js';

export const PIECES = { ...STANDINS };
export const PIECE_ORDER = [...STANDIN_ORDER];

const TO_M = { m: 1, cm: 0.01, mm: 0.001, in: 0.0254, ft: 0.3048 };

// a real product file exports:
// { id, name, store, url, price, dims: { w, d, h, unit }, ref, parts, variants, build(), wall?: true }
// dims come from the store listing, never guessed; fp and h are derived from them
export function addProduct(p) {
  if (PIECES[p.id]) throw new Error(`product id "${p.id}" is already used`);
  const k = TO_M[p.dims.unit];
  if (!k) throw new Error(`product "${p.id}": unknown unit "${p.dims.unit}"`);
  const w = p.dims.w * k, d = p.dims.d * k, h = p.dims.h * k;
  PIECES[p.id] = p.wall
    ? { ...p, build: p.build, wall: [w, h], y: p.y ?? 1.5, h }
    : { ...p, build: p.build, fp: [w, d], h };
  PIECE_ORDER.push(p.id);
}
