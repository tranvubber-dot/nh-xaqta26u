// Hành Trình Của Bạn — "BẢN ĐỒ ĐỜI TÔI": bản đồ đường phố 3D thực tế (MapLibre GL JS, BSD-3, lib/) trên nền OpenFreeMap
// (miễn phí, không khoá; © OpenMapTiles © OpenStreetMap contributors). Nạp lười khi mở, map.remove() khi đóng.
// Toạ độ kỷ niệm chỉ lưu trong máy + Google Drive của bạn; chỉ khung khu vực bạn xem được tải từ máy chủ bản đồ.
import { icon, haptic, contextMenu } from './ui.js';
import { typeOf } from './doi.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
export const KINDS = [{ k: 'home', t: 'Nhà mình', e: '🏡' }, { k: 'que', t: 'Quê', e: '🌾' }, { k: 'school', t: 'Trường', e: '🏫' }, { k: 'work', t: 'Công ty / nơi làm', e: '🏢' }, { k: 'other', t: 'Nơi khác', e: '📍' }];
export const PLACE_EMO = Object.fromEntries(KINDS.map(k => [k.k, k.e]));
export const distM = (a, b) => { const R = 6371e3, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lon - a.lon) * r, x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };

// ---------- tìm địa chỉ: Nominatim (≤ 1 yêu cầu / giây, cache), dự phòng Photon (cũng dữ liệu OSM) khi mạng chặn Nominatim ----------
const NOMI = 'https://nominatim.openstreetmap.org', PHOTON = 'https://photon.komoot.io';
let lastNomi = 0; const nomiCache = new Map();
async function nomi(path) {
  if (nomiCache.has(path)) return nomiCache.get(path);
  const wait = 1100 - (Date.now() - lastNomi); if (wait > 0) await new Promise(r => setTimeout(r, wait)); lastNomi = Date.now();
  const r = await fetch(NOMI + path, { headers: { 'Accept-Language': 'vi' } }); if (!r.ok) throw new Error('Không tìm được địa chỉ (' + r.status + ')');
  const j = await r.json(); nomiCache.set(path, j); return j;
}
const phName = p => [p.name, p.street && p.housenumber ? p.housenumber + ' ' + p.street : p.street, p.district || p.suburb, p.city || p.state].filter(Boolean);
export async function searchPlace(q) {
  try { return (await nomi(`/search?format=jsonv2&limit=6&accept-language=vi&q=${encodeURIComponent(q)}`)).map(x => ({ lat: +x.lat, lon: +x.lon, name: x.name || x.display_name.split(',')[0], sub: x.display_name })); }
  catch (e) { const r = await fetch(`${PHOTON}/api/?limit=6&lang=default&q=${encodeURIComponent(q)}`); if (!r.ok) throw new Error('Không tìm được địa chỉ — kiểm tra mạng rồi thử lại'); const j = await r.json(); return (j.features || []).map(f => { const n = phName(f.properties); return { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], name: n[0] || q, sub: n.join(', ') }; }); }
}
export async function reverseName(lat, lon) {
  try { const j = await nomi(`/reverse?format=jsonv2&zoom=17&accept-language=vi&lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`); const a = j.address || {}; return [j.name || a.amenity || a.road, a.suburb || a.quarter || a.village || a.town, a.city || a.state].filter(Boolean).slice(0, 2).join(', ') || j.display_name?.split(',').slice(0, 2).join(',') || ''; }
  catch (e) { try { const r = await fetch(`${PHOTON}/reverse?lang=default&lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}`); const f = (await r.json()).features?.[0]; return f ? phName(f.properties).slice(0, 2).join(', ') : ''; } catch (e2) { return ''; } }
}
// vị trí của sự kiện: nơi bạn đặt tay > toạ độ GPS trung bình của ảnh
export function eventGeo(e) {
  const pl = e.ms.find(m => m.place)?.place; if (pl) return { ...pl, src: 'user' };
  const g = e.ms.map(m => m.gps).filter(Boolean); if (!g.length) return null;
  return { lat: g.reduce((a, b) => a + b.lat, 0) / g.length, lon: g.reduce((a, b) => a + b.lon, 0) / g.length, name: '', src: 'gps' };
}

// ---------- style: nhãn tiếng Việt (name:vi → name) + màu theo 2 phong cách của app ----------
let STYLE0 = null;
async function baseStyle() { if (!STYLE0) STYLE0 = await (await fetch(STYLE_URL)).json(); return JSON.parse(JSON.stringify(STYLE0)); }
const THEMES = {
  night: { bg: '#1c1840', water: '#2b3f86', park: '#22365a', land: '#241f4d', build: '#2c2758', b3: '#3b3470', road: '#cfc6ff', road2: '#8d84d6', casing: '#3a2f78', text: '#f3eeff', halo: '#1a1440', rail: '#6b63b0' },
  dawn: { bg: '#fff5ee', water: '#a8dcff', park: '#c9efc0', land: '#ffeedd', build: '#ffe3ec', b3: '#ffd6e4', road: '#ffffff', road2: '#ffe6bf', casing: '#f3c9b0', text: '#4a2c4e', halo: '#ffffff', rail: '#d7b9c9' }
};
// v1.8.1 — kiểu "Sáng (giống Google)": nền xám sáng, công viên xanh lá, nước xanh dương, đường trắng / quốc lộ vàng, POI chữ màu theo loại.
// Chỉ đổi màu style OpenFreeMap (dữ liệu © OpenMapTiles © OpenStreetMap contributors), không dùng tile của Google.
const POI_COL = ['match', ['get', 'class'], ['hospital', 'doctors', 'pharmacy', 'dentist'], '#d93025', ['school', 'college', 'university', 'kindergarten', 'library'], '#8d5a3c', ['restaurant', 'fast_food', 'cafe', 'bar', 'pub', 'ice_cream', 'bakery', 'food_court'], '#e8710a',
  ['park', 'garden', 'playground', 'zoo', 'campsite'], '#188038', ['shop', 'grocery', 'supermarket', 'clothes', 'mall', 'convenience'], '#1a73e8', ['lodging', 'hotel'], '#c5221f', ['place_of_worship', 'religion', 'attraction', 'museum', 'monument'], '#7b5ea7', ['bus', 'railway', 'transit'], '#1967d2', '#5f6368'];
