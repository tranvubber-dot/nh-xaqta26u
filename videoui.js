// Hành Trình Của Bạn — giao diện 🎬 VIDEO KỶ NIỆM: chọn mẫu, khung, độ dài, nhạc, ảnh → xem trước → dựng MP4 → lưu máy / Drive / dòng thời gian.
import { icon, haptic, contextMenu, undoToast } from './ui.js';
import { TEMPLATES, LENGTHS, scoreThumb, pickMoments, storyboard, createEngine, createRenderer, makeAssets, exportMp4, recordFallback, sceneSpan, clipAudio } from './videokn.js';
import { mapIntro } from './bando.js';
import { renderMusic, userMusic, mixClipAudio, STYLES } from './videonhac.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MUSICS = [['auto', 'Theo mẫu'], ['hopnhac', 'Hộp nhạc'], ['vui', 'Vui nhộn'], ['dienanh', 'Điện ảnh'], ['file', 'Bài của bạn…']];

export function initVideoUI(A) {
  document.body.insertAdjacentHTML('beforeend', `<div class="modal gsheet" id="mVid"><div class="card glass">
    <h2>🎬 Video kỷ niệm</h2>
    <div class="vk-pv"><canvas class="vk-cv"></canvas><video class="vk-out" playsinline hidden></video><button class="vk-fsb" type="button" aria-label="Xem toàn màn hình">⤢ Toàn màn hình</button><button class="vk-play" aria-label="Xem trước">${icon('play', 30, 2.2)}</button><div class="vk-busy" hidden><i></i><b>Đang chuẩn bị…</b></div></div>
    <div class="vk-tirow"><label class="f">Tiêu đề<input id="vkTi" maxlength="60"></label><button type="button" id="vkAI" aria-label="AI viết tiêu đề và phụ đề">✨ AI</button></div>
    <div class="vk-row"><b>Mẫu</b><div class="vk-ch" data-k="tpl">${Object.entries(TEMPLATES).map(([k, t]) => `<button type="button" data-v="${k}">${{ dienanh: '🎞️', nhanh: '⚡', hoainiem: '📷', bando: '🗺️' }[k]} ${t.t}</button>`).join('')}</div></div>
    <div class="vk-row two"><div><b>Khung</b><div class="vk-ch" data-k="ratio"><button type="button" data-v="9:16">9:16 dọc</button><button type="button" data-v="16:9">16:9 ngang</button></div></div><div><b>Độ dài</b><div class="vk-ch" data-k="dur">${LENGTHS.map(l => `<button type="button" data-v="${l}">${l}s</button>`).join('')}</div></div></div>
    <div class="vk-row"><b>Nhạc</b><div class="vk-ch" data-k="music">${MUSICS.map(([k, t]) => `<button type="button" data-v="${k}">${t}</button>`).join('')}</div><input type="file" id="vkMf" accept="audio/*" hidden></div>
    <div class="vk-row vk-orig" hidden><b>Tiếng gốc của clip <small>· nghe nhỏ dưới nhạc nền</small></b><div class="vk-ch" data-k="orig"><button type="button" data-v="0">🔇 Tắt</button><button type="button" data-v="1">🔉 Giữ nhỏ</button><button type="button" data-v="2">🔊 Rõ hơn</button></div></div>
    <div class="vk-row"><b>Ảnh trong video <small class="vk-n"></small></b><div class="vk-ph"></div></div>
    <div class="vk-prog" hidden><div class="vk-bar"><i></i></div><p class="vk-pt"></p><p class="hint">Giữ màn hình mở và ở lại trong app trong lúc tạo video nhé.</p></div>
    <div class="vk-done" hidden><p class="vk-dt"></p><div class="vk-acts"><button class="primary" data-d="save">${icon('download', 17, 2)}<span>Lưu vào máy</span></button><button data-d="drive" hidden>${icon('cloud', 17, 2)}<span>Lưu lên Drive</span></button><button data-d="tl">${icon('timeline', 17, 2)}<span>Gắn vào dòng thời gian</span></button></div></div>
    <div class="foot"><button data-close>Đóng</button><button class="primary" id="vkGo">${icon('video', 17, 2)}<span>Tạo video</span></button></div>
  </div></div>
  <div id="vkFs" aria-hidden="true"><i class="vf-h"></i><div class="vf-st"></div><button class="vf-x" aria-label="Đóng">${icon('close', 22, 2.2)}</button>
    <div class="vf-bar"><div class="vf-ctl"><button class="vf-pp" aria-label="Phát / dừng">${icon('play', 22, 2.4)}</button><span class="vf-t vf-t0">0:00</span><input class="vf-sk" type="range" min="0" max="1000" value="0" aria-label="Tua"><span class="vf-t vf-t1">0:00</span></div>
    <div class="vf-acts" hidden><button class="primary" data-d="save">${icon('download', 17, 2)}<span>Lưu vào máy</span></button><button data-d="share">${icon('share', 17, 2)}<span>Chia sẻ</span></button></div></div></div>`);
  const M = document.getElementById('mVid'), OUT = M.querySelector('.vk-out'), PVE = M.querySelector('.vk-pv'); let CV = M.querySelector('.vk-cv');
  const V = { o: null, ms: [], picked: [], tpl: 'dienanh', ratio: '9:16', dur: 30, music: 'auto', orig: '0', clipAud: new Map(), userBlob: null, eng: null, SB: null, R: null, mus: null, ac: null, src: null, raf: 0, file: null, abort: null, dirty: true, scores: new Map() };
  const busy = (on, t) => { PVE.querySelector('.vk-busy').hidden = !on; if (t) PVE.querySelector('.vk-busy b').textContent = t; };
  const ui = () => {
    M.classList.toggle('wide', V.ratio === '16:9');
    for (const g of M.querySelectorAll('.vk-ch')) g.querySelectorAll('button').forEach(b => b.classList.toggle('on', String(V[g.dataset.k]) === b.dataset.v));
    M.querySelector('[data-k=tpl] [data-v=bando]').disabled = !V.geo || !navigator.onLine;
    M.querySelector('.vk-orig').hidden = !V.picked.some(m => m.type === 'video');
    M.querySelector('.vk-n').textContent = `· ${V.picked.length} / ${V.ms.length} · chạm ảnh để đổi thứ tự hoặc bỏ`;
    M.querySelector('.vk-ph').innerHTML = V.picked.map((m, i) => `<button data-i="${i}" class="${m.type === 'video' ? 'v' : ''}"><img data-mid="${m.id}" alt=""><span>${i + 1}</span></button>`).join('') + (V.ms.length > V.picked.length ? `<button class="add" data-add="1">${icon('plus', 20, 2.4)}</button>` : '');
    M.querySelectorAll('.vk-ph img').forEach(im => A.thumbURL(im.dataset.mid).then(u => { if (u) im.src = u; }));
    M.querySelector('[data-d=drive]').hidden = !A.drive?.signedIn;
  };
  const changed = () => { V.dirty = true; V.from = 0; V.pt = 0; stopPreview(); OUT.hidden = true; CV.hidden = false; M.querySelector('.vk-done').hidden = true; PVE.querySelector('.vk-play').hidden = false; ui(); };
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
  M.querySelector('#vkAI').onclick = () => { if (!A.ai || !V.o) return; const ti = M.querySelector('#vkTi');
    A.ai({ kind: 'video', heading: '✨ Lời cho video', goLabel: 'Viết tiêu đề + phụ đề', text: [ti.value, V.o.sub].filter(Boolean).join(' · '), oldTitle: ti.value, oldSub: V.o.sub || '', lead: 'AI gợi ý tiêu đề và phụ đề ngắn cho video, từ tên và ngày của kỷ niệm.', mids: V.picked.slice(0, 4).map(m => m.id),
      ctx: { date: V.o.sub || '', people: (V.o.people || []).filter(p => p.role !== 'me').map(p => p.name) },
      onUse: v => { const o0 = { t: ti.value, s: V.o.sub }; ti.value = v.title; V.o.sub = v.sub; changed(); A.openModal(M); undoToast?.('Đã dùng lời của AI', () => { ti.value = o0.t; V.o.sub = o0.s; changed(); }, 6000); } }); };
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
    const SB = storyboard({ items, tpl: V.tpl, dur: V.dur, bpm, offset, title: M.querySelector('#vkTi').value.trim() || V.o.title, sub: V.o.sub, ratio: V.ratio, intro: V.tpl === 'bando' && V.geo ? 7 : 0 });
    if (!mus) { busy(true, 'Đang soạn nhạc…'); mus = await renderMusic(style === 'file' ? T.music : style, SB.dur, { seed: 7, nostalgia: !!T.nostalgia }); }
    if (lo) { SB.W = V.ratio === '16:9' ? 1280 : 720; SB.H = V.ratio === '16:9' ? 720 : 1280; }
    const W = SB.W, H = SB.H;
    if (!V.eng || V.eng.W !== W || V.eng.H !== H) { // đổi cỡ: thay canvas mới (ngữ cảnh WebGL cũ đã mất không dùng lại được)
      if (V.eng) { V.eng.dispose?.(); const n = document.createElement('canvas'); n.className = 'vk-cv'; CV.replaceWith(n); CV = n; }
      V.eng = createEngine(CV, { W, H }); }
    const MB = await import('./lib/mediabunny.min.mjs');
    const assets = makeAssets({ getBlob: it => A.blob('o_' + it.id), getThumb: it => A.thumbBlob(it.id), avatars: await A.avatarImgs(V.o.people || []), MB });
    if (V.tpl === 'bando' && V.geo) { try { busy(true, 'Đang tải bản đồ cho đoạn mở đầu…'); V.mapF?.dispose?.(); V.mapF = assets.saban = await mapIntro({ route: V.route.length ? V.route : [V.geo], W, H, theme: (await A.mapTheme?.()) || A.theme?.() || 'dawn' }); } catch (e) { console.warn('bản đồ', e); } }
    // tiếng gốc của các clip video (nếu bạn chọn giữ): lấy đúng đoạn clip hiện trên video, trộn nhỏ dưới nhạc
    if (V.orig !== '0') { const cs = SB.scenes.filter(s => s.kind === 'clip'); if (cs.length) { busy(true, 'Đang lấy tiếng gốc của clip…');
      const list = []; for (const s of cs) { const [a, b] = sceneSpan(SB, s), key = s.item.id + '|' + (b - a).toFixed(3); if (!V.clipAud.has(key)) V.clipAud.set(key, await clipAudio(await A.blob('o_' + s.item.id), b - a, { MB, dur: s.item.dur }).catch(() => null)); list.push({ buffer: V.clipAud.get(key), at: a, len: b - a }); }
      if (list.some(c => c.buffer)) mus = { ...mus, buffer: await mixClipAudio(mus.buffer, list, { level: V.orig === '2' ? 1.6 : 1 }) };
      else if (live) A.toast('Clip này không có tiếng gốc', 1800); } }
    V.SB = SB; V.mus = mus; V.R?.dispose?.(); V.R = createRenderer(V.eng, SB, assets); V.dirty = false; busy(false);
    await V.R.prepare(0, live); await V.R.drawAt(.6, 18);
  }
  // ---------- xem trước (thời gian thật theo nhạc) ----------
  function stopPreview() { if (V.src) { const s0 = V.src; V.src = null; try { s0.stop(); } catch (e) { } } cancelAnimationFrame(V.raf); V.raf = 0; PVE.querySelector('.vk-play').innerHTML = icon('play', 30, 2.2); M.classList.remove('playing'); fsUi?.(); }
  async function previewToggle() {
    if (V.src) { stopPreview(); return; }
    if (V.dirty || !V.R) { try { await build(true); } catch (e) { console.warn(e); A.toast('Chưa xem trước được: ' + (e.message || e), 3000); busy(false); return; } }
    V.ac ||= new (window.AudioContext || window.webkitAudioContext)(); await V.ac.resume();
    const from = V.from >= V.SB.dur - .3 ? 0 : (V.from || 0); V.from = 0;
    const src = V.ac.createBufferSource(); src.buffer = V.mus.buffer; src.connect(V.ac.destination); const st = V.ac.currentTime + .05 - from; src.start(V.ac.currentTime + .05, from); V.src = src; V.st = st; M.classList.add('playing'); fsUi();
    PVE.querySelector('.vk-play').innerHTML = icon('pause', 30, 2.2); let busyF = false;
    const f = async () => { if (!V.src) return; const t = V.ac.currentTime - st; if (t >= V.SB.dur) { stopPreview(); V.pt = 0; fsUi(); return; } V.pt = t; fsTime(); V.raf = requestAnimationFrame(f); if (busyF) return; busyF = true; try { await V.R.prepare(t, true); await V.R.drawAt(Math.max(0, t), Math.round(t * 30)); } finally { busyF = false; } };
    V.raf = requestAnimationFrame(f); src.onended = () => { if (V.src === src) stopPreview(); };
  }
  // ---------- TOÀN MÀN HÌNH: khung xem trước / video đã dựng phóng ra lớp phủ đen (FLIP), thanh phát + tua tự viết, kéo xuống để đóng ----------
  const FS = document.getElementById('vkFs'), PV = M.querySelector('.vk-pv'), FST = FS.querySelector('.vf-st'), SK = FS.querySelector('.vf-sk');
  const mmss = t => { t = Math.max(0, t || 0); return Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0'); };
  const isOut = () => !OUT.hidden && V.file;
  let seeking = false;
  function fsTime() {
    if (!FS.classList.contains('on')) return; const out = isOut(), d = out ? (OUT.duration || 0) : (V.SB?.dur || 0), t = out ? OUT.currentTime : (V.src ? V.pt : (V.from || V.pt || 0));
    FS.querySelector('.vf-t0').textContent = mmss(t); FS.querySelector('.vf-t1').textContent = mmss(d); if (!seeking && d) SK.value = Math.round(t / d * 1000);
  }
  function fsUi() {
    if (!FS.classList.contains('on')) return; const playing = isOut() ? !OUT.paused : !!V.src;
    FS.querySelector('.vf-pp').innerHTML = icon(playing ? 'pause' : 'play', 22, 2.4); FS.querySelector('.vf-acts').hidden = !isOut(); fsTime();
  }
  OUT.addEventListener('timeupdate', fsTime); OUT.addEventListener('play', fsUi); OUT.addEventListener('pause', fsUi); OUT.addEventListener('ended', fsUi); OUT.addEventListener('loadedmetadata', fsTime);
  const EZ = 'cubic-bezier(.2,.8,.2,1)';
  function openFs() {
    if (FS.classList.contains('on')) return; const r0 = PV.getBoundingClientRect();
    FS.classList.toggle('wide', V.ratio === '16:9'); FS.classList.add('on'); FS.setAttribute('aria-hidden', 'false'); FST.appendChild(PV); haptic(8);
    const r1 = PV.getBoundingClientRect(), sx = r0.width / r1.width, sy = r0.height / r1.height;
    PV.animate([{ transform: `translate(${r0.left - r1.left + (r0.width - r1.width) / 2}px, ${r0.top - r1.top + (r0.height - r1.height) / 2}px) scale(${sx}, ${sy})`, borderRadius: '22px' }, { transform: 'none', borderRadius: '0px' }], { duration: 380, easing: EZ });
    FS.animate([{ backgroundColor: 'rgba(0,0,0,0)' }, { backgroundColor: '#000' }], { duration: 300, easing: 'ease-out' });
    fsUi(); if (isOut()) { OUT.play().catch(() => { }); }
  }
  function closeFs() {
    if (!FS.classList.contains('on')) return; const holder = M.querySelector('.vk-pvh'), r1 = PV.getBoundingClientRect();
    FS.classList.remove('on'); FS.setAttribute('aria-hidden', 'true'); FST.style.transform = ''; holder.appendChild(PV); const r0 = PV.getBoundingClientRect();
    if (r0.width) PV.animate([{ transform: `translate(${r1.left - r0.left + (r1.width - r0.width) / 2}px, ${r1.top - r0.top + (r1.height - r0.height) / 2}px) scale(${r1.width / r0.width}, ${r1.height / r0.height})` }, { transform: 'none' }], { duration: 320, easing: EZ });
    if (isOut()) OUT.pause();
  }
  PV.insertAdjacentHTML('beforebegin', '<div class="vk-pvh"></div>'); M.querySelector('.vk-pvh').appendChild(PV);
  PV.addEventListener('click', e => { if (e.target.closest('.vk-play')) return; if (FS.classList.contains('on')) { if (isOut()) (OUT.paused ? OUT.play() : OUT.pause()); else previewToggle(); return; } if (PVE.querySelector('.vk-busy').hidden === false) return; openFs(); });
  FS.querySelector('.vf-x').onclick = closeFs;
  FS.querySelector('.vf-pp').onclick = () => { if (isOut()) { OUT.paused ? OUT.play().catch(() => { }) : OUT.pause(); } else previewToggle(); };
  SK.addEventListener('input', () => { seeking = true; const out = isOut(), d = out ? OUT.duration : V.SB?.dur; if (!d) return; const t = SK.value / 1000 * d; FS.querySelector('.vf-t0').textContent = mmss(t);
    if (out) OUT.currentTime = t; else { const was = !!V.src; stopPreview(); V.from = t; V.pt = t; if (V.R) { V.R.prepare(t, true).then(() => V.R.drawAt(t, Math.round(t * 30))); } if (was) { clearTimeout(SK._t); SK._t = setTimeout(() => previewToggle(), 120); } } });
  SK.addEventListener('change', () => { seeking = false; fsTime(); });
  FS.querySelector('.vf-acts').onclick = async e => { const b = e.target.closest('[data-d]'); if (!b || !V.file) return; const f = V.file;
    if (navigator.canShare?.({ files: [f] }) && (A.MOBILE || b.dataset.d === 'share')) { try { await navigator.share({ files: [f], title: V.o.title }); return; } catch (er) { if (er.name === 'AbortError') return; } }
    await A.shareOrDownload(f, f.name); };
  { // kéo xuống để đóng
    let y0 = null, dy = 0; FST.addEventListener('pointerdown', e => { y0 = e.clientY; dy = 0; }, { passive: true });
    FST.addEventListener('pointermove', e => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); if (dy > 6) { FST.style.transform = `translateY(${dy}px) scale(${1 - Math.min(.25, dy / 1600)})`; FS.style.backgroundColor = `rgba(0,0,0,${1 - Math.min(.7, dy / 500)})`; } });
    const up = () => { if (y0 == null) return; y0 = null; FS.style.backgroundColor = ''; if (dy > 110) { FST.style.transform = ''; closeFs(); } else if (dy > 6) { FST.animate([{ transform: FST.style.transform }, { transform: 'none' }], { duration: 260, easing: EZ }); FST.style.transform = ''; } if (dy > 6) { const sw = ev => { ev.stopPropagation(); ev.preventDefault(); }; PV.addEventListener('click', sw, { capture: true, once: true }); setTimeout(() => PV.removeEventListener('click', sw, { capture: true }), 400); } dy = 0; };
    FST.addEventListener('pointerup', up); FST.addEventListener('pointercancel', up);
  }
  addEventListener('keydown', e => { if (e.key === 'Escape' && FS.classList.contains('on')) { e.stopImmediatePropagation(); closeFs(); } }, true);
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
    OUT.src = URL.createObjectURL(V.file); OUT.hidden = false; CV.hidden = true; PVE.querySelector('.vk-play').hidden = true;
    M.querySelector('.vk-dt').textContent = `Xong! ${(V.file.size / 1e6).toFixed(1).replace('.', ',')} MB · ${Math.round(V.SB.dur)} giây · dựng trong ${(res.ms / 1000 || 0).toFixed(1).replace('.', ',')} giây`;
    M.querySelector('.vk-done').hidden = false; haptic(20); A.confetti?.();
  };
  new MutationObserver(() => { if (!M.classList.contains('open')) { closeFs(); stopPreview(); V.abort?.abort(); } }).observe(M, { attributes: true });
  return {
    async open(o) {
      V.o = o; V.ms = o.ms.slice().sort((a, b) => a.ts - b.ts); V.file = null; V.dirty = true; V.music = 'auto'; V.userBlob = null; V.clipAud = new Map();
      const g = V.ms.map(m => m.place || m.gps).filter(Boolean); V.geo = g[0] || null;
      const byDay = new Map(); for (const m of V.ms) { const p = m.place || m.gps; if (p && !byDay.has(A.ymd(m.ts))) byDay.set(A.ymd(m.ts), p); } V.route = [...byDay.values()];
      V.tpl = o.tpl || (V.ms.length > 20 ? 'nhanh' : 'dienanh'); V.ratio = '9:16'; V.dur = V.ms.length < 10 ? 30 : V.ms.length < 30 ? 60 : 90;
      M.querySelector('#vkTi').value = o.title || ''; OUT.hidden = true; CV.hidden = false; M.querySelector('.vk-done').hidden = true; M.querySelector('.vk-prog').hidden = true; PVE.querySelector('.vk-play').hidden = false; M.querySelector('#vkGo span').textContent = 'Tạo video';
      A.openModal(M); ui(); await autoPick(); ui();
      try { await build(true); } catch (e) { console.warn(e); A.toast('Máy này chưa dựng được video (cần WebGL2)', 3500); }
    },
    get state() { return V; }
  };
}
