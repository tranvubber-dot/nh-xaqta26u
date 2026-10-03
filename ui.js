// Ngân Hà Của Con — bộ công cụ giao diện dùng chung: lò xo (spring), giãn cao su, rung nhẹ, icon SVG nét mảnh, bottom sheet kính.

export const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- Lò xo ----------
// mô phỏng lò xo khối lượng m, độ cứng k, giảm chấn c, đi từ 0 → 1 (có thể có vận tốc đầu v0)
export function springSamples(k = 170, c = 20, m = 1, v0 = 0) {
  const dt = 1 / 240; let x = 0, v = v0, t = 0; const pts = [0];
  for (let i = 0; i < 240 * 4; i++) {
    const a = (-k * (x - 1) - c * v) / m; v += a * dt; x += v * dt; t += dt;
    if (i % 4 === 3) pts.push(x);
    if (t > .25 && Math.abs(x - 1) < .0008 && Math.abs(v) < .01) break;
  }
  pts[pts.length - 1] = 1;
  return { pts, ms: Math.round(t * 1000) };
}
const LINEAR_OK = typeof CSS !== 'undefined' && CSS.supports?.('transition-timing-function', 'linear(0, 1)');
export function springCSS(k, c, m = 1) {
  const { pts, ms } = springSamples(k, c, m);
  if (!LINEAR_OK) return { ease: c / (2 * Math.sqrt(k * m)) < .7 ? 'cubic-bezier(.3,1.45,.45,1)' : 'cubic-bezier(.25,1.1,.4,1)', ms: Math.min(ms, 700) };
  const step = Math.max(1, Math.floor(pts.length / 60));
  const ps = pts.filter((_, i) => i % step === 0 || i === pts.length - 1).map(v => +v.toFixed(4));
  return { ease: `linear(${ps.join(', ')})`, ms };
}
// các kiểu lò xo dùng chung → biến CSS: --sp-<tên> (đường cong) và --sp-<tên>-ms (thời lượng)
export const SPRINGS = { bouncy: [260, 15], soft: [170, 20], snappy: [420, 32], gentle: [110, 16], wobbly: [180, 10], sheet: [300, 26] };
export function installSprings() {
  const r = document.documentElement.style;
  for (const [n, [k, c]] of Object.entries(SPRINGS)) {
    const s = springCSS(k, c); r.setProperty('--sp-' + n, REDUCED ? 'ease' : s.ease); r.setProperty('--sp-' + n + '-ms', (REDUCED ? 120 : s.ms) + 'ms');
  }
}
// lò xo bằng JS cho cử chỉ (có vận tốc thả tay): gọi onUpdate(x) mỗi khung hình
export function animateSpring(from, to, opt = {}, onUpdate, onDone) {
  const k = opt.k ?? 260, c = opt.c ?? 22, m = 1; let x = from, v = opt.v ?? 0, last = performance.now(), raf = 0, dead = false;
  if (REDUCED) { onUpdate(to); onDone?.(); return () => { }; }
  const tick = now => {
    if (dead) return;
    let dt = Math.min(.032, (now - last) / 1000); last = now;
    for (let i = 0; i < 4; i++) { const a = (-k * (x - to) - c * v) / m; v += a * dt / 4; x += v * dt / 4; }
    if (Math.abs(x - to) < (opt.eps ?? .3) && Math.abs(v) < (opt.eps ?? .3) * 4) { onUpdate(to); onDone?.(); return; }
    onUpdate(x); raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => { dead = true; cancelAnimationFrame(raf); };
}
// giãn cao su kiểu iOS: kéo càng xa càng nặng
export const rubber = (x, dim = 600, c = .55) => Math.sign(x) * (1 - 1 / (Math.abs(x) * c / dim + 1)) * dim;
export function haptic(ms = 8) { try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(ms); } catch (e) { } }