function lightStyle(style) {
  const name = ['coalesce', ['get', 'name:vi'], ['get', 'name'], ['get', 'name:latin']];
  style.layers = style.layers.filter(l => !/shield/.test(l.id));
  for (const l of style.layers) {
    const p = l.paint ||= {}, id = l.id, major = /motorway|trunk_primary/.test(id);
    if (l.type === 'symbol' && l.layout?.['text-field'] && !/one_way/.test(id)) {
      l.layout['text-field'] = name; p['text-halo-color'] = '#ffffff'; p['text-halo-width'] = 1.6;
      if (/^poi/.test(id)) { p['text-color'] = POI_COL; l.layout['text-font'] = ['Noto Sans Bold']; }
      else if (/^highway-name/.test(id)) { p['text-color'] = '#3c4043'; l.layout['text-font'] = ['Noto Sans Bold']; }
      else if (/^water/.test(id)) p['text-color'] = '#1a73e8';
      else p['text-color'] = '#3c4043';
    }
    if (id === 'background') p['background-color'] = '#f2f3f4';
    else if (id === 'natural_earth') l.layout = { ...(l.layout || {}), visibility: 'none' };
    else if (id === 'water') p['fill-color'] = '#9cd3f5';
    else if (/^waterway/.test(id) && l.type === 'line') p['line-color'] = '#9cd3f5';
    else if (/^park$|landcover_(wood|grass)|landuse_(pitch|track|cemetery)/.test(id) && l.type === 'fill') { p['fill-color'] = '#c9eacb'; p['fill-opacity'] = 1; }
    else if (id === 'park_outline') p['line-color'] = '#b4ddb7';
    else if (id === 'landuse_residential') { p['fill-color'] = '#ebedf0'; p['fill-opacity'] = 1; }
    else if (id === 'landuse_hospital') p['fill-color'] = '#fbe3e1'; else if (id === 'landuse_school') p['fill-color'] = '#f3ede4';
    else if (id === 'building') { p['fill-color'] = '#e3e5e8'; p['fill-outline-color'] = '#d6d9dd'; }
    else if (id === 'building-3d') { p['fill-extrusion-color'] = '#e6e8eb'; p['fill-extrusion-opacity'] = .9; }
    else if (l.type === 'line' && /casing/.test(id)) p['line-color'] = major ? '#e9bc62' : '#d5d8dc';
    else if (l.type === 'line' && /rail/.test(id)) p['line-color'] = '#c1c5ca';
    else if (l.type === 'line' && /^(road|bridge|tunnel)_/.test(id)) p['line-color'] = major ? '#fde293' : /secondary_tertiary/.test(id) ? '#ffffff' : '#ffffff';
  }
  return style;
}
function themed(style, theme) {
  if (theme === 'light') return lightStyle(style);
  style.layers = style.layers.filter(l => !/shield/.test(l.id)); // biển số đường kiểu Mỹ: không cần ở VN, bỏ cho nhẹ
  const C = THEMES[theme] || THEMES.dawn, name = ['coalesce', ['get', 'name:vi'], ['get', 'name'], ['get', 'name:latin']];
  for (const l of style.layers) {
    const p = l.paint ||= {}, id = l.id;
    if (l.type === 'symbol' && l.layout?.['text-field'] && !/shield|one_way/.test(id)) { if (!/highway-shield|road_shield/.test(id)) l.layout['text-field'] = /poi|label|name|airport/.test(id) ? name : l.layout['text-field']; p['text-color'] = C.text; p['text-halo-color'] = C.halo; p['text-halo-width'] = 1.4; }
    if (id === 'background') p['background-color'] = C.bg;
    else if (id === 'water') p['fill-color'] = C.water;
    else if (/^waterway/.test(id) && l.type === 'line') p['line-color'] = C.water;
    else if (/^park$|landcover_(wood|grass)|landuse_(pitch|track|cemetery)/.test(id) && l.type === 'fill') { p['fill-color'] = C.park; p['fill-opacity'] = .85; }
    else if (/landuse_residential|landuse_(school|hospital)/.test(id)) p['fill-color'] = C.land;
    else if (id === 'building') p['fill-color'] = C.build;
    else if (id === 'building-3d') { p['fill-extrusion-color'] = C.b3; p['fill-extrusion-opacity'] = .92; }
    else if (l.type === 'line' && /casing/.test(id)) p['line-color'] = C.casing;
    else if (l.type === 'line' && /rail/.test(id)) p['line-color'] = C.rail;
    else if (l.type === 'line' && /^(road|bridge|tunnel)_/.test(id)) p['line-color'] = /minor|service|path|street/.test(id) ? C.road : C.road2;
    if (id === 'natural_earth') l.layout = { ...(l.layout || {}), visibility: theme === 'night' ? 'none' : 'visible' };
  }
  return style;
}

