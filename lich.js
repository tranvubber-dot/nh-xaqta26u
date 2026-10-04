// Hành Trình Của Bạn — LỊCH KỶ NIỆM: sinh nhật mọi người (dương + âm), ngày cưới, ngày tự thêm, Tết, Trung thu → xem sắp tới + xuất .ics.
import { icon, haptic } from './ui.js';
import { lunar2solar, solar2lunar, lunarBirthday, LUNAR_MONTH } from './hoso-data.js';
import { isMe, isPartner, roleName } from './doi.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const day0 = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
// các ngày sắp tới trong 12 tháng: [{ date, title, sub, emo, kind, person, uid, ics }]
export function upcoming(people, anniv = [], now = new Date()) {
  const T = day0(now), out = [], Y = T.getFullYear();
  const nextSolar = (m, d) => { let x = new Date(Y, m - 1, d); if (x < T) x = new Date(Y + 1, m - 1, d); return x; };
  const nextLunar = (ld, lm) => { for (let ly = Y - 1; ly <= Y + 1; ly++) { const s = lunarBirthday(ld, lm, ly); if (!s) continue; const x = new Date(s.y, s.m - 1, s.d); if (x >= T) return { x, ly }; } return null; };
  for (const p of people) {
    const nm = isMe(p) ? 'bạn' : p.name;
    if (p.birth && !p.birthApprox) { const [by, bm, bd] = p.birth.split('-').map(Number);
      const s = nextSolar(bm, bd), age = s.getFullYear() - by; if (age >= 0) out.push({ date: s, title: `Sinh nhật ${age} tuổi của ${nm}`, sub: isMe(p) ? 'dương lịch' : `${roleName(p)} · dương lịch`, emo: '🎂', kind: 'bday', person: p });
      if (p.birthLunar) { const L = p.birthLunar, n = nextLunar(L.d, L.m); if (n) out.push({ date: n.x, title: `Sinh nhật âm lịch của ${nm}`, sub: `ngày ${L.d} tháng ${LUNAR_MONTH(L.m)}`, emo: '🏮', kind: 'lbday', person: p }); } }
    if (isPartner(p) && p.wed) { const [wy, wm, wd] = p.wed.split('-').map(Number), x = nextSolar(wm, wd), n = x.getFullYear() - wy; if (n >= 1) out.push({ date: x, title: `Kỷ niệm ${n} năm ngày cưới`, sub: `bạn và ${p.name}`, emo: '💍', kind: 'wed', person: p, ics: { uid: `wed-${p.id}`, date: [wy + 1, wm, wd], title: `💍 Kỷ niệm ngày cưới (bạn và ${p.name})`, desc: `Cưới ngày ${wd}/${wm}/${wy}.`, yearly: true } }); }
  }
  for (const a of anniv) { if (!a.date) continue; const [ay, am, ad] = a.date.split('-').map(Number);
    if (a.lunar) { const L = solar2lunar(ad, am, ay), n = nextLunar(L.d, L.m); if (n) out.push({ date: n.x, title: a.title, sub: `âm lịch ${L.d}/${L.m} · ${n.ly - L.y} năm`, emo: a.emo || '🕯️', kind: 'anniv', a }); }
    else { const x = nextSolar(am, ad), n = x.getFullYear() - ay; out.push({ date: x, title: a.title, sub: n >= 1 ? `${n} năm` : '', emo: a.emo || '⭐', kind: 'anniv', a, ics: { uid: `anniv-${a.id}`, date: [ay, am, ad], title: `${a.emo || '⭐'} ${a.title}`, desc: '', yearly: true } }); } }
  for (const [ld, lm, t, emo] of [[1, 1, 'Tết Nguyên Đán', '🧧'], [15, 8, 'Tết Trung thu', '🥮']]) { for (let ly = Y - 1; ly <= Y + 1; ly++) { const s = lunar2solar(ld, lm, ly); if (!s) continue; const x = new Date(s.y, s.m - 1, s.d); if (x >= T) { out.push({ date: x, title: t, sub: `${ld}/${lm} âm lịch`, emo, kind: 'tet' }); break; } } }
  return out.filter(x => (x.date - T) / 864e5 <= 366).sort((a, b) => a.date - b.date);
}
// sự kiện .ics: ngày âm tính sẵn nhiều năm (lịch điện thoại không lặp được theo âm lịch)
export function icsExtras(people, anniv, years = 15, now = new Date()) {
  const Y = now.getFullYear(), out = [];
  for (const x of upcoming(people, anniv, now)) if (x.ics) out.push(x.ics);
  for (const a of anniv) if (a.lunar && a.date) { const [ay, am, ad] = a.date.split('-').map(Number), L = solar2lunar(ad, am, ay); for (let ly = Y; ly < Y + years; ly++) { const s = lunarBirthday(L.d, L.m, ly); if (s) out.push({ uid: `anniv-${a.id}-${ly}`, date: [s.y, s.m, s.d], title: `${a.emo || '🕯️'} ${a.title}`, desc: `Âm lịch ${L.d}/${L.m}.` }); } }
  for (const [ld, lm, t, k] of [[1, 1, '🧧 Tết Nguyên Đán', 'tet'], [15, 8, '🥮 Tết Trung thu', 'trungthu']]) for (let ly = Y; ly < Y + years; ly++) { const s = lunar2solar(ld, lm, ly); if (s) out.push({ uid: `${k}-${ly}`, date: [s.y, s.m, s.d], title: t, desc: '' }); }
  return out;
}