// ---------- Icon nét mảnh (tự vẽ) ----------
const P = {
  timeline: '<path d="M8 3v18"/><circle cx="8" cy="6.5" r="2.2"/><circle cx="8" cy="13" r="2.2"/><path d="M12.5 6.5H20M12.5 13H18M12.5 19.5H20"/><circle cx="8" cy="19.5" r="2.2"/>',
  book: '<path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5C4.7 20 4 19.3 4 18.5z"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5c.8 0 1.5-.7 1.5-1.5z"/><path d="M11 4c.7.6 1.3.6 2 0M11 20c.7-.6 1.3-.6 2 0"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5"/><circle cx="12" cy="12" r="7"/>',
  galaxy: '<path d="M12 12c0-1.6 1.6-2.6 3-2 2.2 1 2 4.6-.6 5.6-3.4 1.3-7-1.4-6.4-5.2C8.7 6.6 13 4.4 16.8 5.6c4.2 1.3 5.6 6.6 3 10.4"/><path d="M12 12c0 1.6-1.6 2.6-3 2-2.2-1-2-4.6.6-5.6"/><circle cx="12" cy="12" r=".9" fill="currentColor"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4M18.7 18.7l-1.4-1.4M6.7 6.7 5.3 5.3"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5"/><path d="M5 19.5h14"/>',
  trash: '<path d="M5 7h14M9.5 7V4.8h5V7M7 7l1 12.5h8L17 7"/>',
  image: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M20.5 16l-5-5-8 8"/>',
  sparkle: '<path d="M12 3.5l1.8 5 5 1.8-5 1.8-1.8 5-1.8-5-5-1.8 5-1.8z"/><path d="M19 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  cake: '<path d="M4.5 20h15v-6.5a2 2 0 0 0-2-2h-11a2 2 0 0 0-2 2z"/><path d="M4.5 15.5c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 1.5 0 1.5 0"/><path d="M12 11.5V8M12 5.6c.8-.8.8-1.6 0-2.4-.8.8-.8 1.6 0 2.4z"/>',
  star: '<path d="M12 3.6l2.5 5.3 5.8.7-4.3 4 1.1 5.8L12 16.6l-5.1 2.8 1.1-5.8-4.3-4 5.8-.7z"/>',
  warn: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.2M12 16.8v.3"/>',
  merge: '<path d="M7 4v5c0 3 5 3.5 5 7v4M17 4v5c0 3-5 3.5-5 7"/><path d="M9 18l3 3 3-3"/>',
  split: '<path d="M12 3v5c0 3.5-5 4-5 7v6M12 8c0 3.5 5 4 5 7v6"/><path d="M4.5 18.5 7 21l2.5-2.5M14.5 18.5 17 21l2.5-2.5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.5 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>',
  chevronRight: '<path d="M9 6l6 6-6 6"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="M16 10.5l5-3v9l-5-3z"/>',
  people: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.6-3.3 2.8-5 5.5-5s4.9 1.7 5.5 5"/><circle cx="17" cy="9.5" r="2.4"/><path d="M15.8 14.3c2.5-.3 4.2 1.2 4.7 4"/>',
  music: '<path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2.2"/><circle cx="17" cy="16" r="2.2"/>',
  palette: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.8 1.8-1.6 0-1.1-1-1.4-1-2.4 0-.9.8-1.5 1.8-1.5h2.2a3.7 3.7 0 0 0 3.7-3.7C20.5 7 16.7 3.5 12 3.5z"/><circle cx="7.6" cy="11" r="1.1"/><circle cx="10.5" cy="7.4" r="1.1"/><circle cx="15" cy="7.6" r="1.1"/>',
  save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.3"/>',
  more: '<circle cx="5.5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.7" fill="currentColor" stroke="none"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M7.5 12.5l3 3 6-6.5"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14c1 1.6 2.4 2.4 4 2.4s3-.8 4-2.4"/><circle cx="9" cy="9.8" r=".9" fill="currentColor"/><circle cx="15" cy="9.8" r=".9" fill="currentColor"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  move: '<path d="M4 12h12M12 6l6 6-6 6"/><path d="M4 5v14"/>',
  bell: '<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2H5z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  pause: '<path d="M8.5 5.5v13M15.5 5.5v13"/>',
  sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  mute: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  baby: '<circle cx="12" cy="8" r="4"/><path d="M5 20c.8-3.6 3.6-5.6 7-5.6s6.2 2 7 5.6"/><path d="M11 6.2c.6-.6 1.4-.6 2 0"/>'
};
export function icon(name, size = 24, sw = 1.7) {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
}

