// Hành Trình Của Bạn — 🎬 VIDEO KỶ NIỆM: dựng MP4 ngay trong máy, không gửi đi đâu.
// Một canvas WebGL2 + hàm thuần drawAt(t) dùng chung cho xem trước và xuất (tất định: cùng t ra cùng khung hình).
// Mã hoá H.264 + AAC, ghép MP4 bằng mediabunny (MPL-2.0, lib/). Chuyển cảnh viết lại theo ý tưởng gl-transitions (MIT).
import { renderMusic, userMusic, mixClipAudio, LEAD, mulberry32 } from './videonhac.js';

const VS = `#version 300 es
in vec2 p; out vec2 vUv; void main(){ vUv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;
// cảnh ảnh: phủ kín (Ken Burns) | thẻ ảnh trên nền mờ | polaroid nghiêng
const FS_PHOTO = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o;
uniform sampler2D tImg; uniform float imgA, outA, mode, rot, cardS, dim, punch, fy; uniform vec3 kb; uniform vec2 off;
vec2 F(vec2 u){ return fy > .5 ? vec2(u.x, 1. - u.y) : u; }
vec2 coverUV(vec2 uv, vec3 k){ vec2 q = (uv - .5) / k.x; vec2 f = vec2(min(1., outA / imgA), min(1., imgA / outA)); return k.yz + q * f; }
void main(){
  vec2 uv0 = (vUv - .5) / punch + .5; vec3 c;
  if (mode < .5) c = texture(tImg, F(coverUV(uv0, kb))).rgb;
  else {
    vec3 bg = textureLod(tImg, F(coverUV(uv0, vec3(1.18, .5, .5))), 5.5).rgb * dim;
    vec2 p = (uv0 - .5) * vec2(outA, 1.) - off; float cs = cos(rot), sn = sin(rot); p = mat2(cs, sn, -sn, cs) * p;
    float fr = mode > 1.5 ? 1. : 0., side = .057 * fr, bot = .297 * fr;
    float cw = 1. + 2. * side, ch = 1. / imgA + side + bot;
    float w = min(outA * .80 * cardS / cw, .64 * cardS / ch);
    vec2 ph = vec2(w, w / imgA) * .5, pc = vec2(0., (bot - side) * w * .5), chh = vec2(w * cw, w * ch) * .5;
    vec2 d = p - pc;
    if (cardS > .001 && abs(d.x) < ph.x && abs(d.y) < ph.y) { vec2 u = d / (ph * 2.) + .5; u = .5 + (u - .5) / kb.x + (kb.yz - .5) * (1. - 1. / kb.x); c = texture(tImg, F(u)).rgb; }
    else if (cardS > .001 && fr > .5 && abs(p.x) < chh.x && abs(p.y) < chh.y) c = vec3(.985, .975, .952) - .03 * smoothstep(chh.y * .2, chh.y, -p.y);
    else { float sd = cardS > .001 ? length(max(abs(p - vec2(.012, -.02)) - chh, 0.)) : 9.; c = bg * (1. - .38 * exp(-sd * 38.)); }
  }
  o = vec4(c, 1.);
}`;
// chuyển cảnh A → B (tự viết theo ý tưởng gl-transitions: fade, SimpleZoom, CrossZoom, crosswarp, Dreamy)
const FS_TRANS = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o;
uniform sampler2D tA, tB; uniform float prog, typ;
vec3 A(vec2 u){ return texture(tA, clamp(u, 0., 1.)).rgb; } vec3 B(vec2 u){ return texture(tB, clamp(u, 0., 1.)).rgb; }
void main(){
  float t = prog; vec2 uv = vUv; vec3 c;
  if (typ < .5) c = mix(A(uv), B(uv), smoothstep(0., 1., t));
  else if (typ < 1.5) { float q = .8; vec2 z = .5 + (uv - .5) * (1. - smoothstep(0., q, t)); c = mix(A(z), B(uv), smoothstep(q - .2, 1., t)); }
  else if (typ < 2.5) { float s = sin(t * 3.14159) * .35; vec3 a = vec3(0.), b = vec3(0.); vec2 dir = uv - .5;
    for (int i = 0; i < 12; i++) { float k = float(i) / 11.; a += A(uv - dir * s * k * .5); b += B(uv - dir * s * k * .5); } c = mix(a / 12., b / 12., smoothstep(.35, .65, t)); }
  else if (typ < 3.5) { float x = smoothstep(0., 1., t * 2. + uv.x - 1.); c = mix(A((uv - .5) * (1. - x) + .5), B((uv - .5) * x + .5), x); }
  else if (typ < 4.5) { float a = sin(t * 3.14159); vec2 w = vec2(sin(uv.y * 12. + t * 9.) * .012, sin(uv.x * 9. + t * 7.) * .018) * a; c = mix(A(uv + w), B(uv - w), smoothstep(.15, .85, t)); }
  else if (typ < 5.5) { c = t < .5 ? A(uv) : B(uv); c = mix(c, vec3(1.), pow(1. - abs(t - .5) * 2., 3.)); }
  else { float e = t < .5 ? t * 2. : (t - .5) * 2.; vec3 s = vec3(0.); for (int i = 0; i < 8; i++) { float k = float(i) / 7.; s += t < .5 ? A(uv + vec2(e * e * 1.2 + k * .06 * e, 0.)) : B(uv - vec2((1. - e) * (1. - e) * 1.2 + k * .06 * (1. - e), 0.)); } c = s / 8.; }
  o = vec4(c, 1.);
}`;
// hậu kỳ gộp 1 lượt: tông màu → tách tông → grain theo SỐ KHUNG (tất định) → vignette → chữ → letterbox, flash, mờ đen
const FS_POST = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o;
uniform sampler2D tSrc, tTxt; uniform float frame, grain, vig, sat, warm, lift, fade, flash, letter, outA, leak; uniform vec2 res;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
void main(){
  vec3 c = texture(tSrc, vUv).rgb; float l = dot(c, vec3(.2126, .7152, .0722));
  c = mix(vec3(l), c, sat); c = c * (1. - lift) + lift;
  c += warm * (vec3(.07, .025, -.05) * smoothstep(.35, 1., l) + vec3(-.035, .01, .045) * (1. - smoothstep(0., .5, l)));
  if (leak > 0.) { vec2 q = vUv - vec2(.15 + .7 * fract(leak * .37), .8); c += vec3(1., .45, .18) * .35 * exp(-dot(q, q) * 6.) * smoothstep(0., .3, fract(leak)) * (1. - smoothstep(.6, 1., fract(leak))); }
  float g = h21(floor(vUv * res) + fract(frame * .6180339) * vec2(91.7, 47.3)) - .5; c += g * grain * (1. - abs(l - .5) * 1.2);
  vec2 d = vUv - .5; d.x *= outA; c *= 1. - vig * smoothstep(.35, .95, length(d));
  vec4 tx = texture(tTxt, vec2(vUv.x, 1. - vUv.y)); c = mix(c, tx.rgb, tx.a);
  if (letter > 0. && (vUv.y < letter || vUv.y > 1. - letter)) c = vec3(0.);
  c = mix(c, vec3(1.), flash); c *= 1. - fade;
  o = vec4(clamp(c, 0., 1.), 1.);
}`;

