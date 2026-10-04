// Hành Trình Của Bạn — 💌 THƯ GỬI TƯƠNG LAI: viết thư cho chính mình hoặc người thân, niêm phong tới ngày mở.
// Lưu trong meta 'sy:letters' (đồng bộ Drive như dữ liệu khác). Tới ngày thì app nhắc bằng một dải nhỏ (không bật hộp thoại),
// có thể thêm nhắc vào app Lịch (.ics). Niêm phong là khoá trong app: trước ngày mở không hiện nội dung.
import { icon, haptic } from './ui.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dmyS = s => s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '';
const today = () => ymd(new Date());
const daysTo = s => Math.round((new Date(s + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 864e5);
const addY = (n, from = new Date()) => { const d = new Date(from); d.setFullYear(d.getFullYear() + n); return ymd(d); };

export function initLetters(A) {
  document.body.insertAdjacentHTML('beforeend', `<div class="modal gsheet" id="mLet"><div class="card glass">
    <h2 class="lt-h">💌 Thư gửi tương lai</h2>
    <div class="lt-list"></div>
    <div class="lt-new" hidden>
      <div class="ai-r"><b>Gửi cho</b><div class="vk-ch lt-to"></div></div>
      <label class="f">Tiêu đề<input id="ltTi" maxlength="80" placeholder="Ví dụ: Gửi con năm 18 tuổi"></label>
      <label class="f">Nội dung thư<textarea id="ltBody" maxlength="8000" rows="8" placeholder="Viết những điều bạn muốn người ấy đọc vào ngày đó…"></textarea></label>
      <div class="evn-ai"><button type="button" class="ai-b" id="ltAI">✨ <span>AI viết giúp cho hay</span></button></div>
      <div class="ai-r"><b>Ngày mở thư</b><div class="vk-ch lt-q"></div><input id="ltDate" type="date" style="margin-top:8px"></div>
      <p class="hint">Sau khi niêm phong, thư bị khoá trong app tới đúng ngày mở — kể cả bạn cũng không đọc lại được.</p>
    </div>
    <div class="foot"><button data-close>Đóng</button><button class="lt-back" hidden>Quay lại</button><button class="primary lt-go">${icon('edit', 17, 2)}<span>Viết thư mới</span></button></div></div></div>`);
  const M = document.getElementById('mLet'), L = { to: 'me', view: 'list' };
  const list = async () => (await A.metaGet('sy:letters')) || [];
  const save = async ls => { await A.metaSet('sy:letters', ls); };
  const nameOf = id => id === 'me' ? 'chính bạn' : (A.people().find(p => p.id === id)?.name || 'người thân');
  async function renderList() {
    const ls = (await list()).filter(l => !l.deleted).sort((a, b) => a.openAt.localeCompare(b.openAt)), t = today();
    const card = l => { const ready = l.openAt <= t, n = daysTo(l.openAt);
      return `<button class="lt-c${ready ? (l.opened ? ' read' : ' ready') : ''}" data-id="${l.id}"><span class="lt-env">${ready ? (l.opened ? '📖' : '💌') : '🔒'}</span><span class="lt-tx"><b>${esc(l.title || 'Thư không tên')}</b><small>Gửi ${esc(nameOf(l.to))} · ${ready ? (l.opened ? 'đã mở ' + dmyS(ymd(new Date(l.opened))) : 'đến ngày mở rồi!') : `mở vào ${dmyS(l.openAt)} · còn ${n.toLocaleString('vi-VN')} ngày`}</small></span></button>`; };
    M.querySelector('.lt-list').innerHTML = ls.length ? ls.map(card).join('') : `<div class="lt-empty"><div style="font-size:46px">💌</div><p>Viết một lá thư cho chính bạn hoặc cho con — niêm phong tới ngày mở (vd sinh nhật 18 tuổi của con). Tới ngày, app sẽ nhắc.</p></div>`;
  }
  function view(v) {
    L.view = v; M.querySelector('.lt-list').hidden = v !== 'list'; M.querySelector('.lt-new').hidden = v !== 'new'; M.querySelector('.lt-back').hidden = v === 'list'; M.querySelector('[data-close]').hidden = v !== 'list';
    M.querySelector('.lt-go span').textContent = v === 'list' ? 'Viết thư mới' : v === 'new' ? 'Niêm phong thư' : 'Xong'; M.querySelector('.lt-h').textContent = v === 'new' ? '✍️ Viết thư gửi tương lai' : '💌 Thư gửi tương lai';
  }
  function toUi() {
    const ps = A.people().filter(p => p.role !== 'me');
    M.querySelector('.lt-to').innerHTML = [`<button type="button" data-to="me" class="${L.to === 'me' ? 'on' : ''}">Chính mình</button>`, ...ps.map(p => `<button type="button" data-to="${p.id}" class="${L.to === p.id ? 'on' : ''}">${esc(p.name)}</button>`)].join('');
    const p = ps.find(x => x.id === L.to), q = [['1 năm nữa', addY(1)], ['5 năm nữa', addY(5)], ['10 năm nữa', addY(10)]];
    if (p?.birth && !p.birthApprox) for (const age of [10, 18, 20]) { const d = addY(age, new Date(p.birth + 'T12:00:00')); if (d > today()) { q.push([`Sinh nhật ${age} tuổi của ${p.name}`, d]); } }
    M.querySelector('.lt-q').innerHTML = q.slice(0, 6).map(([t, d]) => `<button type="button" data-d="${d}" class="${M.querySelector('#ltDate').value === d ? 'on' : ''}">${esc(t)}</button>`).join('');
  }
  function compose() { L.to = 'me'; M.querySelector('#ltTi').value = ''; M.querySelector('#ltBody').value = ''; M.querySelector('#ltDate').value = addY(1); M.querySelector('#ltDate').min = ymd(new Date(Date.now() + 864e5)); toUi(); view('new'); setTimeout(() => M.querySelector('#ltTi').focus(), 300); }
  M.addEventListener('click', async e => {
    const to = e.target.closest('[data-to]'); if (to) { L.to = to.dataset.to; const p = A.people().find(x => x.id === L.to); if (!M.querySelector('#ltTi').value.trim() && p) M.querySelector('#ltTi').value = `Gửi ${p.name}`; toUi(); return; }
    const d = e.target.closest('[data-d]'); if (d) { M.querySelector('#ltDate').value = d.dataset.d; toUi(); return; }
    const c = e.target.closest('.lt-c'); if (c) { openLetter(c.dataset.id); return; }
    if (e.target.closest('.lt-back')) { await renderList(); view('list'); return; }
    if (e.target.closest('#ltAI')) { const ta = M.querySelector('#ltBody'); A.ai?.({ kind: 'letter', heading: '✨ Viết thư cho hay', goLabel: 'Viết thư', title: `${M.querySelector('#ltTi').value || 'Thư gửi tương lai'} (gửi ${nameOf(L.to)}, mở ngày ${dmyS(M.querySelector('#ltDate').value)})`, text: ta.value, lead: 'AI viết lại lá thư của bạn cho hay hơn, giữ đúng những điều bạn muốn nói.', ctx: { me: A.me()?.name || '', people: L.to === 'me' ? [] : [`${nameOf(L.to)}`] }, onUse: v => { ta.value = v; A.openModal(M); } }); return; }
    if (e.target.closest('.lt-go')) {
      if (L.view === 'list') { compose(); return; }
      if (L.view === 'read') { await renderList(); view('list'); return; }
      const title = M.querySelector('#ltTi').value.trim(), body = M.querySelector('#ltBody').value.trim(), at = M.querySelector('#ltDate').value;
      if (!body) { A.toast('Bạn viết vài dòng cho lá thư nhé'); return; } if (!at || at <= today()) { A.toast('Chọn ngày mở thư ở tương lai nhé'); return; }
      if (!(await A.ask('Niêm phong thư?', `Thư sẽ bị khoá tới ngày ${dmyS(at)} — kể cả bạn cũng không đọc lại được trước ngày đó.`, 'Niêm phong'))) return;
      const ls = await list(); const l = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), to: L.to, title: title || `Gửi ${nameOf(L.to)}`, body, openAt: at, created: Date.now(), by: A.me()?.name || '' }; ls.push(l); await save(ls);
      haptic(15); window.SFX?.play('ting'); await renderList(); view('list');
      A.toast(`Đã niêm phong 💌 — mở vào ${dmyS(at)}`, 2600); setTimeout(() => A.contextMenu?.({ title: 'Nhắc ngày mở thư?', items: [{ icon: 'bell', label: 'Thêm nhắc vào app Lịch', act: () => ics(l) }, { icon: 'close', label: 'Thôi, app tự nhắc khi mở' }] }), 700);
    }
  });
  async function openLetter(id) {
    const l = (await list()).find(x => x.id === id); if (!l) return; const n = daysTo(l.openAt);
    if (n > 0) { haptic(20); A.toast(`🔒 Thư còn niêm phong — mở vào ${dmyS(l.openAt)} (còn ${n.toLocaleString('vi-VN')} ngày)`, 2800); const el = M.querySelector(`[data-id="${id}"]`); el?.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'none' }], { duration: 360, easing: 'cubic-bezier(.36,.07,.19,.97)' }); return; }
    if (!l.opened) { const ls = await list(); const x = ls.find(y => y.id === id); x.opened = Date.now(); await save(ls); A.confetti?.(); }
    M.querySelector('.lt-list').innerHTML = `<div class="lt-read"><div class="lt-paper"><small>Viết ngày ${dmyS(ymd(new Date(l.created)))}${l.by ? ' · ' + esc(l.by) : ''} — gửi ${esc(nameOf(l.to))}</small><h3>${esc(l.title)}</h3><p>${esc(l.body).replace(/\n/g, '<br>')}</p></div></div>`;
    M.querySelector('.lt-paper').animate([{ transform: 'translateY(40px) scale(.9) rotate(-2deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 600, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    view('read'); M.querySelector('.lt-list').hidden = false; M.querySelector('.lt-back').hidden = false;
  }
  function ics(l) {
    const d = l.openAt.replace(/-/g, ''), now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HanhTrinh//Thu//VI', 'BEGIN:VEVENT', `UID:thu-${l.id}@hanh-trinh`, `DTSTAMP:${now}`, `DTSTART;VALUE=DATE:${d}`, `SUMMARY:💌 Mở thư: ${l.title.replace(/[,;\n]/g, ' ')}`, 'DESCRIPTION:Có một lá thư từ quá khứ đang chờ trong app Hành Trình Của Bạn', 'BEGIN:VALARM', 'TRIGGER:PT9H', 'ACTION:DISPLAY', 'DESCRIPTION:Mở thư gửi tương lai', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    A.deliverICS?.(new File([txt], `mo-thu-${l.openAt}.ics`, { type: 'text/calendar' }));
  }
  // tới ngày: dải nhắc nhỏ (không bật hộp thoại), mỗi ngày tối đa một lần
  async function check() {
    const t = today(), ready = (await list()).filter(l => !l.deleted && !l.opened && l.openAt <= t); if (!ready.length) return false;
    if ((await A.metaGet('letNote')) === t) return false; await A.metaSet('letNote', t);
    A.notify?.(`💌 Có ${ready.length > 1 ? ready.length + ' lá thư' : 'một lá thư'} từ quá khứ gửi ${esc(nameOf(ready[0].to))}`, () => { open(); setTimeout(() => openLetter(ready[0].id), 500); });
    return true;
  }
  async function open() { await renderList(); view('list'); A.openModal(M); }
  return { open, check, compose: async () => { await open(); compose(); } };
}
