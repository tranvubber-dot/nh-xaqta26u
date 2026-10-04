// Hành Trình Của Bạn — "Nhật ký truyện tranh": dựng trang truyện từ ảnh thật bằng Canvas 2D,
// trình chỉnh trang, trình xem lật trang, AI viết lời (tuỳ chọn, dùng khoá Gemini riêng của người dùng).
// Ảnh không bao giờ rời máy trừ khi người dùng tự bấm "✨ AI viết lời".

export const PW = 1240, PH = 1754, PM = 50, GUT = 22;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pad2 = n => String(n).padStart(2, '0');

// ---------- Ngẫu nhiên có hạt giống (để ghép lời lặp lại được) ----------
export function rng(seed) {
  let a = 0; for (const ch of String(seed)) a = (a * 31 + ch.charCodeAt(0)) | 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------- Bố cục khung xéo ----------
// mỗi mẫu: các hàng (hệ số cao) và các cột trong hàng (hệ số rộng)
export const TEMPLATES = {
  1: [{ id: 'T1', rows: [[1, [1]]] }],
  2: [{ id: 'T2a', rows: [[1, [1]], [1, [1]]] }, { id: 'T2b', rows: [[1, [1, 1]]] }],
  3: [{ id: 'T3a', rows: [[1.1, [1]], [1, [1, 1]]] }, { id: 'T3b', rows: [[1, [1, 1]], [1.1, [1]]] }, { id: 'T3c', rows: [[1, [1]], [1, [1]], [1, [1]]] }],
  4: [{ id: 'T4a', rows: [[1, [1]], [1.3, [1, 1]], [1, [1]]] }, { id: 'T4b', rows: [[1.2, [1.4, 1]], [1.2, [1, 1.4]]] }, { id: 'T4c', rows: [[1.15, [1]], [1, [1, 1, 1]]] }, { id: 'T4d', rows: [[1, [1, 1, 1]], [1.2, [1]]] }],
  5: [{ id: 'T5a', rows: [[1.05, [1]], [1.2, [1.3, 1]], [1, [.8, 1.4]]] }, { id: 'T5b', rows: [[1, [1, 1]], [1.25, [1]], [1, [1, 1]]] }, { id: 'T5c', rows: [[1.2, [1, 1, 1]], [1, [1.4, 1]]] }, { id: 'T5d', rows: [[1, [1.4, 1]], [1.2, [1, 1, 1]]] }],
  6: [{ id: 'T6a', rows: [[1, [1, 1]], [1, [1.3, 1]], [1, [1, 1.3]]] }, { id: 'T6b', rows: [[1, [1]], [1.1, [1, 1, 1]], [1, [1.4, 1]]] }, { id: 'T6c', rows: [[1, [1, 1, 1]], [1, [1, 1, 1]]] }]
};
const allTpl = Object.values(TEMPLATES).flat();
export const tplById = id => allTpl.find(t => t.id === id) || TEMPLATES[1][0];
export const contentTop = pi => pi === 0 ? 190 : 122;
// trả về danh sách khung: { poly:[[x,y]×4], bx,by,bw,bh }
export function pageGeom(page, pi) {
  const tpl = tplById(page.tpl), R = rng((page.seed || 1) + ':' + tpl.id);
  const X0 = PM, X1 = PW - PM, Y0 = contentTop(pi), Y1 = PH - PM - 18, Wc = X1 - X0, Hc = Y1 - Y0, cx = (X0 + X1) / 2;
  const hs = tpl.rows.map(r => r[0]), hsum = hs.reduce((a, b) => a + b, 0);
  // đường ngang (biên hàng): y = Y + s*(x-cx)/Wc
  const rowsY = [{ Y: Y0, s: 0 }]; let acc = Y0;
  hs.forEach((h, i) => { acc += h / hsum * Hc; rowsY.push({ Y: acc, s: i === hs.length - 1 ? 0 : (R() * 2 - 1) * .05 * Hc }); });
  const out = [];
  tpl.rows.forEach((row, ri) => {
    const top = rowsY[ri], bot = rowsY[ri + 1], ws = row[1], wsum = ws.reduce((a, b) => a + b, 0);
    const ym = (top.Y + bot.Y) / 2, rh = bot.Y - top.Y;
    const cols = [{ X: X0, t: 0 }]; let ax = X0;
    ws.forEach((w, j) => { ax += w / wsum * Wc; cols.push({ X: ax, t: j === ws.length - 1 ? 0 : (R() * 2 - 1) * .09 * rh }); });
    for (let j = 0; j < ws.length; j++) {
      const L = cols[j], Rt = cols[j + 1];
      const gT = ri > 0 ? GUT / 2 : 0, gB = ri < tpl.rows.length - 1 ? GUT / 2 : 0, gL = j > 0 ? GUT / 2 : 0, gR = j < ws.length - 1 ? GUT / 2 : 0;
      const hit = (rowL, off, colL, offx) => { // giao đường ngang và đường dọc
        let x = colL.X + offx, y = rowL.Y + off;
        for (let k = 0; k < 4; k++) { y = rowL.Y + off + rowL.s * (x - cx) / Wc; x = colL.X + offx + colL.t * (y - ym) / rh; }
        return [x, y];
      };
      const poly = [hit(top, gT, L, gL), hit(top, gT, Rt, -gR), hit(bot, -gB, Rt, -gR), hit(bot, -gB, L, gL)];
      const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]);
      const bx = Math.min(...xs), by = Math.min(...ys);
      out.push({ poly, bx, by, bw: Math.max(...xs) - bx, bh: Math.max(...ys) - by });
    }
  });
  return out;
}
// chọn mẫu hợp hướng ảnh nhất (ảnh ngang → khung ngang to, ảnh dọc → khung đứng, cận mặt → khung nhỏ)
export function pickTemplate(infos, prevId, R, avoid) {
  const n = clamp(infos.length, 1, 6), cands = TEMPLATES[n];
  let best = null, bs = 1e9;
  for (const t of cands) {
    if (avoid && t.id === avoid && cands.length > 1) continue;
    const geo = pageGeom({ tpl: t.id, seed: 1 }, 1);
    let sc = 0;
    geo.forEach((g, i) => {
      const inf = infos[i] || { a: 1.33 }, sa = g.bw / g.bh;
      sc += Math.abs(Math.log(sa) - Math.log(inf.a));
      const area = g.bw * g.bh / (1140 * 1500);
      if (inf.close) sc += area > .22 ? .6 : 0; else if (inf.a > 1.2) sc += area < .12 ? .5 : 0;
    });
    sc += (t.id === prevId ? .9 : 0) + R() * .35;
    if (sc < bs) { bs = sc; best = t; }
  }
  return best.id;
}
// chia N ảnh thành các trang 4–6 khung
export function splitPages(n) {
  if (n <= 6) return [n];
  const k = Math.ceil(n / 5.5), base = Math.floor(n / k), extra = n % k, out = [];
  for (let i = 0; i < k; i++) out.push(base + (i < extra ? 1 : 0));
  return out;
}

// ---------- Kho lời mẫu ----------
export const session = h => h < 5 ? 'khuya' : h < 11 ? 'sang' : h < 14 ? 'trua' : h < 18 ? 'chieu' : 'toi';
export function timeVN(ts) {
  const d = new Date(ts), h = d.getHours(), m = d.getMinutes(), s = session(h);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const w = { khuya: 'đêm', sang: 'sáng', trua: 'trưa', chieu: 'chiều', toi: 'tối' }[s];
  return `${h12}:${pad2(m)} ${h === 12 ? 'trưa' : w}`;
}
export const hm = ts => { const d = new Date(ts); return `${d.getHours()}:${pad2(d.getMinutes())}`; };
export function ageGroup(months) {
  if (months == null) return 'chung';
  if (months < 0) return 'bung';
  if (months < 3) return 'sosinh';
  if (months < 8) return 'lay';
  if (months < 12) return 'bo';
  if (months < 24) return 'di';
  if (months < 48) return 'nho';
  return 'lon';
}
const BANK = {
  cap: {
    sang: ['Chào buổi sáng!', 'Một ngày mới bắt đầu…', 'Nắng sớm dễ chịu ghê', 'Sáng nay nhà mình…', 'Dậy rồi nè!', 'Bình minh lấp lánh'],
    trua: ['Đến giờ ăn trưa rồi!', 'Trưa nắng chang chang', 'Ăn no rồi ngủ thôi', 'Giữa trưa yên ả'],
    chieu: ['Buổi chiều vui vẻ', 'Chiều nay đi chơi nào', 'Gió chiều mát rượi', 'Nắng chiều vàng ươm'],
    toi: ['Tối rồi, cả nhà quây quần', 'Đèn đã lên rồi', 'Sắp đến giờ đi ngủ…', 'Bữa tối thơm phức'],
    khuya: ['Cả nhà ngủ say…', 'Đêm khuya yên tĩnh', 'Trăng lên cao rồi']
  },
  next: ['Rồi bỗng nhiên…', 'Ngay sau đó…', 'Một lúc sau…', 'Và thế là…', 'Không ai ngờ…', 'Chưa hết đâu nha…', 'Thế rồi…'],
  say: {
    bung: ['Con đang lớn từng ngày nè!', 'Mẹ ơi, con đạp nè!', 'Sắp gặp nhau rồi!', 'Trong này ấm ghê!'],
    sosinh: ['Oe oe!', 'Con buồn ngủ quá…', 'Ôm con một cái nào!', 'Ti sữa đâu rồi ạ?', 'Bé xíu xiu mà đáng yêu ghê!', 'Ngáp một cái thật to!'],
    lay: ['Con lẫy được rồi nè!', 'Ê a… ê a…', 'Cái gì kia nhỉ?', 'Cho con cầm với!', 'Hihi, nhột quá!', 'Con ngồi vững chưa?'],
    bo: ['Bò nhanh như tên lửa!', 'Con bò tới đây nè!', 'Ba ba! Ma ma!', 'Đồ chơi kia là của con!', 'Bắt được rồi!'],
    di: ['Con tự đi được rồi!', 'Chờ con với!', 'Cái này là gì vậy?', 'Con muốn nữa!', 'Không chịu đâu!', 'Mẹ ơi, bế con!'],
    nho: ['Mẹ ơi xem con này!', 'Con làm được rồi!', 'Con là siêu nhân!', 'Thêm lần nữa nha!', 'Vui quá đi mất!', 'Con không sợ đâu!'],
    lon: ['Hôm nay vui ghê!', 'Con kể mẹ nghe nè…', 'Để con tự làm!', 'Con thương mẹ nhất!', 'Đi chơi nữa đi bố ơi!', 'Chụp con đẹp nha!'],
    chung: ['Cả nhà ơi, ra đây mà xem!', 'Cười cái nào!', 'Ôi đáng yêu quá trời!', 'Ai mà cute thế này?', 'Lưu lại khoảnh khắc này nè!', 'Hôm nay trời đẹp quá trời!', '{Con} của mẹ đáng yêu ghê!', 'Ai là {be} của nhà mình nè?']
  },
  meal: ['Ngon quá đi!', 'Thêm một miếng nữa!', 'Măm măm!', 'Con ăn hết rồi nè!'],
  sleep: ['Ngủ ngon nha con…', 'Mơ đẹp nhé!', 'Suỵt… bé đang ngủ'],
  shout: ['Xin chàooo!', 'Yeahhh!', 'Oaaa!', 'Tuyệt quá!', 'Cố lên!', 'Đi thôiii!', 'Wow!'],
  think: ['Hmm… vui không ta?', 'Mình thử xem sao…', 'Mẹ có thấy không nhỉ?', 'Ngủ thêm chút nữa…', 'Cái gì đây ta?', 'Mình đẹp trai quá ta…'],
  sfx: {
    chung: ['HÍ HÍ!', 'HAHA!', 'TÈN TEN!', 'CHỤT!', 'VÈO~', 'BỤP!', 'OA!', 'TING!'],
    sosinh: ['OE OE~', 'CHÙN CHỤT', 'ZZZ…'], lay: ['Ê A~', 'HÍ HÍ!'], bo: ['BỊCH BỊCH', 'LON TON~'], di: ['LẠCH BẠCH', 'LON TON~'],
    nho: ['VÙ VÙ!', 'BÙM!'], lon: ['VÚT!', 'XOẸT!'], bung: ['THÌNH THỊCH', 'ĐẠP!'],
    an: ['MOAM MOAM!', 'NHÓP NHÉP'], dem: ['ZZZ…']
  },
  colors: ['#ff7eb3', '#5fc3ff', '#ffc93c', '#4fd1a5', '#ff9a3c', '#b38bff']
};
export const titleFor = name => `Nhật ký của ${name}`;
// xưng hô theo giới tính: {con} con trai/con gái/con, {be} chàng trai nhỏ/công chúa nhỏ/bé yêu
export const gtok = (t, g) => t.replace(/\{Con\}/g, g === 'm' ? 'Con trai' : g === 'f' ? 'Con gái' : 'Con').replace(/\{con\}/g, g === 'm' ? 'con trai' : g === 'f' ? 'con gái' : 'con').replace(/\{be\}/g, g === 'm' ? 'chàng trai nhỏ' : g === 'f' ? 'công chúa nhỏ' : 'bé yêu');
function deck(R, arr) { // rút không lặp
  const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  let k = 0; return () => a[k++ % a.length];
}
// ghép lời tự động cho mọi khung của nhật ký
export function autoText(d, ctx) {
  const R = rng(d.id + ':' + (d.roll || 0));
  const g = ageGroup(ctx.months), dk = {};
  const pick = (key, arr) => (dk[key] ||= deck(R, arr))();
  let prevSes = null, flat = 0;
  d.pages.forEach((pg, pi) => {
    let shouts = 0, sfxN = 0, fxN = 0, spk = 0;
    pg.panels.forEach((p, i) => {
      const ts = ctx.ts(p.mid) || 0, h = new Date(ts).getHours(), ses = session(h);
      p.caption = null; p.bubbles = []; p.sfx = []; p.fx = null;
      if (i === 0 || ses !== prevSes) p.caption = { text: `${timeVN(ts)} · ${pick('cap' + ses, BANK.cap[ses])}`, u: .035, v: .045, dark: false };
      else if (R() < .28) p.caption = { text: pick('next', BANK.next), u: .035, v: .86, dark: true };
      prevSes = ses;
      const r = R(), close = ctx.close?.(p.mid);
      const meal = ses === 'trua' || (ses === 'toi' && h < 20), night = ses === 'khuya' || h >= 21;
      const side = flat % 2 ? .28 : .72; flat++;
      if (r < .16 && shouts < 1) { p.bubbles.push(mkBubble(pick('shout', BANK.shout), 'shout', side, R)); shouts++; p.fx = 'focus'; }
      else if (r < .3) p.bubbles.push(mkBubble(night ? pick('sleep', BANK.sleep) : pick('think', BANK.think), 'think', side, R));
      else if (r < .88) {
        const pool = R() < .38 ? BANK.say.chung : meal && R() < .4 ? BANK.meal : BANK.say[g] || BANK.say.chung;
        p.bubbles.push(mkBubble(gtok(pick('say' + pool[0], pool), ctx.gender), 'say', side, R));
      }
      if (sfxN < 1 && (R() < .4 || !p.bubbles.length)) {
        const pool = night ? BANK.sfx.dem : meal && R() < .5 ? BANK.sfx.an : R() < .5 && BANK.sfx[g] ? BANK.sfx[g] : BANK.sfx.chung;
        p.sfx.push({ text: pick('sfx' + pool[0], pool), u: 1 - side + (R() - .5) * .1, v: .74 + R() * .1, size: 92 + Math.round(R() * 30), angle: Math.round((R() - .5) * 26), color: BANK.colors[Math.floor(R() * BANK.colors.length)] });
        sfxN++; if (!p.fx && R() < .5) p.fx = 'speed';
      }
      if (close && !p.fx && spk < 1) { p.fx = 'sparkle'; spk++; }
      if (p.fx && ++fxN > 2) p.fx = null;
    });
  });
  if (ctx.src) layoutAuto(d, ctx.src);
  return d;
}
function mkBubble(text, type, side, R) {
  return { text, type, u: side + (R() - .5) * .06, v: .2 + R() * .08, tu: side > .5 ? side - .16 : side + .16, tv: .42 + R() * .08 };
}
export { BANK };

