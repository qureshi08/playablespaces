// Procedural surface textures, painted on the GPU once per (material, layout) and cached.
// A pair per entry: albedo (linear rgb, roughness in alpha) and relief (tangent normal xyz, height in alpha).
// Layouts: plain, boards (floor planks), grid (tiles with grout), rug (whole rug with a border).
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const SIZE = 512;
let gl = null, painter = null, swatchPainter = null, swatchRT = null;
const store = new Map();

const GLSL_NOISE = /* glsl */`
uint mixBits(uint x){ x ^= x >> 17u; x *= 0xed5ad4bbu; x ^= x >> 11u; x *= 0xac4c1b51u; x ^= x >> 15u; x *= 0x31848babu; x ^= x >> 14u; return x; }
float rnd(vec2 cell){ ivec2 c = ivec2(floor(cell)); uint h = mixBits(uint(c.x + 32768) * 73856093u ^ uint(c.y + 32768) * 19349663u ^ uint(uSeed) * 83492791u); return float(h) / 4294967295.0; }
vec2 rnd2(vec2 cell){ return vec2(rnd(cell), rnd(cell + vec2(91.0, 57.0))); }
// value noise that repeats every 'wrap' cells (wrap huge = no repeat)
float vnoise(vec2 p, vec2 wrap){
  vec2 c = floor(p), f = fract(p), s = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = rnd(mod(c, wrap)), b = rnd(mod(c + vec2(1, 0), wrap)), d = rnd(mod(c + vec2(0, 1), wrap)), e = rnd(mod(c + vec2(1, 1), wrap));
  return mix(mix(a, b, s.x), mix(d, e, s.x), s.y); }
float layered(vec2 p, vec2 wrap, int n){
  float sum = 0.0, amp = 1.0, tot = 0.0;
  for (int i = 0; i < 8; i++){ if (i >= n) break; sum += amp * vnoise(p, wrap); tot += amp; p *= 2.03; wrap *= 2.0; amp *= 0.52; }
  return sum / tot; }
float gSecond; float gId;
// nearest feature point distance; gSecond = second nearest, gId = random id of the nearest cell
vec2 gOff;
float worley(vec2 p, vec2 wrap, float jitter){
  vec2 c = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    vec2 o = vec2(float(i), float(j)), cell = mod(c + o, wrap);
    vec2 pt = o + 0.5 + (rnd2(cell) - 0.5) * jitter - f; float d = dot(pt, pt);
    if (d < d1){ d2 = d1; d1 = d; gId = rnd(cell + vec2(13.0, 7.0)); gOff = pt; } else if (d < d2) d2 = d; }
  gSecond = sqrt(d2); return sqrt(d1); }
`;