const ease = { sine: x => -(Math.cos(Math.PI * x) - 1) / 2, outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x), inExpo: x => x <= 0 ? 0 : Math.pow(2, 10 * x - 10), outBack: x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }, p4out: x => 1 - Math.pow(1 - x, 4) };
const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
// lò xo dạng đóng của t (tua được): stiffness 150, damping 8, mass .7 — độ nảy Vũ thích
const spring = (t, k = 150, c = 8, m = .7) => { if (t <= 0) return 0; const w0 = Math.sqrt(k / m), z = c / (2 * Math.sqrt(k * m)), wd = w0 * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t)); };
const TRANS = { fade: 0, zoom: 1, crosszoom: 2, warp: 3, dreamy: 4, flash: 5, whip: 6 };

// ---------- 4 MẪU ----------
export const TEMPLATES = {
  dienanh: { t: 'Điện ảnh', music: 'dienanh', beats: 4, tLen: .7, kb: [1, 1.08], mode: 0, grade: { sat: 1.04, warm: .12, lift: .02, grain: .025, vig: .3 }, transSeq: ['fade', 'fade', 'fade', 'zoom', 'fade', 'fade', 'warp', 'fade', 'crosszoom'] },
  nhanh: { t: 'Nhịp nhanh', music: 'vui', arc: [4, 2, 2, 1], tLen: 0, kb: [1.02, 1.1], mode: 0, punch: true, grade: { sat: 1.12, warm: .05, lift: 0, grain: .012, vig: .18 }, transSeq: ['cut'] },
  hoainiem: { t: 'Hoài niệm', music: 'hopnhac', nostalgia: true, beats: 4, tLen: 1.2, kb: [1, 1.05], mode: 2, grade: { sat: .76, warm: .32, lift: .06, grain: .065, vig: .45 }, leak: true, transSeq: ['dreamy', 'fade'] },
  bando: { t: 'Bản đồ hành trình', music: 'dienanh', beats: 4, tLen: .7, kb: [1, 1.08], mode: 0, intro: 'map', grade: { sat: 1.04, warm: .1, lift: .02, grain: .02, vig: .28 }, transSeq: ['fade', 'fade', 'zoom', 'fade'] }
};
export const LENGTHS = [30, 60, 90];

