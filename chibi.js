// Hành Trình Của Bạn — nhân vật CHIBI tự vẽ bằng SVG (đầu to, mắt tròn long lanh, má hồng). Không dùng ảnh có bản quyền.
// p.chibi = { g: 'm'|'f', h: kiểu tóc 0–7, hc: màu tóc, sc: màu áo, sk: màu da 0–2, acc: phụ kiện }
import { roleOf, isChild } from './doi.js';

export const HAIRS = ['Tóc ngắn', 'Rẽ ngôi', 'Đầu đinh', 'Tóc xoăn', 'Tóc dài', 'Búi hai bên', 'Tóc bob', 'Đuôi ngựa'];
export const HAIR_COLORS = ['#2b2024', '#4a2c22', '#7a4a2a', '#c98a3c', '#b9b4c4', '#ff8fbf', '#6f8dff'];
export const SHIRTS = ['#ff8fbf', '#ffb36b', '#ffd36b', '#7fd6a4', '#5fc8ff', '#8f9bff', '#c08bff', '#ff6f6f', '#ffffff', '#3c3f58'];
export const SKINS = ['#ffe2cc', '#f6cfa8', '#d9a47c'];
export const ACCS = [
  { k: '', t: 'Không' }, { k: 'glasses', t: 'Kính' }, { k: 'helmet', t: 'Mũ bảo hộ' }, { k: 'steth', t: 'Ống nghe' }, { k: 'bag', t: 'Cặp sách' },
  { k: 'grad', t: 'Mũ tốt nghiệp' }, { k: 'tie', t: 'Cà vạt' }, { k: 'apron', t: 'Tạp dề' }, { k: 'book', t: 'Sách' }, { k: 'laptop', t: 'Máy tính' },
  { k: 'brush', t: 'Cọ vẽ' }, { k: 'case', t: 'Cặp da' }, { k: 'hat', t: 'Mũ len' }, { k: 'bow', t: 'Nơ' }
];
// gợi ý phụ kiện theo nghề đã khai
export function accForJob(job) {
  const j = String(job || '').toLowerCase();
  if (/học sinh/.test(j)) return 'bag'; if (/sinh viên/.test(j)) return 'grad'; if (/bác sĩ|y tá|điều dưỡng|dược/.test(j)) return 'steth';
  if (/kỹ sư|xây dựng|công nhân|thợ/.test(j)) return 'helmet'; if (/giáo viên|giảng viên|cô giáo|thầy giáo/.test(j)) return 'book';
  if (/văn phòng|nhân viên|kế toán|ngân hàng|luật/.test(j)) return 'tie'; if (/kinh doanh|buôn bán|bán hàng|chủ/.test(j)) return 'case';
  if (/nội trợ|đầu bếp|nấu/.test(j)) return 'apron'; if (/lập trình|it|công nghệ|phần mềm/.test(j)) return 'laptop';
  if (/thiết kế|họa sĩ|nghệ|sáng tạo|tự do|freelance/.test(j)) return 'brush'; if (/nghỉ hưu|hưu/.test(j)) return 'hat';
  return '';
}
// v1.8.1 — NHÓM TUỔI: em bé 0–2, trẻ nhỏ 3–9, thiếu niên 10–17, người lớn 18–59, người già 60+.
// Tính từ ngày sinh; chưa có ngày sinh thì đoán theo quan hệ (con/cháu → trẻ, ông/bà → già, bố/mẹ → hơn bạn ~28 tuổi).
let ME0 = null; export const setChibiMe = m => { ME0 = m ? { birth: m.birth, birthApprox: m.birthApprox } : null; }; // ngày sinh của bạn: đoán tuổi bố mẹ khi chưa có ngày sinh
export function ageOf(p, me = ME0, now = Date.now()) {
  const yrs = b => { const m = /^(\d{4})/.exec(b || ''); return m ? new Date(now).getFullYear() - +m[1] : null; };
  const exact = b => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(b || ''); return m ? (now - new Date(+m[1], +m[2] - 1, +m[3]).getTime()) / (365.25 * 864e5) : null; };
  if (p?.birth) { const e = p.birthApprox ? null : exact(p.birth); return e != null ? Math.max(0, e) : Math.max(0, yrs(p.birth)); }
  const r = roleOf(p), ma = me?.birth ? (exact(me.birth) ?? yrs(me.birth)) : null;
  if (r === 'con') return 6; if (r === 'chau') return 5; if (r === 'ong' || r === 'ba') return 72; if (r === 'bo' || r === 'ma') return ma != null ? ma + 28 : 55;
  return 30;
}
export const ageCat = a => a < 3 ? 'baby' : a < 10 ? 'kid' : a < 18 ? 'teen' : a < 60 ? 'adult' : 'elder';
// chibi mặc định theo vai trò / giới tính / tuổi (ai chưa tự chọn)
export function defaultChibi(p) {
  const r = roleOf(p), g = p?.gender || ({ bo: 'm', ong: 'm', anh: 'm', chong: 'm', ma: 'f', ba: 'f', chi: 'f', vo: 'f' }[r]) || 'm';
  const cat = ageCat(ageOf(p)), old = cat === 'elder', seed = [...String(p?.id || 'x')].reduce((a, c) => a + c.charCodeAt(0), 0);
  return { g, h: g === 'f' ? [4, 5, 6, 7][seed % 4] : [0, 1, 2, 3][seed % 4], hc: old ? '#b9b4c4' : HAIR_COLORS[seed % 2], sc: p?.color || SHIRTS[seed % SHIRTS.length], sk: 0, acc: old ? 'glasses' : (cat === 'kid' || cat === 'baby') ? (g === 'f' ? 'bow' : '') : '' };
}
export const chibiOf = p => { const c = { ...defaultChibi(p), ...(p?.chibi || {}) }; if (!p?.chibi?.hc && ageCat(ageOf(p)) === 'elder') c.hc = '#b9b4c4'; return c; };
const shade = (h, t) => { const n = parseInt(h.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(t < 0 ? v * (1 + t) : v + (255 - v) * t)); return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); };