// each recipe writes albedo, roughness, height. p is in material space (one plain span = 1, periodic in 'w')
const GLSL_RECIPES = /* glsl */`
void wood(vec2 p, vec2 w, out vec3 col, out float ro, out float ht){
  float bend = layered(p * vec2(1.5, 4.0), w * vec2(1.5, 4.0) * 2.0, 4) * uA.y;
  float t = p.y * uA.x + bend + 0.25 * sin(6.2831853 * p.x + 2.0 * layered(p * 2.0, w * 2.0, 3));
  float ring = pow(0.5 + 0.5 * cos(6.2831853 * t), 3.0);
  float streak = layered(vec2(p.x * 2.0, p.y * 60.0), w * vec2(2.0, 60.0), 4);
  col = mix(uCa, uCb, clamp(ring * 0.65 + (streak - 0.5) * 0.55, 0.0, 1.0));
  float pore = step(1.0 - uA.z, vnoise(vec2(p.x * 16.0, p.y * 400.0), w * vec2(16.0, 400.0)));
  col = mix(col, uCc, pore * 0.45);
  col *= 0.92 + 0.16 * layered(p * vec2(1.0, 3.0), w * vec2(1.0, 3.0), 3);
  ro = uA.w + pore * 0.15 + ring * 0.04; ht = ring * 0.3 + streak * 0.3 - pore; }
void concrete(vec2 p, vec2 w, out vec3 col, out float ro, out float ht){
  float cloud = layered(p * 2.5, w * 2.5, 6), fine = layered(p * 11.0, w * 11.0, 4), dust = vnoise(p * 330.0, w * 330.0);
  col = mix(uCb, uCc, smoothstep(0.35, 0.7, cloud)) * (0.92 + 0.16 * fine) * (0.94 + 0.12 * dust);
  float f1 = worley(p * 28.0, w * 28.0, 1.0); float agg = (1.0 - smoothstep(0.08, 0.14, f1)) * step(0.7, gId);
  col = mix(col, uCb * 0.55, agg * 0.75);
  ro = 0.78 + dust * 0.08; ht = cloud * 0.35 + fine * 0.2 + dust * 0.2 - agg; }
void terrazzo(vec2 p, vec2 w, out vec3 col, out float ro, out float ht){
  col = uCa * (0.95 + 0.1 * vnoise(p * 250.0, w * 250.0)) * (0.97 + 0.06 * layered(p * 4.0, w * 4.0, 3));
  float f1 = worley(p * 7.0, w * 7.0, 0.85); float id = gId;
  float rad = 0.16 + 0.22 * fract(id * 7.13), wob = (layered(p * 60.0, w * 60.0, 2) - 0.5) * 0.08;
  float chip = (1.0 - smoothstep(rad - 0.025, rad, f1 + wob)) * step(0.15, fract(id * 3.71));
  float pick = fract(id * 13.7); vec3 cc = pick < 0.34 ? uCb : pick < 0.67 ? uCc : uCd; cc *= 0.82 + 0.36 * fract(id * 23.1);
  col = mix(col, cc, chip);
  float f2 = worley(p * 22.0 + 0.37, w * 22.0, 1.0); float id2 = gId;
  float bit = (1.0 - smoothstep(0.1, 0.14, f2)) * step(0.45, id2);
  col = mix(col, (fract(id2 * 5.3) < 0.5 ? uCb : uCd) * (0.85 + 0.3 * fract(id2 * 9.1)), bit);
  ro = 0.22 + chip * 0.04; ht = -chip * 0.05 - bit * 0.03; }
void travertine(vec2 p, vec2 w, out vec3 col, out float ro, out float ht){
  float bands = layered(vec2(p.x * 1.5, p.y * 14.0), w * vec2(1.5, 14.0) * 2.0, 6);
  col = mix(uCb, uCc, smoothstep(0.3, 0.7, bands)) * (0.95 + 0.1 * vnoise(p * 140.0, w * 140.0));
  float f1 = worley(vec2(p.x * 5.0, p.y * 30.0), w * vec2(5.0, 30.0), 0.9);
  float hole = (1.0 - smoothstep(0.1, 0.22, f1)) * step(0.5, gId);
  col = mix(col, uCb * 0.6, hole * 0.85); ro = 0.5 + hole * 0.3; ht = bands * 0.3 - hole; }
void marble(vec2 p, vec2 w, out vec3 col, out float ro, out float ht){
  float t = layered(p * 2.5, w * 2.5, 6);
  float v = abs(sin(3.1415927 * (p.x * 2.0 + p.y + t * 3.0))); float vein = 1.0 - smoothstep(0.0, 0.08, v);
  float t2 = layered(p * 4.0 + 0.6, w * 4.0, 4);
  float v2 = abs(sin(3.1415927 * (p.x * 3.0 - p.y * 2.0 + t2 * 4.0))); float thin = (1.0 - smoothstep(0.0, 0.03, v2)) * 0.65;
  col = uCa * (0.96 + 0.06 * layered(p * 7.0, w * 7.0, 3));
  col = mix(col, uCb, clamp(vein * 0.7 + thin * 0.45, 0.0, 1.0));
  col = mix(col, uCc, vein * 0.35 * smoothstep(0.45, 0.7, t)); ro = 0.12 + vein * 0.06; ht = -vein * 0.04 - thin * 0.02; }
void slate(vec2 p, vec2 w, out vec3 col, out float ro, out float ht){
  float s = layered(vec2(p.x * 2.5, p.y * 8.0), w * vec2(2.5, 8.0) * 2.0, 7);
  float cleft = 1.0 - abs(fract(s * 4.0) - 0.5) * 2.0;
  col = mix(uCa, uCb, cleft * 0.4 + vnoise(p * 90.0, w * 90.0) * 0.25); ro = 0.7 - cleft * 0.1; ht = s * 0.6 + cleft * 0.25; }
void linen(vec2 p, vec2 w, out vec3 col, out float ro, out float ht){
  float n = uA.x; vec2 q = p * n; vec2 cell = floor(q), f = fract(q);
  float slubX = vnoise(vec2(p.x * 9.0, q.y), vec2(w.x * 9.0, w.y * n)), slubY = vnoise(vec2(q.x, p.y * 9.0), vec2(w.x * n, w.y * 9.0));
  float up = mod(cell.x + cell.y, 2.0);
  float warp = sin(f.x * 3.1415927) * (0.7 + 0.6 * slubY), weft = sin(f.y * 3.1415927) * (0.7 + 0.6 * slubX);
  float th = mix(weft, warp, up);
  col = mix(uCb, uCc, clamp(th * 0.6 + mix(slubX, slubY, up) * 0.4, 0.0, 1.0)); col = mix(col, uCa, 0.45);
  col *= 0.96 + 0.08 * layered(p * 3.0, w * 3.0, 3); ro = 0.9; ht = th; }
void boucle(vec2 p, vec2 w, out vec3 col, out float ro, out float ht){
  float a = worley(p * 30.0, w * 30.0, 1.0); float ida = gId;
  float b = worley(p * 30.0 + vec2(0.43, 0.27), w * 30.0, 1.0);
  float loopA = exp(-pow((a - 0.26) / 0.09, 2.0)), blobA = 1.0 - smoothstep(0.0, 0.55, a), blobB = 1.0 - smoothstep(0.0, 0.5, b);
  ht = max(max(blobA * 0.7, blobB * 0.65), loopA * 0.9);
  col = mix(uCb, uCc, ht); col = mix(col, uCa, 0.5); col *= 0.95 + 0.1 * ida; ro = 0.95; }
void velvet(vec2 p, vec2 w, out vec3 col, out float ro, out float ht){
  float crush = layered(p * vec2(2.5, 3.5), w * vec2(2.5, 3.5) * 2.0, 6), pile = vnoise(p * 300.0, w * 300.0);
  col = mix(uCb, uCa, 0.5 + 0.5 * crush) * (0.97 + 0.06 * pile); ro = 0.6; ht = crush * 0.3 + pile * 0.08; }
void leather(vec2 p, vec2 w, out vec3 col, out float ro, out float ht){
  float f1 = worley(p * 22.0, w * 22.0, 1.0); float groove = 1.0 - smoothstep(0.0, 0.08, gSecond - f1);
  float tone = layered(p * 4.0, w * 4.0, 5);
  col = mix(uCa, uCc, tone * 0.45); col = mix(col, uCb, groove * 0.55);
  ro = 0.46 + groove * 0.14 - tone * 0.08; ht = -groove * 0.7 + (1.0 - f1) * 0.15; }
void knit(vec2 p, vec2 w, out vec3 col, out float ro, out float ht){
  vec2 q = p * uA.xy; vec2 cell = floor(q), f = fract(q);
  vec2 l = f - vec2(0.27, 0.55), r = f - vec2(0.73, 0.55);
  l = vec2(l.x * 0.866 + l.y * 0.5, -l.x * 0.5 + l.y * 0.866); r = vec2(r.x * 0.866 - r.y * 0.5, r.x * 0.5 + r.y * 0.866);
  float lv = 1.0 - smoothstep(0.45, 1.0, length(l * vec2(3.3, 1.3))), rv = 1.0 - smoothstep(0.45, 1.0, length(r * vec2(3.3, 1.3)));
  ht = max(lv, rv) * (0.86 + 0.14 * sin((lv > rv ? l.y : r.y) * 46.0));
  col = mix(uCb, uCc, ht); col = mix(col, uCa, 0.4); col *= 0.93 + 0.14 * rnd(mod(cell, uA.xy)); ro = 0.97; }
void felt(vec2 p, vec2 w, out vec3 col, out float ro, out float ht){
  float m = layered(p * 12.0, w * 12.0, 6), fib = vnoise(p * 400.0, w * 400.0);
  col = mix(uCb, uCa, 0.55 + 0.45 * m) * (0.95 + 0.1 * fib); ro = 1.0; ht = m * 0.3 + fib * 0.15; }
void paint(vec2 p, vec2 w, out vec3 col, out float ro, out float ht){
  float stipple = vnoise(p * 280.0, w * 280.0), wave = layered(p * 1.5, w * 1.5, 4);
  col = uCa * (0.975 + 0.05 * wave) * (0.99 + 0.02 * stipple); ro = 0.82; ht = stipple * 0.3 + wave * 0.1; }
void limewash(vec2 p, vec2 w, out vec3 col, out float ro, out float ht){
  float cloud = layered(p * 1.8, w * 1.8 * 2.0, 6);
  vec2 d = p + (vec2(layered(p * 3.0 + 0.2, w * 3.0, 3), layered(p * 3.0 + 0.7, w * 3.0, 3)) - 0.5) * 0.2;
  float s1 = layered(vec2(5.0 * d.x + 2.0 * d.y, -3.0 * d.x + 11.0 * d.y), w * 2.0, 6);
  float s2 = layered(vec2(-3.0 * d.x + 5.0 * d.y, 7.0 * d.x + 4.0 * d.y), w * 2.0, 5);
  float k = smoothstep(0.25, 0.75, cloud * 0.5 + s1 * 0.3 + s2 * 0.2);
  col = mix(mix(uCb, uCc, k), uCa, 0.3); ro = 0.93; ht = s1 * 0.3 + cloud * 0.15; }
void recipe(vec2 p, vec2 w, out vec3 col, out float ro, out float ht){
#if KIND == 1
  wood(p, w, col, ro, ht);
#elif KIND == 2
  concrete(p, w, col, ro, ht);
#elif KIND == 3
  terrazzo(p, w, col, ro, ht);
#elif KIND == 4
  travertine(p, w, col, ro, ht);
#elif KIND == 5
  marble(p, w, col, ro, ht);
#elif KIND == 6
  slate(p, w, col, ro, ht);
#elif KIND == 7
  linen(p, w, col, ro, ht);
#elif KIND == 8
  boucle(p, w, col, ro, ht);
#elif KIND == 9
  velvet(p, w, col, ro, ht);
#elif KIND == 10
  leather(p, w, col, ro, ht);
#elif KIND == 11
  knit(p, w, col, ro, ht);
#elif KIND == 12
  felt(p, w, col, ro, ht);
#elif KIND == 14
  limewash(p, w, col, ro, ht);
#else
  paint(p, w, col, ro, ht);
#endif
}
`;
const GLSL_LAYOUT = /* glsl */`
const vec2 NOWRAP = vec2(65536.0);
// uv spans the whole texture, uArea = metres it covers, uUnit = metres of one plain material span
void surf(vec2 uv, out vec3 col, out float ro, out float ht){
  vec2 m = uv * uArea;
#if LAY == 0
  recipe(uv, vec2(1.0), col, ro, ht);
#elif LAY == 1
  {                                   // boards: uB.x board width, uB.y board length, uB.z joint
    float rows = max(1.0, floor(uArea.y / uB.x + 0.5)), rh = uArea.y / rows, row = floor(m.y / rh);
    float x = mod(m.x + rnd(vec2(row, 7.0)) * uB.y, uArea.x), per = max(1.0, floor(uArea.x / uB.y + 0.5));
    float k = floor(x / uB.y); vec2 local = vec2(x - k * uB.y, m.y - row * rh), id = vec2(mod(k, per), row);
    recipe(vec2(local.x + rnd(id + 0.5) * 9.0, local.y + floor(rnd(id + 3.0) * 5.0) * rh) / uUnit, NOWRAP, col, ro, ht);
    col *= 0.85 + 0.3 * rnd(id + 11.0);
    float edge = smoothstep(0.0, uB.z, min(min(local.y, rh - local.y), min(local.x, uB.y - local.x)));
    col = mix(col * 0.36, col, edge); ro = mix(0.9, ro, edge); ht = mix(-1.0, ht, edge); }
#elif LAY == 2
  {                                   // grid: uB.x tile w, uB.y tile h, uB.z running bond, uB.w grout
    float row = floor(m.y / uB.y), x = mod(m.x + row * uB.z * uB.x, uArea.x), k = floor(x / uB.x);
    vec2 local = vec2(x - k * uB.x, m.y - row * uB.y), id = vec2(k, row);
    recipe((local + rnd2(id) * vec2(5.0, 3.0)) / uUnit, NOWRAP, col, ro, ht);
    col *= 0.94 + 0.12 * rnd(id + 4.0);
    float edge = smoothstep(uB.w * 0.5, uB.w, min(min(local.x, uB.x - local.x), min(local.y, uB.y - local.y)));
    col = mix(uGrout, col, edge); ro = mix(0.95, ro, edge); ht = mix(-0.8, ht, edge); }
#else
  // rug: a woven field with a darker bound border, uB.x border width
  recipe(m / uUnit, NOWRAP, col, ro, ht);
  vec2 e2 = min(m, uArea - m); float e = min(e2.x, e2.y);
  col *= mix(0.72, 1.0, smoothstep(uB.x - 0.006, uB.x, e));
  col *= 1.0 - 0.14 * smoothstep(uB.x + 0.02, uB.x + 0.028, e) * (1.0 - smoothstep(uB.x + 0.04, uB.x + 0.048, e));
  ht = mix(-0.6, ht, smoothstep(0.0, 0.012, e));
#endif
}
`;
const FRAG = /* glsl */`
precision highp float; varying vec2 vUv;
uniform int uPass; uniform vec3 uCa, uCb, uCc, uCd, uGrout; uniform vec4 uA, uB; uniform float uSeed; uniform vec2 uArea, uUnit;
${GLSL_NOISE}${GLSL_RECIPES}${GLSL_LAYOUT}
void main(){
  vec3 col; float ro, ht; surf(vUv, col, ro, ht);
  gl_FragColor = uPass == 0 ? vec4(max(col, 0.0), clamp(ro, 0.03, 1.0)) : vec4(ht, 0.0, 0.0, 1.0); }`;