// ---------- chọn ảnh tự động: nét (phương sai Laplacian, xếp hạng tương đối), phơi sáng, bỏ trùng (dHash ≤ 10) ----------
export async function scoreThumb(blob) {
  const bmp = await createImageBitmap(blob), W = 256, H = Math.max(8, Math.round(W * bmp.height / bmp.width)), c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(bmp, 0, 0, W, H); bmp.close?.();
  const d = x.getImageData(0, 0, W, H).data, g = new Float32Array(W * H); let sum = 0, clip = 0;
  for (let i = 0; i < W * H; i++) { const l = .299 * d[i * 4] + .587 * d[i * 4 + 1] + .114 * d[i * 4 + 2]; g[i] = l; sum += l; if (l < 8 || l > 247) clip++; }
  let s = 0, s2 = 0, n = 0; for (let y = 1; y < H - 1; y++) for (let k = 1; k < W - 1; k++) { const i = y * W + k, L = g[i - W] + g[i + W] + g[i - 1] + g[i + 1] - 4 * g[i]; s += L; s2 += L * L; n++; }
  const h = document.createElement('canvas'); h.width = 9; h.height = 8; const hx = h.getContext('2d', { willReadFrequently: true }); hx.drawImage(c, 0, 0, 9, 8); const p = hx.getImageData(0, 0, 9, 8).data; let dh = 0n;
  const lum = j => p[j] * .299 + p[j + 1] * .587 + p[j + 2] * .114; for (let y = 0; y < 8; y++) for (let i = 0; i < 8; i++) { const j = (y * 9 + i) * 4; dh = (dh << 1n) | (lum(j) > lum(j + 4) ? 1n : 0n); }
  c.width = c.height = 1; return { net: s2 / n - (s / n) ** 2, sang: sum / (W * H), chay: clip / (W * H), dh: dh.toString(16) };
}
const hamming = (a, b) => { let v = BigInt('0x' + a) ^ BigInt('0x' + b), n = 0; while (v) { n += Number(v & 1n); v >>= 1n; } return n; };
// ms: khoảnh khắc (có .sc điểm đã tính) → danh sách theo thời gian, đa dạng ngày, bỏ ảnh mờ/tối/trùng
export function pickMoments(ms, n) {
  const img = ms.filter(m => m.sc), nets = img.map(m => m.sc.net).sort((a, b) => a - b), cut = nets[Math.floor(nets.length * .18)] ?? 0;
  const score = m => { if (!m.sc) return m.type === 'video' ? .55 : .3; const net = nets.length ? nets.indexOf(nets.find(v => v >= m.sc.net)) / Math.max(1, nets.length - 1) : .5, ex = m.sc.sang < 40 || m.sc.sang > 215 ? 0 : m.sc.chay > .25 ? .3 : 1; return .4 * net + .2 * ex + .2 * ((m.kidIds?.length || 0) > 0 ? 1 : 0) + .2 * (m.title || m.note ? 1 : .5) - (m.sc.net < cut && img.length > 6 ? .3 : 0); };
  const sorted = ms.slice().sort((a, b) => a.ts - b.ts), keep = [];
  for (const m of sorted) { m._s = score(m); const dup = m.sc && keep.find(k => k.sc && Math.abs(k.ts - m.ts) < 600e3 && hamming(k.sc.dh, m.sc.dh) <= 10); if (dup) { if (m._s > dup._s) keep[keep.indexOf(dup)] = m; } else keep.push(m); }
  if (keep.length <= n) return keep;
  const vids = keep.filter(m => m.type === 'video').slice(0, 2);
  // gom theo khoảnh khắc (cách nhau > 2 giờ), lấy đều mỗi nhóm theo điểm
  const groups = []; for (const m of keep) { const g = groups[groups.length - 1]; if (g && m.ts - g[g.length - 1].ts < 2 * 3600e3) g.push(m); else groups.push([m]); }
  const out = new Set(vids); let r = 0; while (out.size < n && r < 50) { for (const g of groups) { const c = g.filter(m => !out.has(m)).sort((a, b) => b._s - a._s)[0]; if (c && out.size < n) out.add(c); } r++; }
  return [...out].sort((a, b) => a.ts - b.ts);
}

// ---------- kịch bản cảnh theo lưới nhịp ----------
// items: [{ id, kind:'image'|'video', blob(), thumb(), w, h, ts, title, place }]
export function storyboard({ items, tpl: tk = 'dienanh', dur = 30, bpm, offset = LEAD, title = '', sub = '', ratio = '9:16', intro = 0 }) {
  const T = TEMPLATES[tk] || TEMPLATES.dienanh, BEAT = 60 / bpm, R = mulberry32(items.length * 31 + dur), sc = [];
  const at = b => offset + b * BEAT; let b = 0;
  const titleBeats = Math.max(4, Math.round(3.4 / BEAT / 2) * 2), endBeats = Math.max(4, Math.round(3.2 / BEAT / 2) * 2);
  const total = Math.max(titleBeats + endBeats + 8, Math.round((dur - offset) / BEAT / 4) * 4);
  if (intro) { const ib = Math.round(intro / BEAT / 4) * 4; sc.push({ kind: 'saban', b0: 0, b1: ib }); b = ib; }
  sc.push({ kind: 'title', b0: b, b1: b + titleBeats, item: items[0] }); b += titleBeats;
  const bodyEnd = total - endBeats, photos = items.slice(), body = bodyEnd - b; let i = 0, k = 0;
  // ít ảnh thì kéo dài mỗi cảnh (bội số của ô nhịp) cho đủ thời lượng; Nhịp nhanh thì quay vòng ảnh với khung Ken Burns khác
  const base = T.arc ? 0 : Math.max(T.beats, Math.floor(body / Math.max(1, photos.length) / T.beats) * T.beats), spare = T.arc ? 0 : body - base * photos.length;
  let heroLeft = Math.max(0, Math.floor(spare / Math.max(1, T.beats)));
  while (b < bodyEnd && photos.length) {
    const prog = (b - titleBeats) / Math.max(1, body), it = photos[i % photos.length];
    let len = T.arc ? (prog < .2 ? 4 : prog < .55 ? 2 : prog < .85 ? 1 : 2) : base;
    if (!T.arc && heroLeft > 0 && (it._s || 0) > .6 && i < photos.length) { len += T.beats; heroLeft--; }
    if (it.kind === 'video') len = Math.max(len, T.arc ? 2 : 4);
    if (!T.arc && i === photos.length - 1) len = Math.max(len, bodyEnd - b); // ảnh cuối lấp phần còn lại
    len = Math.min(len, bodyEnd - b); if (len <= 0) break;
    const zin = k % 2 === 0, s0 = zin ? T.kb[0] : T.kb[1], s1 = zin ? T.kb[1] : T.kb[0], dx = (R() - .5) * .06, dy = (R() - .5) * .06;
    sc.push({ kind: it.kind === 'video' ? 'clip' : 'photo', b0: b, b1: b + len, item: it, kb: { s0, s1, x0: .5 - dx, y0: .5 - dy, x1: .5 + dx, y1: .5 + dy }, rot: T.mode === 2 ? (R() - .5) * .12 : 0, off: T.mode === 2 ? [(R() - .5) * .04, (R() - .5) * .03] : [0, 0], newDay: !k || (i < photos.length && new Date(it.ts).toDateString() !== new Date(photos[(i - 1 + photos.length) % photos.length].ts).toDateString()) });
    b += len; i++; k++;
  }
  sc.push({ kind: 'end', b0: b, b1: b + endBeats, item: items[items.length - 1] }); b += endBeats;
  sc.forEach((s, j) => { s.t0 = at(s.b0); s.t1 = at(s.b1); const nx = sc[j + 1]; if (!nx) return;
    let tr = T.transSeq[j % T.transSeq.length]; if (s.kind === 'title' || nx.kind === 'end') tr = T.arc ? 'flash' : T.tLen ? 'fade' : 'flash'; if (s.kind === 'saban') tr = 'crosszoom';
    if (T.arc && nx.b0 % 8 === 0 && tr === 'cut') tr = 'flash'; if (T.arc && j % 7 === 3) tr = 'whip';
    s.trans = tr === 'cut' ? null : { type: tr, len: tr === 'flash' ? .14 : tr === 'whip' ? .3 : s.kind === 'saban' ? .8 : T.tLen || .5 }; });
  const W = ratio === '16:9' ? 1920 : 1080, H = ratio === '16:9' ? 1080 : 1920;
  return { scenes: sc, dur: at(b) + .3, bpm, beat: BEAT, offset, tpl: tk, T, title, sub, W, H };
}