// ---------- Xử lý ảnh khung ----------
const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
function blurCopy(src, w, h, f) { // làm mượt nhanh: thu nhỏ rồi phóng lại (trình duyệt nội suy mượt)
  const sw = Math.max(1, Math.round(w / f)), sh = Math.max(1, Math.round(h / f));
  const a = mkCanvas(sw, sh), ax = a.getContext('2d'); ax.imageSmoothingQuality = 'high'; ax.drawImage(src, 0, 0, sw, sh);
  const b = mkCanvas(w, h), bx = b.getContext('2d', { willReadFrequently: true }); bx.imageSmoothingQuality = 'high'; bx.drawImage(a, 0, 0, w, h);
  return bx.getImageData(0, 0, w, h).data;
}
export function drawCover(x, src, w, h, crop = {}) {
  crop = crop || {};
  const iw = src.width, ih = src.height, k = Math.max(w / iw, h / ih) * Math.max(1, crop.z || 1), dw = iw * k, dh = ih * k;
  let ox = w / 2 - (crop.cx ?? .5) * dw, oy = h / 2 - (crop.cy ?? (ih > iw ? .4 : .5)) * dh;
  ox = clamp(ox, w - dw, 0); oy = clamp(oy, h - dh, 0);
  x.imageSmoothingQuality = 'high'; x.drawImage(src, ox, oy, dw, dh);
  return { k, dw, dh };
}
export function processPanel(src, w, h, crop, mode, ps = 1) {
  const c = mkCanvas(w, h), x = c.getContext('2d', { willReadFrequently: true });
  w = c.width; h = c.height;
  drawCover(x, src, w, h, crop);
  const id = x.getImageData(0, 0, w, h), d = id.data, n = w * h;
  if (mode !== 'bw') {
    const bl = blurCopy(c, w, h, 2.2);
    for (let i = 0; i < d.length; i += 4) {
      for (let k = 0; k < 3; k++) d[i + k] = d[i + k] + (d[i + k] - bl[i + k]) * .7; // làm nét
      let r = d[i], g = d[i + 1], b = d[i + 2]; const l = .299 * r + .587 * g + .114 * b;
      r = l + (r - l) * 1.25; g = l + (g - l) * 1.25; b = l + (b - l) * 1.25;
      d[i] = ((r - 128) * 1.12 + 128) * 1.04; d[i + 1] = ((g - 128) * 1.12 + 128) * 1.04; d[i + 2] = ((b - 128) * 1.12 + 128) * 1.04;
    }
    x.putImageData(id, 0, 0); return c;
  }
  // —— trắng đen chấm tram ——
  const g = new Float32Array(n), hist = new Uint32Array(256);
  for (let i = 0, j = 0; j < n; i += 4, j++) { const v = .299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2]; g[j] = v; hist[v | 0]++; }
  let lo = 0, hi = 255, acc = 0; const cut = n * .01;
  for (; lo < 255 && (acc += hist[lo]) < cut; lo++); acc = 0; for (; hi > 0 && (acc += hist[hi]) < cut; hi--);
  const span = Math.max(30, hi - lo);
  // ảnh xám đã kéo tương phản → làm mượt (thay mô hình AI) để mặt người không lấm tấm
  for (let i = 0, j = 0; j < n; i += 4, j++) { const v = clamp((g[j] - lo) / span * 255, 0, 255); d[i] = d[i + 1] = d[i + 2] = v; }
  x.putImageData(id, 0, 0);
  const sm = blurCopy(c, w, h, 2.4 * ps), sm2 = blurCopy(c, w, h, 3.6 * ps);
  const cell = Math.max(3, 6.2 * ps), out = x.createImageData(w, h), o = out.data;
  const S = Math.SQRT1_2;
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
    const j = y * w + xx, i = j * 4;
    let v = sm[i] * .62 + d[i] * .38; v = 255 * Math.pow(v / 255, .66);
    // lưới chấm xoay 45°
    const u = (xx + y) * S / cell, vv = (xx - y) * S / cell, fu = u - Math.floor(u) - .5, fv = vv - Math.floor(vv) - .5;
    const dist = Math.sqrt(fu * fu + fv * fv) * cell;
    let px;
    if (v < 30) px = 0;
    else if (v > 206) px = 255;
    else { const r = Math.pow(1 - (v - 30) / 176, 1.1) * cell * .6; px = clamp((dist - r) / 1.1 + .5, 0, 1) * 255; }
    // nét mực mảnh từ biên của ảnh đã làm mượt
    if (xx > 0 && y > 0 && xx < w - 1 && y < h - 1) {
      const a = i - 4, b = i + 4, t = i - w * 4, bo = i + w * 4;
      const gx = sm2[b] - sm2[a], gy = sm2[bo] - sm2[t], mag = Math.abs(gx) + Math.abs(gy);
      const ink = clamp((mag - 15 * 1) / 14, 0, 1);
      px *= 1 - ink * .92;
    }
    o[i] = o[i + 1] = o[i + 2] = px; o[i + 3] = 255;
  }
  x.putImageData(out, 0, 0); return c;
}

// ---------- Hiệu ứng trong khung ----------
function rays(x, w, h, cx, cy, inner, n, seed, color, wmin = .004, wmax = .014) {
  const R = rng(seed), RR = Math.hypot(w, h);
  x.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, ww = wmin + R() * (wmax - wmin), r0 = inner * (1 + R() * .45);
    x.beginPath(); x.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    x.lineTo(cx + Math.cos(a - ww) * RR, cy + Math.sin(a - ww) * RR); x.lineTo(cx + Math.cos(a + ww) * RR, cy + Math.sin(a + ww) * RR); x.closePath(); x.fill();
  }
}
function star4(x, cx, cy, r) { x.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * .22 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fill(); }
export function drawFx(x, fx, bx, by, bw, bh, mode, seed) {
  if (!fx) return;
  x.save();
  if (fx === 'focus') rays(x, bw, bh, bx + bw * .52, by + bh * .34, bh * .42, 150, seed, mode === 'bw' ? 'rgba(0,0,0,1)' : 'rgba(0,0,0,.78)');
  else if (fx === 'speed') rays(x, bw, bh, bx + bw * .58, by + bh * .6, Math.min(bw, bh) * .32, 110, seed, 'rgba(255,255,255,.66)');
  else if (fx === 'sparkle') {
    rays(x, bw, bh, bx + bw * .5, by + bh * .5, Math.min(bw, bh) * .4, 70, seed, 'rgba(255,255,255,.88)', .003, .01);
    const R = rng(seed + 'st'); x.fillStyle = mode === 'bw' ? '#fff' : 'rgba(255,248,214,.95)';
    for (let i = 0; i < 9; i++) { const a = R() * Math.PI * 2, rr = Math.min(bw, bh) * (.36 + R() * .12); star4(x, bx + bw * .5 + Math.cos(a) * rr, by + bh * .5 + Math.sin(a) * rr * .9, Math.min(bw, bh) * (.025 + R() * .03)); }
  }
  x.restore();
}

// ---------- Chữ: bong bóng, ô chữ, tiếng động ----------
const FONT = (w, px) => `${w} ${px}px Quicksand, sans-serif`;
function wrap(x, text, maxw) {
  const lines = []; let cur = '';
  for (const w of String(text).split(/\s+/).filter(Boolean)) { const t = cur ? cur + ' ' + w : w; if (x.measureText(t).width > maxw && cur) { lines.push(cur); cur = w; } else cur = t; }
  lines.push(cur); return lines.length ? lines : [''];
}
const BSIZE = { say: 34, shout: 40, think: 31 }, BMAX = { say: 300, shout: 330, think: 280 };
// tính hình bong bóng (đơn vị trang)
export function bubbleShape(x, b, cx, cy, tx, ty, maxw) {
  const fs = b.fs || 1, size = Math.round((BSIZE[b.type] || 34) * fs); x.font = FONT(700, size);
  const lines = wrap(x, b.text || ' ', Math.min(maxw || 1e9, BMAX[b.type] || 300) * Math.max(1, fs * .9)), lh = size * 1.22;
  const tw = Math.max(40, ...lines.map(l => x.measureText(l).width)), th = lh * lines.length;
  return { lines, lh, size, cx, cy, rx: tw / 2 + (b.type === 'think' ? 50 : 42), ry: th / 2 + (b.type === 'think' ? 36 : 30), tx, ty };
}
function drawBubble(x, b, sh, ink = 5) {
  const { cx, cy, rx, ry, tx, ty } = sh;
  x.lineJoin = 'round'; x.lineWidth = ink; x.strokeStyle = '#000'; x.fillStyle = '#fff';
  const a = Math.atan2((ty - cy) / ry, (tx - cx) / rx);
  const b0 = [cx + Math.cos(a - .28) * rx * .8, cy + Math.sin(a - .28) * ry * .8], b1 = [cx + Math.cos(a + .28) * rx * .8, cy + Math.sin(a + .28) * ry * .8];
  if (b.type === 'think') {
    // đuôi = các chấm tròn nhỏ dần
    for (let k = 0; k < 3; k++) { const t = .35 + k * .3, r = (1 - k * .28) * ry * .16; const px = lerpN(cx + Math.cos(a) * rx, tx, t), py = lerpN(cy + Math.sin(a) * ry, ty, t); x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); x.stroke(); }
    const N = 11, cloud = () => { x.beginPath(); for (let k = 0; k < N; k++) { const t = k / N * Math.PI * 2, px = cx + Math.cos(t) * rx * .9, py = cy + Math.sin(t) * ry * .86; x.moveTo(px + rx * .3, py); x.ellipse(px, py, rx * .3, ry * .36, 0, 0, Math.PI * 2); } x.moveTo(cx + rx * .92, cy); x.ellipse(cx, cy, rx * .92, ry * .86, 0, 0, Math.PI * 2); };
    cloud(); x.lineWidth = ink * 2; x.stroke(); cloud(); x.fill(); x.lineWidth = ink;
  } else if (b.type === 'shout') {
    const pts = []; for (let i = 0; i < 36; i++) { const t = i / 36 * Math.PI * 2, k = i % 2 ? 1.18 : .96; pts.push([cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k]); }
    x.beginPath(); x.moveTo(...b0); x.lineTo(tx, ty); x.lineTo(...b1); x.closePath(); x.fill(); x.stroke();
    x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(...p) : x.moveTo(...p)); x.closePath(); x.fill(); x.stroke();
    x.beginPath(); pts.forEach((p, i) => { const q = [cx + (p[0] - cx) * .9, cy + (p[1] - cy) * .9]; i ? x.lineTo(...q) : x.moveTo(...q); }); x.closePath(); x.fill();
  } else {
    x.beginPath(); x.moveTo(...b0); x.lineTo(tx, ty); x.lineTo(...b1); x.closePath(); x.fill(); x.stroke();
    x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); x.fill(); x.stroke();
    x.beginPath(); x.ellipse(cx, cy, rx - ink, ry - ink, 0, 0, Math.PI * 2); x.fill();
  }
  x.fillStyle = '#000'; x.font = FONT(700, sh.size); x.textAlign = 'center'; x.textBaseline = 'middle';
  let y = cy - sh.lh * sh.lines.length / 2 + sh.lh / 2;
  for (const l of sh.lines) { x.fillText(l, cx, y + sh.size * .04); y += sh.lh; }
}
const lerpN = (a, b, t) => a + (b - a) * t;
export function captionBox(x, c, px, py, maxW = 900) {
  let size = Math.round((c.dark ? 26 : 30) * (c.fs || 1)); x.font = FONT(700, size);
  while (size > 17 && x.measureText(c.text || ' ').width > maxW - 32) { size--; x.font = FONT(700, size); }
  const tw = Math.min(x.measureText(c.text || ' ').width, maxW - 32), padX = 16;
  return { x: px, y: py, w: tw + padX * 2, h: size + 16 * 1.6, size };
}
function drawCaption(x, c, bx) {
  x.fillStyle = c.dark ? '#000' : '#fffdf6'; x.strokeStyle = '#000'; x.lineWidth = 4;
  x.fillRect(bx.x, bx.y, bx.w, bx.h); x.strokeRect(bx.x, bx.y, bx.w, bx.h);
  x.fillStyle = c.dark ? '#fff' : '#000'; x.font = FONT(700, bx.size); x.textAlign = 'left'; x.textBaseline = 'middle';
  x.fillText(c.text || '', bx.x + 16, bx.y + bx.h / 2 + bx.size * .04, bx.w - 32);
}
export function sfxBox(x, s, px, py) { x.font = FONT(700, s.size || 100); const w = x.measureText(s.text || ' ').width; return { cx: px, cy: py, w: w + (s.size || 100) * .4, h: (s.size || 100) * 1.3 }; }
function drawSfx(x, s, bx, mode) {
  const size = s.size || 100;
  x.save(); x.translate(bx.cx, bx.cy); x.rotate(-(s.angle || 0) * Math.PI / 180);
  x.font = FONT(700, size); x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  x.strokeStyle = '#fff'; x.lineWidth = size * .34; x.strokeText(s.text, 0, 0);
  x.strokeStyle = '#000'; x.lineWidth = size * .13; x.strokeText(s.text, 0, 0);
  x.fillStyle = mode === 'bw' ? '#fff' : (s.color || '#ff7eb3'); x.fillText(s.text, 0, 0);
  x.restore();
}

