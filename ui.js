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
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.3"/>'
};
export function icon(name, size = 24, sw = 1.7) {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
}

// ---------- Bottom sheet kính kéo được ----------
// Biến mọi .modal thành sheet: trên điện thoại trượt từ dưới lên (lò xo), kéo tay cầm xuống để đóng.
export function initSheets(closeFn) {
  const narrow = () => innerWidth <= 760;
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
