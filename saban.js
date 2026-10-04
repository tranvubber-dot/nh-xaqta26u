// Hành Trình Của Bạn — SA BÀN 3D CHIBI kiểu game từ dữ liệu thật OpenStreetMap (Overpass API).
// Nhà = khối đùn bo mép mái pastel, đường = dải kem bo tròn, nước gợn sóng, công viên có cây low-poly (InstancedMesh),
// đảo sa bàn mép đất dày như diorama. Toàn bộ hình học gộp theo loại (vài lần vẽ), chỉ vẽ lại khi có thay đổi.
// © OpenStreetMap contributors — dữ liệu ODbL. Toạ độ kỷ niệm của bạn KHÔNG gửi đi đâu (chỉ khung khu vực được tải từ OSM).
import * as THREE from './lib/three.module.min.js';

const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const RM = 520, UNIT = 10, RU = RM / UNIT; // bán kính khu 520 m; 1 đơn vị = 10 m
const GRID = .005; // tâm khu làm tròn ~550 m để các điểm gần nhau dùng chung một khu (đã tải rồi không tải lại)
export const areaOf = (lat, lon) => { const la = Math.round(lat / GRID) * GRID, lo = Math.round(lon / GRID) * GRID; return { lat: +la.toFixed(4), lon: +lo.toFixed(4), key: `${la.toFixed(3)},${lo.toFixed(3)}` }; };
export const distM = (a, b) => { const R = 6371e3, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lon - a.lon) * r, x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- tải + nén dữ liệu khu ----------
function query(lat, lon) {
  const dla = RM / 110540, dlo = RM / (111320 * Math.cos(lat * Math.PI / 180)), b = `${(lat - dla).toFixed(6)},${(lon - dlo).toFixed(6)},${(lat + dla).toFixed(6)},${(lon + dlo).toFixed(6)}`;
  return `[out:json][timeout:25];(way["building"](${b});way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|living_street|service|pedestrian|footway|path|cycleway|motorway_link|trunk_link|primary_link|secondary_link)$"](${b});way["natural"~"^(water|coastline|beach|sand)$"](${b});relation["natural"="water"](${b});way["waterway"~"^(river|canal|stream|riverbank)$"](${b});way["leisure"~"^(park|garden|pitch|playground)$"](${b});way["landuse"~"^(grass|forest|recreation_ground|meadow|village_green|farmland|orchard)$"](${b});way["natural"~"^(wood|scrub)$"](${b});node["amenity"~"^(school|hospital|place_of_worship|marketplace|university|kindergarten)$"](${b});node["tourism"~"^(attraction|museum|viewpoint|hotel)$"](${b}););out geom qt;`;
}
export async function fetchOverpass(lat, lon, { signal } = {}) {
  const body = 'data=' + encodeURIComponent(query(lat, lon)); let last = null;
  for (let i = 0; i < OVERPASS.length * 2; i++) {
    const url = OVERPASS[i % OVERPASS.length];
    try {
      const ac = new AbortController(), t = setTimeout(() => ac.abort(), 35000); signal?.addEventListener('abort', () => ac.abort());
      const r = await fetch(url, { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ac.signal }); clearTimeout(t);
      if (r.status === 429 || r.status === 504 || r.status >= 500) { last = new Error('Máy chủ bản đồ đang bận (' + r.status + ')'); await sleep(1500 + i * 1500); continue; }
      if (!r.ok) throw new Error('Không tải được bản đồ (' + r.status + ')');
      return await r.json();
    } catch (e) { if (signal?.aborted) throw e; last = e; await sleep(800); }
  }
  throw last || new Error('Không tải được bản đồ');
}
const r1 = v => Math.round(v * 10) / 10;
// chuyển phản hồi Overpass → khu gọn (toạ độ đơn vị 10 m quanh tâm, đã đơn giản hoá)
export function compactArea(json, lat0, lon0) {
  const kx = 111320 * Math.cos(lat0 * Math.PI / 180) / UNIT, kz = 110540 / UNIT;
  const P = g => { const out = []; for (const p of g) { out.push(r1((p.lon - lon0) * kx), r1(-(p.lat - lat0) * kz)); } return out; };
  const A = { v: 1, c: [lat0, lon0], t: Date.now(), b: [], h: [], w: [], wl: [], cl: [], g: [], p: [] };
  const els = json.elements || [], wayGeo = new Map();
  const poi = (t, x, z) => { const k = t.amenity === 'place_of_worship' ? (/buddh/.test(t.religion || '') ? 'chua' : /christ/.test(t.religion || '') ? 'nhatho' : 'den') : t.amenity === 'school' || t.amenity === 'kindergarten' ? 'truong' : t.amenity === 'university' ? 'dh' : t.amenity === 'hospital' ? 'vien' : t.amenity === 'marketplace' ? 'cho' : t.tourism === 'museum' ? 'bt' : t.tourism === 'hotel' ? 'ks' : t.tourism ? 'dl' : null; if (k) A.p.push([k, (t['name:vi'] || t.name || '').slice(0, 40), r1(x), r1(z)]); };
  for (const e of els) {
    const t = e.tags || {};
    if (e.type === 'node') { poi(t, (e.lon - lon0) * kx, -(e.lat - lat0) * kz); continue; }
    if (e.type === 'way' && e.geometry) {
      const pts = P(e.geometry);
      if (t.building) { const lv = +t['building:levels'] || (t.height ? parseFloat(t.height) / 3.2 : 0) || 0; const bk = t.amenity === 'place_of_worship' || /temple|church|pagoda|religious|cathedral|shrine/.test(t.building) ? 'rel' : /school|university|kindergarten|college/.test(t.building) || /school|university|kindergarten/.test(t.amenity || '') ? 'edu' : /hospital/.test(t.building + (t.amenity || '')) ? 'med' : /commercial|retail|office|hotel|supermarket|mall/.test(t.building) ? 'com' : /industrial|warehouse|factory/.test(t.building) ? 'ind' : 'res'; A.b.push([Math.round(lv * 10) / 10, bk, pts]); if (t.amenity || t.tourism) { let sx = 0, sz = 0; for (let i = 0; i < pts.length; i += 2) { sx += pts[i]; sz += pts[i + 1]; } poi(t, sx / (pts.length / 2), sz / (pts.length / 2)); } }
      else if (t.highway) A.h.push([t.highway.replace('_link', ''), pts]);
      else if (t.natural === 'coastline') A.cl.push(pts);
      else if (t.natural === 'water' || t.waterway === 'riverbank') A.w.push([pts]);
      else if (t.waterway) A.wl.push([t.waterway === 'river' ? 2.4 : t.waterway === 'canal' ? 1.4 : .6, pts]);
      else if (t.natural === 'beach' || t.natural === 'sand') A.g.push(['sand', pts]);
      else if (t.leisure || t.landuse || t.natural) A.g.push([t.leisure === 'pitch' ? 'pitch' : t.natural === 'wood' || t.landuse === 'forest' ? 'wood' : t.landuse === 'farmland' || t.landuse === 'orchard' ? 'farm' : t.natural === 'scrub' ? 'scrub' : 'park', pts]);
      wayGeo.set(e.id, e.geometry);
    }
    if (e.type === 'relation' && e.members) { // hồ nhiều mảnh: ghép các đoạn ngoài thành vòng, đoạn trong thành lỗ
      const rings = role => joinRings(e.members.filter(m => m.type === 'way' && m.role === role && m.geometry).map(m => m.geometry));
      const outer = rings('outer'), inner = rings('inner');
      for (const o of outer) A.w.push([P(o), ...inner.map(P)]);
    }
  }
  if (A.b.length > 1800) { A.b = A.b.map(b => [b, Math.abs(area(b[2]))]).sort((x, y) => y[1] - x[1]).slice(0, 1800).map(x => x[0]); }
  return A;
}
function joinRings(parts) {
  const segs = parts.map(g => g.slice()), out = [];
  const same = (a, b) => Math.abs(a.lat - b.lat) < 1e-7 && Math.abs(a.lon - b.lon) < 1e-7;
  while (segs.length) {
    let ring = segs.shift(), guard = 0;
    while (!same(ring[0], ring[ring.length - 1]) && guard++ < 500) {
      const end = ring[ring.length - 1], i = segs.findIndex(s => same(s[0], end) || same(s[s.length - 1], end)); if (i < 0) break;
      const s = segs.splice(i, 1)[0]; ring = ring.concat(same(s[0], end) ? s.slice(1) : s.slice(0, -1).reverse());
    }
    if (ring.length > 3) out.push(ring);
  }
  return out;
}
function area(p) { let s = 0; for (let i = 0, n = p.length / 2; i < n; i++) { const j = (i + 1) % n; s += p[i * 2] * p[j * 2 + 1] - p[j * 2] * p[i * 2 + 1]; } return s / 2; }
function simplify(p, tol) { // Douglas–Peucker trên mảng phẳng [x,z,...]
  const n = p.length / 2; if (n <= 4) return p; const keep = new Uint8Array(n); keep[0] = keep[n - 1] = 1; const st = [[0, n - 1]];
  while (st.length) { const [a, b] = st.pop(); let md = 0, mi = -1; const ax = p[a * 2], az = p[a * 2 + 1], bx = p[b * 2], bz = p[b * 2 + 1], L = Math.hypot(bx - ax, bz - az);
    for (let i = a + 1; i < b; i++) { const d = L < 1e-6 ? Math.hypot(p[i * 2] - ax, p[i * 2 + 1] - az) : Math.abs((bx - ax) * (az - p[i * 2 + 1]) - (ax - p[i * 2]) * (bz - az)) / L; if (d > md) { md = d; mi = i; } }
    if (md > tol && mi > 0) { keep[mi] = 1; st.push([a, mi], [mi, b]); } }
  const o = []; for (let i = 0; i < n; i++) if (keep[i]) o.push(p[i * 2], p[i * 2 + 1]); return o;
}
export async function packArea(A) { const s = new Blob([JSON.stringify(A)]).stream(); return window.CompressionStream ? new Response(s.pipeThrough(new CompressionStream('gzip'))).blob() : new Blob([JSON.stringify(A)], { type: 'application/json' }); }
export async function unpackArea(b) { if (!b) return null; try { const gz = new Uint8Array(await b.slice(0, 2).arrayBuffer()); const txt = gz[0] === 0x1f && gz[1] === 0x8b ? await new Response(b.stream().pipeThrough(new DecompressionStream('gzip'))).text() : await b.text(); return JSON.parse(txt); } catch (e) { return null; } }

