// Hành Trình Của Bạn — "BẢN ĐỒ ĐỜI TÔI": sa bàn 3D chibi + nơi quan trọng (Nhà, Quê, Trường, Công ty…) + ghim kỷ niệm.
// Tìm địa chỉ bằng Nominatim (≤ 1 yêu cầu / giây, có cache, ghi công). Toạ độ chỉ lưu trong máy + Google Drive của bạn.
import { icon, haptic, contextMenu } from './ui.js';
import { initSaban, areaOf, distM, PLACE_EMO, packArea, unpackArea, buildIsland } from './saban.js';
import { typeOf } from './doi.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const KINDS = [{ k: 'home', t: 'Nhà mình' }, { k: 'que', t: 'Quê' }, { k: 'school', t: 'Trường' }, { k: 'work', t: 'Công ty / nơi làm' }, { k: 'other', t: 'Nơi khác' }];
const NOMI = 'https://nominatim.openstreetmap.org';
let lastNomi = 0; const nomiCache = new Map();
async function nomi(path) { // tôn trọng giới hạn 1 yêu cầu / giây của Nominatim
  if (nomiCache.has(path)) return nomiCache.get(path);
  const wait = 1100 - (Date.now() - lastNomi); if (wait > 0) await new Promise(r => setTimeout(r, wait)); lastNomi = Date.now();
  const r = await fetch(NOMI + path, { headers: { 'Accept-Language': 'vi' } }); if (!r.ok) throw new Error('Không tìm được địa chỉ (' + r.status + ')');
  const j = await r.json(); nomiCache.set(path, j); return j;
}
export async function searchPlace(q) { return (await nomi(`/search?format=jsonv2&limit=6&accept-language=vi&q=${encodeURIComponent(q)}`)).map(x => ({ lat: +x.lat, lon: +x.lon, name: x.name || x.display_name.split(',')[0], sub: x.display_name })); }
export async function reverseName(lat, lon) {
  try { const j = await nomi(`/reverse?format=jsonv2&zoom=17&accept-language=vi&lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`); const a = j.address || {};
    return [j.name || a.amenity || a.road, a.suburb || a.quarter || a.village || a.town, a.city || a.state].filter(Boolean).slice(0, 2).join(', ') || j.display_name?.split(',').slice(0, 2).join(',') || ''; } catch (e) { return ''; }
}
// vị trí của một sự kiện: nơi bạn đặt tay > toạ độ GPS trung bình của ảnh
export function eventGeo(e) {
  const pl = e.ms.find(m => m.place)?.place; if (pl) return { ...pl, src: 'user' };
  const g = e.ms.map(m => m.gps).filter(Boolean); if (!g.length) return null;
  return { lat: g.reduce((a, b) => a + b.lat, 0) / g.length, lon: g.reduce((a, b) => a + b.lon, 0) / g.length, name: '', src: 'gps' };
}

