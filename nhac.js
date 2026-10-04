// Hành Trình Của Bạn — nhắc sinh nhật hằng năm bằng sự kiện lịch .ics (RFC 5545), tạo hoàn toàn trong máy.
import { solar2lunar, lunarBirthday, canChi, LUNAR_MONTH } from './hoso-data.js';

const pad = n => String(n).padStart(2, '0');
const ymd8 = (y, m, d) => `${y}${pad(m)}${pad(d)}`;
// escape TEXT theo RFC 5545
const esc = s => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
// gấp dòng 75 octet (UTF-8), không cắt giữa ký tự nhiều byte
const enc = new TextEncoder();
function fold(line) {
  if (enc.encode(line).length <= 75) return line;
  const out = []; let cur = '', n = 0, lim = 75;
  for (const ch of line) { const b = enc.encode(ch).length; if (n + b > lim) { out.push(cur); cur = ' '; n = 1; lim = 75; } cur += ch; n += b; }
  out.push(cur); return out.join('\r\n');
}
const stamp = () => { const d = new Date(); return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`; };
// chuông báo (sự kiện cả ngày bắt đầu 0:00 giờ máy): hôm đó 8:00, trước 1 ngày 20:00, trước 7 ngày 9:00
export const ALARMS = { d0: { trig: 'PT8H', txt: 'hôm nay' }, d1: { trig: '-PT4H', txt: 'ngày mai' }, d7: { trig: '-P6DT15H', txt: 'còn 7 ngày nữa' } };
const addDays = (y, m, d, n) => { const t = new Date(Date.UTC(y, m - 1, d + n)); return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()]; };

// kids: [{ id, name, birth:'YYYY-MM-DD', gender }], opt: { solar, lunar, miles, alarms:['d0','d1','d7'], url, years, now }
export function buildICS(kids, opt = {}) {
  const now = opt.now ? new Date(opt.now) : new Date(), Y0 = now.getFullYear(), years = opt.years ?? 30, url = opt.url || '', ds = stamp();
  const alarms = (opt.alarms || ['d0', 'd1']).filter(a => ALARMS[a]);
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ngan Ha Cua Con//Nhac sinh nhat//VI', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Hành Trình Của Bạn', 'X-WR-TIMEZONE:Asia/Ho_Chi_Minh'];
  const ev = (uid, start, title, desc, extra = []) => {
    const [y, m, d] = start, [y2, m2, d2] = addDays(y, m, d, 1);
    L.push('BEGIN:VEVENT', `UID:${uid}@nganhacuacon`, `DTSTAMP:${ds}`, `DTSTART;VALUE=DATE:${ymd8(y, m, d)}`, `DTEND;VALUE=DATE:${ymd8(y2, m2, d2)}`, ...extra, `SUMMARY:${esc(title)}`, `DESCRIPTION:${esc(desc)}`, 'TRANSP:TRANSPARENT', ...(url ? [`URL:${url}`] : []));
    for (const a of alarms) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `TRIGGER:${ALARMS[a].trig}`, `DESCRIPTION:${esc(title + ' – ' + ALARMS[a].txt)}`, 'END:VALARM');
    L.push('END:VEVENT');
  };
  const tail = '\nMở Hành Trình Của Bạn để xem lại kỷ niệm' + (url ? ': ' + url : '');
  let n = 0;
  // v1.7.0: sự kiện thêm (ngày cưới, ngày kỷ niệm tự thêm, Tết, Trung thu…): { uid, date:[y,m,d], title, desc, yearly }
  for (const x of opt.extra || []) { ev(x.uid, x.date, x.title, (x.desc || '') + tail, x.yearly ? ['RRULE:FREQ=YEARLY'] : []); n++; }
  for (const k of kids) {
    if (!k?.birth || k.birthApprox) continue;
    const [by, bm, bd] = k.birth.split('-').map(Number), name = k.name;
    if (opt.solar !== false) { ev(`${k.id}-sn-duong`, [by, bm, bd], `🎂 Sinh nhật ${name}`, `${name} chào đời ngày ${pad(bd)}/${pad(bm)}/${by}.${tail}`, ['RRULE:FREQ=YEARLY']); n++; }
    if (opt.lunar && (!opt.lunarMarked || k.birthLunar)) {
      const lb = solar2lunar(bd, bm, by);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); let made = 0;
      for (let ly = Math.max(lb.y + 1, Y0 - 1); made < years && ly < Y0 + years + 2; ly++) {
        const s = lunarBirthday(lb.d, lb.m, ly); if (!s) continue;
        if (new Date(s.y, s.m - 1, s.d) < today) continue;
        const age = ly - lb.y; made++;
        ev(`${k.id}-sn-am-${ly}`, [s.y, s.m, s.d], `🎂 Sinh nhật âm lịch ${age} tuổi của ${name}`, `${name} tròn ${age} tuổi theo lịch âm (ngày ${lb.d} tháng ${LUNAR_MONTH(lb.m)}, năm ${canChi(ly)}).${tail}`); n++;
      }
    }
    if (opt.miles) {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const m1 = new Date(by, bm, bd), d100 = new Date(by, bm - 1, bd + 100), y1 = new Date(by + 1, bm - 1, bd);
      for (const [key, dt, t] of [['day-thang', m1, `🍼 Đầy tháng ${name}`], ['100-ngay', d100, `🌟 100 ngày của ${name}`], ['thoi-noi', y1, `🎉 Thôi nôi ${name} · Sinh nhật 1 tuổi`]]) {
        if (dt < today) continue;
        ev(`${k.id}-${key}`, [dt.getFullYear(), dt.getMonth() + 1, dt.getDate()], t, `Cột mốc của ${name}.${tail}`); n++;
      }
    }
  }
  L.push('END:VCALENDAR');
  return { text: L.map(fold).join('\r\n') + '\r\n', count: n };
}
// payload gửi qua hash URL (#nhac=…): chỉ tên + ngày sinh + lựa chọn, base64url
export const packHash = obj => { const b = enc.encode(JSON.stringify(obj)); let s = ''; for (const x of b) s += String.fromCharCode(x); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
export const unpackHash = str => { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/')); return JSON.parse(new TextDecoder().decode(Uint8Array.from(s, c => c.charCodeAt(0)))); };
export const futureMiles = (birth, now = new Date()) => { const [y, m, d] = birth.split('-').map(Number), t = new Date(now.getFullYear(), now.getMonth(), now.getDate()); return [new Date(y, m, d), new Date(y, m - 1, d + 100), new Date(y + 1, m - 1, d)].some(x => x >= t); };

// ---------- giao diện ----------
export function initNhac(A) {
  const $ = s => document.querySelector(s);
  document.body.insertAdjacentHTML('beforeend', `
<div class="modal" id="mNhac"><div class="card glass">
  <h2 class="nh-t">Nhắc sinh nhật</h2>
  <p class="lead">App tạo sự kiện cho ứng dụng <b>Lịch</b> trong điện thoại, để Lịch tự báo mỗi năm — kể cả khi không mở app. Tất cả tạo trong máy, không gửi đi đâu.</p>
  <div class="nh-st"></div>
  <h4 class="nh-h">Nhắc gì</h4>
  <label class="tog"><span>Sinh nhật dương lịch <small>lặp lại mỗi năm</small></span><input type="checkbox" id="nhSolar" checked></label>
  <label class="tog"><span>Sinh nhật âm lịch <small>tính sẵn 30 năm tới</small></span><input type="checkbox" id="nhLunar"></label>
  <label class="tog nh-mi"><span>Cột mốc sắp tới <small>đầy tháng, 100 ngày, thôi nôi</small></span><input type="checkbox" id="nhMiles" checked></label>
  <h4 class="nh-h">Báo lúc nào</h4>
  <label class="tog"><span>Đúng ngày, lúc 8:00 sáng</span><input type="checkbox" data-al="d0" checked></label>
  <label class="tog"><span>Trước 1 ngày, lúc 20:00</span><input type="checkbox" data-al="d1" checked></label>
  <label class="tog"><span>Trước 7 ngày <small>để kịp chuẩn bị quà</small></span><input type="checkbox" data-al="d7"></label>
  <details class="nh-hd"><summary>Cách thêm vào Lịch</summary>
    <ol class="nh-steps"><li><b>iPhone:</b> bấm “Thêm vào Lịch” → điện thoại mở bảng sự kiện → bấm <b>Thêm tất cả</b> (Add All) → chọn lịch → <b>Xong</b>.</li>
    <li><b>iPhone đang dùng app ở Màn hình chính:</b> app sẽ mở Safari, bấm <b>Thêm vào Lịch</b> lần nữa ở đó.</li>
    <li><b>Android:</b> tệp “nhac-sinh-nhat.ics” được tải về → chạm thông báo tải xong (hoặc mở trong Tệp) → chọn <b>Lịch Google</b> → <b>Lưu</b>.</li>
    <li><b>Máy tính:</b> mở tệp .ics vừa tải → ứng dụng Lịch hỏi thêm vào lịch nào.</li></ol></details>
  <div class="foot"><button data-close>Để sau</button><button class="primary" id="nhGo">Thêm vào Lịch</button></div>
</div></div>
<div class="modal" id="mNhacGo"><div class="card glass" style="width:min(440px,100%)"><h2>Thêm nhắc vào Lịch</h2><p class="lead nhg-l"></p><div class="foot"><button data-close>Đóng</button><button class="primary" id="nhgGo">Thêm vào Lịch</button></div></div></div>`);
  const M = $('#mNhac'); let target = [];
  for (const m of [M, $('#mNhacGo')]) { m.addEventListener('pointerdown', e => { if (e.target === m) m.dataset.down = 1; }); m.addEventListener('click', e => { if (e.target === m && m.dataset.down) A.closeModal(m); m.dataset.down = ''; }); m.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => A.closeModal(m))); }
  const standalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const appURL = () => location.href.split('#')[0].split('?')[0];
  const opts = () => ({ solar: $('#nhSolar').checked, lunar: $('#nhLunar').checked, miles: $('#nhMiles').checked, alarms: [...M.querySelectorAll('[data-al]')].filter(x => x.checked).map(x => x.dataset.al) });
  async function open(kids) {
    target = kids.filter(k => k?.birth); if (!target.length) return;
    M.querySelector('.nh-t').textContent = target.length > 1 ? 'Nhắc sinh nhật cả nhà' : `Nhắc sinh nhật ${target[0].name}`;
    M.querySelector('.nh-mi').hidden = !target.some(k => futureMiles(k.birth));
    const saved = []; for (const k of target) { const v = await A.metaGet('nhac:' + k.id); if (v) saved.push({ k, v }); }
    const st = M.querySelector('.nh-st');
    if (saved.length) {
      const changed = saved.filter(x => x.v.birth !== x.k.birth);
      st.innerHTML = `<div class="nh-ok">${A.icon('check', 18, 2)}<span>Đã đặt nhắc${target.length > 1 ? ` cho ${saved.map(x => x.k.name).join(', ')}` : ''} ngày ${A.dmy(saved[0].v.ts)}${changed.length ? ` · <b>ngày sinh đã đổi, bấm “Cập nhật nhắc” để sửa trong Lịch</b>` : ''}</span></div>`;
      const o = saved[0].v.opt || {}; $('#nhSolar').checked = o.solar !== false; $('#nhLunar').checked = !!o.lunar; $('#nhMiles').checked = o.miles !== false; M.querySelectorAll('[data-al]').forEach(x => x.checked = (o.alarms || ['d0', 'd1']).includes(x.dataset.al));
      $('#nhGo').textContent = 'Cập nhật nhắc';
    } else { st.innerHTML = ''; $('#nhGo').textContent = 'Thêm vào Lịch'; }
    A.openModal(M);
  }
  async function deliver(kids, o) {
    const { text, count } = buildICS(kids, { ...o, url: appURL() }); o = { ...o };
    if (!count) { A.toast('Bạn chọn ít nhất một mục để nhắc nhé'); return false; }
    const name = o.extra?.length ? 'lich-ky-niem.ics' : kids.length > 1 ? 'nhac-sinh-nhat-ca-nha.ics' : `nhac-sinh-nhat-${A.noAccent(kids[0].name)}.ics`;
    if (A.TEST) { window.T && (T.lastICS = { text, name, count }); }
    else if (isIOS && standalone()) {
      // app ở Màn hình chính không mở được bảng "Thêm vào Lịch" → mở Safari kèm dữ liệu trong hash (không gửi lên máy chủ)
      const h = packHash({ v: 1, kids: kids.map(k => ({ id: k.id, name: k.name, birth: k.birth, birthLunar: k.birthLunar || null })), o });
      window.open(appURL() + '#nhac=' + h, '_blank'); A.toast('Đang mở Safari — bấm “Thêm vào Lịch” ở đó nhé', 4000);
    } else if (isIOS) { location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(text); }
    else {
      const file = new File([text], name, { type: 'text/calendar' });
      if (navigator.canShare?.({ files: [file] }) && /Android/.test(navigator.userAgent)) { try { await navigator.share({ files: [file], title: 'Nhắc sinh nhật' }); } catch (e) { if (e.name !== 'AbortError') A.download(file, name); } }
      else A.download(file, name);
    }
    for (const k of kids) await A.metaSet('nhac:' + k.id, { ts: Date.now(), birth: k.birth, opt: o });
    return true;
  }
  $('#nhGo').onclick = async () => { const o = opts(); if (await deliver(target, o)) { A.closeModal(M); A.toast(A.TEST ? 'Đã tạo tệp nhắc' : 'Đã tạo nhắc — làm theo bảng của Lịch để lưu', 3000); A.onSaved?.(); } };
  // mở bằng Safari từ app Màn hình chính: đọc #nhac=…, xoá hash, hiện nút (cần một lần chạm để iOS mở bảng Lịch)
  function fromHash() {
    const m = /#nhac=([\w-]+)/.exec(location.hash); if (!m) return false;
    let data; try { data = unpackHash(m[1]); } catch (e) { return false; }
    history.replaceState(null, '', location.pathname + location.search);
    const G = $('#mNhacGo'); G.querySelector('.nhg-l').textContent = `Bấm nút dưới đây để thêm nhắc sinh nhật của ${data.kids.map(k => k.name).join(', ')} vào Lịch.`;
    $('#nhgGo').onclick = () => { const { text } = buildICS(data.kids, { ...data.o, url: appURL() }); location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(text); };
    A.openModal(G); return true;
  }
  return { open, deliver, fromHash, buildICS };
}