export function initMap(A) {
  document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="lib/maplibre-gl.css">');
  document.body.insertAdjacentHTML('beforeend', `<div id="mapv" aria-hidden="true"><div class="mp-map"></div>
    <div class="mp-top"><button class="glassbtn mp-back" aria-label="Đóng">${icon('back', 22, 2)}</button><div class="mp-q">${icon('pin', 18, 2)}<input id="mpQ" placeholder="Tìm địa chỉ, tên nơi…" autocomplete="off" enterkeyhint="search"><div class="mp-res" hidden></div></div><button class="glassbtn mp-more" aria-label="Tuỳ chọn">${icon('more', 22, 2)}</button></div>
    <div class="mp-flt" hidden></div><div class="mp-title"><b></b></div><div class="mp-hint">Chạm một chỗ trên bản đồ để cắm ghim</div>
    <div class="mp-bar"><button data-m="me" aria-label="Vị trí của tôi">${icon('pin', 20, 2.2)}<span>Vị trí của tôi</span></button><button data-m="home" aria-label="Nhà mình">🏡<span>Nhà mình</span></button><button data-m="all" aria-label="Những nơi đã đến">🧭<span>Những nơi đã đến</span></button><button data-m="play" hidden>${icon('play', 17, 2.2)}<span>Phát lộ trình</span></button></div>
    <div class="mp-load" hidden><i></i><b>Đang mở bản đồ…</b></div>
    <div class="mp-pv" hidden><button class="mp-pvx" aria-label="Đóng">${icon('close', 18, 2.4)}</button><div class="mp-pvi"><img alt=""></div><div class="mp-pvt"><small></small><b></b><div class="mp-pva"></div><button class="primary mp-pvo">${icon('image', 16, 2.2)}<span>Mở kỷ niệm</span></button></div></div>
    <div class="mp-tip" hidden><b>📍 Gắn nơi chốn cho kỷ niệm để thấy chúng bay quanh bản đồ</b><button class="mp-tipb">Chọn kỷ niệm chưa có nơi</button></div></div>`);
  const V = document.getElementById('mapv'), BOX = V.querySelector('.mp-map'), Q = V.querySelector('#mpQ'), RES = V.querySelector('.mp-res');
  let ML = null, map = null, M = { mode: 'view', pick: null, route: null, markers: [], evMk: new Map(), newMk: null, here: null, flt: null, theme: null, playing: 0 };
  const places = async () => (await A.metaGet('sy:places')) || [];
  const savePlaces = async ps => { await A.metaSet('sy:places', ps); };
  const title = t => { V.querySelector('.mp-title b').textContent = t || ''; V.querySelector('.mp-title').hidden = !t; };
  const hint = (t, ms = 4000) => { const h = V.querySelector('.mp-hint'); h.textContent = t; h.style.opacity = 1; clearTimeout(hint.t); hint.t = setTimeout(() => h.style.opacity = 0, ms); };
  const LL = p => [p.lon, p.lat];
  // ---------- marker DOM: nơi quan trọng (kính tròn + biểu tượng), kỷ niệm (ảnh thu nhỏ tròn), bạn đang ở đây ----------
  function mk(el, ll, anchor = 'bottom') { const m = new ML.Marker({ element: el, anchor }).setLngLat(ll).addTo(map); M.markers.push(m); el.animate?.([{ transform: 'translateY(-26px) scale(.4)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.34,1.56,.64,1)', composite: 'add' }); return m; }
  const placeEl = p => { const el = document.createElement('button'); el.className = 'mk-pl'; el.innerHTML = `<span class="mk-c">${PLACE_EMO[p.kind] || '📍'}</span><b>${esc(p.name || KINDS.find(k => k.k === p.kind)?.t || '')}</b>`; el.onclick = ev => { ev.stopPropagation(); placeMenu(p, el); }; return el; };
  function clearMarkers() { M.markers.forEach(m => m.remove()); M.markers = []; M.evMk.forEach(m => m.remove()); M.evMk.clear(); }
  async function drawPlaces() { for (const p of await places()) mk(placeEl(p), LL(p)); const me = A.me(); M.hereEl = null; if (M.here) { const el = document.createElement('div'); el.className = 'mk-here'; el.innerHTML = `<i></i>${me ? `<span class="mk-cb fs-b">${A.chibiWave ? A.chibiWave(me) : A.chibi(me)}</span>` : ''}<b>Bạn đang ở đây</b>`; mk(el, LL(M.here), 'center'); M.hereEl = el; orbit(); } }
  // v1.8.0 — kỷ niệm là ẢNH BAY LƠ LỬNG: thẻ ảnh viền trắng nhấp nhô (CSS transform trên phần tử con, không đụng layout),
  // sợi chỉ + bóng mờ chỉ đúng điểm chụp. Xa thì gom cụm (chồng ảnh + số), gần thì tách; ảnh trùng chỗ toả ra vòng tròn.
  // Tối đa 40 marker DOM, chỉ tạo cho điểm trong khung nhìn; mới hiện thì "pop" lần lượt kèm tiếng pop.
  const MAXMK = 40;
  function evFeatures() {
    const fs = []; for (const e of A.events()) { const g = eventGeo(e); if (!g) continue; const y = new Date(e.ts0).getFullYear(); if (M.flt && !M.flt(e, y)) continue; fs.push({ type: 'Feature', geometry: { type: 'Point', coordinates: LL(g) }, properties: { key: e.key, mid: e.stack[0]?.id || '', t: e.title, c: typeOf(e.type).c, ts: e.ts0 } }); }
    return { type: 'FeatureCollection', features: fs };
  }
  let popN = 0, popT = 0;
  const popDelay = () => { const now = performance.now(); if (now - popT > 900) popN = 0; popT = now; const d = Math.min(popN, 12) * 70; popN++; A.sfx?.('pop', d); return d; };
  function flEl(p) {
    const el = document.createElement('button'); el.className = 'mk-fl'; el.style.setProperty('--c', p.c); el.style.setProperty('--ph', ((p.ts / 7919) % 3.2).toFixed(2) + 's'); el.style.setProperty('--dl', popDelay() + 'ms');
    el.innerHTML = `<span class="fl-in"><span class="fl-sh"></span><span class="fl-th"></span><span class="fl-b"><img alt=""></span></span>`; el.setAttribute('aria-label', p.t);
    A.thumbURL?.(p.mid).then(u => { if (u) el.querySelector('img').src = u; });
    el.onclick = ev => { ev.stopPropagation(); preview(p.key); }; return el;
  }
  function clEl(f, n) {
    const el = document.createElement('button'); el.className = 'mk-cl'; el.style.setProperty('--dl', popDelay() + 'ms');
    el.innerHTML = `<span class="fl-in"><span class="cl-st"><i></i><i></i><i></i></span><b>${n}</b></span>`; el.setAttribute('aria-label', n + ' kỷ niệm');
    const src = map.getSource('evs'); src.getClusterLeaves(f.properties.cluster_id, 3, 0).then(ls => { const is = [...el.querySelectorAll('.cl-st i')]; is.slice(0, 3 - ls.length).forEach(i => i.remove()); const left = [...el.querySelectorAll('.cl-st i')].reverse(); ls.forEach((l, i) => A.thumbURL?.(l.properties.mid).then(u => { if (u && left[i]) left[i].style.backgroundImage = `url('${u}')`; })); }).catch(() => { });
    el.onclick = async ev => { ev.stopPropagation(); haptic(6); const z = await src.getClusterExpansionZoom(f.properties.cluster_id); map.easeTo({ center: f.geometry.coordinates, zoom: z + .4, duration: 700 }); }; return el;
  }
  function addEvLayers() {
    map.addSource('evs', { type: 'geojson', data: evFeatures(), cluster: true, clusterRadius: 52, clusterMaxZoom: 16 });
    map.addLayer({ id: 'evs-x', type: 'circle', source: 'evs', paint: { 'circle-radius': 1, 'circle-opacity': 0, 'circle-stroke-opacity': 0 } }); // lớp vô hình: nguồn chỉ nạp ô dữ liệu khi có lớp dùng nó
    const sync = () => {
      if (!map?.getSource('evs')) return; const seen = new Set(), bb = map.getBounds(), want = [];
      const cw = BOX.clientWidth, ch = BOX.clientHeight, top = M.tab ? 120 : 130, bot = 70; // ảnh sát mép (bị cắt) thì chưa hiện, kéo bản đồ vào là hiện
      for (const f of map.querySourceFeatures('evs')) { const p = f.properties, id = p.cluster ? 'c:' + p.cluster_id : p.key; if (seen.has(id)) continue; seen.add(id); if (!bb.contains(f.geometry.coordinates)) continue;
        if (!p.cluster && M.orbKeys?.has(p.key)) continue; // đã bay quanh nhân vật
        const pt = map.project(f.geometry.coordinates); if (pt.x < 38 || pt.x > cw - 38 || pt.y < top || pt.y > ch - bot) continue; want.push({ id, f }); }
      want.sort((x, y) => (y.f.properties.point_count || 1) - (x.f.properties.point_count || 1) || (y.f.properties.ts || 0) - (x.f.properties.ts || 0));
      const keep = new Set(want.slice(0, MAXMK).map(w => w.id));
      for (const [k, m] of M.evMk) if (!keep.has(k)) { m.remove(); M.evMk.delete(k); }
      for (const { id, f } of want.slice(0, MAXMK)) if (!M.evMk.has(id)) { const el = f.properties.cluster ? clEl(f, f.properties.point_count) : flEl(f.properties); M.evMk.set(id, new ML.Marker({ element: el, anchor: 'bottom' }).setLngLat(f.geometry.coordinates).addTo(map)); }
      fan(); orbit();
    };
    map.on('moveend', sync); map.on('sourcedata', e => { if (e.sourceId === 'evs' && e.isSourceLoaded) sync(); }); M.syncEv = sync;
  }
  // ảnh lẻ đứng gần nhau trên màn hình (< 40 px): toả ra một vòng tròn quanh điểm chung cho khỏi chồng
  function fan() {
    const singles = [...M.evMk.entries()].filter(([k]) => !k.startsWith('c:')).map(([k, m]) => ({ m, p: map.project(m.getLngLat()) })), used = new Set();
    for (const a of singles) { if (used.has(a)) continue; const g = singles.filter(b => !used.has(b) && Math.hypot(a.p.x - b.p.x, a.p.y - b.p.y) < 40); g.forEach(b => used.add(b));
      if (g.length < 2) { a.m.setOffset([0, 0]); continue; } const r = 26 + g.length * 5; g.forEach((b, i) => { const ang = i / g.length * Math.PI * 2 - Math.PI / 2; b.m.setOffset([Math.round(Math.cos(ang) * r), Math.round(Math.sin(ang) * r * .7)]); }); }
  }
  // kỷ niệm quanh đây (≤ 2 km quanh vị trí hiện tại): bay vòng quanh chibi "Bạn đang ở đây"
  // v1.8.1 — kỷ niệm bay VÒNG QUANH nhân vật "Bạn đang ở đây": gắn chung một DOM với marker của nhân vật (không đặt theo toạ độ riêng),
  // ảnh 56 px viền trắng, bán kính ~80 px, quỹ đạo chậm + nhấp nhô. Trong 2 km thì lấy kỷ niệm gần đó, không có thì lấy kỷ niệm mới nhất.
  function orbitList() {
    if (!M.here) return { list: [], near: false };
    const all = A.events().filter(e => e.stack?.[0]); let near = all.map(e => ({ e, g: eventGeo(e) })).filter(x => x.g && distM(x.g, M.here) < 2000).map(x => x.e);
    const isNear = near.length > 0; if (!isNear) near = all.slice().sort((a, b) => b.ts0 - a.ts0);
    return { list: near.slice(0, 6), near: isNear };
  }
  function orbit() {
    const el = M.hereEl; if (!el || !M.here) return; let o = el.querySelector('.mk-orb'); const { list, near } = orbitList(); M.orbKeys = near ? new Set(list.map(e => e.key)) : new Set();
    const sig = list.map(e => e.key).join('|'); if (o && o.dataset.sig === sig) return; o?.remove(); if (!list.length) return;
    o = document.createElement('span'); o.className = 'mk-orb'; o.dataset.sig = sig; const n = list.length;
    o.innerHTML = list.map((e, i) => `<span class="ob" style="--a:${(i / n * 360).toFixed(0)}deg;--ph:${(i * .53).toFixed(2)}s"><button data-k="${esc(e.key)}" aria-label="${esc(e.title)}"><img alt="" data-mid="${e.stack[0].id}"></button></span>`).join(''); el.appendChild(o);
    o.querySelectorAll('img').forEach(im => A.thumbURL?.(im.dataset.mid).then(u => { if (u) im.src = u; }));
    o.onclick = ev => { const b = ev.target.closest('[data-k]'); if (!b) return; ev.stopPropagation(); preview(b.dataset.k); };
  }
  // thẻ xem trước khi chạm ảnh: ảnh, tên sự kiện, ngày, người được gắn → "Mở kỷ niệm"
  const PV = V.querySelector('.mp-pv');
  function preview(key) {
    const e = A.events().find(x => x.key === key); if (!e) return; haptic(8); PV._key = key;
    PV.querySelector('small').textContent = A.spanTxt ? A.spanTxt(e.ms) : ''; PV.querySelector('b').textContent = e.title;
    PV.querySelector('.mp-pva').innerHTML = (e.kids || []).map(id => A.personAv?.(id)).filter(Boolean).slice(0, 6).map(u => `<img src="${u}" alt="">`).join('');
    const im = PV.querySelector('.mp-pvi img'); im.removeAttribute('src'); A.thumbURL?.(e.stack[0]?.id).then(u => { if (u && PV._key === key) im.src = u; });
    PV.hidden = false; PV.animate([{ transform: 'translateY(30px) scale(.9)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.34,1.56,.64,1)' }); A.sfx?.('pop');
  }
  PV.querySelector('.mp-pvx').onclick = ev => { ev.stopPropagation(); PV.hidden = true; A.sfx?.('whoosh'); };
  PV.querySelector('.mp-pvo').onclick = ev => { ev.stopPropagation(); const k = PV._key; PV.hidden = true; if (M.tab) A.goTab?.('tl'); else close(); setTimeout(() => A.openEvent(k), M.tab ? 350 : 0); };
  // chưa có ảnh nào có toạ độ → thẻ gợi ý + danh sách sự kiện chưa có nơi
  const TIP = V.querySelector('.mp-tip');
  function tipUi() { TIP.hidden = !M.tab || A.events().some(e => eventGeo(e)); }
  TIP.querySelector('.mp-tipb').onclick = ev => { ev.stopPropagation(); const evs = A.events().filter(x => !eventGeo(x)).slice(0, 40); if (!evs.length) { TIP.hidden = true; return; }
    contextMenu({ at: ev.currentTarget, title: 'Gắn nơi chốn cho kỷ niệm nào?', items: evs.map(x => ({ label: `${typeOf(x.type).ic} ${esc(x.title)}`, note: A.spanTxt?.(x.ms) || '', act: () => { M.mode = 'pick'; M.pick = async pl => { await A.setEventPlace(x, pl); refresh(); tipUi(); A.toast(`Đã đặt “${x.title}” ở ${pl.name || 'nơi này'} 📍`, 2200); }; hint('Chạm vào chỗ diễn ra kỷ niệm để cắm ghim', 5000); } })) }); };
  // lộ trình chuyến đi: đường gradient theo ngày + chấm đánh số
  function addRoute(route) {
    if (!route?.length) return; const coords = route.map(LL);
    map.addSource('route', { type: 'geojson', lineMetrics: true, data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords.length > 1 ? coords : [coords[0], coords[0]] } } });
    map.addLayer({ id: 'route-glow', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-width': 14, 'line-opacity': .25, 'line-color': '#ff8fbf', 'line-blur': 6 } });
    map.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-width': 6, 'line-gradient': ['interpolate', ['linear'], ['line-progress'], 0, '#14b8a6', .5, '#ffb36b', 1, '#ff5f9e'] } });
    map.addSource('days', { type: 'geojson', data: { type: 'FeatureCollection', features: route.map((r, i) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: LL(r) }, properties: { n: String(i + 1), l: r.label || '' } })) } });
    map.addLayer({ id: 'days', type: 'circle', source: 'days', paint: { 'circle-radius': 13, 'circle-color': '#fff', 'circle-stroke-width': 3, 'circle-stroke-color': '#ff5f9e' } });
    map.addLayer({ id: 'days-n', type: 'symbol', source: 'days', layout: { 'text-field': ['get', 'n'], 'text-font': ['Noto Sans Bold'], 'text-size': 13, 'text-allow-overlap': true }, paint: { 'text-color': '#ff5f9e' } });
  }
  // máy quay bay theo lộ trình (nội suy theo quãng đường, nhìn về phía trước)
  function playRoute() {
    const R = M.route; if (!R || R.length < 2) { hint('Chuyến đi cần ít nhất 2 nơi có toạ độ', 2500); return; }
    const pts = R.map(LL), seg = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const d = distM({ lon: pts[i - 1][0], lat: pts[i - 1][1] }, { lon: pts[i][0], lat: pts[i][1] }); seg.push(d); tot += d; }
    const dur = Math.min(26000, 6000 + pts.length * 2200), t0 = performance.now(), tok = ++M.playing;
    const at = u => { let d = u * tot; for (let i = 0; i < seg.length; i++) { if (d <= seg[i] || i === seg.length - 1) { const k = seg[i] ? Math.min(1, d / seg[i]) : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; } d -= seg[i]; } return pts[pts.length - 1]; };
    const brg = (a, b) => Math.atan2((b[0] - a[0]) * Math.cos(a[1] * Math.PI / 180), b[1] - a[1]) * 180 / Math.PI;
    let bear = map.getBearing();
    const f = now => { if (tok !== M.playing || !map) return; const p = Math.min(1, (now - t0) / dur), u = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2, c = at(u), ah = at(Math.min(1, u + .04)); const want = brg(c, ah); let dB = ((want - bear + 540) % 360) - 180; bear += dB * .06;
      map.jumpTo({ center: c, bearing: bear, pitch: 58, zoom: Math.min(16, 12 + 3 * Math.sin(Math.PI * Math.min(1, p * 1.2))) }); if (p < 1) requestAnimationFrame(f); else { M.playing = 0; hint('Hết lộ trình ✨', 2000); } };
    requestAnimationFrame(f);
  }
  // ---------- chạm bản đồ: "Đặt kỷ niệm ở đây?" ----------
  function onMapClick(e) {
    if (performance.now() - (M.openAt || 0) < 900) return; // cú chạm mở bản đồ không lọt xuống thành “Nơi này là…”
    if (map.queryRenderedFeatures(e.point, { layers: ['days'].filter(l => map.getLayer(l)) }).length) return;
    if (!PV.hidden) { PV.hidden = true; return; } // chạm nền khi đang xem thẻ: chỉ đóng thẻ
    haptic(10); M.newMk?.remove(); const ll = { lat: +e.lngLat.lat.toFixed(6), lon: +e.lngLat.lng.toFixed(6) }, pick = M.mode === 'pick';
    const el = document.createElement('div'); el.className = 'mk-new'; el.innerHTML = `<div class="sb-bub"><b>${pick ? 'Đặt kỷ niệm ở đây?' : 'Nơi này là…'}</b><div class="r">${pick ? '<button data-b="no">Thôi</button><button class="primary" data-b="ok">Đặt ở đây</button>' : '<button data-b="save">Lưu nơi quan trọng</button><button class="primary" data-b="ev">Gắn kỷ niệm</button>'}</div></div><span class="mk-pin">📍</span>`;
    M.newMk = new ML.Marker({ element: el, anchor: 'bottom' }).setLngLat(LL(ll)).addTo(map);
    // giữ thẻ hỏi nằm trọn trong màn hình (chạm sát mép thì đẩy vào trong)
    requestAnimationFrame(() => { const b = el.querySelector('.sb-bub'), r = b.getBoundingClientRect(), W = BOX.getBoundingClientRect(), pad = 12;
      const dx = r.left < W.left + pad ? W.left + pad - r.left : r.right > W.right - pad ? W.right - pad - r.right : 0; if (dx) b.style.transform = `translateX(${dx}px)`; });
    el.addEventListener('click', async ev => { ev.stopPropagation(); const act = ev.target.closest('[data-b]')?.dataset.b; if (!act) return;
      if (act === 'no') { M.newMk.remove(); M.newMk = null; return; }
      if (act === 'ok') { const name = await reverseName(ll.lat, ll.lon), cb = M.pick; if (M.tab) { M.mode = 'view'; M.pick = null; M.newMk?.remove(); M.newMk = null; } else close(); cb?.({ lat: ll.lat, lon: ll.lon, name }); return; }
      if (act === 'save') contextMenu({ at: el, title: 'Đây là…', items: [{ label: '✏️ Tự gõ tên nơi này…', act: async () => { const nm = (await A.prompt('Tên nơi này (vd: Nhà ngoại, Quán cà phê quen)', await reverseName(ll.lat, ll.lon), 50))?.trim(); if (!nm) return; const ps = await places(); ps.push({ id: Date.now().toString(36), kind: 'other', name: nm, lat: ll.lat, lon: ll.lon }); await savePlaces(ps); M.newMk.remove(); M.newMk = null; refresh(); A.toast(`Đã lưu ${nm} ✨`, 1800); } }, ...KINDS.map(k => ({ label: `${k.e} ${k.t}`, act: async () => { const nm = (await A.prompt(`Tên ${k.t.toLowerCase()}`, k.k === 'home' ? 'Nhà mình' : await reverseName(ll.lat, ll.lon), 50))?.trim(); if (nm == null) return; const ps = await places(); if (k.k === 'home') { const i = ps.findIndex(x => x.kind === 'home'); if (i >= 0) ps.splice(i, 1); } ps.push({ id: Date.now().toString(36), kind: k.k, name: nm || k.t, lat: ll.lat, lon: ll.lon }); await savePlaces(ps); M.newMk.remove(); M.newMk = null; refresh(); A.toast(`Đã lưu ${nm || k.t} ✨`, 1800); } }))] });
      if (act === 'ev') { const evs = A.events().filter(x => !eventGeo(x)).slice(0, 40); if (!evs.length) { A.toast('Mọi kỷ niệm đều đã có nơi chốn rồi', 2000); return; } contextMenu({ at: el, title: 'Gắn kỷ niệm nào vào đây?', items: evs.map(x => ({ label: `${typeOf(x.type).ic} ${esc(x.title)}`, note: A.spanTxt(x.ms), act: async () => { const nm = await reverseName(ll.lat, ll.lon); await A.setEventPlace(x, { lat: ll.lat, lon: ll.lon, name: nm }); M.newMk.remove(); M.newMk = null; refresh(); A.toast(`Đã gắn “${x.title}” vào ${nm || 'nơi này'}`, 2200); } })) }); }
    });
  }
  function placeMenu(pl, at) {
    contextMenu({ at, title: `${PLACE_EMO[pl.kind] || '📍'} ${esc(pl.name)}`, items: [
      { icon: 'edit', label: 'Đổi tên', act: async () => { const t = (await A.prompt('Tên nơi này', pl.name, 50))?.trim(); if (!t) return; const ps = await places(); const x = ps.find(q => q.id === pl.id); if (x) x.name = t; await savePlaces(ps); refresh(); } },
      { icon: 'trash', label: 'Bỏ nơi này', danger: true, act: async () => { await savePlaces((await places()).filter(q => q.id !== pl.id)); refresh(); } }] });
  }
  async function refresh() { if (!map) return; clearMarkers(); await drawPlaces(); map.getSource('evs')?.setData(evFeatures()); setTimeout(() => M.syncEv?.(), 300); }
  // ---------- tìm địa chỉ ----------
  let qt = 0;
  Q.addEventListener('input', () => { clearTimeout(qt); const v = Q.value.trim(); if (v.length < 3) { RES.hidden = true; return; } qt = setTimeout(async () => { try { const rs = await searchPlace(v); RES.innerHTML = rs.length ? rs.map((r, i) => `<button data-i="${i}">${esc(r.name)}<small>${esc(r.sub)}</small></button>`).join('') + '<button disabled style="font-size:11px;color:#9a8aa0">Tìm bằng Nominatim / Photon · © OpenStreetMap</button>' : '<button disabled>Không thấy nơi nào</button>'; RES.hidden = false; RES._r = rs; RES._q = v; } catch (e) { A.toast(e.message, 2500); } }, 700); });
  Q.addEventListener('keydown', async e => { if (e.key !== 'Enter') return; e.preventDefault(); clearTimeout(qt); const v = Q.value.trim(); if (v.length < 2) return; Q.blur(); try { const rs = RES._r?.length && RES._q === v ? RES._r : await searchPlace(v); RES.hidden = true; if (!rs.length) { A.toast('Không tìm thấy “' + v + '” — thử gõ kèm tên tỉnh, thành phố', 3000); return; } fly(rs[0], rs[0].name); } catch (er) { A.toast(er.message, 2500); } });
  RES.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b) return; const r = RES._r[+b.dataset.i]; RES.hidden = true; Q.value = r.name; Q.blur(); fly(r, r.name); });
  const fly = (p, t, z = 16.2) => { title(t || ''); map?.flyTo({ center: LL(p), zoom: z, pitch: 56, bearing: -18, speed: 1.2, curve: 1.4, essential: true }); };
  // ---------- thanh dưới ----------
  V.querySelector('.mp-back').onclick = () => close();
  async function setKind(k) { await A.metaSet('sy:mapStyle', k); M.kind = k; const t = k === 'theme' ? (A.theme?.() || 'dawn') : 'light'; if (map && M.theme !== t) { const s0 = await baseStyle(); M.theme = t; map.setStyle(themed(s0, t), { diff: false }); map.once('style.load', () => { M.evMk.forEach(m => m.remove()); M.evMk.clear(); addEvLayers(); addRoute(M.route); setAccuracy(); refresh(); }); } }
  V.querySelector('.mp-more').onclick = e => contextMenu({ at: e.currentTarget, title: 'Bản đồ', items: [
    { icon: 'palette', label: 'Kiểu bản đồ', note: M.kind === 'theme' ? 'Theo giao diện' : 'Sáng', act: () => contextMenu({ at: e.currentTarget, title: 'Kiểu bản đồ', items: [{ label: '☀️ Sáng (giống Google)', on: M.kind !== 'theme', act: () => setKind('light') }, { label: '🌌 Theo giao diện của app', on: M.kind === 'theme', act: () => setKind('theme') }] }) },
    { icon: 'info', label: 'Về dữ liệu bản đồ', act: () => A.toast('Bản đồ dùng dữ liệu OpenStreetMap qua OpenFreeMap; khu vực bạn xem được tải từ máy chủ bản đồ. Toạ độ kỷ niệm chỉ lưu trong máy và Google Drive của bạn.', 6500) }] });
  V.querySelector('.mp-bar').addEventListener('click', async e => {
    e.stopPropagation(); const b = e.target.closest('[data-m]'); if (!b || !map) return; haptic(8);
    if (b.dataset.m === 'me') { if (!navigator.geolocation) { A.toast('Máy này không cho lấy vị trí', 2000); return; } navigator.geolocation.getCurrentPosition(p => { M.here = { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }; setAccuracy(); refresh(); fly(M.here, 'Nơi bạn đang đứng', 16.5); }, () => A.toast('Bạn chưa cho phép lấy vị trí — tìm địa chỉ ở ô trên cũng được', 3200), { enableHighAccuracy: true, timeout: 12000 }); }
    else if (b.dataset.m === 'home') { const h = (await places()).find(p => p.kind === 'home'); if (h) fly(h, h.name); else A.toast('Chưa có “Nhà mình” — chạm một chỗ trên bản đồ rồi chọn Lưu nơi quan trọng › Nhà mình', 3800); }
    else if (b.dataset.m === 'all') showAll();
    else if (b.dataset.m === 'play') playRoute();
  });
  function setAccuracy() { if (!map || !M.here) return; const n = 48, r = Math.max(15, Math.min(400, M.here.acc || 30)), c = []; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2; c.push([M.here.lon + r * Math.cos(a) / (111320 * Math.cos(M.here.lat * Math.PI / 180)), M.here.lat + r * Math.sin(a) / 110540]); } const data = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [c] } };
    if (map.getSource('acc')) map.getSource('acc').setData(data); else { map.addSource('acc', { type: 'geojson', data }); map.addLayer({ id: 'acc', type: 'fill', source: 'acc', paint: { 'fill-color': '#3b82f6', 'fill-opacity': .14 } }); map.addLayer({ id: 'acc-l', type: 'line', source: 'acc', paint: { 'line-color': '#3b82f6', 'line-width': 1.5, 'line-opacity': .5 } }); } }
  // những nơi đã đến: thu khung vừa mọi nơi + thanh lọc theo năm / chương
  async function showAll() {
    const pts = [...(await places()).map(LL), ...A.events().map(eventGeo).filter(Boolean).map(LL)]; if (!pts.length) { A.toast('Chưa có nơi nào — cắm ghim Nhà mình hoặc gắn kỷ niệm vào bản đồ trước nhé', 3500); return; }
    const b = pts.reduce((bb, p) => bb.extend(p), new ML.LngLatBounds(pts[0], pts[0])); map.fitBounds(b, { padding: { top: 150, bottom: 160, left: 50, right: 50 }, pitch: 40, maxZoom: 15.5, duration: 1400 }); title('Những nơi trong đời bạn');
    const F = V.querySelector('.mp-flt'), ys = [...new Set(A.events().filter(eventGeo).map(e => new Date(e.ts0).getFullYear()))].sort((a, b) => b - a), chs = A.chapters?.() || [];
    F.innerHTML = `<button data-f="" class="on">Tất cả</button>${chs.slice().reverse().map(c => `<button data-f="c:${c.key}">${c.ic} ${esc(c.title)}</button>`).join('')}${ys.map(y => `<button data-f="y:${y}">${y}</button>`).join('')}`; F.hidden = false;
  }
  V.querySelector('.mp-flt').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (!b) return; haptic(5); V.querySelectorAll('.mp-flt button').forEach(x => x.classList.toggle('on', x === b)); const f = b.dataset.f;
    M.flt = !f ? null : f.startsWith('y:') ? (ev, y) => y === +f.slice(2) : (ev) => ev.chapter?.key === f.slice(2); map.getSource('evs')?.setData(evFeatures()); setTimeout(() => M.syncEv?.(), 300); });
  // ---------- mở / đóng ----------
  function close() {
    if (!M.tab) { const stop = ev => { ev.stopPropagation(); ev.preventDefault(); }; document.addEventListener('click', stop, true); setTimeout(() => document.removeEventListener('click', stop, true), 450); }
    PV.hidden = true; TIP.hidden = true; M.hereEl = null; if (map) M.last = { center: map.getCenter(), zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() };
    M.playing = 0; clearMarkers(); M.newMk?.remove(); M.newMk = null; try { map?.remove(); } catch (e) { } map = null;
    V.classList.remove('open', 'tab'); V.setAttribute('aria-hidden', 'true'); document.body.classList.remove('mapopen', 'maptab'); M.tab = false; M.pick = null; M.mode = 'view'; M.route = null; M.flt = null; V.querySelector('.mp-flt').hidden = true; A.onClose?.();
  }
  async function open(o = {}) {
    if (V.classList.contains('open')) { if (o.tab && M.tab) return; close(); }
    M.tab = !!o.tab; V.classList.toggle('tab', M.tab); document.body.classList.toggle('maptab', M.tab);
    V.classList.add('open'); M.openAt = performance.now(); V.setAttribute('aria-hidden', 'false'); document.body.classList.add('mapopen'); A.onOpen?.();
    M.mode = o.pick ? 'pick' : 'view'; M.pick = o.pick || null; M.route = o.route || null; RES.hidden = true; Q.value = ''; V.querySelector('[data-m=play]').hidden = !(M.route?.length > 1); V.querySelector('.mp-flt').hidden = true;
    hint(o.pick ? 'Chạm vào chỗ diễn ra kỷ niệm để cắm ghim' : 'Chạm ảnh để xem · chạm nền để cắm ghim · hai ngón để xoay', 4500);
    const LD = V.querySelector('.mp-load'); LD.hidden = false;
    try {
      ML ||= (await import('./lib/maplibre-gl.mjs')).default || await import('./lib/maplibre-gl.mjs');
      let at = o.at; if (!at) { const ps = await places(); const h = ps.find(p => p.kind === 'home') || ps[0]; if (h) at = { lat: h.lat, lon: h.lon, name: h.name }; }
      if (!at) { const g = A.events().map(eventGeo).find(Boolean); if (g) at = { ...g, name: g.name || '' }; }
      M.kind = (await A.metaGet('sy:mapStyle')) || 'light'; const tk = M.kind === 'theme' ? (A.theme?.() || 'dawn') : 'light';
      const style = themed(await baseStyle(), tk); M.theme = tk;
      // tab Bản đồ: lần đầu mở trong phiên thì bắt đầu từ toàn cảnh Việt Nam rồi bay xuống; các lần sau mở lại đúng chỗ cũ
      const flyIn = M.tab && !o.at && !M.last, back = M.tab && !o.at && M.last;
      map = new ML.Map({ container: BOX, style, center: flyIn ? [106.2, 16.2] : back ? M.last.center : at ? LL(at) : [105.8524, 21.0287], zoom: flyIn ? 4.6 : back ? M.last.zoom : at ? 16 : 5.2, pitch: flyIn ? 0 : back ? M.last.pitch : at ? 56 : 0, bearing: flyIn ? 0 : back ? M.last.bearing : at ? -18 : 0, maxPitch: 62, maxZoom: 18.5, attributionControl: false, canvasContextAttributes: { antialias: true }, fadeDuration: 150 });
      const attr = new ML.AttributionControl({ compact: true, customAttribution: '© OpenMapTiles © OpenStreetMap contributors' });
      map.addControl(attr, 'bottom-right');
      // MapLibre mở sẵn dòng ghi nguồn → thu lại thành nút ⓘ, bấm mới hiện
      const fold = () => attr._container?.classList.remove('maplibregl-compact-show');
      map.once('load', fold); map.once('idle', fold); setTimeout(fold, 0);
      map.touchPitch.enable(); map.dragRotate.enable();
      await new Promise((res, rej) => { map.once('load', res); map.once('error', e => rej(e.error || e)); setTimeout(res, 12000); });
      LD.hidden = true; title(at?.name || (at ? '' : 'Tìm địa chỉ nhà bạn ở ô trên'));
      addEvLayers(); addRoute(M.route); map.on('click', onMapClick); await drawPlaces(); M.syncEv();
      if (M.route?.length > 1) { const b = M.route.reduce((bb, p) => bb.extend(LL(p)), new ML.LngLatBounds(LL(M.route[0]), LL(M.route[0]))); map.fitBounds(b, { padding: 80, pitch: 50, maxZoom: 15.5, duration: 0 }); }
      if (o.focus) fly(o.focus, at?.name || '', 16.6);
      tipUi();
      if (flyIn) { // bay từ toàn cảnh xuống vị trí hiện tại (nếu đã cho phép) hoặc Nhà mình
        let st = 'prompt'; try { st = (await navigator.permissions?.query({ name: 'geolocation' }))?.state || 'prompt'; } catch (e) { }
        const go = (p, t) => { title(t); map?.flyTo({ center: LL(p), zoom: 15.4, pitch: 52, bearing: -18, duration: 3600, curve: 1.5, essential: true }); };
        if (st !== 'denied' && navigator.geolocation) navigator.geolocation.getCurrentPosition(p => { if (!map) return; M.here = { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }; setAccuracy(); refresh(); go(M.here, 'Bạn đang ở đây'); }, () => at && go(at, at.name || ''), { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
        else if (at) setTimeout(() => go(at, at.name || ''), 500);
        else if (A.events().some(e => eventGeo(e))) setTimeout(showAll, 500);
      }
    } catch (e) { LD.hidden = true; console.warn('bản đồ', e); A.toast('Chưa mở được bản đồ — kiểm tra mạng rồi thử lại', 3500); }
  }
  return { open, close, isOpen: () => V.classList.contains('open'), get map() { return map; }, isTab: () => M.tab && V.classList.contains('open'), setTheme: t => { if (M.kind !== 'theme') return; if (map && M.theme !== t) baseStyle().then(s => { M.theme = t; map.setStyle(themed(s, t), { diff: false }); map.once('style.load', () => { M.evMk.forEach(m => m.remove()); M.evMk.clear(); addEvLayers(); addRoute(M.route); setAccuracy(); refresh(); }); }); } };
}

// ---------- khung bản đồ cho video "Bản đồ hành trình": bản đồ ẩn, máy quay theo lộ trình, đợi tải xong rồi mới chụp ----------
export async function mapIntro({ route, W, H, theme = 'dawn' }) {
  const ML = (await import('./lib/maplibre-gl.mjs')).default || await import('./lib/maplibre-gl.mjs'), w = Math.round(W / 2), h = Math.round(H / 2);
  const box = document.createElement('div'); box.style.cssText = `position:fixed;left:-9999px;top:0;width:${w}px;height:${h}px;pointer-events:none`; document.body.appendChild(box);
  const style = themed(await baseStyle(), theme), pts = route.map(r => [r.lon, r.lat]);
  const map = new ML.Map({ container: box, style, center: pts[0], zoom: 14, pitch: 58, interactive: false, attributionControl: false, pixelRatio: 2, canvasContextAttributes: { preserveDrawingBuffer: true, antialias: true }, fadeDuration: 0 });
  await new Promise(r => { map.once('load', r); setTimeout(r, 15000); });
  if (pts.length > 1) { map.addSource('route', { type: 'geojson', lineMetrics: true, data: { type: 'Feature', geometry: { type: 'LineString', coordinates: pts } } }); map.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-width': 7, 'line-gradient': ['interpolate', ['linear'], ['line-progress'], 0, '#14b8a6', .5, '#ffb36b', 1, '#ff5f9e'] } }); }
  map.addSource('days', { type: 'geojson', data: { type: 'FeatureCollection', features: pts.map((c, i) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: c }, properties: { n: String(i + 1) } })) } });
  map.addLayer({ id: 'days', type: 'circle', source: 'days', paint: { 'circle-radius': 12, 'circle-color': '#fff', 'circle-stroke-width': 3, 'circle-stroke-color': '#ff5f9e' } });
  map.addLayer({ id: 'days-n', type: 'symbol', source: 'days', layout: { 'text-field': ['get', 'n'], 'text-font': ['Noto Sans Bold'], 'text-size': 13, 'text-allow-overlap': true }, paint: { 'text-color': '#ff5f9e' } });
  const seg = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const d = distM({ lon: pts[i - 1][0], lat: pts[i - 1][1] }, { lon: pts[i][0], lat: pts[i][1] }); seg.push(d); tot += d; }
  const at = u => { if (pts.length < 2) return pts[0]; let d = u * tot; for (let i = 0; i < seg.length; i++) { if (d <= seg[i] || i === seg.length - 1) { const k = seg[i] ? Math.min(1, d / seg[i]) : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; } d -= seg[i]; } return pts[pts.length - 1]; };
  // đặt lắng nghe TRƯỚC khi đổi máy quay: khung đã vẽ xong và mọi ô bản đồ đã tải thì mới chụp
  const shotAfter = move => new Promise(r => { let ok = false; const fin = () => { if (!ok) { ok = true; r(); } }; map.once('render', () => { if (map.areTilesLoaded()) fin(); else map.once('idle', fin); }); setTimeout(fin, 3500); move(); map.triggerRepaint(); });
  const frame = async (lt, len) => { const p = Math.max(0, Math.min(1, lt / Math.max(.1, len - .4))), u = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2, c = at(u);
    await shotAfter(() => map.jumpTo({ center: c, zoom: pts.length > 1 ? 12.6 + 2.6 * Math.sin(Math.PI * Math.min(1, p)) : 15 + p, pitch: 58, bearing: -30 + 50 * u })); return map.getCanvas(); };
  frame.dispose = () => { try { map.remove(); } catch (e) { } box.remove(); };
  return frame;
}
