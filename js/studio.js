// The design studio around the plinth, plus the environment light for glossy surfaces.
// Polished concrete floor, a glass wall onto a harbour city at the given time of day, a moodboard wall,
// a work table with sample stacks, pendant lights and a few big potted trees.
import * as THREE from 'three';
import { R } from './room.js';
import { std, metal, glow, batch, rng, canvasTex } from './util.js';

// uniforms of the sky backdrop, driven by daylight.js
export const SKY = {
  tCity: { value: null }, tLit: { value: null },
  uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uSunGlow: { value: new THREE.Color() },
  uTower: { value: new THREE.Color() }, uMist: { value: new THREE.Color() }, uLitC: { value: new THREE.Color('#ffc98a') },
  uLit: { value: 1 }, uSea: { value: new THREE.Color() }, uSunPos: { value: new THREE.Vector3(0.5, 0.6, 1) },
};
export const studioLights = [];

// environment: a dim blue-grey room with a warm window band and a few soft panels
export function buildEnv(renderer) {
  const gen = new THREE.PMREMGenerator(renderer), s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vDir; void main(){
      float y = vDir.y;
      vec3 ground = vec3(0.09, 0.08, 0.07), walls = vec3(0.15, 0.18, 0.24), ceil = vec3(0.05, 0.07, 0.11);
      vec3 c = mix(ground, walls, smoothstep(-0.35, 0.05, y)); c = mix(c, ceil, smoothstep(0.25, 0.85, y));
      float band = smoothstep(-0.05, 0.2, y) * (1.0 - smoothstep(0.32, 0.65, y));
      c += vec3(1.3, 0.75, 0.4) * band * smoothstep(0.5, 0.95, -vDir.z);
      gl_FragColor = vec4(c, 1.0); }`,
  })));
  const panels = [[0.6, 5, 4, 3.6], [2.2, 3, 4.4, 5.2], [3.6, 4.2, 3.2, 2.2], [4.9, 2.4, 3, 4.4]];
  for (const [ang, r, g, b] of panels) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(10, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), side: THREE.DoubleSide }));
    m.position.set(Math.sin(ang) * 24, 15, Math.cos(ang) * 24); m.lookAt(0, 0, 0); s.add(m);
  }
  const tex = gen.fromScene(s, 0.035).texture;
  gen.dispose();
  return tex;
}

// the city: towers in two depth layers, a shoreline, and lit windows in a second canvas
function paintCity() {
  const r = rng(4242), W = 4096, H = 1024, cityC = document.createElement('canvas'), litC = document.createElement('canvas');
  cityC.width = litC.width = W; cityC.height = litC.height = H;
  const c = cityC.getContext('2d'), l = litC.getContext('2d'), sky = H * 0.47;
  // clusters of tall towers, quieter in between
  const height = x => 0.18 + [0.3, 0.55, 0.78].reduce((s, mid, i) => s + [0.9, 0.7, 0.55][i] * Math.exp(-((((x / W) - mid) / [0.07, 0.05, 0.09][i]) ** 2)), 0);
  const win = (x, y, a) => { l.fillStyle = `rgba(255,${200 + r() * 55 | 0},${140 + r() * 80 | 0},${a})`; l.fillRect(x, y, 2, 2); };
  for (const [layer, n, tall, base] of [[0, 280, 140, sky], [1, 160, 200, sky + 6]]) {
    for (let i = 0; i < n; i++) {
      const x = r() * W, w = 10 + r() * (layer ? 26 : 15), h = (8 + r() * tall) * height(x + w / 2);
      c.fillStyle = layer ? 'rgb(255,160,0)' : 'rgb(255,255,0)';
      c.fillRect(x, base - h, w, h + 3);
      if (h > 60 && r() > 0.6) c.fillRect(x + w * 0.4, base - h - 8 - r() * 20, Math.max(2, w * 0.18), 22);
      for (let y = base - h + 4; y < base - 2; y += 4) for (let xx = x + 2; xx < x + w - 2; xx += 4) if (r() > (layer ? 0.52 : 0.68)) win(xx, y, 0.35 + r() * 0.65);
    }
  }
  c.fillStyle = 'rgb(255,210,0)'; c.fillRect(0, sky + 2, W, 7);
  const coast = x => sky + 42 + 15 * Math.sin(x / W * 7.7 + 0.6) + 9 * Math.sin(x / W * 21 + 1.7);
  c.fillStyle = 'rgb(255,80,0)'; c.beginPath(); c.moveTo(0, H);
  for (let x = 0; x <= W; x += 16) c.lineTo(x, coast(x));
  c.lineTo(W, H); c.fill();
  for (let i = 0; i < 1300; i++) { const x = r() * W; win(x, coast(x) + 6 + r() * (H - coast(x)), 0.3 + r() * 0.6); }
  for (let x = 0; x < W; x += 7) { l.fillStyle = 'rgba(255,222,165,.65)'; l.fillRect(x, coast(x) + 2, 2, 2); }
  const a = new THREE.CanvasTexture(cityC), b = new THREE.CanvasTexture(litC);
  for (const t of [a, b]) { t.anisotropy = 4; t.minFilter = THREE.LinearMipmapLinearFilter; }
  SKY.tCity.value = a; SKY.tLit.value = b;
}

export function buildStudio(scene) {
  const root = new THREE.Group(); root.name = 'studio';
  const K = R.K, GLASS_Z = -16, LEFT_X = -32, FRONT = 24;
  paintCity();

  // polished concrete floor in big slabs
  const slabs = canvasTex(1024, 1024, (g, W, H) => {
    const r = rng(77), cols = 2, rows = 4, sw = W / cols, sh = H / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const v = r(); g.fillStyle = `hsl(${215 + v * 12},${8 + v * 4}%,${21 + v * 6}%)`; g.fillRect(i * sw, j * sh, sw, sh);
      for (let k = 0; k < 90; k++) { g.fillStyle = `rgba(${r() > 0.5 ? 250 : 60},${r() > 0.5 ? 245 : 55},235,${0.02 + r() * 0.035})`; g.beginPath(); g.ellipse(i * sw + r() * sw, j * sh + r() * sh, 6 + r() * 50, 3 + r() * 16, r() * 3, 0, 7); g.fill(); }
    }
    g.strokeStyle = '#5a534a'; g.lineWidth = 3;
    for (let i = 0; i <= cols; i++) { g.beginPath(); g.moveTo(i * sw, 0); g.lineTo(i * sw, H); g.stroke(); }
    for (let j = 0; j <= rows; j++) { g.beginPath(); g.moveTo(0, j * sh); g.lineTo(W, j * sh); g.stroke(); }
  });
  slabs.wrapS = slabs.wrapT = THREE.RepeatWrapping; slabs.repeat.set(14, (60 - GLASS_Z) / 10);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 60 - GLASS_Z), new THREE.MeshStandardMaterial({ map: slabs, roughness: 0.24, metalness: 0.05, envMapIntensity: 0.35 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, K, (60 + GLASS_Z) / 2); floor.receiveShadow = true; root.add(floor);

  // sky and city on a curved backdrop far behind the glass
  const backdrop = new THREE.Mesh(new THREE.CylinderGeometry(165, 165, 150, 96, 1, true, Math.PI - 1.5, 3.0), new THREE.ShaderMaterial({
    uniforms: SKY, fog: false, side: THREE.BackSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tCity, tLit; uniform vec3 uZenith, uHorizon, uSunGlow, uTower, uMist, uLitC, uSea; uniform float uLit; uniform vec3 uSunPos; varying vec2 vUv;
      void main(){
        vec2 p = vec2(1.0 - vUv.x, vUv.y); const float line = 0.535;
        vec3 sky = mix(uHorizon, uZenith, smoothstep(line, 1.0, p.y));
        float d = length((p - uSunPos.xy) * vec2(4.2, 1.0));
        sky += uSunGlow * (0.65 * exp(-d * 5.5) + 2.0 * exp(-d * 40.0)) * uSunPos.z;
        vec4 city = texture2D(tCity, p), lit = texture2D(tLit, p);
        float sea = step(city.r, 0.01) * step(p.y, line);
        vec2 mirror = vec2(p.x + sin(p.y * 650.0) * 0.0014, 2.0 * 0.528 - p.y + (0.528 - p.y) * 0.55);
        vec4 mc = texture2D(tCity, mirror), ml = texture2D(tLit, mirror, 1.5);
        vec3 water = mix(uSea, sky * 0.5, 0.32) + uSunGlow * exp(-length((vec2(p.x, 2.0 * line - p.y) - uSunPos.xy) * vec2(6.0, 1.5)) * 6.0) * uSunPos.z * 0.5;
        water = mix(water, mix(uTower, uMist, 0.6) * 0.8, mc.r * 0.45) + uLitC * ml.r * ml.a * uLit * 0.5;
        vec3 col = mix(sky, water, sea);
        col = mix(col, mix(uTower, uMist, clamp((city.g - 0.6) * 1.2, 0.0, 1.0) * 0.6), city.r);
        col += uLitC * lit.r * lit.a * uLit * (0.15 + 0.3 * city.r);
        gl_FragColor = vec4(col, 1.0); }`,
  }));
  backdrop.position.set(0, -48, 0); backdrop.raycast = () => {}; root.add(backdrop);

  // glass wall with slim mullions, a solid wall on the left
  {
    const b = batch(), wallM = std('#262f3d', { roughness: 0.6, envMapIntensity: 0.6 }), frame = metal('#161a21', { roughness: 0.35, metalness: 0.6 });
    const H = 21, x0 = LEFT_X, x1 = 34, w = x1 - x0, cx = (x0 + x1) / 2, cz = (GLASS_Z + FRONT) / 2, d = FRONT - GLASS_Z;
    b.box(wallM, cx, K + H - 0.8, GLASS_Z - 0.3, w + 16, 1.6, 0.6).box(wallM, cx, K + 0.25, GLASS_Z - 0.3, w + 16, 0.5, 0.6);
    for (let x = x0 + 3; x < x1; x += 3.2) b.box(frame, x, K + H / 2, GLASS_Z, 0.12, H - 1.6, 0.3);
    b.box(frame, cx, K + H * 0.72, GLASS_Z, w, 0.12, 0.3).box(frame, cx, K + 0.55, GLASS_Z, w, 0.12, 0.3);
    b.box(wallM, LEFT_X - 0.3, K + H / 2, cz, 0.6, H, d);
    for (let z = GLASS_Z + 5; z < FRONT; z += 5) b.box(std('#1c222c', { roughness: 0.7 }), LEFT_X + 0.25, K + H / 2, z, 0.5, H, 0.7);
    b.box(metal('#383f4a', { roughness: 0.4, metalness: 0.5 }), LEFT_X + 0.12, K + 0.22, cz, 0.24, 0.44, d);
    b.flush(root, false);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, H - 2.1), new THREE.MeshBasicMaterial({ color: '#cfe9ff', transparent: true, opacity: 0.04, depthWrite: false }));
    pane.position.set(cx, K + 0.5 + (H - 2.1) / 2, GLASS_Z - 0.03); pane.raycast = () => {}; root.add(pane);
    const cove = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, d), glow('#ffb86b', 3)); cove.position.set(LEFT_X + 0.6, K + H - 0.5, cz); root.add(cove);
    const kick = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, d), glow('#ffae5c', 1.6)); kick.position.set(LEFT_X + 0.3, K + 0.5, cz); root.add(kick);
    studioLights.push([LEFT_X + 2.5, K + H - 2.5, -8, '#ffb86b', 14, 0.5], [LEFT_X + 2.5, K + H - 2.5, 10, '#ffb86b', 14, 0.5]);
  }

  // moodboard wall: a grid of pinned swatches and photos on the left wall
  {
    const t = canvasTex(1280, 720, (g, W, H) => {
      const r = rng(808); g.fillStyle = '#d6cec0'; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 1200; i++) { g.fillStyle = `rgba(255,250,240,${r() * 0.06})`; g.fillRect(r() * W, r() * H, 2, 2); }
      const sw = ['#c79661', '#7a5036', '#ebe5da', '#213156', '#b3603c', '#a0a990', '#d2bd9c', '#3a3e45', '#c28b2e', '#eae5dc', '#23324b', '#985930'];
      for (let row = 0; row < 3; row++) for (let col = 0; col < 7; col++) {
        const x = 60 + col * 170 + r() * 16, y = 50 + row * 220 + r() * 18, s = 100 + r() * 30, photo = (row + col) % 4 === 1;
        g.save(); g.translate(x + s / 2, y + s / 2); g.rotate((r() - 0.5) * 0.1);
        g.fillStyle = '#0002'; g.fillRect(-s / 2 + 6, -s / 2 + 8, s, photo ? s * 1.25 : s);
        if (photo) {
          const gr = g.createLinearGradient(0, -s / 2, 0, s * 0.7); const k = (row + col) % 3;
          gr.addColorStop(0, ['#a8c8e6', '#f2c597', '#93b27e'][k]); gr.addColorStop(1, ['#336f98', '#b0623b', '#3e5f39'][k]);
          g.fillStyle = '#f4f1e9'; g.fillRect(-s / 2, -s / 2, s, s * 1.25); g.fillStyle = gr; g.fillRect(-s / 2 + 7, -s / 2 + 7, s - 14, s * 1.25 - 32);
        } else { g.fillStyle = sw[(row * 7 + col) % sw.length]; g.fillRect(-s / 2, -s / 2, s, s); }
        g.fillStyle = '#d33a2c'; g.beginPath(); g.arc(0, -s / 2 + 9, 5, 0, 7); g.fill(); g.restore();
      }
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(18, 10), std('#ffffff', { map: t, roughness: 0.85 }));
    board.rotation.y = Math.PI / 2; board.position.set(LEFT_X + 0.62, K + 10, -4); root.add(board);
    studioLights.push([LEFT_X + 3.5, K + 12, -4, '#ffd7a8', 9, 0.45]);
  }

  // big potted trees: a pot and a cloud of faceted leaf clumps
  const tree = (x, z, s, seed) => {
    const g = new THREE.Group(), b = batch(), r = rng(seed);
    b.cyl(std('#d8d2c6', { roughness: 0.5 }), 0, 0.6 * s, 0, 0.4 * s, 0.32 * s, 1.2 * s, { seg: 10, open: true }).cyl(std('#382a20'), 0, 1.14 * s, 0, 0.398 * s, 0.398 * s, 0.04 * s, { seg: 10 });
    b.cyl(std('#4a392b'), 0, 1.75 * s, 0, 0.05 * s, 0.075 * s, 1.3 * s, { seg: 6 });
    const greens = ['#3d6838', '#4a7841', '#58884a', '#33573a'];
    for (let i = 0; i < 12; i++) {
      const clump = new THREE.IcosahedronGeometry(0.45 * s * (0.7 + r() * 0.5), 0), p = clump.attributes.position;
      for (let k = 0; k < p.count; k++) p.setXYZ(k, p.getX(k) * (1 + (r() - 0.5) * 0.3), p.getY(k) * (1.15 + (r() - 0.5) * 0.3), p.getZ(k) * (1 + (r() - 0.5) * 0.3));
      b.geo(std(greens[i % 4], { flatShading: true, roughness: 0.75 }), clump, (r() - 0.5) * 1.2 * s, (1.8 + r() * 1.8) * s, (r() - 0.5) * 1.2 * s);
    }
    b.flush(g); g.position.set(x, K, z); root.add(g);
  };
  tree(-24, -11, 3.1, 1); tree(-26, 6, 2.5, 2); tree(24, -11.5, 3, 3); tree(21, 9, 3.3, 4);

  // work table with sample stacks, a task lamp, a low lounge seat, a tall pendant
  {
    const b = batch(), top = std('#86664a', { roughness: 0.5 }), dark = std('#1b1c1f', { roughness: 0.4, metalness: 0.6 });
    b.box(top, 11, K + 2.9, -9, 13, 0.3, 4.6, { r: 0.05 });
    for (const [dx, dz] of [[-6, -2], [6, -2], [-6, 2], [6, 2]]) b.box(dark, 11 + dx, K + 1.4, -9 + dz, 0.2, 2.8, 0.2);
    const stack = ['#c79661', '#ebe5da', '#213156', '#b3603c', '#a6a49f', '#7a5036', '#eae5dc', '#a0a990', '#d6c3a3'];
    stack.forEach((c, i) => { for (let k = 0; k < 1 + (i % 3); k++) b.box(std(c, { roughness: 0.7 }), 6.6 + i * 1.08, K + 3.1 + k * 0.1, -8.3 + (i % 2) * 0.6, 0.9, 0.09, 0.9, { ry: (i % 3 - 1) * 0.18 + k * 0.12 }); });
    b.cyl(dark, 15.5, K + 3.1, -10.2, 0.45, 0.45, 0.1).cyl(dark, 15.5, K + 4.3, -10.2, 0.06, 0.06, 2.3).cyl(dark, 16.1, K + 5.45, -10.2, 0.55, 0.32, 0.7, { rz: 0.8 });
    b.box(std('#b6a289', { roughness: 0.9 }), -13, K + 1.3, 9, 5.2, 1.5, 4.4, { r: 0.4 }).box(std('#b6a289', { roughness: 0.9 }), -13, K + 2.9, 7.2, 5.2, 2.8, 1, { r: 0.4, rx: -0.2 });
    b.cyl(dark, -18, K + 21 - 3.5, -12, 0.03, 0.03, 7);
    b.flush(root);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 10), glow('#ffd2a0', 5)); bulb.position.set(16.25, K + 5.2, -10.2); root.add(bulb);
    const pend = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.1, 1.3, 24, 1, true), glow('#ffd9ae', 2.4)); pend.position.set(-18, K + 13.4, -12); root.add(pend);
    studioLights.push([15.8, K + 4.4, -10.2, '#ffc98a', 8, 1.1], [-18, K + 12, -11, '#ffcf96', 10, 1]);
  }

  scene.add(root);
  return root;
}
