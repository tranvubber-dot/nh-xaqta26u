// Hành Trình Của Bạn — ✨ AI KỂ LẠI CHO HAY: dùng khoá Gemini MIỄN PHÍ của chính người dùng (meta 'geminiKey', chỉ lưu trong máy,
// không đồng bộ Drive). CHỈ dùng mẫu CHỮ Flash / Flash-Lite (có free tier) — không bao giờ gọi mẫu vẽ ảnh (image / imagen).
// Mặc định chỉ gửi chữ; người dùng tự bật "Cho AI xem ảnh" thì mới gửi 1–4 ảnh nhỏ (≤ 512 px).
import { icon, haptic, undoToast } from './ui.js';

const API = 'https://generativelanguage.googleapis.com/v1beta';
let MODEL = null, COOL = 0;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// chọn mẫu Flash-Lite / Flash mới nhất có generateContent; loại mọi mẫu ảnh / giọng / thử nghiệm
export async function pickModel(key) {
  if (MODEL) return MODEL;
  const r = await fetch(API + '/models?pageSize=1000', { headers: { 'x-goog-api-key': key } });
  if (!r.ok) throw await apiErr(r);
  const j = await r.json(), ok = (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent') && /gemini-[\d.]+-flash/.test(m.name) && !/image|imagen|tts|audio|live|embed|thinking|exp|preview|robotics|computer|veo/.test(m.name));
  const ver = n => parseFloat((n.match(/gemini-([\d.]+)/) || [0, 0])[1]);
  ok.sort((a, b) => (/flash-lite/.test(b.name) - /flash-lite/.test(a.name)) || ver(b.name) - ver(a.name));
  MODEL = (ok[0]?.name || 'models/gemini-3.5-flash-lite').replace(/^models\//, '');
  if (/image|imagen/.test(MODEL)) MODEL = 'gemini-3.5-flash-lite';
  return MODEL;
}
export async function apiErr(r) {
  let msg = ''; try { msg = (await r.json()).error?.message || ''; } catch (e) { }
  if (r.status === 400 && /key/i.test(msg)) return Object.assign(new Error('Khoá API không đúng — bạn kiểm tra lại trong Cài đặt nhé'), { code: 'key' });
  if (r.status === 401 || r.status === 403) return Object.assign(new Error('Khoá này chưa được phép dùng Gemini API — bạn kiểm tra lại khoá trong Google AI Studio'), { code: 'key' });
  if (r.status === 429) return Object.assign(new Error('Hôm nay AI bận hoặc hết lượt miễn phí, thử lại sau nhé'), { code: 'quota' });
  if (r.status >= 500) return Object.assign(new Error('Máy chủ Google đang bận — bạn thử lại sau nhé'), { code: 'busy' });
  return new Error('Gemini báo lỗi ' + r.status + (msg ? ': ' + msg.slice(0, 120) : ''));
}
export const b64 = blob => new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(String(f.result).split(',')[1]); f.onerror = rej; f.readAsDataURL(blob); });
// gọi generateContent trả JSON theo responseSchema. 429: nghỉ 60 s (không thử lại dồn dập); 5xx: thử lại 1 lần sau 2,5 s
export async function gen(key, parts, schema, { temperature = .9 } = {}) {
  if (Date.now() < COOL) throw Object.assign(new Error('Hôm nay AI bận hoặc hết lượt miễn phí, thử lại sau nhé'), { code: 'quota' });
  const model = await pickModel(key);
  for (let k = 0; k < 2; k++) {
    let r; try { r = await fetch(`${API}/models/${model}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature } }) }); }
    catch (e) { throw new Error('Không kết nối được tới Google — bạn kiểm tra mạng nhé'); }
    if (r.ok) { const j = await r.json(), txt = j.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || ''; if (!txt) throw new Error(j.promptFeedback?.blockReason ? 'Gemini từ chối viết nội dung này' : 'Gemini không trả lời — bạn thử lại nhé'); return JSON.parse(txt); }
    const er = await apiErr(r); if (er.code === 'quota') { COOL = Date.now() + 60e3; throw er; } if (er.code === 'busy' && k === 0) { await new Promise(res => setTimeout(res, 2500)); continue; } throw er;
  }
}
export async function testKey(key) { MODEL = null; const m = await pickModel(key); return m; }
export function resetModel() { MODEL = null; COOL = 0; }

// ---------- giọng văn, độ dài ----------
export const TONES = [{ k: 'am', t: 'Ấm áp', d: 'ấm áp, chân thành, nhẹ nhàng' }, { k: 'van', t: 'Văn chương', d: 'giàu hình ảnh, chất văn, câu chữ bay bổng nhưng không sến' }, { k: 'hai', t: 'Hài hước dí dỏm', d: 'hài hước, dí dỏm, đáng yêu, có chút tự trào' },
  { k: 'thu', t: 'Thư gửi con', d: 'như lá thư bố mẹ viết gửi con, xưng bố/mẹ (hoặc ba/má) và gọi con' }, { k: 'be', t: 'Nhật ký bé kể', d: 'ngôi thứ nhất của bé (xưng con hoặc tên bé), ngây thơ, hồn nhiên' }, { k: 'tho', t: 'Thơ lục bát', d: 'thơ lục bát đúng luật 6–8 (4 đến 8 câu), vần chân chuẩn' }];
const LENS = { ngan: [40, 70], vua: [80, 140], dai: [160, 260] };

// ---------- sheet ✨ AI: chọn giọng, độ dài, (tuỳ) cho xem ảnh → 2 phương án cạnh bản cũ → "Dùng bản này" ----------
export function initAI(A) {
  document.body.insertAdjacentHTML('beforeend', `<div class="modal gsheet" id="mAI"><div class="card glass">
    <h2 class="ai-h">✨ Kể lại cho hay</h2><p class="lead ai-l"></p>
    <div class="ai-nokey" hidden></div>
    <div class="ai-main">
      <div class="ai-r"><b>Giọng văn</b><div class="vk-ch ai-tone">${TONES.map(t => `<button type="button" data-tone="${t.k}">${t.t}</button>`).join('')}</div></div>
      <div class="ai-r"><b>Độ dài</b><div class="vk-ch ai-len"><button type="button" data-len="ngan">Ngắn</button><button type="button" data-len="vua">Vừa</button><button type="button" data-len="dai">Dài</button></div></div>
      <label class="tog ai-img"><span>Cho AI xem ảnh để kể chi tiết hơn <small>gửi 1–4 ảnh nhỏ tới Google</small></span><input type="checkbox" id="aiImg"></label>
      <button class="primary ai-go">${icon('sparkle', 18, 2.2)}<span>Kể lại cho hay</span></button>
      <p class="hint ai-free">Dùng miễn phí: Google có thể dùng nội dung gửi lên để cải thiện AI.</p>
      <div class="ai-out" hidden></div>
      <div class="ai-more" hidden><button data-x="again">${icon('sparkle', 16, 2)}<span>Viết lại</span></button><button data-x="short">Ngắn hơn</button><button data-x="long">Dài hơn</button></div>
    </div>
    <div class="foot"><button data-close>Đóng</button></div></div></div>`);
  const M = document.getElementById('mAI'), OUT = M.querySelector('.ai-out');
  const S = { tone: 'am', len: 'vua', o: null, last: null, busy: false };
  const ui = () => { M.querySelectorAll('[data-tone]').forEach(b => b.classList.toggle('on', b.dataset.tone === S.tone)); M.querySelectorAll('[data-len]').forEach(b => b.classList.toggle('on', b.dataset.len === S.len)); };
  M.addEventListener('click', async e => {
    const t = e.target.closest('[data-tone]'); if (t) { S.tone = t.dataset.tone; ui(); return; }
    const l = e.target.closest('[data-len]'); if (l) { S.len = l.dataset.len; ui(); return; }
    if (e.target.closest('.ai-go')) { run(); return; }
    const x = e.target.closest('[data-x]'); if (x) { if (x.dataset.x === 'short') S.len = S.len === 'dai' ? 'vua' : 'ngan'; if (x.dataset.x === 'long') S.len = S.len === 'ngan' ? 'vua' : 'dai'; ui(); run(x.dataset.x); return; }
    const u = e.target.closest('[data-use]'); if (u && S.last) { const v = S.last[+u.dataset.use]; A.closeModal(M); S.o.onUse?.(v); haptic(12); return; }
    if (e.target.closest('[data-a=gset]')) { A.closeModal(M); setTimeout(() => A.openSettings?.(), 250); }
  });
  function guide() {
    return `<div class="ai-guide"><b>Lấy khoá Gemini miễn phí (3 bước, khoảng 2 phút)</b><ol><li>Mở <b>aistudio.google.com</b> bằng tài khoản Google của bạn.</li><li>Bấm <b>Get API key</b> → <b>Create API key</b>, chọn một dự án <b>KHÔNG gắn thanh toán</b> (để chắc chắn 0đ).</li><li>Chép khoá, mở <b>Cài đặt › AI kể lại cho hay</b> trong app này rồi dán vào, bấm <b>Kiểm tra khoá</b>.</li></ol><p class="hint">Khoá chỉ lưu trong máy này, không đồng bộ lên Drive.</p><button class="primary" data-a="gset">${icon('gear', 16, 2)}<span>Mở Cài đặt để dán khoá</span></button></div>`;
  }
  async function open(o) {
    S.o = o; S.last = null; OUT.hidden = true; OUT.innerHTML = ''; M.querySelector('.ai-more').hidden = true;
    M.querySelector('.ai-h').textContent = o.heading || '✨ Kể lại cho hay'; M.querySelector('.ai-go span').textContent = o.goLabel || 'Kể lại cho hay';
    M.querySelector('.ai-l').textContent = o.lead || '';
    M.querySelector('.ai-img').hidden = !(o.mids?.length); M.querySelector('#aiImg').checked = false;
    M.querySelector('.ai-tone').closest('.ai-r').hidden = o.kind === 'video';
    const key = await A.metaGet('geminiKey'); M.querySelector('.ai-nokey').hidden = !!key; M.querySelector('.ai-main').hidden = !key; if (!key) M.querySelector('.ai-nokey').innerHTML = guide();
    ui(); A.openModal(M);
  }
  function prompt(mode) {
    const o = S.o, T = TONES.find(t => t.k === S.tone), [a, b] = LENS[S.len], C = o.ctx || {};
    const ctx = [C.date && `Ngày: ${C.date}`, C.place && `Nơi chốn: ${C.place}`, C.people?.length && `Người có mặt: ${C.people.join('; ')}`, C.me && `Người viết (chủ hành trình): ${C.me}`, C.events?.length && `Các sự kiện trong chương: ${C.events.join('; ')}`].filter(Boolean).join('\n');
    const base = `Bạn là người viết hồi ký gia đình bằng tiếng Việt. Viết tiếng Việt tự nhiên, có dấu chuẩn, không dùng emoji.
QUAN TRỌNG: giữ ĐÚNG sự thật người dùng cung cấp — không bịa thêm tên người, nơi chốn hay sự việc mới. Được thêm cảm xúc, hình ảnh so sánh, nhịp câu cho hay.
Ngữ cảnh:\n${ctx || '(không có)'}`;
    if (o.kind === 'video') return `${base}\nViết lời cho video kỷ niệm: title (tiêu đề ≤ 6 từ, gợi cảm xúc) và sub (phụ đề ≤ 10 từ). Tạo đúng 2 phương án khác nhau.\nNội dung người dùng: ${o.text || '(chỉ có ngữ cảnh)'}`;
    const what = o.kind === 'chapter' ? `Viết LỜI MỞ CHƯƠNG cho chương đời "${o.title}" (đoạn mở đầu ngắn, như trang đầu một chương sách)` : o.kind === 'letter' ? `Viết lại LÁ THƯ GỬI TƯƠNG LAI ${o.title || ''} cho hay và cảm động hơn, có lời chào đầu thư và lời ký cuối thư` : `Viết lại lời kể cho kỷ niệm "${o.title || ''}" cho hay hơn`;
    const tone = S.tone === 'tho' ? 'Thể thơ lục bát (4–8 câu, mỗi câu một dòng, cặp 6 chữ – 8 chữ).' : `Giọng văn: ${T.d}. Độ dài khoảng ${a}–${b} chữ.`;
    return `${base}\n${what}. ${tone}${mode === 'again' ? ' Viết khác hẳn lần trước.' : ''}\nTạo đúng 2 phương án khác nhau (trường options, mỗi phần tử là một đoạn văn hoàn chỉnh).\nLời kể gốc của người dùng: ${o.text?.trim() ? o.text : '(chưa có — chỉ dựa vào ngữ cảnh, viết ngắn gọn, không bịa chi tiết)'}`;
  }
  async function run(mode) {
    if (S.busy) return; const key = await A.metaGet('geminiKey'); if (!key) { open(S.o); return; }
    S.busy = true; const go = M.querySelector('.ai-go'); go.disabled = true; OUT.hidden = false; OUT.innerHTML = `<div class="ai-wait"><i></i><span>✨ AI đang viết…</span></div>`;
    try {
      const parts = [{ text: prompt(mode) }];
      if (M.querySelector('#aiImg').checked && S.o.mids?.length) for (const mid of S.o.mids.slice(0, 4)) { const t = await A.thumbBlob(mid); if (t) parts.push({ inline_data: { mime_type: t.type || 'image/jpeg', data: await b64(t) } }); }
      const video = S.o.kind === 'video';
      const schema = video ? { type: 'OBJECT', properties: { options: { type: 'ARRAY', items: { type: 'OBJECT', properties: { title: { type: 'STRING' }, sub: { type: 'STRING' } }, required: ['title', 'sub'] } } }, required: ['options'] }
        : { type: 'OBJECT', properties: { options: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['options'] };
      const out = await gen(key, parts, schema, { temperature: mode === 'again' ? 1.05 : .9 });
      const tidy = s => String(s || '').replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu, '').trim();
      const opts = (out.options || []).slice(0, 2).map(x => video ? { title: tidy(x.title).slice(0, 60), sub: tidy(x.sub).slice(0, 80) } : tidy(x)).filter(x => video ? x.title : x);
      if (!opts.length) throw new Error('AI chưa viết được — bạn thử lại nhé');
      S.last = opts;
      const show = v => video ? `<b>${esc(v.title)}</b><br><small>${esc(v.sub)}</small>` : esc(v).replace(/\n/g, '<br>');
      OUT.innerHTML = `<div class="ai-cmp">${S.o.text?.trim() || S.o.oldTitle ? `<div class="ai-c old"><small>Bản của bạn</small><p>${video ? `<b>${esc(S.o.oldTitle || '')}</b><br><small>${esc(S.o.oldSub || '')}</small>` : esc(S.o.text).replace(/\n/g, '<br>')}</p></div>` : ''}${opts.map((v, i) => `<div class="ai-c"><small>Phương án ${i + 1} của AI</small><p>${show(v)}</p><button class="primary" data-use="${i}">Dùng bản này</button></div>`).join('')}</div>`;
      M.querySelector('.ai-more').hidden = false; haptic(10); window.SFX?.play('ting');
    } catch (e) { OUT.innerHTML = `<p class="ai-err">${esc(e.message)}</p>`; if (e.code === 'key') OUT.insertAdjacentHTML('beforeend', guide()); }
    finally { S.busy = false; go.disabled = false; }
  }
  return { open, undoToast };
}
