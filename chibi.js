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
// chibi mặc định theo vai trò / giới tính (ai chưa tự chọn)
export function defaultChibi(p) {
  const r = roleOf(p), g = p?.gender || ({ bo: 'm', ong: 'm', anh: 'm', chong: 'm', ma: 'f', ba: 'f', chi: 'f', vo: 'f' }[r]) || 'm';
  const old = r === 'ong' || r === 'ba', seed = [...String(p?.id || 'x')].reduce((a, c) => a + c.charCodeAt(0), 0);
  return { g, h: g === 'f' ? [4, 5, 6, 7][seed % 4] : [0, 1, 2, 3][seed % 4], hc: old ? '#b9b4c4' : HAIR_COLORS[seed % 2], sc: p?.color || SHIRTS[seed % SHIRTS.length], sk: 0, acc: old ? 'glasses' : isChild(p) ? (p?.gender === 'f' ? 'bow' : '') : '' };
}
export const chibiOf = p => ({ ...defaultChibi(p), ...(p?.chibi || {}) });
const shade = (h, t) => { const n = parseInt(h.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(t < 0 ? v * (1 + t) : v + (255 - v) * t)); return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); };

// phần thân + đầu (toạ độ khung 120 × 160; đầu tâm (60,54) bán kính 38)
function parts(c) {
  const hc = c.hc, hd = shade(hc, -.25), sk = SKINS[c.sk || 0], skd = shade(sk, -.12), sc = c.sc, scd = shade(sc, -.2), f = c.g === 'f';
  let back = '', front = '';
  switch (+c.h) {
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
    <ellipse cx="37" cy="72" rx="6" ry="3.6" fill="#ff9fb5" opacity=".75"/><ellipse cx="83" cy="72" rx="6" ry="3.6" fill="#ff9fb5" opacity=".75"/><path d="M54 73q6 6 12 0" stroke="#3a2433" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  const head = `${back}<circle cx="60" cy="56" r="37" fill="${sk}"/><ellipse cx="23" cy="60" rx="5.5" ry="7" fill="${skd}"/><ellipse cx="97" cy="60" rx="5.5" ry="7" fill="${skd}"/>${front}${face}`;
  const body = `<path d="M40 118c0-14 9-24 20-24s20 10 20 24v14H40z" fill="${sc}" stroke="rgba(60,30,60,.12)" stroke-width="1.2"/><path d="M52 95l8 8 8-8" fill="${shade(sc, .35)}"/>
    <rect x="31" y="102" width="11" height="24" rx="5.5" fill="${sc}" transform="rotate(14 36 104)"/><rect x="78" y="102" width="11" height="24" rx="5.5" fill="${sc}" transform="rotate(-14 84 104)"/>
    <circle cx="33" cy="126" r="5.5" fill="${sk}"/><circle cx="87" cy="126" r="5.5" fill="${sk}"/>
    <rect x="45" y="130" width="12" height="18" rx="5" fill="${scd}"/><rect x="63" y="130" width="12" height="18" rx="5" fill="${scd}"/><ellipse cx="51" cy="149" rx="8" ry="4.5" fill="#4a3442"/><ellipse cx="69" cy="149" rx="8" ry="4.5" fill="#4a3442"/>`;
  let accB = '', accF = '';
  switch (c.acc) {
    case 'glasses': accF = `<g fill="none" stroke="#3a2433" stroke-width="2.4"><circle cx="46" cy="62" r="9.5"/><circle cx="74" cy="62" r="9.5"/><path d="M55.5 62h9"/></g>`; break;
    case 'helmet': accF = `<path d="M20 46c2-22 18-34 40-34s38 12 40 34z" fill="#ffc94a"/><rect x="16" y="42" width="88" height="8" rx="4" fill="#f2a92a"/><rect x="56" y="12" width="8" height="30" rx="3" fill="#f2a92a"/>`; break;
    case 'steth': accF = `<path d="M47 96c-4 10-2 20 6 24M73 96c4 10 2 20-6 24" stroke="#5b6b8c" stroke-width="2.6" fill="none"/><circle cx="60" cy="122" r="4.5" fill="#9fb2d6" stroke="#5b6b8c" stroke-width="2"/>`; break;
    case 'bag': accB = `<rect x="76" y="98" width="22" height="28" rx="6" fill="#ff6f6f"/>`; accF = `<path d="M70 96l10 26" stroke="#d94f4f" stroke-width="3.5"/>`; break;
    case 'grad': accF = `<path d="M60 8 98 22 60 36 22 22z" fill="#2f2a44"/><rect x="40" y="24" width="40" height="10" rx="3" fill="#2f2a44"/><path d="M96 22v16" stroke="#ffd36b" stroke-width="2.4"/><circle cx="96" cy="40" r="3" fill="#ffd36b"/>`; break;
    case 'tie': accF = `<path d="M57 98h6l3 6-6 22-6-22z" fill="#3c4f9c"/>`; break;
    case 'apron': accF = `<path d="M46 106h28v26H46z" fill="#fff" opacity=".92"/><path d="M46 106l-4-8M74 106l4-8" stroke="#fff" stroke-width="2.5"/><rect x="54" y="116" width="12" height="7" rx="2" fill="#ffd0e0"/>`; break;
    case 'book': accF = `<rect x="78" y="112" width="22" height="16" rx="2" fill="#5fc8ff" transform="rotate(-12 89 120)"/><path d="M80 116l18-4" stroke="#fff" stroke-width="1.6" transform="rotate(-12 89 120)"/>`; break;
    case 'laptop': accF = `<rect x="40" y="114" width="40" height="22" rx="3" fill="#c9cfe0"/><rect x="43" y="117" width="34" height="15" rx="2" fill="#6f8dff"/><circle cx="60" cy="124" r="2.5" fill="#fff"/>`; break;
    case 'brush': accF = `<path d="M88 128 104 100" stroke="#a0673a" stroke-width="3.2" stroke-linecap="round"/><path d="M103 102l4-7 3 3z" fill="#ff6fa5"/><circle cx="28" cy="122" r="9" fill="#ffe7b0"/><circle cx="25" cy="119" r="2" fill="#ff6f6f"/><circle cx="31" cy="121" r="2" fill="#5fc8ff"/><circle cx="27" cy="126" r="2" fill="#7fd6a4"/>`; break;
    case 'case': accF = `<rect x="80" y="118" width="24" height="18" rx="3" fill="#8a5a3c"/><path d="M87 118v-4h10v4" stroke="#6b4329" stroke-width="2.4" fill="none"/>`; break;
    case 'hat': accF = `<path d="M22 44c2-22 18-32 38-32s36 10 38 32z" fill="#ff8a78"/><rect x="18" y="40" width="84" height="10" rx="5" fill="#fff"/><circle cx="60" cy="10" r="7" fill="#fff"/>`; break;
    case 'bow': accF = `<path d="M60 22l-14-8v16zM60 22l14-8v16z" fill="#ff5f9e"/><circle cx="60" cy="22" r="4" fill="#ff8fbf"/>`; break;
  }
  return { body: accB + body, head, accF };
}
// toàn thân (dùng ở màn làm quen, hồ sơ, ghim trên sa bàn)
export function chibiSVG(p, { bg = false, w = 120 } = {}) {
  const c = chibiOf(p), P = parts(c);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160" width="${w}" height="${w * 4 / 3}">${bg ? `<circle cx="60" cy="82" r="60" fill="${shade(c.sc, .6)}"/>` : ''}<ellipse cx="60" cy="152" rx="30" ry="6" fill="rgba(0,0,0,.14)"/>${P.body}${P.head}${P.accF}</svg>`;
}
// avatar tròn (nửa người, nền màu riêng)
export function chibiAvatarSVG(p) {
  const c = chibiOf(p), P = parts(c), bg = p?.color || c.sc;
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

// v1.8.0 — chibi VẪY TAY cho cảnh cả nhà: tay phải giơ lên (nhóm .arm xoay quanh vai bằng CSS), đầu có thể thay bằng ảnh thật cắt tròn
export function chibiWaveSVG(p, { face = '', w = 120 } = {}) {
  const c = chibiOf(p), P = parts(c), sc = c.sc, sk = SKINS[c.sk || 0], uid = 'f' + String(p?.id || Math.random()).replace(/[^a-z0-9]/gi, '');
  const body = P.body.replace(/<rect x="78" y="102"[^>]*\/>/, '').replace(/<circle cx="87" cy="126"[^>]*\/>/, '');
  const arm = `<g class="arm"><g transform="rotate(32 84 104)"><rect x="78.5" y="78" width="11" height="28" rx="5.5" fill="${sc}"/><circle cx="84" cy="77" r="6" fill="${sk}"/></g></g>`;
  const head = face ? `<defs><clipPath id="${uid}"><circle cx="60" cy="56" r="35"/></clipPath></defs><circle cx="60" cy="56" r="38.5" fill="#fff"/><image href="${face}" x="25" y="21" width="70" height="70" preserveAspectRatio="xMidYMid slice" clip-path="url(#${uid})"/>` : P.head + P.accF;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160" width="${w}" height="${w * 4 / 3}"><ellipse cx="60" cy="152" rx="30" ry="6" fill="rgba(0,0,0,.14)"/>${body}${arm}${head}</svg>`;
}
// bố trí cảnh cả nhà: Tôi + bạn đời ở giữa, con đứng trước (nhỏ hơn), bố mẹ / ông bà / anh chị em hai bên phía sau.
// people: đã sắp xếp; faces: Map id → URL ảnh thật (nếu có). Trả HTML (div định vị theo %, tự co theo số người 1–8+).
export function familySceneHTML(people, faces = new Map(), { me = null } = {}) {
  const role = p => roleOf(p), mid = [], front = [], back = [];
  for (const p of people) { const r = role(p); if (r === 'me' || r === 'vo' || r === 'chong' || r === 'ny') mid.push(p); else if (isChild(p)) front.push(p); else back.push(p); }
  mid.sort((a, b) => (role(a) === 'me' ? 0 : 1) - (role(b) === 'me' ? 0 : 1));
  const out = [], n = people.length, k = n <= 3 ? 1 : n <= 5 ? .9 : n <= 7 ? .8 : .7;
  const fig = (p, x, bottom, h, z, i) => out.push(`<div class="fs-p" style="left:${Math.max(10, Math.min(90, x)).toFixed(1)}%;bottom:${bottom}%;height:${(h * k).toFixed(1)}%;z-index:${z};--i:${i};--b:${((i * 0.37) % 1).toFixed(2)}s;--w:${(0.15 + (i * 0.53) % 1 * .5).toFixed(2)}s"><div class="fs-b">${chibiWaveSVG(p, { face: faces.get(p.id) || '' })}</div></div>`);
  let i = 0;
  // giữa: Tôi (+ bạn đời)
  const mx = mid.length === 1 ? [50] : mid.length === 2 ? [39, 61] : mid.map((_, j) => 50 + (j - (mid.length - 1) / 2) * 16);
  // sau: chia hai bên
  const L = back.filter((_, j) => j % 2 === 0), R = back.filter((_, j) => j % 2 === 1), span = Math.max(1, Math.max(L.length, R.length));
  const step = Math.min(13, 26 / span), side = mid.length > 1 ? 19 : 30;
  L.forEach((p, j) => fig(p, side - j * step, 26, 58, 1, i++)); R.forEach((p, j) => fig(p, 100 - side + j * step, 26, 58, 1, i++));
  mid.forEach((p, j) => fig(p, mx[j], 14, 70, 2, i++));
  // trước: con, cháu (nhỏ hơn)
  const fx = front.map((_, j) => 50 + (j - (front.length - 1) / 2) * Math.min(15, 60 / Math.max(1, front.length)));
  front.forEach((p, j) => fig(p, fx[j], 2, 46, 3, i++));
  return `<div class="fam-scene${n === 1 ? ' solo' : ''}" role="img" aria-label="Cả nhà đang vẫy tay chào">${out.join('')}</div>`;
}