// ---------- động cơ dựng hình ----------
export function createEngine(canvas, { W, H }) {
  canvas.width = W; canvas.height = H;
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: true }); if (!gl) throw new Error('NO_WEBGL2');
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const prog = fs => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); const U = {}; return { p, u: n => U[n] ?? (U[n] = gl.getUniformLocation(p, n)) }; };
  const P = { photo: prog(FS_PHOTO), trans: prog(FS_TRANS), post: prog(FS_POST) };
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const fbo = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { t, f }; };
  const FA = fbo(), FB = fbo(), FC = fbo();
  const texFrom = (src, mip = true) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); if (mip) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); } else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); return t; };
  const updTex = (t, src, mip = true) => { gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); if (mip) gl.generateMipmap(gl.TEXTURE_2D); };
  const txtC = document.createElement('canvas'); txtC.width = W; txtC.height = H; const tx = txtC.getContext('2d'); const txtT = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, txtT); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, txtC); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const updTxt = () => { gl.bindTexture(gl.TEXTURE_2D, txtT); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, txtC); };
  const drawTo = (f, p, setU) => { gl.bindFramebuffer(gl.FRAMEBUFFER, f ? f.f : null); gl.viewport(0, 0, W, H); gl.useProgram(p.p); setU(p); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
  const bind = (unit, t) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); };
  return { gl, W, H, P, FA, FB, FC, texFrom, updTex, updTxt, txtC, tx, txtT, drawTo, bind, lost: () => gl.isContextLost(), dispose() { gl.getExtension('WEBGL_lose_context')?.loseContext(); } };
}