// ---------- dựng cảnh ----------
const COL = {
  ground: '#a9df7e', groundEdge: '#8cc964', earth1: '#c48a57', earth2: '#9b6a42', earth3: '#7a5234',
  road: '#fff3d6', road2: '#fbe9c4', path: '#f2dfb8', line: '#ffffff', water: '#7fd3ff', park: '#97d873', wood: '#7cc463', pitch: '#88d06f', farm: '#c9e48a', scrub: '#a3d47d', sand: '#f7e3a6',
  roofs: { res: ['#ff9eb5', '#ffb38a', '#ffd27f', '#f7a1c4', '#ffc4a8', '#b9a6ff', '#9fd1ff'], com: ['#7ec8ff', '#8fb6ff', '#9ad7e8'], edu: ['#ffd36b'], med: ['#ff8a8a'], rel: ['#ef5b5b', '#e58c3a'], ind: ['#b8c0d0'] },
  wall: '#fff8ef'
};
const hex = h => new THREE.Color(h);
function toonGrad() { const d = new Uint8Array([90, 170, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; }
// gộp nhiều hình học không chỉ số (position, normal, color) thành một
function merge(list) {
  let n = 0; for (const g of list) n += g.attributes.position.count; const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  for (const g of list) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; g.dispose(); }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setAttribute('color', new THREE.BufferAttribute(col, 3)); m.computeBoundingSphere(); return m;
}
// bộ gom tam giác phẳng (đường, mặt nước, cỏ): đẩy trực tiếp vào mảng, không tạo hình học trung gian
class Flat {
  constructor() { this.p = []; this.c = []; }
  tri(a, b, c, y, col) { this.p.push(a[0], y, a[1], c[0], y, c[1], b[0], y, b[1]); for (let i = 0; i < 3; i++) this.c.push(col.r, col.g, col.b); }
  geo() { const g = new THREE.BufferGeometry(), n = this.p.length / 3; g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3)); const nr = new Float32Array(n * 3); for (let i = 0; i < n; i++) nr[i * 3 + 1] = 1; g.setAttribute('normal', new THREE.BufferAttribute(nr, 3)); g.computeBoundingSphere(); return g; }
}
function polyFill(F, rings, y, col) { // tam giác hoá đa giác có lỗ
  const toV = r => { const v = []; for (let i = 0; i < r.length; i += 2) v.push(new THREE.Vector2(r[i], r[i + 1])); if (v.length > 2 && v[0].equals(v[v.length - 1])) v.pop(); return v; };
  const outer = toV(rings[0]); if (outer.length < 3) return; const holes = rings.slice(1).map(toV).filter(h => h.length > 2);
  if (THREE.ShapeUtils.isClockWise(outer)) outer.reverse(); holes.forEach(h => { if (!THREE.ShapeUtils.isClockWise(h)) h.reverse(); });
  const all = outer.concat(...holes), tris = THREE.ShapeUtils.triangulateShape(outer, holes);
  for (const [a, b, c] of tris) F.tri([all[a].x, all[a].y], [all[b].x, all[b].y], [all[c].x, all[c].y], y, col);
}
function ribbon(F, pts, w, y, col, caps = true) { // dải có đầu bo tròn
  const h = w / 2;
  for (let i = 0; i < pts.length - 2; i += 2) {
    const ax = pts[i], az = pts[i + 1], bx = pts[i + 2], bz = pts[i + 3], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz); if (L < 1e-4) continue;
    const nx = -dz / L * h, nz = dx / L * h;
    F.tri([ax + nx, az + nz], [bx + nx, bz + nz], [bx - nx, bz - nz], y, col); F.tri([ax + nx, az + nz], [bx - nx, bz - nz], [ax - nx, az - nz], y, col);
  }
  if (!caps) return;
  for (let i = 0; i < pts.length; i += 2) { const cx = pts[i], cz = pts[i + 1], S = 8; for (let k = 0; k < S; k++) { const a0 = k / S * 6.2832, a1 = (k + 1) / S * 6.2832; F.tri([cx, cz], [cx + Math.cos(a0) * h, cz + Math.sin(a0) * h], [cx + Math.cos(a1) * h, cz + Math.sin(a1) * h], y, col); } }
}
function clipLine(p, R) { // cắt đường theo mép đảo tròn
  const out = []; let cur = [];
  const ins = (x, z) => x * x + z * z <= R * R;
  const edge = (ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, A = dx * dx + dz * dz, B = 2 * (ax * dx + az * dz), C = ax * ax + az * az - R * R, D = B * B - 4 * A * C; if (D < 0 || !A) return null; const s = Math.sqrt(D); for (const t of [(-B - s) / (2 * A), (-B + s) / (2 * A)]) if (t >= 0 && t <= 1) return [ax + dx * t, az + dz * t]; return null; };
  for (let i = 0; i < p.length; i += 2) {
    const x = p[i], z = p[i + 1], inn = ins(x, z);
    if (i) { const px = p[i - 2], pz = p[i - 1], pin = ins(px, pz); if (pin !== inn) { const e = edge(px, pz, x, z); if (e) cur.push(e[0], e[1]); if (!inn) { if (cur.length >= 4) out.push(cur); cur = []; } } }
    if (inn) cur.push(x, z);
  }
  if (cur.length >= 4) out.push(cur); return out;
}
const ptIn = (x, z, p) => { let c = false; for (let i = 0, n = p.length / 2, j = n - 1; i < n; j = i++) { const xi = p[i * 2], zi = p[i * 2 + 1], xj = p[j * 2], zj = p[j * 2 + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
const rnd = s => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
const EMO = { chua: '🛕', nhatho: '⛪', den: '⛩️', truong: '🏫', dh: '🎓', vien: '🏥', cho: '🛒', bt: '🏛️', ks: '🏨', dl: '📸', home: '🏡', que: '🌾', school: '🏫', work: '🏢', other: '📍', trip: '🧳' };
export const PLACE_EMO = EMO;
function emojiTex(e) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = 'rgba(255,255,255,.95)'; x.beginPath(); x.arc(64, 60, 50, 0, 7); x.fill(); x.font = '64px "Apple Color Emoji","Segoe UI Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(e, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }

// dựng một đảo sa bàn từ khu gọn. opt.lite = bản rút gọn cho màn quần đảo
export async function buildIsland(A, opt = {}) {
  const g = new THREE.Group(), grad = opt.grad || toonGrad(), R = RU, lite = !!opt.lite, mats = [];
  const toon = (o = {}) => { const m = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad, ...o }); mats.push(m); return m; };
  // đảo: mặt cỏ + mép đất nhiều lớp
  { const H = lite ? 2.2 : 4.5, cyl = new THREE.CylinderGeometry(R + 1.2, R - .4, H, lite ? 40 : 96, 3, false).toNonIndexed(), pos = cyl.attributes.position, nor = cyl.attributes.normal, cols = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i), top = nor.getY(i) > .9, t = (y + H / 2) / H; const c = top ? hex(COL.ground) : t > .78 ? hex(COL.groundEdge) : t > .45 ? hex(COL.earth1) : t > .18 ? hex(COL.earth2) : hex(COL.earth3); cols.set([c.r, c.g, c.b], i * 3); }
    cyl.setAttribute('color', new THREE.BufferAttribute(cols, 3)); cyl.translate(0, -H / 2, 0); const m = new THREE.Mesh(cyl, toon()); m.name = 'ground'; g.add(m); }
  const F = new Flat(), Wt = new Flat(), y0 = .02;
  // cỏ, công viên, cát
  for (const [k, p] of A.g) { if (p.length < 6) continue; if (!p.some((v, i) => i % 2 === 0 && v * v + p[i + 1] * p[i + 1] < R * R)) continue; polyFill(F, [p.map(v => Math.max(-R, Math.min(R, v)))], y0, hex(COL[k] || COL.park)); }
  // nước: hồ, sông, bờ biển (biển nằm bên phải hướng đường bờ)
  for (const rings of A.w) polyFill(Wt, rings.map(r => r.map(v => Math.max(-R, Math.min(R, v)))), y0 + .015, hex(COL.water));
  for (const [w, p] of A.wl) for (const s of clipLine(p, R)) ribbon(Wt, s, w, y0 + .016, hex(COL.water));
  // biển: chia đảo thành lưới ô 1×1, ô nằm bên PHẢI đoạn bờ biển gần nhất là biển (OSM: đất bên trái hướng vẽ bờ)
  const segs = []; for (const p of A.cl) for (let i = 0; i < p.length - 2; i += 2) segs.push([p[i], p[i + 1], p[i + 2], p[i + 3]]);
  const isSea = (cx, cz) => { if (!segs.length) return false; let bd = 1e9, side = 0; for (const [ax, az, bx, bz] of segs) { const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-9; let t = ((cx - ax) * dx + (cz - az) * dz) / L2; t = Math.max(0, Math.min(1, t)); const px = ax + dx * t, pz = az + dz * t, d = (cx - px) ** 2 + (cz - pz) ** 2; if (d < bd) { bd = d; side = dx * (cz - az) - dz * (cx - ax); } } return side > 0; };
  const inWater = (x, z) => isSea(x, z) || A.w.some(r => ptIn(x, z, r[0]));
  if (A.cl.length) {
    const C = 1, wc = hex(COL.water);
    for (let x = -R; x < R; x += C) for (let z = -R; z < R; z += C) {
      const cx = x + C / 2, cz = z + C / 2; if (cx * cx + cz * cz > R * R) continue;
      if (isSea(cx, cz)) { Wt.tri([x, z], [x + C, z], [x + C, z + C], y0 + .014, wc); Wt.tri([x, z], [x + C, z + C], [x, z + C], y0 + .014, wc); }
    }
    for (const p of A.cl) for (const s of clipLine(p, R)) ribbon(F, s, 1.8, y0 + .02, hex(COL.sand));
  }
  // đường: to trước, nhỏ sau; vạch giữa cho đường lớn
  var RW = { motorway: 2.2, trunk: 2, primary: 1.7, secondary: 1.4, tertiary: 1.15, residential: .85, unclassified: .8, living_street: .7, service: .5, pedestrian: .7, footway: .3, path: .25, cycleway: .3 };
  if (!lite) { const order = Object.keys(RW); const hs = A.h.slice().sort((a, b) => order.indexOf(b[0]) - order.indexOf(a[0]));
    for (const [cls, p] of hs) { const w = RW[cls] || .6, small = w < .4; for (const s0 of clipLine(simplify(p, .08), R - .3)) { ribbon(F, s0, w, y0 + .03 + (small ? 0 : .004) + w * .001, hex(small ? COL.path : w > 1.1 ? COL.road : COL.road2));
      if (w >= 1.4) { let acc = 0; for (let i = 0; i < s0.length - 2; i += 2) { const ax = s0[i], az = s0[i + 1], bx = s0[i + 2], bz = s0[i + 3], L = Math.hypot(bx - ax, bz - az); for (let t = 0; t < L; t += 1.6) { const t1 = Math.min(L, t + .8); if ((acc + t) % 1.6 > .8) continue; const p1 = [ax + (bx - ax) * t / L, az + (bz - az) * t / L], p2 = [ax + (bx - ax) * t1 / L, az + (bz - az) * t1 / L]; ribbon(F, [p1[0], p1[1], p2[0], p2[1]], .09, y0 + .045, hex(COL.line), false); } acc += L; } } } } }
  const fm = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }); mats.push(fm); const flat = new THREE.Mesh(F.geo(), fm); flat.name = 'flat'; g.add(flat);
  // mặt nước gợn sóng (shader nhẹ, theo thời gian)
  const water = new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: { uT: { value: 0 }, uC: { value: hex(COL.water) } }, vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'uniform float uT; uniform vec3 uC; varying vec3 vW; void main(){ float a = sin(vW.x*1.3 + uT*1.6) * sin(vW.z*1.1 - uT*1.2); float b = sin((vW.x+vW.z)*2.7 + uT*2.4); float h = smoothstep(.55,.95, a*.6 + b*.4); gl_FragColor = vec4(mix(uC, vec3(1.), h*.55) * (.92 + .08*sin(vW.z*.4+uT)), 1.); }' });
  mats.push(water); if (Wt.p.length) { const wm = new THREE.Mesh(Wt.geo(), water); wm.name = 'water'; g.add(wm); }
  // nhà: khối đùn bo mép, mái pastel theo loại, cao theo số tầng (giới hạn cho dễ thương)
  const blds = lite ? A.b.slice().sort((a, b) => Math.abs(area(b[2])) - Math.abs(area(a[2]))).slice(0, 220) : A.b, geos = [], wall = hex(COL.wall), R0 = rnd(7);
  let n = 0;
  for (const [lv, kind, p0] of blds) {
    let p = simplify(p0, lite ? .3 : .12); if (p.length >= 4 && p[0] === p[p.length - 2] && p[1] === p[p.length - 1]) p = p.slice(0, -2); if (p.length < 6) continue;
    let cx = 0, cz = 0; for (let i = 0; i < p.length; i += 2) { cx += p[i]; cz += p[i + 1]; } cx /= p.length / 2; cz /= p.length / 2; if (cx * cx + cz * cz > (R - .8) ** 2) continue;
    const ar = Math.abs(area(p)); if (ar < .12) continue;
    const levels = Math.max(1, Math.min(lv || (ar > 25 ? 4 : ar > 6 ? 3 : 2), 9)), h = .45 + levels * .38;
    const sh = new THREE.Shape(); for (let i = 0; i < p.length; i += 2) i ? sh.lineTo(p[i], -p[i + 1]) : sh.moveTo(p[i], -p[i + 1]);
    const bev = !lite && p.length <= 24, eg = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: bev, bevelThickness: .06, bevelSize: .06, bevelSegments: 1, curveSegments: 1 });
    eg.rotateX(-Math.PI / 2); const gg = eg.index ? eg.toNonIndexed() : eg; if (gg !== eg) eg.dispose(); gg.computeVertexNormals();
    const pal = COL.roofs[kind] || COL.roofs.res, roof = hex(pal[Math.floor(R0() * pal.length)]), wl = wall.clone().lerp(roof, .12), pos = gg.attributes.position, nor = gg.attributes.normal, cols = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { const top = nor.getY(i) > .6 && pos.getY(i) > h * .6, c = top ? roof : wl; cols.set([c.r, c.g, c.b], i * 3); }
    gg.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geos.push(gg);
    if (++n % 120 === 0 && opt.yieldFn) await opt.yieldFn(n / blds.length);
  }
  if (!lite && A.b.length < 60) {
    const Rd = rnd(23), occ = []; let k = 0;
    for (const [cls, p] of A.h) { if (!/residential|unclassified|living_street|tertiary|service/.test(cls)) continue; const w = RW[cls] || .6;
      for (let i = 0; i < p.length - 2 && k < 420; i += 2) { const ax = p[i], az = p[i + 1], bx = p[i + 2], bz = p[i + 3], L = Math.hypot(bx - ax, bz - az); if (L < 1) continue; const nx = -(bz - az) / L, nz = (bx - ax) / L;
        for (let t = 1.2; t < L - .6; t += 2.4) for (const sd of [-1, 1]) { if (Rd() > .55) continue; const off = w / 2 + .95, x = ax + (bx - ax) * t / L + nx * off * sd, z = az + (bz - az) * t / L + nz * off * sd; if (x * x + z * z > (R - 1.5) ** 2 || occ.some(([ox, oz]) => (ox - x) ** 2 + (oz - z) ** 2 < 2.2) || inWater(x, z)) continue; occ.push([x, z]);
          const sw = .55 + Rd() * .35, ang = Math.atan2(bz - az, bx - ax), c = Math.cos(ang), sn = Math.sin(ang), q = [[-sw, -sw], [sw, -sw], [sw, sw], [-sw, sw]].map(([u, v]) => [x + u * c - v * sn, z + u * sn + v * c]);
          const sh = new THREE.Shape(); q.forEach(([u, v], j) => j ? sh.lineTo(u, -v) : sh.moveTo(u, -v)); const h = .7 + Rd() * .7, eg = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: true, bevelThickness: .06, bevelSize: .06, bevelSegments: 1 }); eg.rotateX(-Math.PI / 2); const gg = eg.toNonIndexed(); eg.dispose(); gg.computeVertexNormals();
          const roof = hex(COL.roofs.res[Math.floor(Rd() * COL.roofs.res.length)]), wl = wall.clone().lerp(roof, .12), pos = gg.attributes.position, nor = gg.attributes.normal, cols = new Float32Array(pos.count * 3);
          for (let m = 0; m < pos.count; m++) { const c2 = nor.getY(m) > .6 && pos.getY(m) > h * .6 ? roof : wl; cols.set([c2.r, c2.g, c2.b], m * 3); } gg.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geos.push(gg); k++; } } }
  }
  if (geos.length) { const bg = merge(geos), bm = new THREE.Mesh(bg, toon()); bm.name = 'blds'; g.add(bm);
    if (!lite) { const ol = new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: { uC: { value: hex('#4a3446') } }, vertexShader: 'void main(){ vec3 p = position + normal * .045; gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.); }', fragmentShader: 'uniform vec3 uC; void main(){ gl_FragColor = vec4(uC,1.); }' }); mats.push(ol); const om = new THREE.Mesh(bg, ol); om.name = 'outline'; g.add(om); } }
  // cây low-poly trong công viên, rừng (InstancedMesh)
  if (!lite) {
    const pts = []; const Rt = rnd(11);
    for (const [k, p] of A.g) { if (!/park|wood|scrub|garden|farm/.test(k) || p.length < 6) continue; const step = k === 'wood' ? 1.4 : k === 'farm' ? 4 : 2.4; let mnx = 1e9, mxx = -1e9, mnz = 1e9, mxz = -1e9; for (let i = 0; i < p.length; i += 2) { mnx = Math.min(mnx, p[i]); mxx = Math.max(mxx, p[i]); mnz = Math.min(mnz, p[i + 1]); mxz = Math.max(mxz, p[i + 1]); }
      for (let x = mnx; x < mxx; x += step) for (let z = mnz; z < mxz; z += step) { const jx = x + (Rt() - .5) * step * .7, jz = z + (Rt() - .5) * step * .7; if (jx * jx + jz * jz < (R - 1) ** 2 && ptIn(jx, jz, p)) pts.push([jx, jz]); if (pts.length > 900) break; } }
    if (pts.length) {
      const trunk = new THREE.CylinderGeometry(.09, .12, .5, 5).toNonIndexed(); trunk.translate(0, .25, 0); const c1 = new THREE.ConeGeometry(.55, .9, 6).toNonIndexed(); c1.translate(0, .9, 0); const c2 = new THREE.ConeGeometry(.42, .7, 6).toNonIndexed(); c2.translate(0, 1.35, 0);
      const paint = (geo, col) => { const c = hex(col), a = new Float32Array(geo.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) a.set([c.r, c.g, c.b], i); geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); return geo; };
      const tg = merge([paint(trunk, '#9a6a44'), paint(c1, '#5fbf5a'), paint(c2, '#79d26a')]);
      const im = new THREE.InstancedMesh(tg, toon(), pts.length), M = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), tint = new THREE.Color();
      pts.forEach(([x, z], i) => { const s = .75 + Rt() * .6; q.setFromAxisAngle(up, Rt() * 6.28); M.compose(new THREE.Vector3(x, y0, z), q, sc.set(s, s * (.9 + Rt() * .3), s)); im.setMatrixAt(i, M); im.setColorAt(i, tint.setHSL(.27 + Rt() * .08, .55, .5 + Rt() * .12)); });
      im.name = 'trees'; g.add(im);
    }
    // biểu tượng điểm mốc
    for (const [k, name, x, z] of A.p.slice(0, 24)) { if (x * x + z * z > (R - 1) ** 2) continue; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex(EMO[k] || '📍'), depthWrite: false })); sp.scale.setScalar(2.2); sp.position.set(x, 4.2, z); sp.userData.poi = { k, name }; g.add(sp); mats.push(sp.material); }
  }
  g.userData.dispose = () => { g.traverse(o => { o.geometry?.dispose?.(); if (o.material?.map) o.material.map.dispose(); }); mats.forEach(m => m.dispose()); };
  g.userData.water = water;
  return g;
}

