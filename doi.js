// Hành Trình Của Bạn — "đời người": hồ sơ Tôi, vai trò người thân, chương đời, cột mốc người lớn,
// ngày ước chừng cho ảnh cũ, loại kỷ niệm. Thuần dữ liệu (không đụng giao diện) để dùng chung ở mọi màn.
import { solar2lunar } from './hoso-data.js';

const pad = n => String(n).padStart(2, '0');
const ymdOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const pYmd = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3], 12).getTime() : null; };
const day0 = ts => { const d = new Date(ts); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };

// ---------- vai trò ----------
// child: có tuổi tháng, cột mốc trẻ em, hồ sơ lúc chào đời; partner: ngày quen + ngày cưới; elder: có mặt từ khi bạn chào đời
export const ROLES = [
  { v: 'me', t: 'Tôi' },
  { v: 'con', t: 'Con', child: 1 }, { v: 'chau', t: 'Cháu', child: 1 },
  { v: 'vo', t: 'Vợ', partner: 1 }, { v: 'chong', t: 'Chồng', partner: 1 }, { v: 'ny', t: 'Người yêu', partner: 1 },
  { v: 'bo', t: 'Bố', elder: 1 }, { v: 'ma', t: 'Mẹ', elder: 1 }, { v: 'ong', t: 'Ông', elder: 1 }, { v: 'ba', t: 'Bà', elder: 1 },
  { v: 'anh', t: 'Anh', elder: 1 }, { v: 'chi', t: 'Chị', elder: 1 }, { v: 'em', t: 'Em' },
  { v: 'ban', t: 'Bạn thân' }, { v: 'khac', t: 'Người thân' }
];
const R = v => ROLES.find(r => r.v === v);
export const roleOf = p => p?.role || 'con'; // bé tạo từ các bản cũ = Con
export const isMe = p => roleOf(p) === 'me';
export const isChild = p => !!R(roleOf(p))?.child;
export const isPartner = p => !!R(roleOf(p))?.partner;
export const isElder = p => !!R(roleOf(p))?.elder;
export const roleName = p => { const r = roleOf(p); if (r === 'con' && p?.gender) return p.gender === 'f' ? 'Con gái' : 'Con trai'; if (r === 'chau' && p?.gender) return p.gender === 'f' ? 'Cháu gái' : 'Cháu trai'; return R(r)?.t || 'Người thân'; };
export const showsAge = p => isChild(p) || isMe(p) || !!p?.showAge; // người lớn: mặc định ẩn tuổi
export const findMe = ps => (ps || []).find(isMe) || null;
// thứ tự hiển thị: Tôi → bạn đời → con → cháu → bố mẹ, ông bà → anh chị em → còn lại
const ORDER = ['me', 'vo', 'chong', 'ny', 'con', 'chau', 'bo', 'ma', 'ong', 'ba', 'anh', 'chi', 'em', 'ban', 'khac'];
export const sortPeople = ps => ps.slice().sort((a, b) => ORDER.indexOf(roleOf(a)) - ORDER.indexOf(roleOf(b)) || (a.birth || '9').localeCompare(b.birth || '9') || (a.created || 0) - (b.created || 0));

// ngày người này bước vào đời bạn (ymd): con/cháu/em = ngày sinh; bạn đời/bạn = ngày quen (hoặc ngày cưới); bố mẹ, ông bà, anh chị = từ khi bạn chào đời
export function sinceOf(p, me) {
  if (!p) return null;
  if (isMe(p)) return p.birth || null;
  if (p.since) return p.since;
  if (isChild(p) || roleOf(p) === 'em') return p.birth || null;
  if (isPartner(p)) return p.wed || null;
  if (isElder(p)) return me?.birth || null;
  return null;
}
// mốc bắt đầu dải của một người trên dòng thời gian riêng của họ
export const anchorOf = (p, me) => isChild(p) || isMe(p) ? p.birth || null : sinceOf(p, me) || p.birth || null;

