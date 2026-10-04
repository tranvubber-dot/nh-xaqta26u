// Hành Trình Của Bạn — hồ sơ bé, avatar (ảnh cắt tròn hoặc hình vẽ sẵn), màu riêng của từng bé.
import { icon, animateSpring, haptic, fmtLong, clamp, REDUCED } from './ui.js';
import { profileOf, LUNAR_MONTH, MENH_TA, napAm, canChi, CHI, CON } from './hoso-data.js';
import { SIGN, GIAP_L, MENH_L, NUM, lifePath, jobLine, giapPair, signPair, ELEMENT_TXT } from './docvi.js';
import { chibiAvatarSVG, chibiSVG, svgURL, mountChibiEditor } from './chibi.js';
import { isChild, isMe, isPartner, roleOf, roleName } from './doi.js';
// người lớn (hoặc ai đã tự chọn nhân vật) dùng chibi; bé từ các bản cũ giữ hình vẽ cũ
export const useChibi = k => !!k?.chibi || (!!k?.role && !isChild(k));
export const drawnAvatar = k => useChibi(k) ? svgURL(chibiAvatarSVG(k)) : avatarSVG(k);

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
<div id="hs" aria-hidden="true"><div class="hs-bg"></div><div class="hs-sc"><div class="hs-in"></div></div><button class="hs-back glassbtn" aria-label="Đóng">${icon('back', 22, 2)}</button><button class="hs-more glassbtn" aria-label="Tuỳ chọn">${icon('more', 22, 2)}</button></div>
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
<div class="modal" id="mChibi"><div class="card glass" style="width:min(460px,100%)"><h2>Nhân vật của <span class="cbn"></span></h2><div class="ce" id="ceBox"></div><div class="foot"><button data-close>Huỷ</button><button class="primary" data-a="cbok">Lưu nhân vật</button></div></div></div>
<div class="modal" id="mJob"><div class="card glass" style="width:min(440px,100%)"><h2 class="jb-t">Công việc</h2>
  <label class="f">Nghề / công việc<input id="jbJob" maxlength="60" placeholder="Ví dụ: Kỹ sư phần mềm"></label><div class="jb-sug"></div>
  <label class="f">Nơi làm <small class="opt">tuỳ chọn</small><input id="jbAt" maxlength="60" placeholder="Ví dụ: Công ty ABC, Hà Nội"></label>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><label class="f">Từ năm<input id="jbFrom" inputmode="numeric" maxlength="4" placeholder="2015"></label><label class="f">Đến năm<input id="jbTo" inputmode="numeric" maxlength="4" placeholder="để trống = đang làm"></label></div>
  <div class="foot"><button id="jbDel" class="danger">Xoá</button><button data-close>Huỷ</button><button class="primary" id="jbOk">Lưu</button></div></div></div>
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
  const RS = new Map(), rkey = k => `${k.id}:${k.color}:${k.gender}:${k.avStyle || 0}:${k.role || ''}:${k.chibi ? JSON.stringify(k.chibi) : ''}`;
  async function raster(kid) {
    const key = rkey(kid); if (RS.has(key)) return RS.get(key);
    const im = new Image(); im.src = drawnAvatar(kid); await im.decode().catch(() => { });
    const c = document.createElement('canvas'); c.width = c.height = 128; c.getContext('2d').drawImage(im, 0, 0, 128, 128);
    const b = await new Promise(r => c.toBlob(r, 'image/png')); const u = b ? URL.createObjectURL(b) : drawnAvatar(kid); RS.set(key, u); return u;
  }
  const avatarNow = kid => { if (!kid) return ''; if (kid.avatar) { const u = AV.get(kid.id + ':' + kid.avatar); if (u) return u; } return RS.get(rkey(kid)) || drawnAvatar(kid); };
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
    if (useChibi(k) || k.role) { box.innerHTML = `<button data-a="tochibi" class="tochibi"><img src="${svgURL(chibiAvatarSVG(k))}" alt=""><span>Dùng nhân vật chibi</span></button>`; return; }
    box.innerHTML = [0, 1, 2].map(i => `<button data-st="${i}" class="${C.style === i ? 'on' : ''}"><img src="${avatarSVG(k, i)}" alt=""></button>`).join('');
  }
  async function openAvatar(kid, done, src) {
    C.kid = kid; C.done = done; C.style = kid.avatar || src ? null : (kid.avStyle ?? 0);
    M.querySelector('.avn').textContent = kid.name || 'bé'; M.querySelector('.avpick').hidden = true;
    const b = src || (kid.avatar ? await A.dbGet('blobs', 'av_' + kid.id) : null);
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
    else if (a === 'tochibi') { A.closeModal(M); const done = C.done; setTimeout(() => openChibi(C.kid, done), 120); }
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
  const birthTimeTxt = t => { const [h, m] = t.split(':').map(Number); return `${h}:${String(m).padStart(2, '0')} ${h < 11 ? 'sáng' : h < 13 ? 'trưa' : h < 18 ? 'chiều' : 'tối'}`; };
  const birthStats = k => [k.weight ? `${String(k.weight).replace('.', ',')} kg` : '', k.length ? `${String(k.length).replace('.', ',')} cm` : '', k.place ? k.place : ''].filter(Boolean);
  async function openProfile(kid) {
    if (kid && !isChild(kid) && kid.role) return openAdult(kid);
    if (!kid?.birth) return; document.querySelector('.confetti')?.remove();
    const nh = await A.metaGet?.('nhac:' + kid.id);
    const P = profileOf(kid.birth), age = ageParts(kid.birth), z = P.zodiac, col = kid.color || '#ff8fbf', av = await avatarURL(kid);
    HS.style.setProperty('--kc', col); HS.style.setProperty('--kc2', mix(col, '#ffffff', .45));
    const lun = `Ngày ${P.lunar.d} tháng ${LUNAR_MONTH(P.lunar.m)}${P.lunar.leap ? ' (nhuận)' : ''} năm ${P.canChi}`;
    HI.innerHTML = `
      <div class="hs-hero"><div class="hs-av"><img src="${av}" alt=""><i></i></div>
        <h1>${esc(kid.name)}</h1>${kid.fullName ? `<div class="hs-fn">${esc(kid.fullName)}</div>` : ''}<p>${g3(kid, 'Chàng trai nhỏ', 'Công chúa nhỏ', 'Em bé')} · sinh ${esc(fmtLong(new Date(kid.birth + 'T12:00:00').getTime()))}${kid.birthTime ? ` lúc ${esc(birthTimeTxt(kid.birthTime))}` : ''}</p>
        ${birthStats(kid).length ? `<div class="hs-bs">${birthStats(kid).map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
        ${age.today ? `<div class="hs-bday">${icon('cake', 18, 2)}<b>Chúc mừng sinh nhật ${esc(kid.name)}!</b></div>` : ''}
        <div class="hs-tools"><button data-a="edit">${icon('edit', 18)}<span>Sửa thông tin</span></button><button data-a="nhac">${icon('cake', 18)}<span>${nh ? 'Đã đặt nhắc' : 'Nhắc sinh nhật'}</span></button></div></div>
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
      <div class="hs-acts"><button class="primary" data-a="img">${icon('download', 18, 2)}<span>Lưu thẻ hồ sơ thành ảnh</span></button></div>`;
    HS.classList.add('open'); HS.setAttribute('aria-hidden', 'false'); document.body.classList.add('hsopen'); HS.querySelector('.hs-sc').scrollTop = 0;
    HS._kid = kid; HS._p = P; HS._age = age; HS._adult = false;
    if (age.today) setTimeout(() => confetti(col), 500);
  }
  HS.querySelector('.hs-more').onclick = e => { const k = HS._kid; if (!k) return; if (HS._adult) { A.contextMenu({ at: e.currentTarget, title: esc(isMe(k) ? 'Hồ sơ của bạn' : k.name), items: [
    { icon: 'edit', label: 'Sửa thông tin', act: () => { closeProfile(); A.editKid(k); } },
    { icon: 'smile', label: 'Đổi nhân vật chibi', act: () => openChibi(A.rawKid(k.id)) },
    { icon: 'image', label: 'Dùng ảnh làm avatar', act: () => openAvatar(A.rawKid(k.id), async kk => { await A.saveKid(kk); openProfile(A.dispKid(kk.id)); }) },
    { icon: 'download', label: 'Lưu thẻ Đọc vị thành ảnh', act: () => saveAdultCard(k) },
    { sep: 1 }, { icon: 'trash', label: isMe(k) ? 'Xoá hồ sơ của bạn…' : `Xoá ${esc(k.name)}…`, danger: true, act: () => A.removeKid(k) }] }); return; }
    A.contextMenu({ at: e.currentTarget, title: esc(k.name), items: [
    { icon: 'edit', label: 'Sửa tên, ngày sinh, giới tính, màu', act: () => { closeProfile(); A.editKid(k); } },
    { icon: 'smile', label: 'Đổi avatar', act: () => HS.querySelector('[data-a=av]').click() },
    { icon: 'image', label: 'Đổi hình nền', act: () => { closeProfile(); A.openBgSettings(); } },
    { icon: 'bell', label: 'Nhắc sinh nhật hằng năm', act: () => A.nhac(k) },
    { sep: 1 },
    { icon: 'download', label: 'Lưu thẻ hồ sơ thành ảnh', act: () => saveCard(k) },
    { sep: 1 },
    { icon: 'trash', label: `Xoá ${esc(k.name)}…`, danger: true, act: () => A.removeKid(k) }] }); };
  function closeProfile() { document.querySelector('.confetti')?.remove(); HS.classList.remove('open'); HS.setAttribute('aria-hidden', 'true'); document.body.classList.remove('hsopen'); }
  HS.querySelector('.hs-back').onclick = closeProfile;
  HS.addEventListener('click', async e => {
    const b = e.target.closest('[data-a]'); if (!b) return; const k = HS._kid;
    if (b.dataset.a === 'edit') { closeProfile(); A.editKid(k); }
    else if (b.dataset.a === 'chibi') openChibi(A.rawKid(k.id));
    else if (b.dataset.a === 'aimg') saveAdultCard(k);
    else if (b.dataset.a === 'flip') { const c = b.closest('.fc'); c.classList.toggle('on'); haptic(8); }
    else if (b.dataset.a === 'job') openJob(A.rawKid(k.id), b.dataset.i != null ? +b.dataset.i : null);
    else if (b.dataset.a === 'addbd') { closeProfile(); A.editKid(k); }
    else if (b.dataset.a === 'av') openAvatar(A.rawKid(k.id), async kk => { await A.saveKid(kk); openProfile(A.dispKid(kk.id)); });
    else if (b.dataset.a === 'img') saveCard(k);
    else if (b.dataset.a === 'bg') { closeProfile(); A.openBgSettings(); }
    else if (b.dataset.a === 'rm') A.removeKid(k);
    else if (b.dataset.a === 'nhac') A.nhac(k);
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && HS.classList.contains('open') && !document.querySelector('.modal.open')) { e.stopImmediatePropagation(); closeProfile(); } }, true);
  function confetti(col) {
    if (REDUCED) return; const box = document.createElement('div'); box.className = 'confetti'; const cols = [col, '#ffd27f', '#ff8fbf', '#9fe1cb', '#c3a6ff', '#ffffff'];
    for (let i = 0; i < 90; i++) { const p = document.createElement('i'); const x = (Math.random() - .5) * 120, r = Math.random() * 720 - 360; p.style.cssText = `left:${50 + (Math.random() - .5) * 30}%;background:${cols[i % cols.length]};--x:${x}vw;--r:${r}deg;--d:${1.6 + Math.random() * 1.6}s;--w:${6 + Math.random() * 7}px;animation-delay:${Math.random() * .25}s`; box.appendChild(p); }
    document.body.appendChild(box); haptic(30); setTimeout(() => box.remove(), 3800);
  }
  // ---------- ĐỌC VỊ BẢN THÂN (người lớn): cung hoàng đạo, con giáp + mệnh, thần số học, nghề, hợp nhau ----------
  function readingOf(k) {
    if (!k?.birth) return null; const exact = !k.birthApprox, y = +k.birth.slice(0, 4);
    if (!exact) { const chi = CHI[(y + 8) % 12]; return { exact, y, chi, con: CON[(y + 8) % 12], canChi: canChi(y), nap: napAm(y) }; }
    const P = profileOf(k.birth); return { exact, y, P, chi: P.chi, con: P.con, canChi: P.canChi, nap: P.nap, z: P.zodiac, sign: SIGN[P.zodiac.ten], num: lifePath(k.birth) };
  }
  const curJob = k => (k.jobs || []).find(j => !j.to) || (k.jobs || []).slice(-1)[0] || null;
  async function openAdult(kid) {
    document.querySelector('.confetti')?.remove(); const R = readingOf(kid), col = kid.color || '#ff8fbf', me = isMe(kid), job = curJob(kid);
    HS.style.setProperty('--kc', col); HS.style.setProperty('--kc2', mix(col, '#ffffff', .45)); HS._adult = true; HS._kid = kid;
    const hero = kid.avatar ? `<div class="hs-av"><img src="${await avatarURL(kid)}" alt=""><i></i></div>` : `<div class="hs-cb">${chibiSVG(kid, { w: 150 })}</div>`;
    const born = kid.birth ? (kid.birthApprox ? `sinh năm ${kid.birth.slice(0, 4)}` : `sinh ${fmtLong(new Date(kid.birth + 'T12:00:00').getTime())}`) : '';
    const L = R?.P?.lunar, lun = L ? `Âm lịch ${L.d}/${L.m}${L.leap ? ' nhuận' : ''} · ${R.canChi}` : R ? `Năm ${R.canChi}` : '';
    const fc = (cls, front, back) => `<section class="fc ${cls}" data-a="flip"><div class="fc-in"><div class="fc-f">${front}<small class="fc-h">chạm để lật ${icon('chevronRight', 12, 2.4)}</small></div><div class="fc-b">${back}</div></div></section>`;
    const cards = [];
    if (R?.exact) {
      const S = R.sign;
      cards.push(fc('big', `<h3><span class="zk">${R.z.kh}</span>Cung hoàng đạo</h3><div class="v">${R.z.ten}</div><p>Nguyên tố ${R.z.nt} · ${ELEMENT_TXT[R.z.nt]}</p><p class="pa">${esc(S.tc)}</p><div class="chips">${S.manh.map(c => `<span class="chip">${c}</span>`).join('')}</div>`,
        `<h3>${icon('sparkle', 16)}${R.z.ten} · sâu hơn</h3><p class="pa"><b>Làm việc:</b> ${esc(S.viec)}</p><p class="pa"><b>Tình cảm, gia đình:</b> ${esc(S.tinh)}</p><p class="pa"><b>Điều nên lưu ý:</b> ${esc(S.luu)}</p>`));
    }
    if (R) {
      const G = GIAP_L[R.chi], M = MENH_L[R.nap.hanh];
      cards.push(fc('', `<h3>${icon('star', 16)}Con giáp</h3><div class="v">Tuổi ${R.chi}</div><p>${R.canChi} · con ${R.con}</p>`, `<h3>Tuổi ${R.chi}</h3><p class="pa">${esc(G.tc)}</p><p>Con số may mắn: <b>${G.so.join(', ')}</b></p>`));
      cards.push(fc('', `<h3>${icon('sparkle', 16)}Mệnh</h3><div class="v sm">${R.nap.ten}</div><p>hành <b>${R.nap.hanh}</b></p><div class="mau">${M.ma.map(c => `<i style="background:${c}"></i>`).join('')}</div>`, `<h3>Mệnh ${R.nap.hanh}</h3><p class="pa">${esc(M.tc)}</p><p>Màu hợp: <b>${M.mau.join(', ')}</b></p>`));
    }
    if (R?.exact && R.num) { const N = NUM[R.num]; cards.push(fc('big num', `<h3>${icon('sparkle', 16)}Thần số học · số chủ đạo</h3><div class="nb"><b>${R.num}</b><span>${esc(N.t)}</span></div><p class="pa">${esc(N.tc)}</p>`, `<h3>Số ${R.num} · gợi ý cho bạn</h3><p class="pa">${esc(N.goi)}</p><p class="note">Số chủ đạo = cộng dồn mọi chữ số của ngày sinh dương lịch (giữ 11, 22, 33).</p>`)); }
    if (R?.exact) cards.push(`<section class="t"><h3>${icon('heart', 16)}Đá & hoa tháng sinh</h3><div class="v sm"><i class="gem" style="background:${R.P.daMau}"></i>${R.P.da}</div><p>Hoa: <b>${R.P.hoa}</b></p></section>`);
    if (R && !R.exact) cards.push(`<section class="t big invite"><h3>${icon('calendar', 16)}Thêm ngày sinh để xem nhiều hơn</h3><p class="pa">Bạn mới nhập năm sinh, nên app tính con giáp theo năm dương lịch (sinh tháng 1–2 có thể thuộc tuổi năm trước). Bổ sung ngày, tháng sinh để xem <b>cung hoàng đạo</b> và <b>thần số học</b>.</p><button data-a="addbd" class="primary">${icon('edit', 16)}<span>Bổ sung ngày sinh</span></button></section>`);
    if (!R) cards.push(`<section class="t big invite"><h3>${icon('calendar', 16)}Chưa có ngày sinh</h3><p class="pa">Thêm ngày sinh (hoặc chỉ năm sinh) để xem con giáp, mệnh, cung hoàng đạo và thần số học.</p><button data-a="addbd" class="primary">${icon('edit', 16)}<span>Thêm ngày sinh</span></button></section>`);
    // công việc theo thời gian
    const jobs = (kid.jobs || []).map((j, i) => ({ ...j, i })).sort((a, b) => (+a.from || 0) - (+b.from || 0));
    cards.push(`<section class="t big jobs"><h3>${icon('star', 16)}Công việc</h3>${jobs.length ? `<div class="jl">${jobs.map(j => `<button data-a="job" data-i="${j.i}"><b>${esc(j.job)}</b><span>${[j.at, j.from ? (j.to ? `${j.from} – ${j.to}` : `từ ${j.from}`) : (j.to ? `đến ${j.to}` : 'hiện tại')].filter(Boolean).map(esc).join(' · ')}</span></button>`).join('')}</div>` : '<p>Chưa có — thêm nghề theo từng giai đoạn, app tự đánh dấu cột mốc “Việc làm đầu tiên”.</p>'}
      ${R?.exact && job ? `<p class="pa jline">✨ ${esc(jobLine(R.z.ten, R.z.nt, job.job))}</p>` : ''}<button data-a="job" class="jb-add">${icon('plus', 16, 2.2)}<span>Thêm công việc</span></button></section>`);
    // hợp nhau: bạn ↔ bạn đời, con (hoặc người này ↔ bạn)
    const pairs = [], others = A.people ? A.people() : [], me0 = others.find(isMe);
    const withs = me ? others.filter(o => !isMe(o) && (isPartner(o) || roleOf(o) === 'con')) : (me0 ? [me0] : []);
    for (const o of withs) { const Ro = readingOf(o); if (!R || !Ro) continue; const gp = giapPair(R.chi, Ro.chi); pairs.push(`<div class="pr"><img src="${avatarNow(o)}" alt=""><div><b>${esc(isMe(o) ? 'Bạn' : o.name)}${isMe(o) ? '' : ` · ${roleName(o)}`}</b><p>${'💗'.repeat(gp.lv)} ${esc(gp.t)}</p>${R.exact && Ro.exact ? `<p>${esc(signPair(R.z, Ro.z))}</p>` : ''}</div></div>`); }
    if (pairs.length) cards.push(`<section class="t big pairs"><h3>${icon('heart', 16)}Hợp nhau</h3>${pairs.join('')}</section>`);
    HI.innerHTML = `<div class="hs-hero">${hero}<h1>${esc(me ? kid.name : kid.name)}</h1>${kid.fullName ? `<div class="hs-fn">${esc(kid.fullName)}</div>` : ''}
        <p>${esc([me ? 'Hồ sơ của bạn' : roleName(kid), born].filter(Boolean).join(' · '))}</p>${lun ? `<p class="hs-lun">${esc(lun)}${job ? ` · ${esc(job.job)}` : ''}</p>` : ''}
        <div class="hs-tools"><button data-a="edit">${icon('edit', 18)}<span>Sửa thông tin</span></button><button data-a="chibi">${icon('smile', 18)}<span>Đổi nhân vật</span></button></div></div>
      <h2 class="hs-dv">✨ Đọc vị bản thân</h2>
      <div class="hs-grid adult">${cards.join('')}</div><p class="hs-note">Mang tính tham khảo cho vui · không bàn chuyện vận hạn, tương lai</p>
      <div class="hs-acts"><button class="primary" data-a="aimg">${icon('download', 18, 2)}<span>Lưu thẻ Đọc vị thành ảnh</span></button></div>`;
    HS.classList.add('open'); HS.setAttribute('aria-hidden', 'false'); document.body.classList.add('hsopen'); HS.querySelector('.hs-sc').scrollTop = 0;
  }
  // chọn nhân vật chibi
  const MC = $('#mChibi'); let CE = null, CK = null;
  function openChibi(k, done) { CK = k; MC.querySelector('.cbn').textContent = isMe(k) ? 'bạn' : k.name; CE = mountChibiEditor($('#ceBox'), k); MC._done = done; A.openModal(MC); }
  MC.querySelector('[data-a=cbok]').onclick = async () => { const k = CK; if (!k) return; k.chibi = CE.get(); k.avatar = 0; A.closeModal(MC); haptic(12); if (MC._done) MC._done(k); else { await A.saveKid(k); if (HS.classList.contains('open')) openProfile(A.dispKid(k.id)); } };
  // công việc theo thời gian: { job, at, from, to }
  const MJ = $('#mJob'); let JK = null, JI = null;
  const JOBS = ['Học sinh', 'Sinh viên', 'Nhân viên văn phòng', 'Kinh doanh', 'Kỹ sư', 'Giáo viên', 'Bác sĩ', 'Nội trợ', 'Nghỉ hưu', 'Tự do'];
  function openJob(k, i) {
    JK = k; JI = i; const j = i != null ? k.jobs[i] : {}; MJ.querySelector('.jb-t').textContent = i != null ? 'Sửa công việc' : 'Thêm công việc';
    $('#jbJob').value = j.job || ''; $('#jbAt').value = j.at || ''; $('#jbFrom').value = j.from || ''; $('#jbTo').value = j.to || ''; $('#jbDel').hidden = i == null;
    MJ.querySelector('.jb-sug').innerHTML = JOBS.map(t => `<button type="button" data-j="${t}">${t}</button>`).join(''); A.openModal(MJ);
  }
  MJ.querySelector('.jb-sug').onclick = e => { const b = e.target.closest('[data-j]'); if (b) { $('#jbJob').value = b.dataset.j; haptic(5); } };
  const yr = v => { v = String(v || '').replace(/\D/g, ''); return v.length === 4 ? v : null; };
  $('#jbOk').onclick = async () => { const job = $('#jbJob').value.trim(); if (!job) { A.toast('Bạn nhập nghề / công việc nhé'); return; } const j = { job, at: $('#jbAt').value.trim() || null, from: yr($('#jbFrom').value), to: yr($('#jbTo').value) }; JK.jobs = (JK.jobs || []).slice(); if (JI != null) JK.jobs[JI] = j; else JK.jobs.push(j); A.closeModal(MJ); await A.saveKid(JK); openProfile(A.dispKid(JK.id)); };
  $('#jbDel').onclick = async () => { if (JI == null) return; JK.jobs = JK.jobs.filter((_, i) => i !== JI); A.closeModal(MJ); await A.saveKid(JK); openProfile(A.dispKid(JK.id)); };
  // thẻ Đọc vị 1080×1920
  async function saveAdultCard(kid) {
    const R = readingOf(kid), col = kid.color || '#ff8fbf', W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), F = (w, s) => `${w} ${s}px Quicksand, sans-serif`;
    const g = x.createLinearGradient(0, 0, W * .4, H); g.addColorStop(0, mix(col, '#ffffff', .6)); g.addColorStop(.6, mix(col, '#ffffff', .85)); g.addColorStop(1, mix(col, '#e8dcff', .7)); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 80; i++) { x.fillStyle = `rgba(255,255,255,${.25 + Math.random() * .5})`; x.beginPath(); x.arc(Math.random() * W, Math.random() * H, 2 + Math.random() * 5, 0, 7); x.fill(); }
    const rr = (X, Y, w, h, r) => { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); };
    const im = new Image(); im.src = kid.avatar ? await avatarURL(kid) : svgURL(chibiSVG(kid, { w: 360 })); await im.decode().catch(() => { });
    if (kid.avatar) { x.save(); x.beginPath(); x.arc(W / 2, 300, 170, 0, 7); x.clip(); x.drawImage(im, W / 2 - 170, 130, 340, 340); x.restore(); } else x.drawImage(im, W / 2 - 180, 70, 360, 480);
    x.textAlign = 'center'; x.fillStyle = '#3d1b35'; x.font = F(700, 96); x.fillText(kid.name, W / 2, 640, W - 100);
    x.fillStyle = mix(col, '#000000', .35); x.font = F(700, 38); x.fillText('✨ Đọc vị bản thân', W / 2, 705);
    const tiles = []; if (R?.exact) tiles.push([`${R.z.kh} Cung hoàng đạo`, R.z.ten, SIGN[R.z.ten].manh.slice(0, 2).join(' · ')]);
    if (R) { tiles.push(['Con giáp', `Tuổi ${R.chi}`, R.canChi]); tiles.push(['Mệnh', R.nap.hanh, R.nap.ten]); }
    if (R?.exact && R.num) tiles.push(['Số chủ đạo', String(R.num), NUM[R.num].t.replace(/^Số bậc thầy \d+ · /, '')]);
    tiles.forEach((t, i) => { const cx = 70 + (i % 2) * 480, cy = 760 + Math.floor(i / 2) * 230; rr(cx, cy, 460, 205, 40); x.fillStyle = 'rgba(255,255,255,.74)'; x.fill(); x.textAlign = 'left'; x.fillStyle = mix(col, '#000000', .3); x.font = F(700, 32); x.fillText(t[0], cx + 34, cy + 58, 400); x.fillStyle = '#3d1b35'; x.font = F(700, 52); x.fillText(t[1], cx + 34, cy + 125, 400); x.fillStyle = '#7d5a75'; x.font = F(600, 29); x.fillText(t[2], cx + 34, cy + 172, 400); });
    const para = R?.exact ? SIGN[R.z.ten].tc : R ? GIAP_L[R.chi].tc : '', job = curJob(kid), jl = R?.exact && job ? jobLine(R.z.ten, R.z.nt, job.job) : '';
    let y0 = 760 + Math.ceil(tiles.length / 2) * 230 + 40; x.textAlign = 'left'; x.fillStyle = '#3d1b35'; x.font = F(600, 36);
    const wrap = (txt, yy, lh = 52) => { const ws = txt.split(' '); let line = ''; for (const w of ws) { if (x.measureText(line + w).width > W - 160) { x.fillText(line, 80, yy); yy += lh; line = ''; } line += w + ' '; } if (line) { x.fillText(line, 80, yy); yy += lh; } return yy; };
    if (para) y0 = wrap(para, y0) + 20; if (jl) { x.fillStyle = mix(col, '#000000', .3); x.font = F(700, 34); y0 = wrap('✨ ' + jl, y0); }
    x.textAlign = 'center'; x.fillStyle = '#7d5a75'; x.font = F(600, 28); x.fillText('Mang tính tham khảo cho vui · Hành Trình Của Bạn', W / 2, H - 60);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .92)), name = `DocVi-${A.noAccent(kid.name)}.jpg`;
    await A.shareOrDownload(new File([blob], name, { type: 'image/jpeg' }), name); if (!A.TEST) A.toast('Đã lưu thẻ Đọc vị', 1800);
    return blob;
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
    const fy = kid.fullName ? 1 : 0;
    x.textAlign = 'center'; x.fillStyle = '#3d1b35'; x.font = F(700, 104); x.fillText(kid.name, W / 2, fy ? 612 : 640, W - 100);
    if (fy) { x.fillStyle = '#9a6a1e'; x.font = F(700, 38); x.fillText(kid.fullName, W / 2, 672, W - 120); }
    x.fillStyle = mix(col, '#000000', .35); x.font = F(700, fy ? 34 : 40); x.fillText(`${g3(kid, 'Chàng trai nhỏ', 'Công chúa nhỏ', 'Em bé')} · sinh ${fmtLong(new Date(kid.birth + 'T12:00:00').getTime())}`, W / 2, fy ? 728 : 710, W - 120);
    const tiles = [['Tuổi hôm nay', ageLine(age), `đã sống ${age.days.toLocaleString('vi-VN')} ngày`], ['Âm lịch', `${P.lunar.d}/${P.lunar.m}${P.lunar.leap ? ' nhuận' : ''} ${P.canChi}`, `sinh vào ${A.WD[P.wd]}`], ['Năm sinh', P.canChi, `tuổi ${P.chi} – con ${P.con}`], ['Mệnh', P.nap.ten, `hành ${P.nap.hanh}`], ['Cung hoàng đạo', P.zodiac.ten, `${P.zodiac.nt} · ${P.zodiac.ht}`], ['Đá & hoa', P.da.split(' (')[0], `hoa ${P.hoa}`]];
    tiles.forEach((t, i) => { const cx = 70 + (i % 2) * 480, cy = 780 + Math.floor(i / 2) * 230; rr(cx, cy, 460, 205, 40); x.fillStyle = 'rgba(255,255,255,.72)'; x.fill(); x.strokeStyle = 'rgba(255,255,255,.95)'; x.lineWidth = 3; x.stroke();
      x.textAlign = 'left'; x.fillStyle = mix(col, '#000000', .3); x.font = F(700, 32); x.fillText(t[0], cx + 34, cy + 58); x.fillStyle = '#3d1b35'; x.font = F(700, 46); x.fillText(t[1], cx + 34, cy + 122, 400); x.fillStyle = '#7d5a75'; x.font = F(600, 30); x.fillText(t[2], cx + 34, cy + 170, 400); });
    let cx = 70, cy = 1505; x.font = F(700, 34);
    for (const ch of P.zodiac.chip) { const w = x.measureText(ch).width + 56; if (cx + w > W - 70) { cx = 70; cy += 78; } rr(cx, cy, w, 62, 31); x.fillStyle = mix(col, '#ffffff', .25); x.fill(); x.fillStyle = '#fff'; x.textAlign = 'center'; x.fillText(ch, cx + w / 2, cy + 43); cx += w + 14; }
    x.textAlign = 'center'; x.fillStyle = '#7d5a75'; x.font = F(600, 28); x.fillText('Mang tính tham khảo cho vui · Hành Trình Của Bạn', W / 2, H - 60);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .92)), name = `HoSo-${A.noAccent(kid.name)}.jpg`;
    await A.shareOrDownload(new File([blob], name, { type: 'image/jpeg' }), name); if (!A.TEST) A.toast('Đã lưu thẻ hồ sơ', 1800);
    return blob;
  }
  return { birthTimeTxt, birthStats, confetti, avatarURL, avatarNow, warm, openAvatar, openProfile, closeProfile, askGender, saveCard, saveAdultCard, openChibi, openJob, readingOf, ageParts, isOpen: () => HS.classList.contains('open') };
}