// ---------- Dựng một trang ----------
// opt: { scale, mode, src(mid)→ảnh, cache:Map, quick, sel:{p,kind,i}, header:{title, sub}, pageNo }
export function renderPage(d, pi, opt) {
  const s = opt.scale || 1, mode = opt.mode || d.mode || 'color', page = d.pages[pi];
  const cv = opt.canvas || mkCanvas(PW * s, PH * s); if (opt.canvas) { cv.width = Math.round(PW * s); cv.height = Math.round(PH * s); }
  const x = cv.getContext('2d');
  x.setTransform(s, 0, 0, s, 0, 0);
  x.fillStyle = '#fbf7ee'; x.fillRect(0, 0, PW, PH);
  const geo = pageGeom(page, pi), items = [];
  page.panels.forEach((p, k) => {
    const gm = geo[k]; if (!gm) return;
    const src = opt.src(p.mid);
    x.save(); x.beginPath(); gm.poly.forEach((q, i) => i ? x.lineTo(...q) : x.moveTo(...q)); x.closePath(); x.clip();
    if (src) {
      const pw = Math.round(gm.bw * s), ph = Math.round(gm.bh * s);
      const key = `${p.mid}|${mode}|${pw}x${ph}|${(p.crop?.cx ?? -1).toFixed(3)},${(p.crop?.cy ?? -1).toFixed(3)},${(p.crop?.z ?? 1).toFixed(3)}`;
      let img = opt.cache?.get(key);
      if (!img && opt.quick) { x.save(); x.translate(gm.bx, gm.by); x.scale(1 / s, 1 / s); const t = mkCanvas(pw, ph); drawCover(t.getContext('2d'), src, pw, ph, p.crop); x.drawImage(t, 0, 0); x.restore(); }
      else {
        if (!img) { img = processPanel(src, pw, ph, p.crop, mode, s); opt.cache?.set(key, img); if (opt.cache && opt.cache.size > 60) opt.cache.delete(opt.cache.keys().next().value); }
        x.drawImage(img, gm.bx, gm.by, gm.bw, gm.bh);
      }
    } else { x.fillStyle = '#e9e1d6'; x.fillRect(gm.bx, gm.by, gm.bw, gm.bh); x.fillStyle = '#9b8aa3'; x.font = FONT(600, 28); x.textAlign = 'center'; x.fillText('Ảnh không còn trong máy', gm.bx + gm.bw / 2, gm.by + gm.bh / 2); }
    drawFx(x, p.fx, gm.bx, gm.by, gm.bw, gm.bh, mode, (page.seed || 1) * 7 + k);
    x.restore();
    x.lineWidth = 8; x.lineJoin = 'round'; x.strokeStyle = '#000';
    x.beginPath(); gm.poly.forEach((q, i) => i ? x.lineTo(...q) : x.moveTo(...q)); x.closePath(); x.stroke();
  });
  // tiêu đề
  x.textBaseline = 'middle';
  const H = opt.header || {};
  if (pi === 0) {
    x.fillStyle = '#2b1838'; x.font = FONT(700, 64); x.textAlign = 'left'; x.fillText(fitTxt(x, H.title || '', PW - PM * 2 - 200, 64, 40, 700), PM, 72);
    x.fillStyle = '#b04a78'; fitTxt(x, H.sub || '', PW - PM * 2, 30, 20, 600); x.fillText(H.sub || '', PM + 4, 140, PW - PM * 2);
    if (H.fn) { x.fillStyle = '#a0742c'; x.font = FONT(700, 21); x.fillText(H.fn, PM + 4, 24, PW - PM * 2 - 220); }
  } else if (H.chap?.(pi)) {
    const c = H.chap(pi); x.fillStyle = '#b04a78'; x.font = FONT(700, 24); x.textAlign = 'left'; x.fillText(c.no, PM, 46);
    x.fillStyle = '#2b1838'; fitTxt(x, c.t, PW - PM * 2 - 200, 40, 24, 700); x.fillText(c.t, PM, 86, PW - PM * 2 - 180);
  } else {
    x.fillStyle = '#2b1838'; x.font = FONT(700, 40); x.textAlign = 'left'; x.fillText(fitTxt(x, H.short || H.title || '', PW - PM * 2 - 200, 40, 26, 700), PM, 70);
  }
  x.fillStyle = '#7d6a86'; x.font = FONT(600, 30); x.textAlign = 'right'; x.fillText(`Trang ${pi + 1}`, PW - PM, pi === 0 ? 92 : 70);
  // chữ trên các khung (vẽ sau để không bị khung che)
  page.panels.forEach((p, k) => {
    const gm = geo[k]; if (!gm) return;
    const at = (u, v) => [gm.bx + u * gm.bw, gm.by + v * gm.bh];
    (p.sfx || []).forEach((sf, i) => { let [cx, cy] = at(sf.u, sf.v); const b0 = sfxBox(x, sf, cx, cy); cx = clamp(cx, b0.w / 2 + 6, PW - b0.w / 2 - 6); cy = clamp(cy, b0.h / 2, PH - b0.h / 2); const bx = sfxBox(x, sf, cx, cy); drawSfx(x, sf, bx, mode); items.push({ p: k, kind: 'sfx', i, box: { x: cx - bx.w / 2, y: cy - bx.h / 2, w: bx.w, h: bx.h } }); });
    (p.bubbles || []).forEach((b, i) => {
      let [cx, cy] = at(b.u, b.v); const [tx, ty] = at(b.tu, b.tv), sh = bubbleShape(x, b, cx, cy, tx, ty, clamp(gm.bw * .6, 150, 330));
      // giữ bong bóng trong khung của nó (nếu vừa)
      const m = 14; if (sh.rx * 2 < gm.bw - m * 2) sh.cx = clamp(sh.cx, gm.bx + m + sh.rx, gm.bx + gm.bw - m - sh.rx); if (sh.ry * 2 < gm.bh - m * 2) sh.cy = clamp(sh.cy, gm.by + m + sh.ry, gm.by + gm.bh - m - sh.ry);
      cx = sh.cx; cy = sh.cy; drawBubble(x, b, sh); items.push({ p: k, kind: 'bubble', i, box: { x: cx - sh.rx, y: cy - sh.ry, w: sh.rx * 2, h: sh.ry * 2 }, tail: [tx, ty] }); });
    if (p.caption) { const [cx, cy] = at(p.caption.u, p.caption.v), bx = captionBox(x, p.caption, cx, cy, gm.bw - 24); bx.x = clamp(bx.x, gm.bx + 10, gm.bx + gm.bw - 10 - bx.w); bx.y = clamp(bx.y, gm.by + 10, gm.by + gm.bh - 10 - bx.h); drawCaption(x, p.caption, bx); items.push({ p: k, kind: 'caption', i: 0, box: { x: bx.x, y: bx.y, w: bx.w, h: bx.h } }); }
  });
  x.fillStyle = '#a597ad'; x.font = FONT(600, 20); x.textAlign = 'right'; x.textBaseline = 'alphabetic'; x.fillText('Hành Trình Của Bạn', PW - PM, PH - 18);
  // vùng đang chọn (chỉ trong trình chỉnh)
  const sel = opt.sel;
  if (sel && sel.p != null && geo[sel.p]) {
    x.save(); x.setLineDash([18, 12]); x.lineWidth = 6; x.strokeStyle = '#ff4f9a';
    if (sel.kind) { const it = items.find(t => t.p === sel.p && t.kind === sel.kind && t.i === sel.i); if (it) { x.strokeRect(it.box.x - 8, it.box.y - 8, it.box.w + 16, it.box.h + 16); if (it.tail) { x.setLineDash([]); x.fillStyle = '#ff4f9a'; x.beginPath(); x.arc(it.tail[0], it.tail[1], 16, 0, 7); x.fill(); } } }
    else { const gm = geo[sel.p]; x.beginPath(); gm.poly.forEach((q, i) => i ? x.lineTo(...q) : x.moveTo(...q)); x.closePath(); x.stroke(); }
    x.restore();
  }
  x.setTransform(1, 0, 0, 1, 0, 0);
  return { canvas: cv, geo, items };
}
// ---------- Xếp chữ tự động: không chồng nhau, tránh che mặt người nếu được ----------
const MC = (() => { const c = document.createElement('canvas'); c.width = c.height = 8; return c.getContext('2d'); })();
function skinGrid(src, gm, crop) {
  const W = 28, H = Math.max(8, Math.round(28 * gm.bh / gm.bw)), c = mkCanvas(W, H), x = c.getContext('2d', { willReadFrequently: true });
  drawCover(x, src, W, H, crop); const d = x.getImageData(0, 0, W, H).data, g = new Float32Array(W * H); let sx = 0, sy = 0, n = 0;
  for (let i = 0, j = 0; j < W * H; i += 4, j++) { const r = d[i], gg = d[i + 1], b = d[i + 2], cb = 128 - .169 * r - .331 * gg + .5 * b, cr = 128 + .5 * r - .419 * gg - .081 * b; if (cr > 137 && cr < 175 && cb > 82 && cb < 128 && r > 90 && r > b) { g[j] = 1; sx += j % W; sy += (j / W) | 0; n++; } }
  return { W, H, g, cx: n > 6 ? (sx / n + .5) / W : .5, cy: n > 6 ? (sy / n + .5) / H : .45, n };
}
export function layoutAuto(d, src) {
  d.pages.forEach((pg, pi) => {
    const geo = pageGeom(pg, pi);
    pg.panels.forEach((p, k) => {
      const gm = geo[k]; if (!gm) return;
      const im = src?.(p.mid), sk = im ? skinGrid(im, gm, p.crop) : null, placed = [];
      const skin = bx => { if (!sk) return 0; let a = 0, n = 0; const x0 = clamp(Math.floor((bx.x - gm.bx) / gm.bw * sk.W), 0, sk.W - 1), x1 = clamp(Math.ceil((bx.x + bx.w - gm.bx) / gm.bw * sk.W), 1, sk.W), y0 = clamp(Math.floor((bx.y - gm.by) / gm.bh * sk.H), 0, sk.H - 1), y1 = clamp(Math.ceil((bx.y + bx.h - gm.by) / gm.bh * sk.H), 1, sk.H); for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { a += sk.g[y * sk.W + x]; n++; } return n ? a / n : 0; };
      const ov = bx => { let a = 0; for (const q of placed) a += Math.max(0, Math.min(bx.x + bx.w, q.x + q.w) - Math.max(bx.x, q.x)) * Math.max(0, Math.min(bx.y + bx.h, q.y + q.h) - Math.max(bx.y, q.y)); return a / (bx.w * bx.h); };
      if (p.caption) { const b0 = captionBox(MC, p.caption, gm.bx + p.caption.u * gm.bw, gm.by + p.caption.v * gm.bh, gm.bw - 24); b0.x = clamp(b0.x, gm.bx + 10, gm.bx + gm.bw - 10 - b0.w); b0.y = clamp(b0.y, gm.by + 10, gm.by + gm.bh - 10 - b0.h); placed.push({ x: b0.x - 6, y: b0.y - 6, w: b0.w + 12, h: b0.h + 12 }); }
      const US = [.2, .35, .5, .65, .8], VS = [.15, .27, .4, .6, .78];
      (p.bubbles || []).forEach(b => {
        if (b.auto === false) { const sh = bubbleShape(MC, b, 0, 0, 0, 0, clamp(gm.bw * .6, 150, 330)); placed.push({ x: gm.bx + b.u * gm.bw - sh.rx, y: gm.by + b.v * gm.bh - sh.ry, w: sh.rx * 2, h: sh.ry * 2 }); return; }
        const sh = bubbleShape(MC, b, 0, 0, 0, 0, clamp(gm.bw * .6, 150, 330)), m = 14;
        let best = null, bc = 1e9;
        for (const u of US) for (const v of VS) {
          const cx = clamp(gm.bx + u * gm.bw, gm.bx + m + sh.rx, gm.bx + gm.bw - m - sh.rx), cy = clamp(gm.by + v * gm.bh, gm.by + m + sh.ry, gm.by + gm.bh - m - sh.ry);
          const bx = { x: cx - sh.rx - 8, y: cy - sh.ry - 8, w: sh.rx * 2 + 16, h: sh.ry * 2 + 16 };
          const cost = ov(bx) * 60 + skin(bx) * 9 + (v > .5 ? .8 : 0) + Math.hypot(u - (b.u ?? .5), v - (b.v ?? .25)) * .9;
          if (cost < bc) { bc = cost; best = { cx, cy, bx }; }
        }
        b.u = (best.cx - gm.bx) / gm.bw; b.v = (best.cy - gm.by) / gm.bh;
        // đuôi chĩa về phía mặt (vùng màu da) hoặc giữa khung
        const tx = sk ? sk.cx : .5, ty = sk ? sk.cy : .5, dx = tx - b.u, dy = ty - b.v, L = Math.hypot(dx * gm.bw, dy * gm.bh) || 1, reach = Math.min(L * .55, sh.ry + 70);
        b.tu = clamp(b.u + dx * gm.bw / L * reach / gm.bw + (dx * gm.bw / L) * (sh.rx * .3) / gm.bw, .04, .96); b.tv = clamp(b.v + dy * gm.bh / L * reach / gm.bh + (dy * gm.bh / L) * (sh.ry * .3) / gm.bh, .04, .96);
        placed.push(best.bx);
      });
      (p.sfx || []).forEach(sf => {
        if (sf.auto === false) return;
        const b0 = sfxBox(MC, sf, 0, 0); let best = null, bc = 1e9;
        for (const u of [.25, .5, .75]) for (const v of [.64, .76, .88, .32, .5]) {
          const cx = gm.bx + u * gm.bw, cy = gm.by + v * gm.bh, bx = { x: cx - b0.w / 2, y: cy - b0.h / 2, w: b0.w, h: b0.h };
          const out = Math.max(0, gm.bx - bx.x) + Math.max(0, bx.x + bx.w - gm.bx - gm.bw) + Math.max(0, gm.by - bx.y) + Math.max(0, bx.y + bx.h - gm.by - gm.bh);
          const cost = ov(bx) * 60 + skin(bx) * 6 + out / 80 + Math.hypot(u - (sf.u ?? .5), v - (sf.v ?? .78)) * .6;
          if (cost < bc) { bc = cost; best = { u, v, bx }; }
        }
        sf.u = best.u; sf.v = best.v; placed.push(best.bx);
      });
    });
  });
  d.lv = 2; return d;
}
function fitTxt(x, t, max, size, min, w) { for (let z = size; z >= min; z--) { x.font = FONT(w, z); if (x.measureText(t).width <= max) return t; } return t; }