// ---------- chương đời ----------
export const CHAPTERS = [
  { k: 'tho', t: 'Tuổi thơ', age: 0, c: '#ffae42', ic: '🧸' },
  { k: 'hoc', t: 'Đi học', age: 6, c: '#3fb6f2', ic: '🎒' },
  { k: 'tre', t: 'Tuổi trẻ', age: 18, c: '#9a7bff', ic: '🎸' },
  { k: 'nghiep', t: 'Lập nghiệp', age: 22, c: '#22bfa0', ic: '💼' },
  { k: 'yeu', t: 'Tình yêu & cưới', c: '#ff5f9e', ic: '💞' },
  { k: 'chame', t: 'Làm cha mẹ', c: '#ff8c5a', ic: '🍼' },
  { k: 'trung', t: 'Trung niên', age: 45, c: '#4f86ef', ic: '🌳' },
  { k: 'vang', t: 'Tuổi vàng', age: 60, c: '#e6b23c', ic: '🌅' }
];
export const CH_COLORS = ['#ffae42', '#3fb6f2', '#9a7bff', '#22bfa0', '#ff5f9e', '#ff8c5a', '#4f86ef', '#e6b23c', '#e0607e', '#56c271'];
const addYears = (ymd, n) => { const t = pYmd(ymd); if (!t) return null; const d = new Date(t); d.setFullYear(d.getFullYear() + n); return ymdOf(d); };
// cfg = meta 'chapters' = { edits: { <khoá>: { title, start, hidden, cover, c } }, custom: [{ id, title, start, c, ic, cover }] }
export function chaptersOf(me, people, cfg, now = Date.now()) {
  if (!me?.birth) return [];
  const E = cfg?.edits || {}, out = [];
  const firstOf = list => list.filter(Boolean).sort()[0] || null;
  for (const c of CHAPTERS) {
    let start = null;
    if (c.age != null) start = addYears(me.birth, c.age);
    if (c.k === 'nghiep') { const j = (me.jobs || []).filter(j => j.from && !/học sinh|sinh viên|nghỉ hưu/i.test(j.job)).map(j => j.from).sort()[0]; if (j) start = `${j}-01-01`; }
    if (c.k === 'vang') { const r = (me.jobs || []).find(j => j.from && /nghỉ hưu|hưu/i.test(j.job)); if (r) start = `${r.from}-01-01`; }
    else if (c.k === 'yeu') start = firstOf(people.filter(isPartner).map(p => p.since || p.wed));
    else if (c.k === 'chame') start = firstOf(people.filter(p => roleOf(p) === 'con').map(p => p.birth));
    const e = E[c.k] || {};
    if (e.start) start = e.start;
    if (!start || e.hidden) continue;
    out.push({ key: c.k, title: e.title || c.t, start, c: e.c || c.c, ic: c.ic, cover: e.cover || null, auto: !e.start, edited: !!(e.title || e.start || e.c) });
  }
  for (const x of cfg?.custom || []) if (x.start && !x.hidden) out.push({ key: 'c:' + x.id, title: x.title || 'Chương mới', start: x.start, c: x.c || '#e0607e', ic: x.ic || '✨', cover: x.cover || null, custom: true });
  const list = out.map(c => ({ ...c, ts: day0(pYmd(c.start)) })).filter(c => c.ts <= now).sort((a, b) => a.ts - b.ts || CHAPTERS.findIndex(x => x.k === a.key) - CHAPTERS.findIndex(x => x.k === b.key));
  list.forEach((c, i) => { c.num = i + 1; c.end = list[i + 1]?.ts ?? null; });
  return list;
}
export const chapterAt = (chs, ts) => { let r = null; for (const c of chs) if (c.ts <= ts) r = c; return r; };
export function ageAt(birth, ts) { const b = pYmd(birth); if (!b) return null; const a = new Date(b), d = new Date(ts); let y = d.getFullYear() - a.getFullYear(); if (d.getMonth() < a.getMonth() || (d.getMonth() === a.getMonth() && d.getDate() < a.getDate())) y--; return y; }

// ---------- cột mốc người lớn (đánh dấu tay cho một sự kiện) ----------
export const MILES = [
  { k: 'totnghiep', t: 'Tốt nghiệp', ic: '🎓' }, { k: 'vieclam', t: 'Việc làm đầu tiên', ic: '💼' }, { k: 'muanha', t: 'Mua nhà', ic: '🏡' },
  { k: 'cuoi', t: 'Đám cưới', ic: '💍' }, { k: 'conchaodoi', t: 'Con chào đời', ic: '👶' }, { k: 'ongba', t: 'Lên chức ông bà', ic: '👵' },
  { k: 'nghihuu', t: 'Nghỉ hưu', ic: '🌅' }, { k: 'xe', t: 'Chiếc xe đầu tiên', ic: '🚗' }, { k: 'chuyennha', t: 'Chuyển nhà', ic: '📦' },
  { k: 'thangchuc', t: 'Thăng chức', ic: '📈' }, { k: 'khac', t: 'Cột mốc khác', ic: '⭐' }
];
export const mileOf = k => MILES.find(x => x.k === k) || null;