// relief from the height map, one cheap pass
const RELIEF_FRAG = /* glsl */`
precision highp float; varying vec2 vUv; uniform sampler2D tH; uniform vec2 uPx; uniform float uRelief;
void main(){
  float h = texture2D(tH, vUv).r, hx = texture2D(tH, fract(vUv + vec2(1.0 / uPx.x, 0.0))).r, hy = texture2D(tH, fract(vUv + vec2(0.0, 1.0 / uPx.y))).r;
  vec3 n = normalize(vec3((h - hx) * uRelief * uPx.x * 0.004, (h - hy) * uRelief * uPx.y * 0.004, 1.0));
  gl_FragColor = vec4(n * 0.5 + 0.5, clamp(h * 0.5 + 0.5, 0.0, 1.0)); }`;

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

const P = {
  uPass: { value: 0 },
  uCa: { value: new THREE.Color() }, uCb: { value: new THREE.Color() }, uCc: { value: new THREE.Color() }, uCd: { value: new THREE.Color() },
  uGrout: { value: new THREE.Color() }, uA: { value: new THREE.Vector4() }, uB: { value: new THREE.Vector4() },
  uSeed: { value: 0 }, uArea: { value: new THREE.Vector2(1, 1) }, uUnit: { value: new THREE.Vector2(1, 1) },
};
const RU = { tH: { value: null }, uPx: { value: new THREE.Vector2(SIZE, SIZE) }, uRelief: { value: 1 } };
// relief strength per recipe kind
const RELIEF = { 1: 0.8, 2: 1.1, 3: 0.25, 4: 1.2, 5: 0.15, 6: 1.4, 7: 1.6, 8: 2.4, 9: 0.5, 10: 1.3, 11: 2.6, 12: 0.7, 13: 0.35, 14: 0.8 };
// one small shader per (recipe, layout): a single giant shader takes the Windows driver minutes to compile
const painters = new Map();
function painterFor(kind, lay) {
  const key = kind + ':' + lay;
  if (!painters.has(key)) painters.set(key, new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: P, defines: { KIND: kind, LAY: lay }, vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false })));
  return painters.get(key);
}
let reliefPainter = null, heightRT = null;