// ---------- Bottom sheet kính kéo được ----------
// Biến mọi .modal thành sheet: trên điện thoại trượt từ dưới lên (lò xo), kéo tay cầm xuống để đóng.
export function initSheets(closeFn) {
  const narrow = () => innerWidth < 768;
  document.querySelectorAll('.modal .card').forEach(card => {
    if (card.querySelector(':scope > .grab')) return;
    const g = document.createElement('div'); g.className = 'grab'; g.innerHTML = '<i></i>'; card.prepend(g);
    let y0 = 0, dy = 0, on = false, lt = 0, ly = 0, v = 0, stop = null;
    const set = y => { card.style.transform = `translateY(${Math.max(0, y) + (y < 0 ? rubber(y, 200) : 0)}px)`; };
    const start = e => {
      if (!narrow()) return;
      if (e.target !== g && !g.contains(e.target) && !(card.scrollTop <= 0 && e.target.closest('h2,.lead'))) return;
      on = true; y0 = e.clientY; dy = 0; ly = e.clientY; lt = performance.now(); v = 0; stop?.(); card.style.transition = 'none';
      try { card.setPointerCapture(e.pointerId); } catch (er) { }
    };
    card.addEventListener('pointerdown', start);
    card.addEventListener('pointermove', e => {
      if (!on) return; dy = e.clientY - y0; const now = performance.now(); v = (e.clientY - ly) / Math.max(1, now - lt); ly = e.clientY; lt = now;
      set(dy < 0 ? dy : dy);
    });
    const end = () => {
      if (!on) return; on = false;
      const m = card.closest('.modal');
      if (dy > 130 || v > .7) { haptic(6); card.style.transition = ''; card.style.transform = ''; closeFn(m); return; }
      stop = animateSpring(dy, 0, { k: 320, c: 24, v: v * 1000 }, y => set(y), () => { card.style.transition = ''; card.style.transform = ''; });
    };
    card.addEventListener('pointerup', end); card.addEventListener('pointercancel', end);
  });
}
export const fmtLong = ts => { const d = new Date(ts); return `${['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][d.getDay()]}, ${d.getDate()} tháng ${d.getMonth() + 1}, ${d.getFullYear()}`; };
export { clamp };

