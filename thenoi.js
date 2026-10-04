// Hành Trình Của Bạn — 🗺 THẺ NƠI CHỐN: thẻ bo tròn kiểu Google Maps (bản đồ sáng mini + tấm thẻ trắng: tên nơi to, loại nơi + địa chỉ,
// ngày giờ, người có mặt, ảnh bo tròn lớn hoặc lưới 1 lớn + 2 nhỏ, lời kể ngắn). Xuất PNG; ảnh chính là video thì xuất MP4 ngắn
// (video phát trong khung bo tròn, phần còn lại tĩnh) bằng mediabunny. Không bịa số sao / đánh giá. Chạy hoàn toàn trong máy.
import { icon, haptic } from './ui.js';
import { mapSnap, placeInfo } from './bando.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = n => String(n).padStart(2, '0');
const WD = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const F = (w, s) => `${w} ${Math.round(s)}px Quicksand, system-ui, sans-serif`;
function rr(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
function cover(x, img, X, Y, w, h, r) { x.save(); rr(x, X, Y, w, h, r); x.clip(); const iw0 = img.videoWidth || img.width, ih0 = img.videoHeight || img.height, k = Math.max(w / iw0, h / ih0); x.drawImage(img, X + (w - iw0 * k) / 2, Y + (h - ih0 * k) / 2, iw0 * k, ih0 * k); x.restore(); }
function wrap(x, text, maxW, maxL) { const out = []; let line = ''; for (const w of String(text || '').split(/\s+/).filter(Boolean)) { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; } if (line) out.push(line); if (out.length > maxL) { out.length = maxL; out[maxL - 1] = out[maxL - 1].replace(/\s*\S*$/, '') + '…'; } return out; }

export function initPlaceCard(A) {
  document.body.insertAdjacentHTML('beforeend', `<div class="modal gsheet" id="mPlc"><div class="card glass">
    <h2>🗺 Thẻ nơi chốn</h2>
    <div class="pc-pv"><canvas class="pc-cv"></canvas><video class="pc-out" playsinline controls hidden></video><div class="vk-busy pc-busy" hidden><i></i><b>Đang dựng thẻ…</b></div></div>
    <div class="ai-r"><b>Khung</b><div class="vk-ch pc-ratio"><button type="button" data-r="916">9:16 dọc</button><button type="button" data-r="45">4:5</button></div></div>
    <div class="ai-r"><b>Ảnh trên thẻ <small>chọn 1–3 tấm · tấm đầu là ảnh lớn</small></b><div class="pc-ph"></div></div>
    <label class="tog pc-aud" hidden><span>Giữ tiếng gốc của video <small>nghe nhỏ</small></span><input type="checkbox" id="pcAud"></label>
    <p class="hint pc-src"></p>
    <div class="foot"><button data-close>Đóng</button><button class="primary pc-go">${icon('download', 17, 2)}<span>Lưu thẻ</span></button></div></div></div>`);
  const M = document.getElementById('mPlc'), OUT = M.querySelector('.pc-out'); let CV = M.querySelector('.pc-cv');
  const S = { e: null, sel: [], ratio: '916', info: null, map: null, file: null, busy: false, tok: 0 };
  const busy = (on, t) => { M.querySelector('.pc-busy').hidden = !on; if (t) M.querySelector('.pc-busy b').textContent = t; };
  const dims = () => S.ratio === '45' ? [1080, 1350] : [1080, 1920];
  function ui() {
    M.querySelectorAll('[data-r]').forEach(b => b.classList.toggle('on', b.dataset.r === S.ratio));
    const ms = S.e.ms.slice(0, 40); M.querySelector('.pc-ph').innerHTML = ms.map(m => { const i = S.sel.indexOf(m); return `<button data-m="${m.id}" class="${i >= 0 ? 'on' : ''}${m.type === 'video' ? ' v' : ''}"><img data-mid="${m.id}" alt="">${i >= 0 ? `<span>${i + 1}</span>` : ''}</button>`; }).join('');
    M.querySelectorAll('.pc-ph img').forEach(im => A.thumbURL(im.dataset.mid).then(u => { if (u) im.src = u; }));
    M.querySelector('.pc-aud').hidden = S.sel[0]?.type !== 'video';
    M.querySelector('.pc-go span').textContent = S.sel[0]?.type === 'video' ? 'Lưu video MP4' : 'Lưu ảnh PNG';
  }
  M.addEventListener('click', e => {
    const r = e.target.closest('[data-r]'); if (r) { S.ratio = r.dataset.r; ui(); draw(); return; }
    const b = e.target.closest('.pc-ph [data-m]'); if (b) { const m = S.e.ms.find(x => x.id === b.dataset.m); const i = S.sel.indexOf(m); if (i >= 0) { if (S.sel.length > 1) S.sel.splice(i, 1); } else { if (S.sel.length >= 3) S.sel.shift(); S.sel.push(m); } haptic(5); ui(); draw(); return; }
    if (e.target.closest('.pc-go')) save();
  });
  // ---------- dựng thẻ: phần tĩnh (bản đồ + thẻ trắng + chữ + ảnh phụ) và ô ảnh chính (ảnh hoặc khung video) ----------
  const imgOf = async (m, big) => { try { const b = (big && m.type === 'image' && !m.heic && await A.blob(m.id)) || await A.thumbBlob(m.id); return b ? await createImageBitmap(b, { imageOrientation: 'from-image' }) : null; } catch (e) { return null; } };
  async function layout() {
    const [W, H] = dims(), e = S.e, g = e.geo, info = S.info || {}, mapH = Math.round(H * (S.ratio === '45' ? .34 : .4));
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    x.fillStyle = '#eef0f2'; x.fillRect(0, 0, W, H);
    if (S.map) x.drawImage(S.map, 0, 0, W, Math.round(W * S.map.height / S.map.width));
    // ghim tại chỗ
    const px = W / 2, py = mapH * .5; x.save(); x.shadowColor = 'rgba(0,0,0,.3)'; x.shadowBlur = 16; x.fillStyle = '#ea4335'; x.beginPath(); x.arc(px, py - 46, 34, Math.PI * .85, Math.PI * .15); x.lineTo(px, py); x.closePath(); x.fill(); x.restore();
    x.fillStyle = '#b31412'; x.beginPath(); x.arc(px, py - 48, 13, 0, 7); x.fill();
    // thẻ trắng bo góc lớn kiểu sheet
    const top = mapH - 60, pd = 64; x.save(); x.shadowColor = 'rgba(30,20,40,.18)'; x.shadowBlur = 40; x.fillStyle = '#fff'; rr(x, 0, top, W, H - top + 80, 64); x.fill(); x.restore();
    x.fillStyle = '#dadce0'; rr(x, W / 2 - 50, top + 26, 100, 10, 5); x.fill();
    let y = top + 120; x.fillStyle = '#202124'; x.font = F(700, 76); x.textBaseline = 'alphabetic';
    const name = info.name || g?.name?.split(',')[0] || e.title; for (const l of wrap(x, name, W - pd * 2, 2)) { x.fillText(l, pd, y); y += 88; }
    const sub = [info.cat, info.addr || (g?.name?.split(',').slice(1).join(',').trim())].filter(Boolean).join(' · ');
    if (sub) { x.fillStyle = '#5f6368'; x.font = F(600, 38); for (const l of wrap(x, sub, W - pd * 2, 2)) { x.fillText(l, pd, y - 20); y += 50; } }
    const d = new Date(e.ts0); x.fillStyle = '#1a73e8'; x.font = F(700, 36); x.fillText(`${WD[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`, pd, y + 6); y += 40;
    // người có mặt
    const ps = (e.kids || []).map(id => A.person(id)).filter(p => p && p.role !== 'me');
    if (ps.length) { let ax = pd; y += 26; for (const p of ps.slice(0, 6)) { const u = await A.avatarURL(p); const im = new Image(); im.src = u; try { await im.decode(); x.save(); x.beginPath(); x.arc(ax + 30, y + 30, 30, 0, 7); x.clip(); x.drawImage(im, ax, y, 60, 60); x.restore(); x.strokeStyle = '#fff'; x.lineWidth = 5; x.beginPath(); x.arc(ax + 30, y + 30, 31, 0, 7); x.stroke(); } catch (er) { } ax += 46; }
      x.fillStyle = '#3c4043'; x.font = F(600, 34); x.fillText(ps.slice(0, 3).map(p => p.name).join(', ') + (ps.length > 3 ? ` +${ps.length - 3}` : ''), ax + 34, y + 42, W - ax - 34 - pd); y += 70; }
    // khung ảnh: 1 lớn hoặc 1 lớn + 2 nhỏ (kiểu Google)
    const noteL = e.note ? 3 : 0, footH = 90, photoTop = y + 30, photoH = Math.max(380, H - photoTop - footH - noteL * 50 - 40), n = S.sel.length, gap = 18;
    const big = n >= 3 ? { x: pd, y: photoTop, w: (W - pd * 2 - gap) * .62, h: photoH } : n === 2 ? { x: pd, y: photoTop, w: (W - pd * 2 - gap) / 2, h: photoH } : { x: pd, y: photoTop, w: W - pd * 2, h: photoH };
    const smalls = n >= 3 ? [{ x: pd + big.w + gap, y: photoTop, w: W - pd * 2 - big.w - gap, h: (photoH - gap) / 2 }, { x: pd + big.w + gap, y: photoTop + (photoH - gap) / 2 + gap, w: W - pd * 2 - big.w - gap, h: (photoH - gap) / 2 }] : n === 2 ? [{ x: pd + big.w + gap, y: photoTop, w: big.w, h: photoH }] : [];
    for (let i = 0; i < smalls.length; i++) { const m = S.sel[i + 1], im = await imgOf(m, false); if (im) { cover(x, im, smalls[i].x, smalls[i].y, smalls[i].w, smalls[i].h, 36); im.close?.(); } if (m.type === 'video') playBadge(x, smalls[i]); }
    y = photoTop + photoH + 56;
    if (e.note) { x.fillStyle = '#3c4043'; x.font = F(600, 36); for (const l of wrap(x, e.note.replace(/\s+/g, ' '), W - pd * 2, 3)) { x.fillText(l, pd, y); y += 50; } }
    x.fillStyle = '#9aa0a6'; x.font = F(600, 26); x.textAlign = 'center'; x.fillText('Hành Trình Của Bạn · bản đồ © OpenMapTiles © OpenStreetMap', W / 2, H - 40); x.textAlign = 'left';
    return { c, big, W, H };
  }
  function playBadge(x, b) { x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.arc(b.x + 44, b.y + 44, 26, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(b.x + 37, b.y + 31); x.lineTo(b.x + 58, b.y + 44); x.lineTo(b.x + 37, b.y + 57); x.closePath(); x.fill(); }
  async function draw() {
    const tok = ++S.tok; OUT.hidden = true; CV.hidden = false; S.file = null;
    const L = await layout(); if (tok !== S.tok) return; S.L = L;
    const m = S.sel[0], im = m ? await imgOf(m, m.type !== 'video') : null; if (tok !== S.tok) return;
    CV.width = L.W; CV.height = L.H; const x = CV.getContext('2d'); x.drawImage(L.c, 0, 0); if (im) { cover(x, im, L.big.x, L.big.y, L.big.w, L.big.h, 44); im.close?.(); } if (m?.type === 'video') playBadge(x, L.big);
    M.querySelector('.pc-pv').style.aspectRatio = `${L.W} / ${L.H}`;
  }
  async function open(e, opt = {}) {
    if (!e?.geo) { A.toast('Sự kiện này chưa có nơi chốn — đặt nơi chốn trên bản đồ trước nhé', 2600); return; }
    S.e = e; S.sel = (opt.mids ? e.ms.filter(m => opt.mids.includes(m.id)) : []).slice(0, 3); if (!S.sel.length) S.sel = [e.stack?.[0] || e.ms[0], ...e.ms.filter(m => m.type !== 'video' && m !== (e.stack?.[0] || e.ms[0])).slice(0, 2)].filter(Boolean).slice(0, Math.min(3, e.ms.length));
    S.info = null; S.map = null; ui(); A.openModal(M); busy(true, 'Đang tải bản đồ và tên nơi…');
    const g = e.geo, key = 'pli:' + g.lat.toFixed(4) + ',' + g.lon.toFixed(4);
    try { S.info = (await A.metaGet(key)) || null; if (!S.info && navigator.onLine) { S.info = await placeInfo(g.lat, g.lon); await A.metaSet(key, S.info); } } catch (er) { S.info = null; }
    if (g.src === 'user' && g.name) S.info = { ...(S.info || {}), name: g.name.split(',')[0] }; // tên bạn tự đặt luôn được ưu tiên
    M.querySelector('.pc-src').textContent = S.info?.cat ? `Loại nơi lấy từ OpenStreetMap: ${S.info.cat}` : '';
    try { const [W] = dims(); S.map = navigator.onLine ? await mapSnap({ lat: g.lat, lon: g.lon, W, H: Math.round(W * .62) }) : null; } catch (er) { S.map = null; }
    busy(false); await draw();
  }
  // ---------- lưu: PNG, hoặc MP4 khi ảnh chính là video ----------
  async function save() {
    if (S.busy) return; const m = S.sel[0]; if (!m) return;
    if (S.file) return share(S.file);
    S.busy = true; busy(true, m.type === 'video' ? 'Đang dựng video…' : 'Đang lưu ảnh…');
    try {
      if (m.type !== 'video') { const b = await new Promise(r => CV.toBlob(r, 'image/png')); S.file = new File([b], `The-noi-chon-${A.noAccent(S.info?.name || S.e.title)}.png`, { type: 'image/png' }); }
      else S.file = await makeMp4(m);
      if (S.file.type === 'video/mp4') { OUT.src = URL.createObjectURL(S.file); OUT.hidden = false; CV.hidden = true; }
      busy(false); M.querySelector('.pc-go span').textContent = 'Lưu / chia sẻ'; window.SFX?.play('ting'); A.onSaved?.(S.file); if (!A.TEST) await share(S.file);
    } catch (er) { console.warn(er); busy(false); A.toast('Chưa dựng được: ' + (er.message || er), 3500); }
    finally { S.busy = false; }
  }
  async function share(f) { if (A.TEST) return; if (A.MOBILE && navigator.canShare?.({ files: [f] })) { try { await navigator.share({ files: [f], title: f.name }); return; } catch (e) { if (e.name === 'AbortError') return; } } await A.shareOrDownload(f, f.name); }
  async function makeMp4(m) {
    const MB = await import('./lib/mediabunny.min.mjs'); if (!window.VideoEncoder) throw new Error('Máy này chưa hỗ trợ mã hoá video (WebCodecs) — lưu ảnh PNG bằng cách chọn ảnh khác làm ảnh lớn');
    const blob = await A.blob(m.id); if (!blob) throw new Error('Không thấy bản gốc của video trong máy');
    const input = new MB.Input({ source: new MB.BlobSource(blob), formats: MB.ALL_FORMATS }), vt = await input.getPrimaryVideoTrack(); if (!vt || !(await vt.canDecode())) throw new Error('Máy không đọc được video này');
    const vd = (await vt.computeDuration?.()) || m.dur || 6, dur = Math.min(15, Math.max(5, vd)), fps = 30, N = Math.round(dur * fps), L = S.L, W = L.W, H = L.H;
    const keep = M.querySelector('#pcAud').checked, at = keep ? await input.getPrimaryAudioTrack() : null;
    if (!(await MB.canEncodeAudio('aac'))) { const enc = await import('./lib/mediabunny-aac-encoder.min.mjs'); enc.registerAacEncoder(); }
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const out = new MB.Output({ format: new MB.Mp4OutputFormat({ fastStart: 'in-memory' }), target: new MB.BufferTarget() });
    const webkit = /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|CriOS|Edg/.test(navigator.userAgent);
    const vs = new MB.CanvasSource(c, { codec: 'avc', bitrate: 6e6, keyFrameInterval: 2, ...(webkit ? { latencyMode: 'realtime' } : {}) }); out.addVideoTrack(vs, { frameRate: fps });
    let as = null; if (at && await at.canDecode()) { as = new MB.AudioBufferSource({ codec: 'aac', bitrate: 128e3 }); out.addAudioTrack(as); }
    await out.start();
    if (as) { const sink = new MB.AudioBufferSink(at); for await (const { buffer, timestamp } of sink.buffers(0, dur)) { if (timestamp >= dur) break; for (let ch = 0; ch < buffer.numberOfChannels; ch++) { const d = buffer.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] *= .45; } await as.add(buffer); } as.close(); }
    const sink = new MB.CanvasSink(vt, { width: Math.min(1080, Math.round((vt.displayWidth || 1080) / 2) * 2), poolSize: 2 }), ts = []; for (let i = 0; i < N; i++) ts.push(Math.min(vd - .04, (i / fps) % Math.max(.1, vd)));
    let i = 0, last = null;
    for await (const r of sink.canvasesAtTimestamps(ts)) {
      if (r) last = r.canvas; x.drawImage(L.c, 0, 0); if (last) cover(x, last, L.big.x, L.big.y, L.big.w, L.big.h, 44);
      await vs.add(i / fps, 1 / fps); i++; if (i % 15 === 0) busy(true, `Đang dựng video… ${Math.round(i / N * 100)}%`); if (i >= N) break;
    }
    vs.close(); await out.finalize(); input.dispose?.();
    return new File([out.target.buffer], `The-noi-chon-${A.noAccent(S.info?.name || S.e.title)}.mp4`, { type: 'video/mp4' });
  }
  new MutationObserver(() => { if (!M.classList.contains('open')) { S.tok++; if (!OUT.hidden) OUT.pause(); } }).observe(M, { attributes: true });
  return { open, get state() { return S; } };
}