export function initTextures(renderer) {
  gl = renderer;
  reliefPainter = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: RU, vertexShader: VERT, fragmentShader: RELIEF_FRAG, depthTest: false, depthWrite: false }));
  heightRT = new THREE.WebGLRenderTarget(SIZE, SIZE, { type: THREE.HalfFloatType, depthBuffer: false, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  swatchRT = new THREE.WebGLRenderTarget(SW, SW, { depthBuffer: false });
  swatchPainter = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: S, vertexShader: VERT, fragmentShader: SWATCH_FRAG, depthTest: false, depthWrite: false }));
}

function rt() {
  const t = new THREE.WebGLRenderTarget(SIZE, SIZE, { type: THREE.HalfFloatType, depthBuffer: false, generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
  t.texture.anisotropy = 8;
  return t;
}

// layout: 'plain' | 'planks' | 'tiles' | 'walltiles' | 'rug'. Returns { c, n, span: [metres, metres] }.
export function surfaceTex(mat, layout = 'plain', rugSize = [3, 2.1]) {
  const key = mat.id + ':' + layout;
  if (store.has(key)) return store.get(key);
  const cols = mat.c.map(h => new THREE.Color(h));
  while (cols.length < 4) cols.push(cols[cols.length - 1]);
  P.uCa.value.copy(cols[0]); P.uCb.value.copy(cols[1]); P.uCc.value.copy(cols[2]); P.uCd.value.copy(cols[3]);
  const a = mat.p || [];
  P.uA.value.set(a[0] || 0, a[1] || 0, a[2] || 0, a[3] || 0);
  P.uSeed.value = mat.i * 17 + 11;
  P.uGrout.value.set(mat.gr || '#000000');
  P.uUnit.value.set(mat.size[0], mat.size[1]);
  let area = [mat.size[0], mat.size[1]], lay = 0;
  if (layout === 'planks') { lay = 1; area = [2.4, 2.4]; P.uB.value.set(0.2, 1.2, 0.004, 0); }
  else if (layout === 'tiles' || layout === 'walltiles') {
    lay = 2; const t = layout === 'tiles' ? mat.tile : mat.wall;
    area = [Math.max(1, Math.round(2.4 / t[0])) * t[0], Math.max(1, Math.round(2.4 / t[1])) * t[1]];
    P.uB.value.set(t[0], t[1], t[2], 0.006);
  } else if (layout === 'rug') { lay = 3; area = rugSize; P.uB.value.set(0.14, 0, 0, 0); }
  P.uArea.value.set(area[0], area[1]);
  const painter = painterFor(mat.k, lay), c = rt(), n = rt(), prev = gl.getRenderTarget();
  P.uPass.value = 0; gl.setRenderTarget(c); painter.render(gl);
  P.uPass.value = 1; gl.setRenderTarget(heightRT); painter.render(gl);
  RU.tH.value = heightRT.texture; RU.uRelief.value = RELIEF[mat.k] || 1;
  gl.setRenderTarget(n); reliefPainter.render(gl);
  gl.setRenderTarget(prev);
  const out = { c: c.texture, n: n.texture, span: area };
  store.set(key, out);
  return out;
}

// ---- swatches: the material lit from the top left, read back into a canvas for the UI ----
const SW = 112;
const S = { tC: { value: null }, tN: { value: null }, uZoom: { value: new THREE.Vector2(1, 1) } };
const SWATCH_FRAG = /* glsl */`
uniform sampler2D tC, tN; uniform vec2 uZoom; varying vec2 vUv;
vec3 filmic(vec3 x){ vec3 a = x * (2.51 * x + 0.03), b = x * (2.43 * x + 0.59) + 0.14; return clamp(a / b, 0.0, 1.0); }
vec3 encode(vec3 c){ return mix(c * 12.92, 1.055 * pow(max(c, 0.0), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
void main(){
  vec2 uv = vUv * uZoom; vec4 a = texture2D(tC, uv); vec3 n = normalize(texture2D(tN, uv).xyz * 2.0 - 1.0);
  vec3 L = normalize(vec3(-0.5, 0.62, 0.6)); float diff = max(dot(n, L), 0.0);
  float spec = pow(max(dot(n, normalize(L + vec3(0, 0, 1))), 0.0), mix(8.0, 110.0, (1.0 - a.a) * (1.0 - a.a))) * (1.0 - a.a) * 0.7;
  vec3 col = a.rgb * (0.45 + 0.9 * diff) + spec;
  vec2 e = min(vUv, 1.0 - vUv); col *= 0.76 + 0.24 * smoothstep(0.0, 0.09, min(e.x, e.y));
  col += 0.05 * (1.0 - smoothstep(0.0, 0.04, 1.0 - vUv.y));
  gl_FragColor = vec4(encode(filmic(col * 1.25)), 1.0); }`;
const swBuf = new Uint8Array(SW * SW * 4);
const swatches = new Map();

export function thumb(mat) {
  if (swatches.has(mat.id)) return swatches.get(mat.id);
  const t = surfaceTex(mat, 'plain');
  S.tC.value = t.c; S.tN.value = t.n;
  const z = mat.cat === 'fabric' ? 0.8 / Math.max(mat.size[0] / 0.2, 1) : mat.cat === 'wood' ? 0.28 : mat.cat === 'paint' ? 0.3 : 0.5;
  S.uZoom.value.set(z, z * (mat.cat === 'wood' ? 4 : 1));
  const prev = gl.getRenderTarget();
  gl.setRenderTarget(swatchRT); swatchPainter.render(gl);
  gl.readRenderTargetPixels(swatchRT, 0, 0, SW, SW, swBuf);
  gl.setRenderTarget(prev);
  const cv = document.createElement('canvas'); cv.width = cv.height = SW;
  const g = cv.getContext('2d'), img = g.createImageData(SW, SW);
  for (let y = 0; y < SW; y++) img.data.set(swBuf.subarray((SW - 1 - y) * SW * 4, (SW - y) * SW * 4), y * SW * 4);
  g.putImageData(img, 0, 0);
  swatches.set(mat.id, cv);
  return cv;
}
