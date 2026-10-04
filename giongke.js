// Hành Trình Của Bạn — GHI GIỌNG KỂ cho mỗi kỷ niệm (MediaRecorder, ưu tiên m4a/AAC để iPhone phát được).
// Lưu trong máy (blobs 'v_<id ảnh>') + tải lên Drive vào đúng thư mục sự kiện. Phát trong trình xem và khi Kể chuyện.
import { icon, haptic } from './ui.js';

const MIMES = ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm'];
export const voiceMime = () => window.MediaRecorder ? MIMES.find(m => MediaRecorder.isTypeSupported?.(m)) || '' : null;
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function initVoice(A) {
  document.body.insertAdjacentHTML('beforeend', `<div class="modal" id="mVoice"><div class="card glass" style="width:min(420px,100%)"><h2>🎤 Kể lại kỷ niệm</h2><p class="lead vo-t"></p>
    <div class="vo-box"><ul class="vo-tips"><li>Hôm đó là dịp gì, ở đâu?</li><li>Ai có mặt, ai làm gì vui nhất?</li><li>Điều bạn muốn con cháu nhớ về ngày này</li></ul><canvas class="vo-wave" width="600" height="120"></canvas><div class="vo-time">0:00</div><button class="vo-rec" aria-label="Ghi âm"><i></i>${icon('mic', 34, 2)}</button><p class="vo-h">Chạm để bắt đầu kể · tối đa 3 phút</p></div>
    <div class="vo-acts" hidden><button data-v="play">${icon('play', 17, 2.2)}<span>Nghe lại</span></button><button data-v="redo">${icon('mic', 17, 2)}<span>Ghi lại</span></button><button data-v="del" class="danger" hidden>${icon('trash', 17)}<span>Xoá lời kể</span></button></div>
    <div class="foot"><button data-close>Huỷ</button><button class="primary" id="voOk" disabled>Lưu lời kể</button></div></div></div>`);
  const M = document.getElementById('mVoice'), REC = M.querySelector('.vo-rec'), CV = M.querySelector('.vo-wave'), X = CV.getContext('2d');
  const R = { m: null, rec: null, chunks: [], blob: null, t0: 0, raf: 0, stream: null, an: null, ac: null, au: null, dur: 0, mime: '' };
  const blobOf = async m => { let b = await A.dbGet('blobs', 'v_' + m.id); if (!b && m.voice?.driveId) { b = await A.drive?.fetchFile?.(m.voice.driveId); if (b) { b = new Blob([b], { type: m.voice.mime || 'audio/mp4' }); await A.dbPut('blobs', b, 'v_' + m.id); } } return b; };
  function draw() {
    const W = CV.width, H = CV.height; X.clearRect(0, 0, W, H); const g = X.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#ff8fbf'); g.addColorStop(1, '#ffb36b'); X.fillStyle = g;
    if (R.an) { const d = new Uint8Array(R.an.frequencyBinCount); R.an.getByteFrequencyData(d); const n = 40; for (let i = 0; i < n; i++) { const v = d[Math.floor(i * d.length / n / 1.6)] / 255, h = Math.max(6, v * H * .9); X.beginPath(); X.roundRect?.(i * (W / n) + 3, (H - h) / 2, W / n - 6, h, 6); X.fill(); } }
    if (R.rec?.state === 'recording') { const s = (performance.now() - R.t0) / 1000; M.querySelector('.vo-time').textContent = fmt(s); if (s >= 180) stop(); }
    R.raf = requestAnimationFrame(draw);
  }
  async function start() {
    if (voiceMime() === null) { A.toast('Trình duyệt này chưa ghi âm được — thử Safari / Chrome mới nhé', 3000); return; }
    try { R.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch (e) { A.toast('Bạn chưa cho phép dùng micro — bật trong cài đặt trình duyệt rồi thử lại', 3800); return; }
    R.mime = voiceMime(); R.chunks = []; R.rec = new MediaRecorder(R.stream, R.mime ? { mimeType: R.mime, audioBitsPerSecond: 64000 } : {});
    R.rec.ondataavailable = e => e.data.size && R.chunks.push(e.data);
    R.rec.onstop = () => { R.blob = new Blob(R.chunks, { type: (R.rec.mimeType || R.mime || 'audio/mp4').split(';')[0] }); R.dur = (performance.now() - R.t0) / 1000; R.stream.getTracks().forEach(t => t.stop()); R.ac?.close(); R.ac = R.an = null; ui(); };
    try { R.ac = new (window.AudioContext || window.webkitAudioContext)(); const src = R.ac.createMediaStreamSource(R.stream); R.an = R.ac.createAnalyser(); R.an.fftSize = 256; src.connect(R.an); } catch (e) { }
    R.rec.start(500); R.t0 = performance.now(); haptic(15); ui(); if (!R.raf) draw();
  }
  function stop() { if (R.rec?.state === 'recording') { R.rec.stop(); haptic(10); } }
  function ui() {
    const on = R.rec?.state === 'recording'; M.classList.toggle('rec', on); M.classList.toggle('has', !!R.blob); M.querySelector('.vo-h').textContent = on ? 'Đang ghi… chạm để dừng' : R.blob ? `Đã ghi ${fmt(R.dur)} — nghe lại hoặc lưu` : R.m?.voice ? `Đã có lời kể ${fmt(R.m.voice.dur || 0)}` : 'Chạm để bắt đầu kể · tối đa 3 phút';
    M.querySelector('.vo-acts').hidden = on || (!R.blob && !R.m?.voice); M.querySelector('[data-v=del]').hidden = !R.m?.voice || !!R.blob; document.getElementById('voOk').disabled = !R.blob || on;
  }
  REC.onclick = () => R.rec?.state === 'recording' ? stop() : start();
  M.querySelector('.vo-acts').onclick = async e => {
    const b = e.target.closest('[data-v]'); if (!b) return; const v = b.dataset.v;
    if (v === 'play') { R.au?.pause(); const bl = R.blob || await blobOf(R.m); if (!bl) { A.toast('Không mở được lời kể', 1800); return; } R.au = new Audio(URL.createObjectURL(bl)); R.au.play().catch(() => A.toast('Bấm lại để nghe', 1500)); }
    else if (v === 'redo') { R.blob = null; start(); }
    else if (v === 'del') { if (!(await A.ask('Xoá lời kể này?', 'Lời kể sẽ bị xoá khỏi máy (bản trên Drive vẫn còn trong thư mục sự kiện).', 'Xoá', true))) return; await A.dbDel('blobs', 'v_' + R.m.id); delete R.m.voice; await A.saveMoment(R.m); A.closeModal(M); A.onChange?.(R.m); A.toast('Đã xoá lời kể', 1500); }
  };
  document.getElementById('voOk').onclick = async () => {
    const m = R.m, blob = R.blob; if (!m || !blob) return; await A.dbPut('blobs', blob, 'v_' + m.id);
    m.voice = { dur: Math.round(R.dur * 10) / 10, mime: blob.type, ts: Date.now() }; await A.saveMoment(m); A.closeModal(M); haptic(15); A.toast('Đã lưu lời kể 🎤', 1600); A.onChange?.(m);
    const ext = /mp4|aac/.test(blob.type) ? 'm4a' : 'webm', d = new Date(m.ts), name = `Giọng kể ${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} — ${R.title || 'kỷ niệm'}.${ext}`;
    A.drive?.putVisible?.({ blob, name, kidId: m.kidIds?.[0] || m.kidId, key: R.key, mime: blob.type }).then(async id => { if (id) { const f = await A.dbGetRaw('moments', m.id); if (f?.voice) { f.voice.driveId = id; await A.saveMoment(f); } } });
  };
  new MutationObserver(() => { if (!M.classList.contains('open')) { stop(); R.au?.pause(); cancelAnimationFrame(R.raf); R.raf = 0; } }).observe(M, { attributes: true });
  // phát lời kể (trả về Audio; onEnd khi hết)
  async function play(m, { onEnd } = {}) { const b = await blobOf(m); if (!b) { onEnd?.(); return null; } const au = new Audio(URL.createObjectURL(b)); au.onended = () => { URL.revokeObjectURL(au.src); onEnd?.(); }; try { await au.play(); } catch (e) { onEnd?.(); return null; } return au; }
  return {
    open(m, { title = '', key = '' } = {}) { R.m = m; R.blob = null; R.title = title; R.key = key; M.querySelector('.vo-t').textContent = title ? `“${title}” — kể lại bằng giọng của bạn để sau này con cháu được nghe.` : 'Kể lại bằng giọng của bạn để sau này con cháu được nghe.'; M.querySelector('.vo-time').textContent = m.voice ? fmt(m.voice.dur || 0) : '0:00'; X.clearRect(0, 0, CV.width, CV.height); ui(); A.openModal(M); },
    play, blobOf, supported: () => voiceMime() !== null
  };
}
