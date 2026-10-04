// Hành Trình Của Bạn — 🗺 TRÌNH SỬA TEM NƠI CHỐN: 7 mẫu (Google Maps, Tem bưu điện, Polaroid, Vé du lịch, Tối giản, Nhật ký, Kính mờ iOS),
// chạm chữ trên tem để sửa trực tiếp, bật/tắt thành phần, màu (bảng màu + lấy từ ảnh), phông, cỡ chữ, bo góc, khung 9:16 / 4:5 / 1:1,
// đổi ảnh + kéo / chụm căn khung, sticker kéo thả / xoay / phóng, hoàn tác / làm lại, "Mẫu của tôi" (meta sy:stampTpls, đồng bộ Drive).
// Xem trước: canvas vẽ theo mô hình JSON (temrender.js) + lớp chạm DOM. Xuất: vẽ lại ở 1080 px → PNG, hoặc MP4 nếu ảnh chính là video.
import { icon, haptic, contextMenu } from './ui.js';
import { mapSnap, placeInfo } from './bando.js';
import { renderStamp, drawStickers, defModel, tplOf, fontOf, TPLS, FONTS, PALETTE, RATIOS, TEXT_KEYS, STK_EMOJI, STK_SVG, stkURL, autoDate, colorFrom } from './temrender.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const sfx = n => window.SFX?.play(n);
let fontsLink = false;
async function ensureFont(fam) {
  if (fam === 'Quicksand') return;
  if (!fontsLink) { fontsLink = true; const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@500;700;800&family=Playfair+Display:wght@500;700;800&family=Dancing+Script:wght@500;700&family=Patrick+Hand&display=swap'; document.head.appendChild(l); }
  try { await Promise.race([Promise.all([document.fonts.load(`700 40px "${fam}"`, 'Tiếng Việt ệ'), document.fonts.load(`500 40px "${fam}"`, 'Tiếng Việt ệ')]), new Promise(r => setTimeout(r, 3500))]); } catch (e) { }
}

export function initPlaceCard(A) {
  const TOOLS = [['tpl', '🧩', 'Mẫu'], ['text', '🔤', 'Chữ'], ['color', '🎨', 'Màu'], ['photo', '🖼️', 'Ảnh'], ['stk', '😊', 'Sticker'], ['frame', '🔲', 'Khung']];
  document.body.insertAdjacentHTML('beforeend', `<div class="modal gsheet" id="mPlc"><div class="card glass">
    <h2>🗺 Tem nơi chốn</h2>
    <div class="st-top"><button class="st-ib" data-x="undo" aria-label="Hoàn tác">↶</button><button class="st-ib" data-x="redo" aria-label="Làm lại">↷</button><span class="st-msg"></span><button class="primary st-save">${icon('download', 17, 2)}<span>Lưu</span></button></div>
    <div class="st-stage"><div class="st-pv"><canvas class="st-cv"></canvas><video class="st-out" playsinline controls hidden></video><div class="st-ov"></div><div class="vk-busy st-busy" hidden><i></i><b>Đang chuẩn bị…</b></div></div></div>
    <div class="st-panel"></div>
    <nav class="st-tools">${TOOLS.map(([k, e, t]) => `<button data-tool="${k}"><b>${e}</b><span>${t}</span></button>`).join('')}</nav></div></div>`);
  const MD = document.getElementById('mPlc'), STAGE = MD.querySelector('.st-stage'), PV = MD.querySelector('.st-pv'), OV = MD.querySelector('.st-ov'), PANEL = MD.querySelector('.st-panel'), OUT = MD.querySelector('.st-out'); let CV = MD.querySelector('.st-cv');
  const S = { e: null, M: null, R: null, tool: 'tpl', hist: [], hi: -1, regs: null, sel: -1, file: null, busy: false, thumbs: null, tok: 0 };
  const busy = (on, t) => { MD.querySelector('.st-busy').hidden = !on; if (t) MD.querySelector('.st-busy b').textContent = t; };
  const dims = () => RATIOS[S.M.ratio] || RATIOS['916'];
  const isVideo = i => { const p = S.M.photos[i]; return p && S.e.ms.find(m => m.id === p.mid)?.type === 'video'; };
  const stk = new Map(); for (const k of Object.keys(STK_SVG)) { const im = new Image(); im.src = stkURL(k); stk.set('svg:' + k, im); }
  // ---------- tài nguyên: ảnh, avatar, bản đồ, chữ tự điền ----------
  async function loadImgs() {
    for (const p of S.M.photos) if (!S.R.imgs.has(p.mid)) { const m = S.e.ms.find(x => x.id === p.mid); if (!m) continue; try { const b = (m.type === 'image' && !m.heic && await A.blob(m.id)) || await A.thumbBlob(m.id); if (b) { let bmp = await createImageBitmap(b, { imageOrientation: 'from-image' }); const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)); if (k < 1) { const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.(); bmp = c; } S.R.imgs.set(p.mid, bmp); } } catch (e) { } }
  }
  // phông tải nền (mạng chậm / ngoại tuyến thì vẽ tạm bằng Quicksand, tải xong vẽ lại)
  const fontLater = fam => { ensureFont(fam).then(() => { S.thumbs = null; redraw(); if (S.tool === 'tpl') panel(); }); };
  // ---------- vẽ xem trước + lớp chạm ----------
  let raf = 0; const redraw = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
  function fit() { const [W, H] = dims(), aw = STAGE.clientWidth - 8, ah = STAGE.clientHeight - 8; if (aw < 20 || ah < 20) return; const w = Math.min(aw, ah * W / H); PV.style.width = w + 'px'; PV.style.height = w * H / W + 'px'; PV.style.setProperty('--pvwpx', w + 'px'); }
  function draw() {
    if (!S.M) return; fit(); const [W, H] = dims(), cw = Math.min(720, Math.round(PV.clientWidth * Math.min(2, devicePixelRatio || 1))) || 540, ch = Math.round(cw * H / W);
    if (CV.width !== cw || CV.height !== ch) { CV.width = cw; CV.height = ch; }
    const x = CV.getContext('2d'); x.clearRect(0, 0, cw, ch); S.regs = renderStamp(x, S.M, S.R, cw, ch, {}); S.scale = cw; overlay();
    OUT.hidden = true; CV.hidden = false; S.file = null; MD.querySelector('.st-save span').textContent = isVideo(0) ? 'Lưu MP4' : 'Lưu PNG';
    MD.querySelector('[data-x=undo]').disabled = S.hi <= 0; MD.querySelector('[data-x=redo]').disabled = S.hi >= S.hist.length - 1;
  }
  const pct = (v, t) => (v / t * 100).toFixed(3) + '%';
  function overlay() {
    const cw = CV.width, ch = CV.height, [W] = dims(), u = cw / 1080, out = [];
    for (const r of S.regs.photos) out.push(`<div class="st-p" data-i="${r.i}" style="left:${pct(r.x, cw)};top:${pct(r.y, ch)};width:${pct(r.w, cw)};height:${pct(r.h, ch)}"></div>`);
    for (const r of S.regs.texts) out.push(`<div class="st-t" data-k="${r.k}" style="left:${pct(r.x, cw)};top:${pct(r.y, ch)};width:${pct(r.w, cw)};height:${pct(Math.max(r.h, 40 * u), ch)}"></div>`);
    S.M.stickers.forEach((st, i) => out.push(`<div class="st-s${S.sel === i ? ' on' : ''}" data-s="${i}" style="left:${(st.x * 100).toFixed(3)}%;top:${(st.y * 100).toFixed(3)}%;--z:${(150 * (st.s || 1) / 1080 * 100).toFixed(3)};transform:translate(-50%,-50%) rotate(${st.r || 0}deg)">${st.k.startsWith('svg:') ? `<img src="${stkURL(st.k.slice(4))}" alt="" draggable="false">` : `<span>${st.k}</span>`}${S.sel === i ? '<button class="st-sx" data-del="1" aria-label="Xoá sticker">✕</button>' : ''}</div>`));
    OV.innerHTML = out.join(''); void W;
  }
  // ---------- lịch sử: hoàn tác / làm lại ----------
  function commit() { const j = JSON.stringify(S.M); if (S.hist[S.hi] === j) return; S.hist = S.hist.slice(0, S.hi + 1); S.hist.push(j); if (S.hist.length > 60) S.hist.shift(); S.hi = S.hist.length - 1; draw(); }
  const setM = (fn, opt = {}) => { fn(S.M); if (opt.thumbs) S.thumbs = null; commit(); if (opt.panel !== false) panel(); };
  // ---------- sửa chữ trực tiếp trên tem ----------
  function editText(k) {
    const r = S.regs.texts.find(t => t.k === k); if (!r) { A.toast('Phần chữ này đang tắt — bật lại ở Khung', 2000); return; }
    OV.querySelector('.st-ed')?.remove(); const cw = CV.width, ch = CV.height, k2 = PV.clientWidth / cw, multi = r.multi || k === 'note';
    const ta = document.createElement('textarea'); ta.className = 'st-ed'; ta.value = S.M.text[k] ?? S.R.auto[k] ?? ''; ta.rows = multi ? 3 : 1;
    ta.style.cssText = `left:${pct(Math.max(0, r.x - 8), cw)};top:${pct(Math.max(0, r.y - 8), ch)};width:${pct(Math.min(cw - r.x + 8, r.w + 16), cw)};min-height:${Math.max(44, (r.h + 16) * k2)}px;font:${r.w8} ${Math.max(15, r.px * k2)}px "${fontOf(S.M)}", Quicksand, sans-serif;text-align:${r.al}`;
    OV.appendChild(ta); ta.focus(); ta.select?.(); sfx('tick');
    const done = () => { const v = ta.value.replace(/\s+$/, ''); ta.remove(); setM(M => { if (!v || v === S.R.auto[k]) delete M.text[k]; else M.text[k] = multi ? v : v.replace(/\n/g, ' '); }, { thumbs: true }); };
    ta.addEventListener('blur', done, { once: true }); ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !multi) { e.preventDefault(); ta.blur(); } if (e.key === 'Escape') { ta.value = S.M.text[k] ?? S.R.auto[k] ?? ''; ta.blur(); } });
  }
  // ---------- cử chỉ: kéo / chụm ảnh, kéo / xoay / phóng sticker, chạm chữ ----------
  const pts = new Map(); let G = null;
  OV.addEventListener('pointerdown', e => {
    if (e.target.closest('.st-ed')) return; if (e.target.closest('[data-del]')) { const i = S.sel; S.sel = -1; setM(M => M.stickers.splice(i, 1)); sfx('plop'); return; }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { OV.setPointerCapture(e.pointerId); } catch (er) { }
    if (pts.size === 1) { const s = e.target.closest('.st-s'), p = e.target.closest('.st-p'), t = e.target.closest('.st-t');
      G = s ? { kind: 's', i: +s.dataset.s, st0: clone(S.M.stickers[+s.dataset.s]) } : t && !p ? { kind: 't', k: t.dataset.k } : t && p ? { kind: 't', k: t.dataset.k, alt: { kind: 'p', i: +p.dataset.i } } : p ? { kind: 'p', i: +p.dataset.i, p0: { ...S.M.photos[+p.dataset.i] } } : { kind: 'none' };
      G.x0 = e.clientX; G.y0 = e.clientY; G.moved = false; if (G.kind === 's' && S.sel !== G.i) { S.sel = G.i; overlay(); } }
    else if (pts.size === 2 && G) { const [a, b] = [...pts.values()]; G.d0 = Math.hypot(a.x - b.x, a.y - b.y); G.a0 = Math.atan2(b.y - a.y, b.x - a.x); if (G.alt) G = { ...G.alt, p0: { ...S.M.photos[G.alt.i] }, d0: G.d0, a0: G.a0, x0: G.x0, y0: G.y0 }; if (G.kind === 's') G.st0 = clone(S.M.stickers[G.i]); if (G.kind === 'p') G.p0 = { ...S.M.photos[G.i] }; }
  });
  OV.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId) || !G) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); const P = [...pts.values()], rect = PV.getBoundingClientRect();
    const dx = (P[0].x - G.x0), dy = (P[0].y - G.y0); if (Math.hypot(dx, dy) > 6) G.moved = true;
    if (G.kind === 't' && G.moved && G.alt) G = { ...G.alt, p0: { ...S.M.photos[G.alt.i] }, x0: G.x0, y0: G.y0, moved: true };
    if (G.kind === 's') { const st = S.M.stickers[G.i]; if (!st) return; if (P.length === 2 && G.d0) { const d = Math.hypot(P[0].x - P[1].x, P[0].y - P[1].y), a = Math.atan2(P[1].y - P[0].y, P[1].x - P[0].x); st.s = Math.max(.3, Math.min(4, G.st0.s * d / G.d0)); st.r = G.st0.r + (a - G.a0) * 180 / Math.PI; }
      else { st.x = Math.max(0, Math.min(1, G.st0.x + dx / rect.width)); st.y = Math.max(0, Math.min(1, G.st0.y + dy / rect.height)); }
      const el = OV.querySelector(`[data-s="${G.i}"]`); if (el) { el.style.left = (st.x * 100) + '%'; el.style.top = (st.y * 100) + '%'; el.style.setProperty('--z', (150 * st.s / 1080 * 100).toFixed(3)); el.style.transform = `translate(-50%,-50%) rotate(${st.r}deg)`; } }
    else if (G.kind === 'p') { const ph = S.M.photos[G.i], r = S.regs.photos.find(q => q.i === G.i); if (!ph || !r) return; const kx = CV.width / rect.width;
      if (P.length === 2 && G.d0) { const d = Math.hypot(P[0].x - P[1].x, P[0].y - P[1].y); ph.z = Math.max(1, Math.min(4, (G.p0.z || 1) * d / G.d0)); }
      else { ph.x = (G.p0.x || 0) + dx * kx / r.w; ph.y = (G.p0.y || 0) + dy * kx / r.h; ph.x = Math.max(-1.5, Math.min(1.5, ph.x)); ph.y = Math.max(-1.5, Math.min(1.5, ph.y)); }
      redraw(); }
  });
  const up = e => { if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId); if (pts.size || !G) return; const g = G; G = null;
    if (g.kind === 't' && !g.moved) editText(g.k);
    else if (g.kind === 's' || g.kind === 'p') { if (g.moved || g.d0) commit(); else if (g.kind === 'p') { if (S.tool !== 'photo') { S.tool = 'photo'; panel(); } } }
    else if (g.kind === 'none' && S.sel >= 0) { S.sel = -1; overlay(); } };
  OV.addEventListener('pointerup', up); OV.addEventListener('pointercancel', up);
  for (const ev of ['touchstart', 'touchmove']) OV.addEventListener(ev, e => { e.stopPropagation(); if (ev === 'touchmove' && !e.target.closest('.st-ed')) e.preventDefault(); }, { passive: false }); // không để sheet kéo / trang phóng to theo
  // ---------- bảng công cụ ----------
  async function thumbs() {
    if (S.thumbs) return S.thumbs; const out = []; const c = document.createElement('canvas');
    for (const t of TPLS) { const M = { ...clone(S.M), tpl: t.k, color: S.M.tpl === t.k ? S.M.color : t.color, font: null, stickers: t.stickers || [] }, [W, H] = RATIOS[M.ratio]; c.width = 180; c.height = Math.round(180 * H / W); renderStamp(c.getContext('2d'), M, S.R, c.width, c.height, { stickers: true, stk }); out.push(c.toDataURL('image/jpeg', .7)); }
    return S.thumbs = out;
  }
  async function panel() {
    MD.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === S.tool)); const M = S.M, T = tplOf(M.tpl);
    if (S.tool === 'tpl') {
      const mine = (await A.metaGet('sy:stampTpls')) || [];
      PANEL.innerHTML = `<div class="st-row st-tpls">${TPLS.map((t, i) => `<button data-tpl="${t.k}" class="${M.tpl === t.k ? 'on' : ''}"><img alt="" data-ti="${i}"><span>${t.t}</span></button>`).join('')}</div>
        <div class="st-row">${mine.map(m => `<button class="st-chip" data-mine="${m.id}">⭐ ${esc(m.name)}</button>`).join('')}<button class="st-chip" data-x="savetpl">💾 Lưu thành mẫu</button><button class="st-chip" data-x="reset">↺ Về mặc định</button></div>`;
      thumbs().then(ts => PANEL.querySelectorAll('[data-ti]').forEach(im => { im.src = ts[+im.dataset.ti]; }));
    } else if (S.tool === 'text') {
      const keys = Object.keys(TEXT_KEYS).filter(k => M.tpl === 'ticket' || (k !== 'from' && k !== 'to'));
      PANEL.innerHTML = `<p class="st-hint">Chạm vào chữ trên tem để sửa trực tiếp, hoặc chọn bên dưới.</p><div class="st-row">${keys.map(k => `<button class="st-chip" data-edit="${k}">✏️ ${TEXT_KEYS[k]}</button>`).join('')}</div>
        <div class="st-row">${FONTS.map(f => `<button class="st-chip${fontOf(M) === f.k ? ' on' : ''}" data-font="${f.k}" style="font-family:'${f.k}',Quicksand">${f.t}</button>`).join('')}</div>
        <div class="st-row"><span class="st-lb">Cỡ chữ</span><button class="st-ib" data-size="-1">A−</button><b class="st-val">${Math.round(M.size * 100)}%</b><button class="st-ib" data-size="1">A+</button></div>`;
    } else if (S.tool === 'color') {
      PANEL.innerHTML = `<div class="st-row st-sw">${PALETTE.map(c => `<button data-color="${c}" class="${M.color === c ? 'on' : ''}" style="--c:${c}" aria-label="${c}"></button>`).join('')}<label class="st-pick" style="--c:${M.color}"><input type="color" value="${M.color}" aria-label="Màu tuỳ chọn"></label></div>
        <div class="st-row"><button class="st-chip" data-x="auto">🎨 Lấy màu từ ảnh</button></div>`;
      PANEL.querySelector('input[type=color]').oninput = e => { S.M.color = e.target.value; redraw(); }; PANEL.querySelector('input[type=color]').onchange = () => setM(() => { }, { thumbs: true });
    } else if (S.tool === 'photo') {
      const ms = S.e.ms.slice(0, 60), sel = M.photos.map(p => p.mid);
      PANEL.innerHTML = `<p class="st-hint">Chọn 1–3 ảnh (ảnh đầu là ảnh lớn) · kéo để căn, chụm 2 ngón để phóng ảnh trên tem.</p><div class="st-row st-phs">${ms.map(m => { const i = sel.indexOf(m.id); return `<button data-ph="${m.id}" class="${i >= 0 ? 'on' : ''}${m.type === 'video' ? ' v' : ''}"><img data-mid="${m.id}" alt="">${i >= 0 ? `<span>${i + 1}</span>` : ''}</button>`; }).join('')}</div>
        <div class="st-row"><button class="st-chip${M.photos.length === 1 ? ' on' : ''}" data-lay="1">1 ảnh</button><button class="st-chip${M.photos.length === 3 ? ' on' : ''}" data-lay="3">1 lớn + 2 nhỏ</button><button class="st-chip" data-x="refit">↺ Căn lại khung</button>${isVideo(0) ? `<label class="st-chip st-tg"><input type="checkbox" id="stAud"${S.aud ? ' checked' : ''}> Giữ tiếng gốc (nhỏ)</label>` : ''}</div>`;
      PANEL.querySelectorAll('[data-mid]').forEach(im => A.thumbURL(im.dataset.mid).then(u => { if (u) im.src = u; })); PANEL.querySelector('#stAud')?.addEventListener('change', e => { S.aud = e.target.checked; });
    } else if (S.tool === 'stk') {
      PANEL.innerHTML = `<p class="st-hint">Chạm để thêm · kéo để di chuyển · 2 ngón để xoay, phóng · chạm ✕ để xoá.</p><div class="st-row st-stks">${Object.keys(STK_SVG).map(k => `<button data-stk="svg:${k}"><img src="${stkURL(k)}" alt=""></button>`).join('')}${STK_EMOJI.map(k => `<button data-stk="${k}">${k}</button>`).join('')}</div>`;
    } else if (S.tool === 'frame') {
      const tog = (k, t) => `<label class="st-chip st-tg"><input type="checkbox" data-show="${k}"${M.show[k] ? ' checked' : ''}> ${t}</label>`;
      PANEL.innerHTML = `<div class="st-row">${[['916', '9:16 dọc'], ['45', '4:5'], ['11', '1:1 vuông']].map(([k, t]) => `<button class="st-chip${M.ratio === k ? ' on' : ''}" data-ratio="${k}">${t}</button>`).join('')}</div>
        <div class="st-row"><span class="st-lb">Bo góc</span><input type="range" min="0" max="1.6" step=".1" value="${M.radius}" class="st-rng" data-rad="1"></div>
        <div class="st-row">${T.map ? tog('map', '🗺 Bản đồ') : ''}${tog('date', '📅 Ngày giờ')}${tog('people', '👨‍👩‍👧 Người có mặt')}${tog('addr', '📍 Địa chỉ')}${tog('note', '📝 Lời kể')}${tog('logo', '✨ Logo nhỏ')}</div>`;
      PANEL.querySelector('[data-rad]').oninput = e => { S.M.radius = +e.target.value; redraw(); }; PANEL.querySelector('[data-rad]').onchange = () => setM(() => { }, { thumbs: true, panel: false });
    }
  }
  PANEL.addEventListener('click', async e => {
    const b = e.target.closest('button, input[data-show]'); if (!b) return; const d = b.dataset;
    if (b.matches('input[data-show]')) { setM(M => { M.show[d.show] = b.checked; }, { thumbs: true, panel: false }); sfx('tick'); return; }
    sfx('tick'); haptic(5);
    if (d.tpl) { fontLater(tplOf(d.tpl).font); setM(M => { const keep = { photos: M.photos, ratio: M.ratio }; const nm = defModel(d.tpl, keep); nm.text = M.text; Object.assign(M, nm); }); }
    else if (d.mine) { const t = ((await A.metaGet('sy:stampTpls')) || []).find(x => x.id === d.mine); if (t) { fontLater(fontOf(t.model)); setM(M => { const ph = M.photos, tx = M.text; Object.assign(M, clone(t.model)); M.photos = ph; M.text = tx; }, { thumbs: true }); } }
    else if (d.x === 'savetpl') { const row = PANEL.querySelector('.st-namer'); if (row) { row.remove(); return; } b.closest('.st-row').insertAdjacentHTML('afterend', `<div class="st-row st-namer"><input maxlength="30" value="${esc(tplOf(S.M.tpl).t)} của tôi" aria-label="Tên mẫu"><button class="st-chip on" data-x="savetpl2">Lưu mẫu</button></div>`); PANEL.querySelector('.st-namer input').focus(); return; }
    else if (d.x === 'savetpl2') { const nm = PANEL.querySelector('.st-namer input').value.trim(); if (!nm) return; const list = (await A.metaGet('sy:stampTpls')) || []; const m = clone(S.M); m.photos = []; m.text = {}; list.unshift({ id: Date.now().toString(36), name: nm, model: m }); await A.metaSet('sy:stampTpls', list.slice(0, 20)); A.toast(`Đã lưu mẫu “${nm}” ⭐`, 1800); sfx('ting'); panel(); }
    else if (d.x === 'reset') setM(M => { const nm = defModel(M.tpl, { photos: M.photos.map(p => ({ mid: p.mid })), ratio: M.ratio }); Object.assign(M, nm); }, { thumbs: true });
    else if (d.edit) editText(d.edit);
    else if (d.font) { fontLater(d.font); setM(M => { M.font = d.font === tplOf(M.tpl).font ? null : d.font; }, { thumbs: true }); }
    else if (d.size) setM(M => { M.size = Math.max(.75, Math.min(1.4, Math.round((M.size + d.size * .05) * 100) / 100)); });
    else if (d.color) setM(M => { M.color = d.color; }, { thumbs: true });
    else if (d.x === 'auto') { const img = S.R.imgs.get(S.M.photos[0]?.mid); const c = img && colorFrom(img); if (c) setM(M => { M.color = c; }, { thumbs: true }); else A.toast('Ảnh này chưa đủ màu để lấy — chọn màu trong bảng nhé', 2200); }
    else if (d.ph) { const m = S.e.ms.find(x => x.id === d.ph); const i = S.M.photos.findIndex(p => p.mid === d.ph); if (i >= 0) { if (S.M.photos.length > 1) setM(M => M.photos.splice(i, 1), { thumbs: true }); } else { setM(M => { if (M.photos.length >= 3) M.photos.pop(); M.photos.push({ mid: m.id }); }, { thumbs: true }); } await loadImgs(); draw(); }
    else if (d.lay) { const n = +d.lay; if (n === 3 && S.M.photos.length < 3) { const more = S.e.ms.filter(m => !S.M.photos.some(p => p.mid === m.id) && m.type !== 'video').slice(0, 3 - S.M.photos.length); if (!more.length) { A.toast('Sự kiện này chưa đủ 3 ảnh', 1800); return; } setM(M => more.forEach(m => M.photos.push({ mid: m.id })), { thumbs: true }); await loadImgs(); draw(); } else if (n === 1) setM(M => { M.photos.length = 1; }, { thumbs: true }); }
    else if (d.x === 'refit') setM(M => M.photos.forEach(p => { delete p.z; delete p.x; delete p.y; }));
    else if (d.stk) { setM(M => { M.stickers.push({ k: d.stk, x: .5 + (M.stickers.length % 3 - 1) * .12, y: .42, s: 1.5, r: (M.stickers.length % 2 ? 8 : -8) }); S.sel = M.stickers.length - 1; }, { panel: false }); sfx('pop'); }
    else if (d.ratio) setM(M => { M.ratio = d.ratio; }, { thumbs: true });
  });
  MD.querySelector('.st-tools').addEventListener('click', e => { const b = e.target.closest('[data-tool]'); if (!b) return; S.tool = b.dataset.tool; sfx('pip'); haptic(5); panel(); });
  MD.querySelector('.st-top').addEventListener('click', e => { const b = e.target.closest('[data-x]'); if (b?.dataset.x === 'undo' && S.hi > 0) { S.hi--; S.M = JSON.parse(S.hist[S.hi]); S.thumbs = null; loadImgs().then(() => { draw(); panel(); }); sfx('whoosh'); } else if (b?.dataset.x === 'redo' && S.hi < S.hist.length - 1) { S.hi++; S.M = JSON.parse(S.hist[S.hi]); S.thumbs = null; loadImgs().then(() => { draw(); panel(); }); sfx('whoosh'); } });
  new ResizeObserver(() => { if (MD.classList.contains('open') && S.M) redraw(); }).observe(STAGE);
  // ---------- mở ----------
  async function open(e, opt = {}) {
    if (!e?.geo) { A.toast('Sự kiện này chưa có nơi chốn — đặt nơi chốn trên bản đồ trước nhé', 2600); return; }
    const tok = ++S.tok; S.e = e; S.sel = -1; S.aud = false; S.thumbs = null;
    let mids = (opt.mids || []).filter(id => e.ms.some(m => m.id === id)); if (!mids.length) mids = [e.stack?.[0]?.id || e.ms[0].id];
    const last = (await A.metaGet('stampLast')) || null; // lần trước dùng mẫu nào thì mở mẫu đó
    S.M = last ? { ...defModel(last.tpl, { ratio: last.ratio }), ...clone(last), photos: [], text: {} } : defModel('gmaps');
    S.M.photos = mids.slice(0, 3).map(mid => ({ mid })); S.M.stickers ||= [];
    const g = e.geo, ppl = (e.kids || []).map(id => A.person(id)).filter(p => p && p.role !== 'me');
    S.R = { e, info: null, map: null, imgs: new Map(), avatars: [], isVideo, auto: { name: (g.name || e.title).split(',')[0], sub: '', date: autoDate(e.ts0), note: e.note || '', from: 'Nhà mình', to: (g.name || e.title).split(',')[0] } };
    S.hist = []; S.hi = -1; S.tool = 'tpl'; A.openModal(MD); busy(true, 'Đang tải bản đồ và tên nơi…'); await new Promise(r => setTimeout(r, 60));
    fontLater(fontOf(S.M)); await loadImgs(); if (tok !== S.tok) return; commit(); panel();
    const key = 'pli:' + g.lat.toFixed(4) + ',' + g.lon.toFixed(4);
    try { S.R.info = (await A.metaGet(key)) || null; if (!S.R.info && navigator.onLine) { S.R.info = await placeInfo(g.lat, g.lon); await A.metaSet(key, S.R.info); } } catch (er) { }
    const I = S.R.info || {}; if (!(g.src === 'user' && g.name) && I.name) S.R.auto.name = S.R.auto.to = I.name; S.R.auto.sub = [I.cat, I.addr || (g.name || '').split(',').slice(1).join(',').trim()].filter(Boolean).join(' · ');
    for (const p of ppl.slice(0, 6)) { try { const im = new Image(); im.src = await A.avatarURL(p); await im.decode(); S.R.avatars.push({ img: im, name: p.name }); } catch (er) { S.R.avatars.push({ img: null, name: p.name }); } }
    try { S.R.map = navigator.onLine ? await mapSnap({ lat: g.lat, lon: g.lon, W: 1080, H: 680 }) : null; } catch (er) { S.R.map = null; }
    if (tok !== S.tok) return; busy(false); S.thumbs = null; draw(); panel();
  }
  MD.querySelector('.st-save').onclick = save;
  // ---------- xuất ----------
  async function save() {
    if (S.busy || !S.M) return; if (S.file) return share(S.file);
    S.busy = true; busy(true, isVideo(0) ? 'Đang dựng video…' : 'Đang lưu ảnh…'); await A.metaSet('stampLast', (() => { const m = clone(S.M); m.photos = []; m.text = {}; return m; })());
    try {
      const [W, H] = dims(), name = `Tem-${A.noAccent(S.M.text.name || S.R.auto.name || S.e.title)}`;
      if (!isVideo(0)) { const c = document.createElement('canvas'); c.width = W; c.height = H; renderStamp(c.getContext('2d'), S.M, S.R, W, H, { stickers: true, stk }); const b = await new Promise(r => c.toBlob(r, 'image/png')); S.file = new File([b], name + '.png', { type: 'image/png' }); c.width = c.height = 1; }
      else S.file = await makeMp4(name);
      if (S.file.type === 'video/mp4') { OUT.src = URL.createObjectURL(S.file); OUT.hidden = false; CV.hidden = true; }
      busy(false); MD.querySelector('.st-save span').textContent = 'Chia sẻ'; sfx('ting'); A.onSaved?.(S.file); if (!A.TEST) await share(S.file);
    } catch (er) { console.warn(er); busy(false); A.toast('Chưa dựng được: ' + (er.message || er), 3500); } finally { S.busy = false; }
  }
  async function share(f) { if (A.TEST) return; if (A.MOBILE && navigator.canShare?.({ files: [f] })) { try { await navigator.share({ files: [f], title: f.name }); return; } catch (e) { if (e.name === 'AbortError') return; } } await A.shareOrDownload(f, f.name); }
  async function makeMp4(name) {
    const MB = await import('./lib/mediabunny.min.mjs'); if (!window.VideoEncoder) throw new Error('Máy này chưa hỗ trợ mã hoá video (WebCodecs) — chọn ảnh (không phải video) làm ảnh lớn để lưu PNG');
    const m = S.e.ms.find(x => x.id === S.M.photos[0].mid), blob = await A.blob(m.id); if (!blob) throw new Error('Không thấy bản gốc của video trong máy');
    const input = new MB.Input({ source: new MB.BlobSource(blob), formats: MB.ALL_FORMATS }), vt = await input.getPrimaryVideoTrack(); if (!vt || !(await vt.canDecode())) throw new Error('Máy không đọc được video này');
    const vd = (await vt.computeDuration?.()) || m.dur || 6, dur = Math.min(15, Math.max(5, vd)), fps = 30, N = Math.round(dur * fps), [W, H] = dims(), at = S.aud ? await input.getPrimaryAudioTrack() : null;
    if (!(await MB.canEncodeAudio('aac'))) { const enc = await import('./lib/mediabunny-aac-encoder.min.mjs'); enc.registerAacEncoder(); }
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const out = new MB.Output({ format: new MB.Mp4OutputFormat({ fastStart: 'in-memory' }), target: new MB.BufferTarget() }), webkit = /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|CriOS|Edg/.test(navigator.userAgent);
    const vs = new MB.CanvasSource(c, { codec: 'avc', bitrate: 6e6, keyFrameInterval: 2, ...(webkit ? { latencyMode: 'realtime' } : {}) }); out.addVideoTrack(vs, { frameRate: fps });
    let as = null; if (at && await at.canDecode()) { as = new MB.AudioBufferSource({ codec: 'aac', bitrate: 128e3 }); out.addAudioTrack(as); }
    await out.start();
    if (as) { const sink = new MB.AudioBufferSink(at); for await (const { buffer, timestamp } of sink.buffers(0, dur)) { if (timestamp >= dur) break; for (let ch = 0; ch < buffer.numberOfChannels; ch++) { const d = buffer.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] *= .45; } await as.add(buffer); } as.close(); }
    const sink = new MB.CanvasSink(vt, { width: Math.min(1080, Math.round((vt.displayWidth || 1080) / 2) * 2), poolSize: 2 }), ts = []; for (let i = 0; i < N; i++) ts.push(Math.min(vd - .04, (i / fps) % Math.max(.1, vd)));
    let i = 0, last = null;
    for await (const r of sink.canvasesAtTimestamps(ts)) { if (r) last = r.canvas; renderStamp(x, S.M, S.R, W, H, { frame: last, stickers: true, stk }); await vs.add(i / fps, 1 / fps); i++; if (i % 15 === 0) busy(true, `Đang dựng video… ${Math.round(i / N * 100)}%`); if (i >= N) break; }
    vs.close(); await out.finalize(); input.dispose?.();
    return new File([out.target.buffer], name + '.mp4', { type: 'video/mp4' });
  }
  new MutationObserver(() => { if (!MD.classList.contains('open')) { S.tok++; if (!OUT.hidden) OUT.pause(); } }).observe(MD, { attributes: true });
  return { open, get state() { return S; }, editText, draw };
}
