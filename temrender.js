// Hành Trình Của Bạn — TEM NƠI CHỐN: mô hình dữ liệu (JSON, lưu được thành "mẫu của tôi") + bộ vẽ Canvas 2D cho 7 mẫu.
// Một hàm vẽ duy nhất dùng chung cho xem trước (DOM chỉ là lớp chạm phía trên) và xuất PNG / từng khung MP4.
// Mọi kích thước tính theo đơn vị u = W / 1080 nên xem trước nhỏ và bản xuất 1080 px giống hệt nhau.

export const FONTS = [{ k: 'Quicksand', t: 'Quicksand' }, { k: 'Be Vietnam Pro', t: 'Be Vietnam' }, { k: 'Playfair Display', t: 'Playfair' }, { k: 'Dancing Script', t: 'Viết tay' }, { k: 'Patrick Hand', t: 'Nét bút' }];
export const PALETTE = ['#ea4335', '#ff5f9e', '#ff8a3d', '#fbbc04', '#34a853', '#00a3a3', '#1a73e8', '#8e5cf7', '#c28b52', '#3c4043'];
export const TPLS = [
  { k: 'gmaps', t: 'Google Maps', map: 1, font: 'Quicksand', color: '#ea4335' },
  { k: 'postal', t: 'Tem bưu điện', map: 0, font: 'Playfair Display', color: '#c0392b' },
  { k: 'polaroid', t: 'Polaroid', map: 0, font: 'Dancing Script', color: '#ff5f9e' },
  { k: 'ticket', t: 'Vé du lịch', map: 1, font: 'Be Vietnam Pro', color: '#1a73e8' },
  { k: 'minimal', t: 'Tối giản', map: 1, font: 'Be Vietnam Pro', color: '#ff5f9e' },
  { k: 'journal', t: 'Nhật ký', map: 1, font: 'Patrick Hand', color: '#ff8a3d', stickers: [{ k: '⭐', x: .86, y: .1, s: .8, r: 12 }, { k: 'svg:heart', x: .14, y: .9, s: .8, r: -10 }] },
  { k: 'glass', t: 'Kính mờ iOS', map: 1, font: 'Quicksand', color: '#8e5cf7' }
];
export const RATIOS = { '916': [1080, 1920], '45': [1080, 1350], '11': [1080, 1080] };
export const TEXT_KEYS = { name: 'Tên nơi', sub: 'Dòng phụ', date: 'Ngày giờ', note: 'Lời nhắn', from: 'Từ', to: 'Đến' };
export const tplOf = k => TPLS.find(t => t.k === k) || TPLS[0];
export function defModel(tpl = 'gmaps', keep = {}) {
  const T = tplOf(tpl);
  return { v: 1, tpl: T.k, ratio: keep.ratio || '916', color: T.color, font: null, size: 1, radius: 1, show: { map: true, date: true, people: true, addr: true, note: true, logo: true }, text: {}, photos: keep.photos || [], stickers: JSON.parse(JSON.stringify(T.stickers || [])) };
}
export const fontOf = M => M.font || tplOf(M.tpl).font;

// ---------- sticker SVG tự vẽ ----------
export const STK_SVG = {
  pin: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 95S18 60 18 38a32 32 0 0 1 64 0c0 22-32 57-32 57z" fill="#ea4335" stroke="#fff" stroke-width="5"/><circle cx="50" cy="38" r="12" fill="#fff"/></svg>',
  heart: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 88S10 62 10 34a20 20 0 0 1 40-4 20 20 0 0 1 40 4c0 28-40 54-40 54z" fill="#ff5f9e" stroke="#fff" stroke-width="5"/><ellipse cx="32" cy="34" rx="7" ry="5" fill="#fff" opacity=".6"/></svg>',
  cloud: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><path d="M30 70a22 22 0 0 1-2-44 28 28 0 0 1 53-6 20 20 0 0 1 11 50z" fill="#fff" stroke="#9ec9ff" stroke-width="4"/></svg>',
  checkin: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 80"><rect x="4" y="4" width="212" height="72" rx="36" fill="#1a73e8" stroke="#fff" stroke-width="6"/><path d="M34 40l10 10 18-20" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><text x="128" y="52" font-family="Arial, sans-serif" font-size="30" font-weight="800" fill="#fff" text-anchor="middle">CHECK-IN</text></svg>',
  star: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 6l13 28 30 3-23 20 7 30-27-16-27 16 7-30L7 37l30-3z" fill="#ffd36b" stroke="#fff" stroke-width="5" stroke-linejoin="round"/></svg>',
  sparkle: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 4c4 26 20 42 46 46-26 4-42 20-46 46-4-26-20-42-46-46 26-4 42-20 46-46z" fill="#c3a6ff" stroke="#fff" stroke-width="4"/></svg>'
};
export const STK_EMOJI = ['☕', '🍜', '📍', '❤️', '⭐', '✨', '🌸', '🎉', '🏖️', '⛰️', '🍦', '📸', '🥰', '🎂', '🌈', '✈️'];
export const stkURL = k => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(STK_SVG[k]);

