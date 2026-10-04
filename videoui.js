// Hành Trình Của Bạn — giao diện 🎬 VIDEO KỶ NIỆM: chọn mẫu, khung, độ dài, nhạc, ảnh → xem trước → dựng MP4 → lưu máy / Drive / dòng thời gian.
import { icon, haptic, contextMenu } from './ui.js';
import { TEMPLATES, LENGTHS, scoreThumb, pickMoments, storyboard, createEngine, createRenderer, makeAssets, exportMp4, recordFallback, sabanIntro } from './videokn.js';
import { renderMusic, userMusic, STYLES } from './videonhac.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MUSICS = [['auto', 'Theo mẫu'], ['hopnhac', 'Hộp nhạc'], ['vui', 'Vui nhộn'], ['dienanh', 'Điện ảnh'], ['file', 'Bài của bạn…']];

export function initVideoUI(A) {
  document.body.insertAdjacentHTML('beforeend', `<div class="modal gsheet" id="mVid"><div class="card glass">
    <h2>🎬 Video kỷ niệm</h2>
    <div class="vk-pv"><canvas class="vk-cv"></canvas><video class="vk-out" playsinline controls hidden></video><button class="vk-play" aria-label="Xem trước">${icon('play', 30, 2.2)}</button><div class="vk-busy" hidden><i></i><b>Đang chuẩn bị…</b></div></div>
    <label class="f">Tiêu đề<input id="vkTi" maxlength="60"></label>
    <div class="vk-row"><b>Mẫu</b><div class="vk-ch" data-k="tpl">${Object.entries(TEMPLATES).map(([k, t]) => `<button type="button" data-v="${k}">${{ dienanh: '🎞️', nhanh: '⚡', hoainiem: '📷', saban: '🗺️' }[k]} ${t.t}</button>`).join('')}</div></div>
    <div class="vk-row two"><div><b>Khung</b><div class="vk-ch" data-k="ratio"><button type="button" data-v="9:16">9:16 dọc</button><button type="button" data-v="16:9">16:9 ngang</button></div></div><div><b>Độ dài</b><div class="vk-ch" data-k="dur">${LENGTHS.map(l => `<button type="button" data-v="${l}">${l}s</button>`).join('')}</div></div></div>
    <div class="vk-row"><b>Nhạc</b><div class="vk-ch" data-k="music">${MUSICS.map(([k, t]) => `<button type="button" data-v="${k}">${t}</button>`).join('')}</div><input type="file" id="vkMf" accept="audio/*" hidden></div>
    <div class="vk-row"><b>Ảnh trong video <small class="vk-n"></small></b><div class="vk-ph"></div></div>
    <div class="vk-prog" hidden><div class="vk-bar"><i></i></div><p class="vk-pt"></p><p class="hint">Giữ màn hình mở và ở lại trong app trong lúc tạo video nhé.</p></div>
    <div class="vk-done" hidden><p class="vk-dt"></p><div class="vk-acts"><button class="primary" data-d="save">${icon('download', 17, 2)}<span>Lưu vào máy</span></button><button data-d="drive" hidden>${icon('cloud', 17, 2)}<span>Lưu lên Drive</span></button><button data-d="tl">${icon('timeline', 17, 2)}<span>Gắn vào dòng thời gian</span></button></div></div>
    <div class="foot"><button data-close>Đóng</button><button class="primary" id="vkGo">${icon('video', 17, 2)}<span>Tạo video</span></button></div>
  </div></div>`);
  const M = document.getElementById('mVid'), OUT = M.querySelector('.vk-out'); let CV = M.querySelector('.vk-cv');
  const V = { o: null, ms: [], picked: [], tpl: 'dienanh', ratio: '9:16', dur: 30, music: 'auto', userBlob: null, eng: null, SB: null, R: null, mus: null, ac: null, src: null, raf: 0, file: null, abort: null, dirty: true, scores: new Map() };
  const busy = (on, t) => { M.querySelector('.vk-busy').hidden = !on; if (t) M.querySelector('.vk-busy b').textContent = t; };
  const ui = () => {
    M.classList.toggle('wide', V.ratio === '16:9');
    for (const g of M.querySelectorAll('.vk-ch')) g.querySelectorAll('button').forEach(b => b.classList.toggle('on', String(V[g.dataset.k]) === b.dataset.v));
    M.querySelector('[data-k=tpl] [data-v=saban]').disabled = !V.geo;
    M.querySelector('.vk-n').textContent = `· ${V.picked.length} / ${V.ms.length} · chạm ảnh để đổi thứ tự hoặc bỏ`;
    M.querySelector('.vk-ph').innerHTML = V.picked.map((m, i) => `<button data-i="${i}" class="${m.type === 'video' ? 'v' : ''}"><img data-mid="${m.id}" alt=""><span>${i + 1}</span></button>`).join('') + (V.ms.length > V.picked.length ? `<button class="add" data-add="1">${icon('plus', 20, 2.4)}</button>` : '');
    M.querySelectorAll('.vk-ph img').forEach(im => A.thumbURL(im.dataset.mid).then(u => { if (u) im.src = u; }));
    M.querySelector('[data-d=drive]').hidden = !A.drive?.signedIn;
  };
  const changed = () => { V.dirty = true; stopPreview(); OUT.hidden = true; CV.hidden = false; M.querySelector('.vk-done').hidden = true; M.querySelector('.vk-play').hidden = false; ui(); };
  M.addEventListener('click', async e => {
    const c = e.target.closest('.vk-ch button'); if (c && !c.disabled) { const k = c.parentElement.dataset.k; let v = c.dataset.v; if (k === 'dur') v = +v; if (k === 'music' && v === 'file') { M.querySelector('#vkMf').click(); return; } V[k] = v; haptic(5); if (k === 'dur') await autoPick(); changed(); return; }
    const ph = e.target.closest('.vk-ph [data-i]'); if (ph) { const i = +ph.dataset.i; contextMenu({ at: ph, title: `Ảnh ${i + 1}`, items: [i > 0 && { icon: 'back', label: 'Đưa lên trước', act: () => { [V.picked[i - 1], V.picked[i]] = [V.picked[i], V.picked[i - 1]]; changed(); } }, i < V.picked.length - 1 && { icon: 'chevronRight', label: 'Đưa ra sau', act: () => { [V.picked[i + 1], V.picked[i]] = [V.picked[i], V.picked[i + 1]]; changed(); } }, V.picked.length > 2 && { icon: 'close', label: 'Bỏ khỏi video', danger: true, act: () => { V.picked.splice(i, 1); changed(); } }] }); return; }
    if (e.target.closest('[data-add]')) { const rest = V.ms.filter(m => !V.picked.includes(m)); contextMenu({ at: e.target.closest('[data-add]'), title: 'Thêm ảnh nào?', items: rest.slice(0, 40).map(m => ({ img: '', label: `${m.type === 'video' ? '🎞️ Video' : '🖼️ Ảnh'} · ${A.dmy(m.ts)} ${new Date(m.ts).toTimeString().slice(0, 5)}`, act: () => { V.picked.push(m); V.picked.sort((a, b) => a.ts - b.ts); changed(); } })) }); return; }
    if (e.target.closest('.vk-play')) { previewToggle(); return; }
    const d = e.target.closest('[data-d]'); if (d && V.file) {
      if (d.dataset.d === 'save') { const f = V.file; if (navigator.canShare?.({ files: [f] }) && A.MOBILE) { try { await navigator.share({ files: [f], title: V.o.title }); return; } catch (er) { if (er.name === 'AbortError') return; } } await A.shareOrDownload(f, f.name); }
      else if (d.dataset.d === 'drive') { d.disabled = true; const id = await A.drive.putVisible({ blob: V.file, name: V.file.name, kidId: V.o.people?.[0]?.id, key: V.o.key, mime: 'video/mp4' }); d.disabled = false; A.toast(id ? 'Đã lưu video lên Drive, trong thư mục của chuyến đi ☁️' : 'Chưa lưu được lên Drive — thử lại khi có mạng', 2800); }
      else if (d.dataset.d === 'tl') { d.disabled = true; await A.addToTimeline(V.file, V.o, V.ms); A.toast('Đã gắn video vào dòng thời gian 🎬', 2200); }
    }
  });
  M.querySelector('#vkMf').onchange = async e => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; V.userBlob = f; V.music = 'file'; changed(); A.toast('Đã chọn nhạc: ' + f.name, 1800); };
  M.querySelector('#vkTi').addEventListener('change', changed);
  // ---------- chọn ảnh tự động ----------
  async function autoPick() {
    busy(true, 'Đang chọn ảnh đẹp nhất…');
    for (const m of V.ms) if (m.type !== 'video' && !V.scores.has(m.id)) { const t = await A.thumbBlob(m.id); V.scores.set(m.id, t ? await scoreThumb(t).catch(() => null) : null); }
    const T = TEMPLATES[V.tpl], bpm = STYLES[T.music]?.bpm || 84, per = (T.arc ? 1.7 : T.beats) * 60 / bpm, n = Math.max(3, Math.min(V.ms.length, Math.round((V.dur - 7) / per)));
    const ms = V.ms.map(m => Object.assign(m, { sc: V.scores.get(m.id) || m.sc }));
    V.picked = pickMoments(ms, n); busy(false);
  }
  // ---------- dựng kịch bản + nhạc + động cơ ----------
  async function build(live, lo = false) {
    const T = TEMPLATES[V.tpl], style = V.music === 'auto' ? T.music : V.music;
    let mus = null, bpm = STYLES[style]?.bpm || 84, offset = .2;
    if (style === 'file' && V.userBlob) { busy(true, 'Đang dò nhịp bài nhạc của bạn…'); mus = await userMusic(V.userBlob, V.dur); bpm = mus.bpm; offset = mus.offset; }
    const items = V.picked.map(m => ({ id: m.id, kind: m.type === 'video' ? 'video' : 'image', ts: m.ts, heic: m.heic, dur: m.dur, place: m.place?.name?.split(',')[0] || '', approx: m.approx, approxTxt: m.approx ? A.approxLabel(m.approx, m.ts) : '', _s: m._s }));
    const SB = storyboard({ items, tpl: V.tpl, dur: V.dur, bpm, offset, title: M.querySelector('#vkTi').value.trim() || V.o.title, sub: V.o.sub, ratio: V.ratio, intro: V.tpl === 'saban' && V.geo ? 7 : 0 });
    if (!mus) { busy(true, 'Đang soạn nhạc…'); mus = await renderMusic(style === 'file' ? T.music : style, SB.dur, { seed: 7, nostalgia: !!T.nostalgia }); }
    if (lo) { SB.W = V.ratio === '16:9' ? 1280 : 720; SB.H = V.ratio === '16:9' ? 720 : 1280; }
    const W = SB.W, H = SB.H;
    if (!V.eng || V.eng.W !== W || V.eng.H !== H) { // đổi cỡ: thay canvas mới (ngữ cảnh WebGL cũ đã mất không dùng lại được)
      if (V.eng) { V.eng.dispose?.(); const n = document.createElement('canvas'); n.className = 'vk-cv'; CV.replaceWith(n); CV = n; }
      V.eng = createEngine(CV, { W, H }); }
    const MB = await import('./lib/mediabunny.min.mjs');
    const assets = makeAssets({ getBlob: it => A.blob('o_' + it.id), getThumb: it => A.thumbBlob(it.id), avatars: await A.avatarImgs(V.o.people || []), MB });
    if (V.tpl === 'saban' && V.geo) { try { busy(true, 'Đang dựng sa bàn cho đoạn mở đầu…'); const area = await A.areaFor(V.geo); if (area) assets.saban = await sabanIntro({ area, route: V.route, W, H, chibiImg: (await A.avatarImgs([A.me()].filter(Boolean)))[0] }); } catch (e) { console.warn('sa bàn', e); } }
    V.SB = SB; V.mus = mus; V.R?.dispose?.(); V.R = createRenderer(V.eng, SB, assets); V.dirty = false; busy(false);
    await V.R.prepare(0, live); await V.R.drawAt(.6, 18);
  }
  // ---------- xem trước (thời gian thật theo nhạc) ----------
  function stopPreview() { if (V.src) { try { V.src.stop(); } catch (e) { } V.src = null; } cancelAnimationFrame(V.raf); V.raf = 0; M.querySelector('.vk-play').innerHTML = icon('play', 30, 2.2); M.classList.remove('playing'); }
  async function previewToggle() {
    if (V.src) { stopPreview(); return; }
    if (V.dirty || !V.R) { try { await build(true); } catch (e) { console.warn(e); A.toast('Chưa xem trước được: ' + (e.message || e), 3000); busy(false); return; } }
    V.ac ||= new (window.AudioContext || window.webkitAudioContext)(); await V.ac.resume();
    const src = V.ac.createBufferSource(); src.buffer = V.mus.buffer; src.connect(V.ac.destination); const st = V.ac.currentTime + .05; src.start(st); V.src = src; M.classList.add('playing');
    M.querySelector('.vk-play').innerHTML = icon('pause', 30, 2.2); let busyF = false;
    const f = async () => { if (!V.src) return; const t = V.ac.currentTime - st; if (t >= V.SB.dur) { stopPreview(); return; } V.raf = requestAnimationFrame(f); if (busyF) return; busyF = true; try { await V.R.prepare(t, true); await V.R.drawAt(Math.max(0, t), Math.round(t * 30)); } finally { busyF = false; } };
    V.raf = requestAnimationFrame(f); src.onended = () => stopPreview();
  }
  // ---------- tạo video ----------
  let wake = null;
  M.querySelector('#vkGo').onclick = async () => {
    const go = M.querySelector('#vkGo'); if (V.abort) { V.abort.abort(); return; }
    stopPreview(); go.querySelector('span').textContent = 'Huỷ'; const P = M.querySelector('.vk-prog'); P.hidden = false; M.querySelector('.vk-done').hidden = true;
    const ac = V.abort = new AbortController(); try { wake = await navigator.wakeLock?.request('screen'); } catch (e) { }
    const vis = async () => { if (!document.hidden && wake?.released) { try { wake = await navigator.wakeLock.request('screen'); } catch (e) { } } }; document.addEventListener('visibilitychange', vis);
    const prog = p => { M.querySelector('.vk-bar i').style.width = (p.p * 100).toFixed(1) + '%'; M.querySelector('.vk-pt').textContent = p.fpsOut ? `Đang dựng… ${Math.round(p.p * 100)}% · ${p.fpsOut.toFixed(0)} khung/giây` : `Đang dựng… ${Math.round(p.p * 100)}%`; };
    let res = null, err = null;
    for (const q of [{ h: 1080 }, { h: 720 }]) {
      try {
        await build(false, q.h === 720 || V.lo);
        res = await exportMp4({ canvas: CV, renderer: V.R, SB: V.SB, audio: V.mus.buffer, onProg: prog, signal: ac.signal, bitrate: V.br }); break;
      } catch (e) { err = e; if (e.code === 'ABORT') break; if (e.code === 'NO_WEBCODECS') { try { M.querySelector('.vk-pt').textContent = 'Máy này dựng bằng cách ghi thời gian thực — giữ màn hình mở nhé'; res = await recordFallback({ canvas: CV, renderer: V.R, SB: V.SB, audio: V.mus.buffer, onProg: prog, signal: ac.signal }); } catch (e2) { err = e2; } break; } console.warn('xuất video', e); }
    }
    document.removeEventListener('visibilitychange', vis); try { await wake?.release(); } catch (e) { } V.abort = null; go.querySelector('span').textContent = 'Tạo lại'; P.hidden = true;
    if (!res) { if (err?.code !== 'ABORT') A.toast((err?.message || 'Chưa tạo được video') + ' — thử độ dài ngắn hơn, hoặc dùng “Kể chuyện” rồi quay màn hình', 5000); return; }
    const name = `Video-ky-niem-${A.noAccent(M.querySelector('#vkTi').value.trim() || V.o.title || 'hanh-trinh')}.${res.file.type.includes('webm') ? 'webm' : 'mp4'}`;
    V.file = new File([res.file], name, { type: res.file.type }); A.onBuilt?.(V.file, res);
    OUT.src = URL.createObjectURL(V.file); OUT.hidden = false; CV.hidden = true; M.querySelector('.vk-play').hidden = true;
    M.querySelector('.vk-dt').textContent = `Xong! ${(V.file.size / 1e6).toFixed(1).replace('.', ',')} MB · ${Math.round(V.SB.dur)} giây · dựng trong ${(res.ms / 1000 || 0).toFixed(1).replace('.', ',')} giây`;
    M.querySelector('.vk-done').hidden = false; haptic(20); A.confetti?.();
  };
  new MutationObserver(() => { if (!M.classList.contains('open')) { stopPreview(); V.abort?.abort(); } }).observe(M, { attributes: true });
  return {
    async open(o) {
      V.o = o; V.ms = o.ms.slice().sort((a, b) => a.ts - b.ts); V.file = null; V.dirty = true; V.music = 'auto'; V.userBlob = null;
      const g = V.ms.map(m => m.place || m.gps).filter(Boolean); V.geo = g[0] || null;
      const byDay = new Map(); for (const m of V.ms) { const p = m.place || m.gps; if (p && !byDay.has(A.ymd(m.ts))) byDay.set(A.ymd(m.ts), p); } V.route = [...byDay.values()];
      V.tpl = o.tpl || (V.ms.length > 20 ? 'nhanh' : 'dienanh'); V.ratio = '9:16'; V.dur = V.ms.length < 10 ? 30 : V.ms.length < 30 ? 60 : 90;
      M.querySelector('#vkTi').value = o.title || ''; OUT.hidden = true; CV.hidden = false; M.querySelector('.vk-done').hidden = true; M.querySelector('.vk-prog').hidden = true; M.querySelector('.vk-play').hidden = false; M.querySelector('#vkGo span').textContent = 'Tạo video';
      A.openModal(M); ui(); await autoPick(); ui();
      try { await build(true); } catch (e) { console.warn(e); A.toast('Máy này chưa dựng được video (cần WebGL2)', 3500); }
    },
    get state() { return V; }
  };
}