// ---------- người dựng: nạp ảnh theo cửa sổ, vẽ khung tại t ----------
export function createRenderer(engine, SB, assets) {
  const E = engine, { gl, W, H } = E, outA = W / H, T = SB.T, tex = new Map(), clips = new Map(), avatars = assets.avatars || [];
  const sceneAt = t => { const i = SB.scenes.findIndex(s => t < s.t1); return i < 0 ? SB.scenes.length - 1 : i; };
  const span = s => { const i = SB.scenes.indexOf(s), pv = SB.scenes[i - 1], a = s.t0 - (pv?.trans ? pv.trans.len / 2 : 0), b = s.t1 + (s.trans ? s.trans.len / 2 : 0); return [a, b]; };
  // chuẩn bị texture cho mọi cảnh xuất hiện quanh t (ảnh đã thu nhỏ sẵn ≤ 2048), bỏ texture đã qua
  async function prepare(t, live = false) {
    const need = new Set(); for (const s of SB.scenes) { const [a, b] = span(s); if (t >= a - .6 && t <= b + .1 && s.item) need.add(s); }
    for (const s of need) {
      const id = s.item.id;
      if (s.kind === 'clip' && !clips.has(s) && assets.clip) { try { clips.set(s, await assets.clip(s.item, s, span(s), live)); } catch (e) { clips.set(s, null); } }
      if (!tex.has(id)) { const bmp = await assets.image(s.item); if (bmp) { tex.set(id, { t: E.texFrom(bmp), a: bmp.width / bmp.height, fy: typeof ImageBitmap !== 'undefined' && bmp instanceof ImageBitmap ? 1 : 0 }); bmp.close?.(); } else tex.set(id, null); }
    }
    for (const [id, v] of tex) if (id !== 'saban' && ![...need].some(s => s.item.id === id)) { /* khung bản đồ mở đầu giữ lại cho CrossZoom */ if (v) gl.deleteTexture(v.t); tex.delete(id); }
    for (const [s, c] of clips) if (!need.has(s)) { c?.close?.(); if (c?.tex) gl.deleteTexture(c.tex); clips.delete(s); }
  }
  // vẽ một cảnh vào fbo
  async function scene(s, t, f) {
    const [a, b] = span(s), p = cl((t - a) / (b - a)), e = ease.sine(p), k = s.kb || { s0: 1.04, s1: 1.12, x0: .5, y0: .5, x1: .5, y1: .5 };
    let info = s.item ? tex.get(s.item.id) : null, imgA = info?.a || 1, glt = info?.t, fy = info?.fy || 0;
    if (s.kind === 'saban') { const v = tex.get('saban'); glt = v?.t; imgA = v?.a || outA; fy = 0; }
    if (s.kind === 'clip') { const c = clips.get(s); if (c) { const fr = await c.frame(t); if (fr) { if (!c.tex) c.tex = E.texFrom(fr, false); else E.updTex(c.tex, fr, false); glt = c.tex; imgA = fr.width / fr.height; fy = 0; } } }
    const mode = s.kind === 'title' || s.kind === 'end' ? 1 : s.kind === 'saban' ? 0 : T.mode, cardS = s.kind === 'title' || s.kind === 'end' ? 0 : 1;
    let punch = 1; if (T.punch && s.kind !== 'title' && s.kind !== 'end') { const lt = t - s.t0 + .04; punch = lt < 0 ? 1 : lt < .12 ? .92 + .26 * ease.p4out(lt / .12) : lt < .42 ? 1.18 - .18 * ease.sine((lt - .12) / .3) : 1; }
    E.drawTo(f, E.P.photo, P => { E.bind(0, glt || null); gl.uniform1i(P.u('tImg'), 0); gl.uniform1f(P.u('imgA'), imgA); gl.uniform1f(P.u('outA'), outA); gl.uniform1f(P.u('mode'), mode); gl.uniform1f(P.u('rot'), (s.rot || 0) * (1 - .4 * e)); gl.uniform1f(P.u('cardS'), cardS * (mode === 2 ? .94 + .06 * ease.outBack(cl((t - a) / .7)) : 1)); gl.uniform1f(P.u('dim'), mode === 1 && !cardS ? .55 : .72); gl.uniform1f(P.u('punch'), punch); gl.uniform1f(P.u('fy'), fy); gl.uniform3f(P.u('kb'), s.kind === 'saban' ? 1 : mode === 0 ? k.s0 + (k.s1 - k.s0) * e : 1 + .05 * e, (mode === 0 ? k.x0 + (k.x1 - k.x0) * e : .5), (mode === 0 ? k.y0 + (k.y1 - k.y0) * e : .5)); gl.uniform2f(P.u('off'), ...(s.off || [0, 0])); });
  }
  // ---------- chữ (canvas 2D, chỉ tải lên GPU khi khác khung trước) ----------
  let lastKey = '';
  const F = (w, px) => `${w} ${Math.round(px)}px Quicksand, system-ui, sans-serif`;
  const seg = s => { try { return [...new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(s.normalize('NFC'))].map(x => x.segment); } catch (e) { return [...s]; } };
  function wrap(x, text, maxW) { const ws = text.split(/\s+/), lines = []; let cur = ''; for (const w of ws) { const t2 = cur ? cur + ' ' + w : w; if (x.measureText(t2).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t2; } if (cur) lines.push(cur); return lines; }
  function shadowText(x, s, X, Y, col = '#fff') { x.lineJoin = 'round'; x.strokeStyle = 'rgba(30,10,30,.55)'; x.lineWidth = Math.max(4, parseInt(x.font.split(' ')[1]) * .1); x.strokeText(s, X, Y); x.fillStyle = col; x.fillText(s, X, Y); }
  const a0 = sc => span(sc)[0];
  function texts(t) {
    const x = E.tx, s = SB.scenes[sceneAt(t)], key = [], U = Math.min(W, H) / 1080, safeT = H * .14, safeB = H * .2;
    const ops = [];
    for (const sc of SB.scenes) {
      const [a, b] = span(sc); if (t < a || t > b) continue; const lt = t - sc.t0, out = cl((sc.t1 - t) / .3);
      if (sc.kind === 'title') {
        const mask = lt < 0 ? 0 : 1; key.push('T', Math.round(lt * 30));
        ops.push(() => { x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.font = F(800, 96 * U); const lines = wrap(x, SB.title, W * .84), lh = 112 * U, y0 = H * .44 - (lines.length - 1) * lh / 2;
          if (SB.tpl === 'nhanh') { lines.forEach((ln, li) => { const ws = ln.split(' '); let wx = W / 2 - x.measureText(ln).width / 2; ws.forEach((w, wi) => { const st = lt - .1 - (li * ws.length + wi) * .06, sp = spring(st), ww = x.measureText(w + ' ').width; x.save(); x.globalAlpha = cl(st * 6) * out; x.translate(wx + ww / 2, y0 + li * lh); x.scale(sp, sp); x.textAlign = 'center'; shadowText(x, w, 0, 0); x.restore(); wx += ww; }); }); }
          else lines.forEach((ln, li) => { const st = cl((lt - .15 - li * .08) / .6), e = ease.outExpo(st); x.save(); x.beginPath(); x.rect(0, y0 + li * lh - lh * .95, W, lh * 1.25); x.clip(); x.globalAlpha = out; shadowText(x, ln, W / 2, y0 + li * lh + (1 - e) * lh * 1.1); x.restore(); });
          if (SB.sub) { const st = cl((lt - .7) / .5); x.globalAlpha = ease.sine(st) * out; x.font = F(700, 44 * U); shadowText(x, SB.sub, W / 2, y0 + lines.length * lh + 10 * U, '#ffe1ee'); x.globalAlpha = 1; }
          const n = avatars.length; if (n) { const sz = (n > 5 ? 120 : 150) * U, gap = sz * .92, x0 = W / 2 - (n - 1) * gap / 2, yy = H * .66; avatars.forEach((im, i) => { const st = lt - .9 - i * .12, sp = spring(st); if (st <= 0) return; x.save(); x.globalAlpha = out; x.translate(x0 + i * gap, yy); x.scale(sp, sp); x.drawImage(im, -sz / 2, -sz * .66, sz, sz * (im.height / im.width)); x.restore(); }); }
        });
      } else if (sc.kind === 'saban') {
        key.push('S', Math.round(lt * 30)); const o = Math.min(ease.sine(cl((lt - .4) / .6)), cl((sc.t1 - t) / .5));
        ops.push(() => { x.textAlign = 'center'; x.globalAlpha = o; x.font = F(800, 64 * U); shadowText(x, SB.title, W / 2, safeT + 60 * U); x.font = F(700, 38 * U); if (SB.sub) shadowText(x, SB.sub, W / 2, safeT + 116 * U, '#ffe1ee'); x.globalAlpha = 1; });
      } else if (sc.kind === 'end') {
        key.push('E', Math.round(lt * 30));
        ops.push(() => { const st = cl(lt / .7), e = ease.outExpo(st); x.textAlign = 'center'; x.globalAlpha = e; x.font = F(800, 74 * U); shadowText(x, 'Hành Trình Của Bạn', W / 2, H * .47 + (1 - e) * 30 * U, '#fff');
          x.font = F(700, 40 * U); x.globalAlpha = ease.sine(cl((lt - .4) / .6)); shadowText(x, SB.title, W / 2, H * .47 + 70 * U, '#ffd9ec'); if (SB.sub) shadowText(x, SB.sub, W / 2, H * .47 + 124 * U, '#ffe9c4');
          x.font = F(700, 64 * U); x.globalAlpha = ease.sine(cl((lt - .7) / .5)); x.fillText('✨', W / 2, H * .47 - 110 * U); x.globalAlpha = 1; });
      } else if ((sc.kind === 'photo' || sc.kind === 'clip') && sc.newDay && sc.item) {
        const st = cl(lt / .5), o = Math.min(ease.sine(st), cl((sc.t1 - t) / .4)); if (o <= .01) continue; key.push('D', SB.scenes.indexOf(sc), Math.round(o * 30));
        ops.push(() => { const d = new Date(sc.item.ts), cap = sc.item.approx ? sc.item.approxTxt : `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`, pl = sc.item.place || ''; x.globalAlpha = o; x.textAlign = 'left';
          if (T.mode === 2) { // chữ viết trên viền dưới dày của polaroid
            const a = tex.get(sc.item.id)?.a || .75, cw = 1.114, chh = 1 / a + .354, w = Math.min(outA * .8 / cw, .64 / chh), yo = ((.297 - .057) * w / 2 - w / a / 2 - w * chh / 2) / 2 + (sc.off?.[1] || 0);
            x.save(); x.translate(W * (.5 + (sc.off?.[0] || 0) / outA), H * (.5 - yo)); x.rotate(-(sc.rot || 0) * (1 - .4 * ease.sine(cl((t - a0(sc)) / (sc.t1 - a0(sc)))))); x.font = F(700, Math.min(44, 30 + w * 30) * U); x.fillStyle = '#5a4636'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText([cap, pl].filter(Boolean).join(' · '), 0, 0, W * w * .9); x.restore(); }
          else { x.font = F(800, 52 * U); shadowText(x, cap, 64 * U, H - safeB - (pl ? 60 : 0) * U); if (pl) { x.font = F(700, 38 * U); shadowText(x, '📍 ' + pl, 64 * U, H - safeB, '#ffe9c4'); } }
          x.globalAlpha = 1; });
      }
    }
    const k2 = key.join(',');
    if (k2 !== lastKey) { lastKey = k2; x.clearRect(0, 0, W, H); for (const f of ops) f(); E.updTxt(); }
    return k2;
  }
  // ---------- vẽ khung tại t (thời gian tuyệt đối của video) ----------
  async function drawAt(t, frame = 0) {
    const i = Math.max(0, sceneAt(t)), s = SB.scenes[i] || SB.scenes[SB.scenes.length - 1], pv = SB.scenes[i - 1], G = T.grade;
    let tr = null; if (s.trans && t > s.t1 - s.trans.len / 2) tr = { a: s, b: SB.scenes[i + 1], p: (t - (s.t1 - s.trans.len / 2)) / s.trans.len, ty: s.trans.type }; else if (pv?.trans && t < s.t0 + pv.trans.len / 2) tr = { a: pv, b: s, p: (t - (s.t0 - pv.trans.len / 2)) / pv.trans.len, ty: pv.trans.type };
    if (s.kind === 'saban' && assets.saban) { const c = await assets.saban(t - s.t0, s.t1 - s.t0); if (c) { if (!tex.has('saban')) tex.set('saban', { t: E.texFrom(c, false), a: c.width / c.height }); else E.updTex(tex.get('saban').t, c, false); } }
    if (tr && tr.b) { await scene(tr.a, t, E.FA); await scene(tr.b, t, E.FB); E.drawTo(E.FC, E.P.trans, P => { E.bind(0, E.FA.t); E.bind(1, E.FB.t); gl.uniform1i(P.u('tA'), 0); gl.uniform1i(P.u('tB'), 1); gl.uniform1f(P.u('prog'), cl(tr.p)); gl.uniform1f(P.u('typ'), TRANS[tr.ty] ?? 0); }); }
    else await scene(s, t, E.FC);
    texts(t);
    const fadeIn = cl(1 - t / .5), fadeOut = cl((t - (SB.dur - .9)) / .7), flash = 0, leak = T.leak ? t * .18 : 0;
    E.drawTo(null, E.P.post, P => { E.bind(0, E.FC.t); E.bind(1, E.txtT); gl.uniform1i(P.u('tSrc'), 0); gl.uniform1i(P.u('tTxt'), 1); gl.uniform1f(P.u('frame'), frame); gl.uniform1f(P.u('grain'), G.grain); gl.uniform1f(P.u('vig'), G.vig); gl.uniform1f(P.u('sat'), G.sat); gl.uniform1f(P.u('warm'), G.warm); gl.uniform1f(P.u('lift'), G.lift); gl.uniform1f(P.u('fade'), Math.max(fadeIn, fadeOut)); gl.uniform1f(P.u('flash'), flash); gl.uniform1f(P.u('letter'), SB.tpl === 'dienanh' && W > H ? .06 * ease.outExpo(cl(t / 1.2)) : 0); gl.uniform1f(P.u('outA'), outA); gl.uniform1f(P.u('leak'), leak); gl.uniform2f(P.u('res'), W, H); });
  }
  return { drawAt, prepare, sceneAt, lost: () => E.lost(), dispose() { for (const v of tex.values()) if (v) gl.deleteTexture(v.t); tex.clear(); for (const c of clips.values()) c?.close?.(); clips.clear(); } };
}

// ---------- tài nguyên: ảnh thu nhỏ ≤ 2048, khung video bằng mediabunny (dự phòng: ảnh đại diện) ----------
export function makeAssets({ getBlob, getThumb, avatars, MB, maxSide = 2048 }) {
  const small = new Map();
  async function image(it) {
    if (small.has(it.id)) return createImageBitmap(small.get(it.id));
    let src = null; try { const b = it.kind === 'image' && !it.heic ? await getBlob(it) : null; if (b) src = await createImageBitmap(b, { imageOrientation: 'from-image' }); } catch (e) { src = null; }
    if (!src) { const t = await getThumb(it); if (!t) return null; src = await createImageBitmap(t); }
    const k = Math.min(1, maxSide / Math.max(src.width, src.height)); if (k >= .999) { const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0); const b = await new Promise(r => c.toBlob(r, 'image/jpeg', .9)); small.set(it.id, b); c.width = c.height = 1; return src; }
    const c = document.createElement('canvas'); c.width = Math.round(src.width * k); c.height = Math.round(src.height * k); const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, c.width, c.height); src.close?.();
    const b = await new Promise(r => c.toBlob(r, 'image/jpeg', .9)); small.set(it.id, b); c.width = c.height = 1; return createImageBitmap(b);
  }
  async function clip(it, s, [a, b], live) {
    if (!MB) return null; const blob = await getBlob(it); if (!blob) return null;
    const input = new MB.Input({ source: new MB.BlobSource(blob), formats: MB.ALL_FORMATS }), track = await input.getPrimaryVideoTrack(); if (!track || !(await track.canDecode())) return null;
    const vd = await track.computeDuration?.() || it.dur || 4, len = b - a, st = clipStart(vd, len), w = Math.min(1080, track.displayWidth || 1080), sink = new MB.CanvasSink(track, { width: Math.round(w / 2) * 2, poolSize: 2 });
    let iter = null, last = null, lastT = -1;
    return { async frame(t) { const vt = Math.min(vd - .05, st + Math.max(0, t - a));
        if (live) { if (Math.abs(vt - lastT) > .03) { lastT = vt; sink.getCanvas(vt).then(r => { if (r) last = r.canvas; }); } return last; }
        if (!iter) { const fps = 30, ts = []; for (let k = 0; a + k / fps <= b + .05; k++) ts.push(Math.min(vd - .05, st + k / fps)); iter = sink.canvasesAtTimestamps(ts)[Symbol.asyncIterator](); }
        const r = await iter.next(); if (r.value) last = r.value.canvas; return last; },
      close() { iter?.return?.(); input.dispose?.(); } };
  }
  return { image, clip, avatars };
}