export function initMap(A) {
  document.body.insertAdjacentHTML('beforeend', `<div id="mapv" aria-hidden="true"><div class="mp-top"><button class="glassbtn mp-back" aria-label="Đóng">${icon('back', 22, 2)}</button><div class="mp-q">${icon('pin', 18, 2)}<input id="mpQ" placeholder="Tìm địa chỉ, tên nơi…" autocomplete="off" enterkeyhint="search"><div class="mp-res" hidden></div></div><button class="glassbtn mp-more" aria-label="Tuỳ chọn">${icon('more', 22, 2)}</button></div>
    <div class="mp-title"><b></b></div><div class="mp-hint">Chạm một chỗ trên sa bàn để cắm ghim</div>
    <div class="mp-bar"><button data-m="me">${icon('pin', 17, 2.2)}<span>Vị trí của tôi</span></button><button data-m="home">🏡<span>Nhà mình</span></button><button data-m="islands">🏝️<span>Những nơi đã đến</span></button></div></div>`);
  const V = document.getElementById('mapv'), SB = initSaban(); V.prepend(SB.host);
  SB.setStore(k => A.dbGet('blobs', k), (k, b) => A.dbPut('blobs', b, k), (key, blob) => A.drive?.putApp?.('osm-' + key + '.json.gz', blob), key => A.drive?.getApp?.('osm-' + key + '.json.gz'));
  const M = { mode: 'view', pick: null, center: null, newPin: null };
  const places = async () => (await A.metaGet('sy:places')) || [];
  const savePlaces = async ps => { await A.metaSet('sy:places', ps); };
  const title = t => { V.querySelector('.mp-title b').textContent = t || ''; V.querySelector('.mp-title').hidden = !t; };
  const hint = (t, ms = 4000) => { const h = V.querySelector('.mp-hint'); h.textContent = t; h.style.opacity = 1; clearTimeout(hint.t); hint.t = setTimeout(() => h.style.opacity = 0, ms); };
  const pinHTML = (emo, label, col) => `<div>${label ? `<span class="pl">${esc(label)}</span>` : ''}<span class="pi" style="--c:${col || '#ff8fbf'}"><span>${emo}</span></span></div>`;
  // ghim mọi thứ trong khu đang xem
  async function drawPins() {
    SB.clearPins(); const ar = SB.area; if (!ar) return; const c = { lat: ar.A.c[0], lon: ar.A.c[1] }, near = p => distM(c, p) < 560;
    const me = A.me(), ps = await places();
    for (const p of ps) if (near(p)) SB.addPin({ id: 'pl:' + p.id, lat: p.lat, lon: p.lon, html: pinHTML(PLACE_EMO[p.kind] || '📍', p.name || KINDS.find(k => k.k === p.kind)?.t, p.kind === 'home' ? '#ffb36b' : '#8f9bff'), cls: 'place', data: p });
    for (const e of A.events()) { const g = eventGeo(e); if (!g || !near(g)) continue; const T = typeOf(e.type); SB.addPin({ id: 'ev:' + e.key, lat: g.lat, lon: g.lon, html: pinHTML(T.ic, e.title, T.c), cls: 'ev', data: e }); }
    const home = ps.find(p => p.kind === 'home') || (me?.home?.lat ? me.home : null), at = home && near(home) ? home : c;
    if (me) SB.setWalker(`<div>${A.chibi(me)}</div>`, at.lat, at.lon);
  }
  async function go(lat, lon, t) { title(t || ''); await SB.show(lat, lon, { title: t ? `Đang dựng sa bàn: ${t}` : 'Đang dựng sa bàn…' }); M.center = { lat, lon }; await drawPins(); }
  SB.onTap(async (ll) => {
    haptic(10); if (M.newPin) SB.removePin(M.newPin.id);
    const id = 'new' + Date.now(), pick = M.mode === 'pick';
    M.newPin = SB.addPin({ id, lat: ll.lat, lon: ll.lon, cls: 'new', html: `<div><div class="sb-bub"><b>${pick ? 'Đặt kỷ niệm ở đây?' : 'Nơi này là…'}</b><div class="r">${pick ? '<button data-b="no">Thôi</button><button class="primary" data-b="ok">Đặt ở đây</button>' : '<button data-b="save">Lưu nơi quan trọng</button><button class="primary" data-b="ev">Gắn kỷ niệm</button>'}</div></div><span class="pi" style="--c:#ff5f9e"><span>📍</span></span></div>`, data: ll });
    A.walk?.(ll); SB.walkTo(ll.lat, ll.lon);
  });
  SB.onPin(async (p, el, ev) => {
    const b = ev?.target?.closest?.('[data-b]');
    if (p.id === M.newPin?.id) {
      const act = b?.dataset.b; if (!act) return; const ll = p.data;
      if (act === 'no') { SB.removePin(p.id); M.newPin = null; return; }
      if (act === 'ok') { const name = await reverseName(ll.lat, ll.lon); const cb = M.pick; close(); cb?.({ lat: ll.lat, lon: ll.lon, name }); return; }
      if (act === 'save') { contextMenu({ at: el, title: 'Đây là…', items: KINDS.map(k => ({ label: `${PLACE_EMO[k.k]} ${k.t}`, act: async () => { const name = (await A.prompt(`Tên ${k.t.toLowerCase()}`, k.k === 'home' ? 'Nhà mình' : await reverseName(ll.lat, ll.lon), 50))?.trim(); if (name == null) return; const ps = await places(); if (k.k === 'home') { const i = ps.findIndex(x => x.kind === 'home'); if (i >= 0) ps.splice(i, 1); } ps.push({ id: Date.now().toString(36), kind: k.k, name: name || k.t, lat: ll.lat, lon: ll.lon }); await savePlaces(ps); M.newPin = null; await drawPins(); A.toast(`Đã lưu ${name || k.t} ✨`, 1800); } })) }); return; }
      if (act === 'ev') { const evs = A.events().filter(e => !eventGeo(e)).slice(0, 40); if (!evs.length) { A.toast('Mọi kỷ niệm đều đã có nơi chốn rồi', 2000); return; } contextMenu({ at: el, title: 'Gắn kỷ niệm nào vào đây?', items: evs.map(e => ({ label: `${typeOf(e.type).ic} ${esc(e.title)}`, note: A.spanTxt(e.ms), act: async () => { const name = await reverseName(ll.lat, ll.lon); await A.setEventPlace(e, { lat: ll.lat, lon: ll.lon, name }); M.newPin = null; await drawPins(); A.toast(`Đã gắn “${e.title}” vào ${name || 'nơi này'}`, 2200); } })) }); return; }
      return;
    }
    if (p.id.startsWith('isl:')) { const it = p.data; go(it.lat, it.lon, it.label); return; }
    if (p.id.startsWith('ev:')) { SB.walkTo(p.lat, p.lon); setTimeout(() => { close(); A.openEvent(p.data.key); }, 700); return; }
    if (p.id.startsWith('pl:')) { const pl = p.data; contextMenu({ at: el, title: `${PLACE_EMO[pl.kind]} ${esc(pl.name)}`, items: [
      { icon: 'edit', label: 'Đổi tên', act: async () => { const t = (await A.prompt('Tên nơi này', pl.name, 50))?.trim(); if (!t) return; const ps = await places(); const x = ps.find(q => q.id === pl.id); if (x) x.name = t; await savePlaces(ps); drawPins(); } },
      { icon: 'trash', label: 'Bỏ nơi này', danger: true, act: async () => { await savePlaces((await places()).filter(q => q.id !== pl.id)); drawPins(); } }] }); }
  });
  // tìm địa chỉ
  const Q = V.querySelector('#mpQ'), RES = V.querySelector('.mp-res'); let qt = 0;
  Q.addEventListener('input', () => { clearTimeout(qt); const v = Q.value.trim(); if (v.length < 3) { RES.hidden = true; return; } qt = setTimeout(async () => { try { const rs = await searchPlace(v); RES.innerHTML = rs.length ? rs.map((r, i) => `<button data-i="${i}">${esc(r.name)}<small>${esc(r.sub)}</small></button>`).join('') + '<button disabled style="font-size:11px;color:#9a8aa0">Tìm bằng Nominatim · © OpenStreetMap</button>' : '<button disabled>Không thấy nơi nào</button>'; RES.hidden = false; RES._r = rs; } catch (e) { A.toast(e.message, 2500); } }, 700); });
  RES.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b) return; const r = RES._r[+b.dataset.i]; RES.hidden = true; Q.value = r.name; Q.blur(); go(r.lat, r.lon, r.name); });
  V.querySelector('.mp-back').onclick = () => close();
  V.querySelector('.mp-more').onclick = e => contextMenu({ at: e.currentTarget, title: 'Bản đồ', items: [
    { icon: 'info', label: 'Về dữ liệu bản đồ', act: () => A.toast('Bản đồ dùng dữ liệu OpenStreetMap: khu vực bạn xem được tải từ máy chủ OSM. Toạ độ kỷ niệm chỉ lưu trong máy và Google Drive của bạn.', 6500) }] });
  V.querySelector('.mp-bar').addEventListener('click', async e => {
    const b = e.target.closest('[data-m]'); if (!b) return; haptic(8);
    if (b.dataset.m === 'me') { if (!navigator.geolocation) { A.toast('Máy này không cho lấy vị trí', 2000); return; } navigator.geolocation.getCurrentPosition(p => go(p.coords.latitude, p.coords.longitude, 'Nơi bạn đang đứng'), () => A.toast('Bạn chưa cho phép lấy vị trí — tìm địa chỉ ở ô trên cũng được', 3200), { enableHighAccuracy: false, timeout: 12000 }); }
    else if (b.dataset.m === 'home') { const h = (await places()).find(p => p.kind === 'home'); if (h) go(h.lat, h.lon, h.name); else A.toast('Chưa có “Nhà mình” — chạm một chỗ trên sa bàn rồi chọn Lưu nơi quan trọng › Nhà mình', 3800); }
    else if (b.dataset.m === 'islands') islands(b);
  });
  // những nơi đã đến: gom theo khu (mỗi khu một hòn đảo)
  async function areasList() {
    const m = new Map(), add = (lat, lon, label, w = 1) => { let x = [...m.values()].find(c => distM(c, { lat, lon }) < 700); if (!x) { const a = areaOf(lat, lon); x = { ...a, n: 0, labels: [] }; m.set(a.key, x); } x.n += w; if (label && x.labels.length < 3) x.labels.push(label); };
    for (const p of await places()) add(p.lat, p.lon, p.name, 3);
    for (const e of A.events()) { const g = eventGeo(e); if (g) add(g.lat, g.lon, g.name || e.title); }
    return [...m.values()].sort((a, b) => b.n - a.n);
  }
  async function islands() {
    const L = (await areasList()).slice(0, 12); if (!L.length) { A.toast('Chưa có nơi nào — cắm ghim Nhà mình hoặc gắn kỷ niệm vào sa bàn trước nhé', 3500); return; }
    const ps = await places(), items = [];
    for (const a of L) { const ad = await unpackArea(await A.dbGet('blobs', 'osm:' + a.key)); const pl = ps.find(p => areaOf(p.lat, p.lon).key === a.key); items.push({ lat: a.lat, lon: a.lon, label: a.labels[0] || 'Một nơi', A: ad, emo: pl ? PLACE_EMO[pl.kind] : '🧳' }); }
    title('Những nơi trong đời bạn'); M.newPin = null; await SB.showArchipelago(items); hint('Chạm tên một hòn đảo để bay tới', 3500);
  }
  function close() { V.classList.remove('open'); V.setAttribute('aria-hidden', 'true'); document.body.classList.remove('mapopen'); SB.stop(); M.pick = null; M.mode = 'view'; A.onClose?.(); }
  async function open(o = {}) {
    V.classList.add('open'); V.setAttribute('aria-hidden', 'false'); document.body.classList.add('mapopen'); SB.start(); A.onOpen?.();
    M.mode = o.pick ? 'pick' : 'view'; M.pick = o.pick || null; M.newPin = null; RES.hidden = true; Q.value = '';
    hint(o.pick ? 'Chạm vào chỗ diễn ra kỷ niệm để cắm ghim' : 'Chạm một chỗ để cắm ghim · kéo để xoay · chụm để phóng', 4500);
    let at = o.at; if (!at) { const ps = await places(); const h = ps.find(p => p.kind === 'home') || ps[0]; if (h) at = { lat: h.lat, lon: h.lon, name: h.name }; }
    if (!at) { at = await new Promise(res => { if (!navigator.geolocation) return res(null); navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lon: p.coords.longitude, name: 'Nơi bạn đang đứng' }), () => res(null), { timeout: 8000 }); }); }
    if (!at) at = { lat: 21.0287, lon: 105.8524, name: 'Hồ Hoàn Kiếm (ví dụ) — tìm địa chỉ nhà bạn ở ô trên' };
    try { await go(at.lat, at.lon, at.name); if (o.focus) SB.focus(o.focus.lat, o.focus.lon, 30); } catch (e) { A.toast(e.message || 'Chưa tải được bản đồ — kiểm tra mạng rồi thử lại', 3500); }
  }
  return { open, close, isOpen: () => V.classList.contains('open'), sb: SB, areasList, go };
}
export { buildIsland, packArea, unpackArea };