export function initLich(A) {
  document.body.insertAdjacentHTML('beforeend', `<div class="modal gsheet" id="mCal"><div class="card glass"><h2>📅 Lịch kỷ niệm</h2><p class="lead">Sinh nhật mọi người, ngày cưới, ngày bạn tự thêm, Tết, Trung thu — trong 12 tháng tới.</p><div class="cal-l"></div>
    <div class="foot"><button id="calAdd">${icon('plus', 16, 2.2)}<span>Thêm ngày kỷ niệm</span></button><button class="primary" id="calIcs">${icon('calendar', 16, 2)}<span>Thêm tất cả vào Lịch</span></button></div></div></div>`);
  const M = document.getElementById('mCal');
  const anniv = async () => (await A.metaGet('anniv')) || [];
  async function render() {
    const L = upcoming(A.people(), await anniv()), T = day0(new Date());
    M.querySelector('.cal-l').innerHTML = L.length ? L.map((x, i) => { const d = Math.round((day0(x.date) - T) / 864e5); return `<div class="cal-r${d === 0 ? ' today' : ''}" style="--d:${Math.min(i, 10) * 40}ms"${x.a ? ` data-an="${x.a.id}"` : ''}><span class="cal-e">${x.emo}</span><span class="cal-t"><b>${esc(x.title)}</b><small>${x.date.getDate()}/${x.date.getMonth() + 1}/${x.date.getFullYear()}${x.sub ? ' · ' + esc(x.sub) : ''}</small></span><span class="cal-c">${d === 0 ? 'Hôm nay!' : d === 1 ? 'Ngày mai' : `còn ${d} ngày`}</span></div>`; }).join('') : '<p class="lead">Chưa có ngày nào — thêm ngày sinh cho mọi người nhé.</p>';
  }
  M.querySelector('.cal-l').addEventListener('click', async e => { const r = e.target.closest('[data-an]'); if (!r) return; const id = r.dataset.an; A.contextMenu({ at: r, title: 'Ngày kỷ niệm', items: [{ icon: 'trash', label: 'Xoá ngày này', danger: true, act: async () => { await A.metaSet('anniv', (await anniv()).filter(a => a.id !== id)); render(); } }] }); });
  document.getElementById('calAdd').onclick = async () => {
    const t = (await A.prompt('Tên ngày kỷ niệm (vd “Ngày quen nhau”, “Giỗ ông nội”)', '', 50))?.trim(); if (!t) return;
    const d = await A.prompt('Ngày (dương lịch — nếu là ngày âm như giỗ, chọn ngày dương của một năm bất kỳ trùng ngày âm đó)', '', 10, 'date'); if (!d || !A.parseYmd(d)) return;
    const lunar = /giỗ|gio|rằm|âm/i.test(t) ? await A.ask('Tính theo âm lịch?', 'Ngày giỗ thường tính theo âm lịch — mỗi năm rơi vào một ngày dương khác nhau.', 'Âm lịch', false, 'Dương lịch') : false;
    const a = { id: Date.now().toString(36), title: t, date: d, lunar: !!lunar, emo: /giỗ/i.test(t) ? '🕯️' : /quen|yêu|cưới/i.test(t) ? '💞' : '⭐' };
    await A.metaSet('anniv', [...(await anniv()), a]); haptic(10); render(); A.toast('Đã thêm ' + t, 1600);
  };
  document.getElementById('calIcs').onclick = async () => { const ps = A.people(); const extra = icsExtras(ps, await anniv()); A.closeModal(M); await A.deliverICS(ps.filter(p => p.birth && !p.birthApprox), { solar: true, lunar: ps.some(p => p.birthLunar), lunarMarked: true, miles: false, alarms: ['d0', 'd1'], extra }); };
  return { open: async () => { await render(); A.openModal(M); }, upcoming: async () => upcoming(A.people(), await anniv()) };
}