// ---------- ngày ước chừng (ảnh cũ chụp lại từ ảnh giấy) ----------
// m.approx = 'y' (chỉ biết năm) | 's' (mùa) | 'm' (tháng); không có = biết đúng ngày. ts đặt ở giữa khoảng để xếp đúng chỗ.
export const SEASONS = [{ k: 'xuan', t: 'Mùa xuân', m: 2 }, { k: 'ha', t: 'Mùa hè', m: 5 }, { k: 'thu', t: 'Mùa thu', m: 8 }, { k: 'dong', t: 'Mùa đông', m: 11 }];
export const PRECS = [{ v: 'd', t: 'Đúng ngày' }, { v: 'm', t: 'Tháng' }, { v: 's', t: 'Mùa' }, { v: 'y', t: 'Chỉ biết năm' }];
export function approxTs(prec, y, x, keep) {
  const k = keep != null ? new Date(keep) : null, h = k ? k.getHours() : 12, mi = k ? k.getMinutes() : 0, s = k ? k.getSeconds() : 0;
  if (prec === 'y') return new Date(y, 6, 1, h, mi, s).getTime();
  if (prec === 's') return new Date(y, (SEASONS.find(q => q.k === x) || SEASONS[1]).m, 15, h, mi, s).getTime();
  if (prec === 'm') return new Date(y, +x, 15, h, mi, s).getTime();
  return null;
}
export const seasonOfMonth = mo => mo === 0 ? 'dong' : SEASONS.slice().reverse().find(q => mo >= q.m - 1)?.k || 'dong';
export function approxLabel(approx, ts, lower) {
  const d = new Date(ts); let s = '';
  if (approx === 'y') s = `Khoảng năm ${d.getFullYear()}`;
  else if (approx === 's') { const q = SEASONS.find(x => x.k === seasonOfMonth(d.getMonth())); s = `${q.t} ${d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear()}`; }
  else if (approx === 'm') s = `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
  return lower && s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

// ---------- loại kỷ niệm ----------
export const TYPES = [
  { k: 'trip', t: 'Chuyến đi', ic: '🧳', c: '#14b8a6' },
  { k: 'tet', t: 'Lễ Tết', ic: '🎉', c: '#f43f5e' },
  { k: 'bday', t: 'Sinh nhật', ic: '🎂', c: '#ec6fae' },
  { k: 'wed', t: 'Kỷ niệm cưới', ic: '💍', c: '#a855f7' },
  { k: 'meet', t: 'Họp mặt', ic: '👨‍👩‍👧', c: '#f59e0b' },
  { k: 'mile', t: 'Cột mốc', ic: '🌟', c: '#eab308' },
  { k: 'school', t: 'Trường lớp', ic: '🏫', c: '#3b82f6' },
  { k: 'daily', t: 'Thường ngày', ic: '☕', c: '#94a3b8' }
];
export const typeOf = k => TYPES.find(t => t.k === k) || TYPES[TYPES.length - 1];
// ngày lễ theo âm lịch / dương lịch của một ngày (ymd) → tên lễ hoặc null
export function holidayOf(ymd) {
  const t = pYmd(ymd); if (!t) return null; const d = new Date(t), dd = d.getDate(), mm = d.getMonth() + 1;
  const L = solar2lunar(dd, mm, d.getFullYear());
  if (!L.leap && L.m === 1 && L.d <= 5) return 'Tết Nguyên Đán';
  if (!L.leap && L.m === 12 && L.d >= 29) return 'Tết Nguyên Đán'; // 29, 30 Tết
  if (!L.leap && L.m === 8 && L.d >= 14 && L.d <= 16) return 'Trung thu';
  if (mm === 12 && (dd === 24 || dd === 25)) return 'Giáng sinh';
  if (mm === 1 && dd === 1) return 'Năm mới';
  if (mm === 6 && dd === 1) return 'Quốc tế thiếu nhi';
  if (mm === 9 && dd === 5) return 'Khai giảng';
  return null;
}
const KW = [
  ['wed', /cưới|kỷ niệm (\d+ )?năm ngày cưới|ăn hỏi|đính hôn/i], ['bday', /sinh nhật|thôi nôi/i], ['tet', /tết|trung thu|giáng sinh|noel|lễ hội|năm mới|countdown/i],
  ['school', /khai giảng|bế giảng|tốt nghiệp|trường|lớp học|họp phụ huynh|ra trường|nhập học/i],
  ['meet', /họp mặt|họp lớp|đoàn tụ|giỗ|liên hoan|tất niên|sum họp|họp họ|đám/i],
  ['trip', /chuyến đi|du lịch|đi biển|phượt|cắm trại|về quê|nghỉ mát|đi chơi xa|tour/i]
];
// e: sự kiện (title, days, mile, kids, approx); ctx: { wedDays: Set('MM-DD') }
export function guessType(e, ctx = {}) {
  if (e.mile) { const k = e.mile.k; if (k === 'bday' || k === 'thoinoi' || k === 'mybday' || k === 'pbday') return 'bday'; if (k === 'wed' || k === 'wedann') return 'wed'; return 'mile'; }
  if (e.lifeMile) return e.lifeMile === 'cuoi' ? 'wed' : 'mile';
  const t = e.title || '';
  for (const [k, re] of KW) if (re.test(t)) return k;
  if (!e.approx) {
    const h = e.days.map(holidayOf).find(Boolean);
    if (h) return h === 'Khai giảng' ? 'school' : 'tet';
    if (ctx.wedDays && e.days.some(d => ctx.wedDays.has(d.slice(5)))) return 'wed';
    if (e.days.length >= 2) { const a = pYmd(e.days[0]), b = pYmd(e.days[e.days.length - 1]); if (b - a <= 14 * 864e5) return 'trip'; }
  }
  if ((e.kids?.length || 0) >= 4) return 'meet';
  return 'daily';
}