// đoạn clip được dùng: lấy quãng giữa video (cùng một công thức cho hình và tiếng gốc)
export const clipStart = (vd, len) => Math.max(0, Math.min(vd - len, vd / 2 - len / 2));
// khoảng thời gian cảnh hiện trên video (tính cả nửa chuyển cảnh hai đầu) — khớp span() của người dựng
export function sceneSpan(SB, s) { const i = SB.scenes.indexOf(s), pv = SB.scenes[i - 1]; return [s.t0 - (pv?.trans ? pv.trans.len / 2 : 0), s.t1 + (s.trans ? s.trans.len / 2 : 0)]; }
// TIẾNG GỐC của một clip: giải mã đúng đoạn [st, st+len] bằng mediabunny; máy không giải mã được thì thử decodeAudioData (tệp ≤ 80 MB)
export async function clipAudio(blob, len, { MB, dur } = {}) {
  if (!blob) return null; let vd = dur || 0;
  if (MB) { try {
    const input = new MB.Input({ source: new MB.BlobSource(blob), formats: MB.ALL_FORMATS });
    try {
      const vt = await input.getPrimaryVideoTrack(); vd = (await vt?.computeDuration?.()) || vd || (await input.computeDuration());
      const at = await input.getPrimaryAudioTrack(); if (!at) return null;
      if (await at.canDecode()) {
        const st = clipStart(vd, len), sink = new MB.AudioBufferSink(at); let out = null;
        for await (const { buffer, timestamp } of sink.buffers(st, st + len)) {
          if (!out) out = new AudioBuffer({ length: Math.max(1, Math.ceil(len * buffer.sampleRate)), sampleRate: buffer.sampleRate, numberOfChannels: Math.min(2, buffer.numberOfChannels) });
          const off = Math.round((timestamp - st) * buffer.sampleRate), from = Math.max(0, -off), n = Math.min(buffer.length - from, out.length - Math.max(0, off)); if (n <= 0) continue;
          for (let c = 0; c < out.numberOfChannels; c++) out.copyToChannel(buffer.getChannelData(Math.min(c, buffer.numberOfChannels - 1)).subarray(from, from + n), c, Math.max(0, off));
        }
        if (out) return out;
      }
    } finally { input.dispose?.(); }
  } catch (e) { console.warn('tiếng gốc (mediabunny)', e); } }
  if (blob.size > 80e6) return null;
  try {
    const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext, dc = new AC(2, 48000, 48000), src = await dc.decodeAudioData(await blob.arrayBuffer());
    vd = vd || src.duration; const st = clipStart(vd, len), sr = src.sampleRate, a = Math.floor(st * sr), n = Math.min(src.length - a, Math.ceil(len * sr)); if (n <= 0) return null;
    const out = new AudioBuffer({ length: n, sampleRate: sr, numberOfChannels: Math.min(2, src.numberOfChannels) });
    for (let c = 0; c < out.numberOfChannels; c++) out.copyToChannel(src.getChannelData(c).subarray(a, a + n), c);
    return out;
  } catch (e) { return null; }
}