// phần thân + đầu (toạ độ khung 120 × 160; đầu tâm (60,54) bán kính 38)
function parts(c, cat = 'adult') {
  const hc = c.hc, hd = shade(hc, -.25), sk = SKINS[c.sk || 0], skd = shade(sk, -.12), sc = c.sc, scd = shade(sc, -.2), f = c.g === 'f';
  let back = '', front = '';
  switch (cat === 'baby' ? -1 : +c.h) {
    case -1: front = `<path d="M52 22c2-8 10-10 14-5-6-1-8 3-6 7 4-2 9 0 9 4-6-3-12-1-17-6z" fill="${hc}"/><path d="M40 30c4-6 10-8 14-8M80 30c-4-6-10-8-14-8" stroke="${hc}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".7"/>`; break; // em bé: chỏm tóc lơ thơ
    case 0: front = `<path d="M24 54c0-24 16-38 36-38s36 14 36 38c-6-10-14-16-22-17 2 4 1 7-2 9-3-6-9-10-16-10-8 0-15 5-19 12-4-2-6-5-6-9-4 4-6 9-7 15z" fill="${hc}"/>`; break;
    case 1: front = `<path d="M23 56c-1-25 15-40 37-40 23 0 38 16 37 40-10-4-22-12-30-24-6 10-24 20-44 24z" fill="${hc}"/><path d="M60 22c-4 6-4 10-2 14" stroke="${hd}" stroke-width="2" fill="none"/>`; break;
    case 2: front = `<path d="M25 50c2-20 16-32 35-32s33 12 35 32c-10-7-22-10-35-10s-25 3-35 10z" fill="${hc}"/>`; break;
    case 3: front = [[30, 40], [40, 28], [53, 22], [67, 22], [80, 28], [90, 40], [26, 52], [94, 52]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="11" fill="${hc}"/>`).join('') + `<path d="M28 50c8-10 20-14 32-14s24 4 32 14" fill="${hc}"/>`; break;
    case 4: back = `<path d="M20 58c-2-28 14-44 40-44s42 16 40 44l2 46c-6 6-14 8-20 6V60H38v50c-6 2-14 0-20-6z" fill="${hc}"/>`; front = `<path d="M24 56c2-24 16-36 36-36s34 12 36 36c-8-8-18-14-30-14-2 4-6 6-12 7-8-1-14 2-18 7z" fill="${hc}"/>`; break;
    case 5: back = `<circle cx="24" cy="30" r="14" fill="${hc}"/><circle cx="96" cy="30" r="14" fill="${hc}"/>`; front = `<path d="M23 56c1-24 16-38 37-38s36 14 37 38c-8-9-20-15-37-15s-29 6-37 15z" fill="${hc}"/>`; break;
    case 6: back = `<path d="M18 60c-2-28 14-44 42-44s44 16 42 44c0 12-2 22-6 28H24c-4-6-6-16-6-28z" fill="${hc}"/>`; front = `<path d="M24 54c2-22 16-34 36-34s34 12 36 34c-6-6-12-8-18-8-6 0-10-4-12-8-4 6-14 10-24 10-8 0-14 2-18 6z" fill="${hc}"/>`; break;
    default: back = `<path d="M92 34c14 6 18 22 14 38-2 8-8 14-14 16 4-10 4-22 0-32z" fill="${hc}"/>`; front = `<path d="M23 56c1-24 16-38 37-38s36 14 37 38c-8-9-20-15-37-15s-29 6-37 15z" fill="${hc}"/><circle cx="92" cy="36" r="5" fill="${shade(sc, .2)}"/>`;
  }
  const lash = f ? `<path d="M41 58l-4-3M79 58l4-3" stroke="#3a2433" stroke-width="2" stroke-linecap="round"/>` : '';
  const face = `<ellipse cx="46" cy="62" rx="5.2" ry="6.4" fill="#3a2433"/><ellipse cx="74" cy="62" rx="5.2" ry="6.4" fill="#3a2433"/><circle cx="48" cy="59.5" r="2" fill="#fff"/><circle cx="76" cy="59.5" r="2" fill="#fff"/><circle cx="44.5" cy="64.5" r="1" fill="#fff"/><circle cx="72.5" cy="64.5" r="1" fill="#fff"/>${lash}
    <ellipse cx="37" cy="72" rx="${cat === 'baby' ? 8.5 : 6}" ry="${cat === 'baby' ? 5.2 : 3.6}" fill="#ff9fb5" opacity=".75"/><ellipse cx="83" cy="72" rx="${cat === 'baby' ? 8.5 : 6}" ry="${cat === 'baby' ? 5.2 : 3.6}" fill="#ff9fb5" opacity=".75"/>${cat === 'elder' ? '<path d="M33 57l-5-2M33 61l-5 1M87 57l5-2M87 61l5 1" stroke="#a07a6a" stroke-width="1.6" stroke-linecap="round" opacity=".7"/><path d="M50 46q4-2 8 0M62 46q4-2 8 0" stroke="#a07a6a" stroke-width="1.3" fill="none" opacity=".45"/>' : ''}<path d="M54 73q6 6 12 0" stroke="#3a2433" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  if (cat === 'elder' && c.g === 'f') back = `<circle cx="60" cy="16" r="13" fill="${hc}"/><path d="M48 16h24" stroke="${hd}" stroke-width="2"/>` + back; // bà búi tóc
  const head = `${back}<circle cx="60" cy="56" r="37" fill="${sk}"/><ellipse cx="23" cy="60" rx="5.5" ry="7" fill="${skd}"/><ellipse cx="97" cy="60" rx="5.5" ry="7" fill="${skd}"/>${front}${face}`;
  const body = `<path d="M40 118c0-14 9-24 20-24s20 10 20 24v14H40z" fill="${sc}" stroke="rgba(60,30,60,.12)" stroke-width="1.2"/><path d="M52 95l8 8 8-8" fill="${shade(sc, .35)}"/>
    <rect x="31" y="102" width="11" height="24" rx="5.5" fill="${sc}" transform="rotate(14 36 104)"/><rect x="78" y="102" width="11" height="24" rx="5.5" fill="${sc}" transform="rotate(-14 84 104)"/>
    <circle cx="33" cy="126" r="5.5" fill="${sk}"/><circle cx="87" cy="126" r="5.5" fill="${sk}"/>
    <rect x="45" y="130" width="12" height="18" rx="5" fill="${scd}"/><rect x="63" y="130" width="12" height="18" rx="5" fill="${scd}"/><ellipse cx="51" cy="149" rx="8" ry="4.5" fill="#4a3442"/><ellipse cx="69" cy="149" rx="8" ry="4.5" fill="#4a3442"/>`;
  let accB = '', accF = '', accH = '';
  switch (c.acc) {
    case 'glasses': accH = `<g fill="none" stroke="#3a2433" stroke-width="2.4"><circle cx="46" cy="62" r="9.5"/><circle cx="74" cy="62" r="9.5"/><path d="M55.5 62h9"/></g>`; break;
    case 'helmet': accH = `<path d="M20 46c2-22 18-34 40-34s38 12 40 34z" fill="#ffc94a"/><rect x="16" y="42" width="88" height="8" rx="4" fill="#f2a92a"/><rect x="56" y="12" width="8" height="30" rx="3" fill="#f2a92a"/>`; break;
    case 'steth': accF = `<path d="M47 96c-4 10-2 20 6 24M73 96c4 10 2 20-6 24" stroke="#5b6b8c" stroke-width="2.6" fill="none"/><circle cx="60" cy="122" r="4.5" fill="#9fb2d6" stroke="#5b6b8c" stroke-width="2"/>`; break;
    case 'bag': accB = `<rect x="76" y="98" width="22" height="28" rx="6" fill="#ff6f6f"/>`; accF = `<path d="M70 96l10 26" stroke="#d94f4f" stroke-width="3.5"/>`; break;
    case 'grad': accH = `<path d="M60 8 98 22 60 36 22 22z" fill="#2f2a44"/><rect x="40" y="24" width="40" height="10" rx="3" fill="#2f2a44"/><path d="M96 22v16" stroke="#ffd36b" stroke-width="2.4"/><circle cx="96" cy="40" r="3" fill="#ffd36b"/>`; break;
    case 'tie': accF = `<path d="M57 98h6l3 6-6 22-6-22z" fill="#3c4f9c"/>`; break;
    case 'apron': accF = `<path d="M46 106h28v26H46z" fill="#fff" opacity=".92"/><path d="M46 106l-4-8M74 106l4-8" stroke="#fff" stroke-width="2.5"/><rect x="54" y="116" width="12" height="7" rx="2" fill="#ffd0e0"/>`; break;
    case 'book': accF = `<rect x="78" y="112" width="22" height="16" rx="2" fill="#5fc8ff" transform="rotate(-12 89 120)"/><path d="M80 116l18-4" stroke="#fff" stroke-width="1.6" transform="rotate(-12 89 120)"/>`; break;
    case 'laptop': accF = `<rect x="40" y="114" width="40" height="22" rx="3" fill="#c9cfe0"/><rect x="43" y="117" width="34" height="15" rx="2" fill="#6f8dff"/><circle cx="60" cy="124" r="2.5" fill="#fff"/>`; break;
    case 'brush': accF = `<path d="M88 128 104 100" stroke="#a0673a" stroke-width="3.2" stroke-linecap="round"/><path d="M103 102l4-7 3 3z" fill="#ff6fa5"/><circle cx="28" cy="122" r="9" fill="#ffe7b0"/><circle cx="25" cy="119" r="2" fill="#ff6f6f"/><circle cx="31" cy="121" r="2" fill="#5fc8ff"/><circle cx="27" cy="126" r="2" fill="#7fd6a4"/>`; break;
    case 'case': accF = `<rect x="80" y="118" width="24" height="18" rx="3" fill="#8a5a3c"/><path d="M87 118v-4h10v4" stroke="#6b4329" stroke-width="2.4" fill="none"/>`; break;
    case 'hat': accH = `<path d="M22 44c2-22 18-32 38-32s36 10 38 32z" fill="#ff8a78"/><rect x="18" y="40" width="84" height="10" rx="5" fill="#fff"/><circle cx="60" cy="10" r="7" fill="#fff"/>`; break;
    case 'bow': accH = `<path d="M60 22l-14-8v16zM60 22l14-8v16z" fill="#ff5f9e"/><circle cx="60" cy="22" r="4" fill="#ff8fbf"/>`; break;
  }
  return { body: accB + body, head, accF: accF + accH, accH, accBody: accF, accBack: accB, sk, sc, scd };
}
// toàn thân (màn làm quen, hồ sơ, trình sửa, ghim bản đồ): vẽ theo NHÓM TUỔI, co vừa khung 120 × 160
export function chibiSVG(p, { bg = false, w = 120, me = null } = {}) {
  const sc = sceneSVG([{ p, pose: { l: 'down', r: 'down' } }], { me, fit: true });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${sc.vb}" width="${w}" height="${w * 4 / 3}" preserveAspectRatio="xMidYMax meet">${bg ? `<circle cx="${sc.cx}" cy="${sc.gy - 70}" r="${sc.h * .45}" fill="${shade(chibiOf(p).sc, .6)}"/>` : ''}${sc.inner}</svg>`;
}
// avatar tròn (nửa người, nền màu riêng) — đầu theo tuổi (chỏm tóc em bé, tóc bạc + nếp nhăn người già)
export function chibiAvatarSVG(p) {
  const c = chibiOf(p), cat = ageCat(ageOf(p)), P = parts(c, cat), bg = p?.color || c.sc;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><radialGradient id="cb" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="${shade(bg, .55)}"/><stop offset="1" stop-color="${bg}"/></radialGradient><clipPath id="cc"><circle cx="60" cy="60" r="60"/></clipPath></defs><circle cx="60" cy="60" r="60" fill="url(#cb)"/><g clip-path="url(#cc)" transform="translate(-9 -6) scale(1.15)">${P.body}${P.head}${P.accF}</g></svg>`;
}
export const svgURL = s => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);

// bộ chọn nhân vật: xem trước lớn + giới tính, kiểu tóc, màu tóc, màu áo, màu da, phụ kiện. onChange(chibi) mỗi lần đổi.
export function mountChibiEditor(el, person, onChange) {
  const st = chibiOf(person), base = { ...person };
  const sw = (list, key) => list.map((c, i) => `<i data-k="${key}" data-v="${key === 'sk' ? i : c}" style="background:${c}" class="${String(st[key]) === String(key === 'sk' ? i : c) ? 'on' : ''}"></i>`).join('');
  const draw = () => {
    el.innerHTML = `<div class="ce-pv">${chibiSVG({ ...base, chibi: st }, { w: 132 })}</div>
      <div class="ce-r"><b>Giới tính</b><div class="seg mini"><button type="button" data-k="g" data-v="m" class="${st.g === 'm' ? 'on' : ''}">Nam</button><button type="button" data-k="g" data-v="f" class="${st.g === 'f' ? 'on' : ''}">Nữ</button></div></div>
      <div class="ce-r"><b>Kiểu tóc</b><div class="ce-h">${HAIRS.map((t, i) => `<button type="button" data-k="h" data-v="${i}" class="${+st.h === i ? 'on' : ''}" aria-label="${t}"><img alt="" src="${svgURL(chibiAvatarSVG({ ...base, color: '#efe9ff', chibi: { ...st, h: i, acc: '' } }))}"></button>`).join('')}</div></div>
      <div class="ce-r"><b>Màu tóc</b><div class="ce-s">${sw(HAIR_COLORS, 'hc')}</div></div>
      <div class="ce-r"><b>Màu áo</b><div class="ce-s">${sw(SHIRTS, 'sc')}</div></div>
      <div class="ce-r"><b>Màu da</b><div class="ce-s">${sw(SKINS, 'sk')}</div></div>
      <div class="ce-r"><b>Phụ kiện</b><div class="ce-a">${ACCS.map(a => `<button type="button" data-k="acc" data-v="${a.k}" class="${st.acc === a.k ? 'on' : ''}">${a.t}</button>`).join('')}</div></div>`;
  };
  el.onclick = e => {
    const b = e.target.closest('[data-k]'); if (!b) return; const k = b.dataset.k; let v = b.dataset.v;
    if (k === 'h' || k === 'sk') v = +v; st[k] = v; draw(); onChange?.({ ...st });
    const pv = el.querySelector('.ce-pv svg'); pv?.animate?.([{ transform: 'scale(.86) rotate(-4deg)' }, { transform: 'scale(1.08) rotate(3deg)' }, { transform: 'none' }], { duration: 460, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  };
  draw();
  return { get: () => ({ ...st }), set: (patch) => { Object.assign(st, patch); draw(); } };
}

// ================= v1.8.1 — CẢNH NGƯỜI (dùng chung cho cảnh cả nhà, chibi lẻ, ghim bản đồ) =================
// Mọi người đứng chung một nền (một SVG): thân + đầu theo nhóm tuổi; tay theo tư thế: 'wave' vẫy | 'hold' nắm tay người bên cạnh
// | 'down' buông | 'shoulder' bá vai | 'carry' bế em bé | 'cane' chống gậy. Tay được vẽ tới ĐÚNG điểm nắm chung giữa hai người.
const GY = 200; // mặt đất
const BODY = { baby: { hr: 25, torso: 22, leg: 9, sw: 1.18 }, kid: { hr: 26, torso: 30, leg: 15, sw: .95 }, teen: { hr: 26.5, torso: 40, leg: 26, sw: 1 }, adult: { hr: 28, torso: 48, leg: 32, sw: 1.08 }, elder: { hr: 28, torso: 44, leg: 27, sw: 1.12 } };
function figure(p, me) {
  const c = chibiOf(p), cat = ageCat(ageOf(p, me || ME0)), B = BODY[cat], tw = B.hr * 2 * .54 * B.sw, foot = GY - 4, hip = foot - B.leg, neck = hip - B.torso, cy = neck - B.hr * .74;
  return { p, c, cat, B, tw, foot, hip, neck, cy, top: cy - B.hr * (cat === 'elder' && c.g === 'f' ? 1.4 : 1.12), armW: B.hr * .3, armL: B.torso * .95 + 4, shY: neck + B.torso * .24, foot2: B.leg };
}
// thân + đầu (không tay) của một người tại x
function bodyOf(F, x, face, uid) {
  const { c, cat, B, tw, foot, hip, neck, cy } = F, P = parts(c, cat), sx = tw / 40, sy = (hip - neck + 6) / 38, s = B.hr / 37, legC = shade(c.sc, -.25);
  let o = `<ellipse cx="${x}" cy="${foot + 2}" rx="${tw * .62}" ry="4" fill="rgba(0,0,0,.13)"/>`;
  if (cat === 'baby') { // em bé: chân ngắn mũm mĩm + bỉm
    o += `<rect x="${x - tw * .34}" y="${hip - 2}" width="${tw * .26}" height="${B.leg + 2}" rx="${tw * .13}" fill="${P.sk}"/><rect x="${x + tw * .08}" y="${hip - 2}" width="${tw * .26}" height="${B.leg + 2}" rx="${tw * .13}" fill="${P.sk}"/><ellipse cx="${x - tw * .21}" cy="${foot}" rx="${tw * .17}" ry="3.2" fill="#fff"/><ellipse cx="${x + tw * .21}" cy="${foot}" rx="${tw * .17}" ry="3.2" fill="#fff"/>`;
    o += `<g transform="translate(${x - 60 * sx} ${neck - 94 * sy}) scale(${sx} ${sy})"><path d="M38 120c0-16 10-26 22-26s22 10 22 26c0 8-6 12-22 12s-22-4-22-12z" fill="${c.sc}"/><path d="M52 95l8 8 8-8" fill="${shade(c.sc, .35)}"/><path d="M40 122c6 8 34 8 40 0v4c-2 6-10 9-20 9s-18-3-20-9z" fill="#fff" stroke="rgba(60,30,60,.12)"/></g>`;
  } else {
    const lw = tw * .3;
    o += `<rect x="${x - tw * .26 - lw / 2}" y="${hip - 4}" width="${lw}" height="${B.leg + 2}" rx="${lw * .45}" fill="${legC}"/><rect x="${x + tw * .26 - lw / 2}" y="${hip - 4}" width="${lw}" height="${B.leg + 2}" rx="${lw * .45}" fill="${legC}"/><ellipse cx="${x - tw * .27}" cy="${foot}" rx="${tw * .22}" ry="4" fill="#4a3442"/><ellipse cx="${x + tw * .27}" cy="${foot}" rx="${tw * .22}" ry="4" fill="#4a3442"/>`;
    o += `<g transform="translate(${x - 60 * sx} ${neck - 94 * sy}) scale(${sx} ${sy})">${P.accBack}<path d="M40 118c0-14 9-24 20-24s20 10 20 24v14H40z" fill="${c.sc}" stroke="rgba(60,30,60,.12)" stroke-width="1.2"/><path d="M52 95l8 8 8-8" fill="${shade(c.sc, .35)}"/>${P.accBody}</g>`;
  }
  const hg = `translate(${x - 60 * s} ${cy - 56 * s}) scale(${s})`;
  o += face ? `<defs><clipPath id="${uid}"><circle cx="${x}" cy="${cy}" r="${B.hr * .95}"/></clipPath></defs><circle cx="${x}" cy="${cy}" r="${B.hr * 1.04}" fill="#fff"/><image href="${face}" x="${x - B.hr}" y="${cy - B.hr}" width="${B.hr * 2}" height="${B.hr * 2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${uid})"/>`
    : `<g transform="${hg}">${P.head}${P.accH}</g>`;
  return o;
}
// một cánh tay từ vai (sx, sy) tới bàn tay (hx, hy)
const armPath = (F, sx, sy, hx, hy) => { const sk = SKINS[F.c.sk || 0], mx = (sx + hx) / 2 + (hx > sx ? -1 : 1) * F.armW * .2, my = (sy + hy) / 2 + 2;
  return `<path d="M${sx.toFixed(1)} ${sy.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${hx.toFixed(1)} ${hy.toFixed(1)}" stroke="${F.c.sc}" stroke-width="${F.armW.toFixed(1)}" fill="none" stroke-linecap="round"/><circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="${(F.armW * .58).toFixed(1)}" fill="${sk}" stroke="${shade(sk, -.12)}" stroke-width=".8"/>`; };
// people: [{ p, pose: { l, r }, hold: { l: [x,y], r: [x,y] }, face, carry: babyFigure }]; trả { inner, vb, ... }
function sceneSVG(list, { me = null, fit = false, gap = .63, anim = false } = {}) {
  const Fs = list.map(it => ({ ...figure(it.p, me), it }));
  // vị trí: chồng nhau ~37% bề ngang (khoảng cách tâm = tổng nửa bề ngang × 0,63)
  const wOf = F => F.B.hr * 3.1; let x = 0; Fs.forEach((F, i) => { if (i) x += (wOf(Fs[i - 1]) + wOf(F)) / 2 * gap; F.x = x; });
  const shoulder = (F, side) => [F.x + side * F.tw * .47, F.shY];
  // điểm nắm tay giữa hai người: giữa khe, ở tầm tay người thấp hơn
  for (let i = 0; i + 1 < Fs.length; i++) { const A = Fs[i], Bf = Fs[i + 1]; if (A.it.pose.r !== 'hold' || Bf.it.pose.l !== 'hold') continue;
    const [ax, ay] = shoulder(A, 1), [bx, by] = shoulder(Bf, -1), low = ay > by ? A : Bf, hy = Math.max(ay, by) + low.armL * .72; A.hR = Bf.hL = [(ax + bx) / 2, hy]; }
  const out = [], arms = [], over = []; let minX = Infinity, maxX = -Infinity, minY = GY;
  Fs.forEach((F, i) => {
    const uid = 'fc' + i + String(F.p?.id || '').replace(/[^a-z0-9]/gi, '').slice(0, 10);
    const sway = anim ? ` style="transform-origin:${F.x.toFixed(1)}px ${GY}px;animation-delay:${(i * .37 % 1.6).toFixed(2)}s"` : '';
    const pop = anim ? ` class="pp" style="transform-origin:${F.x.toFixed(1)}px ${GY}px;animation-delay:${i * 90}ms"` : '';
    let carryHTML = '';
    if (F.it.carry) { const Bb = F.it.carry, s2 = .62, bx = F.x + F.tw * .3, by = F.hip + 1; carryHTML = `<g transform="translate(${bx} ${by}) scale(${s2}) translate(${-bx} ${-(GY - 2)})">${bodyOf({ ...Bb }, bx, Bb.it?.face, uid + 'b')}</g>`; F.carryY = by - Bb.B.leg * s2; } // em bé ngồi trên tay, đầu ngang vai — không che mặt bố/mẹ
    const sideArm = side => {
      const pose = F.it.pose[side < 0 ? 'l' : 'r'], [sx, sy] = shoulder(F, side), L = F.armL;
      if (pose === 'hold') { const h = side < 0 ? F.hL : F.hR; if (h) return armPath(F, sx, sy, h[0], h[1]); }
      if (pose === 'wave') { const hx = sx + side * L * .62, hy = sy - L * .78; return `<g class="wv" style="transform-origin:${sx.toFixed(1)}px ${sy.toFixed(1)}px;${side < 0 ? '--d:-1;' : ''}animation-delay:${(i * .29 % .8).toFixed(2)}s">${armPath(F, sx, sy, hx, hy)}</g>`; }
      if (pose === 'carry') return armPath(F, sx, sy, F.x + F.tw * (side < 0 ? .1 : .62), F.carryY ?? F.neck + F.B.torso * .72);
      if (pose === 'shoulder') { const N = Fs[i + side]; if (N) { const [nx, ny] = shoulder(N, -side); over.push(`<g class="fp"${sway}>${armPath(F, sx, sy, nx + side * N.tw * .15, ny - N.armW * .5)}</g>`); return ''; } }
      if (pose === 'cane') { const hx = sx + side * F.B.hr * .55, hy = sy + L * .7; return `<path d="M${hx} ${hy - 4}q${side * 7} -6 ${side * 9} 2L${hx + side * 9} ${GY - 2}" stroke="#8a5a3c" stroke-width="3.4" fill="none" stroke-linecap="round"/>` + armPath(F, sx, sy, hx, hy); }
      return armPath(F, sx, sy, sx + side * F.armW * .5, sy + L * .92);
    };
    const back = F.it.pose.l === 'carry' ? '' : '';
    out.push(`<g${pop}><g class="fp"${sway}>${bodyOf(F, F.x, F.it.face, uid)}${carryHTML}${back}</g></g>`);
    arms.push(`<g${pop}><g class="fp"${sway}>${sideArm(-1)}${sideArm(1)}</g></g>`);
    minX = Math.min(minX, F.x - F.B.hr * 1.9); maxX = Math.max(maxX, F.x + F.B.hr * 1.9); minY = Math.min(minY, F.top, F.it.pose.l === 'wave' || F.it.pose.r === 'wave' ? F.shY - F.armL * 1.05 : GY);
  });
  const pad = 4, w = maxX - minX + pad * 2, top = minY - pad, h = GY + 8 - top;
  let vb = `${(minX - pad).toFixed(1)} ${top.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`;
  if (fit) { const W = Math.max(w, h * .75), H = W / .75, cx = (minX + maxX) / 2; vb = `${(cx - W / 2).toFixed(1)} ${(GY + 8 - H).toFixed(1)} ${W.toFixed(1)} ${H.toFixed(1)}`; return { inner: out.join('') + arms.join('') + over.join(''), vb, cx, gy: GY, h: H }; }
  return { inner: out.join('') + arms.join('') + over.join(''), vb, w, h };
}
// chibi đứng vẫy tay một mình (ghim "Bạn đang ở đây", cảnh một người)
export function chibiWaveSVG(p, { face = '', w = 120, me = null } = {}) {
  const sc = sceneSVG([{ p, face, pose: { l: 'down', r: 'wave' } }], { me, fit: true, anim: true });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${sc.vb}" width="${w}" height="${w * 4 / 3}" preserveAspectRatio="xMidYMax meet" class="chs">${sc.inner}</svg>`;
}
// CẢNH CẢ NHÀ: một hàng sát nhau [người lớn tuổi trái] Tôi · các con · bạn đời [người lớn tuổi phải];
// cạnh nhau thì nắm tay, vợ chồng đứng liền thì bá vai, em bé dưới 1 tuổi được bố/mẹ đứng cạnh bế; chỉ hai người ngoài cùng vẫy tay.
export function familySceneHTML(people, faces = new Map(), { me = null } = {}) {
  const role = p => roleOf(p), isP = p => ['vo', 'chong', 'ny'].includes(role(p)), mid = [], front = [], back = [];
  for (const p of people) { const r = role(p); if (r === 'me' || isP(p)) mid.push(p); else if (isChild(p) || (ageCat(ageOf(p, me)) !== 'adult' && ageCat(ageOf(p, me)) !== 'elder' && r !== 'bo' && r !== 'ma')) front.push(p); else back.push(p); }
  mid.sort((a, b) => (role(a) === 'me' ? 0 : 1) - (role(b) === 'me' ? 0 : 1));
  front.sort((a, b) => ageOf(b, me) - ageOf(a, me));
  const L = back.filter((_, j) => j % 2 === 0).reverse(), R = back.filter((_, j) => j % 2 === 1);
  let row = [...L, ...(mid[0] ? [mid[0]] : []), ...front, ...mid.slice(1), ...R].map(p => ({ p, face: faces.get(p.id) || '', pose: { l: 'hold', r: 'hold' } }));
  // em bé dưới 1 tuổi: bố/mẹ (Tôi hoặc bạn đời) đứng cạnh bế trên tay
  for (const it of row.slice()) { if (ageOf(it.p, me) >= 1) continue; const j = row.indexOf(it), nb = [row[j - 1], row[j + 1]].filter(x => x && (role(x.p) === 'me' || isP(x.p)) && !x.carry); const par = nb.find(x => (x.p.gender || chibiOf(x.p).g) === 'f') || nb[0];
    if (par) { par.carry = { ...figure(it.p, me), it }; par.pose = { l: 'carry', r: 'carry' }; row.splice(j, 1); } }
  const n = row.length;
  if (n === 1) row[0].pose = { l: row[0].carry ? 'carry' : 'down', r: row[0].carry ? 'carry' : 'wave' };
  if (n > 1) row.forEach((it, j) => {
    if (it.carry) return;
    if (j === 0) it.pose.l = (role(it.p) === 'ong' && ageCat(ageOf(it.p, me)) === 'elder') ? 'cane' : 'wave';
    if (j === n - 1 && n > 1) it.pose.r = (role(it.p) === 'ong' && ageCat(ageOf(it.p, me)) === 'elder') ? 'cane' : 'wave';
  });
  for (let j = 0; j + 1 < n; j++) { const A = row[j], B = row[j + 1];
    if (A.carry || B.carry) { if (!A.carry && A.pose.r === 'hold') A.pose.r = 'down'; if (!B.carry && B.pose.l === 'hold') B.pose.l = 'down'; continue; }
    const pair = (role(A.p) === 'me' && isP(B.p)) || (isP(A.p) && role(B.p) === 'me');
    if (pair) { const ha = figure(A.p, me).top, hb = figure(B.p, me).top; if (ha <= hb) { A.pose.r = 'shoulder'; B.pose.l = 'down'; } else { B.pose.l = 'shoulder'; A.pose.r = 'down'; } } }
  const sc = sceneSVG(row, { me, anim: true });
  return `<div class="fam-scene${n === 1 ? ' solo' : ''}" role="img" aria-label="Cả nhà đứng sát nhau, nắm tay, vẫy chào"><svg xmlns="http://www.w3.org/2000/svg" viewBox="${sc.vb}" preserveAspectRatio="xMidYMax meet" class="chs">${sc.inner}</svg></div>`;
}
