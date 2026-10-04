// Hành Trình Của Bạn — màn chính: DÒNG SỰ KIỆN DỌC (mới nhất trên cùng), trang sự kiện, trình xem ảnh/video toàn màn hình.
// Cuộn bằng cuộn gốc của trình duyệt (iPhone có quán tính + giãn cao su sẵn); chuyển động bằng lò xo (ui.js).
import { icon, animateSpring, rubber, haptic, IOS, REDUCED, fmtLong, clamp, contextMenu, longPress, undoToast } from './ui.js';
import { timeVN } from './nhatky.js';
import { isMe, isChild, isPartner, roleOf, roleName, showsAge, sinceOf, anchorOf, chapterAt, approxLabel, TYPES, typeOf, guessType, holidayOf, MILES, mileOf, CH_COLORS } from './doi.js';
const META0 = () => ({ titles: {}, notes: {}, merges: [], splits: {}, covers: {}, types: {}, miles: {} });

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = n => String(n).padStart(2, '0');
const MONTH = m => `Tháng ${m + 1}`;
function rng(seed) { let a = 0; for (const ch of String(seed)) a = (a * 31 + ch.charCodeAt(0)) | 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const HTML = `
<div id="tlv">
  <div id="tl" tabindex="-1"><div class="tl-in"></div></div>
</div>
<div id="evp" aria-hidden="true">
  <div class="evp-bg"><img class="evp-bgc" alt=""><i></i></div>
  <div class="evp-sc">
    <header class="evp-head"><div class="evp-hx"><div class="evp-dt"></div><h2 class="evp-ti"><span class="tt" spellcheck="false"></span><i class="pen" aria-hidden="true">${icon('edit', 17, 2)}</i></h2><div class="evp-chips"></div>
      <div class="evp-cta"><button data-a="play" class="cta1">${icon('play', 18, 2.2)}<span>Chiếu</span></button></div></div></header>
    <div class="evp-days"></div>
    <div class="evp-strip" aria-label="Dải ảnh — quẹt ngang để xem"><div class="evp-rows"></div></div>
    <div class="evp-body">
      <p class="evp-hint" hidden></p>
      <p class="evp-nt"></p>
      <div class="evp-dia"></div>
      <button class="evp-gbtn" data-a="grid">${icon('grid', 17, 1.8)}<span>Xem dạng lưới</span></button>
      <div class="evp-grid" hidden></div>
    </div>
  </div>
  <div class="evp-bar"><div class="evp-bbg"></div><button class="evp-back glassbtn" aria-label="Quay lại">${icon('back', 22, 2)}</button><div class="evp-bt"><b></b><small></small></div><button class="evp-more glassbtn" aria-label="Tuỳ chọn sự kiện">${icon('more', 22, 2)}</button></div>
</div>
<div id="bulk" aria-hidden="true"><div class="bk-top"><b class="bk-n">Chọn ảnh</b><button data-b="all">Chọn tất cả</button><button data-b="done" class="primary">Xong</button></div>
  <div class="bk-acts"><button data-b="del" class="danger">${icon('trash', 21)}<span>Xoá</span></button><button data-b="date">${icon('calendar', 21)}<span>Đổi ngày</span></button><button data-b="apx">${icon('clock', 21)}<span>Ước chừng</span></button><button data-b="move">${icon('move', 21)}<span>Chuyển sự kiện</span></button><button data-b="kids">${icon('baby', 21)}<span>Ai trong ảnh</span></button><button data-b="group">${icon('grid', 21)}<span>Gộp nhóm</span></button><button data-b="diary">${icon('book', 21)}<span>Nhật ký</span></button><button data-b="save">${icon('download', 21)}<span>Lưu về máy</span></button></div></div>
<div id="pv" aria-hidden="true">
  <div class="pv-bg"><i class="pv-bgc"></i><img class="pv-bgi" alt=""></div><div class="pv-track"></div>
  <div class="pv-ui">
    <div class="pv-top"><button class="glassbtn" data-a="close" aria-label="Đóng">${icon('close', 22, 2)}</button><span class="pv-count"></span><button class="glassbtn" data-a="more" aria-label="Tuỳ chọn">${icon('more', 22, 2)}</button></div>
    <div class="pv-bot">
      <div class="pv-info"><div class="pv-ti"></div><div class="pv-dt"></div><div class="pv-ag"></div><p class="pv-nt"></p></div>
      <div class="pv-vc" hidden><button data-a="vplay" aria-label="Phát / dừng"></button><span class="pv-t0">0:00</span><input class="pv-seek" type="range" min="0" max="1000" value="0" aria-label="Tua video"><span class="pv-t1">0:00</span><button data-a="vmute" aria-label="Tắt / bật tiếng"></button></div>
      <div class="pv-film"><div class="pv-fi"></div></div>
    </div>
  </div>
  <div class="pv-prog"><i></i></div>
</div>
<div id="evs" aria-hidden="true"><div class="evs-st"></div><div class="evs-cap"><small></small><b></b><span></span></div><div class="evs-bar"><i></i></div><button class="glassbtn evs-x" aria-label="Dừng chiếu">${icon('close', 22, 2)}</button></div>
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
  <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:10px"><label class="f">Ngày<input id="emDt" type="date"></label><label class="f">Giờ<input id="emTm" type="time"></label></div><div class="datehint" id="emDtH"></div>
  <label class="f">Ghi chú<textarea id="emNt" maxlength="2000" placeholder="Kể lại chút về khoảnh khắc này…"></textarea></label>
  <div class="foot"><button data-close>Huỷ</button><button class="primary" id="emOk">Lưu</button></div>
</div></div>
<div class="modal" id="mJump"><div class="card glass"><h2>Nhảy tới</h2><div class="jmp"></div><div class="foot"><button data-close>Đóng</button></div></div></div>
<div class="modal gsheet" id="mGrp"><div class="card glass">
  <h2 class="gp-h">Tạo nhóm kỷ niệm</h2>
  <p class="lead gp-lead">Gom ảnh của nhiều ngày thành một kỷ niệm có tên riêng — ảnh vẫn giữ nguyên, chỉ xếp lại.</p>
  <input class="gp-name" id="gpName" maxlength="60" placeholder="Tên nhóm, ví dụ: Đi biển Cửa Lò" autocomplete="off">
  <div class="gp-sug"><button data-s="Chuyến đi ">Chuyến đi…</button><button data-s="Về quê ">Về quê…</button><button data-s="Tết ">Tết…</button><button data-s="Sinh nhật ">Sinh nhật…</button><button data-s="Đi biển ">Đi biển…</button><button data-s="Đi chơi ">Đi chơi…</button></div>
  <textarea class="gp-note" id="gpNote" maxlength="2000" placeholder="Ghi chú (tuỳ chọn)"></textarea>
  <h4 class="gp-t">Chọn ảnh <small>chạm từng ảnh · giữ rồi vuốt để chọn cả dải</small></h4>
  <div class="gp-range"><label>Từ<input type="date" id="gpFrom"></label><label>đến<input type="date" id="gpTo"></label><button id="gpRange">Chọn các ngày này</button></div>
  <div class="gp-days"></div>
  <div class="gp-bar"><span class="gp-n">Chưa chọn ảnh nào</span><button data-close>Huỷ</button><button class="primary" id="gpOk" disabled>Tạo nhóm</button></div>
</div></div>
<input type="file" id="evFiles" accept="image/*,video/*" multiple hidden>`;

export function initTimeline(A) {
  const $ = s => document.querySelector(s);
  document.body.insertAdjacentHTML('beforeend', HTML);
  const TLV = $('#tlv'), TL = $('#tl'), IN = TL.querySelector('.tl-in'), EVP = $('#evp'), PV = $('#pv'), FSC = $('#fsc');
  TLV.insertAdjacentHTML('afterbegin', '<div class="rail"><i></i></div>');
  const st = { guard: 0, events: [], meta: null, url: new Map(), shown: new WeakSet(), cur: null, wide: false };
  const wide = () => innerWidth >= 900 && !A.family();

  // ---------- ảnh nhỏ (nạp lười) ----------
  const URLS = new Map();
  async function thumbURL(mid) {
    if (URLS.has(mid)) { const u = URLS.get(mid); URLS.delete(mid); URLS.set(mid, u); return u; }
    const b = await A.dbGet('blobs', 't_' + mid); if (!b) return '';
    const u = URL.createObjectURL(b); URLS.set(mid, u);
    if (URLS.size > 260) { const [k, v] = URLS.entries().next().value; URLS.delete(k); setTimeout(() => URL.revokeObjectURL(v), 4000); }
    return u;
  }
  function refreshThumb(mid) {
    if (URLS.has(mid)) { const u = URLS.get(mid); URLS.delete(mid); setTimeout(() => URL.revokeObjectURL(u), 3000); }
    thumbURL(mid).then(u => { if (!u) return; document.querySelectorAll(`img[data-mid="${CSS.escape(mid)}"], .sc[data-mid="${CSS.escape(mid)}"] img, .pf img[data-mid="${CSS.escape(mid)}"]`).forEach(im => { if (im.getAttribute('src')) im.src = u; }); });
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
    st.hidePreg = !!(A.kid() && await A.metaGet('hidePreg:' + (A.family() ? 'fam' : A.kid().id)));
    const k = A.kid(); st.meta = Object.assign(META0(), (k && await A.metaGet(metaKey())) || {});
  }
  const metaKey = () => A.family() ? 'ev:fam' : 'ev:' + A.kid().id;
  const saveMeta = () => A.metaSet(metaKey(), st.meta);
  const kidsAll = () => A.kids(), kidById = id => kidsAll().find(k => k.id === id);
  const g3 = (k, a, b, c) => k?.gender === 'm' ? a : k?.gender === 'f' ? b : c;
  function milestone(kid, days, fam) {
    if (!kid?.birth) return null;
    const N = kid.name;
    const b = new Date(kid.birth + 'T12:00:00'), out = [];
    for (const ds of days) {
      const d = new Date(ds + 'T12:00:00'), diff = Math.round((d - b) / 864e5), yrs = d.getFullYear() - b.getFullYear();
      if (diff === 0) out.push({ k: 'birth', p: 5, label: `Ngày ${N} chào đời`, ic: 'star', kid: kid.id });
      else if (yrs >= 1 && d.getMonth() === b.getMonth() && d.getDate() === b.getDate()) out.push(yrs === 1 ? { k: 'thoinoi', p: 4, label: fam ? `Thôi nôi ${N} · Sinh nhật 1 tuổi` : 'Thôi nôi · Sinh nhật 1 tuổi', ic: 'cake', kid: kid.id } : { k: 'bday', p: 4, label: fam ? `Sinh nhật ${N} ${yrs} tuổi` : `Sinh nhật ${yrs} tuổi`, ic: 'cake', kid: kid.id });
      else if (diff === 100) out.push({ k: '100', p: 3, label: fam ? `100 ngày của ${N}` : '100 ngày', ic: 'sparkle', kid: kid.id });
      else { const m1 = new Date(b); m1.setMonth(b.getMonth() + 1); if (m1.getDate() === b.getDate() && A.ymd(m1.getTime()) === ds) out.push({ k: 'thang', p: 2, label: fam ? `Đầy tháng ${N}` : 'Đầy tháng', ic: 'heart', kid: kid.id }); }
    }
    return out.sort((x, y) => y.p - x.p)[0] || null;
  }
  // cột mốc của người lớn trong hành trình: sinh nhật của bạn, ngày gặp / cưới / kỷ niệm cưới, sinh nhật người thân (kèm tuổi)
  function lifeMilestone(p, days, present) {
    const N = cap(p.name), out = [], me = A.me(), bd = p.birth && !p.birthApprox ? new Date(p.birth + 'T12:00:00') : null;
    const same = (d, ymd) => { const x = new Date(ymd + 'T12:00:00'); return d.getMonth() === x.getMonth() && d.getDate() === x.getDate(); };
    for (const ds of days) {
      const d = new Date(ds + 'T12:00:00');
      if (isMe(p) && bd) { const y = d.getFullYear() - bd.getFullYear(); if (ds === p.birth) out.push({ k: 'birth', p: 5, label: 'Ngày bạn chào đời', ic: 'star', kid: p.id }); else if (y >= 1 && same(d, p.birth)) out.push({ k: 'mybday', p: 4, label: `Sinh nhật ${y} tuổi của bạn`, ic: 'cake', kid: p.id }); continue; }
      if (isPartner(p)) {
        if (p.wed) { const y = d.getFullYear() - +p.wed.slice(0, 4); if (ds === p.wed) out.push({ k: 'wed', p: 6, label: `Đám cưới của bạn và ${N}`, ic: 'heart', kid: p.id }); else if (y >= 1 && same(d, p.wed)) out.push({ k: 'wedann', p: 4, label: `Kỷ niệm ${y} năm ngày cưới`, ic: 'heart', kid: p.id }); }
        if (p.since && ds === p.since) out.push({ k: 'meet', p: 5, label: `Ngày gặp ${N}`, ic: 'heart', kid: p.id });
      }
      if (bd && !isChild(p) && !isMe(p) && present && same(d, p.birth)) { const y = d.getFullYear() - bd.getFullYear(); if (y >= 1) out.push({ k: 'pbday', p: 3, label: `Sinh nhật ${y} tuổi của ${N}`, ic: 'cake', kid: p.id }); }
      if (bd && isChild(p) && ds === p.birth && me) { const first = roleOf(p) === 'con' && !kidsAll().some(o => roleOf(o) === 'con' && o.birth && o.birth < p.birth), g = me.gender; if (first || roleOf(p) === 'chau') out.push({ k: 'birth', p: 6, label: `${N} chào đời · bạn lên chức ${roleOf(p) === 'chau' ? (g === 'f' ? 'bà' : g === 'm' ? 'ông' : 'ông bà') : (g === 'f' ? 'mẹ' : g === 'm' ? 'bố' : 'bố mẹ')}`, ic: 'star', kid: p.id }); }
    }
    return out.sort((x, y) => y.p - x.p)[0] || null;
  }
  const cap = t => { t = String(t ?? '').trim(); return t ? t.charAt(0).toLocaleUpperCase('vi') + t.slice(1) : t; };
  const SES = { sang: ['Buổi sáng vui vẻ', 'Chào ngày mới', 'Sáng nay của {n}', 'Nắng sớm dịu dàng', 'Buổi sáng của {be}'], trua: ['Buổi trưa ấm áp', 'Trưa nay có gì vui', 'Giờ ăn trưa'], chieu: ['Buổi chiều dịu dàng', 'Chiều đi chơi', 'Chiều nắng đẹp', 'Một chiều vui'], toi: ['Buổi tối quây quần', 'Tối nay của {n}', 'Tối ấm áp'], dem: ['Đêm yên bình', 'Giấc ngủ ngon'] };
  function autoTitle(e, kid, famCtx) {
    if (e.preg) return `${kid.name} trong bụng mẹ`;
    const R = rng(e.key), n = e.ms.length, hs = e.ms.map(m => new Date(m.ts).getHours()).sort((a, b) => a - b), h = hs[hs.length >> 1];
    const ses = h < 5 ? 'dem' : h < 11 ? 'sang' : h < 14 ? 'trua' : h < 18 ? 'chieu' : h < 22 ? 'toi' : 'dem';
    if (e.days.length > 1) return 'Những ngày vui';
    if (e.ms.every(m => m.type === 'video')) return n > 1 ? 'Những thước phim nhỏ' : 'Thước phim nhỏ';
    const pool = n >= 10 ? ['Một ngày thật vui', 'Ngày đầy ắp kỷ niệm', 'Ngày rộn ràng'] : SES[ses];
    const fam = (famCtx ?? A.family()) && (e.kids?.length || 0) > 1;
    const t = pool[Math.floor(R() * pool.length)];
    return fam ? t.replace(' của {n}', ' cả nhà').replace(' của {be}', ' cả nhà') : t.replace('{n}', kid.name).replace('{be}', g3(kid, 'chàng trai nhỏ', 'công chúa nhỏ', 'bé yêu'));
  }
  // ctx = { kid, moments, meta }: tính sự kiện cho một bé bất kỳ (dùng xếp thư mục Drive), không đụng tới màn hình
  function compute(ctx) {
    const kid = ctx?.kid || A.kid(), M = ctx?.meta || st.meta, ms0 = (ctx?.moments || A.moments()).slice().sort((a, b) => a.ts - b.ts);
    const GR = A.groups?.() || [], inG = new Map(); for (const g of GR) for (const id of g.momentIds) inG.set(id, g);
    const ms = ms0.filter(m => !inG.has(m.id)); // ảnh đã vào nhóm thì không còn ở thẻ ngày lẻ
    // ảnh ngày ước chừng (ảnh giấy cũ) gom riêng, không lẫn với ảnh chụp đúng ngày đó
    const byDay = new Map(); for (const m of ms) { const d = A.ymd(m.ts) + (m.approx ? '~' + m.approx : ''); if (!byDay.has(d)) byDay.set(d, []); byDay.get(d).push(m); }
    let evs = [];
    for (const [dk, list] of byDay) {
      const day = dk.slice(0, 10), cuts = (M.splits[dk] || []).slice().sort((a, b) => a - b); let seg = [], k = 0, ci = 0;
      const push = () => { if (seg.length) evs.push({ key: k ? `${dk}#${k}` : dk, day, days: [day], ms: seg }); k++; seg = []; };
      for (const m of list) { while (ci < cuts.length && m.ts >= cuts[ci]) { push(); ci++; } seg.push(m); }
      push();
    }
    for (const grp of M.merges) {
      const parts = evs.filter(e => grp.includes(e.key)); if (parts.length < 2) continue;
      const f = parts[0]; f.ms = parts.flatMap(p => p.ms).sort((a, b) => a.ts - b.ts); f.days = [...new Set(parts.flatMap(p => p.days))]; f.merged = grp;
      evs = evs.filter(e => e === f || !parts.includes(e));
    }
    for (const g of GR) { const gm = ms0.filter(m => inG.get(m.id) === g); if (gm.length) evs.push({ key: 'g:' + g.id, day: A.ymd(gm[0].ts), days: [...new Set(gm.map(m => A.ymd(m.ts)))], ms: gm, group: g }); }
    const fam = ctx ? false : A.family(), life = !ctx && A.life?.(), KS = fam ? kidsAll() : [kid];
    const b0 = kid?.birth ? A.dayStart(A.parseYmd(kid.birth)) : 0, dias = A.diaries(), childView = !fam && isChild(kid);
    const wedDays = new Set(kidsAll().filter(p => p.wed).map(p => p.wed.slice(5))), chs = life ? A.chapters() : [];
    for (const e of evs) {
      e.kids = fam ? [...new Set(e.ms.flatMap(m => A.kidsOf(m)))].filter(id => kidById(id)) : [kid.id];
      e.ts0 = e.ms[0].ts; e.ts1 = e.ms[e.ms.length - 1].ts;
      e.nImg = e.ms.filter(m => m.type !== 'video').length; e.nVid = e.ms.length - e.nImg;
      const ap = e.ms.every(m => m.approx) ? ['y', 's', 'm'].find(x => e.ms.some(m => m.approx === x)) : null; e.approx = ap;
      const present = fam ? e.kids.map(kidById) : [kid];
      // chỉ 42 tuần trước ngày sinh mới là "trong bụng mẹ"; xa hơn là ảnh trước khi chào đời bình thường; chỉ áp dụng cho con, cháu
      const inPreg = (d, b) => d < b && d >= b - 294 * 864e5;
      e.preg = !ap && (fam ? present.length > 0 && present.every(k => k && isChild(k) && k.birth && inPreg(A.dayStart(e.ts0), A.dayStart(A.parseYmd(k.birth)))) : childView && inPreg(A.dayStart(e.ts0), b0));
      const lm = !e.group && M.miles?.[e.key]; e.lifeMile = lm || null;
      if (lm) { const x = mileOf(lm); e.mile = { k: 'life:' + lm, p: 9, label: x?.t || 'Cột mốc', ic: 'star', emo: x?.ic }; }
      else if (e.group || ap) e.mile = null;
      else if (fam) {
        const cand = [];
        for (const k of KS) { if (!k) continue; const here = e.kids.includes(k.id);
          if (isChild(k)) { if (here || (k.birth && A.ymd(A.parseYmd(k.birth)) === e.day)) { const c = milestone(k, e.days, true); if (c) cand.push(c); } }
          if (life || !isChild(k)) { const c = lifeMilestone(k, e.days, here); if (c) cand.push(c); } }
        e.mile = cand.sort((a, b) => b.p - a.p)[0] || null;
      }
      else e.mile = e.preg ? null : isChild(kid) ? milestone(kid, e.days) : lifeMilestone(kid, e.days, true);
      e.sibs = [];
      if (fam) for (const nb of KS) if (isChild(nb) && nb.birth && A.ymd(A.parseYmd(nb.birth)) === e.day) for (const o of KS) if (o !== nb && isChild(o) && o.birth && A.parseYmd(o.birth) < A.parseYmd(nb.birth)) e.sibs.push({ id: o.id, txt: `${o.name} ${g3(o, 'làm anh', 'làm chị', 'lên chức anh chị')}` });
      const hol = !ap && !e.group ? e.days.map(holidayOf).find(Boolean) : null;
      e.auto = ap ? 'Những tấm ảnh cũ' : e.preg && fam ? `${present[0]?.name || ''} trong bụng mẹ` : hol && hol !== 'Khai giảng' ? `${hol} ${new Date(e.ts0).getFullYear()}` : autoTitle(e, fam ? present[0] || kid : kid, fam);
      e.title = e.group ? e.group.name : M.titles[e.key] || e.mile?.label || e.auto;
      e.note = e.group ? e.group.note || '' : M.notes[e.key] || '';
      const ids = new Set(e.ms.map(m => m.id));
      e.diaries = dias.filter(d => d.pages.some(p => p.panels.some(q => ids.has(q.mid))));
      e.ages = present.filter(k => k && showsAge(k)).map(k => ({ id: k.id, color: k.color, txt: A.ageText(k, e.ts0) })).filter(a => a.txt);
      const cid = e.group ? e.group.cover : M.covers[e.key], cov = cid && e.ms.find(m => m.id === cid);
      const imgs = e.ms.filter(m => m.type !== 'video'), pool = imgs.length >= 3 ? imgs : e.ms;
      const pick = pool.length <= 3 ? pool : [pool[0], pool[Math.floor(pool.length / 2)], pool[pool.length - 1]];
      e.stack = cov ? [cov, ...pick.filter(m => m !== cov)].slice(0, 3) : pick;
      e.typeSet = M.types?.[e.key] || (e.group?.type) || null; e.type = e.typeSet || guessType(e, { wedDays });
      if (life) e.chapter = chapterAt(chs, e.ts0);
    }
    evs.sort((a, b) => b.ts0 - a.ts0);
    // công việc theo thời gian của bạn → cột mốc "Việc làm đầu tiên", "Công việc mới", "Nghỉ hưu" ở sự kiện đầu tiên của năm đó
    const meP = !ctx && (life || isMe(kid)) ? A.me?.() : null;
    if (meP?.jobs?.length) { let n = 0; for (const j of meP.jobs.filter(j => j.from).sort((a, b) => +a.from - +b.from)) {
      const study = /học sinh|sinh viên/i.test(j.job), retire = /nghỉ hưu|hưu/i.test(j.job); if (study) continue;
      const e = evs.filter(x => !x.group && !x.approx && new Date(x.ts0).getFullYear() === +j.from).sort((a, b) => a.ts0 - b.ts0).find(x => !x.mile || x.mile.p < 5); if (!e) { if (!retire) n++; continue; }
      e.mile = { k: retire ? 'retire' : 'job', p: 5, label: retire ? 'Nghỉ hưu' : n === 0 ? `Việc làm đầu tiên · ${j.job}` : `Công việc mới · ${j.job}`, ic: 'star', emo: retire ? '🌅' : '💼' }; if (!retire) n++;
      if (!M.titles[e.key]) e.title = e.mile.label; if (!e.typeSet) e.type = 'mile'; } }
    if (ctx) return evs;
    if (fam && st.filter) evs = evs.filter(e => e.kids.some(id => st.filter.has(id)));
    if (st.hidePreg) evs = evs.filter(e => !e.preg);
    if (st.range) evs = evs.filter(e => e.ts0 >= st.range[0] && e.ts0 <= st.range[1]);
    st.events = evs; st.byKey = new Map(evs.map(e => [e.key, e]));
    return evs;
  }
  const countTxt = e => [e.nImg ? `${e.nImg} ảnh` : '', e.nVid ? `${e.nVid} video` : ''].filter(Boolean).join(' · ');
  const dateTxt = e => { if (e.approx) return approxLabel(e.approx, e.ts0); const d = new Date(e.ts0), d1 = new Date(e.ts1); if (e.days.length <= 1) return `${A.WD[d.getDay()]} · ${A.dmy(e.ts0)}`; return d.getMonth() === d1.getMonth() && d.getFullYear() === d1.getFullYear() ? `${d.getDate()} – ${A.dmy(e.ts1)}` : `${A.dmy(e.ts0).slice(0, 5)} – ${A.dmy(e.ts1)}`; };

  // ---------- dựng dòng sự kiện ----------
  function card(e, i) {
    const side = st.wide ? (i % 2 ? 'R' : 'L') : 'R', ag = A.ageText(A.kid(), e.ts0, false), T = typeOf(e.type);
    const chips = [e.type !== 'daily' ? `<span class="chip ty" style="--tc:${T.c}">${T.ic} ${esc(T.t)}</span>` : '', `<span class="chip">${icon(e.nImg ? 'image' : 'video', 15, 1.9)}${esc(countTxt(e))}</span>`,
      e.diaries.length ? `<button class="chip bk" data-diary="${e.diaries[0].id}">${icon('book', 15, 1.9)}nhật ký</button>` : '',
      ...(A.family() ? e.ages.filter(a => a.txt !== e.title).map(a => `<span class="chip age" style="--c:${a.color}"><img class="mav" src="${A.avatar(kidById(a.id))}" alt="">${esc(a.txt)}</span>`) : [ag ? `<span class="chip age">${esc(ag)}</span>` : '']),
      ...e.sibs.map(x => `<span class="chip sib" style="--c:${kidById(x.id)?.color}">${icon('heart', 13, 2)}${esc(x.txt)}</span>`)].join('');
    return `<article class="ev ${side}${e.mile ? ' mile' : ''}${e.group ? ' grp' : ''}${e.preg ? ' preg' : ''}${e.type !== 'daily' ? ' typed' : ''}${e.approx ? ' apx' : ''}" data-key="${esc(e.key)}" style="--tc:${T.c}">
      ${A.family() ? `<div class="kdots">${e.kids.map(id => { const k = kidById(id), i = kidsAll().indexOf(k); return `<img class="kd${e.mile?.kid === id ? ' m' : ''}" style="left:${(16 + i * 7 - 10).toFixed(0)}px;--c:${k.color};top:${44 + (i % 2) * 14}px" src="${A.avatar(k)}" alt="">`; }).join('')}</div>` : `<div class="dot">${e.mile ? icon(e.mile.ic, 13, 2.2) : e.group ? icon('grid', 12, 2.2) : ''}</div>`}
      <div class="cd" role="button" tabindex="0" aria-label="${esc(e.title)}">
        <div class="tx">
          <div class="dt">${e.mile ? `<span class="mb">${e.mile.emo || icon(e.mile.ic, 12, 2.1)}Cột mốc</span>` : ''}${e.approx ? `<span class="mb ab">${icon('calendar', 12, 2.1)}ước chừng</span>` : ''}${e.group ? `<span class="mb gb">${icon('grid', 12, 2.1)}Nhóm · ${e.days.length} ngày</span>` : ''}<span>${esc(dateTxt(e))}</span></div>
          <h3>${esc(e.title)}</h3>
          <div class="chips">${chips}</div>
        </div>
        <div class="stk n${e.stack.length}">${e.stack.map((m, j) => `<div class="pol p${j}${m.type === 'video' ? ' v' : ''}"><img data-mid="${m.id}" alt="" decoding="async"></div>`).join('')}${e.nVid ? `<span class="vb">${icon('play', 11, 2.4)}</span>` : ''}</div>
      </div></article>`;
  }
  // tiêu đề chương đời (hành trình của bạn): màu riêng, ảnh bìa, số chương, khoảng năm + tuổi
  function chapHTML(c, evs, me, empty) {
    const y0 = new Date(c.ts).getFullYear(), y1 = c.end ? new Date(c.end - 864e5).getFullYear() : null, a0 = me?.birth ? y0 - +me.birth.slice(0, 4) : null;
    const span = y1 == null ? `từ ${y0}` : y1 > y0 ? `${y0} – ${y1}` : `${y0}`, ages = a0 == null ? '' : y1 == null ? ` · từ ${Math.max(0, a0)} tuổi` : ` · ${Math.max(0, a0)}–${Math.max(0, y1 - +me.birth.slice(0, 4))} tuổi`;
    const n = evs.reduce((t, e) => t + e.ms.length, 0), best = evs.slice().sort((a, b) => b.ms.length - a.ms.length)[0];
    const cov = c.cover && evs.flatMap(e => e.ms).find(m => m.id === c.cover) || best?.stack[0];
    return `<section class="chap${empty ? ' empty' : ''}" data-ch="${esc(c.key)}" style="--cc:${c.c}">${cov ? `<div class="ch-cv"><img data-mid="${cov.id}" alt="" decoding="async"></div>` : ''}<div class="ch-tx"><small>Chương ${c.num} · ${span}${ages}</small><h2><span class="ch-ic">${c.ic}</span>${esc(c.title)}</h2>${empty ? `<button class="ch-add" data-a="addold" data-y="${y0}">${icon('plus', 15, 2.4)}<span>Thêm ảnh cũ của chương này</span></button>` : `<p>${n} khoảnh khắc · ${evs.length} ngày đáng nhớ</p>`}</div><button class="ch-more" data-a="chmenu" aria-label="Tuỳ chọn chương">${icon('more', 20, 2.2)}</button></section>`;
  }
  function render(keep = true) {
    const kid = A.kid(); if (!kid) { IN.innerHTML = ''; return; }
    const anchor = keep ? topAnchor() : null;
    st.wide = wide(); TL.classList.toggle('wide', st.wide); document.body.classList.toggle('tlwide', st.wide);
    const evs = compute(), n = A.moments().length;
    const fam = A.family(), life = !!A.life?.(), KS = kidsAll(), me = life ? A.me() : null, chs = life ? A.chapters() : [];
    const who = isMe(kid) ? 'bạn' : kid.name, Who = isMe(kid) ? 'Bạn' : kid.name;
    TL.classList.toggle('fam', fam); TL.classList.toggle('life', life); document.body.classList.toggle('tlfam', fam); TL.style.setProperty('--nl', fam ? KS.length : 1);
    const lifeSub = me ? [A.ageText(me, Date.now(), false), chs.length ? `${chs.length} chương` : '', `${n} khoảnh khắc`].filter(Boolean).join(' · ') : '';
    const out = fam ? [`<header class="lt"><div class="lt-row"><div class="lt-avs">${KS.slice(0, 8).map(k => `<img src="${A.avatar(k)}" style="--c:${k.color}" alt="">`).join('')}</div><button class="lt-name" data-a="kid"><h1>${life ? 'Hành trình của ' + esc(me.name) : 'Cả nhà'}</h1>${icon('chevronDown', 22, 2.2)}</button></div><p>${life ? esc(lifeSub) : `${KS.length} bé · ${n} khoảnh khắc · ${evs.length} ngày đáng nhớ`}</p>
        ${KS.length > 1 ? `<div class="kflt">${KS.map(k => `<button data-kf="${k.id}" class="${!st.filter || st.filter.has(k.id) ? 'on' : ''}" style="--c:${k.color}"><img src="${A.avatar(k)}" alt=""><span>${esc(isMe(k) ? 'Bạn' : k.name)}</span></button>`).join('')}</div>` : ''}</header>`, '<div class="lanes"></div>']
      : [`<header class="lt"><div class="lt-row"><button class="lt-av" data-a="prof" aria-label="Hồ sơ của ${esc(kid.name)}" style="--c:${kid.color || '#ff8fbf'}"><img src="${A.avatar(kid)}" alt=""></button><button class="lt-name" data-a="kid"><h1>${esc(kid.name)}</h1>${icon('chevronDown', 20, 2.2)}</button></div><p>${esc([isMe(kid) ? 'Ảnh có bạn' : !isChild(kid) ? roleName(kid) : '', A.ageText(kid, Date.now(), false)].filter(Boolean).join(' · ') || '')}${n ? ` · ${n} khoảnh khắc` : ''}</p></header>`,
        evs.length ? `<button class="rstart" data-a="prof" aria-label="Hồ sơ của ${esc(kid.name)}" style="--c:${kid.color || '#ff8fbf'}"><img src="${A.avatar(kid)}" alt=""></button>` : ''];
    document.body.style.setProperty('--kc', fam && !life ? '#ff8fbf' : ((life ? me?.color : kid.color) || '#ff8fbf'));
    if (!evs.length) out.push(`<div class="empty"><div class="em-ic">${icon('sparkle', 46, 1.4)}</div><h3>${life ? 'Hành trình của bạn đang chờ những khoảnh khắc đầu tiên' : `Dòng thời gian của ${esc(kid.name)} đang chờ những khoảnh khắc đầu tiên`}</h3><p>Bấm nút <b>+</b> ở giữa thanh dưới để thêm ảnh, video. App tự đọc ngày chụp và xếp vào đúng ngày.${life ? ' Ảnh cũ chụp lại từ ảnh giấy cũng được — chọn “ảnh cũ” rồi nhập năm bạn nhớ.' : ''}</p><button class="primary" data-a="add">${icon('plus', 18, 2.2)}<span>Thêm khoảnh khắc đầu tiên</span></button></div>`);
    // chương đời: mỗi chương mở bằng một thẻ tiêu đề lớn; chương chưa có ảnh vẫn hiện (gợi ý thêm ảnh cũ)
    const chEvs = new Map(chs.map(c => [c.key, []])), pre = []; for (const e of evs) { if (e.chapter) chEvs.get(e.chapter.key)?.push(e); else if (life) pre.push(e); }
    let ci = chs.length - 1; const flushCh = upto => { const html = []; while (ci >= 0 && (!upto || chs[ci].ts > upto.ts)) { html.push(chapHTML(chs[ci], [], me, true)); ci--; } return html; };
    let y = null, mo = null, i = 0, curCh, preHdr = false, lastMl = null;
    const closeY = () => { if (y !== null) out.push('</section>'); y = null; mo = null; lastMl = null; };
    for (const e of evs) {
      if (life && st.filter == null && !st.range) {
        if (e.chapter && e.chapter !== curCh) { closeY(); out.push(...flushCh(e.chapter)); out.push(chapHTML(e.chapter, chEvs.get(e.chapter.key) || [], me, false)); ci = chs.indexOf(e.chapter) - 1; curCh = e.chapter; }
        else if (!e.chapter && !preHdr) { closeY(); out.push(...flushCh(null)); out.push(`<section class="chap pre" data-ch="pre" style="--cc:#a78bfa"><div class="ch-tx"><small>Trước chương 1</small><h2><span class="ch-ic">🌱</span>Trước khi bạn chào đời</h2><p>${pre.reduce((t, x) => t + x.ms.length, 0)} khoảnh khắc của gia đình</p></div></section>`); preHdr = true; }
      }
      const d = new Date(e.ts0), yy = d.getFullYear(), mm = d.getMonth();
      if (yy !== y) {
        closeY();
        const by = kid.birth && (isMe(kid) || isChild(kid) || showsAge(kid)) ? +kid.birth.slice(0, 4) : 0, age = yy - by, sub = !by ? '' : age < 0 ? (evs.some(x => x.preg && new Date(x.ts0).getFullYear() === yy) ? 'Chờ ngày gặp con' : '') : age === 0 ? `Năm ${esc(who)} chào đời` : `${esc(Who)} tròn ${age} tuổi`;
        out.push(`<section class="yr" data-y="${yy}"><i class="ysen"></i><h2 class="yh"><b>${yy}</b>${sub ? `<small>${sub}</small>` : ''}</h2>`); y = yy; mo = null;
      }
      const ml = e.approx === 'y' ? 'Không rõ tháng' : e.approx === 's' ? approxLabel('s', e.ts0) : MONTH(mm) + (e.preg ? ' · trước khi chào đời' : '');
      if (mm !== mo || ml !== lastMl) { out.push(`<div class="mo" data-ym="${yy}-${mm}"><span>${ml}</span></div>`); mo = mm; lastMl = ml; }
      out.push(card(e, i++));
    }
    closeY();
    if (life && st.filter == null && !st.range) out.push(...flushCh(null));
    if (evs.length) out.push(`<div class="tl-end">${life && A.chibi ? `<span class="tl-cb">${A.chibi(me)}</span>` : icon('star', 18, 1.8)}<span>${life ? me?.birthApprox ? `Năm ${me.birth.slice(0, 4)} bạn chào đời — hành trình bắt đầu từ đây` : 'Ngày bạn chào đời — hành trình bắt đầu từ đây' : isChild(kid) || isMe(kid) ? `Hành trình của ${esc(who)} bắt đầu từ đây` : `Hành trình cùng ${esc(kid.name)} bắt đầu từ đây`}</span></div>`);
    if (evs.length && evs.length < 6 && !fam) out.push(`<button class="tl-more" data-a="add"><i>${icon('plus', 26, 2.2)}</i><b>Thêm khoảnh khắc tiếp theo</b><span>Ảnh, video của ${esc(who)} — app tự xếp vào đúng ngày</span></button>`);
    if (evs.length && !fam) out.push('<div class="rail2" aria-hidden="true"><i></i></div>');
    out.splice(1, 0, bdayBanner());
    IN.innerHTML = out.join('');
    IN.querySelectorAll('.pol img, .ch-cv img').forEach(im => imgIO.observe(im));
    IN.querySelectorAll('.ev').forEach(el => cardIO.observe(el));
    IN.querySelectorAll('.ysen').forEach(el => yrIO.observe(el));
    if (anchor) restoreAnchor(anchor);
    if (fam) drawLanes(); else layRail();
    fitTitle(); st.tlp = -1;
    onScroll(true);
  }
  // dải sáng nằm trong nội dung: bắt đầu ở avatar đầu dải, mờ dần ở dòng "Hành trình bắt đầu từ đây"
  function layRail() {
    const r = IN.querySelector('.rail2'), a = IN.querySelector('.rstart'), end = IN.querySelector('.tl-end'); if (!r || !a || !end) return;
    const t = aT(a) + a.offsetHeight / 2, b = aT(end) + end.offsetHeight / 2, h = Math.max(40, b - t);
    r.style.top = t + 'px'; r.style.height = h + 'px'; r.style.setProperty('--dur', clamp(h / 420, 2.4, 9).toFixed(2) + 's');
  }
  // tên lớn tự thu cỡ chữ cho vừa một dòng (tối thiểu 28px, quá nữa thì "…")
  function fitTitle() {
    const h = IN.querySelector('.lt h1'), b = h?.closest('.lt-name'), row = h?.closest('.lt-row'); if (!h) return;
    h.style.fontSize = ''; const max = row.clientWidth - (row.querySelector('.lt-av, .lt-avs')?.offsetWidth || 0) - 12 - 30;
    let fs = parseFloat(getComputedStyle(h).fontSize) || 42; b.style.maxWidth = max + 'px';
    while (h.scrollWidth > h.clientWidth + 1 && fs > 28) { fs -= 2; h.style.fontSize = fs + 'px'; }
  }
  new ResizeObserver(() => { if (!A.family()) layRail(); }).observe(IN);
  // các dải song song của Cả nhà: mỗi bé một màu, bắt đầu từ ngày sinh (đoạn mang bầu nét đứt), avatar so le ở đầu dải
  function drawLanes() {
    const box = IN.querySelector('.lanes'); if (!box) return; const KS = kidsAll(), evEls = [...IN.querySelectorAll('.ev')], me = A.me?.();
    if (!evEls.length) { box.innerHTML = ''; return; }
    const y0 = IN.querySelector('.yr, .chap'), top = (y0 ? aT(y0) : aT(evEls[0]) - 70) + 6, html = [], ev = el => st.byKey.get(el.dataset.key);
    KS.forEach((k, i) => {
      if (st.filter && !st.filter.has(k.id)) return;
      const x = 16 + i * 7, mine = evEls.filter(el => ev(el)?.kids.includes(k.id)), anc = A.life?.() ? sinceOf(k, me) : (isChild(k) ? k.birth : anchorOf(k, me));
      const ancT = anc ? A.dayStart(A.parseYmd(anc)) : null;
      if (isMe(k) && A.life?.()) { // dải chính của bạn: suốt hành trình, tới ngày bạn chào đời
        const end = IN.querySelector('.tl-end') || evEls[evEls.length - 1], bot = aT(end) + 12;
        html.push(`<div class="lane me" style="left:${x}px;top:${top}px;height:${Math.max(40, bot - top)}px;--c:${k.color}"><i></i></div>`);
      } else {
        if (!mine.length && ancT == null) return;
        // dải chạy từ hiện tại xuống tới ngày người này bước vào đời bạn (con: ngày sinh); trước đó nét đứt (con: lúc mang bầu)
        const after = ancT == null ? mine : evEls.filter(el => ev(el) && ev(el).ts0 >= ancT), endEl = after[after.length - 1];
        const bot = endEl ? aT(endEl) + 60 : top; if (endEl) html.push(`<div class="lane" style="left:${x}px;top:${top}px;height:${Math.max(40, bot - top)}px;--c:${k.color}"><i></i></div>`);
        const pre = ancT == null ? [] : mine.filter(el => ev(el).ts0 < ancT);
        if (pre.length) { const pb = aT(pre[pre.length - 1]) + 60; if (pb > bot) html.push(`<div class="lane preg" style="left:${x}px;top:${bot}px;height:${pb - bot}px;--c:${k.color}"></div>`); }
        if (!endEl && !pre.length) return;
      }
      html.push(`<img class="lh" src="${A.avatar(k)}" style="left:${x - 17 + (i % 2 ? 9 : -2)}px;top:${top - 46 + (i % 2) * 14}px;--c:${k.color};z-index:${10 - i}" alt="">`);
    });
    box.innerHTML = html.join('');
  }
  // banner sinh nhật: 7 ngày trước sinh nhật (và đúng ngày)
  function bdays() {
    const KS = A.family() ? kidsAll() : [A.kid()], t = new Date(), today = new Date(t.getFullYear(), t.getMonth(), t.getDate()), out = [];
    for (const k of KS) { if (!k?.birth || k.birthApprox) continue; const [y, m, d] = k.birth.split('-').map(Number); let nb = new Date(today.getFullYear(), m - 1, d); if (nb < today) nb = new Date(today.getFullYear() + 1, m - 1, d); const days = Math.round((nb - today) / 864e5), turn = nb.getFullYear() - y; if (turn >= 1 && days <= 7) out.push({ k, days, turn, last: new Date(nb.getFullYear() - 1, m - 1, d).getTime() }); }
    return out;
  }
  function bdayBanner() {
    if (st.range) return `<div class="bdb flt">${icon('calendar', 18)}<span>Đang xem kỷ niệm từ sinh nhật năm ngoái đến nay</span><button data-a="unrange">${icon('close', 16, 2.2)}<span>Bỏ lọc</span></button></div>`;
    const bs = bdays(); const td = bs.find(b => !b.days && !st.conf?.has(b.k.id)); if (td) { (st.conf ||= new Set()).add(td.k.id); setTimeout(() => A.confetti?.(td.k.color || '#ff8fbf'), 900); }
    return bs.map(b => `<div class="bdb${b.days ? '' : ' today'}" style="--c:${b.k.color || '#ff8fbf'}"><img src="${A.avatar(b.k)}" alt=""><div><b>${b.days ? `Còn ${b.days} ngày nữa là sinh nhật ${b.turn} tuổi của ${esc(isMe(b.k) ? 'bạn' : b.k.name)}` : `Hôm nay là sinh nhật ${b.turn} tuổi của ${esc(isMe(b.k) ? 'bạn' : b.k.name)}!`}</b><div class="bdb-a"><button data-a="lastyear" data-k="${b.k.id}">${icon('heart', 16)}<span>Xem lại kỷ niệm năm qua</span></button><button data-a="bnhac" data-k="${b.k.id}">${icon('cake', 16)}<span>Nhắc sinh nhật</span></button></div></div></div>`).join('');
  }
  function topAnchor() { // giữ chỗ đang xem khi dựng lại
    const evs = [...IN.querySelectorAll('.ev')]; const top = TL.scrollTop;
    const el = evs.find(x => aT(x) + x.offsetHeight > top + 80); return el ? { key: el.dataset.key, off: aT(el) - top } : null;
  }
  function restoreAnchor(a) { const el = IN.querySelector(`.ev[data-key="${CSS.escape(a.key)}"]`); if (el) { el.classList.add('in'); TL.scrollTop = aT(el) - a.off; } }
  const aT = el => el.getBoundingClientRect().top - IN.getBoundingClientRect().top; // vị trí trong danh sách (khối năm có position:relative nên không dùng offsetTop)
  const evEl = key => IN.querySelector(`.ev[data-key="${CSS.escape(key)}"]`);
  function scrollToKey(key, { bounce = true, smooth = true } = {}) {
    const el = evEl(key); if (!el) return;
    el.classList.add('in');
    TL.scrollTo({ top: Math.max(0, aT(el) - innerHeight * .3), behavior: smooth && !REDUCED ? 'smooth' : 'auto' });
    if (bounce) setTimeout(() => { el.classList.remove('hl'); void el.offsetWidth; el.classList.add('hl'); haptic(10); }, smooth ? 650 : 50);
  }
  const keyOfMid = mid => st.events.find(e => e.ms.some(m => m.id === mid))?.key;

  // ---------- cuộn: thu tiêu đề lớn, năm trôi chậm, thanh cuộn nhanh ----------
  let raf = 0, fscT = 0, lastTop = 0;
  function onScroll(force) {
    if (raf && !force) return;
    raf = requestAnimationFrame(() => {
      raf = 0; const top = TL.scrollTop, H = TL.clientHeight;
      const p = +clamp(top / 70, 0, 1).toFixed(3); if (p !== st.tlp) { st.tlp = p; const tb = document.getElementById('tbar'), lt = IN.querySelector('.lt'); tb?.style.setProperty('--tlp', p); lt?.style.setProperty('--tlp', p); } // chỉ đặt biến trên đúng phần tử dùng nó (đặt trên body làm cả trang tính lại kiểu)
      document.body.classList.toggle('tl-scrolled', p > .6);
      const max = TL.scrollHeight - H;
      if (max > 0) { const t = FSC.querySelector('.th'); t.style.transform = `translate3d(0,${(top / max * (FSC.clientHeight - 44)).toFixed(1)}px,0)`; }
      if (Math.abs(top - lastTop) > 2 && max > H * 2.5) { FSC.classList.add('on'); clearTimeout(fscT); fscT = setTimeout(() => { if (!fsDrag) FSC.classList.remove('on'); }, 1300); }
      lastTop = top; A.onScroll?.(max > 0 ? top / max : 0);
    });
  }
  TL.addEventListener('scroll', () => onScroll(), { passive: true });
  addEventListener('resize', () => { if (wide() !== st.wide) render(); else if (A.family()) drawLanes(); });
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
    const mid = TL.scrollTop + TL.clientHeight * .4, el = [...IN.querySelectorAll('.ev')].find(x => aT(x) + x.offsetHeight > mid);
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
  $('#mJump').addEventListener('click', e => { const b = e.target.closest('[data-ym]'); if (!b) return; A.closeModal($('#mJump')); const el = IN.querySelector(`.mo[data-ym="${b.dataset.ym}"]`); if (el) setTimeout(() => TL.scrollTo({ top: aT(el) - 90, behavior: REDUCED ? 'auto' : 'smooth' }), 250); });

  IN.addEventListener('click', e => {
    const bk = e.target.closest('.bk'); if (bk) { e.stopPropagation(); A.openDiary(bk.dataset.diary); return; }
    const kf = e.target.closest('[data-kf]');
    if (kf) { const KS = kidsAll(); st.filter = st.filter || new Set(KS.map(k => k.id)); const id = kf.dataset.kf; if (st.filter.has(id)) { if (st.filter.size > 1) st.filter.delete(id); else { A.toast('Cần ít nhất 1 bé', 1200); return; } } else st.filter.add(id); if (st.filter.size === KS.length) st.filter = null; haptic(6); render(); IN.querySelector(`[data-kf="${id}"]`)?.classList.add('pop'); return; }
    const a = e.target.closest('[data-a]');
    if (a?.dataset.a === 'lastyear') { const b = bdays().find(x => x.k.id === a.dataset.k); if (b) { st.range = [b.last, Date.now()]; haptic(8); render(false); TL.scrollTo({ top: 0, behavior: 'smooth' }); A.toast(st.events.length ? `${st.events.length} ngày kỷ niệm từ sinh nhật năm ngoái` : 'Năm qua chưa có ảnh nào — thêm ảnh nhé!', 2400); } return; }
    if (a?.dataset.a === 'unrange') { st.range = null; render(false); return; }
    if (a?.dataset.a === 'bnhac') { A.nhac([kidById(a.dataset.k)]); return; }
    if (a?.dataset.a === 'addold') { A.addOld(+a.dataset.y); return; }
    if (a?.dataset.a === 'chmenu') { chapterMenu(a.closest('.chap').dataset.ch, a); return; }
    { const ch = e.target.closest('.chap:not(.pre)'); if (ch && !a) { chapterMenu(ch.dataset.ch, ch.querySelector('.ch-more')); return; } }
    if (a?.dataset.a === 'kid') { A.openKidMenu(a); return; } if (a?.dataset.a === 'add') { A.openAdd(); return; } if (a?.dataset.a === 'prof') { A.openProfile(); return; }
    if (performance.now() < st.guard) return;
    if (SEL.on && SEL.scope === 'tl') { const ev2 = e.target.closest('.ev'); if (ev2) toggleSel(ev2.dataset.key); return; }
    const cd = e.target.closest('.cd'); if (cd) openEvent(cd.closest('.ev').dataset.key, cd);
  });
  longPress(IN, '.bk, .cd, .lt-av, .rhead', (el) => {
    if (SEL.on) return;
    if (el.matches('.bk')) { A.diaryMenu(el.dataset.diary, el); return; }
    if (el.matches('.lt-av, .rhead')) { A.kidMenu(el); return; }
    const k = el.closest('.ev').dataset.key, e = st.byKey.get(k); if (e) eventMenu(e, el);
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
  // ---------- màu chủ đạo của ảnh (làm nền chờ khi ảnh chưa hiện, nền trình xem) ----------
  const COL = new Map(); let colDirty = 0, colLoaded = false;
  const loadCols = async () => { if (colLoaded) return; colLoaded = true; const c = await A.metaGet('cols'); if (c) for (const k in c) COL.set(k, c[k]); };
  const ccv = document.createElement('canvas'); ccv.width = ccv.height = 6; const cctx = ccv.getContext('2d', { willReadFrequently: true });
  function colorOf(mid, im) {
    if (COL.has(mid)) return COL.get(mid);
    try { cctx.drawImage(im, 0, 0, 6, 6); const d = cctx.getImageData(0, 0, 6, 6).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } const n = d.length / 4, h = '#' + [r, g, b].map(v => Math.round(v / n).toString(16).padStart(2, '0')).join(''); COL.set(mid, h); clearTimeout(colDirty); colDirty = setTimeout(() => A.metaSet('cols', Object.fromEntries(COL)), 2500); return h; } catch (e) { return ''; }
  }
  // ---------- trang sự kiện: đầu trang gọn + DẢI ẢNH TRÔI bồng bềnh (quẹt ngang có đà) ----------
  const SC = EVP.querySelector('.evp-sc'), STRIP = EVP.querySelector('.evp-strip'), ROWS = EVP.querySelector('.evp-rows'), GRID = EVP.querySelector('.evp-grid');
  const kidCol = () => A.kid()?.color || '#ff8fbf';
  const fmtD = s => { s = Math.round(s || 0); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };
  // giải mã ảnh gốc rồi vẽ thu nhỏ vào canvas vừa khung (tối đa 2x màn hình) — đỡ tốn bộ nhớ GPU
  async function fitCanvas(blob, W, H, extra = 1) {
    const u = URL.createObjectURL(blob), im = new Image(); im.src = u;
    try { await im.decode(); } catch (er) { URL.revokeObjectURL(u); return null; }
    const dpr = Math.min(2, devicePixelRatio || 1), cw = Math.round(W * dpr * extra), ch = Math.round(H * dpr * extra), iw = im.naturalWidth, ih = im.naturalHeight, k = Math.max(cw / iw, ch / ih);
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const x = cv.getContext('2d'); x.imageSmoothingQuality = 'high';
    x.drawImage(im, (cw - iw * k) / 2, (ch - ih * k) / 2, iw * k, ih * k); URL.revokeObjectURL(u); return cv;
  }
  // nền đầu trang: ảnh bìa vẽ vào canvas rất nhỏ rồi phóng to = nhoè tự nhiên (không cần filter blur)
  async function paintBg(m) {
    const im = EVP.querySelector('.evp-bgc'), u = await thumbURL(m.id); if (!u) return; im.classList.remove('ok');
    im.src = u; try { await im.decode(); } catch (e) { } im.classList.add('ok');
  }

  // ---- động cơ dải trôi: một vòng rAF duy nhất, chỉ đổi transform/opacity ----
  const SP = { rows: [], cards: [], raf: 0, t: 0, last: 0, drag: null, idle: 0, speedK: 1, open: false, enter: 0, video: null, vEl: null, W: 0, H: 0 };
  const asp = m => clamp(m.w && m.h ? m.w / m.h : 1, .56, 1.9);
  function buildStrip(e) {
    stopStripVideo(); ROWS.innerHTML = ''; SP.rows = []; SP.cards = [];
    const W = STRIP.clientWidth || innerWidth, H = STRIP.clientHeight || 380; SP.W = W; SP.H = H;
    const ms = e.ms, two = ms.length >= 6 && H >= 300, nRows = two ? 2 : 1;
    const rowH = H / nRows, ihMax = rowH - 58, [wmin, wmax] = two ? [.32, .46] : [.42, .56];
    for (let r = 0; r < nRows; r++) {
      const list = ms.filter((m, i) => i % nRows === r); if (!list.length) continue;
      const fitW = ms.length <= 2 ? (W - 36 - 22 * (ms.length - 1)) / ms.length - 12 : 1e9; // 1–2 ảnh: vừa khít màn hình, căn giữa
      const items = list.map(m => { const a = asp(m); let w = Math.min(clamp(ihMax * a, W * wmin, W * wmax), fitW); let ih = w / a; if (ih > ihMax) { ih = ihMax; w = ih * a; } return { m, w: w + 12, h: ih + 12 }; });
      const gap = 22; let base = items.slice(), L = base.reduce((s, it) => s + it.w + gap, 0);
      const loop = ms.length >= 4 && L > W * .9; let copies = 1;
      if (loop) while (L * copies < W * 2.2) copies++;
      const all = []; for (let c = 0; c < copies; c++) all.push(...base.map(it => ({ ...it })));
      let x = 0; for (const it of all) { it.x0 = x; x += it.w + gap; }
      const row = { r, loop, L: x, items: all, y: rowH * r + (rowH - 22) / 2, off: loop ? -(W * .08) : (W - (x - gap)) / 2, v: 0, drift: (r ? 8 : 12) * (r ? 1 : 1), par: r ? .82 : 1 };
      if (!loop) row.off = (W - (x - gap)) / 2;
      for (const it of all) {
        const el = document.createElement('button'); el.className = 'sc' + (it.m.type === 'video' ? ' v' : ''); el.dataset.mid = it.m.id;
        el.style.width = it.w + 'px'; el.style.height = it.h + 'px'; el.style.setProperty('--pc', it.m.color || COL.get(it.m.id) || 'var(--pc0)');
        el.innerHTML = `<span class="sc-f"><img alt="" decoding="async"></span>${it.m.type === 'video' ? `<span class="sc-v">${icon('play', 11, 2.6)} ${fmtD(it.m.dur)}</span>` : ''}<span class="sc-t">${e.days.length > 1 ? A.dmy(it.m.ts).slice(0, 5) + ' · ' : ''}${esc(it.m.title || timeVN(it.m.ts))}</span><i class="sc-sh"></i>`;
        ROWS.appendChild(el); const R = rng(it.m.id + r + it.x0);
        Object.assign(it, { el, row, tilt: (R() * 2 - 1) * 4.2, ph: R() * Math.PI * 2, bob: 4 + R() * 4, img: el.querySelector('img'), loaded: false, k: SP.cards.length });
        SP.cards.push(it);
      }
      SP.rows.push(row);
    }
    ROWS.style.height = H + 'px'; SP.enter = performance.now(); SP.speedK = 0; SP.idle = performance.now() + 900;
  }
  function loadCard(it) { if (it.loaded) return; it.loaded = true; thumbURL(it.m.id).then(u => { if (!u || !it.el.isConnected) return; it.img.src = u; (it.img.decode ? it.img.decode() : Promise.resolve()).catch(() => { }).then(() => it.img.classList.add('ok')); }); }
  const mod = (a, n) => ((a % n) + n) % n;
  function cardX(it) { const R = it.row; if (!R.loop) return it.x0 + R.off; return mod(it.x0 + R.off + it.w, R.L) - it.w; }
  function stripFrame() {
    SP.raf = 0; if (!SP.open || document.hidden) return;
    const now = performance.now(), dt = clamp((now - (SP.last || now)) / 1000, 0, .05); SP.last = now; // đồng hồ thật, dt ≤ 50ms
    const o0 = SP.rows[0]?.off ?? 0;
    renderStrip(now, dt);
    if (dt > 0 && SP.rows[0]) { const v = Math.abs(SP.rows[0].off - o0) / dt; SP.spd = (SP.spd || 0) * .92 + v * .08; } // tốc độ thật để hiện ở đồng hồ FPS
    SP.raf = requestAnimationFrame(stripFrame);
  }
  // vẽ một khung (không tự lập lịch): dt = 0 thì chỉ đặt lại vị trí
  function renderStrip(now, dt) {
    const frozen = now < (SP.freeze || 0); if (frozen) dt = 0; SP.t += dt;
    // tự trôi (trái → phải); đang chạm thì ngừng, thả 2 giây sau trôi lại và tăng tốc dần
    const auto = !SP.drag && now > SP.idle && !REDUCED && !PV.classList.contains('open') && !document.body.classList.contains('cmopen');
    SP.speedK = auto ? Math.min(1, SP.speedK + dt / 1.6) : 0;
    for (const R of SP.rows) {
      if (SP.drag) { /* off do ngón tay quyết định */ }
      else if (Math.abs(R.v) > 6) { R.off += R.v * dt; R.v *= Math.exp(-dt * 3.2); if (Math.abs(R.v) <= 6) { R.v = 0; R.snap = snapTarget(R); } if (!R.loop) R.off = softBound(R); }
      else if (R.snap != null) { const d = R.snap - R.off; R.sv = (R.sv || 0) * Math.exp(-dt * 12) + d * dt * 90; R.off += R.sv * dt; if (Math.abs(d) < .4 && Math.abs(R.sv) < 4) { R.off = R.snap; R.snap = null; R.sv = 0; } }
      else if (R.loop) { R.v = 0; R.sv = 0; R.off += R.drift * SP.speedK * dt; }
    }
    const W = SP.W, cx = W / 2, en = clamp((now - SP.enter) / 900, 0, 1);
    let best = null, bestD = 1e9;
    for (const it of SP.cards) {
      const x = cardX(it), vis = x < W + 40 && x + it.w > -40;
      if (!vis) { if (it.on) { it.el.style.visibility = 'hidden'; it.on = false; } continue; }
      if (!it.on) { it.el.style.visibility = 'visible'; it.on = true; }
      if (!it.loaded && (!frozen || it.noEnter)) loadCard(it);
      const c = x + it.w / 2, d = clamp((c - cx) / (W * .62), -1, 1), ad = Math.abs(d);
      const s = 1 - .18 * ad * ad, y = it.row.y - it.h / 2 + Math.sin(SP.t * .9 + it.ph) * it.bob + ad * 10;
      const ek = REDUCED || it.noEnter ? 1 : 1 - Math.pow(1 - clamp(en * 1.6 - it.k * .06, 0, 1), 3);
      const rot = it.tilt + Math.sin(SP.t * .6 + it.ph) * .8;
      it.el.style.transform = `translate3d(${x.toFixed(1)}px,${(y + (1 - ek) * 60).toFixed(1)}px,0) rotate(${rot.toFixed(2)}deg) scale(${(s * (.85 + .15 * ek)).toFixed(3)})`;
      const op = (ek * (1 - .32 * ad)).toFixed(2), z = 10 - Math.round(ad * 9); if (op !== it.op) { it.op = op; it.el.style.opacity = op; } if (z !== it.z) { it.z = z; it.el.style.zIndex = z; }
      if (it.m.type === 'video' && ad < bestD) { bestD = ad; best = it; }
    }
    // video: giữ cái đang phát tới khi trôi khá xa (tránh bật tắt liên tục), đổi khi có tấm mới thật gần giữa
    const curV = SP.vIt && SP.vIt.on ? Math.abs(clamp((cardX(SP.vIt) + SP.vIt.w / 2 - cx) / (W * .62), -1, 1)) : 9;
    if (PV.classList.contains('open') || EVS.classList.contains('open')) { if (SP.vIt) pickStripVideo(null); }
    else if (!frozen) { if (best && bestD < .22 && best !== SP.vIt) { if (SP.vCand !== best) { SP.vCand = best; SP.vAt = now; } else if (now - SP.vAt > 300) pickStripVideo(best); } else { SP.vCand = null; if (curV > .55 && SP.vIt) pickStripVideo(null); } }
  }
  const softBound = R => { const len = R.L - 22, lo = Math.min((SP.W - len) / 2, SP.W - len - 16), hi = Math.max((SP.W - len) / 2, 16); if (R.off > hi || R.off < lo) { R.v = 0; R.snap = clamp(R.off, lo, hi); } return R.off; };
  function snapTarget(R) { // hút về tấm gần giữa nhất
    const cx = SP.W / 2; let best = null, bd = 1e9;
    for (const it of R.items) { const c = cardX(it) + it.w / 2, d = Math.abs(c - cx); if (d < bd) { bd = d; best = it; } }
    if (!R.loop) { const len = R.L - 22; return len < SP.W ? (SP.W - len) / 2 : clamp(R.off + (cx - (cardX(best) + best.w / 2)), SP.W - len - 16, 16); }
    return best ? R.off + (cx - (cardX(best) + best.w / 2)) : R.off;
  }
  function jumpDay(d) { // đưa tấm đầu tiên của ngày đó về giữa dải
    const cx = SP.W / 2; haptic(6); SP.idle = performance.now() + 2600;
    EVP.querySelectorAll('.evp-days button').forEach(b => b.classList.toggle('on', b.dataset.day === d));
    for (const R of SP.rows) { const cs = R.items.filter(it => A.ymd(it.m.ts) === d); if (!cs.length) continue; const it = cs.sort((a, b) => Math.abs(cardX(a) + a.w / 2 - cx) - Math.abs(cardX(b) + b.w / 2 - cx))[0]; R.v = 0; R.snap = R.off + (cx - (cardX(it) + it.w / 2)); }
  }
  function startStrip() { SP.open = true; SP.last = 0; if (!SP.raf) SP.raf = requestAnimationFrame(stripFrame); }
  function stopStrip() { SP.open = false; if (SP.raf) cancelAnimationFrame(SP.raf); SP.raf = 0; stopStripVideo(); }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && SP.open && !SP.raf) { SP.last = 0; SP.raf = requestAnimationFrame(stripFrame); } });
  // video gần giữa nhất tự phát xem trước (tắt tiếng, lặp) — chỉ 1 cái
  // iOS chỉ tự phát khi muted + playsinline được đặt TRƯỚC src và phần tử đang hiện trong trang; dùng chung 1 phần tử video
  const SV = (() => { const v = document.createElement('video'); v.muted = true; v.defaultMuted = true; v.setAttribute('muted', ''); v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', ''); v.loop = true; v.preload = 'auto'; v.className = 'sv'; return v; })();
  let svUrl = '', svTok = 0; const TESTMODE = /[?&]test/.test(location.search); SV.preload = 'metadata';
  const svShow = () => { SV.classList.add('ok'); };
  SV.addEventListener('playing', () => { if (SV.requestVideoFrameCallback) SV.requestVideoFrameCallback(svShow); else setTimeout(svShow, 120); });
  function pickStripVideo(it) {
    if ((SP.vIt || null) === (it || null)) return; stopStripVideo(); if (!it) return;
    SP.vIt = it; const tok = ++svTok;
    A.dbGet('blobs', 'o_' + it.m.id).then(b => { if (!b || tok !== svTok) return; if (!b.type) b = new Blob([b], { type: /quicktime|\.mov$/i.test((it.m.mime || '') + it.m.name) ? 'video/quicktime' : 'video/mp4' });
      const old = svUrl; svUrl = URL.createObjectURL(b); SV.classList.remove('ok'); it.el.classList.remove('vblock'); it.el.querySelector('.sc-f').appendChild(SV); SV.src = svUrl;
      SV.play().catch(er => { if (tok !== svTok) return; console.warn('video dải không tự phát:', er.name); it.el.classList.add('vblock'); if (TESTMODE) (window.T && (T.svErr = er.name)); });
      if (old) setTimeout(() => URL.revokeObjectURL(old), 1500); });
  }
  function stopStripVideo() { svTok++; SV.pause(); SV.classList.remove('ok'); SV.remove(); SV.removeAttribute('src'); try { SV.load(); } catch (e) { } if (svUrl) { const u = svUrl; svUrl = ''; setTimeout(() => URL.revokeObjectURL(u), 800); } SP.vIt = null; }
  // quẹt ngang có đà; chạm = mở trình xem; nhấn giữ = menu dính đáy
  {
    let d = null, lpT = 0;
    STRIP.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return; const card = e.target.closest('.sc');
      d = { x: e.clientX, y: e.clientY, lx: e.clientX, lt: performance.now(), v: 0, on: false, card, offs: SP.rows.map(R => R.off) };
      SP.drag = d; SP.rows.forEach(R => { R.v = 0; R.snap = null; R.sv = 0; });
      clearTimeout(lpT); if (card) lpT = setTimeout(() => { if (!d || d.on) return; d.lp = true; SP.drag = null; SP.idle = performance.now() + 2500; const m = st.cur?.ms.find(x => x.id === card.dataset.mid); if (m) photoMenu(m, card); }, 480);
    });
    STRIP.addEventListener('pointermove', e => {
      if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (!d.on) { if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { d.on = true; clearTimeout(lpT); try { STRIP.setPointerCapture(e.pointerId); } catch (er) { } } else if (Math.abs(dy) > 10) { clearTimeout(lpT); d = null; SP.drag = null; SP.idle = performance.now() + 2000; return; } else return; }
      const now = performance.now(), dt = Math.max(1, now - d.lt); d.v = d.v * .25 + (e.clientX - d.lx) / dt * 1000 * .75; d.lx = e.clientX; d.lt = now;
      SP.rows.forEach((R, i) => { let o = d.offs[i] + dx * R.par; if (!R.loop) { const len = R.L - 22, lo = Math.min((SP.W - len) / 2, SP.W - len - 16), hi = Math.max((SP.W - len) / 2, 16); if (o > hi) o = hi + rubber(o - hi, 160); if (o < lo) o = lo + rubber(o - lo, 160); } R.off = o; });
    });
    const up = e => {
      clearTimeout(lpT); if (!d) return; const D = d; d = null; SP.drag = null; SP.idle = performance.now() + 2000;
      if (D.lp) return;
      if (!D.on) { if (D.card && e.type === 'pointerup') { const m = st.cur?.ms.find(x => x.id === D.card.dataset.mid); if (SEL.on) { toggleSel(m.id); return; } if (st.coverPick) { st.coverPick = false; EVP.classList.remove('pick'); setCover(m); return; } if (m) openViewer(st.cur.ms, st.cur.ms.indexOf(m), stripRect); } SP.rows.forEach(R => { R.snap = null; }); return; }
      SP.rows.forEach(R => { R.v = clamp(D.v * R.par, -4200, 4200); if (Math.abs(R.v) <= 6) R.snap = snapTarget(R); });
    };
    STRIP.addEventListener('pointerup', up); STRIP.addEventListener('pointercancel', up);
    STRIP.addEventListener('click', e => e.preventDefault());
    STRIP.addEventListener('contextmenu', e => e.preventDefault());
    STRIP.addEventListener('wheel', e => { if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; e.preventDefault(); SP.rows.forEach(R => { R.off -= e.deltaX * R.par; R.v = 0; R.snap = null; }); SP.idle = performance.now() + 2000; }, { passive: false });
  }
  // trình xem hỏi khung của tấm: chọn bản sao gần giữa nhất, không thấy thì kéo dải cho tấm đó về giữa
  function stripRect(mid) {
    let cs = SP.cards.filter(c => c.m.id === mid); if (!cs.length) return null;
    const cx = SP.W / 2; let it = cs.sort((a, b) => Math.abs(cardX(a) + a.w / 2 - cx) - Math.abs(cardX(b) + b.w / 2 - cx))[0];
    const c = cardX(it) + it.w / 2; if (c < 0 || c > SP.W) { it.row.off += cx - c; it.row.v = 0; it.row.snap = null; renderStrip(performance.now(), 0); }
    const sr = STRIP.getBoundingClientRect(); if (sr.bottom < 80 || sr.top > innerHeight - 80) SC.scrollTop = 0;
    return it.el.querySelector('.sc-f');
  }
  async function openEvent(key, cdEl) {
    const e = st.byKey.get(key); if (!e) return;
    haptic(8); document.body.classList.add('evopen'); st.cur = e; st.evb = -1; EVP.classList.remove('closing', 'gridon'); GRID.hidden = true; GRID.innerHTML = ''; SC.scrollTop = 0; SC.style.transform = ''; loadCols();
    fillEvent(e);
    const cover = e.stack[0]; EVP.style.setProperty('--hc', cover.color || COL.get(cover.id) || kidCol()); setTimeout(() => { if (st.cur === e) paintBg(cover); }, REDUCED ? 0 : 480);
    EVP.classList.add('open'); EVP.setAttribute('aria-hidden', 'false'); document.body.classList.add('evopen'); onEvScroll(true);
    buildStrip(e); // dựng ngay để biết đúng chỗ hạ cánh
    const srcIm = cdEl?.querySelector('.pol.p0 img'), now = performance.now();
    const cx = SP.W / 2, cand = SP.cards.filter(c => c.m.id === cover.id), it = (cand.length ? cand : SP.cards).slice().sort((a, b) => Math.abs(cardX(a) + a.w / 2 - cx) - Math.abs(cardX(b) + b.w / 2 - cx))[0];
    if (it && it.row.loop) it.row.off += cx - (cardX(it) + it.w / 2);
    if (it && srcIm && !REDUCED) { it.noEnter = true; SP.freeze = now + 560; SP.idle = now + 2200; }
    renderStrip(now, 0); startStrip();
    if (!REDUCED) EVP.querySelector('.evp-hx').animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 90, easing: 'cubic-bezier(.2,1,.3,1)', fill: 'backwards' });
    if (it && srcIm && !REDUCED) flyCard(it, srcIm, true);
  }
  // tấm bay có CÙNG khung polaroid với tấm đích trong dải; tấm đích ẩn cho tới khi hạ cánh (không thấy 2 ảnh)
  function flyCard(it, polImg, opening, done) {
    const R = ROWS.getBoundingClientRect(), w = it.w, h = it.h, src = polImg.getBoundingClientRect();
    const g = it.el.cloneNode(true); g.classList.add('flyc'); g.classList.remove('flying'); const gi = g.querySelector('img'); gi.src = it.img.src || polImg.src; gi.classList.add('ok'); g.querySelector('video')?.remove(); g.querySelector('.sc-t')?.remove();
    const tr = it.el.style.transform || 'none', ox = w * .5, oy = h * .6, kx = src.width / w, ky = src.height / h;
    const A0 = `translate3d(${(src.left - ox * (1 - kx)).toFixed(1)}px,${(src.top - oy * (1 - ky)).toFixed(1)}px,0) rotate(-4deg) scale(${kx.toFixed(4)},${ky.toFixed(4)})`, A1 = `translate3d(${R.left.toFixed(1)}px,${R.top.toFixed(1)}px,0) ${tr}`;
    g.style.cssText = `position:fixed;left:0;top:0;width:${w}px;height:${h}px;margin:0;z-index:70;visibility:visible;opacity:1;pointer-events:none;transform-origin:${ox}px ${oy}px;transform:${opening ? A1 : A0}`;
    document.body.appendChild(g); it.el.classList.add('flying'); const pol = polImg.closest('.pol'); if (pol) pol.style.visibility = 'hidden';
    const an = g.animate([{ transform: opening ? A0 : A1 }, { transform: opening ? A1 : A0 }], { duration: opening ? 460 : 400, easing: opening ? 'cubic-bezier(.2,1.08,.35,1)' : 'cubic-bezier(.3,.9,.3,1)', fill: 'forwards' });
    if (!opening && polImg.src && polImg.src !== gi.src) { const o = document.createElement('img'); o.src = polImg.src; o.className = 'ok'; o.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0'; gi.parentNode.appendChild(o); o.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 60, fill: 'forwards' }); } // về tới thẻ thì ảnh khớp với ảnh bìa của thẻ
    const fin = () => { it.el.classList.remove('flying'); g.remove(); if (pol) pol.style.visibility = ''; done?.(); };
    an.onfinish = fin; setTimeout(() => { if (g.isConnected) fin(); }, 900);
  }
  function fillEvent(e) {
    EVP.querySelector('.evp-dt').textContent = e.approx ? approxLabel(e.approx, e.ts0) : e.days.length > 1 ? dateTxt(e) : fmtLong(e.ts0);
    if (!EVP.querySelector('.evp-ti').classList.contains('editing')) EVP.querySelector('.evp-ti .tt').textContent = e.title;
    const ag = A.family() ? '' : A.ageText(A.kid(), e.ts0, false);
    const T = typeOf(e.type); EVP.style.setProperty('--tc', T.c);
    EVP.querySelector('.evp-chips').innerHTML = [e.type !== 'daily' ? `<button class="hc ty" data-a="type" style="--tc:${T.c}">${T.ic} ${esc(T.t)}</button>` : '', e.mile ? `<span class="hc mile">${e.mile.emo || icon(e.mile.ic, 14, 2)}Cột mốc</span>` : '', e.approx ? `<span class="hc">${icon('clock', 14, 2)}ước chừng</span>` : '', ag ? `<span class="hc age">${esc(ag)}</span>` : '', `<span class="hc">${esc(countTxt(e))}</span>`].join('');
    EVP.querySelector('.evp-bt b').textContent = e.title; EVP.querySelector('.evp-bt small').textContent = A.dmy(e.ts0);
    const nt = EVP.querySelector('.evp-nt'); nt.textContent = e.note; nt.hidden = !e.note;
    EVP.classList.toggle('mile', !!e.mile);
    EVP.querySelector('[data-a=play]').hidden = e.ms.length < 2;
    const dia = EVP.querySelector('.evp-dia'); dia.innerHTML = '';
    for (const d of e.diaries) { A.dbGet('blobs', 'd_' + d.id).then(b => { const u = b ? URL.createObjectURL(b) : ''; dia.insertAdjacentHTML('beforeend', `<button class="dia" data-diary="${d.id}">${u ? `<img src="${u}" alt="">` : ''}<span>${icon('book', 15)} Nhật ký ngày này</span></button>`); }); }
    const ED = EVP.querySelector('.evp-days'); ED.innerHTML = e.days.length > 1 ? e.days.map((d, i) => `<button data-day="${d}">${i === 0 ? 'Ngày 1 · ' : ''}${A.dmy(A.parseYmd(d)).slice(0, 5)}</button>`).join('') : ''; ED.hidden = e.days.length < 2;
    if (EVP.classList.contains('open') && SP.open) buildStrip(e);
    if (!GRID.hidden) layoutGrid();
  }
  // lưới gọn: ô vuông nhỏ 3 cột (khi cần chọn nhiều, đổi bìa…)
  const cellHTML = (m, k) => `<button class="gi${m.type === 'video' ? ' v' : ''}" data-mid="${m.id}" style="--pc:${m.color || COL.get(m.id) || 'var(--pc0)'};--d:${Math.min(k % 6, 5) * 45}ms"><img data-mid="${m.id}" alt="" decoding="async">${m.type === 'video' ? `<span class="du">${icon('play', 10, 2.6)} ${fmtD(m.dur)}</span>` : ''}</button>`;
  function layoutGrid() { const e = st.cur; if (!e) return; GRID.innerHTML = e.ms.map(cellHTML).join(''); GRID.querySelectorAll('.gi').forEach(el => gridIO.observe(el)); }
  function showGrid(on, scroll) {
    GRID.hidden = !on; EVP.classList.toggle('gridon', on); EVP.querySelector('.evp-gbtn span').textContent = on ? 'Ẩn lưới' : 'Xem dạng lưới';
    if (on) { layoutGrid(); if (scroll) setTimeout(() => GRID.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' }), 60); } else GRID.innerHTML = '';
  }
  let gN = 0, gT = 0;
  const gridIO = new IntersectionObserver(es => {
    const now = performance.now(); if (now - gT > 140) gN = 0; gT = now;
    for (const en of es) {
      if (!en.isIntersecting) continue; const el = en.target; gridIO.unobserve(el);
      if (!el.classList.contains('in')) { el.style.setProperty('--d', (REDUCED ? 0 : Math.min(gN++, 8) * 40) + 'ms'); el.classList.add('in'); }
      const im = el.querySelector('img'), mid = el.dataset.mid;
      thumbURL(mid).then(u => { if (!u || !im.isConnected) return; im.src = u; (im.decode ? im.decode() : Promise.resolve()).catch(() => { }).then(() => { if (im.isConnected) im.classList.add('ok'); }); });
    }
  }, { root: SC, rootMargin: '500px 0px' });
  const stopGridVideos = () => { };
  // cuộn dọc: đầu trang mờ dần, tiêu đề thu vào thanh kính trên
  let evRaf = 0;
  function onEvScroll(force) {
    if (evRaf && !force) return;
    evRaf = requestAnimationFrame(() => {
      evRaf = 0; const y = SC.scrollTop, H = EVP.querySelector('.evp-head').offsetHeight || 1;
      const hx = EVP.querySelector('.evp-hx'); hx.style.opacity = clamp(1 - y / (H * .6), 0, 1).toFixed(3); hx.style.transform = y > 0 ? `translate3d(0,${(y * .3).toFixed(1)}px,0)` : '';
      const evb = +clamp((y - (H - 110)) / 60, 0, 1).toFixed(3); if (evb !== st.evb) { st.evb = evb; EVP.querySelector('.evp-bar').style.setProperty('--evb', evb); }
    });
  }
  SC.addEventListener('scroll', () => onEvScroll(), { passive: true });
  function closeEvent() {
    if (SEL.on && SEL.scope === 'ev') endSel(); st.coverPick = false; EVP.classList.remove('pick'); hint(''); stopEvShow();
    const e = st.cur; if (!e || !EVP.classList.contains('open')) return;
    const el = evEl(e.key), tgt = el?.querySelector('.pol.p0 img');
    const cx = SP.W / 2, vis = SP.cards.filter(c => c.on && cardX(c) > -c.w * .3 && cardX(c) + c.w * .7 < SP.W), coverId = e.stack[0]?.id, near = vis.find(c => c.m.id === coverId) || vis.sort((a, b) => Math.abs(cardX(a) + a.w / 2 - cx) - Math.abs(cardX(b) + b.w / 2 - cx))[0];
    stopStrip();
    if (near && tgt && !REDUCED && SC.scrollTop < 200) flyCard(near, tgt, false, () => { el.classList.remove('hl'); void el.offsetWidth; el.classList.add('hl'); });
    EVP.classList.add('closing'); EVP.classList.remove('open'); EVP.setAttribute('aria-hidden', 'true'); document.body.classList.remove('evopen');
    setTimeout(() => { if (!EVP.classList.contains('open')) { EVP.classList.remove('closing'); ROWS.innerHTML = ''; SP.cards = []; SC.style.transform = ''; GRID.innerHTML = ''; } }, 450);
    st.cur = null;
  }
  EVP.querySelector('.evp-back').onclick = closeEvent;
  { // kéo cả trang xuống từ đầu để đóng (không tính vùng dải ảnh)
    let d = null;
    SC.addEventListener('pointerdown', e => { if (SC.scrollTop > 0 || e.pointerType === 'mouse' && e.button !== 0 || e.target.closest('.gi, .evp-strip')) return; d = { y: e.clientY, x: e.clientX, on: false, v: 0, ly: e.clientY, lt: performance.now() }; });
    SC.addEventListener('pointermove', e => {
      if (!d) return; const dy = e.clientY - d.y; if (!d.on) { if (dy > 10 && Math.abs(dy) > Math.abs(e.clientX - d.x)) { d.on = true; try { SC.setPointerCapture(e.pointerId); } catch (er) { } } else if (Math.abs(dy) > 10) { d = null; return; } else return; }
      const now = performance.now(); d.v = (e.clientY - d.ly) / Math.max(1, now - d.lt); d.ly = e.clientY; d.lt = now;
      const y = Math.max(0, dy); SC.style.transform = `translate3d(0,${y}px,0) scale(${1 - y / 3000})`; EVP.querySelector('.evp-bg').style.opacity = 1 - y / 900;
    });
    const up = () => { if (!d) return; const on = d.on, v = d.v, m = /translate3d\(0px?,\s*([\d.]+)px/.exec(SC.style.transform), y = m ? +m[1] : 0; d = null; if (!on) return;
      if (y > 120 || v > .8) { closeEvent(); setTimeout(() => { SC.style.transform = ''; EVP.querySelector('.evp-bg').style.opacity = ''; }, 460); }
      else animateSpring(y, 0, { k: 300, c: 24, v: v * 1000 }, z => { SC.style.transform = z > .5 ? `translate3d(0,${z}px,0) scale(${1 - z / 3000})` : ''; EVP.querySelector('.evp-bg').style.opacity = 1 - z / 900; }); };
    SC.addEventListener('pointerup', up); SC.addEventListener('pointercancel', up);
  }
  const gridRect = mid => { if (GRID.hidden) return stripRect(mid); const im = EVP.querySelector(`.gi[data-mid="${mid}"]`); if (!im) return null; const r = im.getBoundingClientRect(); if (r.bottom < 60 || r.top > innerHeight - 40) { SC.scrollTop += r.top - innerHeight * .4; } return im; };
  function startCoverPick() { st.coverPick = true; EVP.classList.add('pick'); hint('Chạm vào một ảnh để đặt làm ảnh bìa'); showGrid(true, true); }
  EVP.addEventListener('click', async ev => {
    const e = st.cur; if (!e) return;
    const gi = ev.target.closest('.gi');
    if (gi) {
      const m = e.ms.find(x => x.id === gi.dataset.mid);
      if (SEL.on) { toggleSel(m.id); return; }
      if (st.coverPick) { st.coverPick = false; EVP.classList.remove('pick'); setCover(m); return; }
      openViewer(e.ms, e.ms.indexOf(m), gridRect); return;
    }
    const dia = ev.target.closest('[data-diary]'); if (dia) { A.openDiary(dia.dataset.diary); return; }
    const b = ev.target.closest('[data-a], [data-day]'); if (!b || !EVP.contains(b)) return; const a = b.dataset.a;
    if (a === 'play') playEvent(e);
    else if (a === 'type') typeMenu(e, b);
    else if (b.dataset.day) jumpDay(b.dataset.day);
    else if (a === 'grid') showGrid(GRID.hidden, true);
  });
  EVP.querySelector('.evp-more').onclick = e => st.cur && eventMenu(st.cur, null, e.currentTarget);
  // đặt tên sự kiện ngay tại chỗ: chạm vào tiêu đề
  { const TI = EVP.querySelector('.evp-ti'), TT = TI.querySelector('.tt'); let old = '';
    const start = () => { if (!st.cur || TI.classList.contains('editing')) return; old = TT.textContent; TI.classList.add('editing'); try { TT.contentEditable = 'plaintext-only'; } catch (e) { } if (TT.contentEditable !== 'plaintext-only') TT.contentEditable = 'true'; TT.focus(); const r = document.createRange(); r.selectNodeContents(TT); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); haptic(6); };
    const finish = async save => { if (!TI.classList.contains('editing')) return; TI.classList.remove('editing'); TT.contentEditable = 'false'; const t = TT.textContent.replace(/\s+/g, ' ').trim().slice(0, 60); const e = st.cur; if (!save || !e || t === old) { TT.textContent = old; return; } await setTitle(e.key, t); A.toast(t ? 'Đã đặt tên “' + t + '”' : 'Đã dùng lại tên tự động', 1600); };
    TI.addEventListener('click', start);
    TT.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); TT.blur(); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); TT.blur(); } });
    TT.addEventListener('blur', () => finish(true)); }
  // lưu tên một sự kiện (một ngày / gộp ngày); tên trống = dùng tên tự động
  async function setTitle(key, t) {
    const e = st.byKey.get(key); if (!e) return;
    if (e.group) { e.group.name = t || e.group.name; await A.saveGroups?.(); }
    else if (t && t !== (e.mile?.label || e.auto)) st.meta.titles[key] = t; else delete st.meta.titles[key];
    await saveMeta(); render(); if (st.cur && st.byKey.get(key)) { st.cur = st.byKey.get(key); fillEvent(st.cur); }
  }
  const hint = t => { const h = EVP.querySelector('.evp-hint'); h.textContent = t || ''; h.hidden = !t; };
  // ---------- NHÓM KỶ NIỆM: gom ảnh nhiều ngày thành một sự kiện có tên ----------
  // dữ liệu: A.groups() = [{ id, kidIds, name, note, cover, momentIds, created }] (meta 'groups')
  const GP = { g: null, sel: new Set(), ms: [], drag: null };
  const MG = $('#mGrp'), GDAYS = MG.querySelector('.gp-days');
  if (!MG.dataset.wired) { MG.dataset.wired = 1; MG.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => A.closeModal(MG))); MG.addEventListener('pointerdown', e => { if (e.target === MG) MG.dataset.down = 1; }); MG.addEventListener('click', e => { if (e.target === MG && MG.dataset.down) A.closeModal(MG); MG.dataset.down = ''; }); }
  const groupOfMid = mid => (A.groups?.() || []).find(g => g.momentIds.includes(mid));
  const spanTxt = ms => { if (!ms.length) return ''; const s = ms.map(m => m.ts).sort((a, b) => a - b), a = new Date(s[0]), b = new Date(s[s.length - 1]), days = new Set(ms.map(m => A.ymd(m.ts))).size;
    const rng2 = A.ymd(s[0]) === A.ymd(s[s.length - 1]) ? A.dmy(s[0]) : a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear() ? `${a.getDate()} – ${A.dmy(s[s.length - 1]).slice(0, 5)}` : `${A.dmy(s[0]).slice(0, 5)} – ${A.dmy(s[s.length - 1]).slice(0, 5)}`;
    return `${ms.length} ảnh · ${days} ngày · ${rng2}`; };
  function openGroupPicker({ group = null, preselect = [], name = '' } = {}) {
    GP.g = group; GP.ms = A.moments().slice().sort((a, b) => b.ts - a.ts);
    GP.sel = new Set(group ? group.momentIds : preselect.map(m => m.id || m));
    MG.querySelector('.gp-h').textContent = group ? `Sửa nhóm “${group.name}”` : 'Tạo nhóm kỷ niệm';
    $('#gpName').value = group?.name || name || ''; $('#gpNote').value = group?.note || '';
    $('#gpOk').textContent = group ? 'Lưu nhóm' : 'Tạo nhóm';
    const days = new Map(); for (const m of GP.ms) { const d = A.ymd(m.ts); if (!days.has(d)) days.set(d, []); days.get(d).push(m); }
    const kid = A.kid();
    GDAYS.innerHTML = [...days].map(([d, list]) => { const t = A.parseYmd(d), ag = A.family() ? '' : A.ageText(kid, t, false);
      return `<section class="gp-day" data-d="${d}"><header><label class="gp-all"><input type="checkbox" data-day="${d}"><span><b>${esc(fmtLong(t))}</b><small>${list.length} ảnh${ag ? ' · ' + esc(ag) : ''}</small></span></label><span class="gp-cnt"></span></header>
        <div class="gp-g">${list.slice().sort((a, b) => a.ts - b.ts).map(m => { const og = groupOfMid(m.id); return `<button class="gp-i${m.type === 'video' ? ' v' : ''}" data-mid="${m.id}" style="--pc:${m.color || 'var(--pc0)'}"><img alt="" data-mid="${m.id}">${og && og !== group ? `<i class="gp-og" title="Đang ở nhóm ${esc(og.name)}">${icon('grid', 11, 2)}</i>` : ''}<i class="gp-ck"></i></button>`; }).join('')}</div></section>`; }).join('') || '<p class="hint">Chưa có ảnh nào — bạn thêm ảnh trước nhé.</p>';
    GDAYS.querySelectorAll('.gp-i').forEach(el => gpIO.observe(el));
    const all = [...days.keys()]; $('#gpFrom').value = all[all.length - 1] || ''; $('#gpTo').value = all[0] || '';
    paintSel(); A.openModal(MG);
    const first = GDAYS.querySelector('.gp-i.on'); if (first) setTimeout(() => first.closest('.gp-day').scrollIntoView({ block: 'center' }), 380);
    if (!group && !name) setTimeout(() => $('#gpName').focus(), 380);
  }
  const gpIO = new IntersectionObserver(es => { for (const en of es) if (en.isIntersecting) { gpIO.unobserve(en.target); const im = en.target.querySelector('img'); thumbURL(im.dataset.mid).then(u => { if (u) { im.src = u; im.onload = () => im.classList.add('ok'); } }); } }, { root: MG.querySelector('.card'), rootMargin: '300px 0px' });
  function paintSel() {
    GDAYS.querySelectorAll('.gp-i').forEach(el => el.classList.toggle('on', GP.sel.has(el.dataset.mid)));
    GDAYS.querySelectorAll('.gp-day').forEach(sec => { const its = [...sec.querySelectorAll('.gp-i')], n = its.filter(x => x.classList.contains('on')).length, cb = sec.querySelector('input'); cb.checked = n === its.length && n > 0; cb.indeterminate = n > 0 && n < its.length; sec.querySelector('.gp-cnt').textContent = n ? `đã chọn ${n}` : ''; sec.classList.toggle('has', n > 0); });
    const ms = GP.ms.filter(m => GP.sel.has(m.id)); MG.querySelector('.gp-n').textContent = ms.length ? 'Đã chọn ' + spanTxt(ms) : 'Chưa chọn ảnh nào';
    $('#gpOk').disabled = !ms.length || !$('#gpName').value.trim();
  }
  $('#gpName').addEventListener('input', paintSel);
  MG.querySelector('.gp-sug').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (!b) return; const inp = $('#gpName'); inp.value = b.dataset.s; inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); paintSel(); });
  GDAYS.addEventListener('change', e => { const d = e.target.dataset.day; if (!d) return; const on = e.target.checked; GDAYS.querySelectorAll(`.gp-day[data-d="${d}"] .gp-i`).forEach(el => on ? GP.sel.add(el.dataset.mid) : GP.sel.delete(el.dataset.mid)); haptic(5); paintSel(); });
  $('#gpRange').onclick = () => { const a = $('#gpFrom').value, b = $('#gpTo').value; if (!a || !b) return; const [lo, hi] = a <= b ? [a, b] : [b, a]; let n = 0; for (const m of GP.ms) { const d = A.ymd(m.ts); if (d >= lo && d <= hi) { GP.sel.add(m.id); n++; } } haptic(8); paintSel(); A.toast(n ? `Đã chọn ${n} ảnh từ ${A.dmy(A.parseYmd(lo)).slice(0, 5)} đến ${A.dmy(A.parseYmd(hi))}` : 'Không có ảnh trong khoảng này', 1800); };
  { // chạm = chọn/bỏ 1 ảnh; giữ rồi vuốt = chọn (hoặc bỏ) cả dải
    let d = null, t = 0;
    const at = (x, y) => document.elementFromPoint(x, y)?.closest('.gp-i');
    const apply = el => { if (!el || !d) return; const on = d.on; if (on !== GP.sel.has(el.dataset.mid)) { on ? GP.sel.add(el.dataset.mid) : GP.sel.delete(el.dataset.mid); el.classList.toggle('on', on); haptic(3); } };
    GDAYS.addEventListener('pointerdown', e => { const el = e.target.closest('.gp-i'); if (!el) return; d = { el, x: e.clientX, y: e.clientY, drag: false, on: !GP.sel.has(el.dataset.mid) }; clearTimeout(t); t = setTimeout(() => { if (!d) return; d.drag = true; apply(d.el); haptic(10); }, 320); });
    const mv = (x, y) => { if (!d) return; if (!d.drag) { if (Math.hypot(x - d.x, y - d.y) > 9) { clearTimeout(t); d = null; } return; } apply(at(x, y)); };
    GDAYS.addEventListener('pointermove', e => mv(e.clientX, e.clientY));
    GDAYS.addEventListener('touchmove', e => { if (d?.drag) { e.preventDefault(); const p = e.touches[0]; mv(p.clientX, p.clientY); } }, { passive: false });
    const up = e => { clearTimeout(t); if (!d) return; const D = d; d = null; if (!D.drag && e.type !== 'pointercancel') { D.on = !GP.sel.has(D.el.dataset.mid); d = D; apply(D.el); d = null; } paintSel(); };
    GDAYS.addEventListener('pointerup', up); GDAYS.addEventListener('pointercancel', e => { if (d?.drag && e.pointerType === 'touch') return; up(e); });
    GDAYS.addEventListener('touchend', () => { if (d?.drag) { d = null; paintSel(); } });
    GDAYS.addEventListener('contextmenu', e => e.preventDefault());
  }
  $('#gpOk').onclick = async () => {
    const name = $('#gpName').value.trim(), note = $('#gpNote').value.trim(), ids = GP.ms.filter(m => GP.sel.has(m.id)).sort((a, b) => a.ts - b.ts).map(m => m.id);
    if (!name || !ids.length) return;
    const G = A.groups(); let g = GP.g;
    for (const o of G) if (o !== g) o.momentIds = o.momentIds.filter(id => !GP.sel.has(id)); // một ảnh chỉ thuộc một nhóm
    if (!g) { g = { id: 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), kidIds: [], name, note, cover: null, momentIds: [], created: Date.now() }; G.push(g); }
    g.name = name; g.note = note; g.momentIds = ids; g.kidIds = [...new Set(GP.ms.filter(m => GP.sel.has(m.id)).flatMap(m => A.kidsOf(m)))]; if (g.cover && !ids.includes(g.cover)) g.cover = null;
    A.setGroups(G.filter(o => o.momentIds.length)); await A.saveGroups(); A.closeModal(MG);
    closeEvent(); render(); const key = 'g:' + g.id; setTimeout(() => scrollToKey(key), 420);
    A.toast(`${GP.g ? 'Đã lưu' : 'Đã tạo'} nhóm “${name}” · ${spanTxt(A.moments().filter(m => ids.includes(m.id)))}`, 2800); haptic(14);
  };
  async function dissolveGroup(g) {
    const G = A.groups(), i = G.indexOf(g); if (i < 0) return; G.splice(i, 1); A.setGroups(G); await A.saveGroups(); closeEvent(); render();
    undoToast(`Đã rã nhóm “${esc(g.name)}” — ảnh về lại từng ngày`, async () => { A.groups().splice(Math.min(i, A.groups().length), 0, g); await A.saveGroups(); render(); setTimeout(() => scrollToKey('g:' + g.id), 300); });
  }
  async function deleteGroupAll(e) {
    if (!(await A.ask(`Xoá nhóm “${e.group.name}” và ${e.ms.length} ảnh/video?`, 'Ảnh, video vào thùng rác 30 ngày (khôi phục được). Muốn giữ ảnh thì chọn “Rã nhóm” thay vì xoá.', 'Xoá cả nhóm', true))) return;
    const list = e.ms.slice(); closeEvent(); await A.trashMoments(list, `Đã xoá nhóm “${esc(e.group.name)}” (${list.length} ảnh vào thùng rác)`);
  }
  async function removeFromGroup(m) {
    const g = groupOfMid(m.id); if (!g) return; g.momentIds = g.momentIds.filter(id => id !== m.id); if (g.cover === m.id) g.cover = null;
    const empty = !g.momentIds.length; if (empty) A.setGroups(A.groups().filter(o => o !== g)); await A.saveGroups();
    if (PV.classList.contains('open')) closeViewer(); refreshAll(empty ? null : 'g:' + g.id); A.toast(empty ? 'Nhóm đã hết ảnh nên được rã' : 'Đã bỏ ảnh khỏi nhóm — ảnh về lại ngày của nó', 2200);
  }
  // gợi ý gộp nhóm khi vừa thêm ảnh trải ≥ 2 ngày liền nhau
  function suggestGroup(ids) {
    const ms = A.moments().filter(m => ids.includes(m.id) && !groupOfMid(m.id)); if (ms.length < 2) return false;
    const days = [...new Set(ms.map(m => A.ymd(m.ts)))].sort(); if (days.length < 2) return false;
    let run = 1, best = 1; for (let i = 1; i < days.length; i++) { run = (A.parseYmd(days[i]) - A.parseYmd(days[i - 1])) / 864e5 <= 1.01 ? run + 1 : 1; best = Math.max(best, run); }
    if (best < 2) return false;
    undoToast(`Ảnh trải ${spanTxt(ms).replace(/^\d+ ảnh · /, '')} · Gộp thành nhóm?`, () => openGroupPicker({ preselect: ms }), 8000, { label: 'Gộp nhóm', icon: 'grid' });
    return true;
  }
  // ---------- menu & thao tác sự kiện ----------
  function eventMenu(e, el, at) {
    const i = st.events.indexOf(e), older = st.events[i + 1], newer = st.events[i - 1];
    const ensure = async () => { if (!EVP.classList.contains('open') || st.cur?.key !== e.key) await openEvent(e.key, evEl(e.key)?.querySelector('.cd')); };
    if (e.group) { contextMenu({ el, at, title: esc(e.title) + ' · ' + esc(spanTxt(e.ms)), items: [
      el && { icon: 'image', label: 'Mở nhóm', act: () => openEvent(e.key, el) },
      e.ms.length > 1 && { icon: 'play', label: 'Chiếu nhóm này', act: () => playEvent(e) },
      A.story && { icon: 'sparkle', label: 'Kể chuyện chuyến đi (bay qua dải ngân hà)', act: () => A.story({ ids: e.ms.map(m => m.id), title: e.title, sub: spanTxt(e.ms), people: e.kids.map(kidById).filter(Boolean) }) },
      { icon: 'book', label: e.diaries.length ? 'Xem nhật ký' : 'Tạo nhật ký từ nhóm (mỗi ngày một chương)', act: () => e.diaries.length ? A.openDiary(e.diaries[0].id) : A.makeDiary(e.ms.filter(m => m.type !== 'video').length ? e.ms.filter(m => m.type !== 'video') : e.ms) },
      { sep: 1 },
      { icon: 'edit', label: 'Sửa nhóm: tên, ghi chú, chọn ngày / ảnh', act: () => openGroupPicker({ group: e.group }) },
      { icon: 'star', label: 'Đổi ảnh bìa', act: async () => { await ensure(); startCoverPick(); } },
      { icon: 'tag', label: `Loại kỷ niệm: ${typeOf(e.type).ic} ${typeOf(e.type).t}`, act: () => typeMenu(e, el) },
      { icon: 'plus', label: 'Thêm ảnh từ máy vào nhóm', act: () => { st.cur = st.cur || e; st.addTo = e; $('#evFiles').click(); } },
      { icon: 'grid', label: GRID.hidden ? 'Xem dạng lưới' : 'Ẩn lưới', act: async () => { await ensure(); showGrid(GRID.hidden, true); } },
      { icon: 'check', label: 'Chọn nhiều ảnh', act: async () => { await ensure(); showGrid(true, true); startSel('ev'); } },
      { sep: 1 },
      A.driveFolderOf?.(e) && { icon: 'image', label: 'Mở thư mục nhóm trên Drive', act: () => window.open('https://drive.google.com/drive/folders/' + A.driveFolderOf(e), '_blank') },
      { icon: 'split', label: 'Rã nhóm (giữ ảnh)', act: () => dissolveGroup(e.group) },
      { icon: 'trash', label: 'Xoá nhóm và ảnh…', danger: true, act: () => deleteGroupAll(e) }] }); return; }
    contextMenu({ el, at, title: esc(e.title), items: [
      el && { icon: 'image', label: 'Mở sự kiện', act: () => openEvent(e.key, el) },
      e.ms.length > 1 && { icon: 'play', label: 'Chiếu sự kiện này', act: () => playEvent(e) },
      { icon: 'book', label: e.diaries.length ? 'Xem nhật ký' : 'Tạo nhật ký từ sự kiện', act: () => e.diaries.length ? A.openDiary(e.diaries[0].id) : A.makeDiary(e.ms.filter(m => m.type !== 'video').length ? e.ms.filter(m => m.type !== 'video') : e.ms) },
      { sep: 1 },
      { icon: 'edit', label: 'Đổi tên, ghi chú', act: () => { st.cur = st.cur || e; renameEvent(e); } },
      { icon: 'plus', label: 'Thêm ảnh vào sự kiện', act: () => { st.cur = st.cur || e; st.addTo = e; $('#evFiles').click(); } },
      { icon: 'check', label: 'Chọn nhiều ảnh', act: async () => { await ensure(); showGrid(true, true); startSel('ev'); } },
      { icon: 'grid', label: GRID.hidden ? 'Xem dạng lưới' : 'Ẩn lưới', act: async () => { await ensure(); showGrid(GRID.hidden, true); } },
      { sep: 1 },
      { icon: 'star', label: 'Đổi ảnh bìa', act: async () => { await ensure(); startCoverPick(); } },
      { icon: 'calendar', label: 'Đổi ngày cả sự kiện', act: () => changeEventDate(e) },
      { icon: 'clock', label: e.approx ? `Ngày ước chừng: ${approxLabel(e.approx, e.ts0, true)}` : 'Không nhớ rõ ngày? Đặt ngày ước chừng', act: () => approxMoments(e.ms, e) },
      { icon: 'tag', label: `Loại kỷ niệm: ${typeOf(e.type).ic} ${typeOf(e.type).t}`, act: () => typeMenu(e, el) },
      { icon: 'flag', label: e.lifeMile ? `Cột mốc: ${mileOf(e.lifeMile)?.ic || ''} ${mileOf(e.lifeMile)?.t || ''}` : 'Đánh dấu cột mốc đời người…', act: () => mileMenu(e, el) },
      { icon: 'grid', label: 'Gộp với ngày khác thành nhóm…', act: () => openGroupPicker({ preselect: e.ms }) },
      older && { icon: 'merge', label: `Gộp với ngày trước (${A.dmy(older.ts0).slice(0, 5)})`, act: () => mergeWith(e, older) },
      newer && { icon: 'merge', label: `Gộp với ngày sau (${A.dmy(newer.ts0).slice(0, 5)})`, act: () => mergeWith(e, newer) },
      e.merged && { icon: 'split', label: 'Tách lại thành từng ngày', act: async () => { st.meta.merges = st.meta.merges.filter(g => !g.includes(e.key)); await saveMeta(); render(); } },
      A.driveFolderOf?.(e) && { icon: 'image', label: 'Mở thư mục sự kiện trên Drive', act: () => window.open('https://drive.google.com/drive/folders/' + A.driveFolderOf(e), '_blank') },
      { icon: 'trash', label: 'Xoá sự kiện…', danger: true, act: () => deleteEvent(e) }
    ] });
  }
  // loại kỷ niệm (chuyến đi, Lễ Tết…): tự đoán, đổi được; nhóm lưu trong nhóm, ngày lẻ lưu trong meta sự kiện
  function typeMenu(e, el) {
    contextMenu({ el: null, at: el || EVP.querySelector('.evp-more'), title: `Loại kỷ niệm · ${esc(e.title)}`, items: [
      ...TYPES.map(t => ({ label: `${t.ic} ${t.t}`, note: e.type === t.k ? (e.typeSet ? 'đang chọn' : 'app tự đoán') : '', on: e.type === t.k, act: () => setType(e, t.k) })),
      e.typeSet && { sep: 1 }, e.typeSet && { icon: 'sparkle', label: 'Để app tự đoán', act: () => setType(e, null) }] });
  }
  async function setType(e, k) {
    if (e.group) { if (k) e.group.type = k; else delete e.group.type; await A.saveGroups(); }
    else { st.meta.types ||= {}; if (k) st.meta.types[e.key] = k; else delete st.meta.types[e.key]; await saveMeta(); }
    refreshAll(e.key); haptic(8); A.toast(k ? `Đã đặt loại: ${typeOf(k).ic} ${typeOf(k).t}` : 'App sẽ tự đoán loại kỷ niệm', 1600);
  }
  // cột mốc đời người: tốt nghiệp, việc làm đầu tiên, mua nhà, cưới, nghỉ hưu…
  function mileMenu(e, el) {
    contextMenu({ at: el || EVP.querySelector('.evp-more'), title: `Cột mốc · ${esc(e.title)}`, items: [
      ...MILES.map(x => ({ label: `${x.ic} ${x.t}`, on: e.lifeMile === x.k, act: async () => { st.meta.miles ||= {}; st.meta.miles[e.key] = x.k; if (x.k === 'khac' && !st.meta.titles[e.key]) { const t = await A.prompt('Tên cột mốc', '', 60); if (t?.trim()) st.meta.titles[e.key] = t.trim(); } await saveMeta(); refreshAll(e.key); haptic(12); A.confetti?.('#ffd27f'); A.toast(`Đã đánh dấu cột mốc: ${x.ic} ${x.t}`, 1800); } })),
      e.lifeMile && { sep: 1 }, e.lifeMile && { icon: 'close', label: 'Bỏ đánh dấu cột mốc', act: async () => { delete st.meta.miles[e.key]; await saveMeta(); refreshAll(e.key); } }] });
  }
  // ngày ước chừng cho ảnh giấy cũ: chọn năm / mùa / tháng, app đặt ảnh vào giữa khoảng đó để xếp đúng chỗ
  async function approxMoments(ms, e) {
    const r = await A.pickApprox({ title: ms.length > 1 ? `Ngày ước chừng cho ${ms.length} ảnh` : 'Ngày ước chừng', ts: ms[0].ts, approx: e?.approx || ms[0].approx }); if (!r) return;
    const keep = e && !e.group ? { t: st.meta.titles[e.key], n: st.meta.notes[e.key], ty: st.meta.types?.[e.key], mi: st.meta.miles?.[e.key] } : null;
    ms.forEach((m, i) => { if (r.prec === 'd') { m.ts = A.parseYmd(r.day, m.ts); delete m.approx; } else { m.ts = r.ts + i * 1000; m.approx = r.prec; } m.dateSrc = 'user'; });
    await A.updateMany(ms); closeEvent(); render(); const nk = keyOfMid(ms[0].id);
    if (keep && nk && nk !== e.key) { if (keep.t) st.meta.titles[nk] = keep.t; if (keep.n) st.meta.notes[nk] = keep.n; if (keep.ty) st.meta.types[nk] = keep.ty; if (keep.mi) st.meta.miles[nk] = keep.mi; await saveMeta(); render(); }
    if (nk) setTimeout(() => scrollToKey(nk), 450); A.toast(r.prec === 'd' ? `Đã chuyển sang ${A.dmy(A.parseYmd(r.day))}` : `Đã xếp vào ${approxLabel(r.prec, r.ts, true)}`, 2200);
  }
  // menu chương đời
  function chapterMenu(key, at) {
    const c = A.chapters().find(x => x.key === key); if (!c) return; const cfg = JSON.parse(JSON.stringify(A.chCfg() || {})); cfg.edits ||= {}; cfg.custom ||= [];
    const cu = c.custom ? cfg.custom.find(x => 'c:' + x.id === key) : null, ed = cu || (cfg.edits[key] ||= {});
    const save = async msg => { await A.saveChapters(cfg); render(); A.toast(msg, 1600); };
    contextMenu({ at, title: `${c.ic} Chương ${c.num} · ${esc(c.title)}`, items: [
      { icon: 'edit', label: 'Đổi tên chương', act: async () => { const t = await A.prompt('Tên chương', c.title, 40); if (t?.trim()) { ed.title = t.trim(); await save('Đã đổi tên chương'); } } },
      { icon: 'calendar', label: `Đổi ngày bắt đầu (${A.dmy(c.ts)})`, act: async () => { const v = await A.prompt('Chương bắt đầu từ ngày', c.start, 10, 'date'); if (v && A.parseYmd(v)) { ed.start = v; await save('Đã đổi ngày bắt đầu chương'); } } },
      { icon: 'palette', label: 'Đổi màu chương', act: () => contextMenu({ at, title: 'Màu chương', items: CH_COLORS.map(col => ({ label: `<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:${col};vertical-align:-4px;margin-right:8px"></span>${col === c.c ? 'Đang dùng' : 'Chọn màu này'}`, on: col === c.c, act: async () => { ed.c = col; await save('Đã đổi màu chương'); } })) }) },
      { icon: 'play', label: 'Kể chuyện chương này', act: () => A.story?.({ chapter: c }) },
      { icon: 'book', label: 'Tạo truyện tranh chương này', act: () => { const ms = st.events.filter(e => e.chapter?.key === c.key).flatMap(e => e.ms).filter(m => m.type !== 'video').sort((a, b) => a.ts - b.ts); if (!ms.length) { A.toast('Chương này chưa có ảnh', 1800); return; } A.makeDiary(ms); } },
      { icon: 'plus', label: 'Thêm ảnh cũ của chương này', act: () => A.addOld(new Date(c.ts).getFullYear()) },
      { sep: 1 },
      { icon: 'sparkle', label: 'Thêm chương mới…', act: async () => { const t = await A.prompt('Tên chương mới (vd “Du học”, “Những năm ở Sài Gòn”)', '', 40); if (!t?.trim()) return; const v = await A.prompt('Chương bắt đầu từ ngày', A.ymd(Date.now()), 10, 'date'); if (!v || !A.parseYmd(v)) return; cfg.custom.push({ id: Date.now().toString(36), title: t.trim(), start: v, c: CH_COLORS[(cfg.custom.length + 8) % CH_COLORS.length], ic: '✨' }); await save('Đã thêm chương “' + t.trim() + '”'); } },
      !c.custom && (c.edited || !c.auto) && { icon: 'back', label: 'Về như app gợi ý', act: async () => { delete cfg.edits[key]; await save('Đã khôi phục chương như gợi ý'); } },
      { icon: 'close', label: c.custom ? 'Xoá chương này' : 'Ẩn chương này', danger: true, act: async () => { if (cu) cfg.custom = cfg.custom.filter(x => x !== cu); else ed.hidden = true; await save(c.custom ? 'Đã xoá chương' : 'Đã ẩn chương — ảnh vẫn còn, nằm ở chương trước'); } }] });
  }
  function renameEvent(e) { $('#evnTi').value = e.title; $('#evnNt').value = e.note; $('#mEvName .evn-sub').textContent = `${dateTxt(e)} · ${countTxt(e)}`; st.cur = e; A.openModal($('#mEvName')); setTimeout(() => $('#evnTi').focus(), 350); }
  async function mergeWith(e, o) { const ks = [...new Set([...(e.merged || [e.key]), ...(o.merged || [o.key])])]; st.meta.merges = st.meta.merges.filter(g => !g.some(k => ks.includes(k))); st.meta.merges.push(ks); await saveMeta(); const mid = e.ms[0].id; closeEvent(); render(); const k = keyOfMid(mid); if (k) setTimeout(() => scrollToKey(k), 450); A.toast('Đã gộp thành một sự kiện', 1600); }
  async function setCover(m) { const e = st.cur || st.events.find(x => x.ms.includes(m)); if (!e) return; if (e.group) { e.group.cover = m.id; await A.saveGroups(); } else st.meta.covers[e.key] = m.id; await saveMeta(); haptic(10); A.toast('Đã đặt làm ảnh bìa sự kiện', 1500); const k = e.key; render(); if (EVP.classList.contains('open') && st.byKey.get(k)) { st.cur = st.byKey.get(k); fillEvent(st.cur); EVP.style.setProperty('--hc', m.color || COL.get(m.id) || kidCol()); paintBg(m); } hint(''); }
  async function changeEventDate(e) {
    const v = await A.prompt(`Đổi ngày “${e.title}”`, e.day, 10, 'date'); if (!v || !A.parseYmd(v) || v === e.day) return;
    const delta = Math.round((A.parseYmd(v) - A.parseYmd(e.day)) / 864e5);
    for (const m of e.ms) { const d = new Date(m.ts); d.setDate(d.getDate() + delta); m.ts = d.getTime(); m.dateSrc = 'user'; }
    const t = st.meta.titles[e.key], n = st.meta.notes[e.key], c = st.meta.covers[e.key]; const nk = v; if (t) st.meta.titles[nk] = t; if (n) st.meta.notes[nk] = n; if (c) st.meta.covers[nk] = c; await saveMeta();
    await A.updateMany(e.ms); closeEvent(); render(); const k = keyOfMid(e.ms[0].id); if (k) setTimeout(() => scrollToKey(k), 450); A.toast(`Đã chuyển sang ${fmtLong(A.parseYmd(v))}`, 2200);
  }
  function deleteEvent(e, at) {
    contextMenu({ at: at || EVP.querySelector('.evp-more'), title: `Xoá “${esc(e.title)}”?`, items: [
      { icon: 'trash', label: `Xoá luôn ${countTxt(e)}`, danger: true, act: async () => { const list = e.ms.slice(); closeEvent(); await A.trashMoments(list, `Đã xoá “${esc(e.title)}” (${list.length} ảnh vào thùng rác)`); } },
      { icon: 'split', label: 'Chỉ bỏ nhóm (giữ ảnh)', act: async () => { const M = st.meta; delete M.titles[e.key]; delete M.notes[e.key]; delete M.covers[e.key]; M.merges = M.merges.filter(g => !g.includes(e.key)); for (const d of e.days) delete M.splits[d]; await saveMeta(); closeEvent(); render(); A.toast('Đã bỏ nhóm — ảnh vẫn còn, xếp lại theo từng ngày', 2200); } },
      { icon: 'close', label: 'Thôi', act: () => { } }
    ] });
  }
  function photoMenu(m, el, at, inViewer) {
    const e = st.cur || st.events.find(x => x.ms.includes(m));
    contextMenu({ el, at, title: esc(m.title || `${timeVN(m.ts)} · ${A.dmy(m.ts)}`), items: [
      !inViewer && { icon: 'image', label: 'Xem lớn', act: () => openViewer(e.ms, e.ms.indexOf(m), gridRect) },
      { icon: 'edit', label: 'Sửa tên, ngày, giờ, ghi chú', act: () => openEditM(m) },
      kidsAll().length > 1 && { icon: 'baby', label: 'Ai có trong ảnh này?', act: async () => { const ids = await A.pickKids([m]); if (ids) { await A.setKidsMany([m], ids); if (inViewer) fillInfo(); refreshAll(st.cur?.key); A.toast('Đã cập nhật người trong ảnh', 1200); } } },
      { icon: 'download', label: 'Lưu về máy', act: () => A.saveOriginal(m) },
      { sep: 1 },
      { icon: 'star', label: 'Đặt làm ảnh bìa sự kiện', act: () => setCover(m) },
      A.life?.() && e?.chapter && { icon: 'star', label: `Làm ảnh bìa chương “${esc(e.chapter.title)}”`, act: async () => { const cfg = JSON.parse(JSON.stringify(A.chCfg() || {})); cfg.edits ||= {}; cfg.custom ||= []; const cu = cfg.custom.find(x => 'c:' + x.id === e.chapter.key); if (cu) cu.cover = m.id; else (cfg.edits[e.chapter.key] ||= {}).cover = m.id; await A.saveChapters(cfg); render(); A.toast('Đã đặt làm ảnh bìa chương', 1500); } },
      { icon: 'clock', label: m.approx ? `Ngày ước chừng: ${approxLabel(m.approx, m.ts, true)}` : 'Ảnh cũ? Đặt ngày ước chừng', act: () => approxMoments([m], null) },
      { icon: 'image', label: 'Đặt làm hình nền', act: () => A.setBgFromMoment(m) },
      { icon: 'smile', label: 'Đặt làm avatar bé', act: () => A.avatarFromMoment(m) },
      inViewer && st.cur && !st.cur.merged && V.i > 0 && { icon: 'split', label: 'Tách sự kiện từ ảnh này', act: () => splitHere(m) },
      groupOfMid(m.id) && { icon: 'split', label: 'Bỏ khỏi nhóm', act: () => removeFromGroup(m) },
      !inViewer && { icon: 'check', label: 'Chọn nhiều', act: () => { startSel('ev'); toggleSel(m.id); } },
      { icon: 'trash', label: 'Xoá', danger: true, act: async () => { if (inViewer) { viewerDelete(m); return; } await A.trashMoments([m], 'Đã chuyển vào thùng rác'); refreshAll(st.cur?.key); } }
    ] });
  }
  // ---------- chế độ chọn nhiều (trang sự kiện: ảnh; dòng thời gian: cả sự kiện) ----------
  const SEL = { on: false, scope: 'ev', ids: new Set() }, BULK = $('#bulk');
  function startSel(scope) {
    if (scope === 'ev' && GRID.hidden) showGrid(true, true);
    SEL.on = true; SEL.scope = scope; SEL.ids.clear(); BULK.classList.add('on'); BULK.setAttribute('aria-hidden', 'false'); document.body.classList.add('selmode');
    (scope === 'ev' ? EVP : TL).classList.add('selm'); BULK.querySelector('[data-b=move]').hidden = scope !== 'ev'; updSel(); haptic(8);
  }
  function endSel() { SEL.on = false; SEL.ids.clear(); BULK.classList.remove('on'); BULK.setAttribute('aria-hidden', 'true'); document.body.classList.remove('selmode'); EVP.classList.remove('selm'); TL.classList.remove('selm'); document.querySelectorAll('.gi.sel, .ev.sel').forEach(x => x.classList.remove('sel')); }
  function toggleSel(id, force) {
    const on = force ?? !SEL.ids.has(id); if (on) SEL.ids.add(id); else SEL.ids.delete(id);
    const el = SEL.scope === 'ev' ? EVP.querySelector(`.gi[data-mid="${id}"]`) : evEl(id); el?.classList.toggle('sel', on); if (on) haptic(4); updSel();
  }
  const selMoments = () => SEL.scope === 'ev' ? (st.cur?.ms || []).filter(m => SEL.ids.has(m.id)) : [...SEL.ids].flatMap(k => st.byKey.get(k)?.ms || []);
  function updSel() { const n = SEL.ids.size, ms = selMoments(); BULK.querySelector('.bk-n').textContent = n ? (SEL.scope === 'ev' ? `Đã chọn ${n} ảnh/video` : `Đã chọn ${n} ngày · ${ms.length} ảnh`) : (SEL.scope === 'ev' ? 'Chạm để chọn ảnh' : 'Chạm để chọn ngày'); BULK.querySelectorAll('.bk-acts button').forEach(b => b.disabled = !n); BULK.querySelector('[data-b=group]').hidden = new Set(ms.map(m => A.ymd(m.ts))).size < 2; }
  BULK.addEventListener('click', async ev => {
    const b = ev.target.closest('[data-b]'); if (!b) return; const a = b.dataset.b;
    if (a === 'done') { endSel(); return; }
    if (a === 'all') { if (SEL.scope === 'ev') (st.cur?.ms || []).forEach(m => toggleSel(m.id, true)); else st.events.forEach(e => toggleSel(e.key, true)); return; }
    const ms = selMoments(); if (!ms.length) return;
    if (a === 'del') { if (!(await A.ask(`Xoá ${ms.length} ảnh/video?`, 'Chúng sẽ vào thùng rác 30 ngày, khôi phục được.', `Xoá ${ms.length} mục`, true))) return; const k = st.cur?.key; endSel(); await A.trashMoments(ms); refreshAll(k); }
    else if (a === 'date') { const v = await A.prompt(`Đổi ngày cho ${ms.length} ảnh`, A.ymd(ms[0].ts), 10, 'date'); if (!v || !A.parseYmd(v)) return; for (const m of ms) { m.ts = A.parseYmd(v, m.ts); m.dateSrc = 'user'; } endSel(); await A.updateMany(ms); closeEvent(); render(); const k = keyOfMid(ms[0].id); if (k) setTimeout(() => scrollToKey(k), 450); A.toast(`Đã chuyển ${ms.length} ảnh sang ${A.dmy(A.parseYmd(v))}`, 2200); }
    else if (a === 'apx') { endSel(); await approxMoments(ms.slice().sort((x, y) => x.ts - y.ts), null); }
    else if (a === 'move') {
      const cur = st.cur, opts = st.events.filter(e => e !== cur).slice(0, 40);
      contextMenu({ at: b, title: 'Chuyển sang sự kiện nào?', items: opts.map(e => ({ icon: e.mile ? 'star' : 'calendar', label: `${esc(e.title)} · ${A.dmy(e.ts0)}`, act: async () => { for (const m of ms) { m.ts = A.parseYmd(e.days[0], m.ts); m.dateSrc = 'user'; } endSel(); await A.updateMany(ms); closeEvent(); render(); setTimeout(() => scrollToKey(keyOfMid(ms[0].id)), 450); A.toast(`Đã chuyển ${ms.length} ảnh vào “${e.title}”`, 2200); } })) });
    }
    else if (a === 'kids') { const ids = await A.pickKids(ms); if (!ids) return; await A.setKidsMany(ms, ids); A.toast(`Đã cập nhật người trong ${ms.length} ảnh`, 1600); endSel(); refreshAll(st.cur?.key); }
    else if (a === 'group') { endSel(); openGroupPicker({ preselect: ms }); }
    else if (a === 'diary') { endSel(); A.makeDiary(ms.filter(m => m.type !== 'video').length ? ms.filter(m => m.type !== 'video') : ms); }
    else if (a === 'save') { A.shareMany(ms); }
  });
  // nhấn giữ ảnh: thả tay = menu, giữ rồi vuốt = chọn liền nhiều ảnh
  { const grid = EVP.querySelector('.evp-grid'); let t = 0, pd = null, drag = false;
    grid.addEventListener('pointerdown', e => { const gi = e.target.closest('.gi'); if (!gi) return; pd = { x: e.clientX, y: e.clientY, gi, fired: false }; clearTimeout(t); t = setTimeout(() => { if (!pd) return; pd.fired = true; haptic(12); gi.classList.add('press'); }, 430); });
    const mv = (x, y) => {
      if (!pd) return; const d = Math.hypot(x - pd.x, y - pd.y);
      if (!pd.fired) { if (d > 9) { clearTimeout(t); pd = null; } return; }
      if (!drag && d > 10) { drag = true; pd.gi.classList.remove('press'); if (!SEL.on) startSel('ev'); toggleSel(pd.gi.dataset.mid, true); }
      if (drag) { const el = document.elementFromPoint(x, y)?.closest('.gi'); if (el && !SEL.ids.has(el.dataset.mid)) toggleSel(el.dataset.mid, true); }
    };
    grid.addEventListener('pointermove', e => mv(e.clientX, e.clientY));
    // khi đã giữ đủ lâu: chặn cuộn và đọc vị trí ngón tay từ touchmove (trình duyệt có thể huỷ pointer khi bắt đầu cuộn)
    grid.addEventListener('touchmove', e => { if (drag || pd?.fired) { e.preventDefault(); const p = e.touches[0]; if (p) mv(p.clientX, p.clientY); } }, { passive: false });
    const up = () => { clearTimeout(t); if (pd?.fired) { pd.gi.classList.remove('press'); if (!drag && !SEL.on) { const m = st.cur?.ms.find(x => x.id === pd.gi.dataset.mid); if (m) photoMenu(m, pd.gi); } const sw = ev => { ev.stopPropagation(); ev.preventDefault(); }; grid.addEventListener('click', sw, { capture: true, once: true }); setTimeout(() => grid.removeEventListener('click', sw, { capture: true }), 600); } pd = null; drag = false; };
    grid.addEventListener('pointerup', up); grid.addEventListener('pointercancel', e => { if (e.pointerType === 'touch' && pd?.fired) return; up(); });
    grid.addEventListener('touchend', up); grid.addEventListener('touchcancel', up);
    grid.addEventListener('contextmenu', e => { if (e.target.closest('.gi')) e.preventDefault(); });
  }
  $('#evnOk').onclick = async () => { const e = st.cur; if (!e) return; if (!EVP.classList.contains('open')) st.cur = null; const t = $('#evnTi').value.trim(), n = $('#evnNt').value.trim(); if (e.group) { if (t) e.group.name = t; e.group.note = n; await A.saveGroups(); A.closeModal($('#mEvName')); refreshAll(e.key); A.toast('Đã lưu tên nhóm', 1600); return; } if (t && t !== (e.mile?.label || e.auto)) st.meta.titles[e.key] = t; else delete st.meta.titles[e.key]; if (n) st.meta.notes[e.key] = n; else delete st.meta.notes[e.key]; await saveMeta(); A.closeModal($('#mEvName')); refreshAll(e.key); A.toast('Đã lưu tên sự kiện', 1600); };
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
    const files = [...ev.target.files]; ev.target.value = ''; const e = st.addTo || st.cur; st.addTo = null; if (!files.length || !e) return;
    A.toast(`Đang thêm ${files.length} ảnh…`, 60000);
    const ids = await A.importFiles(files, null, e.group ? null : e.day);
    if (e.group && ids.length) { e.group.momentIds.push(...ids); await A.saveGroups(); }
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
  // không nút nào ngoài ✕ và ⋯; chạm 1 lần hiện/ẩn khung chữ + dải ảnh nhỏ (tự ẩn sau 2,5 giây)
  const V = { list: [], i: 0, W: 0, H: 0, x: 0, z: { s: 1, x: 0, y: 0 }, getRect: null, ui: false, stop: null, urls: [], vid: null };
  const track = PV.querySelector('.pv-track'), FI = PV.querySelector('.pv-fi'), FILM = PV.querySelector('.pv-film'), VC = PV.querySelector('.pv-vc');
  function fitRect(m) {
    const W = innerWidth, H = innerHeight, a = m.w && m.h ? m.w / m.h : 4 / 3;
    let w = W, h = w / a; if (h > H) { h = H; w = h * a; }
    return { left: (W - w) / 2, top: (H - h) / 2, width: w, height: h };
  }
  const slideHTML = m => `<div class="pv-s" data-mid="${m.id}"><div class="pv-m${m.type === 'video' ? ' v' : ''}"></div></div>`;
  async function fillSlide(sl, m, cur) {
    const box = sl.querySelector('.pv-m'), r = fitRect(m);
    box.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
    const tu = await thumbURL(m.id); if (sl.dataset.mid !== m.id) return;
    box.innerHTML = `<img src="${tu}" alt="">`;
    if (m.type === 'video') { if (cur) startVideo(sl, m, tu); }
    else if (!m.heic && cur) A.dbGet('blobs', 'o_' + m.id).then(b => { if (!b || sl.dataset.mid !== m.id) return; const u = URL.createObjectURL(b); V.urls.push(u); const im = new Image(); im.src = u; im.decode().then(() => { if (sl.dataset.mid === m.id && box.querySelector('img')) box.querySelector('img').src = u; }).catch(() => { }); });
    else if (cur) A.toast('Ảnh HEIC — mở bằng Safari để xem bản gốc rõ nét', 2600);
  }
  // video: tự phát khi vuốt tới, thanh điều khiển kính tự vẽ
  async function startVideo(sl, m, tu) {
    const b = await A.dbGet('blobs', 'o_' + m.id); if (!b || sl.dataset.mid !== m.id || V.list[V.i] !== m) return;
    const u = URL.createObjectURL(b); V.urls.push(u); const v = document.createElement('video');
    v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', ''); v.preload = 'auto'; v.poster = tu; v.src = u; // iOS: playsinline phải có trước src
    const box = sl.querySelector('.pv-m'); box.appendChild(v); V.vid = v;
    v.addEventListener('playing', () => { v.classList.add('ok'); A.duck?.(true); updVC(); });
    v.addEventListener('pause', () => { A.duck?.(false); updVC(); if (!V.ui) showUI(true); });
    v.addEventListener('ended', () => { A.duck?.(false); updVC(); });
    v.addEventListener('timeupdate', updVC); v.addEventListener('loadedmetadata', updVC);
    try { await v.play(); } catch (e) { v.muted = true; try { await v.play(); } catch (e2) { } }
    updVC();
  }
  function stopVideo() { const v = V.vid; if (v) { v.pause(); v.removeAttribute('src'); v.load?.(); } V.vid = null; A.duck?.(false); }
  function updVC() {
    const v = V.vid, m = V.list[V.i], isV = m?.type === 'video'; VC.hidden = !isV; PV.classList.toggle('isv', !!isV); if (!isV) return;
    const d = v?.duration || m.dur || 0, t = v?.currentTime || 0;
    VC.querySelector('[data-a=vplay]').innerHTML = icon(v && !v.paused ? 'pause' : 'play', 20, 2.2);
    VC.querySelector('[data-a=vmute]').innerHTML = icon(v?.muted ? 'mute' : 'sound', 20, 1.9);
    VC.querySelector('.pv-t0').textContent = fmtD(t); VC.querySelector('.pv-t1').textContent = fmtD(d);
    if (!V.seeking) VC.querySelector('.pv-seek').value = d ? Math.round(t / d * 1000) : 0;
    PV.querySelector('.pv-prog i').style.transform = `scaleX(${d ? (t / d).toFixed(4) : 0})`;
    PV.classList.toggle('vpause', !!v && v.paused);
  }
  { const sk = VC.querySelector('.pv-seek');
    sk.addEventListener('input', () => { V.seeking = true; const v = V.vid; if (v?.duration) { v.currentTime = sk.value / 1000 * v.duration; VC.querySelector('.pv-t0').textContent = fmtD(v.currentTime); } showUI(true); });
    sk.addEventListener('change', () => { V.seeking = false; });
    ['pointerdown', 'touchstart'].forEach(t => VC.addEventListener(t, e => e.stopPropagation(), { passive: true })); }
  function layoutSlides() {
    V.W = innerWidth; V.H = innerHeight; stopVideo();
    const idx = [V.i - 1, V.i, V.i + 1];
    track.innerHTML = idx.map(i => V.list[i] ? slideHTML(V.list[i]) : '<div class="pv-s empty"></div>').join('');
    [...track.children].forEach((sl, k) => { sl.style.transform = `translate3d(${(k - 1) * (V.W + 24)}px,0,0)`; const m = V.list[idx[k]]; if (m) fillSlide(sl, m, k === 1); });
    setX(0); V.z = { s: 1, x: 0, y: 0 }; applyZoom();
    fillInfo(); setBg(); filmSync(); updVC();
  }
  // nền: màu chủ đạo của ảnh + ảnh nhoè rất mờ phía sau
  let bgT = 0;
  function setBg() {
    const m = V.list[V.i]; if (!m) return; const c = m.color || COL.get(m.id) || '#141022';
    PV.style.setProperty('--pvc', c); const bi = PV.querySelector('.pv-bgi');
    bi.classList.remove('ok'); clearTimeout(bgT); bgT = setTimeout(() => thumbURL(m.id).then(u => { if (V.list[V.i] !== m) return; bi.src = u; bi.decode?.().then(() => bi.classList.add('ok')).catch(() => { }); }), 180);
  }
  function fillInfo() {
    const m = V.list[V.i]; if (!m) return; PV.querySelector('.pv-count').textContent = `${V.i + 1} / ${V.list.length}`;
    PV.querySelector('.pv-ti').textContent = m.title || (m.approx ? 'Ảnh cũ' : timeVN(m.ts));
    PV.querySelector('.pv-dt').textContent = m.approx ? approxLabel(m.approx, m.ts) : m.title ? `${fmtLong(m.ts)} · ${timeVN(m.ts)}` : fmtLong(m.ts);
    const ks = kidsAll().length > 1 ? A.kidsOf(m).map(kidById).filter(Boolean) : [A.kid()];
    PV.querySelector('.pv-ag').innerHTML = ks.map(k => `<span style="--c:${k.color || '#ff8fbf'}">${esc(A.ageText(k, m.ts))}</span>`).join('');
    const nt = PV.querySelector('.pv-nt'); nt.textContent = m.note || ''; nt.hidden = !m.note;
  }
  // dải ảnh nhỏ: chạm để nhảy, kéo để tua nhanh
  const FW = 46;
  function buildFilm() {
    FI.innerHTML = V.list.map((m, i) => `<button class="pf${m.type === 'video' ? ' v' : ''}" data-i="${i}" style="--pc:${m.color || COL.get(m.id) || '#2a2340'}"><img data-mid="${m.id}" alt=""></button>`).join('');
    FI.style.padding = `0 ${Math.max(0, (innerWidth - FW) / 2)}px`;
    FI.querySelectorAll('img').forEach(im => filmIO.observe(im));
  }
  const filmIO = new IntersectionObserver(es => { for (const en of es) if (en.isIntersecting) { const im = en.target; filmIO.unobserve(im); thumbURL(im.dataset.mid).then(u => { if (u) { im.src = u; im.onload = () => im.classList.add('ok'); } }); } }, { root: FILM, rootMargin: '0px 300px' });
  let filmProg = false, filmT = 0;
  function filmSync(smooth) {
    FI.querySelectorAll('.pf.on').forEach(b => b.classList.remove('on')); const b = FI.children[V.i]; if (!b) return; b.classList.add('on');
    filmProg = true; FILM.scrollTo({ left: V.i * (FW + 4), behavior: smooth && !REDUCED ? 'smooth' : 'auto' }); clearTimeout(filmT); filmT = setTimeout(() => { filmProg = false; }, smooth ? 450 : 60);
  }
  FILM.addEventListener('scroll', () => {
    if (filmProg || !PV.classList.contains('open')) return; showUI(true);
    const i = clamp(Math.round(FILM.scrollLeft / (FW + 4)), 0, V.list.length - 1);
    if (i !== V.i) { V.i = i; haptic(3); layoutSlides(); filmProg = true; clearTimeout(filmT); filmT = setTimeout(() => { filmProg = false; }, 30); FI.querySelectorAll('.pf.on').forEach(x => x.classList.remove('on')); FI.children[i]?.classList.add('on'); }
  }, { passive: true });
  FILM.addEventListener('click', e => { const b = e.target.closest('.pf'); if (!b) return; const i = +b.dataset.i; if (i !== V.i) { V.i = i; layoutSlides(); filmSync(true); } });
  ['pointerdown', 'touchstart'].forEach(t => FILM.addEventListener(t, e => e.stopPropagation(), { passive: true }));
  // khung chữ + nút: hiện khi chạm, tự ẩn sau 2,5 giây
  let uiT = 0;
  function showUI(on) {
    if (on && !PV.classList.contains('open')) on = false; V.ui = on; PV.classList.toggle('ui', on); clearTimeout(uiT);
    if (on) uiT = setTimeout(() => { if (V.seeking || (V.vid && V.vid.paused && !V.vid.ended && V.vid.currentTime > 0)) { showUI(true); return; } showUI(false); }, 2500);
  }
  PV.querySelector('.pv-ui').addEventListener('pointerdown', e => { if (e.target.closest('button, input')) showUI(true); });
  const curMedia = () => track.children[1]?.querySelector('.pv-m');
  const setX = x => { V.x = x; track.style.transform = `translate3d(${x}px,0,0)`; };
  const applyZoom = () => { const el = curMedia(); if (el) el.style.transform = V.z.s > 1.001 ? `translate3d(${V.z.x}px,${V.z.y}px,0) scale(${V.z.s})` : ''; };
  function openViewer(list, i, getRect) {
    if (SP.vIt) pickStripVideo(null);
    V.list = list; V.i = clamp(i, 0, list.length - 1); V.getRect = getRect; V.urls.forEach(u => URL.revokeObjectURL(u)); V.urls = [];
    PV.classList.add('open'); PV.setAttribute('aria-hidden', 'false'); document.body.classList.add('pvopen'); PV.classList.toggle('one', list.length < 2);
    buildFilm(); layoutSlides(); haptic(6); showUI(true);
    const src = getRect?.(list[V.i].id), el = curMedia();
    if (src && el && !REDUCED) {
      const to = fitRect(list[V.i]), f = rectOf(src);
      el.style.transition = 'none'; el.style.transform = `translate(${f.left - to.left}px,${f.top - to.top}px) scale(${f.width / to.width},${f.height / to.height})`; el.style.transformOrigin = '0 0';
      void el.offsetWidth; el.style.transition = 'transform var(--sp-soft-ms) var(--sp-soft)'; el.style.transform = '';
      setTimeout(() => { el.style.transition = ''; el.style.transformOrigin = ''; }, 700);
    }
  }
  function closeViewer() {
    if (!PV.classList.contains('open')) return;
    const m = V.list[V.i], el = curMedia(), tgt = V.getRect?.(m.id);
    stopVideo(); showUI(false); clearTimeout(uiT); V.stop?.(); filmProg = true;
    PV.classList.add('closing'); PV.classList.remove('open'); document.body.classList.remove('pvopen'); PV.setAttribute('aria-hidden', 'true');
    if (tgt && el && !REDUCED) {
      const to = rectOf(tgt), f = el.getBoundingClientRect(), base = fitRect(m);
      el.style.transformOrigin = '0 0'; el.style.transition = 'none';
      el.style.transform = `translate(${f.left - base.left}px,${f.top - base.top}px) scale(${f.width / base.width},${f.height / base.height})`; void el.offsetWidth;
      el.style.transition = 'transform var(--sp-snappy-ms) var(--sp-snappy)'; el.querySelector('img') && (el.querySelector('img').style.objectFit = 'cover');
      el.style.transform = `translate(${to.left - base.left}px,${to.top - base.top}px) scale(${to.width / base.width},${to.height / base.height})`;
      const cell = tgt.closest('.gi, .sc'); if (cell) { const ov = 0; cell.classList.add('flying'); setTimeout(() => { cell.classList.remove('flying'); if (cell.classList.contains('gi')) { cell.classList.remove('land'); void cell.offsetWidth; cell.classList.add('land'); } }, 430); void ov; }
    }
    setTimeout(() => { if (!PV.classList.contains('open')) { PV.classList.remove('closing'); track.innerHTML = ''; FI.innerHTML = ''; V.urls.forEach(u => URL.revokeObjectURL(u)); V.urls = []; } }, 520);
  }
  function go(d, v = 0) {
    const n = V.i + d; if (n < 0 || n >= V.list.length) { V.stop = animateSpring(V.x, 0, { k: 260, c: 20, v }, setX); return; }
    V.stop?.(); haptic(5); V.vid?.pause();
    V.stop = animateSpring(V.x, -d * (V.W + 24), { k: 220, c: 25, v, eps: .6 }, setX, () => { if (!PV.classList.contains('open')) return; V.i = n; layoutSlides(); filmSync(true); });
  }
  { // cử chỉ: vuốt ngang có đà, vuốt xuống đóng (ảnh thu về đúng ô), chụm / chạm đúp để phóng
    const ptr = new Map(); let g = null, lastTap = 0, tapT = 0;
    const bg = PV.querySelector('.pv-bg');
    track.addEventListener('pointerdown', e => {
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
      g.vx = g.vx * .3 + (e.clientX - g.lx) / dt * .7; g.vy = g.vy * .3 + (e.clientY - g.ly) / dt * .7; g.lx = e.clientX; g.ly = e.clientY; g.lt = now;
      if (!g.mode) { if (Math.hypot(dx, dy) < 8) return; g.mode = V.z.s > 1.02 ? 'pan' : Math.abs(dx) > Math.abs(dy) ? 'swipe' : dy > 0 ? 'dismiss' : 'up'; if (g.mode === 'dismiss') showUI(false); }
      if (g.mode === 'swipe') { let x = g.x0 + dx; if ((V.i === 0 && x > 0) || (V.i === V.list.length - 1 && x < 0)) x = rubber(x, V.W * .7); setX(x); }
      else if (g.mode === 'dismiss') { const el = curMedia(); const k = 1 - clamp(dy / V.H, 0, 1) * .45; if (el) el.style.transform = `translate3d(${dx * .6}px,${dy}px,0) scale(${k})`; bg.style.opacity = clamp(1 - dy / (V.H * .7), 0, 1); PV.classList.add('drag'); }
      else if (g.mode === 'pan') { V.z.x = g.zx + dx; V.z.y = g.zy + dy; applyZoom(); }
      else if (g.mode === 'up' && dy < -40 && !V.ui) { showUI(true); g.mode = 'done'; }
    });
    const up = e => {
      if (!ptr.has(e.pointerId)) return; ptr.delete(e.pointerId); if (ptr.size) return; const G = g; g = null; if (!G) return;
      PV.classList.remove('drag');
      if (G.mode === 'pinch') { if (V.z.s < 1.05) { const z0 = { ...V.z }; animateSpring(1, 0, { k: 300, c: 26, eps: .002 }, f => { V.z = { s: 1 + (z0.s - 1) * f, x: z0.x * f, y: z0.y * f }; applyZoom(); }); } return; }
      if (G.mode === 'swipe') { const dx = V.x - G.x0, v = G.vx; const d = (dx < -V.W * .2 || v < -.4) ? 1 : (dx > V.W * .2 || v > .4) ? -1 : 0; if (d) go(d, v * 1000); else V.stop = animateSpring(V.x, 0, { k: 300, c: 22, v: v * 1000 }, setX); return; }
      if (G.mode === 'dismiss') {
        const dy = e.clientY - G.sy;
        if (dy > 110 || G.vy > .7) { closeViewer(); setTimeout(() => { bg.style.opacity = ''; }, 520); }
        else { const el = curMedia(), dx0 = e.clientX - G.sx; animateSpring(1, 0, { k: 320, c: 24, eps: .002 }, f => { if (el) el.style.transform = f > .001 ? `translate3d(${dx0 * .6 * f}px,${dy * f}px,0) scale(${1 - clamp(dy / V.H, 0, 1) * .45 * f})` : ''; bg.style.opacity = 1 - clamp(dy * f / (V.H * .7), 0, 1); }); }
        return;
      }
      if (G.mode) return;
      // chạm: 1 lần = hiện/ẩn khung chữ (video: phát/dừng khi khung đang hiện), 2 lần = phóng
      const now = performance.now();
      if (now - lastTap < 300) { clearTimeout(tapT); lastTap = 0; zoomAt(e.clientX, e.clientY); return; }
      lastTap = now; tapT = setTimeout(() => { if (!PV.classList.contains('open')) return; const v = V.vid; if (v && V.ui && v.paused) { v.play().catch(() => { }); showUI(false); } else showUI(!V.ui); }, 280);
    };
    track.addEventListener('pointerup', up); track.addEventListener('pointercancel', up);
    track.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); V.z.s = clamp(V.z.s * Math.exp(-e.deltaY * .01), 1, 5); if (V.z.s <= 1.01) V.z = { s: 1, x: 0, y: 0 }; applyZoom(); }, { passive: false });
    function zoomAt(x, y) {
      const z0 = { ...V.z }, target = z0.s > 1.05 ? { s: 1, x: 0, y: 0 } : { s: 2.4, x: -(x - innerWidth / 2) * 1.4, y: -(y - innerHeight / 2) * 1.4 };
      haptic(6); showUI(false); animateSpring(0, 1, { k: 280, c: 22, eps: .002 }, f => { V.z = { s: z0.s + (target.s - z0.s) * f, x: z0.x + (target.x - z0.x) * f, y: z0.y + (target.y - z0.y) * f }; applyZoom(); });
    }
  }
  PV.addEventListener('click', async e => {
    const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, m = V.list[V.i];
    if (a === 'more') { showUI(true); clearTimeout(uiT); photoMenu(m, null, b, true); return; }
    if (a === 'close') { closeViewer(); return; }
    if (a === 'vplay') { const v = V.vid; if (v) { if (v.paused) v.play().catch(() => { }); else v.pause(); } showUI(true); return; }
    if (a === 'vmute') { const v = V.vid; if (v) { v.muted = !v.muted; updVC(); } showUI(true); return; }
  });
  async function viewerDelete(m) {
    if (!(await A.ask('Xoá khoảnh khắc này?', `“${m.title || A.dmy(m.ts)}” sẽ vào thùng rác 30 ngày, khôi phục được.`, 'Xoá', true))) return;
    V.list = V.list.filter(x => x !== m);
    if (!V.list.length) closeViewer(); else { V.i = Math.min(V.i, V.list.length - 1); buildFilm(); layoutSlides(); }
    await A.trashMoments([m], 'Đã chuyển vào thùng rác'); refreshAll(st.cur?.key);
  }
  async function splitHere(m) {
    const e2 = st.cur; if (!e2) return; (st.meta.splits[e2.day] ||= []).push(m.ts); await saveMeta(); haptic(12);
    closeViewer(); closeEvent(); render(); const k = keyOfMid(m.id); setTimeout(() => k && scrollToKey(k), 450); A.toast('Đã tách thành 2 sự kiện', 1800);
  }
  addEventListener('keydown', e => {
    if (EVS.classList.contains('open')) { if (e.key === 'Escape') { e.stopImmediatePropagation(); stopEvShow(); } return; }
    if (PV.classList.contains('open')) { if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } else if (e.key === 'Escape') closeViewer(); else if (e.key === ' ' && V.vid) { e.preventDefault(); V.vid.paused ? V.vid.play() : V.vid.pause(); } e.stopImmediatePropagation(); return; }
    if (EVP.classList.contains('open') && e.key === 'Escape' && !document.querySelector('.modal.open')) { e.stopImmediatePropagation(); closeEvent(); }
  }, true);
  addEventListener('resize', () => { if (PV.classList.contains('open')) { FI.style.padding = `0 ${Math.max(0, (innerWidth - FW) / 2)}px`; layoutSlides(); } });

  // ---------- chiếu riêng một sự kiện: nhạc, ảnh trôi kiểu Ken Burns, chuyển cảnh mềm ----------
  const EVS = $('#evs'), EST = EVS.querySelector('.evs-st'); const ES = { on: false, tok: 0, urls: [] };
  const sleepT = (ms, tok) => new Promise(r => setTimeout(() => r(ES.tok === tok), ms));
  async function playEvent(e) {
    if (ES.on) return; const tok = ++ES.tok; ES.on = true; ES.e = e;
    EVS.classList.add('open'); EVS.setAttribute('aria-hidden', 'false'); document.body.classList.add('evshow'); EST.innerHTML = '';
    A.music?.(true); haptic(8);
    const cap = EVS.querySelector('.evs-cap'), bar = EVS.querySelector('.evs-bar i');
    cap.querySelector('small').textContent = fmtLong(e.ts0); cap.querySelector('b').textContent = e.title; cap.querySelector('span').textContent = A.family() ? '' : A.ageText(A.kid(), e.ts0);
    cap.classList.remove('on', 'end'); void cap.offsetWidth; cap.classList.add('on');
    const list = e.ms.slice(0, 40); let prev = null;
    const getSrc = async m => { const b = (!m.heic && await A.dbGet('blobs', 'o_' + m.id)) || await A.dbGet('blobs', 't_' + m.id); if (!b) return ''; const u = URL.createObjectURL(b); ES.urls.push(u); return u; };
    let nextSrc = list[0] && getSrc(list[0]);
    if (!await sleepT(1800, tok)) return;
    for (let i = 0; i < list.length; i++) {
      const m = list[i], src = await nextSrc; if (ES.tok !== tok) return; nextSrc = list[i + 1] && getSrc(list[i + 1]);
      const L = document.createElement('div'); L.className = 'evs-l'; const R = rng(m.id + i), dir = R() > .5 ? 1 : -1;
      L.style.setProperty('--x0', (R() * 6 - 3).toFixed(1) + '%'); L.style.setProperty('--y0', (R() * 6 - 3).toFixed(1) + '%'); L.style.setProperty('--x1', (dir * (2 + R() * 3)).toFixed(1) + '%'); L.style.setProperty('--y1', ((R() - .5) * 5).toFixed(1) + '%');
      L.style.setProperty('--s0', R() > .5 ? '1.02' : '1.13'); L.style.setProperty('--s1', L.style.getPropertyValue('--s0') === '1.02' ? '1.14' : '1.03');
      let hold = 4600;
      if (m.type === 'video' && src) { const v = document.createElement('video'); Object.assign(v, { src, playsInline: true, muted: false, preload: 'auto' }); v.setAttribute('playsinline', ''); L.appendChild(v); L.classList.add('v'); A.duck?.(true); v.play().catch(() => { v.muted = true; v.play().catch(() => { }); }); hold = clamp(((m.dur || 6) + .2) * 1000, 3000, 12000); v.onended = () => { hold = 0; }; }
      else { const b = await (await fetch(src)).blob(), cv = await fitCanvas(b, innerWidth, innerHeight, 1.16); L.style.setProperty('--kb', (hold + 1400) + 'ms'); if (cv) { cv.className = 'kbi'; L.appendChild(cv); } }
      EST.appendChild(L); void L.offsetWidth; L.classList.add('on');
      if (i === 0) setTimeout(() => cap.classList.remove('on'), 2400);
      bar.style.transition = 'none'; bar.style.transform = `scaleX(${i / list.length})`; void bar.offsetWidth; bar.style.transition = `transform ${hold}ms linear`; bar.style.transform = `scaleX(${(i + 1) / list.length})`;
      if (prev) { const p = prev; setTimeout(() => { p.querySelector('video')?.pause(); p.remove(); }, 1300); }
      prev = L; const t0 = performance.now();
      while (performance.now() - t0 < hold) { if (!await sleepT(120, tok)) return; }
      if (m.type === 'video') { L.querySelector('video')?.pause(); A.duck?.(false); }
    }
    cap.querySelector('small').textContent = A.family() ? '' : A.ageText(A.kid(), e.ts1); cap.querySelector('b').textContent = '♡ ' + e.title; cap.querySelector('span').textContent = 'Hết rồi — chạm để quay lại';
    cap.classList.add('on', 'end'); prev?.classList.add('dim');
    if (await sleepT(3200, tok)) stopEvShow();
  }
  function stopEvShow() {
    if (!ES.on) return; ES.tok++; ES.on = false; A.music?.(false); A.duck?.(false);
    EVS.classList.remove('open'); EVS.setAttribute('aria-hidden', 'true'); document.body.classList.remove('evshow');
    EST.querySelectorAll('video').forEach(v => v.pause()); const us = ES.urls; ES.urls = [];
    setTimeout(() => { if (!ES.on) EST.innerHTML = ''; us.forEach(u => URL.revokeObjectURL(u)); }, 500);
  }
  EVS.addEventListener('click', e => { if (e.target.closest('.evs-x') || EVS.querySelector('.evs-cap.end')) { stopEvShow(); return; } EVS.classList.add('tap'); clearTimeout(EVS._t); EVS._t = setTimeout(() => EVS.classList.remove('tap'), 2500); });
  // sửa khoảnh khắc (ngày hiện rõ chữ để khỏi nhầm ngày/tháng)
  let editing = null;
  const dateLine = (inp, out) => { const t = A.parseYmd(inp.value); out.textContent = t ? fmtLong(t) : ''; };
  $('#emDt').addEventListener('input', () => dateLine($('#emDt'), $('#emDtH')));
  function openEditM(m) { editing = m; const d = new Date(m.ts); $('#emTi').value = m.title || ''; $('#emDt').value = A.ymd(m.ts); $('#emTm').value = `${pad(d.getHours())}:${pad(d.getMinutes())}`; $('#emNt').value = m.note || ''; dateLine($('#emDt'), $('#emDtH')); A.openModal($('#mEdM')); }
  $('#emOk').onclick = async () => {
    const m = editing; if (!m) return; let ts = A.parseYmd($('#emDt').value, m.ts); if (!ts) { A.toast('Bạn chọn ngày nhé'); return; }
    const tm = /^(\d{1,2}):(\d{2})/.exec($('#emTm').value || ''); if (tm) { const d = new Date(ts); d.setHours(+tm[1], +tm[2], 0, 0); ts = d.getTime(); }
    const moved = A.dayStart(ts) !== A.dayStart(m.ts), retimed = ts !== m.ts;
    m.title = $('#emTi').value.trim(); m.note = $('#emNt').value.trim(); if (retimed) { m.ts = ts; m.dateSrc = 'user'; }
    await A.updateMoment(m, moved || retimed); A.closeModal($('#mEdM'));
    if (moved) { closeViewer(); closeEvent(); render(); const k = keyOfMid(m.id); setTimeout(() => k && scrollToKey(k), 450); A.toast('Đã lưu — đã chuyển sang ngày ' + A.dmy(ts), 2200); }
    else { if (retimed) V.list.sort((x, y) => x.ts - y.ts); V.i = Math.max(0, V.list.indexOf(m)); layoutSlides(); refreshAll(st.cur?.key); A.toast('Đã lưu', 1200); }
  };

  return {
    async reload() { await loadMeta(); render(false); },
    render, refreshAll, scrollToKey, keyOfMid, openEvent, closeEvent, openViewer, closeViewer, openJump,
    setTitle, refreshThumb, eventsForKid: (kid, moments, meta) => compute({ kid, moments, meta: Object.assign(META0(), meta || {}) }), get events() { return st.events; }, get meta() { return st.meta; }, setMeta: async m => { st.meta = Object.assign(META0(), m); await saveMeta(); },
    guard: (ms = 550) => { st.guard = performance.now() + ms; },
    startSel, endSel, eventMenu, get hidePreg() { return st.hidePreg; },
    async setHidePreg(v) { st.hidePreg = v; await A.metaSet('hidePreg:' + (A.family() ? 'fam' : A.kid().id), v); render(); },
    isOpen: () => EVP.classList.contains('open') || PV.classList.contains('open') || EVS.classList.contains('open'), scroller: TL, viewer: V, dateLine, playEvent, stopEvShow, layoutGrid, showGrid, strip: SP, openGroupPicker, suggestGroup, groupOfMid, spanTxt, get cur() { return st.cur; }
  };
}
