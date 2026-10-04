// Hành Trình Của Bạn — MÀN LÀM QUEN kiểu trò chuyện (lần đầu mở app, hoặc người dùng cũ tạo hồ sơ "Tôi").
// Mỗi câu hỏi là một thẻ kính trượt vào có nảy; câu trả lời đọng lại thành bong bóng chat phía trên.
import { icon, haptic } from './ui.js';
import { canChi, CHI, CON, zodiacOf, solar2lunar, lunar2solar, LUNAR_MONTH } from './hoso-data.js';
import { chibiSVG, mountChibiEditor, accForJob, defaultChibi } from './chibi.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const JOB_SUG = ['Học sinh', 'Sinh viên', 'Nhân viên văn phòng', 'Kinh doanh', 'Kỹ sư', 'Giáo viên', 'Bác sĩ', 'Nội trợ', 'Nghỉ hưu', 'Tự do'];
const tuoi = y => `${y} · tuổi ${CHI[(y + 8) % 12]} (${canChi(y)}) · con ${CON[(y + 8) % 12]}`;

export function initOnboarding(A) {
  document.body.insertAdjacentHTML('beforeend', `<div id="onb" aria-hidden="true"><div class="ob-bg"><i></i><i></i><i></i></div><div class="ob-sc"><div class="ob-cb"></div><div class="ob-chat"></div><div class="ob-q"></div></div><button class="ob-x glassbtn" aria-label="Đóng">${icon('close', 20, 2)}</button></div>`);
  const O = document.getElementById('onb'), CHAT = O.querySelector('.ob-chat'), Q = O.querySelector('.ob-q'), CB = O.querySelector('.ob-cb');
  let D = null, res = null, ed = null;
  const person = () => ({ id: 'onb', role: 'me', name: D.name, gender: D.gender, color: D.color, chibi: D.chibi });
  const drawCb = (jump) => { CB.innerHTML = chibiSVG(person(), { w: 112 }); if (jump) CB.firstChild.animate?.([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-18px) scale(1.06,.94)' }, { transform: 'translateY(0) scale(.96,1.04)' }, { transform: 'none' }], { duration: 620, easing: 'cubic-bezier(.34,1.56,.64,1)' }); };
  const bubble = (q, a) => { CHAT.insertAdjacentHTML('beforeend', `<div class="ob-b q">${q}</div>${a ? `<div class="ob-b a">${esc(a)}</div>` : ''}`); [...CHAT.children].slice(-2).forEach((el, i) => el.animate?.([{ opacity: 0, transform: 'translateY(14px) scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: i * 90, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' })); };
  function card(html, focus) {
    Q.innerHTML = `<div class="ob-card">${html}</div>`; const c = Q.firstChild;
    c.animate?.([{ opacity: 0, transform: 'translateY(60px) scale(.92)' }, { opacity: 1, transform: 'translateY(-6px) scale(1.01)', offset: .7 }, { opacity: 1, transform: 'none' }], { duration: 560, easing: 'cubic-bezier(.2,.9,.3,1.2)' });
    setTimeout(() => { if (focus) c.querySelector(focus)?.focus({ preventScroll: true }); O.querySelector('.ob-sc').scrollTo({ top: 1e6, behavior: 'smooth' }); }, 120);
    return c;
  }
  const next = (q, a, step) => { bubble(q, a); haptic(8); drawCb(true); setTimeout(step, 260); };
  // 1. tên
  function sName() {
    const c = card(`<h2>Chào bạn! 👋</h2><p>Mình sẽ cùng bạn lưu lại hành trình cuộc đời — từ tuổi thơ, tuổi trẻ đến khi có gia đình, con cái. <b>Tên bạn là gì?</b></p>
      <input class="ob-in" id="obName" maxlength="30" placeholder="Tên bạn hay được gọi" autocomplete="given-name"><button class="primary ob-go">Tiếp ${icon('chevronRight', 16, 2.4)}</button>
      ${D.first ? `<div class="ob-alt"><button data-x="kid">👶 Mình chỉ muốn lưu ảnh của con</button>${A.drvOn?.() ? `<button data-x="google"><b class="g">G</b> Đăng nhập Google — lấy lại dữ liệu</button>` : ''}<button data-x="backup">📂 Mình đã dùng app rồi — mở bản sao lưu</button></div>` : ''}`, '#obName');
    const go = () => { const v = c.querySelector('#obName').value.trim().replace(/\s+/g, ' '); if (!v) { A.toast('Bạn nhập tên nhé', 1500); return; } D.name = v; next('Tên bạn là gì?', v, sYear); };
    c.querySelector('.ob-go').onclick = go; c.querySelector('#obName').onkeydown = e => { if (e.key === 'Enter') go(); };
    c.querySelector('.ob-alt')?.addEventListener('click', e => { const b = e.target.closest('[data-x]'); if (!b) return; close(null); if (b.dataset.x === 'kid') A.onKid?.(); else if (b.dataset.x === 'google') A.signIn?.(); else A.onBackup?.(); });
  }
  // 2. ngày sinh đầy đủ (dương hoặc âm lịch); không nhớ thì chỉ năm
  const WDN = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  function sYear() {
    const now = new Date().getFullYear();
    const c = card(`<h2>Rất vui được gặp, ${esc(D.name)}! 🎈</h2><p><b>Bạn sinh ngày nào?</b></p>
      <div class="ob-cal"><button type="button" data-c="d" class="on">Dương lịch</button><button type="button" data-c="a">Âm lịch</button></div>
      <input class="ob-in" id="obD" type="date" max="${now}-12-31">
      <div class="ob-lun" id="obL" hidden><select class="ob-in" id="obLd">${Array.from({ length: 30 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}</select><select class="ob-in" id="obLm">${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">Tháng ${i + 1}</option>`).join('')}</select><input class="ob-in" id="obLy" inputmode="numeric" maxlength="4" placeholder="Năm"><label><input type="checkbox" id="obLl"> nhuận</label></div>
      <div class="ob-yo" id="obYo" hidden><input class="ob-in" id="obY" inputmode="numeric" maxlength="4" placeholder="Năm sinh, ví dụ: 1992"></div>
      <div class="ob-dl" id="obDl"></div><div class="ob-tuoi" id="obT"></div>
      <button type="button" class="ob-link" id="obOnly">Chỉ nhớ năm sinh</button>
      <button class="primary ob-go">Tiếp ${icon('chevronRight', 16, 2.4)}</button>`, '#obD');
    let mode = 'd';
    const $c = s => c.querySelector(s), solar = () => {
      if (mode === 'y') { const y = +$c('#obY').value; return y >= 1900 && y <= now ? { y, birth: `${y}-07-01`, apx: 'y' } : null; }
      if (mode === 'a') { const d = +$c('#obLd').value, m = +$c('#obLm').value, y = +$c('#obLy').value, l = $c('#obLl').checked; if (!(y >= 1900 && y <= now)) return null; const r = lunar2solar(d, m, y, l); if (!r) return null; const b = solar2lunar(r.d, r.m, r.y); if (b.d !== d || b.m !== m) return null; return { y: r.y, birth: `${r.y}-${String(r.m).padStart(2, '0')}-${String(r.d).padStart(2, '0')}`, lunar: { d, m, y, leap: l } }; }
      const v = $c('#obD').value; return /^\d{4}-\d\d-\d\d$/.test(v) && +v.slice(0, 4) >= 1900 ? { y: +v.slice(0, 4), birth: v } : null;
    };
    const upd = () => { const r = solar(), T = $c('#obT'), L = $c('#obDl');
      if (!r) { T.textContent = ''; L.textContent = mode === 'a' && $c('#obLy').value.length === 4 ? 'Ngày âm này không có trong năm đó' : ''; return; }
      const dt = new Date(r.birth + 'T12:00:00'), lun = solar2lunar(dt.getDate(), dt.getMonth() + 1, dt.getFullYear()), z = r.apx ? null : zodiacOf(dt.getMonth() + 1, dt.getDate());
      L.textContent = r.apx ? '' : `${WDN[dt.getDay()]}, ${dt.getDate()} tháng ${dt.getMonth() + 1}, ${dt.getFullYear()}${mode === 'a' ? ' (dương lịch)' : ` · âm lịch ${lun.d}/${lun.m}`}`;
      const ly = r.apx ? r.y : lun.y; T.textContent = `${r.y} · tuổi ${CHI[(ly + 8) % 12]} (${canChi(ly)})${z ? ` · ${z.kh} ${z.ten}` : ''}`;
      T.animate?.([{ transform: 'scale(.8)' }, { transform: 'scale(1.06)' }, { transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.34,1.56,.64,1)' }); };
    const setMode = m => { mode = m; $c('#obD').hidden = m !== 'd'; $c('#obL').hidden = m !== 'a'; $c('#obYo').hidden = m !== 'y'; c.querySelector('.ob-cal').hidden = m === 'y'; c.querySelectorAll('.ob-cal button').forEach(b => b.classList.toggle('on', b.dataset.c === m)); $c('#obOnly').textContent = m === 'y' ? 'Nhập đủ ngày sinh' : 'Chỉ nhớ năm sinh'; upd(); };
    c.querySelector('.ob-cal').onclick = e => { const b = e.target.closest('[data-c]'); if (b) { const r = solar(); if (b.dataset.c === 'a' && r && !r.apx && mode === 'd') { const dt = new Date(r.birth + 'T12:00:00'), L = solar2lunar(dt.getDate(), dt.getMonth() + 1, dt.getFullYear()); $c('#obLd').value = L.d; $c('#obLm').value = L.m; $c('#obLy').value = L.y; $c('#obLl').checked = L.leap; } setMode(b.dataset.c); haptic(5); } };
    $c('#obOnly').onclick = () => setMode(mode === 'y' ? 'd' : 'y');
    c.querySelectorAll('input, select').forEach(x => x.addEventListener(x.tagName === 'SELECT' || x.type === 'checkbox' ? 'change' : 'input', upd));
    const go = () => { const r = solar(); if (!r) { A.toast(mode === 'y' ? 'Bạn nhập năm sinh 4 chữ số nhé' : 'Bạn chọn đủ ngày, tháng, năm sinh nhé', 1800); return; }
      D.birth = r.birth; D.birthApprox = r.apx || null; D.birthLunar = r.lunar || null; const dt = new Date(r.birth + 'T12:00:00');
      next('Bạn sinh ngày nào?', r.apx ? `năm ${r.y}` : `${dt.getDate()}/${dt.getMonth() + 1}/${r.y}${r.lunar ? ` (âm ${r.lunar.d}/${r.lunar.m})` : ''}`, sJob); };
    c.querySelector('.ob-go').onclick = go; $c('#obY').onkeydown = e => { if (e.key === 'Enter') go(); };
  }
  // 3. công việc
  function sJob() {
    const c = card(`<h2>Bạn đang làm gì? 💼</h2><p>Nghề nghiệp hay công việc hiện tại — đổi nghề sau này cứ thêm vào hồ sơ.</p>
      <input class="ob-in" id="obJ" maxlength="60" placeholder="Ví dụ: Kỹ sư phần mềm"><div class="ob-sug">${JOB_SUG.map(j => `<button type="button" data-j="${j}">${j}</button>`).join('')}</div>
      <div class="ob-row"><button class="ob-skip">Bỏ qua</button><button class="primary ob-go">Tiếp ${icon('chevronRight', 16, 2.4)}</button></div>`, '#obJ');
    const J = c.querySelector('#obJ');
    c.querySelector('.ob-sug').onclick = e => { const b = e.target.closest('[data-j]'); if (!b) return; J.value = b.dataset.j; c.querySelectorAll('.ob-sug button').forEach(x => x.classList.toggle('on', x === b)); haptic(5); D.chibi = { ...D.chibi, acc: accForJob(b.dataset.j) }; drawCb(true); };
    J.oninput = () => { D.chibi = { ...D.chibi, acc: accForJob(J.value) }; drawCb(); };
    const go = skip => { const v = skip ? '' : J.value.trim(); D.job = v || null; D.chibi = { ...D.chibi, acc: accForJob(v) }; next('Bạn đang làm gì?', v || '(để sau)', sPlace); };
    c.querySelector('.ob-go').onclick = () => go(false); c.querySelector('.ob-skip').onclick = () => go(true); J.onkeydown = e => { if (e.key === 'Enter') go(false); };
  }
  // 4. nơi sống (gõ tên khu vực; app tự cắm “Nhà mình” trên bản đồ)
  function sPlace() {
    const c = card(`<h2>Bạn sống ở đâu? 🏡</h2><p>Tên khu vực là đủ — sau này bạn cắm “Nhà mình” trên bản đồ.</p>
      <input class="ob-in" id="obP" maxlength="80" placeholder="Ví dụ: Cầu Giấy, Hà Nội">
      <div class="ob-row"><button class="ob-skip">Bỏ qua</button><button class="primary ob-go">Tiếp ${icon('chevronRight', 16, 2.4)}</button></div>`, '#obP');
    const P = c.querySelector('#obP');
    const go = skip => { const v = skip ? '' : P.value.trim(); D.home = v || null; next('Bạn sống ở đâu?', v || '(để sau)', sChibi); };
    c.querySelector('.ob-go').onclick = () => go(false); c.querySelector('.ob-skip').onclick = () => go(true); P.onkeydown = e => { if (e.key === 'Enter') go(false); };
  }
  // 5. nhân vật chibi
  function sChibi() {
    CB.classList.add('mini');
    const c = card(`<h2>Chọn nhân vật của bạn ✨</h2><p>Nhân vật này đứng ở đầu hành trình và trong hồ sơ của bạn.</p><div class="ce" id="obCe"></div><button class="primary ob-go">Xong ${icon('check', 16, 2.4)}</button>`);
    ed = mountChibiEditor(c.querySelector('#obCe'), person(), ch => { D.chibi = ch; D.gender = ch.g; });
    c.querySelector('.ob-go').onclick = () => { D.chibi = ed.get(); D.gender = D.chibi.g; CB.classList.remove('mini'); next('Chọn nhân vật của bạn', '', sDone); };
  }
  // 6. hoàn tất
  function sDone() {
    const y = +D.birth.slice(0, 4), dt0 = new Date(D.birth + 'T12:00:00'), z0 = D.birthApprox ? null : zodiacOf(dt0.getMonth() + 1, dt0.getDate());
    const c = card(`<div class="ob-done">${chibiSVG(person(), { w: 120 })}</div><h2>Chào mừng ${esc(D.name)}! 🎉</h2><p>${esc(tuoi(y))}${z0 ? ' · ' + z0.kh + ' ' + z0.ten : ''}${D.job ? ` · ${esc(D.job)}` : ''}${D.home ? ` · ${esc(D.home)}` : ''}</p><p>Hành trình của bạn đã sẵn sàng. Thêm ảnh bất kỳ lúc nào — cả ảnh cũ chụp lại từ ảnh giấy.</p><button class="primary ob-go big">Bắt đầu hành trình ✨</button>`);
    CB.innerHTML = ''; A.confetti?.(D.color);
    c.querySelector('.ob-done svg')?.animate?.([{ transform: 'scale(.3) rotate(-20deg)' }, { transform: 'scale(1.15) rotate(6deg)' }, { transform: 'none' }], { duration: 700, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    c.querySelector('.ob-go').onclick = () => close({ name: D.name, birth: D.birth, birthApprox: D.birthApprox, birthLunar: D.birthLunar || null, gender: D.gender || null, color: D.color, chibi: D.chibi, jobs: D.job ? [{ job: D.job, at: null, from: null, to: null }] : [], home: D.home ? { name: D.home } : null });
  }
  function close(v) { O.classList.remove('open'); O.setAttribute('aria-hidden', 'true'); document.body.classList.remove('obopen'); const r = res; res = null; setTimeout(() => { CHAT.innerHTML = ''; Q.innerHTML = ''; }, 400); r?.(v); }
  O.querySelector('.ob-x').onclick = () => close(null);
  return {
    open({ first = false, color = '#ff8fbf' } = {}) {
      D = { first, name: '', color, gender: null, chibi: null }; D.chibi = defaultChibi({ id: 'me' + Date.now(), role: 'me', color, gender: 'm' }); D.chibi.sc = color;
      O.querySelector('.ob-x').hidden = first; CB.classList.remove('mini'); CHAT.innerHTML = ''; drawCb();
      O.classList.add('open'); O.setAttribute('aria-hidden', 'false'); document.body.classList.add('obopen'); sName();
      return new Promise(r => { res = r; });
    },
    get isOpen() { return O.classList.contains('open'); }
  };
}
