// Ngân Hà Của Con — màn chính: DÒNG SỰ KIỆN DỌC (mới nhất trên cùng), trang sự kiện, trình xem ảnh/video toàn màn hình.
// Cuộn bằng cuộn gốc của trình duyệt (iPhone có quán tính + giãn cao su sẵn); chuyển động bằng lò xo (ui.js).
import { icon, animateSpring, rubber, haptic, IOS, REDUCED, fmtLong, clamp } from './ui.js';
import { timeVN } from './nhatky.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = n => String(n).padStart(2, '0');
const MONTH = m => `Tháng ${m + 1}`;
function rng(seed) { let a = 0; for (const ch of String(seed)) a = (a * 31 + ch.charCodeAt(0)) | 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const HTML = `
<div id="tlv">
  <div id="tl" tabindex="-1"><div class="tl-in"></div></div>
</div>
<div id="evp" aria-hidden="true">
  <div class="evp-bg"></div>
  <div class="evp-sc">
    <div class="evp-hero"><img alt=""></div>
    <div class="evp-body">
      <div class="evp-dt"></div><h2 class="evp-ti"></h2><div class="evp-ag"></div><div class="evp-ct"></div><p class="evp-nt"></p>
      <div class="evp-acts">
        <button data-a="diary">${icon('book', 20)}<span>Tạo nhật ký</span></button>
        <button data-a="rename">${icon('edit', 20)}<span>Đổi tên</span></button>
        <button data-a="add">${icon('plus', 20)}<span>Thêm ảnh</span></button>
        <button data-a="merge">${icon('merge', 20)}<span>Gộp / tách</span></button>
      </div>
      <div class="evp-dia"></div>
      <div class="evp-grid"></div>
    </div>
  </div>
  <button class="evp-back glassbtn" aria-label="Quay lại">${icon('back', 22, 2)}</button>
</div>
<div id="pv" aria-hidden="true">
  <div class="pv-bg"></div><div class="pv-track"></div>
  <div class="pv-top"><button class="glassbtn" data-a="close" aria-label="Đóng">${icon('close', 22, 2)}</button><span class="pv-count"></span></div>
  <div class="pv-tray">
    <div class="grab"><i></i></div>
    <div class="pv-ti"></div><div class="pv-dt"></div><div class="pv-ag"></div>
    <div class="pv-more"><p class="pv-nt"></p><div class="pv-acts">
      <button data-a="edit">${icon('edit', 19)}<span>Sửa</span></button>
      <button data-a="save">${icon('download', 19)}<span>Lưu về máy</span></button>
      <button data-a="split">${icon('split', 19)}<span>Tách từ ảnh này</span></button>
      <button data-a="del" class="danger">${icon('trash', 19)}<span>Xoá</span></button>
    </div></div>
  </div>
</div>
<div id="fsc" aria-hidden="true"><i class="th"></i><span class="bb"></span></div>
<div class="modal" id="mEvName"><div class="card glass">
  <h2>Đổi tên sự kiện</h2><p class="lead evn-sub"></p>
  <label class="f">Tên sự kiện<input id="evnTi" maxlength="60"></label>
  <label class="f">Ghi chú<textarea id="evnNt" maxlength="2000" placeholder="Hôm nay có gì vui?"></textarea></label>
  <div class="foot"><button id="evnAuto">Dùng tên tự động</button><button data-close>Huỷ</button><button class="primary" id="evnOk">Lưu</button></div>
</div></div>
<div class="modal" id="mEvMerge"><div class="card glass"><h2>Gộp hoặc tách</h2><p class="lead">Mỗi ngày có ảnh là một sự kiện. Bạn gộp hai ngày liền nhau thành một (vd chuyến đi chơi), hoặc tách một ngày thành hai — mở một ảnh rồi bấm “Tách từ ảnh này”.</p><div class="evm-list"></div><div class="foot"><button data-close>Xong</button></div></div></div>
<div class="modal" id="mEdM"><div class="card glass">
  <h2>Sửa khoảnh khắc</h2>
  <label class="f">Tên khoảnh khắc<input id="emTi" maxlength="80" placeholder="Ví dụ: Bước đi đầu tiên"></label>
  <label class="f">Ngày<input id="emDt" type="date"></label><div class="datehint" id="emDtH"></div>
  <label class="f">Ghi chú<textarea id="emNt" maxlength="2000" placeholder="Kể lại chút về khoảnh khắc này…"></textarea></label>
  <div class="foot"><button data-close>Huỷ</button><button class="primary" id="emOk">Lưu</button></div>
</div></div>
<div class="modal" id="mJump"><div class="card glass"><h2>Nhảy tới</h2><div class="jmp"></div><div class="foot"><button data-close>Đóng</button></div></div></div>
<input type="file" id="evFiles" accept="image/*,video/*" multiple hidden>`;

export function initTimeline(A) {
  const $ = s => document.querySelector(s);
  document.body.insertAdjacentHTML('beforeend', HTML);
  const TLV = $('#tlv'), TL = $('#tl'), IN = TL.querySelector('.tl-in'), EVP = $('#evp'), PV = $('#pv'), FSC = $('#fsc');
  TLV.insertAdjacentHTML('afterbegin', '<div class="rail"><i></i></div>');
  const st = { guard: 0, events: [], meta: null, url: new Map(), shown: new WeakSet(), cur: null, wide: false };
  const wide = () => innerWidth >= 900;

  // ---------- ảnh nhỏ (nạp lười) ----------
  const URLS = new Map();
  async function thumbURL(mid) {
    if (URLS.has(mid)) { const u = URLS.get(mid); URLS.delete(mid); URLS.set(mid, u); return u; }
    const b = await A.dbGet('blobs', 't_' + mid); if (!b) return '';
    const u = URL.createObjectURL(b); URLS.set(mid, u);
    if (URLS.size > 260) { const [k, v] = URLS.entries().next().value; URLS.delete(k); setTimeout(() => URL.revokeObjectURL(v), 4000); }
    return u;
  }
  const imgIO = new IntersectionObserver(es => {
    for (const en of es) {
      const im = en.target;
      if (en.isIntersecting) { if (!im.getAttribute('src')) thumbURL(im.dataset.mid).then(u => { if (u && im.isConnected) { im.src = u; im.onload = () => im.classList.add('ok'); } }); }
      else if (im.getAttribute('src')) { im.removeAttribute('src'); im.classList.remove('ok'); }
    }
  }, { rootMargin: '1400px 0px' });
  // tiêu đề năm vừa dính lên đầu → nảy nhẹ
  const yrIO = new IntersectionObserver(es => { for (const en of es) { const h = en.target.nextElementSibling; const stuck = !en.isIntersecting && en.boundingClientRect.top < 120; if (stuck && !h.classList.contains('stuck')) { h.classList.add('stuck'); h.animate?.([{ transform: 'scale(1.18)' }, { transform: 'none' }], { duration: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sp-wobbly-ms')) || 600, easing: getComputedStyle(document.documentElement).getPropertyValue('--sp-wobbly').trim() || 'ease-out' }); haptic(4); } else if (!stuck) h.classList.remove('stuck'); } }, { rootMargin: '-110px 0px 0px 0px' });
  let revealN = 0, revealT = 0;
  const cardIO = new IntersectionObserver(es => {
    const now = performance.now(); if (now - revealT > 120) revealN = 0; revealT = now;
    for (const en of es) if (en.isIntersecting && !en.target.classList.contains('in')) { en.target.style.transitionDelay = (REDUCED ? 0 : Math.min(revealN++, 6) * 55) + 'ms'; en.target.classList.add('in'); cardIO.unobserve(en.target); }
  }, { rootMargin: '0px 0px -6% 0px', threshold: .08 });

  // ---------- gộp ảnh thành sự kiện (theo ngày + cột mốc) ----------
  async function loadMeta() {
    const k = A.kid(); st.meta = Object.assign({ titles: {}, notes: {}, merges: [], splits: {}, covers: {} }, (k && await A.metaGet('ev:' + k.id)) || {});
  }
  const saveMeta = () => A.metaSet('ev:' + A.kid().id, st.meta);
  function milestone(kid, days) {
    if (!kid?.birth) return null;
    const b = new Date(kid.birth + 'T12:00:00'), out = [];
    for (const ds of days) {
      const d = new Date(ds + 'T12:00:00'), diff = Math.round((d - b) / 864e5), yrs = d.getFullYear() - b.getFullYear();
      if (diff === 0) out.push({ k: 'birth', p: 5, label: `Ngày ${kid.name} chào đời`, ic: 'star' });
      else if (yrs >= 1 && d.getMonth() === b.getMonth() && d.getDate() === b.getDate()) out.push(yrs === 1 ? { k: 'thoinoi', p: 4, label: 'Thôi nôi · Sinh nhật 1 tuổi', ic: 'cake' } : { k: 'bday', p: 4, label: `Sinh nhật ${yrs} tuổi`, ic: 'cake' });
      else if (diff === 100) out.push({ k: '100', p: 3, label: '100 ngày', ic: 'sparkle' });
      else { const m1 = new Date(b); m1.setMonth(b.getMonth() + 1); if (m1.getDate() === b.getDate() && A.ymd(m1.getTime()) === ds) out.push({ k: 'thang', p: 2, label: 'Đầy tháng', ic: 'heart' }); }
    }
    return out.sort((x, y) => y.p - x.p)[0] || null;
  }
  const SES = { sang: ['Buổi sáng vui vẻ', 'Chào ngày mới', 'Sáng nay của {n}', 'Nắng sớm dịu dàng'], trua: ['Buổi trưa ấm áp', 'Trưa nay có gì vui', 'Giờ ăn trưa'], chieu: ['Buổi chiều dịu dàng', 'Chiều đi chơi', 'Chiều nắng đẹp', 'Một chiều vui'], toi: ['Buổi tối quây quần', 'Tối nay của {n}', 'Tối ấm áp'], dem: ['Đêm yên bình', 'Giấc ngủ ngon'] };
  function autoTitle(e, kid) {
    if (e.preg) return `${kid.name} trong bụng mẹ`;
    const R = rng(e.key), n = e.ms.length, hs = e.ms.map(m => new Date(m.ts).getHours()).sort((a, b) => a - b), h = hs[hs.length >> 1];
    const ses = h < 5 ? 'dem' : h < 11 ? 'sang' : h < 14 ? 'trua' : h < 18 ? 'chieu' : h < 22 ? 'toi' : 'dem';
    if (e.days.length > 1) return 'Những ngày vui';
    if (e.ms.every(m => m.type === 'video')) return n > 1 ? 'Những thước phim nhỏ' : 'Thước phim nhỏ';
    const pool = n >= 10 ? ['Một ngày thật vui', 'Ngày đầy ắp kỷ niệm', 'Ngày rộn ràng'] : SES[ses];
    return pool[Math.floor(R() * pool.length)].replace('{n}', kid.name);
  }
  function compute() {
    const kid = A.kid(), M = st.meta, ms = A.moments().slice().sort((a, b) => a.ts - b.ts);
    const byDay = new Map(); for (const m of ms) { const d = A.ymd(m.ts); if (!byDay.has(d)) byDay.set(d, []); byDay.get(d).push(m); }
    let evs = [];
    for (const [day, list] of byDay) {
      const cuts = (M.splits[day] || []).slice().sort((a, b) => a - b); let seg = [], k = 0, ci = 0;
      const push = () => { if (seg.length) evs.push({ key: k ? `${day}#${k}` : day, day, days: [day], ms: seg }); k++; seg = []; };
      for (const m of list) { while (ci < cuts.length && m.ts >= cuts[ci]) { push(); ci++; } seg.push(m); }
      push();
    }
    for (const grp of M.merges) {
      const parts = evs.filter(e => grp.includes(e.key)); if (parts.length < 2) continue;
      const f = parts[0]; f.ms = parts.flatMap(p => p.ms).sort((a, b) => a.ts - b.ts); f.days = [...new Set(parts.flatMap(p => p.days))]; f.merged = grp;
      evs = evs.filter(e => e === f || !parts.includes(e));
    }
    const b0 = kid?.birth ? A.dayStart(A.parseYmd(kid.birth)) : 0, dias = A.diaries();
    for (const e of evs) {
      e.ts0 = e.ms[0].ts; e.ts1 = e.ms[e.ms.length - 1].ts;
      e.nImg = e.ms.filter(m => m.type !== 'video').length; e.nVid = e.ms.length - e.nImg;
      e.preg = A.dayStart(e.ts0) < b0;
      e.mile = e.preg ? null : milestone(kid, e.days);
      e.auto = autoTitle(e, kid);
      e.title = M.titles[e.key] || e.mile?.label || e.auto;
      e.note = M.notes[e.key] || '';
      const ids = new Set(e.ms.map(m => m.id));
      e.diaries = dias.filter(d => d.pages.some(p => p.panels.some(q => ids.has(q.mid))));
      const cov = M.covers[e.key] && e.ms.find(m => m.id === M.covers[e.key]);
      const imgs = e.ms.filter(m => m.type !== 'video'), pool = imgs.length >= 3 ? imgs : e.ms;
      const pick = pool.length <= 3 ? pool : [pool[0], pool[Math.floor(pool.length / 2)], pool[pool.length - 1]];
      e.stack = cov ? [cov, ...pick.filter(m => m !== cov)].slice(0, 3) : pick;
    }
    evs.sort((a, b) => b.ts0 - a.ts0);
    st.events = evs; st.byKey = new Map(evs.map(e => [e.key, e]));
    return evs;
  }
  const countTxt = e => [e.nImg ? `${e.nImg} ảnh` : '', e.nVid ? `${e.nVid} video` : ''].filter(Boolean).join(' · ');
  const dateTxt = e => { const d = new Date(e.ts0); return e.days.length > 1 ? `${A.dmy(e.ts0).slice(0, 5)} – ${A.dmy(e.ts1)}` : `${A.WD[d.getDay()]} · ${A.dmy(e.ts0)}`; };

  // ---------- dựng dòng sự kiện ----------
  function card(e, i) {
    const side = st.wide ? (i % 2 ? 'R' : 'L') : 'R', ag = A.ageText(A.kid(), e.ts0);
    const chips = [e.nImg ? `<span class="chip">${icon('image', 15, 1.9)}${e.nImg} ảnh</span>` : '', e.nVid ? `<span class="chip">${icon('video', 15, 1.9)}${e.nVid} video</span>` : '',
      e.diaries.length ? `<button class="chip bk" data-diary="${e.diaries[0].id}">${icon('book', 15, 1.9)}nhật ký</button>` : '', ag && ag !== e.title ? `<span class="chip age">${esc(ag)}</span>` : ''].join('');
    return `<article class="ev ${side}${e.mile ? ' mile' : ''}${e.preg ? ' preg' : ''}" data-key="${esc(e.key)}">
      <div class="dot">${e.mile ? icon(e.mile.ic, 13, 2.2) : ''}</div>
      <div class="cd" role="button" tabindex="0" aria-label="${esc(e.title)}">
        <div class="tx">
          <div class="dt">${e.mile ? `<span class="mb">${icon(e.mile.ic, 12, 2.1)}Cột mốc</span>` : ''}<span>${esc(dateTxt(e))}</span></div>
          <h3>${esc(e.title)}</h3>
          <div class="chips">${chips}</div>
        </div>
        <div class="stk n${e.stack.length}">${e.stack.map((m, j) => `<div class="pol p${j}${m.type === 'video' ? ' v' : ''}"><img data-mid="${m.id}" alt="" decoding="async"></div>`).join('')}${e.nVid ? `<span class="vb">${icon('play', 11, 2.4)}</span>` : ''}</div>
      </div></article>`;
  }
  function render(keep = true) {
    const kid = A.kid(); if (!kid) { IN.innerHTML = ''; return; }
    const anchor = keep ? topAnchor() : null;
    st.wide = wide(); TL.classList.toggle('wide', st.wide); document.body.classList.toggle('tlwide', st.wide);
    const evs = compute(), n = A.moments().length;
    const out = [`<header class="lt"><button class="lt-name" data-a="kid"><h1>${esc(kid.name)}</h1>${icon('chevronDown', 22, 2.2)}</button><p>${esc(A.ageText(kid, Date.now()) || '')}${n ? ` · ${n} khoảnh khắc · ${evs.length} ngày đáng nhớ` : ''}</p></header>`];
    if (!evs.length) out.push(`<div class="empty"><div class="em-ic">${icon('sparkle', 46, 1.4)}</div><h3>Dòng thời gian của ${esc(kid.name)} đang chờ những khoảnh khắc đầu tiên</h3><p>Bấm nút <b>+</b> ở giữa thanh dưới để thêm ảnh, video. App tự đọc ngày chụp và xếp vào đúng ngày.</p><button class="primary" data-a="add">${icon('plus', 18, 2.2)}<span>Thêm khoảnh khắc đầu tiên</span></button></div>`);
    let y = null, mo = null, i = 0;
    for (const e of evs) {
      const d = new Date(e.ts0), yy = d.getFullYear(), mm = d.getMonth();
      if (yy !== y) {
        if (y !== null) out.push('</section>');
        const by = kid.birth ? +kid.birth.slice(0, 4) : 0, age = yy - by, sub = !by ? '' : age < 0 ? 'Chờ ngày gặp con' : age === 0 ? `Năm ${esc(kid.name)} chào đời` : `${esc(kid.name)} tròn ${age} tuổi`;
        out.push(`<section class="yr" data-y="${yy}"><i class="ysen"></i><h2 class="yh"><b>${yy}</b>${sub ? `<small>${sub}</small>` : ''}</h2>`); y = yy; mo = null;
      }
      if (mm !== mo) { out.push(`<div class="mo" data-ym="${yy}-${mm}"><span>${MONTH(mm)}${e.preg ? ' · trước khi chào đời' : ''}</span></div>`); mo = mm; }
      out.push(card(e, i++));
    }
    if (y !== null) out.push('</section>');
    if (evs.length) out.push(`<div class="tl-end">${icon('star', 18, 1.8)}<span>Hành trình của ${esc(kid.name)} bắt đầu từ đây</span></div>`);
    IN.innerHTML = out.join('');
    IN.querySelectorAll('.pol img').forEach(im => imgIO.observe(im));
    IN.querySelectorAll('.ev').forEach(el => cardIO.observe(el));
    IN.querySelectorAll('.ysen').forEach(el => yrIO.observe(el));
    if (anchor) restoreAnchor(anchor);
    onScroll(true);
  }
  function topAnchor() { // giữ chỗ đang xem khi dựng lại
    const evs = [...IN.querySelectorAll('.ev')]; const top = TL.scrollTop;
    const el = evs.find(x => x.offsetTop + x.offsetHeight > top + 80); return el ? { key: el.dataset.key, off: el.offsetTop - top } : null;
  }
  function restoreAnchor(a) { const el = IN.querySelector(`.ev[data-key="${CSS.escape(a.key)}"]`); if (el) { el.classList.add('in'); TL.scrollTop = el.offsetTop - a.off; } }
  const evEl = key => IN.querySelector(`.ev[data-key="${CSS.escape(key)}"]`);
  function scrollToKey(key, { bounce = true, smooth = true } = {}) {
    const el = evEl(key); if (!el) return;
    el.classList.add('in');
    TL.scrollTo({ top: Math.max(0, el.offsetTop - innerHeight * .3), behavior: smooth && !REDUCED ? 'smooth' : 'auto' });
    if (bounce) setTimeout(() => { el.classList.remove('hl'); void el.offsetWidth; el.classList.add('hl'); haptic(10); }, smooth ? 650 : 50);
  }
  const keyOfMid = mid => st.events.find(e => e.ms.some(m => m.id === mid))?.key;

  // ---------- cuộn: thu tiêu đề lớn, năm trôi chậm, thanh cuộn nhanh ----------
  let raf = 0, fscT = 0, lastTop = 0;
  function onScroll(force) {
    if (raf && !force) return;
    raf = requestAnimationFrame(() => {
      raf = 0; const top = TL.scrollTop, H = TL.clientHeight;
      const p = clamp(top / 70, 0, 1); document.body.style.setProperty('--tlp', p.toFixed(3));
      document.body.classList.toggle('tl-scrolled', p > .6);
      const max = TL.scrollHeight - H;
      if (max > 0) { const t = FSC.querySelector('.th'); t.style.transform = `translate3d(0,${(top / max * (FSC.clientHeight - 44)).toFixed(1)}px,0)`; }
      if (Math.abs(top - lastTop) > 2 && max > H * 2.5) { FSC.classList.add('on'); clearTimeout(fscT); fscT = setTimeout(() => { if (!fsDrag) FSC.classList.remove('on'); }, 1300); }
      lastTop = top; A.onScroll?.(max > 0 ? top / max : 0);
    });
  }
  TL.addEventListener('scroll', () => onScroll(), { passive: true });
  addEventListener('resize', () => { if (wide() !== st.wide) render(); });
  // giãn cao su khi kéo quá đầu/cuối (iPhone đã có sẵn; máy tính dùng con lăn thì tự làm)
  if (!IOS) {
    let over = 0, idle = 0, stop = null;
    const apply = v => { IN.style.transform = v ? `translate3d(0,${rubber(v, 380).toFixed(1)}px,0)` : ''; };
    TL.addEventListener('wheel', e => {
      const atTop = TL.scrollTop <= 0, atEnd = TL.scrollTop >= TL.scrollHeight - TL.clientHeight - 1;
      if (!((atTop && e.deltaY < 0) || (atEnd && e.deltaY > 0)) && !over) return;
      stop?.(); over = clamp(over - e.deltaY * .9, -900, 900); if ((over > 0 && !atTop) || (over < 0 && !atEnd)) over = 0; apply(over);
      clearTimeout(idle); idle = setTimeout(() => { const o = over; over = 0; stop = animateSpring(o, 0, { k: 210, c: 17 }, v => apply(v), () => apply(0)); }, 90);
    }, { passive: true });
  }
  // thanh cuộn nhanh kiểu ứng dụng Ảnh
  let fsDrag = null;
  FSC.addEventListener('pointerdown', e => { e.preventDefault(); FSC.setPointerCapture(e.pointerId); fsDrag = { y: e.clientY, moved: false }; FSC.classList.add('on', 'drag'); });
  FSC.addEventListener('pointermove', e => {
    if (!fsDrag) return; if (Math.abs(e.clientY - fsDrag.y) > 6) fsDrag.moved = true; if (!fsDrag.moved) return;
    const r = FSC.getBoundingClientRect(), f = clamp((e.clientY - r.top - 22) / (r.height - 44), 0, 1);
    TL.scrollTop = f * (TL.scrollHeight - TL.clientHeight);
    const mid = TL.scrollTop + TL.clientHeight * .4, el = [...IN.querySelectorAll('.ev')].find(x => x.offsetTop + x.offsetHeight > mid);
    const ev = el && st.byKey.get(el.dataset.key);
    if (ev) { const d = new Date(ev.ts0), bb = FSC.querySelector('.bb'); const txt = `${MONTH(d.getMonth())}, ${d.getFullYear()}`; if (bb.textContent !== txt) { bb.textContent = txt; haptic(4); } bb.style.transform = `translate3d(0,${(e.clientY - r.top - 20).toFixed(0)}px,0)`; }
  });
  const fsEnd = () => { if (!fsDrag) return; const tap = !fsDrag.moved; fsDrag = null; FSC.classList.remove('drag'); if (tap) openJump(); clearTimeout(fscT); fscT = setTimeout(() => FSC.classList.remove('on'), 1300); };
  FSC.addEventListener('pointerup', fsEnd); FSC.addEventListener('pointercancel', fsEnd);
  function openJump() {
    const box = $('#mJump .jmp'), years = new Map();
    for (const e of st.events) { const d = new Date(e.ts0), y = d.getFullYear(); if (!years.has(y)) years.set(y, new Map()); const mm = years.get(y); mm.set(d.getMonth(), (mm.get(d.getMonth()) || 0) + 1); }
    box.innerHTML = [...years].map(([y, mm]) => `<div class="jy"><h3>${y}</h3><div class="jms">${[...mm].map(([m, c]) => `<button data-ym="${y}-${m}">${MONTH(m)}<small>${c} ngày</small></button>`).join('')}</div></div>`).join('') || '<p class="lead">Chưa có sự kiện nào.</p>';
    A.openModal($('#mJump'));
  }
  $('#mJump').addEventListener('click', e => { const b = e.target.closest('[data-ym]'); if (!b) return; A.closeModal($('#mJump')); const el = IN.querySelector(`.mo[data-ym="${b.dataset.ym}"]`); if (el) setTimeout(() => TL.scrollTo({ top: el.offsetTop - 90, behavior: REDUCED ? 'auto' : 'smooth' }), 250); });

  IN.addEventListener('click', e => {
    const bk = e.target.closest('.bk'); if (bk) { e.stopPropagation(); A.openDiary(bk.dataset.diary); return; }
    const a = e.target.closest('[data-a]'); if (a?.dataset.a === 'kid') { A.openKidMenu(a); return; } if (a?.dataset.a === 'add') { A.openAdd(); return; }
    if (performance.now() < st.guard) return;
    const cd = e.target.closest('.cd'); if (cd) openEvent(cd.closest('.ev').dataset.key, cd);
  });
  IN.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList.contains('cd')) openEvent(e.target.closest('.ev').dataset.key, e.target); });

  // ---------- trang sự kiện (thẻ phóng ra) ----------
  const fly = (el, from, to, sp = 'soft', done) => { // phần tử dùng chung: bay từ khung from tới khung to bằng lò xo
    el.style.cssText = `position:fixed;left:${to.left}px;top:${to.top}px;width:${to.width}px;height:${to.height}px;z-index:60;transform-origin:0 0;object-fit:cover;border-radius:${from.r || 14}px;transition:none;pointer-events:none;`;
    el.style.transform = `translate(${from.left - to.left}px,${from.top - to.top}px) scale(${from.width / to.width},${from.height / to.height})`;
    document.body.appendChild(el); void el.offsetWidth;
    el.style.transition = `transform var(--sp-${sp}-ms) var(--sp-${sp}), border-radius .35s`; el.style.transform = 'none'; el.style.borderRadius = (to.r ?? 0) + 'px';
    let fin = false; const end = () => { if (fin) return; fin = true; done?.(); };
    el.addEventListener('transitionend', e => { if (e.propertyName === 'transform') end(); }); setTimeout(end, 1300);
  };
  const rectOf = el => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; };
  async function openEvent(key, cdEl) {
    const e = st.byKey.get(key); if (!e) return;
    haptic(8); st.cur = e; EVP.classList.remove('closing'); EVP.querySelector('.evp-sc').scrollTop = 0;
    fillEvent(e);
    const hero = EVP.querySelector('.evp-hero img'), cover = e.stack[0];
    const tu = await thumbURL(cover.id); hero.src = tu; hero.style.visibility = 'hidden';
    EVP.classList.add('open'); EVP.setAttribute('aria-hidden', 'false'); document.body.classList.add('evopen');
    const srcIm = cdEl?.querySelector('.pol.p0 img');
    const to = rectOf(hero);
    if (srcIm && !REDUCED) {
      const g = new Image(); g.src = tu; srcIm.closest('.pol').style.visibility = 'hidden';
      fly(g, { ...rectOf(srcIm), r: 6 }, { ...to, r: 0 }, 'soft', () => { hero.style.visibility = ''; g.remove(); srcIm.closest('.pol').style.visibility = ''; });
    } else hero.style.visibility = '';
    if (cover.type === 'image' && !cover.heic) A.dbGet('blobs', 'o_' + cover.id).then(b => { if (!b || st.cur !== e) return; const u = URL.createObjectURL(b), im = new Image(); im.onload = () => { if (st.cur === e) { hero.src = u; setTimeout(() => URL.revokeObjectURL(u), 60000); } }; im.src = u; });
  }
  function fillEvent(e) {
    EVP.querySelector('.evp-dt').textContent = e.days.length > 1 ? dateTxt(e) : fmtLong(e.ts0);
    EVP.querySelector('.evp-ti').innerHTML = esc(e.title) + (e.mile ? ` <span class="mb">${icon(e.mile.ic, 14, 2)}<b>${esc(e.title === e.mile.label ? 'Cột mốc' : e.mile.label)}</b></span>` : '');
    const ag = A.ageText(A.kid(), e.ts0); EVP.querySelector('.evp-ag').textContent = ag === e.title ? '' : ag;
    EVP.querySelector('.evp-ct').textContent = `${countTxt(e)} · ${timeVN(e.ts0)}${e.ts1 - e.ts0 > 60e3 ? ' – ' + timeVN(e.ts1) : ''}`;
    const nt = EVP.querySelector('.evp-nt'); nt.textContent = e.note; nt.hidden = !e.note;
    EVP.classList.toggle('mile', !!e.mile);
    // nhật ký của ngày này
    const dia = EVP.querySelector('.evp-dia'); dia.innerHTML = '';
    for (const d of e.diaries) { A.dbGet('blobs', 'd_' + d.id).then(b => { const u = b ? URL.createObjectURL(b) : ''; dia.insertAdjacentHTML('beforeend', `<button class="dia" data-diary="${d.id}">${u ? `<img src="${u}" alt="">` : ''}<span>${icon('book', 15)} ${esc(d.title)}</span></button>`); }); }
    // lưới ảnh chia theo giờ
    const groups = []; let g = null;
    for (const m of e.ms) { if (!g || m.ts - g.last > 45 * 60e3) { g = { t: m.ts, last: m.ts, ms: [] }; groups.push(g); } g.ms.push(m); g.last = m.ts; }
    const grid = EVP.querySelector('.evp-grid');
    grid.innerHTML = groups.map(gr => `<div class="tg"><h4>${esc(timeVN(gr.t))}${e.days.length > 1 ? ' · ' + A.dmy(gr.t).slice(0, 5) : ''} <small>· ${gr.ms.length} ${gr.ms.length > 1 ? 'khoảnh khắc' : 'khoảnh khắc'}</small></h4><div class="gg">${gr.ms.map(m => `<button class="gi${m.type === 'video' ? ' v' : ''}" data-mid="${m.id}"><img data-mid="${m.id}" alt="" decoding="async">${m.type === 'video' ? `<span class="du">${icon('play', 10, 2.6)} ${fmtD(m.dur)}</span>` : ''}${m.title ? `<span class="gt">${esc(m.title)}</span>` : ''}</button>`).join('')}</div></div>`).join('');
    grid.querySelectorAll('img').forEach((im, i) => { thumbURL(im.dataset.mid).then(u => { if (u) { im.src = u; im.onload = () => im.classList.add('ok'); } }); im.closest('.gi').style.setProperty('--d', Math.min(i, 14) * 30 + 'ms'); });
  }
  const fmtD = s => { s = Math.round(s || 0); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };
  function closeEvent() {
    const e = st.cur; if (!e || !EVP.classList.contains('open')) return;
    const hero = EVP.querySelector('.evp-hero img'), el = evEl(e.key), tgt = el?.querySelector('.pol.p0 img');
    if (tgt && hero.getBoundingClientRect().bottom > 0 && !REDUCED) {
      const g = new Image(); g.src = hero.src; const from = { ...rectOf(hero), r: 0 }; hero.style.visibility = 'hidden';
      const pol = tgt.closest('.pol'); pol.style.visibility = 'hidden';
      // bay ngược về thẻ: đặt ở khung đích rồi nảy từ khung nguồn
      const to = { ...rectOf(tgt), r: 6 };
      fly(g, from, to, 'snappy', () => { g.remove(); pol.style.visibility = ''; el.classList.remove('hl'); void el.offsetWidth; el.classList.add('hl'); });
    }
    EVP.classList.add('closing'); EVP.classList.remove('open'); EVP.setAttribute('aria-hidden', 'true'); document.body.classList.remove('evopen');
    setTimeout(() => { if (!EVP.classList.contains('open')) { EVP.classList.remove('closing'); hero.style.visibility = ''; EVP.querySelector('.evp-sc').style.transform = ''; } }, 450);
    st.cur = null;
  }
  EVP.querySelector('.evp-back').onclick = closeEvent;
  { // kéo trang xuống từ đầu để đóng
    const sc = EVP.querySelector('.evp-sc'); let d = null;
    sc.addEventListener('pointerdown', e => { if (sc.scrollTop > 0 || e.pointerType === 'mouse' && e.button !== 0) return; d = { y: e.clientY, x: e.clientX, on: false, v: 0, ly: e.clientY, lt: performance.now() }; });
    sc.addEventListener('pointermove', e => {
      if (!d) return; const dy = e.clientY - d.y; if (!d.on) { if (dy > 10 && Math.abs(dy) > Math.abs(e.clientX - d.x)) { d.on = true; try { sc.setPointerCapture(e.pointerId); } catch (er) { } } else if (Math.abs(dy) > 10) { d = null; return; } else return; }
      const now = performance.now(); d.v = (e.clientY - d.ly) / Math.max(1, now - d.lt); d.ly = e.clientY; d.lt = now;
      const y = Math.max(0, dy); sc.style.transform = `translate3d(0,${y}px,0) scale(${1 - y / 3000})`; EVP.querySelector('.evp-bg').style.opacity = 1 - y / 900;
    });
    const up = () => { if (!d) return; const on = d.on, v = d.v, m = /translate3d\(0px?,\s*([\d.]+)px/.exec(sc.style.transform), y = m ? +m[1] : 0; d = null; if (!on) return;
      if (y > 120 || v > .8) { closeEvent(); setTimeout(() => { sc.style.transform = ''; EVP.querySelector('.evp-bg').style.opacity = ''; }, 460); }
      else animateSpring(y, 0, { k: 300, c: 24, v: v * 1000 }, z => { sc.style.transform = z > .5 ? `translate3d(0,${z}px,0) scale(${1 - z / 3000})` : ''; EVP.querySelector('.evp-bg').style.opacity = 1 - z / 900; }); };
    sc.addEventListener('pointerup', up); sc.addEventListener('pointercancel', up);
  }
  EVP.addEventListener('click', async ev => {
    const e = st.cur; if (!e) return;
    const gi = ev.target.closest('.gi'); if (gi) { const i = e.ms.findIndex(m => m.id === gi.dataset.mid); openViewer(e.ms, i, mid => EVP.querySelector(`.gi[data-mid="${mid}"] img`)); return; }
    const dia = ev.target.closest('[data-diary]'); if (dia) { A.openDiary(dia.dataset.diary); return; }
    const b = ev.target.closest('.evp-acts [data-a]'); if (!b) return; const a = b.dataset.a;
    if (a === 'diary') A.makeDiary(e.ms.filter(m => m.type !== 'video').length ? e.ms.filter(m => m.type !== 'video') : e.ms);
    else if (a === 'rename') { $('#evnTi').value = e.title; $('#evnNt').value = e.note; $('#mEvName .evn-sub').textContent = `${dateTxt(e)} · ${countTxt(e)}`; A.openModal($('#mEvName')); setTimeout(() => $('#evnTi').focus(), 350); }
    else if (a === 'add') $('#evFiles').click();
    else if (a === 'merge') openMerge(e);
  });
  $('#evnOk').onclick = async () => { const e = st.cur; if (!e) return; const t = $('#evnTi').value.trim(), n = $('#evnNt').value.trim(); if (t && t !== (e.mile?.label || e.auto)) st.meta.titles[e.key] = t; else delete st.meta.titles[e.key]; if (n) st.meta.notes[e.key] = n; else delete st.meta.notes[e.key]; await saveMeta(); A.closeModal($('#mEvName')); refreshAll(e.key); A.toast('Đã lưu tên sự kiện', 1600); };
  $('#evnAuto').onclick = () => { const e = st.cur; if (e) $('#evnTi').value = e.mile?.label || e.auto; };
  function openMerge(e) {
    const i = st.events.indexOf(e), newer = st.events[i - 1], older = st.events[i + 1], box = $('#mEvMerge .evm-list'), rows = [];
    if (older) rows.push(`<button data-m="older">${icon('merge', 20)}<span>Gộp với ngày trước <b>${esc(older.title)}</b> · ${A.dmy(older.ts0)}</span></button>`);
    if (newer) rows.push(`<button data-m="newer">${icon('merge', 20)}<span>Gộp với ngày sau <b>${esc(newer.title)}</b> · ${A.dmy(newer.ts0)}</span></button>`);
    if (e.merged) rows.push(`<button data-m="unmerge">${icon('split', 20)}<span>Tách lại thành từng ngày</span></button>`);
    if (st.meta.splits[e.day]?.length && !e.merged) rows.push(`<button data-m="unsplit">${icon('merge', 20)}<span>Bỏ chia, gộp lại cả ngày ${A.dmy(e.ts0).slice(0, 5)}</span></button>`);
    box.innerHTML = rows.join('') || '<p class="lead">Không có sự kiện nào bên cạnh để gộp.</p>';
    A.openModal($('#mEvMerge'));
  }
  $('#mEvMerge').addEventListener('click', async ev => {
    const b = ev.target.closest('[data-m]'); const e = st.cur; if (!b || !e) return; const M = st.meta, i = st.events.indexOf(e);
    const keysOf = x => x.merged || [x.key];
    if (b.dataset.m === 'older' || b.dataset.m === 'newer') {
      const o = st.events[b.dataset.m === 'older' ? i + 1 : i - 1]; const ks = [...new Set([...keysOf(e), ...keysOf(o)])];
      M.merges = M.merges.filter(g => !g.some(k => ks.includes(k))); M.merges.push(ks);
    } else if (b.dataset.m === 'unmerge') M.merges = M.merges.filter(g => !g.includes(e.key));
    else if (b.dataset.m === 'unsplit') delete M.splits[e.day];
    await saveMeta(); A.closeModal($('#mEvMerge')); haptic(12);
    const mid = e.ms[0].id; closeEvent(); render(); const k = keyOfMid(mid); if (k) setTimeout(() => { scrollToKey(k); }, 480);
    A.toast(b.dataset.m.startsWith('un') ? 'Đã tách' : 'Đã gộp thành một sự kiện', 1800);
  });
  $('#evFiles').onchange = async ev => {
    const files = [...ev.target.files]; ev.target.value = ''; const e = st.cur; if (!files.length || !e) return;
    A.toast(`Đang thêm ${files.length} ảnh…`, 60000);
    const ids = await A.importFiles(files, null, e.day);
    A.toast(`Đã thêm ${ids.length} ảnh vào “${e.title}”`, 2200);
    refreshAll(null, ids);
  };
  // dựng lại sau khi dữ liệu đổi; giữ trang sự kiện đang mở (nếu còn)
  function refreshAll(key, newIds) {
    const curMid = st.cur?.ms[0]?.id; render();
    const k = key || (newIds?.length && keyOfMid(newIds[0])) || (curMid && keyOfMid(curMid));
    if (EVP.classList.contains('open') && k && st.byKey.get(k)) { st.cur = st.byKey.get(k); fillEvent(st.cur); if (newIds) setTimeout(() => newIds.forEach(id => EVP.querySelector(`.gi[data-mid="${id}"]`)?.classList.add('drop')), 60); }
    else if (EVP.classList.contains('open') && !st.byKey.get(k)) closeEvent();
    if (newIds?.length && k) { const el = evEl(k); if (el) { el.classList.add('in'); el.classList.remove('drop'); void el.offsetWidth; el.classList.add('drop'); } }
  }

  // ---------- trình xem ảnh/video toàn màn hình ----------
  const V = { list: [], i: 0, W: 0, H: 0, x: 0, z: { s: 1, x: 0, y: 0 }, slides: [], getRect: null, chrome: true, tray: 0, stop: null, urls: [] };
  const track = PV.querySelector('.pv-track');
  function fitRect(m) {
    const W = innerWidth, H = innerHeight, a = m.w && m.h ? m.w / m.h : 4 / 3, k = Math.min(W / a, H) * .999;
    const w = Math.min(W, k * a), h = Math.min(H, w / a); return { left: (W - w) / 2, top: (H - h) / 2, width: w, height: h };
  }
  function slideHTML(m) { return `<div class="pv-s" data-mid="${m.id}"><div class="pv-m"></div></div>`; }
  async function fillSlide(sl, m, cur) {
    const box = sl.querySelector('.pv-m'), r = fitRect(m);
    box.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
    const tu = await thumbURL(m.id);
    if (m.type === 'video') {
      box.innerHTML = `<img src="${tu}" alt="">`;
      if (cur) { const b = await A.dbGet('blobs', 'o_' + m.id); if (!b || sl.dataset.mid !== m.id) return; const u = URL.createObjectURL(b); V.urls.push(u); const v = document.createElement('video'); v.src = u; v.controls = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.autoplay = true; v.poster = tu; v.onplay = () => A.duck?.(true); v.onpause = v.onended = () => A.duck?.(false); box.innerHTML = ''; box.appendChild(v); }
    } else {
      box.innerHTML = `<img src="${tu}" alt="">`;
      if (!m.heic) A.dbGet('blobs', 'o_' + m.id).then(b => { if (!b || sl.dataset.mid !== m.id) return; const u = URL.createObjectURL(b); V.urls.push(u); const im = new Image(); im.onload = () => { if (sl.dataset.mid === m.id) box.querySelector('img').src = u; }; im.src = u; });
      else if (cur) A.toast('Ảnh HEIC — mở bằng Safari để xem bản gốc rõ nét', 2600);
    }
  }
  function layoutSlides() {
    V.W = innerWidth; V.H = innerHeight;
    const idx = [V.i - 1, V.i, V.i + 1];
    track.innerHTML = idx.map(i => V.list[i] ? slideHTML(V.list[i]) : '<div class="pv-s empty"></div>').join('');
    [...track.children].forEach((sl, k) => { sl.style.transform = `translate3d(${(k - 1) * (V.W + 24)}px,0,0)`; const m = V.list[idx[k]]; if (m) fillSlide(sl, m, k === 1); });
    setX(0); V.z = { s: 1, x: 0, y: 0 }; applyZoom();
    const m = V.list[V.i]; PV.querySelector('.pv-count').textContent = `${V.i + 1} / ${V.list.length}`;
    PV.querySelector('.pv-ti').textContent = m.title || timeVN(m.ts);
    PV.querySelector('.pv-dt').textContent = m.title ? `${fmtLong(m.ts)} · ${timeVN(m.ts)}` : fmtLong(m.ts);
    PV.querySelector('.pv-ag').textContent = A.ageText(A.kid(), m.ts);
    const nt = PV.querySelector('.pv-nt'); nt.textContent = m.note || ''; nt.hidden = !m.note;
    PV.querySelector('[data-a=split]').hidden = !(st.cur && !st.cur.merged && V.i > 0);
    PV.querySelector('.pv-more').classList.toggle('chk', m.dateSrc === 'check' || m.dateSrc === 'file');
  }
  const curMedia = () => track.children[1]?.querySelector('.pv-m');
  const setX = x => { V.x = x; track.style.transform = `translate3d(${x}px,0,0)`; };
  const applyZoom = () => { const el = curMedia(); if (el) el.style.transform = V.z.s > 1.001 ? `translate3d(${V.z.x}px,${V.z.y}px,0) scale(${V.z.s})` : ''; };
  function openViewer(list, i, getRect) {
    V.list = list; V.i = clamp(i, 0, list.length - 1); V.getRect = getRect; V.urls.forEach(u => URL.revokeObjectURL(u)); V.urls = [];
    PV.classList.add('open'); PV.setAttribute('aria-hidden', 'false'); document.body.classList.add('pvopen'); setChrome(true); setTray(0, false);
    layoutSlides(); haptic(6);
    const src = getRect?.(list[V.i].id), el = curMedia();
    if (src && el && !REDUCED) {
      const to = fitRect(list[V.i]), f = rectOf(src);
      el.style.transition = 'none'; el.style.transform = `translate(${f.left - to.left}px,${f.top - to.top}px) scale(${f.width / to.width},${f.height / to.height})`; el.style.transformOrigin = '0 0';
      void el.offsetWidth; el.style.transition = 'transform var(--sp-soft-ms) var(--sp-soft)'; el.style.transform = '';
      setTimeout(() => { el.style.transition = ''; el.style.transformOrigin = ''; }, 700);
    }
  }
  function closeViewer(dy = 0) {
    if (!PV.classList.contains('open')) return;
    const m = V.list[V.i], el = curMedia(), tgt = V.getRect?.(m.id);
    track.querySelectorAll('video').forEach(v => v.pause()); A.duck?.(false);
    PV.classList.add('closing'); PV.classList.remove('open'); document.body.classList.remove('pvopen'); PV.setAttribute('aria-hidden', 'true');
    if (tgt && el && !REDUCED) {
      const to = rectOf(tgt), f = el.getBoundingClientRect(), base = fitRect(m);
      el.style.transformOrigin = '0 0'; el.style.transition = 'none';
      el.style.transform = `translate(${f.left - base.left}px,${f.top - base.top}px) scale(${f.width / base.width},${f.height / base.height})`; void el.offsetWidth;
      el.style.transition = 'transform var(--sp-snappy-ms) var(--sp-snappy), border-radius .3s'; el.style.borderRadius = '10px';
      el.style.transform = `translate(${to.left - base.left}px,${to.top - base.top}px) scale(${to.width / base.width},${to.height / base.height})`;
    }
    setTimeout(() => { if (!PV.classList.contains('open')) { PV.classList.remove('closing'); track.innerHTML = ''; V.urls.forEach(u => URL.revokeObjectURL(u)); V.urls = []; } }, 520);
  }
  function go(d, v = 0) {
    const n = V.i + d; if (n < 0 || n >= V.list.length) { V.stop = animateSpring(V.x, 0, { k: 260, c: 20, v }, setX); return; }
    V.stop?.(); haptic(5);
    V.stop = animateSpring(V.x, -d * (V.W + 24), { k: 240, c: 26, v, eps: .6 }, setX, () => { V.i = n; layoutSlides(); });
  }
  function setChrome(on) { V.chrome = on; PV.classList.toggle('bare', !on); }
  function setTray(f, anim = true) { // f: 0 = gọn, 1 = mở hết
    const tr = PV.querySelector('.pv-tray'), H = tr.offsetHeight || 300, peek = 128, y0 = H - peek;
    const target = (1 - f) * y0; V.tray = f;
    if (!anim) { tr.style.transform = `translate3d(0,${target}px,0)`; return; }
    const cur = new DOMMatrixReadOnly(getComputedStyle(tr).transform).m42 || 0;
    V.tstop?.(); V.tstop = animateSpring(cur, target, { k: 300, c: 24 }, y => tr.style.transform = `translate3d(0,${y}px,0)`);
  }
  { // cử chỉ: vuốt ngang chuyển ảnh, vuốt xuống đóng, chụm phóng, chạm đúp phóng 2x
    const ptr = new Map(); let g = null, lastTap = 0, tapT = 0;
    const bg = PV.querySelector('.pv-bg');
    track.addEventListener('pointerdown', e => {
      if (e.target.closest('video') && e.clientY > innerHeight - 70) return;
      track.setPointerCapture(e.pointerId); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); V.stop?.();
      if (ptr.size === 2) { const [a, b] = [...ptr.values()]; g = { mode: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), s0: V.z.s, x0: V.z.x, y0: V.z.y, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; return; }
      g = { mode: null, sx: e.clientX, sy: e.clientY, t: performance.now(), lx: e.clientX, ly: e.clientY, lt: performance.now(), vx: 0, vy: 0, x0: V.x, zx: V.z.x, zy: V.z.y };
    });
    track.addEventListener('pointermove', e => {
      if (!ptr.has(e.pointerId) || !g) return; ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (g.mode === 'pinch' && ptr.size >= 2) {
        const [a, b] = [...ptr.values()], d = Math.hypot(a.x - b.x, a.y - b.y), s = clamp(g.s0 * d / g.d0, 1, 5);
        const cx = g.cx - innerWidth / 2, cy = g.cy - innerHeight / 2; V.z.s = s; V.z.x = g.x0 + (cx - g.x0) * (1 - s / g.s0); V.z.y = g.y0 + (cy - g.y0) * (1 - s / g.s0); applyZoom(); return;
      }
      const dx = e.clientX - g.sx, dy = e.clientY - g.sy, now = performance.now(), dt = Math.max(1, now - g.lt);
      g.vx = (e.clientX - g.lx) / dt; g.vy = (e.clientY - g.ly) / dt; g.lx = e.clientX; g.ly = e.clientY; g.lt = now;
      if (!g.mode) { if (Math.hypot(dx, dy) < 8) return; g.mode = V.z.s > 1.02 ? 'pan' : Math.abs(dx) > Math.abs(dy) ? 'swipe' : dy > 0 ? 'dismiss' : 'tray'; }
      if (g.mode === 'swipe') { let x = g.x0 + dx; if ((V.i === 0 && x > 0) || (V.i === V.list.length - 1 && x < 0)) x = rubber(x, V.W * .7); setX(x); }
      else if (g.mode === 'dismiss') { const el = curMedia(); const k = 1 - clamp(dy / V.H, 0, 1) * .45; if (el) el.style.transform = `translate3d(${dx * .6}px,${dy}px,0) scale(${k})`; bg.style.opacity = clamp(1 - dy / (V.H * .7), 0, 1); PV.classList.add('drag'); }
      else if (g.mode === 'pan') { V.z.x = g.zx + dx; V.z.y = g.zy + dy; applyZoom(); }
      else if (g.mode === 'tray' && dy < -30 && V.tray < 1) { setTray(1); g.mode = 'done'; }
    });
    const up = e => {
      if (!ptr.has(e.pointerId)) return; ptr.delete(e.pointerId); if (ptr.size) return; const G = g; g = null; if (!G) return;
      PV.classList.remove('drag');
      if (G.mode === 'pinch') { if (V.z.s < 1.05) { const z0 = { ...V.z }; animateSpring(1, 0, { k: 300, c: 26, eps: .002 }, f => { V.z = { s: 1 + (z0.s - 1) * f, x: z0.x * f, y: z0.y * f }; applyZoom(); }); } return; }
      if (G.mode === 'swipe') { const dx = V.x - G.x0, v = G.vx; const d = (dx < -V.W * .22 || v < -.45) ? 1 : (dx > V.W * .22 || v > .45) ? -1 : 0; if (d) go(d, v * 1000); else V.stop = animateSpring(V.x, 0, { k: 300, c: 22, v: v * 1000 }, setX); return; }
      if (G.mode === 'dismiss') {
        const dy = e.clientY - G.sy;
        if (dy > 120 || G.vy > .8) { closeViewer(dy); setTimeout(() => { bg.style.opacity = ''; }, 520); }
        else { const el = curMedia(), dx0 = e.clientX - G.sx; animateSpring(1, 0, { k: 320, c: 24, eps: .002 }, f => { if (el) el.style.transform = f > .001 ? `translate3d(${dx0 * .6 * f}px,${dy * f}px,0) scale(${1 - clamp(dy / V.H, 0, 1) * .45 * f})` : ''; bg.style.opacity = 1 - clamp(dy * f / (V.H * .7), 0, 1); }); }
        return;
      }
      if (G.mode) return;
      // chạm
      const now = performance.now();
      if (now - lastTap < 300) { clearTimeout(tapT); lastTap = 0; zoomAt(e.clientX, e.clientY); return; }
      lastTap = now; tapT = setTimeout(() => setChrome(!V.chrome), 300);
    };
    track.addEventListener('pointerup', up); track.addEventListener('pointercancel', up);
    track.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); V.z.s = clamp(V.z.s * Math.exp(-e.deltaY * .01), 1, 5); if (V.z.s <= 1.01) V.z = { s: 1, x: 0, y: 0 }; applyZoom(); }, { passive: false });
    function zoomAt(x, y) {
      const z0 = { ...V.z }, target = z0.s > 1.05 ? { s: 1, x: 0, y: 0 } : { s: 2.2, x: -(x - innerWidth / 2) * 1.2, y: -(y - innerHeight / 2) * 1.2 };
      haptic(6); animateSpring(0, 1, { k: 280, c: 22, eps: .002 }, f => { V.z = { s: z0.s + (target.s - z0.s) * f, x: z0.x + (target.x - z0.x) * f, y: z0.y + (target.y - z0.y) * f }; applyZoom(); });
    }
    // khay thông tin kéo lên/xuống
    const tr = PV.querySelector('.pv-tray'); let td = null;
    tr.querySelector('.grab').addEventListener('click', () => setTray(V.tray ? 0 : 1));
    tr.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; td = { y: e.clientY, y0: new DOMMatrixReadOnly(getComputedStyle(tr).transform).m42 || 0, moved: false }; tr.setPointerCapture(e.pointerId); V.tstop?.(); });
    tr.addEventListener('pointermove', e => { if (!td) return; const dy = e.clientY - td.y; if (Math.abs(dy) > 5) td.moved = true; const H = tr.offsetHeight, max = H - 128; let y = td.y0 + dy; if (y < 0) y = rubber(y, 120); if (y > max) y = max + rubber(y - max, 120); tr.style.transform = `translate3d(0,${y}px,0)`; });
    const tup = e => { if (!td) return; const moved = td.moved, dy = e.clientY - td.y; td = null; if (!moved) return; setTray(dy < -20 ? 1 : dy > 20 ? 0 : V.tray); };
    tr.addEventListener('pointerup', tup); tr.addEventListener('pointercancel', tup);
  }
  PV.addEventListener('click', async e => {
    const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, m = V.list[V.i];
    if (a === 'close') closeViewer();
    else if (a === 'save') A.saveOriginal(m);
    else if (a === 'edit') openEditM(m);
    else if (a === 'del') {
      if (!(await A.ask('Xoá khoảnh khắc này?', `“${m.title || A.dmy(m.ts)}” sẽ bị xoá khỏi máy này. Không hoàn tác được.`, 'Xoá', true))) return;
      await A.deleteMoment(m); V.list = V.list.filter(x => x !== m); haptic(15);
      if (!V.list.length) { closeViewer(); } else { V.i = Math.min(V.i, V.list.length - 1); layoutSlides(); }
      refreshAll(st.cur?.key); A.toast('Đã xoá', 1400);
    } else if (a === 'split') {
      const e2 = st.cur; if (!e2) return; (st.meta.splits[e2.day] ||= []).push(m.ts); await saveMeta(); haptic(12);
      closeViewer(); closeEvent(); render(); const k = keyOfMid(m.id); setTimeout(() => k && scrollToKey(k), 450); A.toast('Đã tách thành 2 sự kiện', 1800);
    }
  });
  addEventListener('keydown', e => {
    if (PV.classList.contains('open')) { if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } else if (e.key === 'Escape') closeViewer(); e.stopImmediatePropagation(); return; }
    if (EVP.classList.contains('open') && e.key === 'Escape' && !document.querySelector('.modal.open')) { e.stopImmediatePropagation(); closeEvent(); }
  }, true);
  addEventListener('resize', () => { if (PV.classList.contains('open')) layoutSlides(); });
  // sửa khoảnh khắc (ngày hiện rõ chữ để khỏi nhầm ngày/tháng)
  let editing = null;
  const dateLine = (inp, out) => { const t = A.parseYmd(inp.value); out.textContent = t ? fmtLong(t) : ''; };
  $('#emDt').addEventListener('input', () => dateLine($('#emDt'), $('#emDtH')));
  function openEditM(m) { editing = m; $('#emTi').value = m.title || ''; $('#emDt').value = A.ymd(m.ts); $('#emNt').value = m.note || ''; dateLine($('#emDt'), $('#emDtH')); A.openModal($('#mEdM')); }
  $('#emOk').onclick = async () => {
    const m = editing; if (!m) return; const ts = A.parseYmd($('#emDt').value, m.ts); if (!ts) { A.toast('Bạn chọn ngày nhé'); return; }
    const moved = A.dayStart(ts) !== A.dayStart(m.ts);
    m.title = $('#emTi').value.trim(); m.note = $('#emNt').value.trim(); if (moved) { m.ts = ts; m.dateSrc = 'user'; }
    await A.updateMoment(m, moved); A.closeModal($('#mEdM'));
    if (moved) { closeViewer(); closeEvent(); render(); const k = keyOfMid(m.id); setTimeout(() => k && scrollToKey(k), 450); A.toast('Đã lưu — đã chuyển sang ngày ' + A.dmy(ts), 2200); }
    else { layoutSlides(); refreshAll(st.cur?.key); A.toast('Đã lưu', 1200); }
  };

  return {
    async reload() { await loadMeta(); render(false); },
    render, refreshAll, scrollToKey, keyOfMid, openEvent, closeEvent, openViewer, closeViewer, openJump,
    get events() { return st.events; }, get meta() { return st.meta; }, setMeta: async m => { st.meta = Object.assign({ titles: {}, notes: {}, merges: [], splits: {}, covers: {} }, m); await saveMeta(); },
    guard: (ms = 550) => { st.guard = performance.now() + ms; },
    isOpen: () => EVP.classList.contains('open') || PV.classList.contains('open'), scroller: TL, viewer: V, dateLine
  };
}