// ---------- màn sa bàn ----------
export function initSaban() {
  let R = null, scene, camera, root = null, island = null, raf = 0, dirty = true, idle = 0, open = false, cur = null, building = 0;
  const cam = { az: .6, phi: .82, dist: 78, target: new THREE.Vector3(), want: null };
  const host = document.createElement('div'); host.id = 'sbv'; host.innerHTML = `<canvas></canvas><div class="sb-pins"></div><div class="sb-att">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors</div><div class="sb-load" hidden><div class="sb-cloud"><i></i><i></i><i></i></div><b></b><small></small></div><div class="sb-clouds"><i></i><i></i><i></i><i></i><i></i></div>`;
  const canvas = host.querySelector('canvas'), PINS = host.querySelector('.sb-pins'), LOAD = host.querySelector('.sb-load');
  const pins = []; let walker = null, tapCb = null, pinTap = null;
  function ensureGL() {
    if (R) return; R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' }); R.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); R.outputColorSpace = THREE.SRGBColorSpace;
    scene = new THREE.Scene(); scene.background = new THREE.Color('#bfe6ff'); scene.fog = new THREE.Fog('#bfe6ff', 260, 700);
    camera = new THREE.PerspectiveCamera(38, 1, .5, 1400);
    scene.add(new THREE.HemisphereLight('#e3f3ff', '#f6d8ae', .9)); const d = new THREE.DirectionalLight('#fff1dc', 1.6); d.position.set(40, 90, 30); scene.add(d); scene.add(new THREE.AmbientLight('#ffffff', .35));
    // bóng mềm dưới đảo + biển xa
    const sh = document.createElement('canvas'); sh.width = sh.height = 128; const x = sh.getContext('2d'), gr = x.createRadialGradient(64, 64, 10, 64, 64, 64); gr.addColorStop(0, 'rgba(40,60,90,.38)'); gr.addColorStop(1, 'rgba(40,60,90,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    const st = new THREE.CanvasTexture(sh), shadow = new THREE.Mesh(new THREE.PlaneGeometry(RU * 2.9, RU * 2.9), new THREE.MeshBasicMaterial({ map: st, transparent: true, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = -9; scene.add(shadow);
    const sea = new THREE.Mesh(new THREE.CircleGeometry(600, 48), new THREE.MeshBasicMaterial({ color: '#a8dcff' })); sea.rotation.x = -Math.PI / 2; sea.position.y = -9.2; scene.add(sea);
    root = new THREE.Group(); scene.add(root); resize(); bind();
  }
  const fitDist = () => { const v = camera.fov * Math.PI / 360, h = Math.atan(Math.tan(v) * camera.aspect); return Math.min(330, 1.12 * RU / Math.tan(Math.min(v, h)) * .78); };
  function resize() { if (!R) return; const w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight; R.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); dirty = true; }
  addEventListener('resize', () => open && resize());
  function place() { const sp = Math.sin(cam.phi), x = cam.target.x + cam.dist * sp * Math.sin(cam.az), z = cam.target.z + cam.dist * sp * Math.cos(cam.az), y = cam.target.y + cam.dist * Math.cos(cam.phi); camera.position.set(x, y, z); camera.lookAt(cam.target); }
  const v3 = new THREE.Vector3();
  function render(now) {
    raf = 0; if (!open) return; const t = now / 1000;
    if (cam.want) { const w = cam.want, k = Math.min(1, (now - w.t0) / w.ms), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; cam.az = w.az0 + (w.az - w.az0) * e; cam.dist = w.d0 + (w.d - w.d0) * e; cam.phi = w.p0 + (w.p - w.p0) * e; cam.target.lerpVectors(w.t0v, w.tv, e); if (k >= 1) cam.want = null; dirty = true; }
    if (walker?.walk) { const w = walker.walk, k = Math.min(1, (now - w.t0) / w.ms); walker.pos.lerpVectors(w.a, w.b, k * k * (3 - 2 * k)); if (k >= 1) { walker.walk = null; walker.el.classList.remove('walking'); } dirty = true; }
    const anim = dirty || (now - idle < 2500);
    if (island?.userData.water) island.userData.water.uniforms.uT.value = t;
    if (anim) { place(); R.render(scene, camera); posPins(); }
    if (dirty) { idle = now; dirty = false; }
    if (anim || cam.want || walker?.walk) raf = requestAnimationFrame(render); // đứng yên 2,5 s thì thôi vẽ
  }
  const kick = () => { dirty = true; if (!raf && open) raf = requestAnimationFrame(render); };
  function posPins() {
    const W = host.clientWidth, H = host.clientHeight;
    for (const p of [...pins, ...(walker ? [walker] : [])]) { v3.copy(p.pos); v3.y += p.lift || 0; v3.project(camera); const vis = v3.z < 1 && Math.abs(v3.x) < 1.3 && Math.abs(v3.y) < 1.3; p.el.style.visibility = vis ? '' : 'hidden'; if (vis) p.el.style.transform = `translate3d(${((v3.x + 1) / 2 * W).toFixed(1)}px,${((1 - v3.y) / 2 * H).toFixed(1)}px,0)`; }
  }
  // ---------- chạm: kéo xoay, chụm phóng, hai ngón nghiêng / kéo ----------
  function bind() {
    const P = new Map(); let g = null, downT = 0, moved = 0;
    canvas.addEventListener("pointerdown", e => { if (e.isPrimary || P.size >= 2) P.clear(); try { canvas.setPointerCapture(e.pointerId); } catch (er) { } P.set(e.pointerId, { x: e.clientX, y: e.clientY }); cam.want = null; downT = performance.now(); moved = 0; g = snap(); });
    const snap = () => { const a = [...P.values()]; return a.length >= 2 ? { two: true, d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), mx: (a[0].x + a[1].x) / 2, my: (a[0].y + a[1].y) / 2, dist: cam.dist, phi: cam.phi, tg: cam.target.clone() } : a.length ? { x: a[0].x, y: a[0].y, az: cam.az, phi: cam.phi, tg: cam.target.clone() } : null; };
    canvas.addEventListener('pointermove', e => {
      if (!P.has(e.pointerId) || !g) return; const prev = P.get(e.pointerId); P.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved += Math.hypot(e.clientX - prev.x, e.clientY - prev.y);
      const a = [...P.values()];
      if (g.two && a.length >= 2) { const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), mx = (a[0].x + a[1].x) / 2, my = (a[0].y + a[1].y) / 2;
        cam.dist = Math.max(14, Math.min(fitDist() * 1.3, g.dist * g.d / Math.max(20, d)));
        const dy = my - g.my, dx = mx - g.mx; if (Math.abs(dy) > Math.abs(dx) * 1.4 && Math.abs(d - g.d) < 40) cam.phi = Math.max(.5, Math.min(1.2, g.phi + dy * .005)); // hai ngón kéo dọc = nghiêng
        else { const k = cam.dist / 600, ca = Math.cos(cam.az), sa = Math.sin(cam.az); cam.target.set(g.tg.x - (dx * ca + dy * sa) * k * 1.4, 0, g.tg.z - (-dx * sa + dy * ca) * k * 1.4); clampT(); } }
      else if (!g.two && e.buttons === 2 || e.shiftKey) { const k = cam.dist / 600, ca = Math.cos(cam.az), sa = Math.sin(cam.az), dx = e.clientX - g.x, dy = e.clientY - g.y; cam.target.set(g.tg.x - (dx * ca + dy * sa) * k * 1.4, 0, g.tg.z - (-dx * sa + dy * ca) * k * 1.4); clampT(); }
      else if (!g.two) { cam.az = g.az - (e.clientX - g.x) * .008; cam.phi = Math.max(.5, Math.min(1.2, g.phi - (e.clientY - g.y) * .004)); }
      kick();
    });
    const up = e => { const wasTap = P.size === 1 && moved < 9 && performance.now() - downT < 350; P.delete(e.pointerId); g = snap(); if (wasTap && e.type === 'pointerup') tap(e.clientX, e.clientY); };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('lostpointercapture', e => { P.delete(e.pointerId); g = P.size ? g : null; });
    addEventListener('blur', () => { P.clear(); g = null; }); document.addEventListener('visibilitychange', () => { P.clear(); g = null; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('wheel', e => { e.preventDefault(); cam.dist = Math.max(14, Math.min(fitDist() * 1.3, cam.dist * Math.exp(e.deltaY * .0012))); kick(); }, { passive: false });
    PINS.addEventListener('click', e => { const el = e.target.closest('[data-pin]'); if (!el) return; const p = pins.find(x => x.id === el.dataset.pin); if (p) pinTap?.(p, el, e); });
  }
  const clampT = () => { const L = Math.hypot(cam.target.x, cam.target.z), M = RU * .85; if (L > M) cam.target.multiplyScalar(M / L); };
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  function tap(cx, cy) {
    if (!cur) return;
    const r = canvas.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera);
    const hit = new THREE.Vector3(); if (!ray.ray.intersectPlane(ground, hit)) return; if (hit.x * hit.x + hit.z * hit.z > RU * RU) return;
    tapCb?.(toLL(hit.x, hit.z), hit);
  }
  const toLL = (x, z) => { const [la0, lo0] = cur.A.c; return { lat: +(la0 - z * UNIT / 110540).toFixed(6), lon: +(lo0 + x * UNIT / (111320 * Math.cos(la0 * Math.PI / 180))).toFixed(6) }; };
  const toXZ = (lat, lon) => { const [la0, lo0] = cur.A.c; return new THREE.Vector3((lon - lo0) * 111320 * Math.cos(la0 * Math.PI / 180) / UNIT, 0, -(lat - la0) * 110540 / UNIT); };
  // ---------- ghim (DOM nổi trên cảnh) ----------
  function clearPins() { pins.length = 0; PINS.querySelectorAll('[data-pin]').forEach(x => x.remove()); }
  function addPin(o) { // o: { id, lat, lon, html, cls, lift }
    if (!cur && !o.pos) return null; const el = document.createElement('div'); el.className = 'sb-pin ' + (o.cls || ''); el.dataset.pin = o.id; el.innerHTML = o.html; PINS.appendChild(el);
    const p = { ...o, el, pos: o.pos || toXZ(o.lat, o.lon) }; pins.push(p); el.animate?.([{ transform: 'translateY(-40px) scale(.3)', opacity: 0 }, { transform: 'translateY(4px) scale(1.12)', opacity: 1, offset: .7 }, { transform: 'none', opacity: 1 }], { duration: 560, easing: 'cubic-bezier(.34,1.56,.64,1)', pseudoElement: undefined });
    kick(); return p;
  }
  function removePin(id) { const i = pins.findIndex(p => p.id === id); if (i >= 0) { pins[i].el.remove(); pins.splice(i, 1); kick(); } }
  function setWalker(html, lat, lon) { if (walker) walker.el.remove(); if (!html) { walker = null; return; } const el = document.createElement('div'); el.className = 'sb-me'; el.innerHTML = html; PINS.appendChild(el); walker = { el, pos: toXZ(lat, lon), lift: 0 }; kick(); }
  function walkTo(lat, lon) { if (!walker) return; const b = toXZ(lat, lon), d = walker.pos.distanceTo(b); walker.walk = { a: walker.pos.clone(), b, t0: performance.now(), ms: Math.min(2600, 500 + d * 60) }; walker.el.classList.add('walking'); walker.el.classList.toggle('left', b.x < walker.pos.x); kick(); }
  // ---------- nạp khu (cache trong máy → không có thì tải từ OSM) ----------
  async function loadArea(lat, lon, { onProg } = {}) {
    const ar = areaOf(lat, lon), key = 'osm:' + ar.key;
    let ad = await unpackArea(await A_get(key));
    if (!ad && A_remote) { onProg?.('Đang lấy bản đồ đã lưu trên Drive…'); try { ad = await unpackArea(await A_remote(ar.key)); if (ad) await A_put(key, await packArea(ad)); } catch (e) { } }
    if (!ad) { onProg?.('Đang tải bản đồ khu này từ OpenStreetMap…'); const j = await fetchOverpass(ar.lat, ar.lon); ad = compactArea(j, ar.lat, ar.lon); const blob = await packArea(ad); await A_put(key, blob); A_onNew?.(ar.key, blob); }
    return { key: ar.key, A: ad };
  }
  let A_get = null, A_put = null, A_onNew = null, A_remote = null;
  async function show(lat, lon, { title, fly = true } = {}) {
    ensureGL(); const tok = ++building;
    if (island && fly) host.classList.add('cloudy');
    LOAD.hidden = false; LOAD.querySelector('b').textContent = title || 'Đang dựng sa bàn…'; LOAD.querySelector('small').textContent = '';
    try {
      const { key, A } = await loadArea(lat, lon, { onProg: t => { LOAD.querySelector('small').textContent = t; } }); if (tok !== building) return false;
      LOAD.querySelector('small').textContent = 'Đang dựng nhà cửa, đường phố…';
      if (island) { root.remove(island); island.userData.dispose(); island = null; R.renderLists?.dispose?.(); }
      const grp = await buildIsland(A, { yieldFn: async f => { LOAD.querySelector('small').textContent = `Đang dựng nhà cửa… ${Math.round(f * 100)}%`; await sleep(0); } }); if (tok !== building) { grp.userData.dispose(); return false; }
      if (island) { root.remove(island); island.userData.dispose(); } island = grp; root.add(island); cur = { key, A }; clearPins(); if (walker) { walker.el.remove(); walker = null; }
      cam.target.set(0, 0, 0);
      cam.phi = .86; const fd = fitDist(); cam.want = { t0: performance.now(), ms: 1400, az0: cam.az + 1.2, az: cam.az, d0: fd * 1.6, d: fd, p0: 1.1, p: .86, t0v: cam.target.clone(), tv: cam.target.clone() };
      LOAD.hidden = true; setTimeout(() => host.classList.remove('cloudy'), 250); kick(); return true;
    } catch (e) { LOAD.querySelector('small').textContent = e.message || String(e); host.classList.remove('cloudy'); throw e; }
  }
  // QUẦN ĐẢO: mỗi khu đã sống / đi là một hòn đảo nhỏ (bản rút gọn), bay qua lại; chạm nhãn để vào đảo
  async function showArchipelago(items) {
    ensureGL(); const tok = ++building; LOAD.hidden = false; LOAD.querySelector('b').textContent = 'Đang dựng quần đảo…'; LOAD.querySelector('small').textContent = '';
    const grp = new THREE.Group(), n = items.length, S = .2, out = [];
    for (let i = 0; i < n; i++) {
      const it = items[i], ang = i / Math.max(1, n) * Math.PI * 2 + .4, rr = n === 1 ? 0 : 16 + n * 2.2, x = Math.cos(ang) * rr, z = Math.sin(ang) * rr;
      let isl; if (it.A) isl = await buildIsland(it.A, { lite: true }); else { isl = new THREE.Group(); const m = new THREE.Mesh(new THREE.CylinderGeometry(RU + 1, RU - .4, 3, 40), new THREE.MeshToonMaterial({ color: '#a9df7e' })); m.position.y = -1.5; isl.add(m); isl.userData.dispose = () => { m.geometry.dispose(); m.material.dispose(); }; }
      isl.scale.setScalar(S); isl.position.set(x, Math.sin(i * 1.7) * .8, z); grp.add(isl); out.push({ ...it, pos: new THREE.Vector3(x, 2, z) });
    }
    if (tok !== building) return;
    if (island) { root.remove(island); island.userData.dispose(); } island = grp; island.userData.dispose = () => grp.children.forEach(c => c.userData.dispose?.()); root.add(island); cur = null; clearPins(); if (walker) { walker.el.remove(); walker = null; }
    out.forEach((it, i) => addPin({ id: 'isl:' + i, pos: it.pos, cls: 'isl', html: `<div><span class="pl">🏝️ ${String(it.label || '').replace(/[<>&]/g, '')}</span><span class="pi" style="--c:#7fd6a4"><span>${it.emo || '📍'}</span></span></div>`, data: it }));
    const rr = n === 1 ? 14 : 16 + n * 2.2, vf = camera.fov * Math.PI / 360, hf = Math.atan(Math.tan(vf) * camera.aspect), dd = (rr + 13) / Math.tan(Math.min(vf, hf)) * .85; cam.target.set(0, 0, 0); cam.want = { t0: performance.now(), ms: 1300, az0: cam.az - 1, az: cam.az, d0: dd * 1.6, d: dd, p0: 1.1, p: .9, t0v: cam.target.clone(), tv: new THREE.Vector3() };
    LOAD.hidden = true; kick();
  }
  return {
    host, show, showArchipelago, addPin, removePin, clearPins, setWalker, walkTo, toLL, toXZ, kick, resize,
    setStore(get, put, onNew, remote) { A_get = get; A_put = put; A_onNew = onNew; A_remote = remote; },
    onTap(f) { tapCb = f; }, onPin(f) { pinTap = f; },
    get area() { return cur; }, get open() { return open; },
    start() { open = true; ensureGL(); resize(); kick(); },
    stop() { open = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    focus(lat, lon, d = 40) { if (!cur) return; const p = toXZ(lat, lon); cam.want = { t0: performance.now(), ms: 900, az0: cam.az, az: cam.az, d0: cam.dist, d, p0: cam.phi, p: Math.min(cam.phi, .9), t0v: cam.target.clone(), tv: new THREE.Vector3(p.x, 0, p.z) }; kick(); },
    stats() { let tris = 0; island?.traverse(o => { if (o.isMesh && o.geometry) { const n = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; tris += o.isInstancedMesh ? n * o.count : n; } }); return { tris: Math.round(tris), calls: R?.info.render.calls, buildings: cur?.A.b.length }; },
    dispose() { this.stop(); if (island) { island.userData.dispose(); root.remove(island); island = null; } R?.dispose(); R?.forceContextLoss?.(); R = null; cur = null; }
  };
}