// =====================================================================
// Giao diện: tạo nhật ký, trình chỉnh, trình xem lật trang, AI viết lời
// =====================================================================
const CSS = `
#mAsk,#mDiary{z-index:55}
body.dopen #top,body.dopen #bottom{opacity:0;pointer-events:none}
.dfull{position:fixed;inset:0;z-index:45;display:flex;flex-direction:column;background:var(--bg);opacity:0;pointer-events:none;transition:opacity .35s}
body[data-theme="night"] .dfull{background:radial-gradient(ellipse at 30% 0%,#2a1858,#0b0a24 70%)}
body[data-theme="dawn"] .dfull{background:radial-gradient(ellipse at 30% 0%,#fff3ec,#fde4d6 70%)}
.dfull.open{opacity:1;pointer-events:auto}
.dhead{display:flex;gap:10px;align-items:center;padding:calc(10px + var(--safe-t)) 14px 10px;border-radius:0 0 22px 22px}
.dhead input{flex:1;min-width:0;font:700 18px var(--font);color:var(--text);background:var(--field);border:1px solid var(--line);border-radius:14px;padding:10px 12px;outline:none}
.dbody{flex:1;min-height:0;display:flex;gap:16px;padding:14px}
.dstage{flex:1;min-width:0;position:relative;display:grid;place-items:center}
.dcv{max-width:100%;max-height:100%;border-radius:6px;box-shadow:0 20px 60px rgba(0,0,0,.35);touch-action:none;background:#fbf7ee;cursor:pointer}
.dbusy{position:absolute;inset:auto 0 12px;margin:auto;width:max-content;padding:8px 14px;border-radius:12px;background:rgba(0,0,0,.6);color:#fff;font-weight:700;font-size:13px;opacity:0;transition:opacity .3s;pointer-events:none}
.dbusy.on{opacity:1}
.dside{width:340px;flex:0 0 340px;overflow:auto;border-radius:22px;padding:14px}
.dside h4{margin:14px 0 8px;font-size:13px;color:var(--sub)}
.dgrp,.drow{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.dgrp h4{width:100%;margin-bottom:0}
.dnav{justify-content:space-between}.dnav .dpg{font-weight:700}
.dside textarea{width:100%;font:700 17px var(--font);color:var(--text);background:var(--field);border:1px solid var(--accent);border-radius:12px;padding:10px;outline:none;resize:vertical}
.dhint{margin:0 0 8px;font-size:12px;color:var(--muted);font-weight:600}
.dcolors{display:flex;gap:8px;margin:8px 0}.dcolors i{width:28px;height:28px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 1px var(--line);cursor:pointer}.dcolors i.on{box-shadow:0 0 0 3px var(--accent)}
.dstrip{display:flex;flex-wrap:wrap;gap:6px;width:100%;touch-action:none}
.dstrip .th{width:54px;height:54px;border-radius:9px;background:var(--btn) center/cover;position:relative;cursor:grab;border:2px solid transparent;transition:transform .15s}
.dstrip .th.on{border-color:var(--accent)}.dstrip .th.drag{opacity:.35}.dstrip .th.over{transform:translateX(6px)}
.dstrip .th b{position:absolute;left:3px;top:2px;font-size:10px;color:#fff;text-shadow:0 1px 3px #000}
.dstrip .sep{width:100%;font-size:11px;font-weight:700;color:var(--muted);margin-top:4px}
.dghost{position:fixed;z-index:80;width:60px;height:60px;border-radius:10px;background:center/cover;pointer-events:none;box-shadow:0 10px 30px rgba(0,0,0,.4);transform:translate(-50%,-50%) rotate(-4deg)}
.dpick{display:flex;flex-direction:column;gap:12px;max-height:52vh;overflow:auto;margin-top:12px}
.dpick .day{display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:13px;color:var(--sub)}
.dpick .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(74px,1fr));gap:6px}
.dpick .grid i{aspect-ratio:1;border-radius:10px;background:var(--btn) center/cover;position:relative;cursor:pointer;border:3px solid transparent}
.dpick .grid i.on{border-color:var(--accent)}.dpick .grid i.on::after{content:"✓";position:absolute;right:4px;top:2px;color:#fff;font-weight:700;text-shadow:0 1px 4px #000}
.dbig{display:grid;gap:10px;margin-top:6px}.dbig button{justify-content:center;font-size:16px;padding:16px;border-radius:18px}
.dlist{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px;margin-top:12px}
.dlist .it{border-radius:14px;overflow:hidden;background:var(--field);cursor:pointer;border:1px solid var(--line)}
.dlist .it img{display:block;width:100%;aspect-ratio:1240/1754;object-fit:cover;background:#fbf7ee}
.dlist .it div{padding:6px 8px;font-size:12px;font-weight:700}
#dBook{position:fixed;inset:0;z-index:46;display:flex;flex-direction:column;opacity:0;pointer-events:none;transition:opacity .45s;background:radial-gradient(ellipse at center,rgba(20,12,50,.55),rgba(8,5,30,.92))}
body[data-theme="dawn"] #dBook{background:radial-gradient(ellipse at center,rgba(255,240,235,.6),rgba(150,80,110,.75))}
#dBook.open{opacity:1;pointer-events:auto}
#dBook.auto .bkbar,#dBook.auto .bknav{opacity:0;pointer-events:none}
.bkbar{display:flex;gap:8px;align-items:center;padding:calc(12px + var(--safe-t)) 14px 8px}
.bkbar .bkt{font-weight:700;font-size:16px;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.bkbar .sp{flex:1}
.bkstage{flex:1;min-height:0;display:grid;place-items:center;perspective:2400px;touch-action:none;padding:6px 10px calc(30px + var(--safe-b))}
.book{position:relative;transform-style:preserve-3d;transform:scale(.7) rotateX(14deg);opacity:0;transition:transform .7s cubic-bezier(.2,.9,.25,1.1),opacity .5s}
#dBook.open .book{transform:none;opacity:1}
.book .pg,.leaf .f,.leaf .b{position:absolute;top:0;bottom:0;background:#fbf7ee center/cover no-repeat;box-shadow:0 18px 50px rgba(0,0,0,.45)}
.book .pg.L,.leaf .b{border-radius:8px 2px 2px 8px}.book .pg.R,.leaf .f{border-radius:2px 8px 8px 2px}
.book.single .pg,.book.single .leaf .f{border-radius:6px}
.book .pg.blank{background:linear-gradient(90deg,#efe6d7,#fbf7ee)}
.book .spine{position:absolute;top:0;bottom:0;width:26px;margin-left:-13px;background:linear-gradient(90deg,rgba(0,0,0,0),rgba(0,0,0,.22),rgba(0,0,0,0));pointer-events:none;z-index:3}
.leaf{position:absolute;top:0;bottom:0;transform-origin:left center;transform-style:preserve-3d;z-index:5}
.leaf .f,.leaf .b{left:0;right:0;-webkit-backface-visibility:hidden;backface-visibility:hidden}
.leaf .b{transform:rotateY(180deg)}
.leaf .sh{position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,rgba(0,0,0,.28),rgba(0,0,0,0) 40%,rgba(255,255,255,.18) 70%,rgba(0,0,0,.12));opacity:0;-webkit-backface-visibility:hidden;backface-visibility:hidden;border-radius:inherit}
.leaf.go .sh{animation:lsh var(--dur) ease-in-out}
@keyframes lsh{0%,100%{opacity:0}50%{opacity:1}}
.bknav{position:fixed;top:50%;transform:translateY(-50%);width:52px;height:52px;border-radius:50%;justify-content:center;font-size:24px;padding:0;z-index:47}
.bknav.l{left:calc(10px + var(--safe-l))}.bknav.r{right:calc(10px + var(--safe-r))}
.bkpg{position:fixed;left:0;right:0;bottom:calc(10px + var(--safe-b));text-align:center;color:#fff;font-weight:700;font-size:13px;text-shadow:0 1px 6px rgba(0,0,0,.5);pointer-events:none}
@media (max-width:760px){
 .dbody{flex-direction:column;overflow:auto;padding:10px}
 .dstage{flex:0 0 auto}
 .dcv{width:100%;max-height:none}
 .dside{width:100%;flex:0 0 auto;overflow:visible}
 .dside button{padding:11px 14px;font-size:15px}
 .bkbar .lb{display:none}
 .bknav{display:none}
}`;
const HTML = `
<div class="modal" id="mDiary"><div class="card glass">
  <h2>📖 Nhật ký truyện tranh</h2>
  <p class="lead">Biến ảnh một ngày của con thành trang truyện tranh dễ thương. Ảnh vẫn chỉ nằm trong máy của bạn.</p>
  <div class="dstep" data-s="list"><div class="dbig"><button class="primary" data-a="new">➕ Tạo nhật ký mới</button></div><div class="dlist"></div></div>
  <div class="dstep" data-s="src" hidden>
    <div class="dbig"><button class="primary" data-a="files">📸 Chọn ảnh trong máy</button><button data-a="pick">🌌 Chọn từ khoảnh khắc đã có</button></div>
    <p class="hint" style="margin-top:12px">Nên chọn 10–20 ảnh của cùng một ngày. App tự xếp theo giờ chụp, chia trang và ghép lời.</p>
  </div>
  <div class="dstep" data-s="pick" hidden><div class="drow" style="justify-content:space-between"><b class="dcount">Chưa chọn ảnh nào</b><button data-a="pickok" class="primary" disabled>Tiếp ✨</button></div><div class="dpick"></div></div>
  <div class="dstep" data-s="busy" hidden><p class="lead dbusyt">Đang đọc ảnh…</p><div class="prog" style="display:block"><i class="dprog"></i></div></div>
  <input type="file" class="dfiles" accept="image/*" multiple hidden>
  <div class="foot"><button data-close>Đóng</button></div>
</div></div>
<div class="dfull" id="dEd">
  <div class="dhead glass"><button data-a="close">✕</button><input class="dti" maxlength="60" aria-label="Tên nhật ký"><button class="primary" data-a="save">💾 Lưu</button></div>
  <div class="dbody">
    <div class="dstage"><canvas class="dcv"></canvas><div class="dbusy">Đang dựng trang…</div></div>
    <div class="dside glass">
      <div class="drow dnav"><button data-a="prev">‹ Trang trước</button><span class="dpg"></span><button data-a="next">Trang sau ›</button></div>
      <h4>Kiểu trang</h4><div class="seg dmode"><button data-v="color">🎨 Màu</button><button data-v="bw">🖤 Trắng đen</button></div>
      <div class="dsel" hidden><h4 class="dselt">Chữ đang chọn</h4><textarea class="dtx" rows="2" maxlength="80"></textarea><div class="dcolors"></div><div class="drow"><button data-a="btype">💬 Đổi kiểu bong bóng</button><button data-a="fs+">A+ Chữ to</button><button data-a="fs-">A− Chữ nhỏ</button><button data-a="del-item" class="danger">🗑 Xoá chữ này</button></div></div>
      <div class="dselp" hidden><h4>Khung ảnh đang chọn</h4><p class="dhint">Kéo trên ảnh để chỉnh vùng cắt.</p><div class="drow"><button data-a="zin">🔍 Phóng</button><button data-a="zout">🔍 Thu</button><button data-a="fx">✨ Hiệu ứng</button><button data-a="swap">🔁 Đổi ảnh</button><button data-a="rmp" class="danger">✖ Bỏ khung</button></div></div>
      <div class="dgrp"><h4>Thêm chữ vào khung</h4><button data-a="add-say">💬 Bong bóng</button><button data-a="add-shout">❗ Hét</button><button data-a="add-think">💭 Suy nghĩ</button><button data-a="add-sfx">💥 Tiếng động</button><button data-a="add-cap">🏷 Ô chữ</button></div>
      <div class="dgrp"><h4>Lời thoại</h4><button data-a="reroll">🎲 Ghép lời khác</button><button data-a="ai" class="dai" hidden>✨ AI viết lời</button></div>
      <div class="dgrp"><h4>Trang</h4><button data-a="tpl">🔀 Đổi bố cục</button><button data-a="addpg">➕ Thêm trang</button><button data-a="duppg">⧉ Nhân đôi trang</button><button data-a="coverpg">⭐ Đặt làm bìa</button><button data-a="delpg">🗑 Bỏ trang này</button></div>
      <div class="dgrp"><h4>Thứ tự khung — kéo ảnh để đổi chỗ</h4><div class="dstrip"></div></div>
      <div class="dgrp" style="margin-top:16px"><button data-a="deld" class="danger">Xoá nhật ký này</button></div>
    </div>
  </div>
</div>
<div id="dBook">
  <div class="bkbar"><span class="bkt"></span><span class="sp"></span><button class="glass" data-a="more" aria-label="Tuỳ chọn">⋯ <span class="lb">Tuỳ chọn</span></button><button class="glass" data-a="edit">✏️ <span class="lb">Sửa</span></button><button class="glass" data-a="dl">⬇️ <span class="lb">Lưu trang thành ảnh</span></button><button class="glass" data-a="close">✕</button></div>
  <div class="bkstage"><div class="book"></div></div>
  <button class="bknav l glass" data-a="bprev" aria-label="Trang trước">‹</button><button class="bknav r glass" data-a="bnext" aria-label="Trang sau">›</button>
  <div class="bkpg"></div>
</div>`;