// ---------- tiện ích vẽ ----------
const pad = n => String(n).padStart(2, '0');
const WD = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
export const autoDate = ts => { const d = new Date(ts); return `${WD[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
function rr(x, X, Y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
const mix = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function wrapLines(x, text, maxW, maxL) {
  const out = []; for (const para of String(text || '').split(/\n/)) { let line = ''; for (const w of para.split(/\s+/).filter(Boolean)) { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; } if (line) out.push(line); }
  if (out.length > maxL) { out.length = maxL; let l = out[maxL - 1]; while (l && x.measureText(l + '…').width > maxW) l = l.replace(/\s*\S*$/, ''); out[maxL - 1] = (l || '') + '…'; }
  return out;
}
// ảnh "phủ kín" có kéo / phóng (p.z, p.x, p.y theo tỉ lệ khung); trả lại vị trí đã kẹp để không hở mép
function drawCover(x, img, X, Y, w, h, r, p = {}) {
  const iw = img.videoWidth || img.width, ih = img.videoHeight || img.height; if (!iw || !ih) return;
  const k = Math.max(w / iw, h / ih) * Math.max(1, p.z || 1), dw = iw * k, dh = ih * k, mx = (dw - w) / 2, my = (dh - h) / 2;
  const ox = Math.max(-mx, Math.min(mx, (p.x || 0) * w)), oy = Math.max(-my, Math.min(my, (p.y || 0) * h));
  x.save(); rr(x, X, Y, w, h, r); x.clip(); x.drawImage(img, X + (w - dw) / 2 + ox, Y + (h - dh) / 2 + oy, dw, dh); x.restore();
}
function blurred(img, W, H) { // làm mờ bằng thu nhỏ rồi phóng lại (Safari không có ctx.filter)
  const t = document.createElement('canvas'), k = 28; t.width = Math.max(2, Math.round(W / k)); t.height = Math.max(2, Math.round(H / k)); const tx = t.getContext('2d'), iw = img.videoWidth || img.width, ih = img.videoHeight || img.height, s = Math.max(t.width / iw, t.height / ih);
  tx.drawImage(img, (t.width - iw * s) / 2, (t.height - ih * s) / 2, iw * s, ih * s); return t;
}

// ---------- VẼ TEM ----------
// M: mô hình; R: { e, info, map, imgs: Map(mid → ảnh), avatars: [{ img, name }], auto: { name, sub, date, note, from, to } }
// opt: { frame (khung video thay ảnh chính), stickers: true (vẽ sticker), stk: Map(k → Image) }. Trả { texts, photos } (toạ độ px) để dựng lớp chạm.
export function renderStamp(x, M, R, W, H, opt = {}) {
  const u = W / 1080, s = M.size || 1, rad = M.radius ?? 1, A = M.color || '#ea4335', fam = fontOf(M), sh = M.show || {}, regs = { texts: [], photos: [] };
  const F = (w, px) => `${w} ${Math.round(px)}px "${fam}", Quicksand, system-ui, sans-serif`;
  const T = k => (M.text?.[k] ?? R.auto?.[k] ?? '');
  // chữ: vẽ + ghi vùng chạm (sửa trực tiếp)
  const txt = (k, X, Y, maxW, { px = 40, w = 700, c = '#202124', al = 'left', lines = 1, lh = 1.22, sh: shadow } = {}) => {
    const v = T(k); x.font = F(w, px * s * u); x.textAlign = al; x.textBaseline = 'alphabetic'; x.fillStyle = c;
    const L = v ? wrapLines(x, v, maxW, lines) : [], hh = px * s * u * lh;
    if (shadow) { x.save(); x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 12 * u; }
    L.forEach((l, i) => x.fillText(l, X, Y + i * hh)); if (shadow) x.restore();
    const bx = al === 'center' ? X - maxW / 2 : al === 'right' ? X - maxW : X;
    regs.texts.push({ k, x: bx, y: Y - px * s * u * .95, w: maxW, h: Math.max(1, L.length) * hh, px: px * s * u, w8: w, c, al, multi: lines > 1 });
    return Math.max(1, L.length) * hh;
  };
  const photoSrc = i => { const p = M.photos?.[i]; if (!p) return null; return i === 0 && opt.frame ? opt.frame : R.imgs?.get(p.mid) || null; };
  const photo = (i, X, Y, w, h, r) => {
    const img = photoSrc(i), p = M.photos?.[i] || {};
    if (img) drawCover(x, img, X, Y, w, h, r, p); else { x.save(); rr(x, X, Y, w, h, r); x.fillStyle = '#e8e6ee'; x.fill(); x.fillStyle = '#9a8fb0'; x.font = F(600, 40 * u); x.textAlign = 'center'; x.fillText('+ ảnh', X + w / 2, Y + h / 2); x.restore(); }
    if (M.photos?.[i] && R.isVideo?.(i) && !opt.frame) { x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.arc(X + 50 * u, Y + 50 * u, 28 * u, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(X + 42 * u, Y + 36 * u); x.lineTo(X + 64 * u, Y + 50 * u); x.lineTo(X + 42 * u, Y + 64 * u); x.closePath(); x.fill(); }
    regs.photos.push({ i, x: X, y: Y, w, h });
  };
  const grid = (X, Y, w, h, r) => { // 1 ảnh | 1 lớn + 1 | 1 lớn + 2 nhỏ (kiểu Google)
    const n = Math.max(1, Math.min(3, M.photos?.length || 1)), g = 16 * u;
    if (n === 1) photo(0, X, Y, w, h, r);
    else if (n === 2) { photo(0, X, Y, (w - g) / 2, h, r); photo(1, X + (w + g) / 2, Y, (w - g) / 2, h, r); }
    else { const bw = (w - g) * .62; photo(0, X, Y, bw, h, r); photo(1, X + bw + g, Y, w - bw - g, (h - g) / 2, r); photo(2, X + bw + g, Y + (h + g) / 2, w - bw - g, (h - g) / 2, r); }
  };
  const people = (X, Y, c = '#3c4043', size = 60) => {
    if (!sh.people || !R.avatars?.length) return 0; let ax = X; const z = size * u;
    for (const a of R.avatars.slice(0, 6)) { if (a.img) { x.save(); x.beginPath(); x.arc(ax + z / 2, Y + z / 2, z / 2, 0, 7); x.clip(); x.drawImage(a.img, ax, Y, z, z); x.restore(); x.strokeStyle = '#fff'; x.lineWidth = 4 * u; x.beginPath(); x.arc(ax + z / 2, Y + z / 2, z / 2, 0, 7); x.stroke(); } ax += z * .76; }
    x.fillStyle = c; x.font = F(600, 32 * s * u); x.textAlign = 'left'; x.fillText(R.avatars.slice(0, 3).map(a => a.name).join(', ') + (R.avatars.length > 3 ? ` +${R.avatars.length - 3}` : ''), ax + z * .5, Y + z * .68, W - ax - z - 60 * u);
    return z + 20 * u;
  };
  const mapImg = (X, Y, w, h, r, circle) => { if (!sh.map || !R.map) return false; x.save(); if (circle) { x.beginPath(); x.arc(X + w / 2, Y + h / 2, w / 2, 0, 7); } else rr(x, X, Y, w, h, r); x.clip(); const k = Math.max(w / R.map.width, h / R.map.height); x.drawImage(R.map, X + (w - R.map.width * k) / 2, Y + (h - R.map.height * k) / 2, R.map.width * k, R.map.height * k); x.restore(); pinAt(X + w / 2, Y + h / 2 + 10 * u, circle ? .6 : .8); return true; };
  const pinAt = (X, Y, k = 1) => { const z = u * k; x.save(); x.shadowColor = 'rgba(0,0,0,.3)'; x.shadowBlur = 14 * z; x.fillStyle = A === '#ffffff' ? '#ea4335' : A; x.beginPath(); x.arc(X, Y - 46 * z, 34 * z, Math.PI * .85, Math.PI * .15); x.lineTo(X, Y); x.closePath(); x.fill(); x.restore(); x.fillStyle = '#fff'; x.beginPath(); x.arc(X, Y - 48 * z, 12 * z, 0, 7); x.fill(); };
  const logo = (c, Y = H - 40 * u, al = 'center', X = W / 2) => { const osm = sh.map && R.map && tplOf(M.tpl).map; if (!sh.logo && !osm) return; x.fillStyle = c; x.font = `600 ${Math.round(24 * u)}px Quicksand, sans-serif`; x.textAlign = al; x.fillText([sh.logo ? 'Hành Trình Của Bạn' : '', osm ? 'bản đồ © OpenStreetMap' : ''].filter(Boolean).join(' · '), X, Y); x.textAlign = 'left'; };
  const n = Math.max(1, M.photos?.length || 1), pd = 64 * u, tall = H / W;
  x.save();
  switch (M.tpl) {
    case 'postal': {
      x.fillStyle = '#efe6d6'; x.fillRect(0, 0, W, H);
      const m = 70 * u, sx = m, sy = m + 20 * u, sw = W - 2 * m, shh = H - 2 * m - 70 * u;
      x.save(); x.shadowColor = 'rgba(80,50,20,.22)'; x.shadowBlur = 30 * u; x.fillStyle = '#fffdf8'; x.fillRect(sx, sy, sw, shh); x.restore();
      x.fillStyle = '#efe6d6'; const pr = 15 * u, st = 44 * u; for (let px = sx; px <= sx + sw; px += st) { x.beginPath(); x.arc(px, sy, pr, 0, 7); x.arc(px, sy + shh, pr, 0, 7); x.fill(); } for (let py = sy; py <= sy + shh; py += st) { x.beginPath(); x.arc(sx, py, pr, 0, 7); x.arc(sx + sw, py, pr, 0, 7); x.fill(); }
      const ip = 52 * u, ix = sx + ip, iy = sy + ip, iw = sw - 2 * ip, ph = shh * (tall > 1.6 ? .56 : tall > 1.2 ? .5 : .44);
      x.strokeStyle = mix(A, '#ffffff', .3); x.lineWidth = 3 * u; x.strokeRect(ix - 10 * u, iy - 10 * u, iw + 20 * u, ph + 20 * u);
      grid(ix, iy, iw, ph, 6 * u * rad);
      x.fillStyle = A; x.font = `800 ${Math.round(30 * u)}px "${fam}", Quicksand, sans-serif`; x.fillText('VIỆT NAM', ix, iy + ph + 66 * u);
      let y = iy + ph + 150 * u; y += txt('name', ix, y, iw - 120 * u, { px: 72, w: 700, c: mix(A, '#000000', .35), lines: 2 });
      if (sh.addr) y += txt('sub', ix, y + 4 * u, iw, { px: 34, w: 500, c: '#6b5a4a', lines: 2 }) + 6 * u;
      if (sh.note) y += txt('note', ix, y + 30 * u, iw, { px: 36, w: 500, c: '#4a3a2a', lines: 3, lh: 1.35 });
      y += 20 * u; people(ix, Math.min(y, sy + shh - 130 * u), '#4a3a2a', 56);
      // dấu bưu điện tròn: tên nơi + ngày, nghiêng
      const cx = sx + sw - 190 * u, cy = iy + ph - 50 * u, R1 = 125 * u; x.save(); x.translate(cx, cy); x.rotate(-.24); x.globalAlpha = .85; x.strokeStyle = A; x.lineWidth = 6 * u; x.beginPath(); x.arc(0, 0, R1, 0, 7); x.stroke(); x.lineWidth = 3 * u; x.beginPath(); x.arc(0, 0, R1 - 18 * u, 0, 7); x.stroke();
      for (let k = 0; k < 4; k++) { x.beginPath(); for (let t = 0; t <= 1; t += .05) { const px = -R1 - 260 * u + t * 230 * u, py = -36 * u + k * 24 * u + Math.sin(t * 12) * 8 * u; t ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); }
      x.fillStyle = A; x.textAlign = 'center'; x.font = `800 ${Math.round(30 * u)}px "${fam}", Quicksand, sans-serif`; const nm = T('name').toUpperCase(); x.fillText(nm.length > 16 ? nm.slice(0, 15) + '…' : nm, 0, -18 * u, R1 * 1.6);
      if (sh.date) { const d = new Date(R.e?.ts0 || Date.now()); x.font = `700 ${Math.round(34 * u)}px Quicksand, sans-serif`; x.fillText(`${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`, 0, 30 * u); }
      x.restore(); if (sh.date) regs.texts.push({ k: 'date', x: cx - R1, y: cy - R1, w: R1 * 2, h: R1 * 2, px: 34 * u, w8: 700, c: A, al: 'center' });
      logo('#8a7a6a', H - 36 * u); break;
    }
    case 'polaroid': {
      const g = x.createLinearGradient(0, 0, W * .3, H); g.addColorStop(0, mix(A, '#ffffff', .78)); g.addColorStop(1, mix(A, '#ffffff', .93)); x.fillStyle = g; x.fillRect(0, 0, W, H);
      const cw = W * .8, cx = (W - cw) / 2, bd = 44 * u, pw = cw - 2 * bd, ph = pw * (tall > 1.6 ? 1.12 : tall > 1.2 ? .92 : .7), ch = ph + bd + 230 * u, cy = Math.max(110 * u, (H - ch) * (tall > 1.2 ? .32 : .2));
      x.save(); x.translate(W / 2, cy + ch / 2); x.rotate(-.04); x.translate(-W / 2, -(cy + ch / 2));
      x.save(); x.shadowColor = 'rgba(0,0,0,.25)'; x.shadowBlur = 40 * u; x.shadowOffsetY = 16 * u; x.fillStyle = '#fffdf9'; x.fillRect(cx, cy, cw, ch); x.restore();
      grid(cx + bd, cy + bd, pw, ph, 4 * u * rad);
      txt('name', W / 2, cy + bd + ph + 110 * u, pw, { px: 76, w: 700, c: '#3a3236', al: 'center' });
      if (sh.date) txt('date', W / 2, cy + bd + ph + 175 * u, pw, { px: 38, w: 600, c: '#8a7a80', al: 'center' });
      x.restore();
      x.save(); x.translate(W / 2, cy); x.rotate(-.08); x.globalAlpha = .82; x.fillStyle = mix(A, '#ffffff', .45); x.fillRect(-120 * u, -28 * u, 240 * u, 62 * u); x.restore(); // băng dính
      let y = cy + ch + 90 * u;
      if (sh.addr) y += txt('sub', W / 2, y, W - 2 * pd, { px: 36, w: 600, c: mix(A, '#000000', .45), al: 'center', lines: 2 }) + 14 * u;
      if (sh.note && y < H - 200 * u) y += txt('note', W / 2, y + 10 * u, W - 2 * pd, { px: 46, w: 600, c: '#3a3236', al: 'center', lines: tall > 1.6 ? 4 : 2, lh: 1.3 }) + 20 * u;
      if (y < H - 140 * u) people(pd, y, '#3a3236', 56);
      logo('rgba(60,40,50,.5)'); break;
    }
    case 'ticket': {
      const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, A); g.addColorStop(1, mix(A, '#000000', .35)); x.fillStyle = g; x.fillRect(0, 0, W, H);
      const tx = 60 * u, ty = 110 * u, tw = W - 120 * u, th = H - 200 * u, r0 = 44 * u * rad, cut = ty + th - 250 * u;
      x.save(); x.shadowColor = 'rgba(0,0,0,.3)'; x.shadowBlur = 40 * u; x.fillStyle = '#fff'; rr(x, tx, ty, tw, th, r0); x.fill(); x.restore();
      x.save(); rr(x, tx, ty, tw, th, r0); x.clip(); x.fillStyle = A; x.fillRect(tx, ty, tw, 140 * u); x.restore();
      x.fillStyle = '#fff'; x.font = `800 ${Math.round(32 * u)}px "${fam}", Quicksand, sans-serif`; x.fillText('✈  THẺ LÊN ĐƯỜNG · BOARDING PASS', tx + 50 * u, ty + 86 * u, tw - 100 * u);
      const ix = tx + 50 * u, iw = tw - 100 * u; let y = ty + 210 * u;
      x.fillStyle = '#80868b'; x.font = `700 ${Math.round(26 * u)}px Quicksand, sans-serif`; x.fillText('TỪ', ix, y); x.textAlign = 'right'; x.fillText('ĐẾN', ix + iw, y); x.textAlign = 'left';
      txt('from', ix, y + 76 * u, iw * .42, { px: 56, w: 800, c: '#202124' }); txt('to', ix + iw, y + 76 * u, iw * .5, { px: 56, w: 800, c: A, al: 'right', lines: 2 });
      x.fillStyle = A; x.font = `${Math.round(54 * u)}px sans-serif`; x.textAlign = 'center'; x.fillText('✈', ix + iw * .47, y + 70 * u); x.textAlign = 'left';
      y += 210 * u; const col = (lbl, k, X, cw) => { x.fillStyle = '#80868b'; x.font = `700 ${Math.round(24 * u)}px Quicksand, sans-serif`; x.fillText(lbl, X, y); return txt(k, X, y + 50 * u, cw, { px: 34, w: 700, c: '#202124', lines: 2 }); };
      const hasMap = sh.map && R.map, cw2 = hasMap ? iw * .6 : iw;
      if (sh.date) col('NGÀY · GIỜ', 'date', ix, cw2);
      if (sh.addr) { y += 130 * u; col('ĐỊA CHỈ', 'sub', ix, cw2); y -= 130 * u; }
      if (hasMap) mapImg(ix + iw * .64, y - 30 * u, iw * .36, 230 * u, 22 * u * rad);
      y += 290 * u; if (sh.people && R.avatars?.length) { x.fillStyle = '#80868b'; x.font = `700 ${Math.round(24 * u)}px Quicksand, sans-serif`; x.fillText('HÀNH KHÁCH', ix, y); y += 20 * u; y += people(ix, y, '#202124', 54); }
      const nh = sh.note ? 110 * u : 0, phH = cut - y - 40 * u - nh; if (phH > 160 * u) grid(ix, y, iw, phH, 26 * u * rad); y += Math.max(0, phH) + 64 * u;
      if (sh.note) txt('note', ix, y, iw, { px: 32, w: 500, c: '#3c4043', lines: 2, lh: 1.3 });
      // đường cắt: răng cưa + lỗ bấm vé hai bên
      x.fillStyle = mix(A, '#000000', .18); x.beginPath(); x.arc(tx, cut, 30 * u, 0, 7); x.arc(tx + tw, cut, 30 * u, 0, 7); x.fill();
      x.strokeStyle = '#dadce0'; x.lineWidth = 4 * u; x.setLineDash([16 * u, 14 * u]); x.beginPath(); x.moveTo(tx + 40 * u, cut); x.lineTo(tx + tw - 40 * u, cut); x.stroke(); x.setLineDash([]);
      let bx = ix, hh2 = hash(T('name') + T('date')); x.fillStyle = '#202124'; while (bx < ix + iw) { const bw = (2 + (hh2 & 3) * 2.2) * u; x.fillRect(bx, cut + 50 * u, bw, 110 * u); hh2 = Math.imul(hh2, 1103515245) + 12345 >>> 0; bx += bw + (3 + ((hh2 >> 5) & 3) * 2) * u; }
      logo('#80868b', cut + 205 * u); break;
    }
    case 'minimal': {
      x.fillStyle = '#111'; x.fillRect(0, 0, W, H); photo(0, 0, 0, W, H, 0);
      const g = x.createLinearGradient(0, H * .45, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.72)'); x.fillStyle = g; x.fillRect(0, H * .45, W, H * .55);
      let y = H - 90 * u; const lines = [];
      if (sh.note) lines.push(['note', 32, 500, 2]); if (sh.date) lines.push(['date', 32, 600, 1]); if (sh.addr) lines.push(['sub', 32, 600, 1]);
      for (const [k, px, w8, ln] of lines) { x.font = F(w8, px * s * u); const L = wrapLines(x, T(k), W - 2 * pd, ln).length || 1; y -= (L - 1) * px * s * u * 1.25; txt(k, pd, y, W - 2 * pd, { px, w: w8, c: 'rgba(255,255,255,.88)', lines: ln, lh: 1.25, sh: 1 }); y -= px * s * u * 1.5; }
      y -= 20 * u; txt('name', pd + 70 * u, y, W - 2 * pd - 70 * u, { px: 78, w: 800, c: '#fff', sh: 1 }); pinAt(pd + 28 * u, y + 6 * u, .75);
      if (n > 1) { const z = 180 * u; for (let i = 1; i < Math.min(3, n); i++) { x.save(); x.shadowColor = 'rgba(0,0,0,.4)'; x.shadowBlur = 20 * u; x.fillStyle = '#fff'; rr(x, pd + (i - 1) * (z + 20 * u) - 6 * u, y - 140 * u - z - 6 * u, z + 12 * u, z + 12 * u, 24 * u * rad); x.fill(); x.restore(); photo(i, pd + (i - 1) * (z + 20 * u), y - 140 * u - z, z, z, 20 * u * rad); } }
      if (sh.people && R.avatars?.length) people(pd, y - 120 * u, '#fff', 56);
      if (sh.map && R.map) { const z = 220 * u; x.save(); x.shadowColor = 'rgba(0,0,0,.4)'; x.shadowBlur = 24 * u; x.fillStyle = '#fff'; x.beginPath(); x.arc(W - pd - z / 2, pd + z / 2 + 40 * u, z / 2 + 6 * u, 0, 7); x.fill(); x.restore(); mapImg(W - pd - z, pd + 40 * u, z, z, 0, true); }
      logo('rgba(255,255,255,.7)', H - 34 * u); break;
    }
    case 'journal': {
      x.fillStyle = '#fbf7ee'; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(90,140,220,.22)'; x.lineWidth = 2 * u; for (let ly = 200 * u; ly < H; ly += 64 * u) { x.beginPath(); x.moveTo(0, ly); x.lineTo(W, ly); x.stroke(); }
      x.strokeStyle = 'rgba(230,80,80,.45)'; x.beginPath(); x.moveTo(110 * u, 0); x.lineTo(110 * u, H); x.stroke();
      const lx = 150 * u, lw = W - lx - 70 * u; let y = 150 * u;
      if (sh.date) txt('date', lx, y, lw, { px: 40, w: 600, c: A }); y += 104 * u;
      y += txt('name', lx, y, lw, { px: 78, w: 700, c: '#2c2a33', lines: 2, lh: 1.1 }) + 30 * u;
      const pw = W * .74, ph = Math.min(pw * (tall > 1.6 ? .95 : tall > 1.2 ? .72 : .5), H * .45), px0 = (W - pw) / 2 + 30 * u;
      x.save(); x.translate(px0 + pw / 2, y + ph / 2); x.rotate(.025); x.translate(-(px0 + pw / 2), -(y + ph / 2)); x.save(); x.shadowColor = 'rgba(0,0,0,.18)'; x.shadowBlur = 24 * u; x.fillStyle = '#fff'; x.fillRect(px0 - 18 * u, y - 18 * u, pw + 36 * u, ph + 36 * u); x.restore(); grid(px0, y, pw, ph, 6 * u * rad); x.restore();
      const tape = (X, Y, r) => { x.save(); x.translate(X, Y); x.rotate(r); x.globalAlpha = .78; x.fillStyle = mix(A, '#ffffff', .45); x.fillRect(-90 * u, -24 * u, 180 * u, 48 * u); x.globalAlpha = .35; x.fillStyle = '#fff'; for (let k = -80; k < 90; k += 30) x.fillRect(k * u, -24 * u, 12 * u, 48 * u); x.restore(); };
      tape(px0 + 20 * u, y - 10 * u, -.6); tape(px0 + pw - 20 * u, y - 10 * u, .6);
      y += ph + 90 * u;
      if (sh.addr) y += txt('sub', lx, y, lw, { px: 38, w: 600, c: '#5a4a6a', lines: 1 }) + 18 * u;
      if (sh.note) { const ln = Math.max(1, Math.floor((H - y - 160 * u) / (64 * u))); y += txt('note', lx, y, lw, { px: 44, w: 500, c: '#2c2a33', lines: Math.min(5, ln), lh: 64 / 44 / s }) + 10 * u; }
      if (y < H - 160 * u) people(lx, y, '#2c2a33', 56);
      if (sh.map && R.map) { const mw = 300 * u, mh = 220 * u, mx = W - mw - 70 * u, my = H - mh - 110 * u; x.save(); x.translate(mx + mw / 2, my + mh / 2); x.rotate(-.06); x.translate(-(mx + mw / 2), -(my + mh / 2)); x.fillStyle = '#fff'; x.fillRect(mx - 10 * u, my - 10 * u, mw + 20 * u, mh + 20 * u); mapImg(mx, my, mw, mh, 4 * u); x.restore(); tape(mx + mw / 2, my - 8 * u, -.1); }
      logo('rgba(60,50,80,.5)', H - 34 * u); break;
    }
    case 'glass': {
      x.fillStyle = mix(A, '#000000', .4); x.fillRect(0, 0, W, H);
      const bg = photoSrc(0); if (bg) { const b = blurred(bg, W, H); x.imageSmoothingQuality = 'high'; x.drawImage(b, 0, 0, W, H); x.fillStyle = 'rgba(20,10,40,.18)'; x.fillRect(0, 0, W, H); }
      const gx = 70 * u, gy = 120 * u, gw = W - 140 * u, gh = H * (tall > 1.6 ? .5 : tall > 1.2 ? .44 : .4);
      x.save(); x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 50 * u; x.fillStyle = '#000'; rr(x, gx, gy, gw, gh, 56 * u * rad); x.fill(); x.restore(); grid(gx, gy, gw, gh, 56 * u * rad);
      const cy = gy + gh + 50 * u, ch = H - cy - 90 * u, cx = 50 * u, cw = W - 100 * u;
      x.save(); rr(x, cx, cy, cw, ch, 56 * u * rad); x.fillStyle = 'rgba(255,255,255,.22)'; x.fill(); x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 2.5 * u; x.stroke(); x.restore();
      const hasMap = sh.map && R.map, z = 170 * u; if (hasMap) { x.save(); x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.arc(cx + cw - 50 * u - z / 2, cy + 50 * u + z / 2, z / 2 + 5 * u, 0, 7); x.fill(); x.restore(); mapImg(cx + cw - 50 * u - z, cy + 50 * u, z, z, 0, true); }
      let y = cy + 110 * u; const tw = cw - 100 * u - (hasMap ? z + 20 * u : 0);
      y += txt('name', cx + 50 * u, y, tw, { px: 70, w: 800, c: '#fff', lines: 2, sh: 1 });
      if (sh.addr) y += txt('sub', cx + 50 * u, y + 2 * u, tw, { px: 34, w: 600, c: 'rgba(255,255,255,.9)', lines: 2 });
      if (sh.date) y += txt('date', cx + 50 * u, y + 14 * u, cw - 100 * u, { px: 34, w: 700, c: '#fff' }) + 10 * u;
      if (sh.people) y += people(cx + 50 * u, y + 10 * u, '#fff', 56) + 6 * u;
      if (sh.note && y < cy + ch - 80 * u) txt('note', cx + 50 * u, y + 40 * u, cw - 100 * u, { px: 34, w: 500, c: 'rgba(255,255,255,.92)', lines: Math.max(1, Math.min(4, Math.floor((cy + ch - y - 60 * u) / (44 * u)))), lh: 1.3 });
      logo('rgba(255,255,255,.75)', H - 38 * u); break;
    }
    default: { // gmaps
      x.fillStyle = '#eef0f2'; x.fillRect(0, 0, W, H);
      const mapH = Math.round(H * (tall > 1.6 ? .4 : tall > 1.2 ? .34 : .3)); let top;
      if (sh.map && R.map) { const k = W / R.map.width; x.drawImage(R.map, 0, 0, W, R.map.height * k); if (R.map.height * k < mapH + 80 * u) { const k2 = (mapH + 80 * u) / R.map.height; x.drawImage(R.map, (W - R.map.width * k2) / 2, 0, R.map.width * k2, mapH + 80 * u); } pinAt(W / 2, mapH * .5); top = mapH - 60 * u; }
      else { const g = x.createLinearGradient(0, 0, W, 300 * u); g.addColorStop(0, mix(A, '#ffffff', .55)); g.addColorStop(1, mix(A, '#ffffff', .8)); x.fillStyle = g; x.fillRect(0, 0, W, 400 * u); top = 150 * u; }
      x.save(); x.shadowColor = 'rgba(30,20,40,.18)'; x.shadowBlur = 40 * u; x.fillStyle = '#fff'; rr(x, 0, top, W, H - top + 100 * u, 64 * u * rad); x.fill(); x.restore();
      x.fillStyle = '#dadce0'; rr(x, W / 2 - 50 * u, top + 26 * u, 100 * u, 10 * u, 5 * u); x.fill();
      let y = top + 120 * u; y += txt('name', pd, y, W - 2 * pd, { px: 76, w: 700, c: '#202124', lines: 2, lh: 1.15 });
      if (sh.addr) y += txt('sub', pd, y - 14 * u, W - 2 * pd, { px: 38, w: 600, c: '#5f6368', lines: 2, lh: 1.3 });
      if (sh.date) y += txt('date', pd, y + 6 * u, W - 2 * pd, { px: 36, w: 700, c: A }) - 4 * u;
      if (sh.people && R.avatars?.length) y += people(pd, y + 10 * u) + 4 * u;
      const noteH = sh.note && T('note') ? 170 * u : 0, phTop = y + 20 * u, phH = Math.max(300 * u, H - phTop - 90 * u - noteH);
      grid(pd, phTop, W - 2 * pd, phH, 40 * u * rad); y = phTop + phH + 60 * u;
      if (sh.note && T('note')) txt('note', pd, y, W - 2 * pd, { px: 36, w: 600, c: '#3c4043', lines: 3, lh: 1.32 });
      logo('#9aa0a6');
    }
  }
  x.restore();
  if (opt.stickers) drawStickers(x, M, W, H, opt.stk);
  return regs;
}
export function drawStickers(x, M, W, H, stk) {
  const u = W / 1080;
  for (const st of M.stickers || []) { x.save(); x.translate(st.x * W, st.y * H); x.rotate((st.r || 0) * Math.PI / 180); const z = 150 * u * (st.s || 1);
    if (st.k.startsWith('svg:')) { const im = stk?.get(st.k); if (im) { const ar = im.width / im.height || 1; x.drawImage(im, -z * ar / 2, -z / 2, z * ar, z); } }
    else { x.font = `${Math.round(z)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(st.k, 0, 0); }
    x.restore(); }
}
// màu chủ đạo lấy từ ảnh: điểm ảnh rực nhất (bão hoà × độ sáng vừa phải), đưa về độ sáng 40–55%
export function colorFrom(img) {
  const c = document.createElement('canvas'); c.width = c.height = 24; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, 24, 24); const d = x.getImageData(0, 0, 24, 24).data;
  const bins = new Array(24).fill(0).map(() => ({ w: 0, r: 0, g: 0, b: 0 }));
  for (let i = 0; i < d.length; i += 4) { const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, sat = mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1)); if (sat < .2 || l < .12 || l > .92) continue;
    let h = mx === r ? ((g - b) / (mx - mn)) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4; h = ((h * 60) + 360) % 360; const B = bins[Math.floor(h / 15)], w = sat * (1 - Math.abs(l - .5)); B.w += w; B.r += r * w; B.g += g * w; B.b += b * w; }
  const best = bins.reduce((a, b) => b.w > a.w ? b : a); if (!best.w) return null;
  let r = best.r / best.w, g = best.g / best.w, b = best.b / best.w; const l = (Math.max(r, g, b) + Math.min(r, g, b)) / 2, k = l > .55 ? .5 / l : l < .38 ? .42 / Math.max(.05, l) : 1;
  return '#' + [r, g, b].map(v => Math.round(Math.min(1, v * k) * 255).toString(16).padStart(2, '0')).join('');
}
