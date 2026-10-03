// Ngân Hà Của Con — hồ sơ bé, avatar (ảnh cắt tròn hoặc hình vẽ sẵn), màu riêng của từng bé.
import { icon, animateSpring, haptic, fmtLong, clamp, REDUCED } from './ui.js';
import { profileOf, LUNAR_MONTH, MENH_TA } from './hoso-data.js';

export const KID_COLORS = ['#4f9dff', '#2fc6c0', '#7c86ff', '#55c8f5', '#54cf8e', '#ff76ad', '#b483ff', '#ff8a78', '#ffc24f', '#e07cf0'];
const BOY = ['#4f9dff', '#2fc6c0', '#7c86ff', '#55c8f5', '#54cf8e'], GIRL = ['#ff76ad', '#b483ff', '#e07cf0', '#ff8a78', '#ffc24f'];
export function defaultColor(gender, used = []) { const pool = gender === 'm' ? BOY : gender === 'f' ? GIRL : KID_COLORS; return pool.find(c => !used.includes(c)) || pool[used.length % pool.length]; }
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mix = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };

// ---------- avatar vẽ sẵn (SVG tự vẽ) ----------
export function avatarSVG(kid, style) {
  const c = kid?.color || '#ff8fbf', g = kid?.gender, st = style ?? kid?.avStyle ?? 0, hair = g === 'f' ? '#6b3a2a' : '#4a2c22', light = mix(c, '#ffffff', .55), deep = mix(c, '#000000', .18);
  let back = '', front = '';
  if (g === 'f') {
    if (st === 0) { back = `<circle cx="22" cy="44" r="12" fill="${hair}"/><circle cx="78" cy="44" r="12" fill="${hair}"/>`; front = `<path d="M26 46c2-18 14-26 24-26s22 8 24 26c-8-9-16-12-24-12s-16 3-24 12z" fill="${hair}"/><g fill="${deep}"><path d="M14 34l8 6-8 6z"/><path d="M30 34l-8 6 8 6z"/><path d="M70 34l8 6-8 6z"/><path d="M86 34l-8 6 8 6z"/></g>`; }
    else if (st === 1) { back = `<path d="M18 60c-2-26 12-42 32-42s34 16 32 42c-4 10-8 14-12 16V52H30v24c-4-2-8-6-12-16z" fill="${hair}"/>`; front = `<path d="M28 46c4-14 12-20 22-20s18 6 22 20c-6-6-12-6-16-2-2-6-6-8-6-8s-4 2-6 8c-4-4-10-4-16 2z" fill="${hair}"/><g fill="${deep}" transform="translate(64 26)"><path d="M0 4l9-6v12z"/><path d="M18 4L9-2v12z"/><circle cx="9" cy="4" r="3" fill="#fff"/></g>`; }
    else { back = `<circle cx="50" cy="18" r="11" fill="${hair}"/>`; front = `<path d="M26 48c2-18 12-26 24-26s22 8 24 26c-6-8-14-12-24-12s-18 4-24 12z" fill="${hair}"/><circle cx="50" cy="12" r="4" fill="${deep}"/>`; }
  } else if (g === 'm') {
    if (st === 0) front = `<path d="M27 46c2-17 12-25 23-25s21 8 23 25c-7-7-15-10-23-10s-16 3-23 10z" fill="${hair}"/><path d="M50 22c-2-8 4-12 9-10-4 1-6 4-5 9z" fill="${hair}"/>`;
    else if (st === 1) front = `<path d="M25 50c0-20 12-30 26-30 13 0 24 9 24 26-10-2-18-8-22-14-6 8-16 14-28 18z" fill="${hair}"/>`;
    else front = `<path d="M26 47l4-14 6 6 4-12 6 8 5-11 5 11 6-8 4 12 6-6 3 14c-8-6-16-9-24-9s-17 3-25 9z" fill="${hair}"/>`;
  } else front = `<path d="M30 40c4-12 12-16 20-16 10 0 16 6 18 12-6-4-12-4-18 0 2-6-2-10-6-9 2 4 0 8-4 10-4-2-8-2-10 3z" fill="${hair}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><radialGradient id="b" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${c}"/></radialGradient></defs>
<circle cx="50" cy="50" r="50" fill="url(#b)"/>${back}<circle cx="50" cy="56" r="27" fill="#ffe2cc"/><ellipse cx="23.5" cy="58" rx="5" ry="6" fill="#ffd2b8"/><ellipse cx="76.5" cy="58" rx="5" ry="6" fill="#ffd2b8"/>${front}
<ellipse cx="40" cy="58" rx="3.6" ry="4.2" fill="#3a2433"/><ellipse cx="60" cy="58" rx="3.6" ry="4.2" fill="#3a2433"/><circle cx="41.3" cy="56.4" r="1.3" fill="#fff"/><circle cx="61.3" cy="56.4" r="1.3" fill="#fff"/>
<ellipse cx="33" cy="66" rx="5" ry="3.2" fill="#ff9fb5" opacity=".7"/><ellipse cx="67" cy="66" rx="5" ry="3.2" fill="#ff9fb5" opacity=".7"/><path d="M43 68q7 7 14 0" stroke="#3a2433" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

export function initProfile(A) {
  const $ = s => document.querySelector(s);
  document.body.insertAdjacentHTML('beforeend', `
<div id="hs" aria-hidden="true"><div class="hs-bg"></div><div class="hs-sc"><div class="hs-in"></div></div><button class="hs-back glassbtn" aria-label="Đóng">${icon('back', 22, 2)}</button></div>
<div class="modal" id="mAv"><div class="card glass">
  <h2>Avatar của <span class="avn"></span></h2>
  <div class="avc"><div class="avc-v"><img alt="" draggable="false"></div><i class="avc-r"></i></div>
  <label class="avz">${icon('image', 16)}<input type="range" min="100" max="400" value="100" aria-label="Phóng to"></label>
  <p class="hint" style="text-align:center;margin-top:4px">Kéo ảnh để căn mặt vào giữa vòng tròn, chụm hoặc kéo thanh để phóng to.</p>
  <div class="drow" style="justify-content:center;margin-top:10px"><button data-a="file">${icon('image', 18)}<span>Chọn ảnh trong máy</span></button><button data-a="kid">${icon('heart', 18)}<span>Chọn ảnh của bé</span></button></div>
  <div class="bgpick avpick" hidden></div>
  <h4 style="margin:16px 0 8px">Hoặc dùng hình vẽ</h4><div class="avst"></div>
  <input type="file" accept="image/*" hidden class="avf">
  <div class="foot"><button data-close>Huỷ</button><button class="primary" data-a="ok">Lưu avatar</button></div>
</div></div>
<div class="modal" id="mGen"><div class="card glass" style="width:min(420px,100%)"><h2 class="gn-t"></h2><p class="lead">Để app chọn màu và lời trong nhật ký cho hợp với bé. Đổi lại được trong thông tin bé.</p>
  <div class="dbig"><button class="primary" data-g="m" style="background:linear-gradient(135deg,#4f9dff,#2fc6c0)">Bé trai</button><button class="primary" data-g="f">Bé gái</button></div>
  <div class="foot"><button data-close>Để sau</button></div></div></div>`);

  // ---------- avatar: lấy URL hiển thị ----------
  const AV = new Map();
  async function avatarURL(kid) {
    if (!kid) return '';
    if (kid.avatar) { const k = kid.id + ':' + kid.avatar; if (AV.has(k)) return AV.get(k); const b = await A.dbGet('blobs', 'av_' + kid.id); if (b) { const u = URL.createObjectURL(b); AV.set(k, u); return u; } }
    return raster(kid);
  }
  // avatar vẽ sẵn: rasterize một lần thành PNG để hàng trăm viên tuổi không phải giải mã SVG mỗi lần
  const RS = new Map(), rkey = k => `${k.id}:${k.color}:${k.gender}:${k.avStyle || 0}`;
  async function raster(kid) {
    const key = rkey(kid); if (RS.has(key)) return RS.get(key);
    const im = new Image(); im.src = avatarSVG(kid); await im.decode().catch(() => { });
    const c = document.createElement('canvas'); c.width = c.height = 128; c.getContext('2d').drawImage(im, 0, 0, 128, 128);
    const b = await new Promise(r => c.toBlob(r, 'image/png')); const u = b ? URL.createObjectURL(b) : avatarSVG(kid); RS.set(key, u); return u;
  }
  const avatarNow = kid => { if (!kid) return ''; if (kid.avatar) { const u = AV.get(kid.id + ':' + kid.avatar); if (u) return u; } return RS.get(rkey(kid)) || avatarSVG(kid); };
  async function warm(kids) { for (const k of kids) { if (k.avatar) await avatarURL(k); else await raster(k); } }

  // ---------- trình cắt avatar tròn ----------
  const M = $('#mAv'), img = M.querySelector('.avc-v img'), zr = M.querySelector('.avz input');
  const C = { kid: null, src: null, url: null, w: 0, h: 0, s: 1, x: 0, y: 0, style: null, done: null };
  const VW = 240;
  function applyT() { const base = Math.max(VW / C.w, VW / C.h), s = base * C.s; const mx = Math.max(0, (C.w * s - VW) / 2), my = Math.max(0, (C.h * s - VW) / 2); C.x = clamp(C.x, -mx, mx); C.y = clamp(C.y, -my, my); img.style.width = C.w * s + 'px'; img.style.height = C.h * s + 'px'; img.style.transform = `translate(calc(-50% + ${C.x}px), calc(-50% + ${C.y}px))`; }
  async function setSrc(blob) {
    if (C.url) URL.revokeObjectURL(C.url); C.url = URL.createObjectURL(blob); C.style = null;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = C.url; }).catch(() => { A.toast('Ảnh này chưa mở được — bạn thử ảnh khác nhé'); });
    C.w = img.naturalWidth || 1; C.h = img.naturalHeight || 1; C.s = 1; C.x = 0; C.y = 0; zr.value = 100; applyT(); renderStyles();
  }
  function renderStyles() {
    const k = C.kid; if (!k) return; const box = M.querySelector('.avst');
    box.innerHTML = [0, 1, 2].map(i => `<button data-st="${i}" class="${C.style === i ? 'on' : ''}"><img src="${avatarSVG(k, i)}" alt=""></button>`).join('');
  }
  async function openAvatar(kid, done) {
    C.kid = kid; C.done = done; C.style = kid.avatar ? null : (kid.avStyle ?? 0);
    M.querySelector('.avn').textContent = kid.name || 'bé'; M.querySelector('.avpick').hidden = true;
    const b = kid.avatar ? await A.dbGet('blobs', 'av_' + kid.id) : null;
    if (b) await setSrc(b); else { img.src = avatarSVG(kid, C.style); C.w = C.h = 100; C.s = 1; C.x = C.y = 0; applyT(); renderStyles(); }
    A.openModal(M);
  }
  { // kéo + chụm để căn mặt
    const v = M.querySelector('.avc'), pts = new Map(); let g = null;
    v.addEventListener('pointerdown', e => { if (C.style != null) return; v.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); const P = [...pts.values()]; g = P.length === 2 ? { d: Math.hypot(P[0][0] - P[1][0], P[0][1] - P[1][1]), s: C.s } : { x: e.clientX, y: e.clientY, x0: C.x, y0: C.y }; });
    v.addEventListener('pointermove', e => { if (!pts.has(e.pointerId) || !g) return; pts.set(e.pointerId, [e.clientX, e.clientY]); const P = [...pts.values()]; if (P.length === 2 && g.d) { C.s = clamp(g.s * Math.hypot(P[0][0] - P[1][0], P[0][1] - P[1][1]) / g.d, 1, 4); zr.value = C.s * 100; } else if (g.x0 != null) { C.x = g.x0 + e.clientX - g.x; C.y = g.y0 + e.clientY - g.y; } applyT(); });
    const up = e => { pts.delete(e.pointerId); if (!pts.size) g = null; };
    v.addEventListener('pointerup', up); v.addEventListener('pointercancel', up);
    v.addEventListener('wheel', e => { if (C.style != null) return; e.preventDefault(); C.s = clamp(C.s * Math.exp(-e.deltaY * .002), 1, 4); zr.value = C.s * 100; applyT(); }, { passive: false });
    zr.addEventListener('input', () => { C.s = zr.value / 100; applyT(); });
  }
  M.addEventListener('click', async e => {
    const st = e.target.closest('[data-st]'); if (st) { C.style = +st.dataset.st; img.src = avatarSVG(C.kid, C.style); C.w = C.h = 100; C.s = 1; C.x = C.y = 0; zr.value = 100; applyT(); renderStyles(); haptic(5); return; }
    const pk = e.target.closest('.avpick [data-mid]'); if (pk) { const m = A.allMoments().find(x => x.id === pk.dataset.mid); const b = (!m.heic && m.type === 'image' && await A.dbGet('blobs', 'o_' + m.id)) || await A.dbGet('blobs', 't_' + m.id); M.querySelector('.avpick').hidden = true; await setSrc(b); return; }
    const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
    if (a === 'file') M.querySelector('.avf').click();
    else if (a === 'kid') {
      const g = M.querySelector('.avpick'); g.hidden = !g.hidden; if (g.hidden) return;
      const ms = A.allMoments().filter(m => m.type === 'image' && A.kidsOf(m).includes(C.kid.id)).sort((x, y) => y.ts - x.ts).slice(0, 60);
      g.innerHTML = ms.length ? ms.map(m => `<button data-mid="${m.id}"></button>`).join('') : '<p class="hint">Chưa có ảnh nào của bé.</p>';
      g.querySelectorAll('[data-mid]').forEach(x => A.dbGet('blobs', 't_' + x.dataset.mid).then(t => { if (t) x.style.backgroundImage = `url('${URL.createObjectURL(t)}')`; }));
    } else if (a === 'ok') {
      const k = C.kid;
      if (C.style != null) { k.avatar = 0; k.avStyle = C.style; }
      else {
        const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d'), base = Math.max(VW / C.w, VW / C.h) * C.s, f = 256 / VW;
        x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 256); x.imageSmoothingQuality = 'high';
        x.drawImage(img, (VW / 2 + C.x - C.w * base / 2) * f, (VW / 2 + C.y - C.h * base / 2) * f, C.w * base * f, C.h * base * f);
        const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', .9)); await A.dbPut('blobs', blob, 'av_' + k.id); k.avatar = Date.now();
      }
      A.closeModal(M); haptic(12); C.done?.(k);
    }
  });
  M.querySelector('.avf').onchange = e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setSrc(f); };

  // ---------- hỏi giới tính (dữ liệu cũ) ----------
  function askGender(kid) {
    return new Promise(res => {
      const G = $('#mGen'); G.querySelector('.gn-t').textContent = `${kid.name} là bé trai hay bé gái?`;
      const h = e => { const b = e.target.closest('[data-g]'); if (!b) return; G.removeEventListener('click', h); A.closeModal(G); res(b.dataset.g); };
      G.addEventListener('click', h); A.openModal(G);
      const ob = new MutationObserver(() => { if (!G.classList.contains('open')) { ob.disconnect(); G.removeEventListener('click', h); res(null); } }); ob.observe(G, { attributes: true });
    });
  }

  // ---------- trang hồ sơ ----------
  const HS = $('#hs'), HI = HS.querySelector('.hs-in');
  function ageParts(birth, now = new Date()) {
    const b = new Date(birth + 'T00:00:00'), d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let y = d.getFullYear() - b.getFullYear(), m = d.getMonth() - b.getMonth(), dd = d.getDate() - b.getDate();
    if (dd < 0) { m--; dd += new Date(d.getFullYear(), d.getMonth(), 0).getDate(); } if (m < 0) { y--; m += 12; }
    const days = Math.round((d - b) / 864e5);
    let nb = new Date(d.getFullYear(), b.getMonth(), b.getDate()); if (nb < d) nb = new Date(d.getFullYear() + 1, b.getMonth(), b.getDate());
    const until = Math.round((nb - d) / 864e5), turn = nb.getFullYear() - b.getFullYear();
    return { y, m, d: dd, days, until, turn, today: until === 0 || (d.getMonth() === b.getMonth() && d.getDate() === b.getDate() && days > 0), born: days >= 0 };
  }
  const ageLine = p => !p.born ? 'Sắp chào đời' : [p.y ? `${p.y} tuổi` : '', p.m ? `${p.m} tháng` : '', p.d || (!p.y && !p.m) ? `${p.d} ngày` : ''].filter(Boolean).join(' ');
  const g3 = (kid, a, b, c) => kid.gender === 'm' ? a : kid.gender === 'f' ? b : c;
  async function openProfile(kid) {
    if (!kid?.birth) return;
    const P = profileOf(kid.birth), age = ageParts(kid.birth), z = P.zodiac, col = kid.color || '#ff8fbf', av = await avatarURL(kid);
    HS.style.setProperty('--kc', col); HS.style.setProperty('--kc2', mix(col, '#ffffff', .45));
    const lun = `Ngày ${P.lunar.d} tháng ${LUNAR_MONTH(P.lunar.m)}${P.lunar.leap ? ' (nhuận)' : ''} năm ${P.canChi}`;
    HI.innerHTML = `
      <div class="hs-hero"><div class="hs-av"><img src="${av}" alt=""><i></i></div>
        <h1>${esc(kid.name)}</h1><p>${g3(kid, 'Chàng trai nhỏ', 'Công chúa nhỏ', 'Em bé')} · sinh ${esc(fmtLong(new Date(kid.birth + 'T12:00:00').getTime()))}</p>
        <button class="hs-edit" data-a="edit">${icon('edit', 16)}<span>Sửa thông tin</span></button></div>
      <div class="hs-grid">
        <section class="t big"><h3>${icon('heart', 18)}Tuổi hôm nay</h3><div class="v">${ageLine(age)}</div>
          <p>Đã sống <b>${age.days.toLocaleString('vi-VN')}</b> ngày${age.born ? '' : ''}</p>
          <p class="cdn">${age.today ? `<b>Hôm nay là sinh nhật ${age.y} tuổi của ${esc(kid.name)}!</b>` : age.born ? `Còn <b>${age.until}</b> ngày nữa là sinh nhật <b>${age.turn} tuổi</b>` : ''}</p></section>
        <section class="t"><h3>${icon('calendar', 18)}Âm lịch</h3><div class="v sm">${lun}</div><p>Sinh vào <b>${A.WD[P.wd]}</b></p></section>
        <section class="t"><h3>${icon('star', 18)}Năm sinh</h3><div class="v">${P.canChi}</div><p>Tuổi ${P.chi} – con ${P.con}</p></section>
        <section class="t"><h3>${icon('sparkle', 18)}Mệnh</h3><div class="v sm">${P.nap.ten}</div><p>${P.nap.nghia} · hành <b>${P.nap.hanh}</b></p></section>
        <section class="t"><h3><span class="zk">${z.kh}</span>Cung hoàng đạo</h3><div class="v">${z.ten}</div><p>Nguyên tố ${z.nt} · ${z.ht}</p></section>
        <section class="t"><h3>${icon('heart', 18)}Đá & hoa tháng sinh</h3><div class="v sm"><i class="gem" style="background:${P.daMau}"></i>${P.da}</div><p>Hoa: <b>${P.hoa}</b></p></section>
        <section class="t big"><h3>${icon('sparkle', 18)}Tính cách đáng yêu</h3><div class="chips">${z.chip.map(c => `<span class="chip">${c}</span>`).join('')}</div>
          <p class="pa">${esc(z.ta)}</p><p class="pa">${esc(P.giap)} Mệnh ${P.nap.hanh} thường ${MENH_TA[P.nap.hanh]}.</p><p class="note">Mang tính tham khảo cho vui</p></section>
      </div>
      <div class="hs-acts"><button class="primary" data-a="img">${icon('download', 18, 2)}<span>Lưu thẻ hồ sơ thành ảnh</span></button><button data-a="av">${icon('image', 18)}<span>Đổi avatar</span></button></div>`;
    HS.classList.add('open'); HS.setAttribute('aria-hidden', 'false'); document.body.classList.add('hsopen'); HS.querySelector('.hs-sc').scrollTop = 0;
    HS._kid = kid; HS._p = P; HS._age = age;
    if (age.today) setTimeout(() => confetti(col), 500);
  }
  function closeProfile() { HS.classList.remove('open'); HS.setAttribute('aria-hidden', 'true'); document.body.classList.remove('hsopen'); }
  HS.querySelector('.hs-back').onclick = closeProfile;
  HS.addEventListener('click', async e => {
    const b = e.target.closest('[data-a]'); if (!b) return; const k = HS._kid;
    if (b.dataset.a === 'edit') { closeProfile(); A.editKid(k); }
    else if (b.dataset.a === 'av') openAvatar(A.rawKid(k.id), async kk => { await A.saveKid(kk); openProfile(A.dispKid(kk.id)); });
    else if (b.dataset.a === 'img') saveCard(k);
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && HS.classList.contains('open') && !document.querySelector('.modal.open')) { e.stopImmediatePropagation(); closeProfile(); } }, true);
  function confetti(col) {
    if (REDUCED) return; const box = document.createElement('div'); box.className = 'confetti'; const cols = [col, '#ffd27f', '#ff8fbf', '#9fe1cb', '#c3a6ff', '#ffffff'];
    for (let i = 0; i < 90; i++) { const p = document.createElement('i'); const x = (Math.random() - .5) * 120, r = Math.random() * 720 - 360; p.style.cssText = `left:${50 + (Math.random() - .5) * 30}%;background:${cols[i % cols.length]};--x:${x}vw;--r:${r}deg;--d:${1.6 + Math.random() * 1.6}s;--w:${6 + Math.random() * 7}px;animation-delay:${Math.random() * .25}s`; box.appendChild(p); }
    document.body.appendChild(box); haptic(30); setTimeout(() => box.remove(), 3800);
    A.toast(`Chúc mừng sinh nhật ${HS._kid?.name || 'bé'}!`, 3200);
  }
  // ---------- lưu thẻ hồ sơ thành ảnh (khổ dọc 1080×1920) ----------
  async function saveCard(kid) {
    const P = HS._p, age = HS._age, col = kid.color || '#ff8fbf', W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const F = (w, s) => `${w} ${s}px Quicksand, sans-serif`;
    const g = x.createLinearGradient(0, 0, W * .4, H); g.addColorStop(0, mix(col, '#ffffff', .62)); g.addColorStop(.55, mix(col, '#ffffff', .82)); g.addColorStop(1, mix(col, '#ffd9c4', .7)); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(255,255,255,${.25 + Math.random() * .5})`; x.beginPath(); x.arc(Math.random() * W, Math.random() * H, 2 + Math.random() * 5, 0, 7); x.fill(); }
    const rr = (X, Y, w, h, r) => { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); };
    // avatar
    const im = new Image(); im.src = await avatarURL(kid); await im.decode().catch(() => { });
    x.save(); x.shadowColor = col; x.shadowBlur = 60; x.fillStyle = col; x.beginPath(); x.arc(W / 2, 330, 196, 0, 7); x.fill(); x.restore();
    x.save(); x.beginPath(); x.arc(W / 2, 330, 180, 0, 7); x.clip(); x.drawImage(im, W / 2 - 180, 150, 360, 360); x.restore();
    x.textAlign = 'center'; x.fillStyle = '#3d1b35'; x.font = F(700, 104); x.fillText(kid.name, W / 2, 640);
    x.fillStyle = mix(col, '#000000', .35); x.font = F(700, 40); x.fillText(`${g3(kid, 'Chàng trai nhỏ', 'Công chúa nhỏ', 'Em bé')} · sinh ${fmtLong(new Date(kid.birth + 'T12:00:00').getTime())}`, W / 2, 710, W - 120);
    const tiles = [['Tuổi hôm nay', ageLine(age), `đã sống ${age.days.toLocaleString('vi-VN')} ngày`], ['Âm lịch', `${P.lunar.d}/${P.lunar.m}${P.lunar.leap ? ' nhuận' : ''} ${P.canChi}`, `sinh vào ${A.WD[P.wd]}`], ['Năm sinh', P.canChi, `tuổi ${P.chi} – con ${P.con}`], ['Mệnh', P.nap.ten, `hành ${P.nap.hanh}`], ['Cung hoàng đạo', P.zodiac.ten, `${P.zodiac.nt} · ${P.zodiac.ht}`], ['Đá & hoa', P.da.split(' (')[0], `hoa ${P.hoa}`]];
    tiles.forEach((t, i) => { const cx = 70 + (i % 2) * 480, cy = 780 + Math.floor(i / 2) * 230; rr(cx, cy, 460, 205, 40); x.fillStyle = 'rgba(255,255,255,.72)'; x.fill(); x.strokeStyle = 'rgba(255,255,255,.95)'; x.lineWidth = 3; x.stroke();
      x.textAlign = 'left'; x.fillStyle = mix(col, '#000000', .3); x.font = F(700, 32); x.fillText(t[0], cx + 34, cy + 58); x.fillStyle = '#3d1b35'; x.font = F(700, 46); x.fillText(t[1], cx + 34, cy + 122, 400); x.fillStyle = '#7d5a75'; x.font = F(600, 30); x.fillText(t[2], cx + 34, cy + 170, 400); });
    let cx = 70, cy = 1505; x.font = F(700, 34);
    for (const ch of P.zodiac.chip) { const w = x.measureText(ch).width + 56; if (cx + w > W - 70) { cx = 70; cy += 78; } rr(cx, cy, w, 62, 31); x.fillStyle = mix(col, '#ffffff', .25); x.fill(); x.fillStyle = '#fff'; x.textAlign = 'center'; x.fillText(ch, cx + w / 2, cy + 43); cx += w + 14; }
    x.textAlign = 'center'; x.fillStyle = '#7d5a75'; x.font = F(600, 28); x.fillText('Mang tính tham khảo cho vui · Ngân Hà Của Con', W / 2, H - 60);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .92)), name = `HoSo-${A.noAccent(kid.name)}.jpg`;
    await A.shareOrDownload(new File([blob], name, { type: 'image/jpeg' }), name); if (!A.TEST) A.toast('Đã lưu thẻ hồ sơ', 1800);
    return blob;
  }
  return { avatarURL, avatarNow, warm, openAvatar, openProfile, closeProfile, askGender, saveCard, ageParts, isOpen: () => HS.classList.contains('open') };
}