export function initDiary(A) {
  const $ = s => document.querySelector(s);
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  document.body.insertAdjacentHTML('beforeend', HTML);
  const MD = $('#mDiary'), ED = $('#dEd'), BK = $('#dBook');
  MD.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => { A.closeModal(MD); }));
  MD.addEventListener('pointerdown', e => { if (e.target === MD) MD.dataset.down = 1; }); MD.addEventListener('click', e => { if (e.target === MD && MD.dataset.down) A.closeModal(MD); MD.dataset.down = ''; });
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const kidMonths = (kid, ts) => {
    if (!kid?.birth) return null; const b = new Date(kid.birth + 'T12:00:00'), d = new Date(ts);
    let m = (d.getFullYear() - b.getFullYear()) * 12 + d.getMonth() - b.getMonth(); if (d.getDate() < b.getDate()) m--;
    return d < b ? -1 : m;
  };
  const momById = id => A.allMoments().find(m => m.id === id);
  // ---------- ảnh nguồn ----------
  const SRC = new Map(); // mid → canvas (≤1100px)
  async function loadSrc(mid, small) {
    const key = mid + (small ? ':s' : ''); if (SRC.has(key)) return SRC.get(key);
    const m = momById(mid); let blob = null, img = null;
    if (m && m.type === 'image' && !m.heic && !small) blob = await A.dbGet('blobs', 'o_' + mid);
    for (const b of [blob, await A.dbGet('blobs', 't_' + mid)]) {
      if (!b || img) continue;
      try { img = await createImageBitmap(b); } catch (e) { try { img = await A.loadImgBlob(b); } catch (e2) { img = null; } }
    }
    if (!img) { SRC.set(key, null); return null; }
    const lim = small ? 512 : 1100, k = Math.min(1, lim / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); img.close?.();
    SRC.set(key, c); return c;
  }
  async function loadAll(d, small) { const ids = [...new Set(d.pages.flatMap(p => p.panels.map(q => q.mid)))]; for (const id of ids) await loadSrc(id, small); }
  const srcFn = small => mid => SRC.get(mid + (small ? ':s' : '')) || SRC.get(mid) || null;
  function clean(d) { // bỏ khung có ảnh đã xoá
    d.pages.forEach(p => { p.panels = p.panels.filter(q => momById(q.mid)); if (p.panels.length && !TEMPLATES[p.panels.length].some(t => t.id === p.tpl)) p.tpl = TEMPLATES[p.panels.length][0].id; });
    d.pages = d.pages.filter(p => p.panels.length); return d;
  }
  function header(d) {
    const kid = A.kid(), ms = d.pages.flatMap(p => p.panels.map(q => momById(q.mid))).filter(Boolean).sort((a, b) => a.ts - b.ts);
    if (!ms.length) return { title: d.title, short: d.title, sub: '' };
    const a = ms[0].ts, b = ms[ms.length - 1].ts, da = new Date(a), sameDay = A.ymd(a) === A.ymd(b);
    const when = sameDay ? `${A.WD[da.getDay()]} · ${A.dmy(a)} · ${hm(a)} – ${hm(b)}` : `${A.dmy(a).slice(0, 5)} – ${A.dmy(b)}`;
    const ks = (d.kids?.length > 1 && A.kids) ? A.kids().filter(k => d.kids.includes(k.id)) : [kid];
    const age = ks.map(k => A.ageText(k, a)).filter(Boolean).join(' · ');
    const chaps = d.pages.map((p, i) => p.chap ? i : -1).filter(i => i >= 0), multi = chaps.length > 1;
    const chapLine = pi => { const pg = d.pages[pi], t = pg?.chap && A.parseYmd(pg.chap); if (!t) return null; const ag = ks.map(k => A.ageText(k, t)).filter(Boolean).join(' · '); return { no: `Chương ${chaps.indexOf(pi) + 1}`, t: `${A.WD[new Date(t).getDay()]} · ${A.dmy(t)}${ag ? ' · ' + ag : ''}` }; };
    const sub = multi && chaps[0] === 0 ? (c => `${c.no} · ${c.t} · ${ms.length} khoảnh khắc`)(chapLine(0)) : `${when} · ${ms.length} khoảnh khắc${age ? ' · ' + age : ''}`;
    const fn = ks.length === 1 && ks[0]?.fullName ? ks[0].fullName : '';
    return { title: d.title, short: `${d.title} · ${A.dmy(a)}`, sub, fn, chap: multi ? chapLine : () => null };
  }
  const ctxFor = d => ({ gender: A.kid()?.gender, months: kidMonths(A.kid(), d.ts), ts: mid => momById(mid)?.ts, close: mid => CLOSE.get(mid), src: mid => SRC.get(mid + ':s') || SRC.get(mid) || null });
  // ảnh cận mặt: tỉ lệ màu da ở giữa ảnh nhỏ
  const CLOSE = new Map();
  async function closeness(mid) {
    if (CLOSE.has(mid)) return CLOSE.get(mid);
    const c = await loadSrc(mid, true); let v = false;
    if (c) {
      const t = document.createElement('canvas'); t.width = t.height = 48; const x = t.getContext('2d', { willReadFrequently: true });
      x.drawImage(c, c.width * .2, c.height * .15, c.width * .6, c.height * .6, 0, 0, 48, 48);
      const p = x.getImageData(0, 0, 48, 48).data; let sk = 0;
      for (let i = 0; i < p.length; i += 4) { const r = p[i], g = p[i + 1], b = p[i + 2], cb = 128 - .169 * r - .331 * g + .5 * b, cr = 128 + .5 * r - .419 * g - .081 * b; if (cr > 135 && cr < 175 && cb > 85 && cb < 130 && r > 80) sk++; }
      v = sk / 2304 > .4;
    }
    CLOSE.set(mid, v); return v;
  }
  // ---------- tạo nhật ký ----------
  async function build(ms, roll = 0) {
    ms = ms.slice().sort((a, b) => a.ts - b.ts);
    const dayOf = m => A.ymd(m.ts), dayList = [...new Set(ms.map(dayOf))];
    const kid = A.kid(), kidsIn = [...new Set(ms.flatMap(m => A.kidsOf(m)))], d = { id: uid(), kidId: kidsIn.includes(kid.id) ? kid.id : kidsIn[0] || kid.id, kids: kidsIn, ts: ms[0].ts, day: A.ymd(ms[0].ts), title: kidsIn.length > 1 ? 'Nhật ký cả nhà' : titleFor((A.kids?.().find(k => k.id === kidsIn[0]) || kid).name), mode: 'color', roll, pages: [], created: Date.now(), updated: Date.now() };
    const R = rng(d.id);
    const infos = []; for (const m of ms) infos.push({ a: m.w && m.h ? m.w / m.h : 1.33, close: await closeness(m.id) });
    let k = 0, prev = null;
    for (const day of dayList) { // mỗi ngày là một chương, bắt đầu trang mới
      const cnt = ms.filter(m => dayOf(m) === day).length; let first = true;
      for (const n of splitPages(cnt)) {
        const tpl = pickTemplate(infos.slice(k, k + n), prev, R);
        d.pages.push({ tpl, seed: Math.floor(R() * 1e6), panels: ms.slice(k, k + n).map(m => ({ mid: m.id, crop: null })), ...(dayList.length > 1 && first ? { chap: day } : {}) });
        prev = tpl; k += n; first = false;
      }
    }
    if (dayList.length > 1) d.title = `Nhật ký ${A.dmy(ms[0].ts).slice(0, 5)} – ${A.dmy(ms[ms.length - 1].ts)}`;
    autoText(d, ctxFor(d));
    return d;
  }
  async function saveDiary(d, quiet) {
    d.updated = Date.now(); clean(d);
    await A.dbPut('diaries', JSON.parse(JSON.stringify(d)));
    try { await loadAll(d, true); const r = renderPage(d, clamp(d.cover || 0, 0, d.pages.length - 1), { scale: .3, mode: d.mode, src: srcFn(true), header: header(d) }); const b = await new Promise(res => r.canvas.toBlob(res, 'image/jpeg', .86)); if (b) await A.dbPut('blobs', b, 'd_' + d.id); } catch (e) { console.warn(e); }
    await A.onChange(d, quiet);
  }
  // ---------- hộp Nhật ký: danh sách + tạo mới ----------
  let pickSel = new Set(), pickMode = 'new', pickCb = null, urls = [];
  const freeUrls = () => { urls.forEach(u => URL.revokeObjectURL(u)); urls = []; };
  function step(s) { MD.querySelectorAll('.dstep').forEach(e => e.hidden = e.dataset.s !== s); }
  async function openList() {
    if (!A.kid()) return;
    freeUrls(); step('list');
    const ds = (await A.dbAll('diaries')).filter(d => !d.deleted && (A.family?.() || d.kidId === A.kid().id || (d.kids || []).includes(A.kid().id))).sort((a, b) => b.ts - a.ts), box = MD.querySelector('.dlist');
    box.innerHTML = ds.length ? '' : `<p class="hint" style="grid-column:1/-1">Chưa có nhật ký nào. Bấm “Tạo nhật ký mới” để bắt đầu nhé!</p>`;
    for (const d of ds) {
      const b = await A.dbGet('blobs', 'd_' + d.id), u = b ? URL.createObjectURL(b) : ''; if (u) urls.push(u);
      const el = document.createElement('div'); el.className = 'it'; el.dataset.id = d.id; el.innerHTML = `<img alt="" ${u ? `src="${u}"` : ''}><div>${esc2(d.title)}<br><span style="color:var(--muted)">${A.dmy(d.ts)} · ${d.pages.length} trang</span></div><button class="it-more glassbtn" aria-label="Tuỳ chọn">${A.icon('more', 20, 2.2)}</button>`;
      el.onclick = e => { if (e.target.closest('.it-more')) { diaryMenu(d.id, null, e.target.closest('.it-more')); return; } A.closeModal(MD); openViewer(d.id); }; box.appendChild(el);
    }
    A.openModal(MD);
  }
  if (A.longPress) A.longPress(MD, '.dlist .it', el => diaryMenu(el.dataset.id, el));
  // ---------- tuỳ chọn một cuốn nhật ký (dùng chung: danh sách, trình xem, sách trên thẻ) ----------
  async function diaryMenu(id, el, at, pi) {
    const d = await A.dbGet('diaries', id); if (!d) return; clean(d);
    const multi = d.pages.filter(p => p.chap).length > 1;
    A.contextMenu({ el, at, title: esc2(d.title), items: [
      { icon: 'book', label: 'Xem nhật ký', act: () => { A.closeModal(MD); openViewer(id); } },
      { icon: 'edit', label: 'Sửa trang, lời thoại', act: () => { A.closeModal(MD); closeViewer(); openEditor(id); } },
      { icon: 'edit', label: 'Đổi tên cuốn', act: () => renameDiary(d) },
      { icon: 'image', label: pi != null ? `Đặt trang ${pi + 1} làm bìa` : 'Chọn trang làm bìa', act: () => pi != null ? setCover(d, pi) : pickCover(d) },
      pi != null && { icon: 'plus', label: `Nhân đôi trang ${pi + 1}`, act: () => dupPage(d, pi) },
      pi != null && d.pages.length > 1 && { icon: 'trash', label: `Xoá trang ${pi + 1}`, danger: true, act: () => delPage(d, pi) },
      multi && { icon: 'split', label: 'Tách mỗi ngày thành một cuốn', act: () => splitDiary(d) },
      { icon: 'trash', label: 'Xoá cả cuốn', danger: true, act: async () => { if (!(await A.ask('Xoá cuốn nhật ký này?', `“${d.title}” sẽ vào thùng rác 30 ngày (khôi phục được). Ảnh, video vẫn còn nguyên.`, 'Xoá cuốn', true))) return; A.closeModal(MD); closeViewer(); closeEditor(); await A.trashDiary(d); } }
    ] });
  }
  async function renameDiary(d) {
    const t = await A.prompt('Đổi tên nhật ký', d.title, 60); if (t == null) return;
    d.title = t.trim() || d.title; await saveDiary(d, true); A.toast('Đã đổi tên', 1400); if (V.d?.id === d.id) { BK.querySelector('.bkt').textContent = `${d.title} · ${A.dmy(d.ts)}`; openViewer(d.id); } if (MD.classList.contains('open')) openList();
  }
  async function setCover(d, pi) { d.cover = pi; await saveDiary(d, true); A.toast(`Đã đặt trang ${pi + 1} làm bìa`, 1600); if (MD.classList.contains('open')) openList(); }
  async function pickCover(d) {
    const items = d.pages.map((p, i) => ({ icon: i === (d.cover || 0) ? 'star' : 'image', label: `Trang ${i + 1}${p.chap ? ' · ' + A.dmy(A.parseYmd(p.chap)) : ''}${i === (d.cover || 0) ? ' (bìa hiện tại)' : ''}`, act: () => setCover(d, i) }));
    A.contextMenu({ title: 'Trang nào làm bìa?', items });
  }
  async function dupPage(d, pi) { d.pages.splice(pi + 1, 0, JSON.parse(JSON.stringify({ ...d.pages[pi], chap: undefined }))); await saveDiary(d, true); A.toast(`Đã nhân đôi trang ${pi + 1}`, 1500); if (V.d?.id === d.id) { const i = V.idx; await openViewer(d.id); V.idx = i; layout(); } }
  async function delPage(d, pi) {
    const old = JSON.parse(JSON.stringify(d)); const was = d.pages[pi]; d.pages.splice(pi, 1); if (was.chap && d.pages[pi] && !d.pages[pi].chap) d.pages[pi].chap = was.chap;
    if ((d.cover || 0) >= d.pages.length) d.cover = 0; await saveDiary(d, true);
    if (V.d?.id === d.id) await openViewer(d.id);
    A.undoToast(`Đã xoá trang ${pi + 1}`, async () => { await saveDiary(old, true); if (V.d?.id === d.id) openViewer(d.id); });
  }
  async function splitDiary(d) {
    const parts = []; let cur = null;
    for (const p of d.pages) { if (p.chap || !cur) { cur = { day: p.chap || d.day, pages: [] }; parts.push(cur); } cur.pages.push({ ...p, chap: undefined }); }
    for (const pt of parts) { const nd = { ...JSON.parse(JSON.stringify(d)), id: uid(), pages: pt.pages, cover: 0, day: pt.day, ts: A.parseYmd(pt.day) || d.ts, title: titleFor(A.kid().name) + ' · ' + A.dmy(A.parseYmd(pt.day) || d.ts).slice(0, 5), created: Date.now() }; await saveDiary(nd, true); }
    d.deleted = Date.now(); await A.dbPut('diaries', d); await A.onChange(null, true); closeViewer();
    A.toast(`Đã tách thành ${parts.length} cuốn`, 2000); if (MD.classList.contains('open')) openList();
  }
  const esc2 = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function openNew() { pickMode = 'new'; step('src'); A.openModal(MD); }
  MD.addEventListener('click', async e => {
    const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
    if (a === 'new') step('src');
    else if (a === 'files') MD.querySelector('.dfiles').click();
    else if (a === 'pick') openPicker('new');
    else if (a === 'pickok') { const ids = [...pickSel]; if (pickMode === 'new') await fromMoments(ids.map(momById).filter(Boolean)); else { A.closeModal(MD); pickCb?.(ids); } }
  });
  MD.querySelector('.dfiles').onchange = async e => {
    const files = [...e.target.files]; e.target.value = ''; if (!files.length) return;
    step('busy'); const t = MD.querySelector('.dbusyt'), pr = MD.querySelector('.dprog');
    try {
      const ids = await A.importFiles(files, (i, n) => { t.textContent = `Đang đọc ảnh ${i}/${n} và lưu vào dải ngân hà…`; pr.style.width = (i / n * 100) + '%'; });
      await fromMoments(ids.map(momById).filter(Boolean));
    } catch (er) { console.error(er); A.toast('Chưa đọc được ảnh: ' + er.message, 4000); step('src'); }
  };
  function openPicker(mode, cb, max = 40, single = false) {
    pickMode = mode; pickCb = cb; pickSel = new Set(); freeUrls(); step('pick');
    const ms = A.allMoments().filter(m => A.family?.() || A.kidsOf(m).includes(A.kid().id)).sort((a, b) => b.ts - a.ts), days = new Map();
    for (const m of ms) { const k = A.ymd(m.ts); if (!days.has(k)) days.set(k, []); days.get(k).push(m); }
    const box = MD.querySelector('.dpick'); box.innerHTML = '';
    const io = new IntersectionObserver(es => es.forEach(async en => { if (!en.isIntersecting) return; io.unobserve(en.target); const b = await A.dbGet('blobs', 't_' + en.target.dataset.id); if (b) { const u = URL.createObjectURL(b); urls.push(u); en.target.style.backgroundImage = `url("${u}")`; } }), { root: box });
    const upd = () => { const n = pickSel.size; MD.querySelector('.dcount').textContent = n ? `Đã chọn ${n} ảnh${!single && n > 20 ? ' (hơi nhiều, nên ≤ 20)' : ''}` : 'Chưa chọn ảnh nào'; MD.querySelector('[data-a=pickok]').disabled = !n; box.querySelectorAll('i').forEach(i => i.classList.toggle('on', pickSel.has(i.dataset.id))); };
    for (const [k, list] of days) {
      const sec = document.createElement('div');
      sec.innerHTML = `<div class="day"><span>${A.WD[new Date(list[0].ts).getDay()]} · ${A.dmy(list[0].ts)} · ${list.length} ảnh</span>${single ? '' : '<button data-day>Chọn cả ngày</button>'}</div><div class="grid">${list.map(m => `<i data-id="${m.id}" title="${hm(m.ts)}"></i>`).join('')}</div>`;
      sec.querySelector('[data-day]')?.addEventListener('click', () => { const all = list.every(m => pickSel.has(m.id)); list.forEach(m => all ? pickSel.delete(m.id) : pickSel.size < max && pickSel.add(m.id)); upd(); });
      sec.querySelectorAll('i').forEach(i => { io.observe(i); i.onclick = () => { const id = i.dataset.id; if (single) pickSel = new Set([id]); else if (pickSel.has(id)) pickSel.delete(id); else if (pickSel.size < max) pickSel.add(id); upd(); }; });
      box.appendChild(sec);
    }
    if (!ms.length) box.innerHTML = '<p class="hint">Chưa có khoảnh khắc nào — bạn chọn ảnh trong máy nhé.</p>';
    upd(); A.openModal(MD);
  }
  async function fromMoments(ms) {
    if (!ms.length) { step('src'); return; }
    const days = new Map(); for (const m of ms.sort((a, b) => a.ts - b.ts)) { const k = A.ymd(m.ts); if (!days.has(k)) days.set(k, []); days.get(k).push(m); }
    A.closeModal(MD);
    const d = await build(ms); await saveDiary(d, true);
    A.toast(days.size > 1 ? `Đã tạo 1 cuốn nhật ký ${days.size} chương (mỗi ngày một chương)` : 'Đã tạo nhật ký — bạn chỉnh lời, khung tuỳ thích nhé', 3500);
    openEditor(d.id);
  }
  // ---------- trình chỉnh trang ----------
  const E = { d: null, pi: 0, sel: null, geo: null, items: null, cache: new Map(), dirty: false, raf: 0, quick: false, drag: null };
  const cv = ED.querySelector('.dcv');
  async function openEditor(id) {
    const d = await A.dbGet('diaries', id); if (!d) return;
    E.d = clean(d); E.pi = 0; E.sel = null; E.dirty = false; E.cache.clear();
    ED.querySelector('.dti').value = d.title;
    ED.querySelector('.dai').hidden = !(await A.metaGet('geminiKey'));
    ED.classList.add('open'); document.body.classList.add('dopen');
    busy(true); await loadAll(d); if (!d.lv) layoutAuto(d, srcFn(false)); busy(false);
    for (const p of d.pages) for (const q of p.panels) await closeness(q.mid);
    strip(); edUi(); draw();
  }
  const busy = (on, t) => { const b = ED.querySelector('.dbusy'); b.textContent = t || 'Đang dựng trang…'; b.classList.toggle('on', on); };
  function edSize() {
    const stg = ED.querySelector('.dstage'), narrow = innerWidth <= 760;
    let w = narrow ? stg.clientWidth : Math.min(stg.clientWidth, stg.clientHeight * PW / PH);
    w = Math.max(200, Math.floor(w)); cv.style.width = w + 'px'; cv.style.height = Math.round(w * PH / PW) + 'px';
    return Math.min(PW, Math.round(w * Math.min(2, devicePixelRatio || 1))) / PW;
  }
  function draw(quick) {
    E.quick = E.quick || !!quick; if (E.raf) return;
    E.raf = requestAnimationFrame(() => {
      E.raf = 0; const q = E.quick; E.quick = false; if (!E.d?.pages[E.pi]) return;
      const r = renderPage(E.d, E.pi, { canvas: cv, scale: edSize(), mode: E.d.mode, src: srcFn(false), cache: E.cache, quick: q, sel: E.sel, header: header(E.d) });
      E.geo = r.geo; E.items = r.items;
    });
  }
  function edUi() {
    const d = E.d; ED.querySelector('.dpg').textContent = `Trang ${E.pi + 1} / ${d.pages.length}`;
    ED.querySelectorAll('.dmode button').forEach(b => b.classList.toggle('on', b.dataset.v === d.mode));
    const it = selItem(), sel = E.sel;
    ED.querySelector('.dsel').hidden = !it; ED.querySelector('.dselp').hidden = !(sel && !sel.kind);
    if (it) {
      ED.querySelector('.dselt').textContent = { bubble: 'Bong bóng đang chọn', caption: 'Ô chữ đang chọn', sfx: 'Tiếng động đang chọn' }[sel.kind];
      const tx = ED.querySelector('.dtx'); if (document.activeElement !== tx) tx.value = it.text || '';
      const cs = ED.querySelector('.dcolors'); cs.innerHTML = sel.kind === 'sfx' ? BANK.colors.map(c => `<i data-c="${c}" style="background:${c}" class="${it.color === c ? 'on' : ''}"></i>`).join('') : '';
    }
    if (sel && !sel.kind) { const p = curPanel(); ED.querySelector('[data-a=fx]').textContent = '✨ Hiệu ứng: ' + ({ focus: 'tia tập trung', speed: 'tia trắng', sparkle: 'lấp lánh' }[p?.fx] || 'không'); }
    strip(true);
  }
  const curPanel = () => E.sel ? E.d.pages[E.pi].panels[E.sel.p] : null;
  function selItem() { const s = E.sel, p = curPanel(); if (!s || !s.kind || !p) return null; return s.kind === 'caption' ? p.caption : s.kind === 'bubble' ? p.bubbles[s.i] : p.sfx[s.i]; }
  const dirty = () => { E.dirty = true; };
  // toạ độ trang
  const pagePt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * PW, (e.clientY - r.top) / r.height * PH]; };
  const inPoly = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c; } return c; };
  cv.addEventListener('pointerdown', e => {
    if (!E.geo) return; e.preventDefault(); cv.setPointerCapture(e.pointerId);
    const pt = pagePt(e), s = E.sel; let hit = null;
    if (s?.kind === 'bubble') { const it = E.items.find(t => t.p === s.p && t.kind === 'bubble' && t.i === s.i); if (it && Math.hypot(pt[0] - it.tail[0], pt[1] - it.tail[1]) < 34) hit = { ...s, tail: true }; }
    if (!hit) for (let k = E.items.length - 1; k >= 0; k--) { const t = E.items[k], b = t.box; if (pt[0] >= b.x - 6 && pt[0] <= b.x + b.w + 6 && pt[1] >= b.y - 6 && pt[1] <= b.y + b.h + 6) { hit = { p: t.p, kind: t.kind, i: t.i }; break; } }
    if (!hit) { const k = E.geo.findIndex(g => inPoly(pt, g.poly)); if (k >= 0) hit = { p: k }; }
    const was = E.sel && hit && E.sel.p === hit.p && E.sel.kind === hit.kind && E.sel.i === hit.i;
    E.sel = hit ? { p: hit.p, kind: hit.kind, i: hit.i } : null;
    E.drag = hit ? { hit, pt, moved: false, was, start: snap(hit) } : null;
    edUi(); draw();
  });
  function snap(h) {
    const p = E.d.pages[E.pi].panels[h.p]; if (!h.kind) return { ...(p.crop || {}) };
    const it = h.kind === 'caption' ? p.caption : h.kind === 'bubble' ? p.bubbles[h.i] : p.sfx[h.i]; return { ...it };
  }
  cv.addEventListener('pointermove', e => {
    const D = E.drag; if (!D) return;
    const pt = pagePt(e), dx = pt[0] - D.pt[0], dy = pt[1] - D.pt[1];
    if (!D.moved && Math.hypot(dx, dy) < 6) return; D.moved = true;
    const g = E.geo[D.hit.p], p = E.d.pages[E.pi].panels[D.hit.p];
    if (!D.hit.kind) { // kéo vùng cắt
      const src = srcFn(false)(p.mid); if (!src) return;
      const k = Math.max(g.bw / src.width, g.bh / src.height) * Math.max(1, p.crop?.z || 1), s0 = D.start;
      p.crop = { cx: clamp((s0.cx ?? .5) - dx / (src.width * k), 0, 1), cy: clamp((s0.cy ?? (src.height > src.width ? .4 : .5)) - dy / (src.height * k), 0, 1), z: s0.z || 1 };
      dirty(); draw(true); return;
    }
    const it = selItem(); if (!it) return; it.auto = false;
    if (D.hit.tail) { it.tu = D.start.tu + dx / g.bw; it.tv = D.start.tv + dy / g.bh; }
    else { it.u = D.start.u + dx / g.bw; it.v = D.start.v + dy / g.bh; if (D.hit.kind === 'bubble') { it.tu = D.start.tu + dx / g.bw; it.tv = D.start.tv + dy / g.bh; } }
    dirty(); draw();
  });
  const endDrag = () => {
    const D = E.drag; E.drag = null; if (!D) return;
    if (!D.hit.kind && D.moved) draw();
    if (D.hit.kind && !D.moved && D.was) { const tx = ED.querySelector('.dtx'); tx.focus(); tx.select(); }
  };
  cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);
  cv.addEventListener('dblclick', () => { if (selItem()) { const tx = ED.querySelector('.dtx'); tx.focus(); tx.select(); } });
  cv.addEventListener('wheel', e => { const p = curPanel(); if (!p || E.sel.kind) return; e.preventDefault(); zoom(e.deltaY < 0 ? 1.08 : 1 / 1.08); }, { passive: false });
  function zoom(f) { const p = curPanel(); if (!p) return; p.crop = { ...(p.crop || {}), z: clamp((p.crop?.z || 1) * f, 1, 3.5) }; dirty(); draw(); }
  ED.querySelector('.dtx').addEventListener('input', e => { const it = selItem(); if (!it) return; it.text = e.target.value; dirty(); draw(); });
  ED.querySelector('.dcolors').addEventListener('click', e => { const c = e.target.dataset.c, it = selItem(); if (!c || !it) return; it.color = c; dirty(); edUi(); draw(); });
  ED.querySelector('.dti').addEventListener('input', e => { E.d.title = e.target.value; dirty(); draw(); });
  ED.querySelector('.dmode').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; E.d.mode = b.dataset.v; dirty(); edUi(); busy(true, 'Đang đổi kiểu trang…'); setTimeout(() => { draw(); setTimeout(() => busy(false), 60); }, 30); });
  const flat = () => E.d.pages.flatMap((p, pi) => p.panels.map((q, k) => ({ q, pi, k })));
  function strip(onlySel) {
    const box = ED.querySelector('.dstrip');
    if (onlySel && box.children.length) { box.querySelectorAll('.th').forEach(t => t.classList.toggle('on', +t.dataset.pi === E.pi && E.sel && +t.dataset.k === E.sel.p)); return; }
    box.innerHTML = ''; let n = 0;
    E.d.pages.forEach((p, pi) => {
      box.insertAdjacentHTML('beforeend', `<div class="sep">Trang ${pi + 1}</div>`);
      p.panels.forEach((q, k) => { const c = srcFn(false)(q.mid), el = document.createElement('div'); el.className = 'th'; el.dataset.pi = pi; el.dataset.k = k; el.dataset.n = n++; el.innerHTML = `<b>${n}</b>`; if (c) el.style.backgroundImage = `url(${thumbURL(q.mid, c)})`; box.appendChild(el); });
    });
  }
  const TH = new Map();
  function thumbURL(mid, c) { if (TH.has(mid)) return TH.get(mid); const t = document.createElement('canvas'); t.width = t.height = 96; const x = t.getContext('2d'); const k = Math.max(96 / c.width, 96 / c.height); x.drawImage(c, (96 - c.width * k) / 2, (96 - c.height * k) / 2, c.width * k, c.height * k); const u = t.toDataURL('image/jpeg', .7); TH.set(mid, u); return u; }
  { // kéo thả đổi thứ tự khung (chuột lẫn cảm ứng)
    const box = ED.querySelector('.dstrip'); let drag = null;
    box.addEventListener('pointerdown', e => { const t = e.target.closest('.th'); if (!t) return; e.preventDefault(); drag = { t, from: +t.dataset.n, x: e.clientX, y: e.clientY, on: false, over: null }; box.setPointerCapture(e.pointerId); });
    box.addEventListener('pointermove', e => {
      if (!drag) return;
      if (!drag.on && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) { drag.on = true; drag.t.classList.add('drag'); drag.g = document.createElement('div'); drag.g.className = 'dghost'; drag.g.style.backgroundImage = drag.t.style.backgroundImage; document.body.appendChild(drag.g); }
      if (!drag.on) return;
      drag.g.style.left = e.clientX + 'px'; drag.g.style.top = e.clientY + 'px';
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('.dstrip .th');
      box.querySelectorAll('.over').forEach(x => x.classList.remove('over')); if (el && el !== drag.t) { el.classList.add('over'); drag.over = +el.dataset.n; } else drag.over = null;
    });
    const up = () => {
      if (!drag) return; const D = drag; drag = null; D.g?.remove(); box.querySelectorAll('.over,.drag').forEach(x => x.classList.remove('over', 'drag'));
      if (!D.on) { E.pi = +D.t.dataset.pi; E.sel = { p: +D.t.dataset.k }; edUi(); draw(); return; }
      if (D.over == null || D.over === D.from) return;
      movePanel(D.from, D.over);
    };
    box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
  }
  function movePanel(from, to) {
    const counts = E.d.pages.map(p => p.panels.length), list = flat().map(f => f.q);
    const [m] = list.splice(from, 1); list.splice(to, 0, m);
    let k = 0; E.d.pages.forEach((p, i) => { p.panels = list.slice(k, k + counts[i]); k += counts[i]; });
    let acc = 0; E.d.pages.forEach((p, i) => { if (to >= acc && to < acc + counts[i]) { E.pi = i; E.sel = { p: to - acc }; } acc += counts[i]; });
    dirty(); strip(); edUi(); draw(); A.toast('Đã đổi chỗ khung', 1200);
  }
  ED.addEventListener('click', async e => {
    const b = e.target.closest('button[data-a]'); if (!b || !E.d) return; const a = b.dataset.a, d = E.d, page = d.pages[E.pi];
    if (a === 'close') { if (!E.dirty || await A.ask('Bỏ các thay đổi?', 'Bạn chưa bấm Lưu. Đóng lại thì các chỉnh sửa vừa rồi sẽ mất.', 'Bỏ thay đổi', true)) closeEditor(); }
    else if (a === 'save') { busy(true, 'Đang lưu…'); await saveDiary(d); busy(false); E.dirty = false; A.toast('💾 Đã lưu nhật ký — quyển sách nhỏ đang nằm cạnh ngày ' + A.dmy(d.ts) + ' trong dải ngân hà', 3500); const id = d.id; closeEditor(); A.flyToBook?.(id); }
    else if (a === 'prev' || a === 'next') { E.pi = clamp(E.pi + (a === 'next' ? 1 : -1), 0, d.pages.length - 1); E.sel = null; edUi(); draw(); }
    else if (a === 'tpl') { const c = TEMPLATES[page.panels.length], i = c.findIndex(t => t.id === page.tpl); page.tpl = c[(i + 1) % c.length].id; page.seed = Math.floor(Math.random() * 1e6); dirty(); draw(); A.toast('🔀 Bố cục ' + ((i + 1) % c.length + 1) + '/' + c.length, 1100); }
    else if (a === 'delpg') {
      if (d.pages.length === 1) { A.toast('Nhật ký cần ít nhất 1 trang', 2000); return; }
      if (!(await A.ask('Bỏ trang này?', 'Các ảnh vẫn còn nguyên trong dải ngân hà, chỉ bỏ khỏi nhật ký.', 'Bỏ trang', true))) return;
      d.pages.splice(E.pi, 1); E.pi = Math.min(E.pi, d.pages.length - 1); E.sel = null; dirty(); strip(); edUi(); draw();
    } else if (a === 'addpg') {
      openPicker('page', async ids => {
        ids = ids.slice(0, 6); const ms = ids.map(momById).filter(Boolean).sort((x, y) => x.ts - y.ts); if (!ms.length) return;
        for (const m of ms) { await loadSrc(m.id); await closeness(m.id); }
        const R = rng(uid()), tmp = { id: uid(), roll: 0, pages: [{ tpl: pickTemplate(ms.map(m => ({ a: m.w && m.h ? m.w / m.h : 1.33, close: CLOSE.get(m.id) })), page.tpl, R), seed: Math.floor(R() * 1e6), panels: ms.map(m => ({ mid: m.id, crop: null })) }] };
        autoText(tmp, ctxFor(d)); d.pages.splice(E.pi + 1, 0, tmp.pages[0]); E.pi++; E.sel = null; dirty(); strip(); edUi(); draw();
      }, 6);
    } else if (a.startsWith('add-')) {
      const k = E.sel ? E.sel.p : 0, p = page.panels[k]; if (!p) return; const t = a.slice(4);
      if (t === 'cap') { if (p.caption) { E.sel = { p: k, kind: 'caption', i: 0 }; } else { p.caption = { text: `${timeVN(momById(p.mid)?.ts || Date.now())} · `, u: .035, v: .045 }; E.sel = { p: k, kind: 'caption', i: 0 }; } }
      else if (t === 'sfx') { p.sfx = p.sfx || []; p.sfx.push({ text: 'BÙM!', u: .5, v: .72, size: 100, angle: -8, color: BANK.colors[p.sfx.length % 6], auto: false }); E.sel = { p: k, kind: 'sfx', i: p.sfx.length - 1 }; }
      else {
        p.bubbles = p.bubbles || [];
        // tìm chỗ trống trong khung: ít đè lên chữ đã có nhất
        const g = E.geo[k], mine = E.items.filter(it => it.p === k), cand = [[.5, .22], [.28, .22], [.72, .22], [.5, .5], [.28, .72], [.72, .72], [.5, .78]];
        let best = cand[0], bs = 1e18;
        for (const [u, v] of cand) { const cx = g.bx + u * g.bw, cy = g.by + v * g.bh, bw = Math.min(260, g.bw * .55), bh = 90; let ov = 0; for (const it of mine) { const b = it.box; ov += Math.max(0, Math.min(cx + bw / 2, b.x + b.w) - Math.max(cx - bw / 2, b.x)) * Math.max(0, Math.min(cy + bh / 2, b.y + b.h) - Math.max(cy - bh / 2, b.y)); } if (ov < bs - 1) { bs = ov; best = [u, v]; } }
        p.bubbles.push({ text: t === 'shout' ? 'Oaaa!' : t === 'think' ? 'Hmm…' : 'Xin chào!', type: t, auto: false, u: best[0], v: best[1], tu: best[0] + (best[0] > .5 ? -.12 : .12), tv: best[1] + (best[1] > .5 ? -.2 : .22) });
        E.sel = { p: k, kind: 'bubble', i: p.bubbles.length - 1 };
      }
      dirty(); edUi(); draw(); const tx = ED.querySelector('.dtx'); setTimeout(() => { tx.focus(); tx.select(); }, 50);
    } else if (a === 'del-item') {
      const s = E.sel, p = curPanel(); if (!s?.kind || !p) return;
      if (s.kind === 'caption') p.caption = null; else if (s.kind === 'bubble') p.bubbles.splice(s.i, 1); else p.sfx.splice(s.i, 1);
      E.sel = { p: s.p }; dirty(); edUi(); draw();
    } else if (a === 'btype') { const it = selItem(); if (!it || E.sel.kind !== 'bubble') return; const o = ['say', 'shout', 'think']; it.type = o[(o.indexOf(it.type) + 1) % 3]; dirty(); draw(); A.toast({ say: 'Bong bóng thường', shout: 'Bong bóng hét', think: 'Bong bóng suy nghĩ' }[it.type], 1000); }
    else if (a === 'fs+' || a === 'fs-') { const it = selItem(); if (!it) return; if (E.sel.kind === 'sfx') it.size = clamp((it.size || 100) * (a === 'fs+' ? 1.15 : 1 / 1.15), 50, 200); else it.fs = clamp((it.fs || 1) * (a === 'fs+' ? 1.12 : 1 / 1.12), .65, 1.8); dirty(); draw(); }
    else if (a === 'duppg') { d.pages.splice(E.pi + 1, 0, JSON.parse(JSON.stringify({ ...page, chap: undefined }))); E.pi++; dirty(); strip(); edUi(); draw(); A.toast('Đã nhân đôi trang', 1200); }
    else if (a === 'coverpg') { d.cover = E.pi; dirty(); A.toast(`Trang ${E.pi + 1} sẽ làm bìa (bấm Lưu)`, 1600); }
    else if (a === 'zin' || a === 'zout') zoom(a === 'zin' ? 1.15 : 1 / 1.15);
    else if (a === 'fx') { const p = curPanel(); if (!p) return; const order = [null, 'focus', 'speed', 'sparkle']; p.fx = order[(order.indexOf(p.fx ?? null) + 1) % order.length]; dirty(); edUi(); draw(); }
    else if (a === 'swap') { const p = curPanel(); if (!p) return; openPicker('swap', async ids => { if (!ids[0]) return; await loadSrc(ids[0]); p.mid = ids[0]; p.crop = null; dirty(); strip(); draw(); }, 1, true); }
    else if (a === 'rmp') {
      const p = curPanel(); if (!p) return;
      page.panels.splice(E.sel.p, 1);
      if (!page.panels.length) { d.pages.splice(E.pi, 1); E.pi = Math.max(0, E.pi - 1); if (!d.pages.length) { A.toast('Nhật ký trống rồi — bấm “Xoá nhật ký này” nếu không cần nữa', 3000); } }
      else page.tpl = pickTemplate(page.panels.map(q => { const m = momById(q.mid); return { a: m?.w && m?.h ? m.w / m.h : 1.33, close: CLOSE.get(q.mid) }; }), null, rng(page.seed));
      E.sel = null; dirty(); strip(); edUi(); draw();
    } else if (a === 'reroll') { d.roll = (d.roll || 0) + 1; autoText(d, ctxFor(d)); E.sel = null; dirty(); edUi(); draw(); A.toast('🎲 Đã ghép lời mới — bấm nữa để đổi tiếp', 1600); }
    else if (a === 'ai') aiWrite(b);
    else if (a === 'deld') {
      if (!(await A.ask('Xoá nhật ký này?', 'Cuốn nhật ký vào thùng rác 30 ngày (khôi phục được). Ảnh, video vẫn còn nguyên.', 'Xoá nhật ký', true))) return;
      closeEditor(); await A.trashDiary(d);
    }
  });
  function closeEditor() { ED.classList.remove('open'); document.body.classList.remove('dopen'); E.d = null; E.cache.clear(); }
  addEventListener('resize', () => { if (E.d) draw(); });
  addEventListener('keydown', e => {
    if (BK.classList.contains('open')) { if (e.key === 'ArrowRight') { e.preventDefault(); e.stopImmediatePropagation(); flip(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopImmediatePropagation(); flip(-1); } else if (e.key === 'Escape') { e.stopImmediatePropagation(); closeViewer(); } }
    else if (E.d && e.key === 'Escape' && document.activeElement?.tagName !== 'TEXTAREA') { e.stopImmediatePropagation(); ED.querySelector('[data-a=close]').click(); }
  }, true);

  // ---------- AI viết lời (khoá Gemini của chính người dùng) ----------
  let MODEL = null;
  async function pickModel(key) {
    if (MODEL) return MODEL;
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', { headers: { 'x-goog-api-key': key } });
    if (!r.ok) throw await apiErr(r);
    const j = await r.json(), ok = (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent') && /gemini-[\d.]+-flash/.test(m.name) && !/image|tts|audio|live|embed|thinking|exp|preview|robotics|computer/.test(m.name));
    const ver = n => parseFloat((n.match(/gemini-([\d.]+)/) || [0, 0])[1]);
    ok.sort((a, b) => (/flash-lite/.test(b.name) - /flash-lite/.test(a.name)) || ver(b.name) - ver(a.name));
    MODEL = (ok[0]?.name || 'models/gemini-3.5-flash-lite').replace(/^models\//, '');
    return MODEL;
  }
  async function apiErr(r) {
    let msg = ''; try { msg = (await r.json()).error?.message || ''; } catch (e) { }
    if (r.status === 400 && /key/i.test(msg)) return new Error('Khoá API không đúng — bạn kiểm tra lại trong Cài đặt nhé');
    if (r.status === 401 || r.status === 403) return new Error('Khoá này chưa được phép dùng Gemini API — bạn kiểm tra lại khoá trong Google AI Studio');
    if (r.status === 429) return new Error('Khoá đã hết lượt dùng (hoặc gửi quá nhanh) — bạn thử lại sau ít phút');
    if (r.status >= 500) return new Error('Máy chủ Google đang bận — bạn thử lại sau nhé');
    return new Error('Gemini báo lỗi ' + r.status + (msg ? ': ' + msg.slice(0, 120) : ''));
  }
  const b64 = blob => new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(String(f.result).split(',')[1]); f.onerror = rej; f.readAsDataURL(blob); });
  async function aiWrite(btn) {
    const d = E.d, key = await A.metaGet('geminiKey'); if (!key) { A.toast('Bạn dán khoá Gemini trong Cài đặt trước nhé'); return; }
    const old = btn.textContent; btn.disabled = true; btn.textContent = '✨ AI đang viết…'; busy(true, '✨ AI đang xem ảnh và viết lời…');
    try {
      const model = await pickModel(key), kid = A.kid(), fl = flat();
      const parts = [{ text: `Bạn viết lời cho một cuốn nhật ký ảnh gia đình theo kiểu truyện tranh. Bé tên "${kid.name}", ${A.ageText(kid, d.ts, false) || 'chưa rõ tuổi'} ở ngày này (${A.dmy(d.ts)}). Có ${fl.length} khung ảnh theo thứ tự thời gian, mỗi khung kèm giờ chụp.
Hãy trả về JSON: title (tên nhật ký ngắn, ≤ 6 từ, có thể nhắc tên bé), panels (đúng ${fl.length} phần tử theo thứ tự khung): caption (lời dẫn ≤ 7 từ, KHÔNG ghi giờ), bubbles (0–1 bong bóng, mỗi cái ≤ 8 từ; type là say = lời nói, shout = hét vui, think = suy nghĩ), sfx (tiếng động ≤ 2 từ VIẾT HOA như "HÍ HÍ!", hoặc chuỗi rỗng).
Yêu cầu: tiếng Việt có dấu, dễ thương, tích cực, hợp tuổi bé (bé nhỏ thì lời ê a, ngộ nghĩnh); tả đúng những gì thấy trong ảnh; không bịa tên người khác; không dùng emoji, không dùng ký tự mũi tên.` }];
      for (let i = 0; i < fl.length; i++) {
        const m = momById(fl[i].q.mid), t = await A.dbGet('blobs', 't_' + fl[i].q.mid);
        parts.push({ text: `Khung ${i + 1} · ${m ? timeVN(m.ts) : ''}` });
        if (t) parts.push({ inline_data: { mime_type: 'image/jpeg', data: await b64(t) } });
      }
      const schema = { type: 'OBJECT', properties: { title: { type: 'STRING' }, panels: { type: 'ARRAY', items: { type: 'OBJECT', properties: { caption: { type: 'STRING' }, bubbles: { type: 'ARRAY', items: { type: 'OBJECT', properties: { text: { type: 'STRING' }, type: { type: 'STRING', enum: ['say', 'shout', 'think'] } }, required: ['text', 'type'] } }, sfx: { type: 'STRING' } }, required: ['caption', 'bubbles'] } } }, required: ['title', 'panels'] };
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: .9 } }) });
      if (!r.ok) throw await apiErr(r);
      const j = await r.json(), txt = j.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
      if (!txt) throw new Error(j.promptFeedback?.blockReason ? 'Gemini từ chối viết cho bộ ảnh này' : 'Gemini không trả lời — bạn thử lại nhé');
      const out = JSON.parse(txt); applyAI(d, out, fl); layoutAuto(d, srcFn(false));
      dirty(); edUi(); draw(); A.toast('✨ AI đã viết lời xong — bạn sửa thêm tuỳ thích', 2500);
    } catch (er) { console.warn(er); A.toast(er.name === 'TypeError' ? 'Không kết nối được tới Google — bạn kiểm tra mạng nhé' : er.message, 5000); }
    finally { btn.disabled = false; btn.textContent = old; busy(false); }
  }
  const tidy = s => String(s || '').replace(/[→←⇒]/g, '–').replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu, '').trim();
  function applyAI(d, out, fl) {
    if (tidy(out.title)) { d.title = tidy(out.title).slice(0, 60); ED.querySelector('.dti').value = d.title; }
    (out.panels || []).forEach((o, i) => {
      const f = fl[i]; if (!f) return; const p = f.q, m = momById(p.mid);
      const cap = tidy(o.caption);
      if (cap) p.caption = { u: .035, v: .045, ...(p.caption && !p.caption.dark ? p.caption : {}), dark: false, text: `${m ? timeVN(m.ts) : ''} · ${cap}` };
      const bs = (o.bubbles || []).filter(b => tidy(b.text)).slice(0, 2), old = p.bubbles || [];
      p.bubbles = bs.map((b, k) => ({ ...(old[k] || { u: k ? .3 : .7, v: .22, tu: k ? .45 : .55, tv: .46 }), text: tidy(b.text).slice(0, 60), type: ['say', 'shout', 'think'].includes(b.type) ? b.type : 'say' }));
      const sx = tidy(o.sfx);
      if (sx) { p.sfx = p.sfx?.length ? [{ ...p.sfx[0], text: sx.slice(0, 16) }] : [{ text: sx.slice(0, 16), u: .3, v: .76, size: 100, angle: -8, color: BANK.colors[i % 6] }]; } else p.sfx = [];
    });
  }

  // ---------- trình xem: lật trang kiểu cuốn sách ----------
  const V = { d: null, urls: [], idx: 0, spread: false, busy: false, auto: null };
  const book = BK.querySelector('.book');
  async function renderAllPages(d) {
    await loadAll(d); if (!d.lv) layoutAuto(d, srcFn(false)); const out = [];
    const sc = Math.min(1, Math.max(.5, (innerHeight * Math.min(2, devicePixelRatio || 1)) / PH));
    for (let i = 0; i < d.pages.length; i++) {
      const r = renderPage(d, i, { scale: sc, mode: d.mode, src: srcFn(false), header: header(d) });
      const b = await new Promise(res => r.canvas.toBlob(res, 'image/jpeg', .9)); out.push(URL.createObjectURL(b));
      if (i === 0) { V.urls = out; layout(); }
      await new Promise(res => setTimeout(res, 0));
    }
    return out;
  }
  async function openViewer(id, opt = {}) {
    const d = await A.dbGet('diaries', id); if (!d) return; clean(d);
    if (!d.pages.length) { A.toast('Nhật ký này không còn ảnh nào'); return; }
    V.d = d; V.idx = 0; V.urls = []; V.auto = opt.auto || null; V.onClose = opt.onClose;
    BK.querySelector('.bkt').textContent = `${d.title} · ${A.dmy(d.ts)}`;
    BK.classList.toggle('auto', !!opt.auto); BK.classList.add('open'); document.body.classList.add('dopen');
    book.innerHTML = ''; layout();
    V.urls = await renderAllPages(d); layout();
    if (V.auto) { let n = 0; const max = Math.min(opt.auto.flips || 3, d.pages.length - 1); const tick = () => { if (!BK.classList.contains('open') || V.d !== d) return; if (n++ < max) { flip(1); setTimeout(tick, 1500); } else setTimeout(() => { if (V.d === d) closeViewer(); }, 1100); }; setTimeout(tick, 1300); }
  }
  function closeViewer() {
    if (!BK.classList.contains('open')) return;
    BK.classList.remove('open'); document.body.classList.remove('dopen'); const urls = V.urls, cb = V.onClose; V.d = null;
    setTimeout(() => { urls.forEach(u => URL.revokeObjectURL(u)); if (!BK.classList.contains('open')) book.innerHTML = ''; }, 600); cb?.();
  }
  const pageUrl = i => V.urls[i] || '';
  function dims() {
    const stg = BK.querySelector('.bkstage'), W0 = stg.clientWidth - 20, H0 = stg.clientHeight - 36;
    V.spread = W0 / H0 > 1.05 && V.d.pages.length > 1;
    const pw = Math.min(H0 * PW / PH, V.spread ? W0 / 2 : W0); return { pw, ph: pw * PH / PW };
  }
  const nSpreads = () => V.spread ? Math.floor(V.d.pages.length / 2) + 1 : V.d.pages.length;
  const spreadPages = s => V.spread ? [s * 2 - 1, s * 2] : [null, s];
  function layout() {
    if (!V.d) return; const { pw, ph } = dims();
    V.idx = clamp(V.idx, 0, nSpreads() - 1);
    book.className = 'book' + (V.spread ? '' : ' single'); book.style.width = (V.spread ? pw * 2 : pw) + 'px'; book.style.height = ph + 'px';
    const [L, R] = spreadPages(V.idx), N = V.d.pages.length;
    const pg = (i, side) => i == null ? '' : i < 0 || i >= N ? (V.spread ? `<div class="pg ${side} blank" style="${side === 'L' ? 'left:0' : `left:${pw}px`};width:${pw}px"></div>` : '') : `<div class="pg ${side}" style="left:${side === 'L' ? 0 : V.spread ? pw : 0}px;width:${pw}px;background-image:url(${pageUrl(i)})"></div>`;
    book.innerHTML = (V.spread ? pg(L, 'L') : '') + pg(R, 'R') + (V.spread ? `<div class="spine" style="left:${pw}px"></div>` : '');
    BK.querySelector('.bkpg').textContent = V.spread ? (L >= 0 && R < N ? `Trang ${L + 1}–${R + 1} / ${N}` : `Trang ${Math.max(L, 0) + 1} / ${N}`.replace('Trang 0', 'Trang 1')) : `Trang ${R + 1} / ${N}`;
    BK.querySelector('[data-a=bprev]').style.opacity = V.idx > 0 ? 1 : .3; BK.querySelector('[data-a=bnext]').style.opacity = V.idx < nSpreads() - 1 ? 1 : .3;
  }
  function rustle() {
    if (A.MUTE) return; const ac = A.audio(); if (!ac) return; try { ac.resume(); } catch (e) { }
    const t = ac.currentTime, len = .55, buf = ac.createBuffer(1, Math.floor(ac.sampleRate * len), ac.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) { const k = i / ch.length; ch[i] = (Math.random() * 2 - 1) * Math.pow(Math.sin(Math.PI * k), 1.5) * (.6 + .4 * Math.random()); }
    const s = ac.createBufferSource(); s.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = .7; f.frequency.setValueAtTime(1600, t); f.frequency.linearRampToValueAtTime(4200, t + len);
    const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.16, t + .08); g.gain.exponentialRampToValueAtTime(.001, t + len);
    s.connect(f); f.connect(g); g.connect(ac.destination); s.start(t); s.stop(t + len + .05);
  }
  function flip(dir) {
    if (!V.d || V.busy) return;
    const to = V.idx + dir; if (to < 0 || to >= nSpreads()) return;
    const { pw, ph } = dims(), N = V.d.pages.length, dur = matchMedia('(prefers-reduced-motion: reduce)').matches ? 10 : 850;
    V.busy = true; rustle();
    const [cL, cR] = spreadPages(V.idx), [nL, nR] = spreadPages(to);
    const face = i => i == null || i < 0 || i >= N ? 'background:linear-gradient(90deg,#efe6d7,#fbf7ee)' : `background-image:url(${pageUrl(i)})`;
    // nền dưới tờ đang lật
    const left = V.spread ? pw : 0;
    const under = dir > 0 ? (V.spread ? [cL, nR] : [null, nR]) : (V.spread ? [nL, cR] : [null, cR]);
    const pg = (i, side) => i == null ? '' : `<div class="pg ${side}${i < 0 || i >= N ? ' blank' : ''}" style="left:${side === 'L' ? 0 : left}px;width:${pw}px;${face(i)}"></div>`;
    book.innerHTML = (V.spread ? pg(under[0], 'L') : '') + pg(under[1], 'R') + (V.spread ? `<div class="spine" style="left:${pw}px"></div>` : '');
    const leaf = document.createElement('div'); leaf.className = 'leaf'; leaf.style.cssText = `left:${left}px;width:${pw}px;--dur:${dur}ms`;
    const fr = dir > 0 ? cR : nR, bk = dir > 0 ? (V.spread ? nL : null) : (V.spread ? cL : null);
    leaf.innerHTML = `<div class="f" style="${face(fr)}"><div class="sh"></div></div><div class="b" style="${face(bk)}"><div class="sh"></div></div>`;
    leaf.style.transform = dir > 0 ? 'rotateY(0deg)' : 'rotateY(-180deg)';
    book.appendChild(leaf); void leaf.offsetWidth;
    leaf.style.transition = `transform ${dur}ms cubic-bezier(.35,.1,.25,1)`; leaf.classList.add('go');
    leaf.style.transform = dir > 0 ? 'rotateY(-180deg)' : 'rotateY(0deg)';
    setTimeout(() => { V.idx = to; V.busy = false; layout(); }, dur + 20);
  }
  BK.addEventListener('click', async e => {
    const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
    if (a === 'close') closeViewer();
    else if (a === 'bnext') flip(1); else if (a === 'bprev') flip(-1);
    else if (a === 'edit') { const id = V.d.id; closeViewer(); openEditor(id); }
    else if (a === 'more') { const [L, R] = spreadPages(V.idx), N = V.d.pages.length; diaryMenu(V.d.id, null, b, R != null && R < N ? R : L); }
    else if (a === 'dl') {
      const [L, R] = spreadPages(V.idx), N = V.d.pages.length, i = R != null && R < N ? R : L;
      const r = renderPage(V.d, i, { scale: 1, mode: V.d.mode, src: srcFn(false), header: header(V.d) });
      const blob = await new Promise(res => r.canvas.toBlob(res, 'image/jpeg', .92));
      const name = `NhatKy-${A.noAccent(A.kid().name)}-${V.d.day}-trang-${i + 1}.jpg`;
      await A.shareOrDownload(new File([blob], name, { type: 'image/jpeg' }), name);
      if (!A.TEST) A.toast('Đã lưu trang ' + (i + 1), 1800);
    }
  });
  { // vuốt / chạm nửa trái-phải để lật
    const stg = BK.querySelector('.bkstage'); let sx = 0, sy = 0, on = false;
    stg.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; on = true; sx = e.clientX; sy = e.clientY; });
    stg.addEventListener('pointerup', e => {
      if (!on) return; on = false; const dx = e.clientX - sx, dy = e.clientY - sy;
      if (V.auto) { closeViewer(); return; }
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) flip(dx < 0 ? 1 : -1);
      else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) { const r = book.getBoundingClientRect(); if (e.clientX > r.left + r.width / 2) flip(1); else flip(-1); }
    });
  }
  addEventListener('resize', () => { if (V.d && !V.busy) layout(); });

  return {
    openList, openNew, openEditor, openViewer, closeViewer, build, saveDiary, renderPage, header, autoText, pickModel, applyAI,
    get viewer() { return V; }, get editor() { return E; }, isOpen: () => BK.classList.contains('open') || ED.classList.contains('open'),
    diaryMenu, renameDiary, splitDiary,
    setAiVisible: v => { ED.querySelector('.dai').hidden = !v; }, resetModel: () => { MODEL = null; }, movePanel, draw
  };
}