// ---------- Menu hành động kiểu iOS (nhấn giữ hoặc nút ⋯) ----------
// items: [{ icon, label, act, danger, hidden }] — act() được gọi khi chọn. el: phần tử được "nâng lên" (tuỳ chọn); at: nút ⋯ để neo menu.
// bàn phím iOS mở lên: kéo ô đang nhập vào giữa vùng còn thấy
document.addEventListener('focusin', e => { const el = e.target; if (!el.matches?.('input:not([type=checkbox]):not([type=range]), textarea') || !el.closest('.modal .card, .cm')) return; setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 350); });
let CM = null;
if (window.visualViewport) { const vv = window.visualViewport, upd = () => { const kb = Math.max(0, innerHeight - vv.height - vv.offsetTop); document.documentElement.style.setProperty('--kb', kb > 60 ? kb + 'px' : '0px'); }; vv.addEventListener('resize', upd); vv.addEventListener('scroll', upd); }
const PDOWN = { n: 0 };
addEventListener('pointerdown', () => { PDOWN.n = 1; }, true); addEventListener('pointerup', () => { PDOWN.n = 0; }, true); addEventListener('pointercancel', () => { PDOWN.n = 0; }, true);
export function contextMenu({ el, at, title, items }) {
  closeMenu(true);
  // nhóm: {sep:1} ngăn bằng đường mảnh; mục Xoá (danger) luôn dồn xuống cuối, có đường ngăn phía trên
  let raw = items.filter(i => i && !i.hidden); const dz = raw.filter(i => i.danger), rest = raw.filter(i => !i.danger);
  raw = dz.length && rest.length ? [...rest, { sep: 1 }, ...dz] : raw;
  raw = raw.filter((it, i, a) => !it.sep || (i > 0 && i < a.length - 1 && !a[i - 1].sep));
  const list = raw.filter(i => !i.sep);
  const phone = innerWidth < 768; // điện thoại: action sheet dính sát đáy như iOS; máy tính: popover cạnh nút
  const ov = document.createElement('div'); ov.className = 'cm' + (phone ? ' sheet' : ''); ov.innerHTML = '<div class="cm-bg"></div>';
  let pv = null, r = (el || at)?.getBoundingClientRect();
  if (el && r) { pv = el.cloneNode(true); pv.classList.add('cm-pv'); pv.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;visibility:visible;opacity:1`; pv.querySelectorAll('[id]').forEach(x => x.removeAttribute('id')); ov.appendChild(pv); }
  const m = document.createElement('div'); m.className = 'cm-list';
  let k = 0; const rows = raw.map(it => it.sep ? '<i class="cm-sep"></i>' : `<button data-i="${k}" class="${it.danger ? 'danger' : ''}${it.on ? ' on' : ''}" style="--k:${k++}${it.color ? ';--c:' + it.color : ''}">${it.img ? `<img class="cm-av" src="${it.img}" alt="">` : it.icon ? icon(it.icon, phone ? 22 : 21, 1.6) : ''}<span>${it.label}</span>${it.note ? `<small class="cm-n">${it.note}</small>` : ''}${it.on ? icon('check', 18, 2) : ''}</button>`).join('');
  if (phone) m.innerHTML = `<div class="cm-grab"><i></i></div><div class="cm-g">${title ? `<div class="cm-t">${title}</div>` : ''}<div class="cm-sc">${rows}</div></div><button class="cm-cancel" data-cancel>Huỷ</button>`;
  else m.innerHTML = (title ? `<div class="cm-t">${title}</div>` : '') + rows;
  ov.appendChild(m); document.body.appendChild(ov); document.body.classList.add('cmopen');
  if (!phone) {
    const W = innerWidth, H = innerHeight, mw = Math.min(290, W - 24), mh = m.offsetHeight;
    let x = r ? clamp(r.left + (el ? 0 : r.width - mw), 12, W - mw - 12) : (W - mw) / 2, y;
    if (!r) y = (H - mh) / 2;
    else if (el) { const lift = Math.min(0, H - 20 - (r.bottom + 12 + mh)); if (pv && lift < 0) { pv.style.setProperty('--ly', Math.max(lift, -r.top + 20) + 'px'); } y = r.bottom + 12 + Math.max(lift, -r.top + 20); if (y + mh > H - 12) y = Math.max(12, r.top - mh - 12); }
    else { y = r.bottom + 8; if (y + mh > H - 12) y = Math.max(12, r.top - mh - 8); }
    m.style.cssText = `left:${x}px;top:${y}px;width:${mw}px;transform-origin:${el ? '20% 0' : '90% 0'}`;
  } else if (pv) {
    m.style.maxHeight = Math.max(330, Math.round(innerHeight * .6)) + 'px';
    // vật đang giữ nổi tại chỗ; nếu sheet che mất thì đẩy vật lên vừa đủ thấy
    const sheetTop = innerHeight - m.offsetHeight - 12, over = r.bottom - sheetTop;
    if (over > 0) pv.style.setProperty('--ly', Math.max(-over, -r.top + 20 + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-t')) || 0)) + 'px');
  }
  requestAnimationFrame(() => ov.classList.add('on')); haptic(12);
  const oldVis = el ? el.style.visibility : ''; if (el) el.style.visibility = 'hidden';
  // mở lúc ngón tay còn giữ → chờ thả tay; mở ngay lúc thả tay → bỏ qua cú "click" đi kèm rồi mới nhận chạm nền để đóng
  let armed = !el; if (el) { if (PDOWN.n > 0) { const arm = () => setTimeout(() => { armed = true; }, 80); addEventListener('pointerup', arm, { once: true, capture: true }); addEventListener('pointercancel', arm, { once: true, capture: true }); } else setTimeout(() => { armed = true; }, 320); }
  const close = () => { if (armed) closeMenu(); };
  ov.querySelector('.cm-bg').addEventListener('click', close);
  m.addEventListener('click', e => { if (e.target.closest('[data-cancel]')) { if (armed) closeMenu(); return; } const b = e.target.closest('[data-i]'); if (!b || !armed) return; const it = list[+b.dataset.i]; closeMenu(); setTimeout(() => it.act?.(), 60); });
  if (phone) { // kéo sheet xuống để đóng
    let d = null; const g = m;
    g.addEventListener('pointerdown', e => { if (!e.target.closest('.cm-grab, .cm-t') && m.querySelector('.cm-sc').scrollTop > 0) return; d = { y: e.clientY, dy: 0, v: 0, ly: e.clientY, lt: performance.now(), on: false }; });
    g.addEventListener('pointermove', e => { if (!d) return; const dy = e.clientY - d.y; if (!d.on) { if (dy > 8) { d.on = true; try { g.setPointerCapture(e.pointerId); } catch (er) { } g.style.transition = 'none'; } else if (dy < -8) { d = null; return; } else return; } const now = performance.now(); d.v = (e.clientY - d.ly) / Math.max(1, now - d.lt); d.ly = e.clientY; d.lt = now; d.dy = dy; g.style.transform = `translate3d(0,${dy > 0 ? dy : rubber(dy, 120)}px,0)`; });
    const up = () => { if (!d) return; const D = d; d = null; if (!D.on) return; g.style.transition = ''; if (D.dy > 90 || D.v > .6) { armed = true; closeMenu(); } else g.style.transform = ''; };
    g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
  }
  CM = { ov, el, oldVis };
}
export function closeMenu(now) {
  if (!CM) return; const { ov, el, oldVis } = CM; CM = null; ov.classList.remove('on'); ov.classList.add('off'); document.body.classList.remove('cmopen');
  const L = ov.querySelector('.cm-list'); if (L && ov.classList.contains('sheet')) L.style.transform = '';
  setTimeout(() => { ov.remove(); if (el) el.style.visibility = oldVis || ''; }, now ? 0 : 260);
}
addEventListener('keydown', e => { if (e.key === 'Escape' && CM) { e.stopImmediatePropagation(); closeMenu(); } }, true);
// nhấn giữ ~0,45 s trên phần tử khớp selector → cb(el, e); chặn cú chạm theo sau
export function longPress(root, sel, cb, ms = 450) {
  let t = 0, st = null, fired = false;
  root.addEventListener('pointerdown', e => {
    const el = e.target.closest(sel); if (!el || !root.contains(el) || (e.pointerType === 'mouse' && e.button !== 0)) return;
    fired = 0; st = { x: e.clientX, y: e.clientY, el, e };
    clearTimeout(t); t = setTimeout(() => { if (!st) return; fired = performance.now(); cb(st.el, st.e); st = null; }, ms);
  });
  root.addEventListener('pointermove', e => { if (st && Math.hypot(e.clientX - st.x, e.clientY - st.y) > 9) { clearTimeout(t); st = null; } });
  const end = () => { clearTimeout(t); st = null; };
  root.addEventListener('pointerup', end); root.addEventListener('pointercancel', end);
  // chỉ nuốt cú click đi liền ngay sau lần nhấn giữ (không để sót sang lần chạm sau)
  root.addEventListener('click', e => { if (fired && performance.now() - fired < 1500) { e.stopPropagation(); e.preventDefault(); } fired = 0; }, true);
  root.addEventListener('contextmenu', e => { if (e.target.closest(sel)) e.preventDefault(); });
}
// toast kính có nút ↩︎ Hoàn tác (5 giây)
let UT = null;
export function undoToast(msg, onUndo, ms = 5000) {
  UT?.close(true);
  const d = document.createElement('div'); d.className = 'utoast';
  d.innerHTML = `<span>${msg}</span>${onUndo ? `<button>${icon('back', 16, 2.2)}<b>Hoàn tác</b></button>` : ''}<i style="animation-duration:${ms}ms"></i>`;
  document.body.appendChild(d); requestAnimationFrame(() => d.classList.add('on'));
  let done = false; const close = now => { if (done) return; done = true; d.classList.remove('on'); setTimeout(() => d.remove(), now ? 0 : 400); if (UT === h) UT = null; };
  const tm = setTimeout(close, ms);
  d.querySelector('button')?.addEventListener('click', () => { clearTimeout(tm); close(); haptic(10); onUndo(); });
  const h = { close }; UT = h; return h;
}