// ---------- xuất MP4 ----------
const isWebKit = () => /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|Android|CriOS|Edg/.test(navigator.userAgent);
const sliceBuf = (buf, t0, len) => { const sr = buf.sampleRate, a = Math.floor(t0 * sr), n = Math.max(0, Math.min(buf.length - a, Math.floor(len * sr))); if (!n) return null; const o = new AudioBuffer({ length: n, sampleRate: sr, numberOfChannels: buf.numberOfChannels }); for (let c = 0; c < buf.numberOfChannels; c++) o.copyToChannel(buf.getChannelData(c).subarray(a, a + n), c); return o; };
export async function exportMp4({ canvas, renderer, SB, audio, fps = 30, onProg, signal, bitrate }) {
  const MB = await import('./lib/mediabunny.min.mjs');
  if (!window.VideoEncoder) throw Object.assign(new Error('Máy này chưa hỗ trợ mã hoá video (WebCodecs)'), { code: 'NO_WEBCODECS' });
  if (!(await MB.canEncodeAudio('aac'))) { const enc = await import('./lib/mediabunny-aac-encoder.min.mjs'); enc.registerAacEncoder(); }
  const W = canvas.width, H = canvas.height, br = bitrate || (W * H >= 1920 * 1080 ? 8e6 : 5e6);
  if (!(await MB.getFirstEncodableVideoCodec(['avc'], { width: W, height: H, bitrate: br }))) throw Object.assign(new Error('Máy không mã hoá được H.264 ở cỡ này'), { code: 'NO_AVC' });
  const out = new MB.Output({ format: new MB.Mp4OutputFormat({ fastStart: 'in-memory' }), target: new MB.BufferTarget() });
  const vid = new MB.CanvasSource(canvas, { codec: 'avc', bitrate: br, keyFrameInterval: 2, ...(isWebKit() ? { latencyMode: 'realtime' } : {}) });
  const aud = new MB.AudioBufferSource({ codec: 'aac', bitrate: 160e3 });
  out.addVideoTrack(vid, { frameRate: fps }); if (audio) out.addAudioTrack(aud);
  await out.start();
  const N = Math.round(SB.dur * fps), CH = 10, t0 = performance.now(); let stalls = 0;
  const guard = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('Bộ mã hoá không phản hồi (' + what + ')'), { code: 'STALL' })), ms))]);
  try {
    for (let i = 0; i < N; i++) {
      if (signal?.aborted) throw Object.assign(new Error('Đã huỷ'), { code: 'ABORT' });
      while (document.hidden) { await new Promise(r => setTimeout(r, 300)); if (signal?.aborted) break; }
      if (renderer.lost?.()) throw Object.assign(new Error('Mất ngữ cảnh đồ hoạ'), { code: 'LOST' });
      const t = i / fps;
      if (audio && i % (CH * fps) === 0) { const ab = sliceBuf(audio, t, CH); if (ab) await guard(aud.add(ab), 15000, 'âm thanh'); }
      await renderer.prepare(t);
      await renderer.drawAt(t, i);
      await guard(vid.add(t, 1 / fps), i < 3 ? 8000 : 5000, 'khung ' + i);
      if (i % 6 === 0) onProg?.({ p: i / N, i, N, fpsOut: (i + 1) / ((performance.now() - t0) / 1000) });
    }
    vid.close(); if (audio) aud.close(); await guard(out.finalize(), 30000, 'đóng gói');
  } catch (e) { try { await out.cancel(); } catch (er) { } throw e; }
  onProg?.({ p: 1, i: N, N, fpsOut: N / ((performance.now() - t0) / 1000) });
  return { file: new File([out.target.buffer], 'video-ky-niem.mp4', { type: 'video/mp4' }), ms: performance.now() - t0, stalls };
}
// dự phòng cuối: ghi thời gian thực từ canvas (không tất định, giữ màn hình mở)
export async function recordFallback({ canvas, renderer, SB, audio, onProg, signal }) {
  const ac = new AudioContext(), dst = ac.createMediaStreamDestination(); let src = null; if (audio) { src = ac.createBufferSource(); src.buffer = audio; src.connect(dst); }
  const stream = canvas.captureStream(30); dst.stream.getAudioTracks().forEach(tk => stream.addTrack(tk));
  const mime = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)) || '';
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 6e6 } : {}), chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  await renderer.prepare(0); await renderer.drawAt(0, 0); rec.start(500); const st = ac.currentTime + .05; src?.start(st);
  await new Promise(res => { const f = async () => { const t = ac.currentTime - st; if (t >= SB.dur || signal?.aborted) { res(); return; } await renderer.prepare(t, true); await renderer.drawAt(Math.max(0, t), Math.round(t * 30)); onProg?.({ p: t / SB.dur }); requestAnimationFrame(f); }; requestAnimationFrame(f); });
  rec.stop(); await new Promise(r => rec.onstop = r); ac.close(); const type = (rec.mimeType || 'video/mp4').split(';')[0];
  return { file: new File(chunks, 'video-ky-niem.' + (type.includes('webm') ? 'webm' : 'mp4'), { type }) };
}
export { renderMusic, userMusic, mixClipAudio, spring, ease };
