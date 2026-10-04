// Hành Trình Của Bạn — dòng thời gian 3D lưu giữ ảnh/video của con.
// Mọi dữ liệu chỉ nằm trong máy người dùng (IndexedDB). Không gửi đi đâu.
import * as THREE from './lib/three.module.min.js';
import { initDiary } from './nhatky.js';
import { installSprings, initSheets, icon, haptic, fmtLong, IOS, contextMenu, longPress, undoToast } from './ui.js';
import { initTimeline } from './dongthoigian.js';
import { initProfile, KID_COLORS, defaultColor } from './hoso.js';
import { initNhac } from './nhac.js';
import { birthIntro, showOutro } from './modau.js';
import { initDrive } from './drive.js';
import { GOOGLE_CLIENT_ID } from './config.js';
import { ROLES, roleOf, isMe, isChild, isPartner, isElder, roleName, showsAge, findMe, sortPeople, sinceOf, anchorOf, chaptersOf, chapterAt, approxLabel, approxTs, SEASONS, PRECS } from './doi.js';
import { lunar2solar, solar2lunar, LUNAR_MONTH } from './hoso-data.js';
import { initOnboarding } from './lamquen.js';
import { chibiSVG } from './chibi.js';
import { initMap, eventGeo, searchPlace } from './bando.js';
import { initLich } from './lich.js';
import { initVoice } from './giongke.js';
import { initVideoUI } from './videoui.js';

const VERSION = '1.7.2';
const Q = new URLSearchParams(location.search);
const TEST = Q.has('test');
const MUTE = Q.has('im');
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (k, dt) => 1 - Math.exp(-k * dt);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeBack = t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOBILE = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 700;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- Ngày tháng & tuổi ----------
const pad = n => String(n).padStart(2, '0');
const dmy = ts => { const d = new Date(ts); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
const ymd = ts => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const WD = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const parseYmd = (s, keepFrom) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); if (!m) return null;
  const o = keepFrom != null ? new Date(keepFrom) : null;
  return new Date(+m[1], +m[2] - 1, +m[3], o ? o.getHours() : 12, o ? o.getMinutes() : 0, o ? o.getSeconds() : 0).getTime();
};
const dayStart = ts => { const d = new Date(ts); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
const kidsOf = m => Array.isArray(m?.kidIds) && m.kidIds.length ? m.kidIds : m?.kidId ? [m.kidId] : [];
const cap = t => { t = String(t ?? '').trim(); return t ? t.charAt(0).toLocaleUpperCase('vi') + t.slice(1) : t; };
const KN = () => cap(S.kid?.name);
function ageText(kid, ts, withName = true) {
  if (kid) kid = { ...kid, name: isMe(kid) ? 'Bạn' : cap(kid.name) };
  if (!kid || !kid.birth || !showsAge(kid)) return '';
  const nm = withName ? kid.name + ' ' : '', adult = !isChild(kid);
  if (kid.birthApprox) { const yy = new Date(ts).getFullYear() - +kid.birth.slice(0, 4); return yy < 0 ? (withName && isMe(kid) ? 'Trước khi bạn chào đời' : '') : yy === 0 ? (withName ? `Năm ${isMe(kid) ? 'bạn' : kid.name} chào đời` : 'Năm chào đời') : `${nm}${yy} tuổi`; }
  const b = parseYmd(kid.birth), d0 = dayStart(ts), b0 = dayStart(b);
  if (d0 < b0) {
    const days = Math.round((b0 - d0) / 864e5);
    if (days > 42 * 7) return `Trước khi ${isMe(kid) ? 'bạn' : kid.name} chào đời`;
    const w = clamp(40 - Math.floor(days / 7), 1, 42);
    return withName ? `${kid.name} trong bụng mẹ · tuần ${w}` : `Trong bụng mẹ · tuần ${w}`;
  }
  if (d0 === b0) return withName ? `Ngày ${isMe(kid) ? 'bạn' : kid.name} chào đời` : 'Ngày đầu tiên';
  const bd = new Date(b0), dd = new Date(d0);
  let y = dd.getFullYear() - bd.getFullYear(), m = dd.getMonth() - bd.getMonth(), da = dd.getDate() - bd.getDate();
  if (da < 0) { m--; da += new Date(dd.getFullYear(), dd.getMonth(), 0).getDate(); }
  if (m < 0) { y--; m += 12; }
  if (adult && y >= 3) return m === 0 && da === 0 ? `${nm}${withName ? 't' : 'T'}ròn ${y} tuổi` : `${nm}${y} tuổi`;
  if (y === 0 && m === 0) return `${nm}${da} ngày tuổi`;
  if (y === 0) return da && m < 3 ? `${nm}${m} tháng ${da} ngày` : `${nm}${m} tháng tuổi`;
  if (m === 0) return da === 0 ? `${nm}${withName ? 't' : 'T'}ròn ${y} tuổi` : `${nm}${y} tuổi`;
  return `${nm}${y} tuổi ${m} tháng`;
}
const fmtDur = s => { s = Math.round(s || 0); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };
const fmtSize = b => b > 1e9 ? (b / 1e9).toFixed(1).replace('.', ',') + ' GB' : b > 1e6 ? Math.round(b / 1e6) + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' KB';
const noAccent = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^\w-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

// ---------- IndexedDB ----------
const DBN = TEST ? 'nganha_test' + (/^[A-Z]$/.test(Q.get('dev') || '') ? '_' + Q.get('dev') : '') : 'nganha';
let _db;
function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((res, rej) => {
    const r = indexedDB.open(DBN, 3);
    r.onupgradeneeded = ev => {
      const d = r.result;
      if (!d.objectStoreNames.contains('kids')) d.createObjectStore('kids', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('moments')) d.createObjectStore('moments', { keyPath: 'id' }).createIndex('kid', 'kidId');
      if (!d.objectStoreNames.contains('blobs')) d.createObjectStore('blobs');
      if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta');
      if (!d.objectStoreNames.contains('diaries')) d.createObjectStore('diaries', { keyPath: 'id' });
      if (ev.oldVersion < 3) { // kidId → kidIds (giữ nguyên kidId để không mất gì)
        const st = r.transaction.objectStore('moments');
        if (!st.indexNames.contains('kids')) st.createIndex('kids', 'kidIds', { multiEntry: true });
        st.openCursor().onsuccess = e => { const c = e.target.result; if (!c) return; const v = c.value; if (!Array.isArray(v.kidIds)) { v.kidIds = v.kidId ? [v.kidId] : []; c.update(v); } c.continue(); };
      }
    };
    r.onsuccess = () => { _db = r.result; _db.onversionchange = () => _db.close(); res(_db); };
    r.onerror = () => rej(r.error);
    r.onblocked = () => rej(new Error('blocked'));
  });
}
async function dbx(store, mode, fn) {
  const d = await openDB();
  return new Promise((res, rej) => {
    const t = d.transaction(store, mode), s = t.objectStore(store);
    let out; const r = fn(s);
    if (r) r.onsuccess = () => { out = r.result; };
    t.oncomplete = () => res(out);
    t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('abort'));
  });
}
const dbGetRaw = (st, k) => dbx(st, 'readonly', s => s.get(k));
const dbPutRaw = (st, v, k) => dbx(st, 'readwrite', s => k === undefined ? s.put(v) : s.put(v, k));
const dbDelRaw = (st, k) => dbx(st, 'readwrite', s => s.delete(k));
// tệp gốc / ảnh nhỏ không có trong máy (máy mới, hoặc "chỉ giữ bản nhỏ") → tải từ Google Drive nếu đã đăng nhập
let DRV = null;
const dbGet = (st, k) => dbGetRaw(st, k).then(v => v ?? (st === 'blobs' && DRV?.signedIn && /^[ot]_/.test(k) ? DRV.fetchBlob(k) : v));
// mọi thay đổi dữ liệu thật → hẹn đồng bộ Drive (gom 5 giây)
const SYNCMETA = /^(ev:|bg:|sy:)|^(groups|drvFolders|chapters|anniv)$/; let DATAVER = 0;
const dbPut = (st, v, k) => dbPutRaw(st, v, k).then(r => { if (st !== 'blobs') DATAVER++; if (st === 'kids' || st === 'moments' || st === 'diaries' || (st === 'meta' && SYNCMETA.test(String(k)))) DRV?.markDirty(); return r; });
const dbDel = (st, k) => dbDelRaw(st, k).then(r => { DATAVER++; if (st === 'kids' || st === 'moments' || st === 'diaries') DRV?.markDirty(); return r; });
const dbAll = st => dbx(st, 'readonly', s => s.getAll());
const dbKeys = st => dbx(st, 'readonly', s => s.getAllKeys());
const metaGet = k => dbGet('meta', k);
const metaSet = (k, v) => dbPut('meta', v, k);
async function askPersist() {
  try { if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch (e) { }
}

// ---------- Đọc ngày chụp ----------
// đọc MỌI khối EXIF (JPEG nhiều APP segment, HEIC item Exif), cả hai thứ tự byte; thêm XMP. Trả về chi tiết để soi lỗi.
const EXDT = s => { const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(s || ''); return m && +m[1] >= 1990 ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime() : null; };
function tiffTags(dv, t0) {
  const le = dv.getUint16(t0) === 0x4949, L = dv.byteLength;
  const u16 = o => dv.getUint16(t0 + o, le), u32 = o => dv.getUint32(t0 + o, le);
  const str = (o, n) => { let s = ''; for (let i = 0; i < n && t0 + o + i < L; i++) { const c = dv.getUint8(t0 + o + i); if (!c) break; s += String.fromCharCode(c); } return s; };
  const readIfd = off => { const out = {}; if (!off || t0 + off + 2 > L) return out; const n = u16(off); if (n > 500) return out;
    for (let i = 0; i < n; i++) { const e = off + 2 + i * 12; if (t0 + e + 12 > L) break; const tag = u16(e), type = u16(e + 2), cnt = u32(e + 4);
      if (type === 2) out[tag] = str(cnt <= 4 ? e + 8 : u32(e + 8), cnt); else if (type === 4 || type === 3) out[tag] = type === 4 ? u32(e + 8) : u16(e + 8); }
    return out; };
  const ifd0 = readIfd(u32(4)), ex = ifd0[0x8769] ? readIfd(ifd0[0x8769]) : {};
  // v1.7.0: toạ độ GPS (IFD 0x8825): 1/3 = N|S, E|W; 2/4 = 3 số hữu tỉ độ-phút-giây
  let gps = null;
  try { const g = ifd0[0x8825]; if (g && t0 + g + 2 <= L) { const n = u16(g), raw = {}; for (let i = 0; i < n && i < 40; i++) { const e = g + 2 + i * 12, tag = u16(e), type = u16(e + 2), cnt = u32(e + 4); if (type === 2) raw[tag] = str(cnt <= 4 ? e + 8 : u32(e + 8), cnt); else if (type === 5 && cnt === 3) { const o = u32(e + 8); raw[tag] = [0, 1, 2].map(k => { const d = u32(o + k * 8 + 4); return d ? u32(o + k * 8) / d : 0; }); } }
    if (raw[2] && raw[4]) { const dms = a => a[0] + a[1] / 60 + a[2] / 3600; let la = dms(raw[2]), lo = dms(raw[4]); if (/S/i.test(raw[1] || '')) la = -la; if (/W/i.test(raw[3] || '')) lo = -lo; if ((la || lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180) gps = { lat: +la.toFixed(6), lon: +lo.toFixed(6) }; } } } catch (e) { }
  return { orig: ex[0x9003] || '', digi: ex[0x9004] || '', dt: ifd0[0x0132] || '', off: ex[0x9011] || '', gps };
}
async function readMeta(file) {
  const info = { exif: [], xmp: '' };
  const scan = buf => {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    for (let i = 0; i < buf.length - 14; i++) {
      if (buf[i] === 0x45 && buf[i + 1] === 0x78 && buf[i + 2] === 0x69 && buf[i + 3] === 0x66 && buf[i + 4] === 0 && buf[i + 5] === 0) {
        const t = i + 6, a = buf[t], b = buf[t + 1];
        if ((a === 0x49 && b === 0x49 && buf[t + 2] === 0x2a) || (a === 0x4d && b === 0x4d && buf[t + 3] === 0x2a)) { try { info.exif.push(tiffTags(dv, t)); } catch (e) { } }
      }
    }
    if (!info.xmp) { let txt = ''; for (let i = 0; i < buf.length; i += 32768) txt += String.fromCharCode.apply(null, buf.subarray(i, i + 32768)); const m = /(?:exif:DateTimeOriginal|xmp:CreateDate|photoshop:DateCreated)\s*(?:=\s*["']|>)\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?)/.exec(txt); if (m) info.xmp = m[1]; }
  };
  try {
    scan(new Uint8Array(await file.slice(0, Math.min(file.size, 1 << 20)).arrayBuffer()));
    if (!info.exif.some(x => x.orig) && file.size > 1 << 20) scan(new Uint8Array(await file.slice(Math.max(1 << 20, file.size - (768 << 10)), file.size).arrayBuffer()));
  } catch (e) { }
  return info;
}
// chỉ tin ngày CHỤP (DateTimeOriginal / Digitized / XMP); DateTime của IFD0 chỉ là ngày sửa tệp —
// iPhone xuất ảnh qua ô chọn tệp hay ghi ngày lúc xuất vào đó, nên chỉ dùng khi không gần "bây giờ"
async function exifDate(file, info) {
  info = info || await readMeta(file);
  for (const x of info.exif) { const t = EXDT(x.orig) || EXDT(x.digi); if (t) return t; }
  if (info.xmp) { const t = Date.parse(info.xmp.length === 16 ? info.xmp + ':00' : info.xmp); if (t > 6e11) return t; }
  for (const x of info.exif) { const t = EXDT(x.dt); if (t && Math.abs(Date.now() - t) > 3 * 864e5) return t; }
  return null;
}
async function videoDate(file) {
  const parts = [[0, Math.min(file.size, 3 << 20)]];
  if (file.size > 3 << 20) parts.push([Math.max(3 << 20, file.size - (4 << 20)), file.size]);
  let mv = null;
  for (const [a, b] of parts) {
    try {
      const buf = new Uint8Array(await file.slice(a, b).arrayBuffer());
      let txt = ''; for (let i = 0; i < buf.length; i += 32768) txt += String.fromCharCode.apply(null, buf.subarray(i, i + 32768));
      const k = txt.indexOf('com.apple.quicktime.creationdate');
      if (k >= 0) {
        const re = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})([+-]\d{2}):?(\d{2})|(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z/g;
        re.lastIndex = k; const m = re.exec(txt);
        if (m) {
          const iso = m[1] ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${m[7]}:${m[8]}` : `${m[9]}-${m[10]}-${m[11]}T${m[12]}:${m[13]}:${m[14]}Z`;
          const t = Date.parse(iso); if (t > 6e11) return t;
        }
      }
      if (mv == null) {
        const j = txt.indexOf('mvhd');
        if (j >= 0 && j + 16 < buf.length) {
          const dv = new DataView(buf.buffer, buf.byteOffset); const ver = buf[j + 4];
          const sec = ver === 1 ? Number(dv.getBigUint64(j + 8)) : dv.getUint32(j + 8);
          const t = (sec - 2082844800) * 1000;
          if (t > 9.5e11 && t < Date.now() + 864e5) { mv = t; try { file.vdSrc = 'mvhd'; } catch (e) { } }
        }
      }
    } catch (e) { }
  }
  return mv;
}
function nameDate(name) {
  name = name || '';
  // số mili-giây/giây kiểu Unix trong tên (Zalo, Messenger…): 13 hoặc 10 chữ số trong khoảng 2012 → nay
  const ep = /(?:^|\D)(1[3-9]\d{11}|1[3-9]\d{8})(?!\d)/.exec(name);
  if (ep) { let t = +ep[1]; if (ep[1].length === 10) t *= 1000; if (t > 1.33e12 && t < Date.now() + 864e5) return t; }
  const m = /(20\d{2})[-_. ]?([01]\d)[-_. ]?([0-3]\d)(?:(?:[-_ T.]|\s+at\s+)?([0-2]\d)[-_.:h ]?([0-5]\d)(?:[-_.:m ]?([0-5]\d))?)?/.exec(name);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y > new Date().getFullYear()) return null;
  return new Date(y, mo - 1, d, m[4] && +m[4] < 24 ? +m[4] : 12, m[5] ? +m[5] : 0, m[6] ? +m[6] : 0).getTime();
}
// tự căn ngày cho ảnh/video chỉ có ngày lưu tệp: theo ảnh có ngày chụp đứng liền trước/sau (thứ tự tên tệp), không thì ảnh gần nhất theo lastModified
const nameKey = n => { const m = /^(.*?)(\d+)(\D*)$/.exec((n || '').replace(/\.[^.]+$/, '')); return m ? { pre: m[1].toLowerCase(), num: +m[2] } : null; };
function alignDates(rows) {
  const ok = r => r.ready && !r.bad, good = rows.filter(r => ok(r) && (r.src === 'meta' || r.src === 'name' || r.src === 'user'));
  for (const r of rows) {
    if (!ok(r) || !(r.src === 'file' || r.src === 'check')) continue;
    const k = nameKey(r.file.name); let ref = null;
    if (k) {
      const fam = good.map(g => ({ g, k: nameKey(g.file.name) })).filter(x => x.k && x.k.pre === k.pre && Math.abs(x.k.num - k.num) <= 60);
      const prev = fam.filter(x => x.k.num < k.num).sort((a, b) => b.k.num - a.k.num)[0], next = fam.filter(x => x.k.num > k.num).sort((a, b) => a.k.num - b.k.num)[0];
      if (prev && next && ymd(prev.g.ts) === ymd(next.g.ts)) { const dp = k.num - prev.k.num, dn = next.k.num - k.num; ref = { g: prev.g, frac: prev.g.ts + (next.g.ts - prev.g.ts) * dp / (dp + dn) }; }
      else if (prev || next) { const n = prev && next ? (k.num - prev.k.num <= next.k.num - k.num ? prev : next) : (prev || next); ref = { g: n.g, frac: n.g.ts + (n === prev ? 1 : -1) * Math.abs(k.num - n.k.num) * 30e3 }; }
    }
    if (!ref && good.length) { const lm = r.file.lastModified || 0; const g = good.slice().sort((a, b) => Math.abs((a.file.lastModified || 0) - lm) - Math.abs((b.file.lastModified || 0) - lm))[0]; if (g) ref = { g, frac: g.ts + 60e3 }; }
    if (ref) { r.ts = Math.round(ref.frac); r.src = 'align'; }
  }
}
// toạ độ chụp: EXIF GPS (ảnh) hoặc ©xyz / ISO6709 trong moov (video iPhone, Android)
async function readGps(file, isVideo) {
  try {
    if (!isVideo) { const info = await readMeta(file); return info.exif.map(x => x.gps).find(Boolean) || null; }
    const parts = [[0, Math.min(file.size, 3 << 20)]]; if (file.size > 3 << 20) parts.push([Math.max(3 << 20, file.size - (4 << 20)), file.size]);
    for (const [a, b] of parts) { const buf = new Uint8Array(await file.slice(a, b).arrayBuffer()); let txt = ''; for (let i = 0; i < buf.length; i += 32768) txt += String.fromCharCode.apply(null, buf.subarray(i, i + 32768));
      for (const key of ['com.apple.quicktime.location.ISO6709', '\xa9xyz']) { const k = txt.indexOf(key); if (k < 0) continue; const m = /([+-]\d{1,2}\.\d+)([+-]\d{1,3}\.\d+)/.exec(txt.slice(k, k + 200)); if (m) return { lat: +(+m[1]).toFixed(6), lon: +(+m[2]).toFixed(6) }; } }
  } catch (e) { }
  return null;
}
async function readDate(file, isVideo) {
  let t = isVideo ? await videoDate(file) : await exifDate(file);
  if (t && isVideo && Math.abs(Date.now() - t) < 2 * 864e5 && file.vdSrc === 'mvhd') t = null; // mvhd gần "bây giờ" = lúc iPhone xuất tệp, không phải lúc quay
  if (t) return { ts: t, src: 'meta' };
  t = nameDate(file.name);
  if (t) return { ts: t, src: 'name' };
  const lm = file.lastModified || Date.now();
  return { ts: lm, src: Math.abs(Date.now() - lm) < 2 * 864e5 ? 'check' : 'file' };
}

// ---------- Ảnh nhỏ (thumbnail) ----------
const isHeic = f => /hei[cf]/i.test(f.type) || /\.(heic|heif)$/i.test(f.name);
function canvasToBlob(c, q = .85) { return new Promise(r => c.toBlob(r, 'image/jpeg', q)); }
function avgColor(ctx, w, h) {
  const d = ctx.getImageData(0, 0, w, h).data; let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 4 * 37) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
  const hx = v => pad(Math.round(v / n).toString(16)).slice(-2);
  return { hex: '#' + hx(r) + hx(g) + hx(b), lum: (r * .3 + g * .59 + b * .11) / n };
}
function drawThumb(src, sw, sh, max = 512) {
  const k = Math.min(1, max / Math.max(sw, sh)), w = Math.max(1, Math.round(sw * k)), h = Math.max(1, Math.round(sh * k));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(src, 0, 0, w, h);
  return { c, x, w, h };
}
function placeholderThumb(label) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 400; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 512, 400); g.addColorStop(0, '#ffc2dc'); g.addColorStop(1, '#ffe2a8');
  x.fillStyle = g; x.fillRect(0, 0, 512, 400);
  x.fillStyle = 'rgba(255,255,255,.85)'; x.font = '700 64px Quicksand, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(label, 256, 200);
  return { c, x, w: 512, h: 400 };
}
function loadImg(url) {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('img')); im.src = url; });
}
async function imageThumb(file) {
  const url = URL.createObjectURL(file);
  try {
    const im = await loadImg(url); await im.decode?.().catch(() => { });
    const t = drawThumb(im, im.naturalWidth, im.naturalHeight);
    const col = avgColor(t.x, t.w, t.h);
    return { blob: await canvasToBlob(t.c), w: im.naturalWidth, h: im.naturalHeight, color: col.hex, ok: true };
  } catch (e) {
    const t = placeholderThumb(isHeic(file) ? 'HEIC' : '📷');
    return { blob: await canvasToBlob(t.c), w: 0, h: 0, color: '#ffd0c8', ok: false };
  } finally { URL.revokeObjectURL(url); }
}
// ảnh đại diện video — chịu được iOS WebKit: muted/playsinline đặt TRƯỚC src, gắn vào trang (không ẩn hẳn),
// phát thử để có khung thật, chờ khung hình mới (requestVideoFrameCallback / timeupdate), chụp ~10% thời lượng, khung tối thì thử mốc khác
function vmuted(v) { v.muted = true; v.defaultMuted = true; v.setAttribute('muted', ''); v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', ''); }
const nextFrame = (v, ms = 1500) => new Promise(res => { let ok = false; const fin = () => { if (ok) return; ok = true; res(); }; if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(() => fin()); const tu = () => { if (v.currentTime > 0) { v.removeEventListener('timeupdate', tu); fin(); } }; v.addEventListener('timeupdate', tu); v.addEventListener('seeked', () => setTimeout(fin, 120), { once: true }); setTimeout(fin, ms); });
const once = (el, ev, ms) => new Promise(res => { let t = 0; const f = () => { clearTimeout(t); el.removeEventListener(ev, f); res(true); }; el.addEventListener(ev, f); t = setTimeout(() => { el.removeEventListener(ev, f); res(false); }, ms); });
async function videoThumb(file) {
  const url = URL.createObjectURL(file), v = document.createElement('video');
  vmuted(v); v.preload = 'auto'; v.crossOrigin = 'anonymous';
  v.style.cssText = 'position:fixed;left:0;top:0;width:64px;height:64px;opacity:.011;pointer-events:none;z-index:-1';
  document.body.appendChild(v); v.src = url;
  let dur = 0, out = null;
  try {
    if (!(await once(v, 'loadedmetadata', 6000)) && !v.videoWidth) throw new Error('meta');
    dur = isFinite(v.duration) ? v.duration : 0;
    if (!dur) { v.currentTime = 1e7; await once(v, 'durationchange', 1500); dur = isFinite(v.duration) ? v.duration : 0; }
    try { await v.play(); await nextFrame(v, 1200); v.pause(); } catch (e) { }
    const tries = dur ? [.1, .3, .55, .02].map(k => Math.min(dur - .05, Math.max(.05, dur * k))) : [0];
    for (const at of tries) {
      if (Math.abs(v.currentTime - at) > .04) { v.currentTime = at; await once(v, 'seeked', 2500); }
      await nextFrame(v, 700);
      if (!v.videoWidth) continue;
      const t = drawThumb(v, v.videoWidth, v.videoHeight), col = avgColor(t.x, t.w, t.h);
      if (col.lum >= 16 || at === tries[tries.length - 1]) { out = { blob: await canvasToBlob(t.c), w: v.videoWidth, h: v.videoHeight, color: col.hex, dur, ok: col.lum >= 16 }; if (col.lum >= 16) break; }
    }
  } catch (e) { }
  if (!out) { const t = placeholderThumb('🎬'); out = { blob: await canvasToBlob(t.c), w: v.videoWidth || 0, h: v.videoHeight || 0, color: '#c9b8ff', dur, ok: false }; }
  try { v.pause(); } catch (e) { } v.removeAttribute('src'); v.load(); v.remove(); URL.revokeObjectURL(url);
  return out;
}

// ---------- Sao lưu .nganha ----------
// Định dạng: 8 byte "NGANHA01" + 12 chữ số (độ dài header) + header JSON (UTF-8)
// + nối các blob. off của mỗi blob tính từ đầu phần dữ liệu (ngay sau header).
async function buildBackup(onProg) {
  const kids = (await dbAll('kids')).filter(k => !k.deleted), moments = (await dbAll('moments')).filter(m => !m.deleted);
  const blobs = [], parts = []; let off = 0;
  for (let i = 0; i < moments.length; i++) {
    const m = moments[i];
    for (const key of ['o_' + m.id, 't_' + m.id]) {
      const b = await dbGet('blobs', key); if (!b) continue;
      blobs.push({ key, type: b.type || '', size: b.size, off }); parts.push(b); off += b.size;
    }
    onProg?.(i / Math.max(1, moments.length));
  }
  const diaries = (await dbAll('diaries')).filter(d => !d.deleted), settings = { ev: {}, bg: {}, groups: (await metaGet('groups')) || [] };
  { const e = await metaGet('ev:fam'); if (e) settings.ev.fam = e; }
  for (const k of kids) { const av = await dbGet('blobs', 'av_' + k.id); if (av) { blobs.push({ key: 'av_' + k.id, type: av.type || 'image/jpeg', size: av.size, off }); parts.push(av); off += av.size; } }
  for (const k of kids) { const e = await metaGet('ev:' + k.id), g = await metaGet('bg:' + k.id); if (e) settings.ev[k.id] = e; if (g) settings.bg[k.id] = g; const b = await dbGet('blobs', 'bg_' + k.id); if (b) { blobs.push({ key: 'bg_' + k.id, type: b.type || 'image/jpeg', size: b.size, off }); parts.push(b); off += b.size; } }
  for (const d of diaries) { const b = await dbGet('blobs', 'd_' + d.id); if (b) { blobs.push({ key: 'd_' + d.id, type: b.type || 'image/jpeg', size: b.size, off }); parts.push(b); off += b.size; } }
  const header = new TextEncoder().encode(JSON.stringify({ app: 'NganHaCuaCon', v: 1, ver: VERSION, created: Date.now(), children: kids, moments, diaries, settings, blobs }));
  return new Blob([new TextEncoder().encode('NGANHA01' + String(header.length).padStart(12, '0')), header, ...parts], { type: 'application/octet-stream' });
}
async function readBackup(file) {
  const head = new TextDecoder().decode(await file.slice(0, 20).arrayBuffer());
  if (!head.startsWith('NGANHA01')) throw new Error('Tệp này không phải bản sao lưu Ngân Hà.');
  const n = +head.slice(8, 20); if (!(n > 0)) throw new Error('Bản sao lưu bị hỏng.');
  const hd = JSON.parse(new TextDecoder().decode(await file.slice(20, 20 + n).arrayBuffer()));
  return { hd, base: 20 + n };
}
async function importBackup(file, onProg) {
  const { hd, base } = await readBackup(file);
  const kids = await dbAll('kids'), have = new Set((await dbKeys('moments')).map(String));
  const kidIds = new Set(kids.map(k => k.id));
  let nk = 0, nm = 0, skip = 0;
  for (const k of hd.children || []) if (!kidIds.has(k.id)) { await dbPut('kids', k); kidIds.add(k.id); nk++; const av = (hd.blobs || []).find(b => b.key === 'av_' + k.id); if (av) await dbPut('blobs', file.slice(base + av.off, base + av.off + av.size, av.type), 'av_' + k.id); }
  const bmap = new Map((hd.blobs || []).map(b => [b.key, b]));
  const list = hd.moments || [];
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    if (have.has(String(m.id))) { skip++; continue; }
    for (const key of ['o_' + m.id, 't_' + m.id]) {
      const b = bmap.get(key); if (!b) continue;
      await dbPut('blobs', file.slice(base + b.off, base + b.off + b.size, b.type), key);
    }
    await dbPut('moments', m); nm++;
    onProg?.((i + 1) / list.length);
  }
  const haveD = new Set((await dbKeys('diaries')).map(String)); let nd = 0;
  for (const d of hd.diaries || []) {
    if (haveD.has(String(d.id))) continue;
    const b = bmap.get('d_' + d.id); if (b) await dbPut('blobs', file.slice(base + b.off, base + b.off + b.size, b.type), 'd_' + d.id);
    await dbPut('diaries', d); nd++;
  }
  for (const [kid, v] of Object.entries(hd.settings?.ev || {})) if (!(await metaGet('ev:' + kid))) await metaSet('ev:' + kid, v);
  for (const [kid, v] of Object.entries(hd.settings?.bg || {})) if (!(await metaGet('bg:' + kid))) { await metaSet('bg:' + kid, v); const b = bmap.get('bg_' + kid); if (b) await dbPut('blobs', file.slice(base + b.off, base + b.off + b.size, b.type), 'bg_' + kid); }
  if (hd.settings?.groups?.length) { const cur = (await metaGet('groups')) || [], have2 = new Set(cur.map(g => g.id)); for (const g of hd.settings.groups) if (!have2.has(g.id)) cur.push(g); await metaSet('groups', cur); S.groups = cur; }
  return { nk, nm, skip, nd };
}

// ---------- Nhạc nền ----------
// Giai điệu hộp nhạc tự sáng tác (Fa trưởng, hợp âm F – C – Dm – Bb, ~70 bpm). Không dùng nhạc có bản quyền.
const Music = (() => {
  let ac = null, master = null, duckG = null, verb = null, dry = null, timer = null, nextT = 0, step = 0, playing = false, fileEl = null, fileSrc = null, fileUrl = null;
  const BPM = 70, BEAT = 60 / BPM;
  const N = n => { const m = /^([A-G])(b|#)?(\d)$/.exec(n); const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0); return 440 * Math.pow(2, (base + (+m[3] + 1) * 12 - 69) / 12); };
  const MEL = [
    'C5 1,A4 .5,C5 .5,F5 1.5,E5 .5', 'E5 1,D5 .5,C5 .5,G4 2', 'A4 1,D5 .5,F5 .5,E5 1,D5 1', 'D5 1.5,C5 .5,Bb4 1,C5 1',
    'C5 1,A4 .5,C5 .5,F5 1,A5 1', 'G5 1.5,F5 .5,E5 1,C5 1', 'D5 1,F5 .5,E5 .5,D5 1,A4 1', 'Bb4 1,D5 1,C5 2',
    'F5 .5,G5 .5,A5 1,C6 1,A5 1', 'G5 .5,A5 .5,G5 1,E5 2', 'F5 .5,E5 .5,D5 1,A5 1,F5 1', 'D5 1,F5 1,E5 1,C5 1',
    'A5 1,G5 .5,F5 .5,C5 1,F5 1', 'E5 1,G5 1,C6 2', 'D6 1,C6 .5,A5 .5,F5 1,D5 1', 'F5 1,D5 1,F5 2'
  ].map(b => b.split(',').map(x => { const [n, d] = x.split(' '); return [N(n), +d]; }));
  const CH = [['F3', 'C4', 'F4', 'A4'], ['C3', 'G3', 'C4', 'E4'], ['D3', 'A3', 'D4', 'F4'], ['Bb2', 'F3', 'Bb3', 'D4']].map(c => c.map(N));
  function impulse(sec = 3.2) {
    const len = Math.floor(ac.sampleRate * sec), b = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    return b;
  }
  function ensure() {
    if (ac) return ac;
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    ac = new C();
    master = ac.createGain(); master.gain.value = 0;
    duckG = ac.createGain(); duckG.gain.value = 1;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
    verb = ac.createConvolver(); verb.buffer = impulse();
    const wet = ac.createGain(); wet.gain.value = .55; dry = ac.createGain(); dry.gain.value = .8;
    dry.connect(master); dry.connect(verb); verb.connect(wet); wet.connect(master);
    master.connect(duckG); duckG.connect(comp); comp.connect(ac.destination);
    return ac;
  }
  function bell(f, t, vel, len = 2.4) {
    // chuông hộp nhạc: sine gốc + bội âm, tắt dần theo hàm mũ
    const out = ac.createGain(); out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(vel, t + .006); out.gain.exponentialRampToValueAtTime(.0008, t + len);
    const pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
    if (pan) { pan.pan.value = clamp((Math.log2(f / 440)) * .35, -.6, .6); out.connect(pan); pan.connect(dry); } else out.connect(dry);
    [[1, 1], [2, .28], [3.01, .08], [5.4, .05]].forEach(([k, a], i) => {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f * k;
      const g = ac.createGain(); g.gain.value = a;
      if (i) { g.gain.setValueAtTime(a, t); g.gain.exponentialRampToValueAtTime(.0005, t + len * (i === 1 ? .5 : .18)); }
      o.connect(g); g.connect(out); o.start(t); o.stop(t + len + .05);
    });
  }
  function schedule() {
    // mỗi bước = 1 ô nhịp; lên lịch trước ~1 ô nhịp
    while (nextT < ac.currentTime + 1.2) {
      const bar = step % 16, mel = MEL[bar], ch = CH[bar % 4];
      let t = nextT;
      for (const [f, d] of mel) { bell(f, t, .2, 2.6); t += d * BEAT; }
      const arp = [0, 1, 2, 3, 2, 1, 2, 1];
      arp.forEach((j, i) => bell(ch[j], nextT + i * BEAT / 2, i === 0 ? .1 : .055, 2));
      if (Math.random() < .55) bell(mel[0][0] * 2, nextT + (2 + Math.floor(Math.random() * 4) * .5) * BEAT, .035, 3); // lấp lánh
      nextT += 4 * BEAT; step++;
    }
  }
  return {
    async start(kind, fileBlob) {
      if (MUTE || kind === 'off') return;
      if (!ensure()) return;
      try { await ac.resume(); } catch (e) { }
      this.stop(true);
      playing = true;
      const now = ac.currentTime;
      master.gain.cancelScheduledValues(now); master.gain.setValueAtTime(0, now); master.gain.linearRampToValueAtTime(kind === 'file' ? .9 : .75, now + 2.2);
      if (kind === 'file' && fileBlob) {
        fileUrl = URL.createObjectURL(fileBlob);
        fileEl = new Audio(); fileEl.src = fileUrl; fileEl.loop = true; fileEl.crossOrigin = 'anonymous';
        fileSrc = ac.createMediaElementSource(fileEl); fileSrc.connect(master);
        fileEl.play().catch(() => { });
      } else {
        step = 0; nextT = now + .15; schedule();
        timer = setInterval(schedule, 200);
      }
    },
    stop(now = false) {
      if (!ac) return;
      const t = ac.currentTime;
      clearInterval(timer); timer = null;
      const el = fileEl, src = fileSrc, url = fileUrl; fileEl = fileSrc = fileUrl = null;
      master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0, t + (now ? .05 : 1.4));
      setTimeout(() => { if (el) { el.pause(); el.removeAttribute('src'); } try { src?.disconnect(); } catch (e) { } if (url) URL.revokeObjectURL(url); }, now ? 60 : 1500);
      playing = false;
    },
    duck(on) { if (!ac) return; const t = ac.currentTime; duckG.gain.cancelScheduledValues(t); duckG.gain.setValueAtTime(duckG.gain.value, t); duckG.gain.linearRampToValueAtTime(on ? .22 : 1, t + .6); },
    get playing() { return playing; },
    get ctx() { return ac; },
    audio() { return MUTE ? null : ensure(); }
  };
})();

// ---------- Trạng thái chung ----------
const S = {
  kids: [], kid: null, moments: [], theme: 'night', music: 'builtin', musicName: '',
  mode: 'boot', mix: 0, mixT: 0, time: 0, cur: -1, lbIdx: -1, fontsOk: false
};
const V3 = THREE.Vector3;
const UP = new V3(0, 1, 0);
// hình nền (theo từng bé): 'auto' = theo phong cách, 'scene' = cảnh 3D, 'grad' = màu chuyển sắc, 'image' = ảnh của bạn
var BG = { cfg: null, flat: false, url: null };

// ---------- Renderer ----------
const canvas = $('#scene');
const DPR_MAX = 2;
let dpr = Math.min(devicePixelRatio || 1, DPR_MAX);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !MOBILE || dpr < 2, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: TEST });
renderer.setPixelRatio(dpr);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, .1, 6000);
const MAX_ANISO = Math.min(4, renderer.capabilities.getMaxAnisotropy());
const PT_MAX = (() => { const gl = renderer.getContext(); const r = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE); return r ? r[1] : 256; })();

// ---------- Vật liệu điểm sáng dùng chung (sao, bụi, bokeh, cánh hoa, bong bóng, đốm sáng) ----------
const PT_VS = `
attribute float size; attribute float phase; attribute vec3 color;
uniform float uTime, uScale, uPx, uAtten, uTw, uOpacity, uWrap, uFall, uSway, uMaxPt;
uniform vec3 uCam, uBox;
varying vec3 vC; varying float vA; varying float vRot;
void main(){
  vec3 p = position;
  float edge = 1.0;
  if (uWrap > .5) {
    p.y -= uTime * uFall * (.6 + fract(phase * 7.3) * .8);
    p.x += sin(uTime * .45 + phase * 6.283) * uSway; p.z += cos(uTime * .37 + phase * 4.1) * uSway;
    vec3 rel = mod(p - uCam + uBox * .5, uBox) - uBox * .5;
    p = uCam + rel;
    vec3 q = abs(rel) / uBox; edge = 1.0 - smoothstep(.36, .5, max(q.x, max(q.y, q.z)));
  }
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 1.0 - uTw * .5 + uTw * .5 * sin(uTime * (1.1 + phase * .9) + phase * 6.283);
  float ps = uAtten > .5 ? size * uScale / max(.5, -mv.z) : size * uPx;
  gl_PointSize = min(ps, uMaxPt);
  vA = tw * uOpacity * edge * (uAtten > .5 ? clamp(ps / max(ps, .001), 0., 1.) : 1.0);
  if (uAtten > .5 && ps < 1.2) vA *= ps / 1.2;
  vC = color; vRot = phase * 6.283 + uTime * .4 * sign(phase - .5);
}`;
const PT_FS = `
uniform float uShape;
varying vec3 vC; varying float vA; varying float vRot;
void main(){
  vec2 c = gl_PointCoord - .5; float d = length(c) * 2.0; float a;
  vec3 col = vC;
  if (uShape < .5) { a = pow(max(0., 1. - d), 2.2); col += vec3(smoothstep(.35, .0, d)) * .55; }           // đốm sáng mềm
  else if (uShape < 1.5) { a = smoothstep(1., .8, d) * .55 + smoothstep(1., .93, d) * smoothstep(.8, .95, d) * .35; } // bokeh
  else if (uShape < 2.5) { float cr = max(0., 1. - abs(c.x) * 14.) * max(0., 1. - abs(c.y) * 2.2) + max(0., 1. - abs(c.y) * 14.) * max(0., 1. - abs(c.x) * 2.2);
    a = clamp(pow(max(0., 1. - d), 3.) + cr * .9, 0., 1.); col += vec3(pow(max(0., 1. - d), 6.)); }              // sao lấp lánh
  else if (uShape < 3.5) { float ring = smoothstep(.72, .9, d) * smoothstep(1., .92, d); float hl = smoothstep(.22, .0, length(c - vec2(-.17, -.17)));
    a = ring * .75 + hl * .9 + smoothstep(1., .0, d) * .08; col = mix(col, vec3(1.), hl); }                      // bong bóng
  else { float cs = cos(vRot), sn = sin(vRot); vec2 q = vec2(c.x * cs - c.y * sn, c.x * sn + c.y * cs);
    q.x *= 1.9; float e = length(q) * 2.0 + q.y * .5; a = smoothstep(1., .82, e); col = mix(col, vec3(1.), smoothstep(.6, .0, e) * .35); } // cánh hoa
  a *= vA; if (a < .004) discard;
  gl_FragColor = vec4(col, a);
}`;
const ptMats = [];
function ptMat(o = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uScale: { value: 500 }, uPx: { value: dpr }, uAtten: { value: o.atten ? 1 : 0 }, uTw: { value: o.tw ?? 0 },
      uOpacity: { value: o.opacity ?? 1 }, uWrap: { value: o.wrap ? 1 : 0 }, uFall: { value: o.fall ?? 0 }, uSway: { value: o.sway ?? 0 },
      uCam: { value: new V3() }, uBox: { value: o.box || new V3(1, 1, 1) }, uShape: { value: o.shape ?? 0 }, uMaxPt: { value: Math.min(PT_MAX, 900) }
    },
    vertexShader: PT_VS, fragmentShader: PT_FS, transparent: true, depthWrite: false,
    blending: o.normal ? THREE.NormalBlending : THREE.AdditiveBlending
  });
  m.userData = { base: o.opacity ?? 1, themed: o.themed || null, fixedBlend: !!o.fixedBlend };
  ptMats.push(m); return m;
}
function ptGeo(n) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('size', new THREE.BufferAttribute(new Float32Array(n), 1));
  g.setAttribute('phase', new THREE.BufferAttribute(new Float32Array(n), 1));
  for (let i = 0; i < n; i++) g.attributes.phase.array[i] = Math.random();
  return g;
}
const hexRGB = h => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; }; // shader dùng giá trị sRGB trực tiếp
const PAL_N = ['#ff8fbf', '#ffd27f', '#c3b2ff', '#ffffff', '#9fd8ff', '#ffb3d6'].map(h => new THREE.Color(h));
const PAL_D = ['#ff7aa8', '#ffad5c', '#ffffff', '#ff9ec4', '#ffd36b'].map(h => new THREE.Color(h));
const setCol = (arr, i, c, k = 1) => { arr[i * 3] = c.r * k; arr[i * 3 + 1] = c.g * k; arr[i * 3 + 2] = c.b * k; };
// Lưu ý: THREE.Color('#..') chuyển sang linear; ở shader ta cần sRGB → dùng getStyle gốc
for (const P of [PAL_N, PAL_D]) P.forEach(c => c.convertLinearToSRGB());

// ---------- Kết cấu (texture) vẽ bằng canvas ----------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const TX = {};
TX.glow = canvasTex(256, 256, (x, w) => { const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.18, 'rgba(255,240,230,.75)'); g.addColorStop(.5, 'rgba(255,200,220,.22)'); g.addColorStop(1, 'rgba(255,200,220,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
TX.rays = canvasTex(512, 512, (x, w) => {
  x.translate(w / 2, w / 2);
  for (let i = 0; i < 18; i++) { x.rotate(Math.PI * 2 / 18); const g = x.createLinearGradient(0, 0, w / 2, 0); g.addColorStop(0, 'rgba(255,240,200,.9)'); g.addColorStop(1, 'rgba(255,200,150,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(0, 0); x.lineTo(w / 2, i % 2 ? -10 : -22); x.lineTo(w / 2, i % 2 ? 10 : 22); x.closePath(); x.fill(); }
});
TX.ring = canvasTex(256, 256, (x, w) => { const g = x.createRadialGradient(w / 2, w / 2, w * .3, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,220,150,0)'); g.addColorStop(.62, 'rgba(255,220,150,.9)'); g.addColorStop(.7, 'rgba(255,240,200,1)'); g.addColorStop(.8, 'rgba(255,190,140,.5)'); g.addColorStop(1, 'rgba(255,190,140,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
TX.cloud = canvasTex(512, 256, (x, w, h) => {
  const blobs = [[.5, .62, .3], [.32, .66, .2], [.68, .66, .22], [.42, .45, .2], [.6, .44, .18], [.2, .72, .13], [.8, .72, .13]];
  for (const [bx, by, br] of blobs) { const g = x.createRadialGradient(bx * w, by * h, 0, bx * w, by * h, br * w); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.6, 'rgba(255,250,252,.8)'); g.addColorStop(1, 'rgba(255,240,245,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }
  x.globalCompositeOperation = 'source-atop'; const g2 = x.createLinearGradient(0, h * .3, 0, h); g2.addColorStop(0, 'rgba(255,255,255,0)'); g2.addColorStop(1, 'rgba(255,170,190,.45)'); x.fillStyle = g2; x.fillRect(0, 0, w, h);
});
TX.neb = [0, 1, 2].map(k => canvasTex(256, 256, (x, w) => {
  for (let i = 0; i < 14; i++) { const cx = w * (.25 + Math.random() * .5), cy = w * (.25 + Math.random() * .5), r = w * (.12 + Math.random() * .25); const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); }
}));

// ---------- Bầu trời 2 phong cách ----------
const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 18), new THREE.ShaderMaterial({
  uniforms: { uMix: { value: 0 }, uN1: { value: new V3(.075, .04, .17) }, uN2: { value: new V3(.018, .016, .07) }, uN3: { value: new V3(.14, .05, .2) }, uD1: { value: new V3(1, .79, .66) }, uD2: { value: new V3(1, .9, .86) }, uD3: { value: new V3(.99, .83, .92) }, uD4: { value: new V3(.97, .78, .88) } }, side: THREE.BackSide, depthWrite: false,
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
  fragmentShader: `uniform float uMix; uniform vec3 uN1, uN2, uN3, uD1, uD2, uD3, uD4; varying vec3 vD;
  void main(){ float y = vD.y;
    vec3 night = mix(uN1, uN2, smoothstep(-.05, .85, y));
    night = mix(night, uN3, smoothstep(.1, -.6, y) * .7);
    vec3 dawn = mix(uD1, uD2, smoothstep(.0, .28, y));
    dawn = mix(dawn, uD3, smoothstep(.28, .9, y));
    dawn = mix(dawn, uD4, smoothstep(-.02, -.55, y));
    gl_FragColor = vec4(mix(night, dawn, uMix), 1.); }`
}));
sky.renderOrder = -10; scene.add(sky);
const envNight = new THREE.Group(), envDawn = new THREE.Group(); scene.add(envNight, envDawn);

// sao nền (theo máy quay)
const STARS = MOBILE ? 1500 : 2800;
const starPts = new THREE.Points(ptGeo(STARS), ptMat({ tw: .9, shape: 0, themed: 'night' }));
{ const g = starPts.geometry, P = g.attributes.position.array, C = g.attributes.color.array, Z = g.attributes.size.array;
  for (let i = 0; i < STARS; i++) { const u = Math.random() * 2 - 1, a = Math.random() * 6.283, r = Math.sqrt(1 - u * u); P[i * 3] = r * Math.cos(a) * 1600; P[i * 3 + 1] = u * 1600; P[i * 3 + 2] = r * Math.sin(a) * 1600;
    setCol(C, i, PAL_N[Math.random() < .7 ? 3 : (Math.random() * 6) | 0], .6 + Math.random() * .4); Z[i] = Math.random() < .06 ? 3.2 + Math.random() * 2 : 1 + Math.random() * 1.6; } }
starPts.frustumCulled = false; envNight.add(starPts);
// sao lấp lánh lớn
const SPK = MOBILE ? 50 : 90;
const sparkStars = new THREE.Points(ptGeo(SPK), ptMat({ tw: 1, shape: 2, themed: 'night' }));
{ const g = sparkStars.geometry, P = g.attributes.position.array, C = g.attributes.color.array, Z = g.attributes.size.array;
  for (let i = 0; i < SPK; i++) { const u = Math.random() * 1.6 - .6, a = Math.random() * 6.283, r = Math.sqrt(1 - u * u); P[i * 3] = r * Math.cos(a) * 1500; P[i * 3 + 1] = u * 1500; P[i * 3 + 2] = r * Math.sin(a) * 1500; setCol(C, i, PAL_N[(Math.random() * 4) | 0]); Z[i] = 9 + Math.random() * 12; } }
sparkStars.frustumCulled = false; envNight.add(sparkStars);
// tinh vân
const nebGroup = new THREE.Group(); envNight.add(nebGroup);
const nebCols = ['#7a3cff', '#ff4fa3', '#3c6bff', '#b04cff', '#ff7a7a', '#4fb8ff', '#ff5fd0'];
for (let i = 0; i < 9; i++) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.neb[i % 3], color: nebCols[i % nebCols.length], transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
  const a = i / 9 * 6.283 + Math.random(), y = (Math.random() - .35) * 900;
  sp.position.set(Math.cos(a) * 1300, y, Math.sin(a) * 1300); sp.scale.setScalar(900 + Math.random() * 700); sp.material.userData.base = .55; nebGroup.add(sp);
}
// bokeh & bong bóng & cánh hoa (bao quanh máy quay)
function wrapPts(n, mat, box, sizeR, pal) {
  const p = new THREE.Points(ptGeo(n), mat), g = p.geometry, P = g.attributes.position.array, C = g.attributes.color.array, Z = g.attributes.size.array;
  for (let i = 0; i < n; i++) { P[i * 3] = (Math.random() - .5) * box.x; P[i * 3 + 1] = (Math.random() - .5) * box.y; P[i * 3 + 2] = (Math.random() - .5) * box.z; setCol(C, i, pal[(Math.random() * pal.length) | 0]); Z[i] = sizeR[0] + Math.random() * (sizeR[1] - sizeR[0]); }
  p.frustumCulled = false; return p;
}
const bokeh = wrapPts(MOBILE ? 36 : 70, ptMat({ atten: 1, shape: 1, wrap: 1, sway: 3, tw: .5, box: new V3(90, 50, 90), opacity: .32, themed: 'night' }), new V3(90, 50, 90), [2.5, 7], PAL_N);
envNight.add(bokeh);
const bubbles = wrapPts(MOBILE ? 30 : 60, ptMat({ atten: 1, shape: 3, wrap: 1, fall: -.9, sway: 2, box: new V3(80, 46, 80), opacity: .7, normal: 1, fixedBlend: 1, themed: 'dawn' }), new V3(80, 46, 80), [1.2, 3.6], ['#ffffff', '#ffe0ef', '#e8e0ff', '#fff1d6'].map(h => new THREE.Color(h).convertLinearToSRGB()));
const petals = wrapPts(MOBILE ? 160 : 320, ptMat({ atten: 1, shape: 4, wrap: 1, fall: 1.4, sway: 3.2, box: new V3(90, 50, 90), opacity: .9, normal: 1, fixedBlend: 1, themed: 'dawn' }), new V3(90, 50, 90), [.45, 1.05], ['#ff9ec4', '#ffc2d9', '#ffb38a', '#ffffff', '#ff86b0'].map(h => new THREE.Color(h).convertLinearToSRGB()));
envDawn.add(bubbles, petals);
// mây (Bình minh)
const cloudGroup = new THREE.Group(); envDawn.add(cloudGroup);
const clouds = [];
function placeClouds(R) {
  for (const c of clouds) { cloudGroup.remove(c); c.material.dispose(); }
  clouds.length = 0;
  const n = MOBILE ? 26 : 44;
  for (let i = 0; i < n; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.cloud, transparent: true, opacity: .92, depthWrite: false, fog: false }));
    const below = i < n * .55, a = Math.random() * 6.283, r = below ? Math.random() * (R + 30) : R + 40 + Math.random() * 160;
    sp.position.set(Math.cos(a) * r, below ? -16 - Math.random() * 18 : -10 + Math.random() * 60, Math.sin(a) * r);
    const s = below ? 28 + Math.random() * 30 : 60 + Math.random() * 80; sp.scale.set(s, s * .5, 1);
    sp.material.userData.base = below ? .75 : .9; sp.userData.sp = (Math.random() - .5) * .02;
    clouds.push(sp); cloudGroup.add(sp);
  }
}

// ---------- Xoắn ốc Archimedes: r = r0 + kθ ----------
const SPI = { r0: 9, k: 12 / (2 * Math.PI), dth: .004, th: [0], s: [0] };
const yOf = th => .9 * Math.sin(th * 1.6) + .45 * Math.sin(th * .55 + 1);
function spiralTo(L) {
  const T = SPI.th, A = SPI.s;
  while (A[A.length - 1] < L) { const th = T[T.length - 1], r = SPI.r0 + SPI.k * th; A.push(A[A.length - 1] + Math.hypot(r, SPI.k) * SPI.dth); T.push(th + SPI.dth); }
}
function thetaAt(s) {
  spiralTo(s + 2); const A = SPI.s; let lo = 0, hi = A.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (A[mid] <= s) lo = mid; else hi = mid; }
  return SPI.th[lo] + (s - A[lo]) / (A[hi] - A[lo]) * SPI.dth;
}
function bandPt(s, out = new V3()) {
  if (s < 0) { bandPt(0, out); const t = bandTan(0); return out.addScaledVector(t, s); }
  const th = thetaAt(s), r = SPI.r0 + SPI.k * th;
  return out.set(r * Math.cos(th), yOf(th), r * Math.sin(th));
}
function bandTan(s, out = new V3()) {
  const th = thetaAt(Math.max(0, s)), r = SPI.r0 + SPI.k * th;
  return out.set(SPI.k * Math.cos(th) - r * Math.sin(th), 0, SPI.k * Math.sin(th) + r * Math.cos(th)).normalize();
}
function bandOut(s, out = new V3()) { const t = bandTan(s); return out.set(t.z, 0, -t.x).multiplyScalar(-1); } // hướng ra ngoài
const radiusAt = s => SPI.r0 + SPI.k * thetaAt(Math.max(0, s));
{ const o = bandOut(10), p = bandPt(10); if (o.dot(new V3(p.x, 0, p.z)) < 0) bandOut.flip = true; }
function outward(s, out = new V3()) { bandOut(s, out); if (bandOut.flip) out.multiplyScalar(-1); return out; }

// ---------- Dải ngân hà (ShaderMaterial theo uv.x) ----------
const bandMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uEnd: { value: 50 }, uDawn: { value: 0 }, uOp: { value: 1 }, uFlash: { value: 0 } },
  transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  vertexShader: `varying vec2 vUv; varying float vD; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform float uTime, uEnd, uDawn, uOp, uFlash; varying vec2 vUv; varying float vD;
  void main(){
    float y = abs(vUv.y), s = vUv.x;
    float core = exp(-y * y * 70.), mid = exp(-y * y * 12.), halo = exp(-y * y * 2.6);
    float p1 = pow(.5 + .5 * sin(s * .2 - uTime * 2.4), 14.);
    float p2 = pow(.5 + .5 * sin(s * .045 - uTime * .8 + 1.), 5.);
    float g = .5 + .5 * sin(s * .028);
    vec3 cN = mix(vec3(1., .5, .76), vec3(1., .8, .45), g);
    vec3 cD = mix(vec3(.98, .36, .58), vec3(1., .55, .22), g);
    vec3 col = mix(cN, cD, uDawn);
    float a = core * (1. + p1 * 1.6) + mid * (.32 + p1 * .5 + p2 * .3) + halo * (.12 + p2 * .12);
    col = mix(col, vec3(1., .97, .92), clamp(core * (.55 + p1) * (1. - uDawn * .45), 0., 1.));
    float fin = smoothstep(0., 8., s) * (1. - smoothstep(uEnd, uEnd + 26., s));
    if (s > uEnd) fin *= .35 + .65 * smoothstep(.35, .6, fract(s * .35));
    a *= fin / (1. + vD * .0028) * uOp * (1. + uFlash);
    if (uDawn > .5) a = min(a * 1.15, .92);
    gl_FragColor = vec4(col, a);
  }`
});
let bandMesh = null;
function buildBand(sEnd) {
  if (bandMesh) { scene.remove(bandMesh); bandMesh.geometry.dispose(); }
  const L = sEnd + 30, step = .5, n = Math.ceil(L / step) + 1, W = 3.2;
  const pos = new Float32Array(n * 6), uv = new Float32Array(n * 4), idx = [];
  const p = new V3(), o = new V3();
  for (let i = 0; i < n; i++) {
    const s = i * step; bandPt(s, p); outward(s, o);
    pos.set([p.x + o.x * W, p.y, p.z + o.z * W, p.x - o.x * W, p.y, p.z - o.z * W], i * 6);
    uv.set([s, 1, s, -1], i * 4);
    if (i < n - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeBoundingSphere();
  bandMesh = new THREE.Mesh(g, bandMat); bandMesh.renderOrder = 1; scene.add(bandMesh);
  bandMat.uniforms.uEnd.value = sEnd;
}

// ---------- Bụi thiên hà quanh dải + lõi sáng ----------
let dust = null;
const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.glow, color: '#ffd9ec', transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }));
core.scale.setScalar(34); core.position.set(0, 1, 0); scene.add(core);
function buildDust(sEnd) {
  if (dust) { scene.remove(dust); dust.geometry.dispose(); dust.material.dispose(); ptMats.splice(ptMats.indexOf(dust.material), 1); }
  const n = Math.round(clamp(1600 + sEnd * 4, 1600, MOBILE ? 4000 : 9000));
  dust = new THREE.Points(ptGeo(n), ptMat({ atten: 1, tw: .8, shape: 0, opacity: .9 }));
  dust.material.userData.dust = true;
  const g = dust.geometry, P = g.attributes.position.array, C = g.attributes.color.array, Z = g.attributes.size.array, p = new V3(), o = new V3();
  const R = radiusAt(sEnd) + 14;
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  for (let i = 0; i < n; i++) {
    if (i < n * .72) {
      const s = Math.random() * (sEnd + 24); bandPt(s, p); outward(s, o); const off = gauss() * 7, h = gauss() * 2.6;
      P[i * 3] = p.x + o.x * off + (Math.random() - .5) * 2; P[i * 3 + 1] = p.y + h; P[i * 3 + 2] = p.z + o.z * off + (Math.random() - .5) * 2;
      Z[i] = .25 + Math.random() * Math.random() * 1.1;
    } else {
      const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * R;
      P[i * 3] = Math.cos(a) * r; P[i * 3 + 1] = gauss() * 4 * (1 - r / R * .5); P[i * 3 + 2] = Math.sin(a) * r;
      Z[i] = .3 + Math.random() * .6;
    }
    setCol(C, i, PAL_N[(Math.random() * PAL_N.length) | 0], .55 + Math.random() * .45);
  }
  dust.frustumCulled = false; scene.add(dust); applyThemeMats();
}

// ---------- Nhãn chữ (sprite) ----------
function labelTex(lines, opt = {}) {
  const dawn = S.theme === 'dawn';
  const pad = 30, c = document.createElement('canvas'), x = c.getContext('2d');
  const fonts = lines.map(l => `${l.w || 700} ${l.size}px Quicksand, sans-serif`);
  let W = 0, H = pad * 2;
  lines.forEach((l, i) => { x.font = fonts[i]; W = Math.max(W, x.measureText(l.t).width); H += l.size * 1.22; });
  c.width = Math.ceil(W + pad * 2); c.height = Math.ceil(H);
  let y = pad;
  lines.forEach((l, i) => {
    x.font = fonts[i]; x.textAlign = 'center'; x.textBaseline = 'top'; const cx = c.width / 2;
    if (dawn) { x.lineJoin = 'round'; x.strokeStyle = 'rgba(255,255,255,.95)'; x.lineWidth = l.size * .2; x.strokeText(l.t, cx, y + l.size * .08); x.shadowColor = 'rgba(255,255,255,.9)'; x.shadowBlur = 16; }
    else { x.shadowColor = l.glow || 'rgba(255,160,200,.9)'; x.shadowBlur = l.size * .5; }
    x.fillStyle = dawn ? (l.dc || '#8d3a66') : (l.c || '#fff');
    x.fillText(l.t, cx, y + l.size * .08); x.shadowBlur = 0;
    y += l.size * 1.22;
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO;
  return { t, a: c.width / c.height };
}
const labels = [];
function makeLabel(lines, h) {
  const { t, a } = labelTex(lines);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  sp.scale.set(h * a, h, 1); sp.userData.lines = lines; sp.userData.h = h; sp.renderOrder = 5;
  labels.push(sp); return sp;
}
function refreshLabels() {
  for (const sp of labels) { const { t, a } = labelTex(sp.userData.lines); sp.material.map.dispose(); sp.material.map = t; sp.scale.set(sp.userData.h * a, sp.userData.h, 1); }
}

// ---------- Tấm ảnh polaroid ----------
const CW = 3, CARD_W = MOBILE ? 352 : 512, CARD_H = Math.round(CARD_W * 680 / 512), CH = CW * 680 / 512;
const cardGeo = new THREE.PlaneGeometry(CW, CH);
{ const uv = cardGeo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i)); } // texture flipY=false
const TAPES = ['#ffb7d2', '#bfe8d8', '#ffe39a', '#cfc2ff', '#ffc9a8'];
function rr(x, X, Y, W, H, R) { x.beginPath(); x.moveTo(X + R, Y); x.arcTo(X + W, Y, X + W, Y + H, R); x.arcTo(X + W, Y + H, X, Y + H, R); x.arcTo(X, Y + H, X, Y, R); x.arcTo(X, Y, X + W, Y, R); x.closePath(); }
function fitFont(x, s, max, w, size, min) { for (let z = size; z >= min; z -= 1) { x.font = `${w} ${z}px Quicksand, sans-serif`; if (x.measureText(s).width <= max) return s; } return fitText(x, s, max); }
function fitText(x, s, max) { if (x.measureText(s).width <= max) return s; while (s.length > 1 && x.measureText(s + '…').width > max) s = s.slice(0, -1); return s.trimEnd() + '…'; }
const cardCanvas = document.createElement('canvas'); cardCanvas.width = CARD_W; cardCanvas.height = CARD_H;
const cctx = cardCanvas.getContext('2d');
function heart(x, cx, cy, r, col) { x.save(); x.fillStyle = col; x.beginPath(); x.moveTo(cx, cy + r * .9); x.bezierCurveTo(cx - r * 1.6, cy - r * .1, cx - r * .7, cy - r * 1.3, cx, cy - r * .45); x.bezierCurveTo(cx + r * .7, cy - r * 1.3, cx + r * 1.6, cy - r * .1, cx, cy + r * .9); x.fill(); x.restore(); }
function cardText(m) {
  const age = ageText(S.kid, m.ts);
  const dd = m.approx ? approxLabel(m.approx, m.ts) : dmy(m.ts); return m.title ? [m.title, `${dd} · ${age}`] : [dd, age];
}
function drawCard(m, img, i) {
  const x = cctx; x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, CARD_W, CARD_H); x.scale(CARD_W / 512, CARD_W / 512);
  // khung
  const g = x.createLinearGradient(0, 24, 0, 672); g.addColorStop(0, '#fffdf8'); g.addColorStop(1, '#fff1e4');
  rr(x, 8, 24, 496, 648, 30); x.fillStyle = g; x.fill(); x.lineWidth = 3; x.strokeStyle = 'rgba(214,160,180,.45)'; x.stroke();
  // ảnh
  x.save(); rr(x, 32, 48, 448, 448, 18); x.clip();
  if (img) {
    const iw = img.width, ih = img.height, k = Math.max(448 / iw, 448 / ih), w = iw * k, h = ih * k;
    x.drawImage(img, 32 + (448 - w) / 2, 48 + (448 - h) * (ih > iw ? .3 : .5), w, h);
  } else { const g2 = x.createLinearGradient(32, 48, 480, 496); g2.addColorStop(0, '#ffd3e6'); g2.addColorStop(1, '#ffe7bd'); x.fillStyle = g2; x.fillRect(32, 48, 448, 448); }
  const sh = x.createLinearGradient(0, 400, 0, 496); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(60,20,40,.18)'); x.fillStyle = sh; x.fillRect(32, 400, 448, 96);
  x.restore();
  if (m) {
    if (m.type === 'video') {
      x.fillStyle = 'rgba(30,10,40,.42)'; x.beginPath(); x.arc(256, 272, 50, 0, 7); x.fill();
      x.lineWidth = 4; x.strokeStyle = 'rgba(255,255,255,.85)'; x.stroke();
      x.fillStyle = '#fff'; x.beginPath(); x.moveTo(240, 246); x.lineTo(240, 298); x.lineTo(284, 272); x.closePath(); x.fill();
      x.font = '700 26px Quicksand, sans-serif'; const tt = '▶ ' + fmtDur(m.dur), tw = x.measureText(tt).width;
      rr(x, 466 - tw - 22, 452, tw + 22, 36, 18); x.fillStyle = 'rgba(30,10,40,.6)'; x.fill(); x.fillStyle = '#fff'; x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillText(tt, 466 - tw - 11, 471);
    }
    const [t1, t2] = cardText(m);
    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    x.fillStyle = '#5a2747'; x.fillText(fitFont(x, t1, 440, 700, 37, 28), 256, 560);
    x.fillStyle = '#c4577f'; x.fillText(fitFont(x, t2, 452, 700, 25, 19), 256, 612);
    heart(x, 470, 644, 11, '#ff9cc2');
  } else {
    x.fillStyle = 'rgba(200,140,170,.25)'; rr(x, 126, 528, 260, 30, 15); x.fill(); rr(x, 176, 584, 160, 22, 11); x.fill();
  }
  // băng dính washi
  x.save(); x.translate(256, 30); x.rotate(((i * 37) % 9 - 4) * .018); rr(x, -78, -22, 156, 46, 6);
  x.fillStyle = TAPES[(i < 0 ? 0 : i) % TAPES.length]; x.fill(); x.clip();
  x.fillStyle = 'rgba(255,255,255,.35)'; for (let k = -90; k < 90; k += 22) { x.beginPath(); x.moveTo(k, -24); x.lineTo(k + 10, -24); x.lineTo(k + 30, 26); x.lineTo(k + 20, 26); x.fill(); }
  x.restore();
}
async function cardBitmap() {
  if (window.createImageBitmap) { try { return await createImageBitmap(cardCanvas); } catch (e) { } }
  const c = document.createElement('canvas'); c.width = CARD_W; c.height = CARD_H; c.getContext('2d').drawImage(cardCanvas, 0, 0); return c;
}
function mkTex(img) {
  const t = new THREE.Texture(img); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  if (img.close) t.onUpdate = () => { try { img.close(); } catch (e) { } t.onUpdate = null; };
  return t;
}
let placeholderTex = null;
async function makePlaceholder() { drawCard(null, null, 0); placeholderTex = mkTex(await cardBitmap()); }

// ---------- Dựng dải ngân hà cho bé hiện tại ----------
const G = { group: new THREE.Group(), items: [], cards: [], stops: [], gates: [], star: null, portal: null, sEnd: 30, glow: null, lines: null, hits: [] };
scene.add(G.group);
const STEP = 7.2, SIDE = 3.5, CARD_Y = 3.7;
function clearGalaxy() {
  for (const c of G.cards) { c.mesh.material.dispose(); if (c.tex) c.tex.dispose(); stopCardVideo(c); }
  G.group.traverse(o => { if (o.geometry && o.geometry !== cardGeo) o.geometry.dispose(); if (o.material && !o.material.userData?.keep) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(mm => { mm.userData.dead = true; if (mm.map && mm.map !== placeholderTex && !Object.values(TX).includes(mm.map)) mm.map.dispose(); mm.dispose(); }); } });
  for (let i = ptMats.length - 1; i >= 0; i--) if (ptMats[i].userData.dead) ptMats.splice(i, 1);
  G.group.clear(); labels.length = 0;
  G.items = []; G.cards = []; G.stops = []; G.gates = []; G.hits = []; G.star = G.portal = null;
}
// ngôi sao mở đầu dải: ngày chào đời (Tôi, con cháu) hoặc ngày người thân bước vào đời bạn
function starInfo(k = S.kid) { if (k?.birthApprox) return { t: `Năm ${whoOf(k)} chào đời`, d: k.birth, y: true }; if (!k || isMe(k) || isChild(k)) return { t: `Ngày ${whoOf(k)} chào đời`, d: k?.birth }; const a = anchorOf(k, ME()); return { t: a ? `${cap(k.name)} bước vào đời bạn` : `Hành trình cùng ${cap(k.name)}`, d: a }; }
function gateSub(year, age) {
  if (LIFE()) { const ch = (S.chapters || []).find(c => new Date(c.ts).getFullYear() === year); if (ch) return `${ch.ic} Chương ${ch.num} · ${ch.title}`; }
  const k = S.kid; return k?.birth && showsAge(k) && age >= 1 ? `${WhoOf(k)} tròn ${age} tuổi` : '';
}
function layout() {
  const kid = S.kid, ms = S.moments.slice().sort((a, b) => a.ts - b.ts || (a.created || 0) - (b.created || 0)), anc = starInfo(kid).d;
  const b0 = anc ? dayStart(parseYmd(anc)) : ms.length ? dayStart(ms[0].ts) : dayStart(Date.now()), by = new Date(b0).getFullYear(), birthY = kid.birth ? +kid.birth.slice(0, 4) : null;
  S.moments = ms;
  const items = []; let s = 7, k = 0, prevY = by;
  const pre = ms.filter(m => dayStart(m.ts) < b0), post = ms.filter(m => dayStart(m.ts) >= b0);
  for (const m of pre) { items.push({ kind: 'm', m, s, side: k++ % 2 ? -1 : 1 }); s += STEP; }
  if (pre.length) s += 3;
  items.push({ kind: 'star', s }); s += 11;
  for (const m of post) {
    const y = new Date(m.ts).getFullYear();
    if (y !== prevY) { s += 2; items.push({ kind: 'gate', s, year: y, age: birthY ? y - birthY : 0 }); s += 9; prevY = y; }
    items.push({ kind: 'm', m, s, side: k++ % 2 ? -1 : 1 }); s += STEP;
  }
  s += 5; items.push({ kind: 'portal', s });
  return items;
}
function buildGalaxy() {
  clearGalaxy();
  if (!S.kid) return;
  const items = layout(); G.items = items;
  G.sEnd = items[items.length - 1].s;
  spiralTo(G.sEnd + 60);
  buildBand(G.sEnd); buildDust(G.sEnd); placeClouds(radiusAt(G.sEnd));
  const p = new V3(), o = new V3();
  let mi = 0;
  for (const it of items) {
    bandPt(it.s, p); outward(it.s, o);
    if (it.kind === 'm') {
      const mat = new THREE.MeshBasicMaterial({ map: placeholderTex, alphaTest: .5, color: new THREE.Color('#fff').lerp(new THREE.Color(it.m.color || '#ffd0e0'), .8) });
      const mesh = new THREE.Mesh(cardGeo, mat);
      const base = p.clone().addScaledVector(o, SIDE * it.side).add(new V3(0, CARD_Y, 0));
      mesh.position.copy(base); mesh.rotation.order = 'YXZ';
      const c = { i: mi, m: it.m, s: it.s, side: it.side, mesh, base, node: p.clone(), tex: null, loading: false, want: false, yaw: 0, pitch: 0, tx: 0, ty: 0, hs: 1, pop: -1, phase: Math.random() * 6.28, vid: null, sc: 1 };
      mesh.userData.card = c; it.card = c; G.cards.push(c); G.hits.push(mesh); G.group.add(mesh); mi++;
      G.stops.push({ s: it.s, card: c, kind: 'm' });
    } else if (it.kind === 'star') { buildStar(it, p); G.stops.push({ s: it.s, kind: 'star', it }); }
    else if (it.kind === 'gate') buildGate(it, p);
    else if (it.kind === 'portal') { buildPortal(it, p); G.stops.push({ s: it.s, kind: 'portal', it }); }
  }
  // quầng sáng sau ảnh + nút sáng trên dải
  const n = G.cards.length;
  if (n) {
    const gl = new THREE.Points(ptGeo(n * 2), ptMat({ atten: 1, shape: 0, opacity: .55, tw: .25 }));
    gl.material.userData.glow = true;
    const C = gl.geometry.attributes.color.array, Z = gl.geometry.attributes.size.array, P = gl.geometry.attributes.position.array;
    G.cards.forEach((c, i) => {
      const col = new THREE.Color(c.m.color || '#ff9cc6').convertLinearToSRGB().lerp(new THREE.Color(1, .62, .82), .55);
      setCol(C, i, col); Z[i] = 9.5;
      setCol(C, n + i, new THREE.Color(1, .9, .75)); Z[n + i] = 1.9;
      P.set([c.node.x, c.node.y + .05, c.node.z], (n + i) * 3);
    });
    gl.frustumCulled = false; G.glow = gl; G.group.add(gl);
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3));
    const lc = new Float32Array(n * 6); for (let i = 0; i < n; i++) lc.set([1, .85, .6, 1, .55, .8], i * 6);
    lg.setAttribute('color', new THREE.BufferAttribute(lc, 3));
    G.lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
    G.lines.frustumCulled = false; G.group.add(G.lines);
  }
  buildBooks();
  buildSparks();
  if (LIFE()) buildBranches();
  applyThemeMats();
  S.cur = -1; Stream.reset();
}
// ---------- Nhánh người thân (hành trình cả đời): mỗi người một dải sao màu riêng, chạy song song từ ngày bước vào đời bạn ----------
function buildBranches() {
  const me = ME(), ppl = sortPeople(S.kids).filter(k => !isMe(k)).slice(0, 12), ms = G.cards; if (!me || !ppl.length || !ms.length) return;
  const sAt = ts => { const c = ms.find(x => x.m.ts >= ts); return c ? c.s - 3 : null; }, s0 = G.stops.find(x => x.kind === 'star')?.s ?? ms[0].s;
  const p = new V3(), o = new V3();
  ppl.forEach((k, i) => {
    const anc = sinceOf(k, me), t = anc ? dayStart(parseYmd(anc)) : null; let sa = t == null ? null : t <= dayStart(parseYmd(me.birth)) ? s0 : sAt(t);
    if (sa == null) return; const sb = G.sEnd, len = sb - sa; if (len < 4) return;
    const n = Math.min(900, Math.max(12, Math.round(len / 1.1))), pts = new THREE.Points(ptGeo(n), ptMat({ atten: 1, shape: 0, tw: .5, opacity: .9 }));
    const P = pts.geometry.attributes.position.array, C = pts.geometry.attributes.color.array, Z = pts.geometry.attributes.size.array, col = new THREE.Color(k.color || '#ff8fbf').convertLinearToSRGB();
    const side = i % 2 ? -1 : 1, off = 1.5 + Math.floor(i / 2) * .75, dy = -.7 - (i % 3) * .35;
    for (let j = 0; j < n; j++) { const sj = sa + (len * j) / (n - 1); bandPt(sj, p); outward(sj, o); const w = Math.sin(sj * .35 + i) * .25; p.addScaledVector(o, side * (off + w)); P.set([p.x, p.y + dy + Math.sin(sj * .5 + i * 2) * .15, p.z], j * 3); setCol(C, j, col); Z[j] = j < 6 ? 1.4 - j * .12 : .55 + Math.random() * .3; }
    pts.frustumCulled = false; G.group.add(pts);
    bandPt(sa, p); outward(sa, o); p.addScaledVector(o, side * off);
    const lab = makeLabel([{ t: cap(k.name), size: 54, c: '#fff', dc: '#4a2a5e', glow: k.color }, { t: isChild(k) ? 'chào đời' : 'bước vào đời bạn', size: 36, c: '#ffe3f0', dc: '#7a3d63' }], 1.5);
    lab.position.set(p.x, p.y + 2.3, p.z); G.group.add(lab);
  });
}
// ---------- Quyển sách nhỏ (nhật ký truyện tranh) cạnh dải sáng ----------
function buildBooks() {
  G.books = [];
  const byMid = new Map(G.cards.map(c => [c.m.id, c]));
  for (const d of S.diaries || []) {
    const cs = d.pages.flatMap(p => p.panels.map(q => byMid.get(q.mid))).filter(Boolean).sort((a, b) => a.i - b.i);
    if (!cs.length) continue;
    const card = cs[0], s = card.s + 2.4, side = -card.side, p = bandPt(s), o = outward(s);
    const g = new THREE.Group(); g.position.copy(p).addScaledVector(o, side * 2.1).add(new V3(0, 1.25, 0));
    const cream = new THREE.MeshBasicMaterial({ color: '#fff6e8' }), cover = new THREE.MeshBasicMaterial({ color: '#ffd9ea' }), spine = new THREE.MeshBasicMaterial({ color: '#ff7eb3' });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2.15, 3.04, .42), [cream, spine, cream, cream, cover, spine]);
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(.16, .7, .38), new THREE.MeshBasicMaterial({ color: '#ffd27f' })); ribbon.position.set(.68, -1.66, 0);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.glow, color: '#ffc8e6', transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.setScalar(6.6); halo.position.z = -.4;
    const n = 12, pts = new THREE.Points(ptGeo(n), ptMat({ atten: 1, shape: 2, tw: 1, opacity: 1 }));
    const P = pts.geometry.attributes.position.array, C = pts.geometry.attributes.color.array, Z = pts.geometry.attributes.size.array;
    for (let i = 0; i < n; i++) { const a = i / n * 6.283 + Math.random() * .4, r = 1.9 + Math.random() * .7; P.set([Math.cos(a) * r, Math.sin(a) * r * 1.2, (Math.random() - .5) * .8], i * 3); setCol(C, i, PAL_N[i % 2 ? 1 : 3]); Z[i] = .35 + Math.random() * .45; }
    const spin = new THREE.Group(); spin.add(halo, mesh, ribbon); g.add(spin, pts);
    const lab = makeLabel([{ t: 'Nhật ký · ' + dmy(d.ts).slice(0, 5), size: 46, c: '#fff', dc: '#8d3a66' }], .62); lab.position.set(0, -2.35, 0); lab.material.depthTest = false; lab.renderOrder = 12; g.add(lab);
    mesh.userData.book = d.id; G.hits.push(mesh); G.group.add(g);
    const b = { d, s, g, spin, mesh, lab, card, yaw: 0, phase: Math.random() * 6, pop: 0 }; G.books.push(b);
    dbGet('blobs', 'd_' + d.id).then(bl => { if (!bl) return; const u = URL.createObjectURL(bl); loadImg(u).then(im => { const t = new THREE.Texture(im); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAX_ANISO; t.needsUpdate = true; if (G.books.includes(b)) { cover.map = t; cover.color.set('#fff'); cover.needsUpdate = true; } else t.dispose(); URL.revokeObjectURL(u); }).catch(() => URL.revokeObjectURL(u)); });
  }
}
function updateBooks(dt) {
  const cp = camera.position, t = S.time;
  for (const b of G.books || []) {
    const g = b.g, want = Math.atan2(cp.x - g.position.x, cp.z - g.position.z);
    let dy = want - b.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); b.yaw += dy * damp(4, dt);
    b.spin.rotation.set(Math.sin(t * .7 + b.phase) * .08, b.yaw + Math.sin(t * .5 + b.phase) * .22, Math.sin(t * .9 + b.phase) * .06);
    b.spin.position.y = Math.sin(t * 1.1 + b.phase) * .2;
    if (b.pop > 0) { b.pop = Math.max(0, b.pop - dt * .9); b.spin.scale.setScalar(1 + Math.sin(b.pop * Math.PI) * .45); }
    const hv = hover.book === b; b.spin.scale.multiplyScalar(1); if (!b.pop) b.spin.scale.setScalar(hv ? 1.12 : 1);
    b.lab.material.opacity = labFade(b.s, 40, 18);
  }
}
async function openBook(id) {
  const b = (G.books || []).find(x => x.d.id === id); if (!b) { D.openViewer(id); return; }
  closeLBNow(); leaveIntro(true); hover.c = null;
  FO = { pos: new V3(), look: new V3() }; FO.look.copy(b.g.position);
  tmpA.subVectors(cam.pos, b.g.position); tmpA.y = 0; tmpA.normalize(); tmpA.y = .25; tmpA.normalize();
  FO.pos.copy(b.g.position).addScaledVector(tmpA, portrait() ? 7.5 : 6); S.mode = 'focus'; cam.k = 2.6; S.bookS = b.s;
  setTimeout(() => D.openViewer(id, { onClose: () => { if (S.mode === 'focus' && S.lbIdx < 0) setMode('fly', b.card.s); } }), 650);
}
// đốm sáng chạy dọc dải
let sparks = null;
function buildSparks() {
  const n = MOBILE ? 90 : 170;
  sparks = new THREE.Points(ptGeo(n), ptMat({ atten: 1, shape: 0, opacity: 1, tw: .3 }));
  const C = sparks.geometry.attributes.color.array, Z = sparks.geometry.attributes.size.array;
  sparks.userData.s = Float32Array.from({ length: n }, () => Math.random() * (G.sEnd + 10));
  sparks.userData.v = Float32Array.from({ length: n }, () => 2 + Math.random() * 5);
  sparks.userData.o = Float32Array.from({ length: n }, () => (Math.random() - .5) * 1.6);
  for (let i = 0; i < n; i++) { setCol(C, i, PAL_N[(Math.random() * 3) | 0]); Z[i] = .5 + Math.random() * .9; }
  sparks.frustumCulled = false; G.group.add(sparks);
}
function buildStar(it, p) {
  const g = new THREE.Group(); g.position.copy(p).add(new V3(0, 3.6, 0));
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .75 : 1.75; const X = Math.cos(a) * r, Y = Math.sin(a) * r; i ? sh.lineTo(X, Y) : sh.moveTo(X, Y); }
  const geo = new THREE.ExtrudeGeometry(sh, { depth: .38, bevelEnabled: true, bevelThickness: .14, bevelSize: .12, bevelSegments: 2 }); geo.center();
  const mesh = new THREE.Mesh(geo, [new THREE.MeshBasicMaterial({ color: '#ffe48f' }), new THREE.MeshBasicMaterial({ color: '#ffb057' })]);
  const rays = new THREE.Mesh(new THREE.PlaneGeometry(11, 11), new THREE.MeshBasicMaterial({ map: TX.rays, transparent: true, opacity: .4, blending: THREE.AdditiveBlending, depthWrite: false }));
  rays.position.z = -.4;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.glow, color: '#ffd38a', transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.setScalar(11);
  const spin = new THREE.Group(); spin.add(rays, mesh); g.add(halo, spin);
  const SI = starInfo(), lab = makeLabel([{ t: SI.t, size: 64, c: '#fff3c4', dc: '#a8481c', glow: 'rgba(255,190,90,.95)' }, { t: SI.d ? (SI.y ? SI.d.slice(0, 4) : dmy(parseYmd(SI.d))) : '', size: 44, w: 700, c: '#ffd0e4', dc: '#c4577f' }], 2.4);
  lab.position.set(0, 5.6, 0); g.add(lab);
  { const av = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false })); av.scale.setScalar(3.2); av.position.set(0, 3.1, .2); av.renderOrder = 6; g.add(av); G.star && 0;
    const k = S.kid, col = k.color || '#ff8fbf'; const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.shadowColor = col; x.shadowBlur = 26; x.fillStyle = col; x.beginPath(); x.arc(128, 128, 108, 0, 7); x.fill(); x.shadowBlur = 0; x.save(); x.beginPath(); x.arc(128, 128, 98, 0, 7); x.clip(); x.drawImage(im, 30, 30, 196, 196); x.restore(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; av.material.map = t; av.material.needsUpdate = true; }; im.src = P.avatarNow(k); }
  const hit = new THREE.Mesh(new THREE.SphereGeometry(2.6, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); hit.userData.star = it; g.add(hit); G.hits.push(hit);
  G.group.add(g); G.star = { it, g, spin, halo, mesh, lab };
}
function buildGate(it, p) {
  const g = new THREE.Group(); g.position.copy(p).add(new V3(0, 1.2, 0));
  const t = bandTan(it.s); g.lookAt(g.position.clone().add(t));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(5.2, .16, 10, 96), new THREE.MeshBasicMaterial({ color: '#ffd27f' }));
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(13.5, 13.5), new THREE.MeshBasicMaterial({ map: TX.ring, transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  const n = 48, pts = new THREE.Points(ptGeo(n), ptMat({ atten: 1, shape: 2, tw: 1, opacity: 1 }));
  const P = pts.geometry.attributes.position.array, C = pts.geometry.attributes.color.array, Z = pts.geometry.attributes.size.array;
  for (let i = 0; i < n; i++) { const a = i / n * 6.283; P.set([Math.cos(a) * 5.2, Math.sin(a) * 5.2, 0], i * 3); setCol(C, i, PAL_N[i % 2 ? 1 : 3]); Z[i] = .8 + Math.random() * 1.2; }
  g.add(glow, ring, pts); G.group.add(g);
  const lab = makeLabel([{ t: String(it.year), size: 120, c: '#ffe7a8', dc: '#c25a1c', glow: 'rgba(255,180,90,.95)' }, { t: gateSub(it.year, it.age) || `Năm ${it.year}`, size: 46, c: '#ffd0e4', dc: '#a8406e' }], 3.4);
  lab.position.copy(p).add(new V3(0, 1.2 + 5.2 + 2.6, 0)); G.group.add(lab);
  const gate = { it, g, ring, glow, pts, lab, flash: 0, passed: false }; G.gates.push(gate); it.gate = gate;
}
function buildPortal(it, p) {
  const g = new THREE.Group(); g.position.copy(p).add(new V3(0, 2.4, 0));
  const t = bandTan(it.s); g.lookAt(g.position.clone().add(t));
  const n = MOBILE ? 140 : 240, pts = new THREE.Points(ptGeo(n), ptMat({ atten: 1, shape: 0, tw: .6, opacity: 1 }));
  const P = pts.geometry.attributes.position.array, C = pts.geometry.attributes.color.array, Z = pts.geometry.attributes.size.array;
  pts.userData.a = Float32Array.from({ length: n }, () => Math.random() * 6.283);
  pts.userData.r = Float32Array.from({ length: n }, () => 1.2 + Math.pow(Math.random(), .6) * 3.4);
  for (let i = 0; i < n; i++) { setCol(C, i, PAL_N[(Math.random() * 3) | 0]); Z[i] = .4 + Math.random() * 1.1; }
  const disc = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.glow, color: '#ffc4e0', transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false })); disc.scale.setScalar(9);
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(11, 11), new THREE.MeshBasicMaterial({ map: TX.ring, color: '#ffb8de', transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  g.add(disc, ring, pts); G.group.add(g);
  const lab = makeLabel([{ t: 'Khoảnh khắc tiếp theo…', size: 60, c: '#fff', dc: '#8d3a66' }, { t: '➕ Chạm để thêm ảnh, video', size: 40, c: '#ffd0e4', dc: '#c4577f' }], 2.2);
  lab.position.copy(p).add(new V3(0, 2.4 + 5.6, 0)); G.group.add(lab);
  const hit = new THREE.Mesh(new THREE.SphereGeometry(4.5, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); hit.userData.portal = it; g.add(hit); G.hits.push(hit);
  G.portal = { it, g, pts, disc, ring, lab };
}

// ---------- Nạp texture theo khoảng cách ----------
const Stream = (() => {
  const BUDGET = MOBILE ? 70 : 160;
  let t = 0, active = 0; const queue = [];
  const gen = { v: 0 };
  async function load(c) {
    c.loading = true; active++; const g = gen.v;
    try {
      const blob = await dbGet('blobs', 't_' + c.m.id);
      let img = null;
      if (blob) { try { img = window.createImageBitmap ? await createImageBitmap(blob) : await loadImg(URL.createObjectURL(blob)); } catch (e) { img = null; } }
      if (g !== gen.v || !c.want) { img?.close?.(); return; }
      drawCard(c.m, img, c.i); img?.close?.();
      const tex = mkTex(await cardBitmap());
      if (g !== gen.v || !c.want) { tex.dispose(); return; }
      if (c.tex) c.tex.dispose();
      c.tex = tex; c.mesh.material.map = tex; c.mesh.material.color.set('#ffffff'); c.mesh.material.needsUpdate = true;
    } catch (e) { console.warn(e); }
    finally { c.loading = false; active--; }
  }
  function drop(c) { if (!c.tex) return; c.mesh.material.map = placeholderTex; c.mesh.material.color.set(new THREE.Color('#fff').lerp(new THREE.Color(c.m.color || '#ffd0e0'), .8)); c.tex.dispose(); c.tex = null; }
  return {
    reset() { gen.v++; queue.length = 0; t = 1; },
    refresh(c) { if (c.tex) { c.tex.dispose(); c.tex = null; c.mesh.material.map = placeholderTex; } c.want = true; queue.unshift(c); },
    update(dt, cam) {
      t += dt;
      if (t > .3) {
        t = 0; const cs = G.cards; if (!cs.length) return;
        const pri = S.lbIdx >= 0 ? S.lbIdx : -1;
        const arr = cs.map(c => [c.mesh.position.distanceToSquared(cam) * (c.i === pri ? 0 : 1), c]).sort((a, b) => a[0] - b[0]);
        queue.length = 0;
        arr.forEach(([d, c], r) => {
          c.want = r < BUDGET;
          if (c.want && !c.tex && !c.loading) queue.push(c);
          if (!c.want && c.tex && r > BUDGET * 1.15) drop(c);
        });
      }
      while (active < 2 && queue.length) { const c = queue.shift(); if (!c.tex && !c.loading && c.want) load(c); }
    },
    get loaded() { return G.cards.filter(c => c.tex).length; },
    BUDGET
  };
})();

// ---------- Video phát ngay trên tấm ảnh ----------
function startCardVideo(c, opt = {}) {
  if (c.vid || c.m.type !== 'video') return c.vid;
  const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.loop = !!opt.loop; v.setAttribute('playsinline', ''); v.preload = 'auto';
  const st = { v, url: null, mesh: null, ok: false };
  c.vid = st;
  dbGet('blobs', 'o_' + c.m.id).then(b => {
    if (c.vid !== st || !b) return;
    st.url = URL.createObjectURL(b); v.src = st.url;
    v.onloadeddata = () => {
      if (c.vid !== st) return;
      const tex = new THREE.VideoTexture(v); tex.colorSpace = THREE.SRGBColorSpace;
      const a = (v.videoWidth || 1) / (v.videoHeight || 1);
      if (a > 1) { tex.repeat.set(1 / a, 1); tex.offset.set((1 - 1 / a) / 2, 0); } else { tex.repeat.set(1, a); tex.offset.set(0, (1 - a) * .6); }
      const m = new THREE.Mesh(new THREE.PlaneGeometry(CW * 448 / 512, CH * 448 / 680), new THREE.MeshBasicMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -2 }));
      m.position.set(0, CH * (.5 - 272 / 680), .01); c.mesh.add(m); st.mesh = m; st.ok = true;
    };
    v.play().catch(() => { });
  });
  return st;
}
function stopCardVideo(c) {
  const st = c.vid; if (!st) return; c.vid = null;
  try { st.v.pause(); } catch (e) { }
  st.v.removeAttribute('src'); st.v.load();
  if (st.url) URL.revokeObjectURL(st.url);
  if (st.mesh) { c.mesh.remove(st.mesh); st.mesh.material.map?.dispose(); st.mesh.material.dispose(); st.mesh.geometry.dispose(); }
}

// ---------- Pháo sáng ----------
const Burst = (() => {
  const N = 700, pts = new THREE.Points(ptGeo(N), ptMat({ atten: 1, shape: 2, opacity: 1 }));
  const P = pts.geometry.attributes.position.array, C = pts.geometry.attributes.color.array, Z = pts.geometry.attributes.size.array;
  const vel = new Float32Array(N * 3), life = new Float32Array(N), sz = new Float32Array(N); let head = 0;
  pts.frustumCulled = false; scene.add(pts);
  return {
    fire(pos, n = 60, spd = 7) {
      for (let k = 0; k < n; k++) {
        const i = head; head = (head + 1) % N;
        const u = Math.random() * 2 - 1, a = Math.random() * 6.283, r = Math.sqrt(1 - u * u), v = spd * (.4 + Math.random() * .8);
        P.set([pos.x, pos.y, pos.z], i * 3); vel.set([r * Math.cos(a) * v, u * v + 2.5, r * Math.sin(a) * v], i * 3);
        life[i] = 1; sz[i] = .5 + Math.random() * 1.1; setCol(C, i, (S.theme === 'dawn' ? PAL_D : PAL_N)[(Math.random() * 4) | 0]);
      }
    },
    update(dt) {
      let any = false;
      for (let i = 0; i < N; i++) {
        if (life[i] <= 0) { Z[i] = 0; continue; }
        any = true; life[i] -= dt * .75;
        vel[i * 3 + 1] -= 6 * dt; const f = Math.exp(-1.6 * dt); vel[i * 3] *= f; vel[i * 3 + 1] *= f; vel[i * 3 + 2] *= f;
        P[i * 3] += vel[i * 3] * dt; P[i * 3 + 1] += vel[i * 3 + 1] * dt; P[i * 3 + 2] += vel[i * 3 + 2] * dt;
        Z[i] = sz[i] * Math.max(0, life[i]) * 1.4;
      }
      if (any || this.was) { pts.geometry.attributes.position.needsUpdate = true; pts.geometry.attributes.size.needsUpdate = true; pts.geometry.attributes.color.needsUpdate = true; }
      this.was = any;
    }, was: false
  };
})();

// ---------- Phong cách ----------
function applyThemeMats() {
  const m = S.mix, dawn = m > .5, vis = Math.abs(m * 2 - 1); // giữa chừng mờ hẳn để đổi kiểu hoà màu không bị giật
  sky.material.uniforms.uMix.value = m;
  for (const mt of ptMats) {
    const th = mt.userData.themed;
    let op = mt.userData.base;
    if (th === 'night') op *= 1 - m; else if (th === 'dawn') op *= m;
    else { op *= .35 + .65 * vis; if (!mt.userData.fixedBlend) { const want = dawn ? THREE.NormalBlending : THREE.AdditiveBlending; if (mt.blending !== want) { mt.blending = want; mt.needsUpdate = true; } } if (dawn && mt.userData.dust) op *= .7; if (dawn && mt.userData.glow) op *= .75; }
    mt.uniforms.uOpacity.value = op;
  }
  bandMat.uniforms.uDawn.value = m; bandMat.uniforms.uOp.value = .25 + .75 * vis;
  const wantB = dawn ? THREE.NormalBlending : THREE.AdditiveBlending; if (bandMat.blending !== wantB) { bandMat.blending = wantB; bandMat.needsUpdate = true; }
  envNight.visible = m < .999; envDawn.visible = m > .001;
  nebGroup.children.forEach(s => s.material.opacity = s.material.userData.base * (1 - m));
  clouds.forEach(s => s.material.opacity = s.material.userData.base * m);
  core.material.opacity = .9 * (1 - m * .5); core.material.blending = dawn ? THREE.NormalBlending : THREE.AdditiveBlending; core.material.color.set(dawn ? '#fff4ea' : '#ffd9ec');
  if (G.lines) { G.lines.material.blending = dawn ? THREE.NormalBlending : THREE.AdditiveBlending; G.lines.material.opacity = dawn ? .5 : .55; }
  if (dust) { const C = dust.geometry.attributes.color; if (dust.userData.dawn !== dawn) { dust.userData.dawn = dawn; const pal = dawn ? PAL_D : PAL_N; for (let i = 0; i < C.count; i++) setCol(C.array, i, pal[(i * 7) % pal.length], .7 + ((i * 13) % 10) / 33); C.needsUpdate = true; } }
  if (G.glow) { const C = G.glow.geometry.attributes.color, n = G.cards.length; if (G.glow.userData.dawn !== dawn) { G.glow.userData.dawn = dawn; G.cards.forEach((c, i) => { const col = dawn ? new THREE.Color(1, .97, .94) : new THREE.Color(c.m.color || '#ff9cc6').convertLinearToSRGB().lerp(new THREE.Color(1, .62, .82), .55); setCol(C.array, i, col); setCol(C.array, n + i, dawn ? new THREE.Color(1, .6, .4) : new THREE.Color(1, .9, .75)); }); C.needsUpdate = true; } }
  const bg = new THREE.Color('#0b0a24').lerp(new THREE.Color('#fde4d6'), m); scene.background = null;
  const flat = !!BG.flat, spk = BG.cfg ? BG.cfg.sparkle !== false : true;
  if (flat) renderer.setClearColor(0x000000, 0); else renderer.setClearColor(bg, 1);
  sky.visible = !flat; nebGroup.visible = !flat; starPts.visible = !flat; cloudGroup.visible = !flat;
  sparkStars.visible = spk; bokeh.visible = spk; petals.visible = spk && !flat; bubbles.visible = spk;
  if (flat) { envNight.visible = true; envDawn.visible = true; for (const mt of [sparkStars.material, bokeh.material, bubbles.material]) mt.uniforms.uOpacity.value = mt.userData.base * .9; }
}

// ---------- Hình nền: cảnh 3D, màu chuyển sắc, ảnh riêng ----------
const SCN = {
  night: { n: 'Đêm ngân hà', theme: 'night', sky: [[.075, .04, .17], [.018, .016, .07], [.14, .05, .2]], neb: ['#7a3cff', '#ff4fa3', '#3c6bff', '#b04cff', '#ff7a7a', '#4fb8ff', '#ff5fd0'], bok: ['#ff8fbf', '#ffd27f', '#c3b2ff', '#ffffff', '#9fd8ff', '#ffb3d6'], sw: 'radial-gradient(circle at 50% 35%,#4a2a86,#140f3a 55%,#07061a)' },
  ocean: { n: 'Biển sao xanh', theme: 'night', sky: [[.03, .1, .22], [.006, .02, .06], [.02, .17, .26]], neb: ['#1f6bff', '#19c3c9', '#3c3bff', '#2a9dff', '#5fe0d0', '#4fb8ff', '#7a8cff'], bok: ['#7fe3ff', '#bff4ff', '#8fb4ff', '#ffffff', '#5fd0c8', '#ffe2a8'], sw: 'radial-gradient(circle at 50% 30%,#1d6d9c,#062042 55%,#020814)' },
  dawn: { n: 'Bình minh', theme: 'dawn', sky: [[1, .79, .66], [1, .9, .86], [.99, .83, .92], [.97, .78, .88]], cloud: '#ffffff', sw: 'linear-gradient(180deg,#ffe3ee,#ffd9c6 55%,#ffc29c)' },
  pink: { n: 'Mây hồng', theme: 'dawn', sky: [[1, .7, .83], [1, .85, .93], [.97, .8, .98], [.98, .7, .87]], cloud: '#ffe2f0', sw: 'linear-gradient(180deg,#ffe6f3,#ffc4de 55%,#f3b2d8)' }
};
const GRADS = {
  keo: { n: 'Kẹo bông', css: 'linear-gradient(160deg,#ffd1e8,#c9d7ff 55%,#e9d4ff)', dark: false },
  hoanghon: { n: 'Hoàng hôn', css: 'linear-gradient(170deg,#2a1b5c,#a8457a 55%,#ffb36b)', dark: true },
  bacha: { n: 'Bạc hà', css: 'linear-gradient(160deg,#d8fff1,#bfe9ff 60%,#fff6d8)', dark: false },
  demtim: { n: 'Đêm tím', css: 'radial-gradient(ellipse at 30% 10%,#5b2a8c,#16123a 60%,#070615)', dark: true }
};
const TINTS = ['#ff8fbf', '#ffd27f', '#9fe1cb', '#8fb4ff', '#c3a6ff', '#000000'];
const BG_DEF = { kind: 'auto', scene: 'night', grad: 'keo', blur: 14, dim: .25, tint: .12, tintC: '#ff8fbf', sparkle: true, lum: .5 };
function recolorPts(p, pal) { const C = p.geometry.attributes.color, cols = pal.map(h => new THREE.Color(h).convertLinearToSRGB()); for (let i = 0; i < C.count; i++) setCol(C.array, i, cols[i % cols.length]); C.needsUpdate = true; }
function setScene(name) {
  const c = SCN[name], u = sky.material.uniforms; if (!c) return;
  if (c.theme === 'night') { [u.uN1, u.uN2, u.uN3].forEach((x, i) => x.value.set(...c.sky[i])); nebGroup.children.forEach((sp, i) => sp.material.color.set(c.neb[i % c.neb.length])); recolorPts(bokeh, c.bok); }
  else { [u.uD1, u.uD2, u.uD3, u.uD4].forEach((x, i) => x.value.set(...c.sky[i])); clouds.forEach(sp => sp.material.color.set(c.cloud)); }
  BG.scene = name;
}
async function bgUrl() {
  if (BG.url) return BG.url; const b = S.kid && await dbGet('blobs', 'bg_' + S.kid.id); if (!b) return null;
  BG.url = URL.createObjectURL(b); return BG.url;
}
async function loadBg() {
  if (BG.url) { URL.revokeObjectURL(BG.url); BG.url = null; }
  BG.cfg = { ...BG_DEF, ...((S.kid && await metaGet('bg:' + S.kid.id)) || {}) };
  await applyBg();
}
let bgSaveT = 0;
function saveBg() { clearTimeout(bgSaveT); bgSaveT = setTimeout(() => { if (S.kid && BG.cfg) metaSet('bg:' + S.kid.id, BG.cfg); }, 250); }
async function applyBg() {
  const c = BG.cfg; if (!c) return;
  const L = $('#bgl'), gr = L.querySelector('.gr'), im = L.querySelector('.im'), tn = L.querySelector('.tn'), dm = L.querySelector('.dm');
  const scene = c.kind === 'scene' ? c.scene : c.kind === 'auto' ? S.theme : null;
  BG.flat = !scene;
  let th = S.theme;
  if (scene) { setScene(scene); th = SCN[scene].theme; gr.style.background = 'none'; im.style.backgroundImage = 'none'; tn.style.opacity = 0; dm.style.opacity = 0; }
  else if (c.kind === 'grad') { const g = GRADS[c.grad] || GRADS.keo; gr.style.background = g.css; im.style.backgroundImage = 'none'; tn.style.opacity = 0; dm.style.opacity = 0; th = g.dark ? 'night' : 'dawn'; }
  else {
    const u = await bgUrl(); gr.style.background = '#1a1430'; im.style.backgroundImage = u ? `url("${u}")` : 'none';
    im.style.filter = c.blur > 0 ? `blur(${c.blur}px)` : 'none'; tn.style.background = c.tintC; tn.style.opacity = c.tint; dm.style.opacity = c.dim;
    th = c.dim >= .35 || (c.lum ?? .5) * (1 - c.dim) < .5 ? 'night' : 'dawn';
  }
  if (th !== S.theme) setTheme(th, true);
  applyThemeMats();
}
async function setBgImage(blob) {
  const u = URL.createObjectURL(blob);
  try {
    const im = await loadImg(u), k = Math.min(1, 2048 / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, c.width, c.height);
    const t = document.createElement('canvas'); t.width = t.height = 24; t.getContext('2d').drawImage(c, 0, 0, 24, 24);
    const d = t.getContext('2d').getImageData(0, 0, 24, 24).data; let l = 0; for (let i = 0; i < d.length; i += 4) l += (d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) / 255; l /= 576;
    const jb = await canvasToBlob(c, .9); await dbPut('blobs', jb, 'bg_' + S.kid.id);
    if (BG.url) { URL.revokeObjectURL(BG.url); BG.url = null; }
    Object.assign(BG.cfg, { kind: 'image', lum: l }); await applyBg(); saveBg(); renderBgUi(); haptic(10);
  } catch (e) { toast('Ảnh này chưa mở được (ảnh HEIC thì bạn thử mở bằng Safari nhé)', 3500); }
  finally { URL.revokeObjectURL(u); }
}
function renderBgUi() {
  const c = BG.cfg; if (!c) return; const box = $('#bgList'); if (!box) return;
  const items = [['auto', 'Theo phong cách', 'linear-gradient(135deg,#140f3a 0 50%,#ffd9c6 50%)'], ...Object.entries(SCN).map(([k, v]) => ['scene:' + k, v.n, v.sw]), ...Object.entries(GRADS).map(([k, v]) => ['grad:' + k, v.n, v.css]), ['image', 'Ảnh của bạn', BG.url ? `url('${BG.url}')` : 'linear-gradient(135deg,#ffb1d2,#ffd27f)']];
  const cur = c.kind === 'scene' ? 'scene:' + c.scene : c.kind === 'grad' ? 'grad:' + c.grad : c.kind;
  box.innerHTML = items.map(([k, n, bg]) => `<button data-bg="${k}" class="${k === cur ? 'on' : ''}"><i style="background:${bg};background-size:cover;background-position:center"></i><span>${n}</span></button>`).join('');
  $('#bgImgBox').hidden = c.kind !== 'image';
  $('#bgSpk').checked = c.sparkle !== false;
  const sl = (id, v, f) => { const el = $(id); el.value = v; el.nextElementSibling.textContent = f(v); };
  sl('#bgBlur', c.blur, v => v + 'px'); sl('#bgDim', Math.round(c.dim * 100), v => v + '%'); sl('#bgTint', Math.round(c.tint * 100), v => v + '%');
  $('#bgTintC').innerHTML = TINTS.map(t => `<i data-t="${t}" style="background:${t}" class="${t === c.tintC ? 'on' : ''}"></i>`).join('');
  $('#bgKid').textContent = S.kid ? KN() : 'bé';
}

// ---------- Máy quay ----------
const cam = { pos: new V3(0, 900, 2200), look: new V3(), tPos: new V3(0, 900, 2200), tLook: new V3(), k: 3 };
const OV = { az: .7, pol: .92, dist: 160, user: -99 };
const FL = { s: 0, tgt: 0, last: -99, bias: 0, camS: 0 };
let FO = null, tween = null;
const tmpA = new V3(), tmpB = new V3(), tmpC = new V3();
const portrait = () => camera.aspect < .9;
function fitDist() {
  const R = radiusAt(G.sEnd) + 12, f = camera.fov * Math.PI / 360;
  return clamp(R / Math.tan(f) / Math.min(1, camera.aspect) * .82, 45, 2600);
}
function overviewPose(pos, look) {
  const d = OV.dist; pos.set(Math.sin(OV.pol) * Math.cos(OV.az) * d, Math.cos(OV.pol) * d, Math.sin(OV.pol) * Math.sin(OV.az) * d); look.set(0, -2, 0);
}
function flyPose(s, pos, look, bias = 0) {
  let back = portrait() ? 13 : 10.5, up = portrait() ? 6 : 5.2;
  if (G.star) { const k = smooth(10, 0, Math.abs(s - G.star.it.s)); back += k * 8; up += k * 2.2; }
  if (G.portal) { const k = smooth(10, 0, Math.abs(s - G.portal.it.s)); back += k * 5; up += k * 1.2; }
  bandPt(s - back, pos); pos.y += up;
  bandPt(s + 2.5, look); look.y += 2.7;
  if (bias) { outward(s, tmpC); look.addScaledVector(tmpC, bias); }
}
function focusPose(c, pos, look, dist) {
  flyPose(c.s, pos, tmpB); // hướng nhìn từ phía dải sáng tới
  const C = c.base; tmpA.subVectors(pos, C); tmpA.y = 0; tmpA.normalize(); tmpA.y = .2; tmpA.normalize();
  const d = dist || (portrait() ? 8.6 : 6.4);
  pos.copy(C).addScaledVector(tmpA, d); look.copy(C);
}
function nearestStop(s) { let b = null, bd = 1e9; for (const st of G.stops) { const d = Math.abs(st.s - s); if (d < bd) { bd = d; b = st; } } return b; }
function setRenderDpr() { const want = S.mode === 'tl' ? Math.min(dpr, MOBILE ? 1 : 1.25) : dpr; if (renderer.getPixelRatio() !== want) { renderer.setPixelRatio(want); renderer.setSize(innerWidth, innerHeight, false); } }
function setMode(m, arg) {
  if (m !== 'intro') leaveIntro(true);
  const prev = S.mode; S.mode = m; setRenderDpr();
  if (m === 'tl') { cam.k = 1.4; }
  $('#bOverview').classList.toggle('on', m === 'overview');
  if (m === 'overview') {
    OV.dist = fitDist(); tmpA.copy(cam.pos); OV.az = Math.atan2(tmpA.z, tmpA.x); cam.k = 2.2; OV.user = S.time - 3;
  } else if (m === 'fly') {
    let s = arg;
    if (s == null) { const st = FL.s > 0 ? nearestStop(FL.s) : G.stops[0]; s = st ? st.s : 0; }
    FL.s = FL.tgt = s; FL.last = S.time; cam.k = prev === 'fly' ? 4.5 : 2.4;
  }
  updateNow();
}
function updateCamera(dt) {
  if (tween) {
    tween.t += dt; const p = tween.ease(clamp(tween.t / tween.dur, 0, 1));
    if (tween.live) tween.live(tween.to.pos, tween.to.look);
    cam.pos.lerpVectors(tween.from.pos, tween.to.pos, p); cam.look.lerpVectors(tween.from.look, tween.to.look, p);
    if (tween.lift) cam.pos.y += Math.sin(p * Math.PI) * tween.lift;
    cam.tPos.copy(cam.pos); cam.tLook.copy(cam.look);
    if (tween.t >= tween.dur) { const f = tween.done; tween = null; f?.(); }
  } else {
    const m = S.mode;
    if (m === 'tl') { // nền của dòng sự kiện: máy quay trôi chậm, lệch theo vị trí cuộn
      OV.az += dt * .012; const d = 128, f = S.tlScroll || 0;
      cam.tPos.set(Math.sin(1.18) * Math.cos(OV.az) * d, Math.cos(1.18) * d + 10 - f * 34, Math.sin(1.18) * Math.sin(OV.az) * d); cam.tLook.set(0, -6 - f * 26, 0);
    } else if (m === 'overview' || m === 'intro' || m === 'empty') {
      if (S.time - OV.user > 4) OV.az += dt * .045;
      overviewPose(cam.tPos, cam.tLook);
    } else if (m === 'fly') {
      const idle = S.time - FL.last;
      if (idle > .22 && !drag.on) { const st = nearestStop(FL.tgt); if (st) FL.tgt += (st.s - FL.tgt) * damp(5, dt); }
      FL.s += (FL.tgt - FL.s) * damp(4.2, dt);
      const st = nearestStop(FL.s); const want = st?.card ? st.card.side * (portrait() ? 2.6 : 1.25) : 0;
      FL.bias += (want - FL.bias) * damp(3, dt);
      flyPose(FL.s, cam.tPos, cam.tLook, FL.bias);
      cam.k = Math.min(5, cam.k + dt * 1.5);
    } else if (m === 'focus' && FO) { cam.tPos.copy(FO.pos); cam.tLook.copy(FO.look); cam.k = Math.min(3.6, cam.k + dt); }
    const k = damp(cam.k, dt);
    cam.pos.lerp(cam.tPos, k); cam.look.lerp(cam.tLook, k);
  }
  camera.position.copy(cam.pos); camera.lookAt(cam.look);
  // máy quay đang ở đoạn nào của dải → lóe cổng năm khi bay qua
  const camS = S.mode === 'fly' ? FL.s - (portrait() ? 13 : 10.5) : S.mode === 'show' ? SH.camS : null;
  if (camS != null) {
    for (const g of G.gates) { const s = g.it.s; if ((FL.camS < s && camS >= s) || (FL.camS > s && camS <= s)) { if (S.mode !== 'show') g.flash = 1; } }
    FL.camS = camS;
  }
}

// ---------- Cập nhật cảnh mỗi khung hình ----------
const hover = { c: null, u: .5, v: .5, t: 0, vidC: null };
let ovK = 0;
function updateCards(dt) {
  const t = S.time, cp = camera.position, n = G.cards.length;
  ovK += (((S.mode === 'overview' || S.mode === 'intro') ? 1 : 0) - ovK) * damp(2.5, dt);
  const refC = S.lbIdx >= 0 ? G.cards[S.lbIdx] : S.mode === 'show' ? SH.cur?.card : null;
  const refS = S.mode === 'fly' ? FL.s : S.lbIdx >= 0 ? refC?.s : S.mode === 'show' ? SH.cur?.s : null;
  const GP = G.glow?.geometry.attributes.position.array, GZ = G.glow?.geometry.attributes.size.array, LP = G.lines?.geometry.attributes.position.array;
  for (let i = 0; i < n; i++) {
    const c = G.cards[i], mesh = c.mesh, p = mesh.position;
    let sc = 1;
    if (c.pop >= 0) {
      c.pop += dt / 1.05; const q = clamp(c.pop, 0, 1);
      p.lerpVectors(c.node, c.base, easeOut(q)); sc = Math.max(.001, easeBack(q));
      if (c.pop >= 1) c.pop = -1;
    } else if (c.pop === -2) { p.copy(c.node); sc = .001; }
    else { p.copy(c.base); p.y += Math.sin(t * .8 + c.phase) * .17; }
    let dx = cp.x - p.x, dy = cp.y - p.y, dz = cp.z - p.z, dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    // tấm đã đi qua / quá sát máy quay: cúi xuống thu về dải sáng để không che tầm nhìn
    let kn = 1;
    if (refS != null && c !== refC) { const ds = c.s - refS; kn = ds < -2 ? smooth(5.5, 11, dist) : ds > 14 ? smooth(6.5, 11, dist) : smooth(2.6, 5.2, dist); }
    c.kn = (c.kn ?? 1) + (kn - (c.kn ?? 1)) * damp(7, dt);
    if (c.kn < .999) { p.lerp(c.node, (1 - c.kn) * .65); sc *= Math.max(.001, c.kn); dx = cp.x - p.x; dy = cp.y - p.y; dz = cp.z - p.z; dist = Math.sqrt(dx * dx + dy * dy + dz * dz); }
    const yaw = Math.atan2(dx, dz), pitch = clamp(Math.atan2(dy, Math.hypot(dx, dz)), -.3, .85);
    let dyaw = yaw - c.yaw; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
    const kk = damp(dist > 60 ? 10 : 5, dt); c.yaw += dyaw * kk; c.pitch += (pitch - c.pitch) * kk;
    const hv = hover.c === c;
    c.tx += ((hv ? (hover.v - .5) * .5 : 0) - c.tx) * damp(8, dt); c.ty += ((hv ? (hover.u - .5) * .55 : 0) - c.ty) * damp(8, dt);
    c.hs += ((hv ? 1.08 : 1) - c.hs) * damp(9, dt);
    const ov = 1 + ovK * clamp((dist - 40) / 90, 0, G.cards.length > 120 ? .45 : .9);
    c.sc = sc * c.hs * ov;
    mesh.rotation.y = c.yaw + c.ty; mesh.rotation.x = -c.pitch + c.tx;
    mesh.scale.setScalar(c.sc);
    if (GP) {
      const k = .45 / Math.max(dist, .01);
      GP[i * 3] = p.x - dx * k; GP[i * 3 + 1] = p.y - dy * k; GP[i * 3 + 2] = p.z - dz * k;
      GZ[i] = 9.5 * c.sc * (hv ? 1.25 : 1) * (S.lbIdx === i ? 1.3 : 1);
      LP[i * 6] = p.x; LP[i * 6 + 1] = p.y - CH * .5 * c.sc; LP[i * 6 + 2] = p.z;
      LP[i * 6 + 3] = c.node.x; LP[i * 6 + 4] = c.node.y; LP[i * 6 + 5] = c.node.z;
    }
    if (c.popFire && c.pop > .25) { c.popFire = false; Burst.fire(p, 70, 8); }
  }
  if (GP) { G.glow.geometry.attributes.position.needsUpdate = true; G.glow.geometry.attributes.size.needsUpdate = true; G.lines.geometry.attributes.position.needsUpdate = true; }
  // tấm mới thêm: bật ra khi máy quay tới gần
  for (const c of G.cards) if (c.pop === -2 && c.mesh.position.distanceTo(cp) < 46 && !tween) { c.pop = -(Math.random() * .25); c.popFire = true; }
}
function labFade(s, far, near) {
  if (S.mode === 'overview' || S.mode === 'intro' || S.mode === 'empty') return 1;
  const ref = S.mode === 'fly' ? FL.s : S.mode === 'show' ? SH.camS + 6 : S.lbIdx >= 0 ? G.cards[S.lbIdx]?.s ?? FL.s : FL.s;
  return smooth(far, near, Math.abs(s - ref));
}
function updateEnv(dt) {
  const t = S.time, cp = camera.position;
  const h = renderer.getDrawingBufferSize(tmpC).y, sc = h / (2 * Math.tan(camera.fov * Math.PI / 360));
  for (const m of ptMats) { const u = m.uniforms; u.uTime.value = t; u.uScale.value = sc; u.uPx.value = dpr; u.uCam.value.copy(cp); }
  bandMat.uniforms.uTime.value = t;
  sky.position.copy(cp); starPts.position.copy(cp); sparkStars.position.copy(cp); nebGroup.position.copy(cp);
  cloudGroup.rotation.y += dt * .004;
  core.material.rotation = t * .05;
  if (G.star) {
    const g = G.star.g; g.rotation.y = Math.atan2(cp.x - g.position.x, cp.z - g.position.z);
    G.star.spin.rotation.z = Math.sin(t * .6) * .12; G.star.spin.children[0].rotation.z = t * .15;
    G.star.halo.scale.setScalar(11 + Math.sin(t * 1.7) * 1.1); G.star.lab.material.opacity = labFade(G.star.it.s, 44, 20); G.star.mesh.position.y = Math.sin(t * 1.2) * .18;
  }
  for (const g of G.gates) {
    g.flash = Math.max(0, g.flash - dt * .8); const f = g.flash;
    g.ring.scale.setScalar(1 + f * .22 + Math.sin(t * 1.4 + g.it.s) * .015);
    g.glow.material.opacity = .55 + .2 * Math.sin(t * 2 + g.it.s) + f * .9; g.glow.scale.setScalar(1 + f * .5);
    g.ring.material.color.setRGB(1, .82 + f * .18, .5 + f * .5);
    g.ring.rotation.z = t * .1; g.lab.material.opacity = labFade(g.it.s, 46, 22) * smooth(7, 16, g.lab.position.distanceTo(cp));
  }
  if (G.portal) {
    const P = G.portal, A = P.pts.geometry.attributes.position.array, a = P.pts.userData.a, r = P.pts.userData.r;
    for (let i = 0; i < a.length; i++) { const ang = a[i] + t * (1.6 / r[i]); A[i * 3] = Math.cos(ang) * r[i]; A[i * 3 + 1] = Math.sin(ang) * r[i]; A[i * 3 + 2] = Math.sin(t * 2 + i) * .3; }
    P.pts.geometry.attributes.position.needsUpdate = true;
    P.disc.scale.setScalar(8.5 + Math.sin(t * 2.2) * 1.2);
    P.lab.material.opacity = labFade(P.it.s, 40, 18); P.ring.rotation.z = -t * .3; P.ring.scale.setScalar(1 + Math.sin(t * 1.3) * .05);
  }
  if (sparks) {
    const A = sparks.geometry.attributes.position.array, s = sparks.userData.s, v = sparks.userData.v, o = sparks.userData.o;
    for (let i = 0; i < s.length; i++) {
      s[i] += v[i] * dt; if (s[i] > G.sEnd + 4) s[i] = Math.random() * 6;
      bandPt(s[i], tmpA); outward(s[i], tmpB);
      A[i * 3] = tmpA.x + tmpB.x * o[i]; A[i * 3 + 1] = tmpA.y + .12 + Math.sin(t * 3 + i) * .08; A[i * 3 + 2] = tmpA.z + tmpB.z * o[i];
    }
    sparks.geometry.attributes.position.needsUpdate = true;
  }
  let fl = 0; for (const g of G.gates) fl = Math.max(fl, g.flash); bandMat.uniforms.uFlash.value = fl * .6;
}

// ---------- Chạm / kéo / cuộn ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pickAt(x, y) {
  ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(G.hits, false)[0];
  if (hit) return hit;
  // ảnh nhỏ ở xa: chọn tấm gần ngón tay nhất trên màn hình
  let best = null, bd = MOBILE ? 34 : 26;
  for (const c of G.cards) {
    tmpA.copy(c.mesh.position).project(camera); if (tmpA.z > 1) continue;
    const sx = (tmpA.x + 1) / 2 * innerWidth, sy = (1 - tmpA.y) / 2 * innerHeight, d = Math.hypot(sx - x, sy - y);
    if (d < bd) { bd = d; best = c; }
  }
  return best ? { object: best.mesh, uv: new THREE.Vector2(.5, .5) } : null;
}
function onTap(x, y) {
  const h = pickAt(x, y); if (!h) return;
  const u = h.object.userData;
  if (u.book) { openBook(u.book); return; }
  if (u.card && document.body.classList.contains('galaxy')) { haptic(10); exitGalaxy(u.card.m.id); return; }
  if (u.star && document.body.classList.contains('galaxy')) { const b = TL.events[TL.events.length - 1]; exitGalaxy(b?.ms[0]?.id); return; }
  if (u.card) openLB(u.card.i);
  else if (u.portal) { if (S.mode !== 'fly') setMode('fly', u.portal.s); openAdd(); }
  else if (u.star) { setMode('fly', u.star.s); }
}
const ptrs = new Map();
const drag = { on: false, moved: false, sx: 0, sy: 0, x: 0, y: 0, t0: 0, vel: 0, lt: 0, pinch: null };
canvas.addEventListener('pointerdown', e => {
  if (S.mode === 'show') { stopShow(); return; }
  if (S.mode === 'focus' || S.mode === 'boot') return;
  canvas.focus({ preventScroll: true });
  try { canvas.setPointerCapture(e.pointerId); } catch (er) { }
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 1) Object.assign(drag, { on: true, moved: false, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, t0: performance.now(), vel: 0, lt: performance.now(), pinch: null });
  else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; drag.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: OV.dist }; drag.moved = true; }
});
canvas.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId)) { if (e.pointerType === 'mouse') { hover.x = e.clientX; hover.y = e.clientY; hover.dirty = true; } return; }
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (drag.pinch && ptrs.size >= 2) {
    const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), r = drag.pinch.d / Math.max(d, 1);
    if (S.mode === 'overview' || S.mode === 'intro') { OV.dist = clamp(drag.pinch.dist * r, 25, fitDist() * 1.8); OV.user = S.time; }
    else if (S.mode === 'fly' && r > 1.35) { setMode('overview'); drag.pinch.dist = OV.dist; drag.pinch.d = d; }
    return;
  }
  if (!drag.on) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 7) drag.moved = true;
  if (!drag.moved) return;
  hover.c = null;
  if (S.mode === 'overview' || S.mode === 'intro') { OV.az += dx * .0055; OV.pol = clamp(OV.pol - dy * .004, .2, 1.42); OV.user = S.time; }
  else if (S.mode === 'fly') {
    const d = (Math.abs(dy) > Math.abs(dx) ? -dy : -dx) * (portrait() ? .075 : .05);
    FL.tgt = clamp(FL.tgt + d, G.stops[0].s - 4, G.sEnd + 2); FL.last = S.time;
    const now = performance.now(), ddt = Math.max(1, now - drag.lt); drag.vel = lerp(drag.vel, d / ddt * 1000, .35); drag.lt = now;
  }
});
function endPtr(e) {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.delete(e.pointerId);
  if (ptrs.size) return;
  const wasTap = drag.on && !drag.moved && performance.now() - drag.t0 < 600;
  if (S.mode === 'fly' && drag.moved && performance.now() - drag.lt < 120) { FL.tgt = clamp(FL.tgt + drag.vel * .22, G.stops[0].s - 4, G.sEnd + 2); FL.last = S.time; }
  drag.on = false; drag.pinch = null;
  if (wasTap) onTap(e.clientX, e.clientY);
}
canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hover.c = null; });
let wheelZoomOut = 0;
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  if (S.mode === 'show') return;
  const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1, dy = (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * k;
  if (S.mode === 'overview' || S.mode === 'intro') { OV.dist = clamp(OV.dist * Math.exp(dy * (e.ctrlKey ? .01 : .0012)), 25, fitDist() * 1.8); OV.user = S.time; }
  else if (S.mode === 'fly') {
    if (e.ctrlKey) { wheelZoomOut += dy; if (wheelZoomOut > 60) { wheelZoomOut = 0; setMode('overview'); } return; }
    FL.tgt = clamp(FL.tgt + clamp(dy, -120, 120) * .03, G.stops[0].s - 4, G.sEnd + 2); FL.last = S.time;
  }
}, { passive: false });
addEventListener('keydown', e => {
  if (e.target.closest?.('input,textarea,select')) return;
  if (D?.isOpen()) return;
  if (S.mode === 'tl' || TL?.isOpen()) return;
  if (document.body.classList.contains('galaxy') && e.key === 'Escape' && !$('.modal.open')) { exitGalaxy(); return; }
  if ($('.modal.open')) { if (e.key === 'Escape') closeModal($('.modal.open')); return; }
  if (S.mode === 'show') { if (e.key === 'Escape' || e.key === ' ') { e.preventDefault(); stopShow(); } return; }
  if (S.lbIdx >= 0) {
    if (e.key === 'Escape') closeLB(); else if (e.key === 'ArrowRight') lbNav(1); else if (e.key === 'ArrowLeft') lbNav(-1);
    return;
  }
  const k = e.key;
  if (['ArrowRight', 'ArrowDown', 'PageDown', 'ArrowLeft', 'ArrowUp', 'PageUp'].includes(k)) {
    e.preventDefault();
    if (S.mode !== 'fly') { setMode('fly', S.mode === 'intro' ? null : undefined); leaveIntro(); return; }
    const d = ['ArrowRight', 'ArrowDown', 'PageDown'].includes(k) ? 1 : -1, st = nearestStop(FL.tgt), i = G.stops.indexOf(st);
    const nx = G.stops[clamp(i + d, 0, G.stops.length - 1)]; FL.tgt = nx.s; FL.last = S.time;
  } else if (k === 'Enter' && S.mode === 'fly') { const st = nearestStop(FL.s); if (st?.card) openLB(st.card.i); else if (st?.kind === 'portal') openAdd(); }
  else if (k === 'Escape' && S.mode === 'fly') setMode('overview');
});
function updateHover(dt) {
  if (MOBILE || drag.on || !(S.mode === 'fly' || S.mode === 'overview')) { if (hover.c && !drag.on) hover.c = null; }
  else if (hover.dirty) {
    hover.dirty = false;
    ndc.set(hover.x / innerWidth * 2 - 1, -(hover.y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(G.hits, false)[0], c = h?.object.userData.card || null;
    hover.book = h?.object.userData.book ? (G.books || []).find(b => b.d.id === h.object.userData.book) : null;
    if (c !== hover.c) { hover.c = c; hover.t = 0; }
    if (c && h.uv) { hover.u = h.uv.x; hover.v = h.uv.y; }
    canvas.style.cursor = h ? 'pointer' : 'grab';
  }
  // rê lên tấm video ~0,6 giây → phát thử ngay trên tấm
  if (hover.c) hover.t += dt;
  const want = hover.c && hover.c.m.type === 'video' && hover.t > .6 ? hover.c : null;
  if (hover.vidC && hover.vidC !== want) { stopCardVideo(hover.vidC); hover.vidC = null; }
  if (want && !hover.vidC) { startCardVideo(want, { loop: true }); hover.vidC = want; }
}

// ---------- Thanh dưới: ngày, tuổi, thanh tua ----------
let curStop = null;
function curStopNow() {
  if (S.lbIdx >= 0) return G.stops.find(s => s.card && s.card.i === S.lbIdx);
  if (S.mode === 'fly') return nearestStop(FL.s);
  if (S.mode === 'show' && SH.cur) return SH.cur;
  return null;
}
function updateNow() {
  if (!S.kid) return;
  const st = curStopNow(); curStop = st;
  const n = S.moments.length;
  $('#nowC').textContent = n ? `${n} khoảnh khắc` : 'Chưa có khoảnh khắc nào';
  if (!st) {
    const ms = S.moments;
    $('#nowD').textContent = ms.length ? `${dmy(ms[0].ts)} – ${dmy(ms[ms.length - 1].ts)}` : `Dải ngân hà của ${KN()}`;
    $('#nowA').textContent = '🌌 Toàn cảnh';
  } else if (st.card) { $('#nowD').textContent = dmy(st.card.m.ts); $('#nowA').textContent = ageText(S.kid, st.card.m.ts); }
  else if (st.kind === 'star') { const SI = starInfo(); $('#nowD').textContent = SI.d ? (SI.y ? SI.d.slice(0, 4) : dmy(parseYmd(SI.d))) : ''; $('#nowA').textContent = `⭐ ${SI.t}`; }
  else if (st.kind === 'portal') { $('#nowD').textContent = 'Khoảnh khắc tiếp theo…'; $('#nowA').textContent = '➕ Chạm vào cổng sáng để thêm'; }
}
const scrubRange = () => { const a = G.stops[0]?.s ?? 0, b = G.sEnd || a + 1; return [a, Math.max(b, a + 1)]; };
function buildScrub() {
  const el = $('#scrub'), W = el.clientWidth || 300, [a, b] = scrubRange(), f = s => (s - a) / (b - a);
  const dots = el.querySelector('.dots'), ticks = el.querySelector('.ticks');
  const cs = G.cards, stepN = Math.max(1, Math.ceil(cs.length / 220));
  dots.innerHTML = cs.filter((c, i) => i % stepN === 0).map(c => `<i style="left:${(f(c.s) * 100).toFixed(2)}%"></i>`).join('');
  const tk = []; let lastX = -99;
  const add = (s, t) => { const x = f(s) * W; if (x - lastX < (MOBILE ? 38 : 44)) return; lastX = x; tk.push(`<span class="tick" style="left:${(f(s) * 100).toFixed(2)}%">${t}</span>`); };
  if (G.star && starInfo().d) add(G.star.it.s, '⭐ ' + new Date(parseYmd(starInfo().d)).getFullYear());
  for (const g of G.gates) add(g.it.s, g.it.year);
  ticks.innerHTML = tk.join('');
}
let knobF = -1;
function updateScrubKnob() {
  const [a, b] = scrubRange();
  const s = S.mode === 'fly' ? FL.s : curStop ? curStop.s : a;
  const fr = clamp((s - a) / (b - a), 0, 1);
  if (Math.abs(fr - knobF) > .0005) { knobF = fr; $('#scrub .knob').style.left = (fr * 100) + '%'; $('#scrub .fill').style.width = (fr * 100) + '%'; }
  const st = curStopNow(); if (st !== curStop) updateNow();
}
{
  const el = $('#scrub'); let on = false;
  const at = e => { const r = el.getBoundingClientRect(), [a, b] = scrubRange(); return a + clamp((e.clientX - r.left) / r.width, 0, 1) * (b - a); };
  el.addEventListener('pointerdown', e => { if (!S.kid) return; on = true; el.setPointerCapture(e.pointerId); if (S.mode !== 'fly') setMode('fly', at(e)); FL.tgt = at(e); FL.last = S.time + .2; });
  el.addEventListener('pointermove', e => { if (on) { FL.tgt = at(e); FL.last = S.time + .2; } });
  const up = () => { on = false; FL.last = S.time; };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
}

// ---------- Hộp thoại, thông báo ----------
let toastT = 0;
function toast(msg, ms = 2600) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms); }
function openModal(m) { m.classList.add('open'); haptic(5); }
function closeModal(m) { if (m.id === 'mKid' && !S.kids.length) return; if (m.id === 'mAdd' && ADD.busy) return; m.classList.remove('open'); if (m.id === 'mAdd') resetAdd(); if (m.id === 'mAsk') askDone?.(false); }
// nút [data-close] và chạm nền tối: uỷ quyền ở document để cả các hộp tạo sau (dòng thời gian, hồ sơ, giọng kể, lịch, video…) đều đóng được
document.addEventListener('pointerdown', e => { const m = e.target.classList?.contains('modal') ? e.target : null; if (m) m.dataset.down = 1; }, true);
document.addEventListener('click', e => { const b = e.target.closest?.('.modal [data-close]'); if (b) { closeModal(b.closest('.modal')); return; } const m = e.target.classList?.contains('modal') ? e.target : null; if (m && m.dataset.down) closeModal(m); document.querySelectorAll('.modal[data-down]').forEach(x => delete x.dataset.down); });
let askDone = null;
// hộp nhập một dòng chữ (đổi tên…): trả về chuỗi hoặc null nếu huỷ
function prompt2(title, val = '', max = 60, type = 'text') {
  const M = $('#mPrompt'); M.querySelector('h2').textContent = title; const inp = M.querySelector('input'); inp.type = type; inp.maxLength = max; inp.value = val;
  openModal(M); setTimeout(() => { inp.focus(); try { inp.select(); } catch (e) { } }, 320);
  return new Promise(res => {
    const ok = () => { done(); res(inp.value); }, no = () => { done(); res(null); };
    const key = e => { if (e.key === 'Enter') ok(); };
    const ob = new MutationObserver(() => { if (!M.classList.contains('open')) { done(); res(null); } });
    function done() { ob.disconnect(); M.querySelector('.primary').onclick = null; inp.removeEventListener('keydown', key); M.classList.remove('open'); }
    M.querySelector('.primary').onclick = ok; inp.addEventListener('keydown', key); ob.observe(M, { attributes: true });
  });
}
function ask(t, l, yes = 'Đồng ý', danger = false, no = 'Thôi') {
  $('#askT').textContent = t; $('#askL').textContent = l; $('#askNo').textContent = no; const y = $('#askYes'); y.textContent = yes; y.className = danger ? 'primary danger-bg' : 'primary';
  openModal($('#mAsk'));
  return new Promise(r => { askDone = v => { askDone = null; $('#mAsk').classList.remove('open'); r(v); }; });
}
$('#askYes').onclick = () => askDone?.(true);

// ---------- Bé ----------
const avatar = n => (n || '?').trim().charAt(0).toUpperCase();
// v1.6.0: "Tôi" làm gốc — LIFE() = đang xem hành trình cả đời (mọi người, mọi ảnh); không có Tôi thì S.family là "Cả nhà" như cũ
const ME = () => findMe(S.kids);
const LIFE = () => !!S.family && !!ME();
const whoOf = k => isMe(k) ? 'bạn' : cap(k?.name), WhoOf = k => isMe(k) ? 'Bạn' : cap(k?.name);
function renderKidBtn() { const tt = $('#tbTitle'); if (tt) tt.textContent = LIFE() ? 'Hành trình của bạn' : S.family ? 'Cả nhà' : S.kid ? KN() : ''; renderKidBtn0(); }
function renderKidBtn0() { $('#kidName').textContent = S.kid ? KN() : '…'; $('#kidBtn .av').textContent = S.kid ? avatar(KN()) : '✨'; }
async function selectKid(id, intro = true) {
  S.kid = S.kids.find(k => k.id === id) || S.kids[0]; if (!S.kid) return;
  await metaSet('curKid', S.kid.id);
  S.family = false; await loadAll();
  closeLBNow(); hover.c = null; hover.vidC = null;
  buildGalaxy(); renderKidBtn(); buildScrub();
  document.body.classList.remove('intro', 'galaxy');
  await TL.reload(); await loadBg(); setMode('tl'); updateNow();
}
async function loadAll() {
  const ms = await dbAll('moments'), ds = await dbAll('diaries');
  S.all = ms.filter(m => !m.deleted); S.trash = ms.filter(m => m.deleted); S.allDiaries = ds.filter(d => !d.deleted); S.trashD = ds.filter(d => d.deleted); refreshKid();
}
// ---------- Thùng rác: xoá = đưa vào thùng rác 30 ngày, có Hoàn tác ----------
const TRASH_DAYS = 30;
async function afterDataChange() { await loadAll(); buildGalaxy(); buildScrub(); updateNow(); TL.refreshAll?.(); }
async function trashMoments(list, label) {
  if (!list.length) return; const now = Date.now();
  for (const m of list) { m.deleted = now; await dbPut('moments', m); }
  await afterDataChange(); haptic(15);
  undoToast(label || `Đã chuyển ${list.length} ảnh/video vào thùng rác`, () => restoreMoments(list));
}
async function restoreMoments(list) { for (const m of list) { delete m.deleted; delete m.trashKid; await dbPut('moments', m); } await afterDataChange(); toast(`Đã khôi phục ${list.length} ảnh/video`, 1800); }
async function trashDiary(d) { d.deleted = Date.now(); await dbPut('diaries', d); await diaryChanged(); undoToast(`Đã chuyển “${esc(d.title)}” vào thùng rác`, async () => { delete d.deleted; await dbPut('diaries', d); await diaryChanged(); }); }
async function purgeOld() {
  const lim = Date.now() - TRASH_DAYS * 864e5;
  { const gs = await metaGet('groups'); if (gs?.length) { const ids = new Set((await dbKeys('moments')).map(String)); const ng = gs.map(g => ({ ...g, momentIds: g.momentIds.filter(id => ids.has(String(id))) })).filter(g => g.momentIds.length); if (JSON.stringify(ng) !== JSON.stringify(gs)) await metaSet('groups', ng); } }
  { const tq = (await metaGet('drvTrashQ')) || [], old = (await dbAll('moments')).filter(m => m.deleted && m.deleted < lim); for (const m of old) { if (m.driveFileId) tq.push(m.driveFileId); if (m.driveThumbId) tq.push(m.driveThumbId); } if (old.length) await metaSet('drvTrashQ', tq); }
  for (const m of await dbAll('moments')) if (m.deleted && m.deleted < lim) { await dbDel('blobs', 'o_' + m.id); await dbDel('blobs', 't_' + m.id); await dbDel('moments', m.id); }
  for (const d of await dbAll('diaries')) if (d.deleted && d.deleted < lim) { await dbDel('blobs', 'd_' + d.id); await dbDel('diaries', d.id); }
  for (const k of await dbAll('kids')) if (k.deleted && k.deleted < lim) { await dbDel('blobs', 'av_' + k.id); await dbDel('kids', k.id); }
}
async function openTrash() {
  await loadAll(); const box = $('#trList'), kidsDel = (await dbAll('kids')).filter(k => k.deleted);
  const left = t => Math.max(1, TRASH_DAYS - Math.floor((Date.now() - t) / 864e5));
  box.innerHTML = (kidsDel.map(k => `<div class="tr-k"><img src="${P.avatarNow(k)}" alt=""><span><b>${esc(cap(k.name))}</b><small>còn ${left(k.deleted)} ngày</small></span><button data-rk="${k.id}">${icon('back', 16)}<span>Khôi phục bé</span></button></div>`).join(''))
    + (S.trashD.map(d => `<div class="tr-k"><span class="ic-b">${icon('book', 22)}</span><span><b>${esc(d.title)}</b><small>nhật ký · còn ${left(d.deleted)} ngày</small></span><button data-rd="${d.id}">${icon('back', 16)}<span>Khôi phục</span></button></div>`).join(''))
    + (S.trash.length ? `<div class="tr-g">${S.trash.sort((a, b) => b.deleted - a.deleted).map(m => `<button data-tm="${m.id}"><i></i><small>còn ${left(m.deleted)} ngày</small></button>`).join('')}</div>` : '')
    || '<p class="lead">Thùng rác trống.</p>';
  box.querySelectorAll('[data-tm]').forEach(b => dbGet('blobs', 't_' + b.dataset.tm).then(t => { if (t) b.querySelector('i').style.backgroundImage = `url('${URL.createObjectURL(t)}')`; }));
  $('#trInfo').textContent = S.trash.length ? `${S.trash.length} ảnh/video · tự xoá hẳn sau ${TRASH_DAYS} ngày` : '';
  TRSEL.clear(); trBtns(); openModal($('#mTrash'));
}
const TRSEL = new Set();
function trBtns() { const n = TRSEL.size; $('#trRestore').textContent = n ? `Khôi phục ${n} mục` : 'Khôi phục tất cả'; $('#trPurge').textContent = n ? `Xoá vĩnh viễn ${n} mục` : 'Dọn sạch thùng rác'; $('#trRestore').disabled = $('#trPurge').disabled = !S.trash.length && !n; }
function refreshKid() {
  S.chapters = LIFE() ? chaptersOf(ME(), S.kids, S.chCfg) : [];
  const vis = id => S.kids.some(k => k.id === id) && !(LIFE() && S.hidden?.has(id));
  const id = S.kid?.id; S.moments = LIFE() ? (S.all || []).filter(m => kidsOf(m).some(vis)) : (S.all || []).filter(m => kidsOf(m).includes(id));
  S.diaries = (S.allDiaries || []).filter(d => d.kidId === id || (d.kids || []).includes(id));
}
const dispKid = k => k ? { ...k, name: cap(k.name) } : null;
async function enterFamily() {
  if (S.kids.length < 2 && !ME()) return; S.family = true; await metaSet('family', true);
  closeLBNow(); TL.closeViewer(); TL.closeEvent(); document.body.classList.remove('galaxy'); await P.warm(S.kids);
  if (ME()) { S.kid = ME(); await metaSet('curKid', S.kid.id); refreshKid(); buildGalaxy(); buildScrub(); await loadBg(); }
  await TL.reload(); renderKidBtn(); setMode('tl'); haptic(10);
}
$('#kidBtn').onclick = e => { e.stopPropagation(); openKidMenu(e.currentTarget); };
$('#kidMenu').hidden = true;
let kidEditing = null;
let kidDraft = null;
const ROLE_G = { bo: 'm', ong: 'm', anh: 'm', chong: 'm', ma: 'f', ba: 'f', chi: 'f', vo: 'f' };
function kidSheetUi() {
  const k = kidDraft; $$('#kidG button').forEach(b => b.classList.toggle('on', b.dataset.v === k.gender));
  $('#kidC').innerHTML = KID_COLORS.map(c => `<i data-c="${c}" style="background:${c}" class="${c === k.color ? 'on' : ''}"></i>`).join('');
  $('#kidAvI').src = P.avatarNow({ ...k, name: cap($('#kidIn').value) || roleName(k) }); $('.kav').style.setProperty('--kcol', k.color);
  $('#mKid').style.setProperty('--kc', k.color);
}
// nhãn, ô nhập hiện / ẩn theo vai trò (Tôi, Con, bạn đời, bố mẹ…)
function kidRoleUi() {
  const k = kidDraft, r = roleOf(k), first = !S.kids.length, child = isChild(k), me = isMe(k), partner = isPartner(k);
  const meTaken = S.kids.some(x => isMe(x) && x.id !== k.id), editMe = kidEditing && isMe(kidEditing);
  $('#kidFst').hidden = !first; $('#kidRoleRow').hidden = first || editMe;
  $$('#kidFst [data-r]').forEach(b => b.classList.toggle('on', b.dataset.r === r));
  $('#kidRole').innerHTML = ROLES.filter(x => x.v !== 'me' || (!meTaken && !kidEditing)).map(x => `<button type="button" data-r="${x.v}" class="${x.v === r ? 'on' : ''}">${x.t}</button>`).join('');
  $('#kidInL').textContent = me ? 'Tên của bạn' : child ? 'Tên ở nhà của bé' : 'Tên gọi';
  $('#kidIn').placeholder = me ? 'Ví dụ: Vũ' : child ? 'Ví dụ: Bin' : `Ví dụ: ${roleName(k)}`;
  $('#kidBdL').innerHTML = me ? 'Ngày sinh của bạn' : child ? 'Ngày sinh' : 'Ngày sinh <small class="opt">tuỳ chọn</small>';
  $('#kidBx').hidden = !child;
  const since = !me && !child && r !== 'em';
  $('#kidSince').hidden = !since; $('#kidWedF').hidden = !partner;
  $('#kidSiL').textContent = partner || r === 'ban' || r === 'khac' ? 'Ngày quen nhau' : 'Ngày bước vào đời bạn';
  $('#kidSiH').textContent = isElder(k) ? 'Để trống thì app coi như người này có mặt từ ngày bạn chào đời.' : partner ? 'Dùng cho chương “Tình yêu & cưới” và lịch kỷ niệm ngày cưới.' : 'Từ ngày này người ấy có dải sáng riêng trên hành trình của bạn.';
  $('#kidAgeF').hidden = me || child;
  const gb = $$('#kidG button'); gb[0].textContent = child ? 'Bé trai' : 'Nam'; gb[1].textContent = child ? 'Bé gái' : 'Nữ';
  $('#kidCL').textContent = me ? 'Màu của bạn' : child ? 'Màu của bé' : 'Màu riêng';
  const nm = kidEditing ? (isMe(kidEditing) ? 'bạn' : cap(kidEditing.name)) : '';
  $('#kidTitle').textContent = first ? 'Chào bạn! 👋' : kidEditing ? (isMe(kidEditing) ? 'Hồ sơ của bạn' : `Sửa thông tin ${nm}`) : me ? 'Hồ sơ của bạn' : child ? 'Thêm một bé' : 'Thêm người thân';
  $('#kidLead').textContent = first ? (me ? 'Hành Trình Của Bạn lưu lại kỷ niệm cả cuộc đời — tuổi thơ, tuổi trẻ, gia đình, con cái — để sau này xem lại. Bắt đầu bằng hồ sơ của chính bạn, người thân thêm sau.' : 'Cùng tạo dòng thời gian kỷ niệm cho con nhé. Ngày sinh giúp app tính con bao nhiêu tuổi ở mỗi tấm ảnh.')
    : kidEditing ? (me ? 'Ngày sinh của bạn dùng để chia đời bạn thành các chương.' : child ? 'Đổi tên hoặc ngày sinh — tuổi trên mọi tấm ảnh sẽ tự tính lại.' : 'Người thân có dải sáng riêng trên hành trình của bạn, từ ngày bước vào đời bạn.')
    : me ? 'Từ giờ mọi kỷ niệm xếp vào hành trình cuộc đời bạn, chia thành từng chương. Các bé đã có thành người thân vai trò Con — không mất gì.' : child ? 'Mỗi bé có dòng thời gian riêng, kèm tuổi tháng và cột mốc.' : 'Vợ / chồng, bố mẹ, anh chị em… — ảnh gắn người này hiện trên dải sáng riêng.';
  $('#kidOk').textContent = kidEditing ? 'Lưu' : first ? 'Bắt đầu ✨' : 'Thêm';
  $('#kidDel').textContent = me ? 'Xoá hồ sơ của bạn' : child ? 'Xoá bé này' : 'Xoá người này';
}
// ngày sinh âm lịch ↔ dương lịch
const CAL = { mode: 'd' };
function lunarFill() { if ($('#kidLd').options.length) return; $('#kidLd').innerHTML = Array.from({ length: 30 }, (_, i) => `<option value="${i + 1}">Mùng ${i + 1}</option>`).join('').replace(/Mùng (1\d|2\d|30)</g, 'Ngày $1<'); $('#kidLm').innerHTML = Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">Tháng ${LUNAR_MONTH(i + 1)}</option>`).join(''); }
function lunarSolar() {
  const d = +$('#kidLd').value, m = +$('#kidLm').value, y = +$('#kidLy').value, l = $('#kidLl').checked; if (!(y > 1880 && y < 2200)) return null;
  const r = lunar2solar(d, m, y, l); if (!r) return null; const back = solar2lunar(r.d, r.m, r.y); if (back.d !== d || back.m !== m || !!back.leap !== l) return null;
  return `${r.y}-${pad(r.m)}-${pad(r.d)}`;
}
function setCal(mode) {
  lunarFill(); const was = CAL.mode; CAL.mode = mode; $$('#kidCal button').forEach(b => b.classList.toggle('on', b.dataset.v === mode));
  $('#kidBd').hidden = mode === 'a'; $('#kidLun').hidden = mode !== 'a';
  if (mode === 'a' && was !== 'a' && parseYmd($('#kidBd').value)) { const [y, m, d] = $('#kidBd').value.split('-').map(Number), L = solar2lunar(d, m, y); $('#kidLd').value = L.d; $('#kidLm').value = L.m; $('#kidLy').value = L.y; $('#kidLl').checked = L.leap; }
  if (mode === 'd' && was === 'a') { const s = lunarSolar(); if (s) $('#kidBd').value = s; }
  kidBdHint();
}
// v1.6.0: tạo hồ sơ "Tôi" bằng màn làm quen kiểu trò chuyện
const OB = initOnboarding({ toast, confetti: c => P.confetti(c), drvOn: () => !!DRV?.on, signIn: () => { openKid(null, { role: 'con' }); DRV.signIn(); }, onKid: () => openKid(null, { role: 'con' }), onBackup: () => { openKid(null, { role: 'con' }); $('#importIn').click(); } });
async function createMe(first = false) {
  if (ME()) { openKid(ME()); return; }
  $('#mKid').classList.remove('open');
  const d = await OB.open({ first, color: defaultColor(null, S.kids.map(k => k.color)) }); if (!d) { if (first && !S.kids.length && !$('#mKid').classList.contains('open')) openKid(null, { role: 'con' }); return; }
  const k = { id: uid(), role: 'me', created: Date.now(), avatar: 0, avStyle: 0, ...d }; await dbPut('kids', k); if (d.home?.name && navigator.onLine) setTimeout(() => homeFromName(d.home.name), 4500); S.kids.push(k); await P.warm([k]); await metaSet('meAsk', Date.now());
  document.body.classList.remove('intro'); leaveIntro(true); await selectKid(k.id, false); await enterFamily(); renderSettings();
  if (S.kids.length > 1) setTimeout(() => toast(`${S.kids.filter(x => !isMe(x)).map(x => cap(x.name)).join(', ')} đã thành người thân trong hành trình của bạn ✨`, 4000), 700);
}
function openKid(kid, opt = {}) {
  if (!kid && opt.role === 'me' && !opt.form) { createMe(!S.kids.length); return; }
  if (!kid && S.kids.length >= 40) { toast('App giữ tối đa 40 người cho màn hành trình gọn đẹp — bạn sửa hoặc xoá bớt nhé', 3800); return; }
  kidEditing = kid; const first = !S.kids.length;
  kidDraft = kid ? { ...kid } : { id: uid(), gender: null, color: null, avatar: 0, avStyle: 0, role: opt.role || (first ? 'me' : ME() ? 'vo' : 'con') };
  if (!kid && !opt.role && ME() && S.kids.some(isPartner)) kidDraft.role = 'con';
  if (!kidDraft.gender && ROLE_G[roleOf(kidDraft)]) { kidDraft.gender = ROLE_G[roleOf(kidDraft)]; kidDraft._autoG = true; }
  if (!kidDraft.color) kidDraft.color = defaultColor(kidDraft.gender, S.kids.filter(k => k.id !== kidDraft.id).map(k => k.color));
  $('#kidIn').value = kid?.name || ''; $('#kidBd').value = kid?.birth || '';
  $('#kidSi').value = kid?.since || ''; $('#kidWed').value = kid?.wed || ''; $('#kidAge').checked = !!kid?.showAge;
  if (kid?.birthApprox) $('#kidBd').value = '';
  CAL.mode = 'd'; setCal(kid?.birthLunar ? 'a' : 'd'); if (kid?.birthApprox) $('#kidBdH').textContent = `Bạn mới nhập năm sinh ${kid.birth.slice(0, 4)} — chọn ngày sinh đầy đủ để xem cung hoàng đạo (để trống thì giữ nguyên)`; if (kid?.birthLunar) { const L = kid.birthLunar; $('#kidLd').value = L.d; $('#kidLm').value = L.m; $('#kidLy').value = L.y; $('#kidLl').checked = !!L.leap; kidBdHint(); }
  $('#kidFn').value = kid?.fullName || ''; $('#kidTm').value = kid?.birthTime || ''; $('#kidPl').value = kid?.place || ''; $('#kidKg').value = kid?.weight ? String(kid.weight).replace('.', ',') : ''; $('#kidCm').value = kid?.length ? String(kid.length).replace('.', ',') : ''; $('#kidBx').open = !!(kid?.birthTime || kid?.place || kid?.weight || kid?.length);
  $('#kidCancel').hidden = first; $('#mKid').classList.toggle('can', !first); $('#kidDel').hidden = !kid || S.kids.length < 1; $('#kidFirst').hidden = !first; $('#kfLink').value = ''; if (first) $('#kidLead').after($('#kidFirst'));
  kidRoleUi(); kidSheetUi();
  openModal($('#mKid')); setTimeout(() => $('#kidIn').focus(), 350);
}
function setKidRole(r) {
  if (!kidDraft || r === roleOf(kidDraft)) return; const autoG = !kidDraft.gender || kidDraft._autoG; kidDraft.role = r;
  if (autoG) { kidDraft.gender = ROLE_G[r] || (kidEditing?.gender ?? null); kidDraft._autoG = !!ROLE_G[r]; if (KID_COLORS.includes(kidDraft.color)) kidDraft.color = defaultColor(kidDraft.gender, S.kids.filter(k => k.id !== kidDraft.id).map(k => k.color)); }
  haptic(6); kidRoleUi(); kidSheetUi();
}
$('#kidRole').onclick = e => { const b = e.target.closest('[data-r]'); if (b) setKidRole(b.dataset.r); };
$('#kidFst').onclick = e => { const b = e.target.closest('[data-r]'); if (!b) return; if (b.dataset.r === 'me' && !kidEditing) { createMe(!S.kids.length); return; } setKidRole(b.dataset.r); };
$('#kidCal').onclick = e => { const b = e.target.closest('[data-v]'); if (b) setCal(b.dataset.v); };
['kidLd', 'kidLm', 'kidLy', 'kidLl'].forEach(id => $('#' + id).addEventListener(id === 'kidLy' ? 'input' : 'change', () => kidBdHint()));
$('#kidOk').onclick = async () => {
  const k0 = kidDraft, me = isMe(k0), child = isChild(k0), partner = isPartner(k0);
  let name = $('#kidIn').value.trim().replace(/\s+/g, ' '); if (!name && !me && !child) name = roleName(k0);
  if (!name) { toast(me ? 'Bạn nhập tên của bạn nhé' : 'Bạn nhập tên ở nhà của bé nhé'); $('#kidIn').focus(); return; }
  let birth = CAL.mode === 'a' ? lunarSolar() : $('#kidBd').value, keepApx = false;
  if (!birth && kidEditing?.birthApprox) { birth = kidEditing.birth; keepApx = true; }
  if (CAL.mode === 'a' && $('#kidLy').value && !birth) { toast('Ngày âm lịch này không có trong năm đó — bạn kiểm tra lại ngày, tháng (hoặc bỏ ô “nhuận”) nhé', 3800); return; }
  if ((me || child) && !parseYmd(birth)) { toast(me ? 'Bạn chọn ngày sinh của bạn nhé — app dùng để chia đời bạn thành các chương' : 'Bạn chọn ngày sinh của bé nhé', 3200); (CAL.mode === 'a' ? $('#kidLy') : $('#kidBd')).focus(); return; }
  if (!parseYmd(birth)) birth = '';
  const num = (v, lo, hi) => { const x = parseFloat(String(v).replace(',', '.')); return x >= lo && x <= hi ? Math.round(x * 100) / 100 : null; };
  const kg = $('#kidKg').value.trim(), cm = $('#kidCm').value.trim();
  if (child && kg && num(kg, .3, 9) == null) { toast('Cân nặng lúc sinh tính bằng kg, ví dụ 3,2'); $('#kidBx').open = true; $('#kidKg').focus(); return; }
  if (child && cm && num(cm, 20, 70) == null) { toast('Chiều dài lúc sinh tính bằng cm, ví dụ 50'); $('#kidBx').open = true; $('#kidCm').focus(); return; }
  const since = !me && !child && roleOf(k0) !== 'em' ? ($('#kidSi').value || null) : null, wed = partner ? ($('#kidWed').value || null) : null;
  const ex = { role: roleOf(k0), gender: k0.gender || null, color: k0.color, avatar: k0.avatar || 0, avStyle: k0.avStyle || 0,
    birthLunar: CAL.mode === 'a' && birth ? { d: +$('#kidLd').value, m: +$('#kidLm').value, y: +$('#kidLy').value, leap: $('#kidLl').checked } : null,
    since, wed, showAge: !me && !child ? $('#kidAge').checked : false, birthApprox: keepApx ? kidEditing.birthApprox : null,
    fullName: $('#kidFn').value.trim().replace(/\s+/g, ' ') || null, birthTime: child ? $('#kidTm').value || null : null, place: child ? $('#kidPl').value.trim() || null : null, weight: child ? num(kg, .3, 9) : null, length: child ? num(cm, 20, 70) : null };
  if (kidEditing) {
    Object.assign(kidEditing, { name, birth }, ex); await dbPut('kids', kidEditing); await P.warm([kidEditing]);
    $('#mKid').classList.remove('open');
    if (S.family) { if (LIFE()) S.kid = ME(); await loadAll(); buildGalaxy(); buildScrub(); await TL.reload(); renderKidBtn(); updateNow(); } else await selectKid(kidEditing.id, false);
    toast('Đã lưu thông tin ' + (me ? 'của bạn' : name));
  } else {
    const k = { id: k0.id, name, birth, created: Date.now(), ...ex }; await dbPut('kids', k); S.kids.push(k); await P.warm([k]);
    $('#mKid').classList.remove('open'); leaveIntro(true);
    if (me) { await metaSet('meAsk', Date.now()); await selectKid(k.id, false); await enterFamily(); if (S.kids.length > 1) setTimeout(() => toast(`Đã tạo hồ sơ của bạn ✨ ${S.kids.filter(x => !isMe(x)).map(x => cap(x.name)).join(', ')} đã thành người thân trong hành trình của bạn`, 4200), 600); }
    else if (ME()) { if (!LIFE()) await enterFamily(); else { await loadAll(); buildGalaxy(); buildScrub(); await TL.reload(); renderKidBtn(); } toast(`Đã thêm ${name} vào hành trình của bạn`, 2400); }
    else await selectKid(k.id, true);
  }
  renderSettings();
};
// tên kiểu "Rin - Trần Đại Dũng" (nhập từ bản cũ chưa có ô tên thật) → tự tách tên ở nhà + tên thật, có Hoàn tác
function splitName(name) {
  const m = /^\s*([^()\-–—|]+?)\s*(?:[-–—|]\s*(.+?)|\(\s*(.+?)\s*\))\s*$/.exec(name || ''); if (!m) return null;
  const x = m[1].trim(), y = (m[2] || m[3] || '').trim(), wx = x.split(/\s+/).length, wy = y.split(/\s+/).length;
  return x && y && wx <= 2 && wy >= 2 && wy > wx ? { name: x, fullName: y } : null;
}
async function splitNames() {
  for (const k of S.kids) {
    if (k.fullName || await metaGet('nameSplit:' + k.id)) continue; const sp = splitName(k.name); if (!sp) continue;
    const old = k.name; Object.assign(k, sp); await dbPut('kids', k); await metaSet('nameSplit:' + k.id, { old, ts: Date.now() });
    S.splitNow = true; setTimeout(() => undoToast(`Đã tách tên ở nhà: <b>${esc(sp.name)}</b> · tên thật: <b>${esc(sp.fullName)}</b>`, async () => { k.name = old; delete k.fullName; await dbPut('kids', k); await P.warm([k]); renderKidBtn(); TL.render(); toast('Đã giữ lại tên cũ — bạn sửa trong hồ sơ bé khi cần nhé', 2400); }, 8000), 1800);
  }
}
$('#kfBackup').onclick = () => $('#importIn').click();
setTimeout(() => DRV?.on && (() => { $('#kfBackup').insertAdjacentHTML('beforebegin', `<button class="kf-b kf-g" id="kfGoogle" type="button"><b class="g">G</b><span>Đăng nhập Google — lấy lại dữ liệu</span></button>`); $('#kfGoogle').onclick = () => DRV.signIn(); })(), 0);
$('#kfLinkOk').onclick = async () => { const v = $('#kfLink').value.trim(); if (!/#hoso=/.test(v)) { toast('Bạn dán cả đường link hồ sơ (có đoạn #hoso=…) nhé', 3000); return; } await importProfiles(v); };
$('#kfLink').addEventListener('keydown', e => { if (e.key === 'Enter') $('#kfLinkOk').click(); });
$('#kidIn').addEventListener('keydown', e => { if (e.key === 'Enter') $('#kidBd').focus(); });
$('#kidIn').addEventListener('input', () => kidDraft && kidSheetUi());
$('#kidG').onclick = e => { const b = e.target.closest('[data-v]'); if (!b || !kidDraft) return; const was = kidDraft.gender; kidDraft.gender = b.dataset.v; kidDraft._autoG = false; if (!was || KID_COLORS.indexOf(kidDraft.color) >= 0) kidDraft.color = defaultColor(kidDraft.gender, S.kids.filter(k => k.id !== kidDraft.id).map(k => k.color)); haptic(6); kidSheetUi(); };
$('#kidC').onclick = e => { const c = e.target.dataset.c; if (!c || !kidDraft) return; kidDraft.color = c; haptic(5); kidSheetUi(); };
$('#kidAvB').onclick = () => { if (!kidDraft) return; const m = $('#mKid'); P.openAvatar({ ...kidDraft, name: cap($('#kidIn').value) || 'bé' }, k => { Object.assign(kidDraft, { avatar: k.avatar, avStyle: k.avStyle }); P.warm([kidDraft]).then(kidSheetUi); setTimeout(() => openModal(m), 50); }); };
async function removeKid(k) {
  const n = (await dbAll('moments')).filter(m => !m.deleted && kidsOf(m).includes(k.id)), own = n.filter(m => kidsOf(m).length === 1), shared = n.length - own.length;
  const msg = `${own.length} ảnh/video chỉ của ${cap(k.name)} sẽ vào thùng rác (khôi phục được trong ${TRASH_DAYS} ngày).` + (shared ? ` ${shared} ảnh chụp chung với bé khác vẫn giữ, chỉ bỏ gắn ${cap(k.name)}.` : '');
  if (!(await ask(`Xoá ${cap(k.name)}?`, msg, `Xoá ${cap(k.name)}`, true))) return false;
  const now = Date.now();
  for (const m of n) { const rest = kidsOf(m).filter(x => x !== k.id); if (rest.length) { m.kidIds = rest; m.kidId = rest[0]; m.unk = [...(m.unk || []), k.id]; } else { m.deleted = now; m.trashKid = k.id; } await dbPut('moments', m); }
  for (const d of (await dbAll('diaries')).filter(d => d.kidId === k.id && !d.deleted)) { d.deleted = now; d.trashKid = k.id; await dbPut('diaries', d); }
  k.deleted = now; await dbPut('kids', k); S.kids = S.kids.filter(x => x.id !== k.id);
  return true;
}
async function restoreKid(id) {
  const k = (await dbAll('kids')).find(x => x.id === id); if (!k) return; delete k.deleted; await dbPut('kids', k);
  for (const m of await dbAll('moments')) { if (m.trashKid === id) { delete m.deleted; delete m.trashKid; await dbPut('moments', m); } else if ((m.unk || []).includes(id)) { m.kidIds = [...kidsOf(m), id]; m.unk = m.unk.filter(x => x !== id); await dbPut('moments', m); } }
  for (const d of await dbAll('diaries')) if (d.trashKid === id) { delete d.deleted; delete d.trashKid; await dbPut('diaries', d); }
  S.kids = (await dbAll('kids')).filter(x => !x.deleted).sort((a, b) => (a.created || 0) - (b.created || 0)); await P.warm([k]); await loadAll(); renderKidBtn(); TL.render(); buildGalaxy();
  toast(`Đã khôi phục ${cap(k.name)}`, 2000);
}
$('#kidDel').onclick = async () => {
  const k = kidEditing; if (!k) return;
  if (!(await removeKid(k))) return;
  $('#mKid').classList.remove('open'); P.closeProfile();
  const kname = cap(k.name);
  if (S.kids.length) await selectKid(S.kids[0].id, false); else { S.kid = null; clearGalaxy(); renderKidBtn(); openKid(null); }
  renderSettings(); undoToast(`Đã xoá ${esc(kname)} — nằm trong thùng rác ${TRASH_DAYS} ngày`, () => restoreKid(k.id), 6000);
};

// ---------- Màn mở đầu ----------
function playIntro() {
  if (!S.kid) return;
  S.mode = 'intro'; document.body.classList.add('intro'); document.body.classList.remove('hide-intro');
  $('#intro').style.display = '';
  const pre = LIFE() ? 'Hành trình của ' : 'Dải ngân hà của ', nm = KN(); let i = 0;
  const L = (ch, col) => `<span class="letter"${col ? ` style="animation-delay:${(.25 + i * .045).toFixed(3)}s;color:${col}"` : ` style="animation-delay:${(.25 + i * .045).toFixed(3)}s"`}>${(i++, ch === ' ' ? '&nbsp;' : esc(ch))}</span>`;
  const NC = S.theme === 'dawn' ? ['#e0487f', '#f07a2c', '#d0569a', '#e8892f'] : ['#ff8fbf', '#ffd27f', '#9fe1cb', '#ffb3d6'];
  $('#introTitle').innerHTML = [...pre].map(c => L(c)).join('') + '<br class="br"><span class="nm2">' + [...nm].map((c, k) => L(c, NC[k % NC.length])).join('') + '</span>';
  const n = S.moments.length;
  const sub = $('#introSub'), btns = $('#introBtns');
  sub.textContent = n ? `${n} khoảnh khắc lấp lánh · ${ageText(S.kid, Date.now())} rồi đó` : `Hành trình lớn lên của ${nm} bắt đầu từ đây`;
  if (S.kid.birth && parseYmd(S.kid.birth) > Date.now()) sub.textContent = n ? `${n} khoảnh khắc đang chờ ngày ${nm} chào đời` : `Đếm ngược tới ngày ${nm} chào đời`;
  btns.innerHTML = n ? `<button class="primary" data-go="fly">✨ Bắt đầu hành trình</button><button class="glass" data-go="show">▶️ Chiếu có nhạc</button>` : `<button class="primary" data-go="add">➕ Thêm khoảnh khắc đầu tiên</button>`;
  [sub, btns].forEach(el => { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; });
  // máy quay bay từ ngoài vũ trụ vào
  OV.dist = fitDist() * (portrait() ? 1.05 : .95); OV.az = Math.random() * 6.28; OV.pol = .98; OV.user = -99;
  const to = { pos: new V3(), look: new V3() }; overviewPose(to.pos, to.look);
  const from = { pos: to.pos.clone().normalize().multiplyScalar(2600).add(new V3(0, 1200, 0)), look: new V3(0, -40, 0) };
  tween = { from, to, t: 0, dur: 4.6, ease: t => 1 - Math.pow(1 - t, 4), live: (p, l) => { if (S.time - OV.user > 4) OV.az += 1 / 60 * .045; overviewPose(p, l); } };
  updateNow();
}
function leaveIntro(now) {
  if (!document.body.classList.contains('intro')) return;
  document.body.classList.add('hide-intro'); document.body.classList.remove('intro');
  if (tween && tween.live) { tween = null; cam.tPos.copy(cam.pos); cam.tLook.copy(cam.look); cam.k = 1.6; }
  setTimeout(() => { if (!document.body.classList.contains('intro')) $('#intro').style.display = 'none'; }, now ? 0 : 900);
}
$('#introBtns').onclick = e => {
  const b = e.target.closest('button'); if (!b) return; const g = b.dataset.go;
  leaveIntro();
  if (g === 'fly') setMode('fly', G.stops[0].s);
  else if (g === 'show') startShow();
  else if (g === 'add') { setMode('fly', G.star ? G.star.it.s : 0); openAdd(); }
};

// ---------- Khung xem khoảnh khắc ----------
let lbUrl = null, lbOpenT = 0;
const LB = $('#lb');
function openLB(i) {
  const c = G.cards[i]; if (!c) return;
  leaveIntro(true);
  S.lbIdx = i; FO = { pos: new V3(), look: new V3() }; focusPose(c, FO.pos, FO.look);
  S.mode = 'focus'; cam.k = 2.6; hover.c = null;
  if (hover.vidC) { stopCardVideo(hover.vidC); hover.vidC = null; }
  clearTimeout(lbOpenT);
  const far = cam.pos.distanceTo(FO.pos);
  lbOpenT = setTimeout(() => { LB.classList.add('open'); document.body.classList.add('lbopen'); }, far > 4 ? clamp(far * 14, 450, 900) : 50);
  renderLB(); updateNow();
}
async function renderLB() {
  const c = G.cards[S.lbIdx]; if (!c) return; const m = c.m;
  LB.querySelector('.count').textContent = `${S.lbIdx + 1} / ${G.cards.length}`;
  LB.querySelector('.ti').textContent = m.title || 'Một ngày đáng nhớ';
  const d = new Date(m.ts);
  LB.querySelector('.dt').textContent = m.approx ? approxLabel(m.approx, m.ts) : `${WD[d.getDay()]} · ${dmy(m.ts)}`;
  LB.querySelector('.ag').textContent = ageText(S.kid, m.ts);
  LB.querySelector('.nt').innerHTML = m.note ? esc(m.note) : `<span style="color:var(--muted)">Chưa có ghi chú — bấm Sửa để kể thêm.</span>${m.dateSrc === 'check' ? '<br><span style="color:var(--accent-2)">Ngày có thể chưa đúng — bấm Sửa để chỉnh.</span>' : ''}`;
  LB.querySelector('.view').hidden = false; LB.querySelector('.edit').hidden = true;
  const media = LB.querySelector('.media'); const id = m.id;
  const old = media.querySelector('video'); if (old) { old.pause(); old.removeAttribute('src'); old.load(); }
  if (lbUrl) { URL.revokeObjectURL(lbUrl); lbUrl = null; }
  media.innerHTML = '';
  const blob = await dbGet('blobs', 'o_' + id);
  if (G.cards[S.lbIdx]?.m.id !== id) return;
  if (!blob) { media.innerHTML = '<div class="msg">Không tìm thấy tệp gốc</div>'; return; }
  lbUrl = URL.createObjectURL(blob);
  if (m.type === 'video') {
    const v = document.createElement('video'); v.src = lbUrl; v.controls = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.autoplay = true;
    v.onplay = () => { if (!v.muted && Music.playing) Music.duck(true); }; v.onpause = v.onended = () => Music.duck(false);
    v.onerror = () => { media.insertAdjacentHTML('beforeend', '<div class="msg">Trình duyệt này chưa mở được video này — thử bằng Safari hoặc bấm “Lưu về máy”.</div>'); };
    media.appendChild(v);
  } else {
    const im = new Image(); im.alt = m.title || ''; im.decoding = 'async';
    im.onerror = async () => {
      const tb = await dbGet('blobs', 't_' + id); if (tb && G.cards[S.lbIdx]?.m.id === id) { im.onerror = null; im.src = URL.createObjectURL(tb); }
      media.insertAdjacentHTML('beforeend', `<div class="msg">${m.heic ? 'Ảnh HEIC — mở bằng Safari để xem bản gốc' : 'Không mở được ảnh gốc'}</div>`);
    };
    im.src = lbUrl; media.appendChild(im);
  }
}
function closeLBNow() {
  clearTimeout(lbOpenT);
  LB.classList.remove('open'); document.body.classList.remove('lbopen');
  const v = LB.querySelector('.media video'); if (v) { v.pause(); }
  Music.duck(false);
  setTimeout(() => { if (!LB.classList.contains('open')) { const v2 = LB.querySelector('.media video'); if (v2) { v2.removeAttribute('src'); v2.load(); } LB.querySelector('.media').innerHTML = ''; if (lbUrl) { URL.revokeObjectURL(lbUrl); lbUrl = null; } } }, 500);
  S.lbIdx = -1;
}
function closeLB() {
  const c = G.cards[S.lbIdx]; closeLBNow();
  setMode('fly', c ? c.s : undefined); cam.k = 2.5;
}
function lbNav(d) {
  const i = clamp(S.lbIdx + d, 0, G.cards.length - 1); if (i === S.lbIdx) { toast(d > 0 ? 'Đây là khoảnh khắc mới nhất' : 'Đây là khoảnh khắc đầu tiên', 1500); return; }
  S.lbIdx = i; const c = G.cards[i]; focusPose(c, FO.pos, FO.look); cam.k = 2.4; renderLB(); updateNow();
}
LB.querySelector('.close').onclick = closeLB;
LB.querySelectorAll('.nav').forEach(b => b.onclick = () => lbNav(+b.dataset.nav));
LB.addEventListener('click', e => { if (e.target === LB || e.target.classList.contains('media')) closeLB(); });
{
  let sx = 0, sy = 0, on = false; const md = LB.querySelector('.media');
  md.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; on = true; sx = e.clientX; sy = e.clientY; });
  md.addEventListener('pointerup', e => { if (!on) return; on = false; const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) lbNav(dx < 0 ? 1 : -1); });
}
LB.querySelector('.acts').onclick = async e => {
  const b = e.target.closest('button'); if (!b) return; const c = G.cards[S.lbIdx]; if (!c) return; const m = c.m;
  if (b.dataset.act === 'edit') {
    LB.querySelector('.view').hidden = true; LB.querySelector('.edit').hidden = false;
    LB.querySelector('.e-ti').value = m.title || ''; LB.querySelector('.e-dt').value = ymd(m.ts); LB.querySelector('.e-nt').value = m.note || '';
    LB.querySelector('.e-ti').focus();
  } else if (b.dataset.act === 'save') saveOriginal(m);
  else if (b.dataset.act === 'del') {
    if (!(await ask('Xoá khoảnh khắc này?', `“${m.title || dmy(m.ts)}” sẽ bị xoá khỏi máy này. Không hoàn tác được.`, 'Xoá', true))) return;
    m.deleted = Date.now(); await dbPut('moments', m);
    const i = S.lbIdx; S.all = S.all.filter(x => x.id !== m.id); refreshKid(); undoToast('Đã chuyển vào thùng rác', () => restoreMoments([m]));
    closeLBNow(); buildGalaxy(); buildScrub();
    if (G.cards.length) { const j = clamp(i, 0, G.cards.length - 1); setMode('fly', G.cards[j].s); } else setMode('fly', G.star.it.s);
    toast('Đã xoá khoảnh khắc');
  }
};
LB.querySelector('.edit').onclick = async e => {
  const b = e.target.closest('button'); if (!b) return; const c = G.cards[S.lbIdx]; if (!c) return; const m = c.m;
  if (b.dataset.act === 'cancel') { LB.querySelector('.view').hidden = false; LB.querySelector('.edit').hidden = true; return; }
  if (b.dataset.act !== 'ok') return;
  const ts = parseYmd(LB.querySelector('.e-dt').value, m.ts);
  if (!ts) { toast('Bạn chọn ngày nhé'); return; }
  const moved = dayStart(ts) !== dayStart(m.ts);
  m.title = LB.querySelector('.e-ti').value.trim(); m.note = LB.querySelector('.e-nt').value.trim(); m.ts = ts; if (moved) m.dateSrc = 'user';
  await dbPut('moments', m);
  if (moved) {
    closeLBNow(); buildGalaxy(); buildScrub();
    const nc = G.cards.find(x => x.m.id === m.id); if (nc) openLB(nc.i);
    toast('Đã lưu — khoảnh khắc đã về đúng chỗ trên dòng thời gian');
  } else { Stream.refresh(c); renderLB(); toast('Đã lưu'); }
};
async function saveOriginal(m) {
  const b = await dbGet('blobs', 'o_' + m.id); if (!b) return toast('Không tìm thấy tệp gốc');
  const ext = (m.name && m.name.includes('.')) ? '' : '.' + ((b.type.split('/')[1] || 'bin').replace('quicktime', 'mov').replace('jpeg', 'jpg'));
  const name = m.name || `khoanh-khac-${ymd(m.ts)}${ext}`;
  await shareOrDownload(new File([b], name, { type: b.type }), name);
}
async function shareOrDownload(file, name) {
  if (TEST) { window.T && (T.lastDownload = file); return; }
  if (MOBILE && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}

// ---------- Thêm ảnh, video ----------
const ADD = { rows: [], busy: false, pending: 0, kids: [] };
const okFile = f => /^(image|video)\//.test(f.type) || /\.(heic|heif|jpe?g|png|webp|gif|mov|mp4|m4v|webm|3gp)$/i.test(f.name);
function renderAddKids() {
  const box = $('#addKids'); if (!box) return; box.hidden = S.kids.length < 2;
  box.innerHTML = `<span>Ảnh của:</span>` + S.kids.map(k => `<button data-k="${k.id}" class="${ADD.kids.includes(k.id) ? 'on' : ''}" style="--c:${k.color}"><img src="${P.avatarNow(k)}" alt="">${esc(cap(k.name))}</button>`).join('');
}
function openAdd(opt = {}) {
  if (!S.kid) return;
  if (!ADD.rows.length) ADD.kids = LIFE() ? [ME().id] : S.family ? [] : [S.kid.id]; renderAddKids();
  if (opt.approx) { ADD.ao = { on: true, prec: opt.approx.prec || 'y', y: opt.approx.y, x: null }; aoUi(); } else if (!ADD.rows.length) { ADD.ao = { on: false, prec: 'y', y: null, x: null }; aoUi(); }
  if (S.mode === 'show') stopShow();
  openModal($('#mAdd')); refreshAddBtn();
}
// ảnh cũ chụp lại từ ảnh giấy: cả đợt dùng ngày ước chừng (năm / mùa / tháng)
ADD.ao = { on: false, prec: 'y', y: null, x: null };
function aoFill() { const p = ADD.ao.prec, sel = $('#aoX'); sel.hidden = p === 'y'; if (p === 's') sel.innerHTML = SEASONS.map(q => `<option value="${q.k}">${q.t}</option>`).join(''); else if (p === 'm') sel.innerHTML = Array.from({ length: 12 }, (_, i) => `<option value="${i}">Tháng ${i + 1}</option>`).join(''); if (ADD.ao.x != null && [...sel.options].some(o => o.value === String(ADD.ao.x))) sel.value = ADD.ao.x; ADD.ao.x = p === 'y' ? null : sel.value; }
function aoUi() {
  const a = ADD.ao; $('#aoOn').checked = a.on; $('#aoG').hidden = !a.on; $$('#aoP button').forEach(b => b.classList.toggle('on', b.dataset.v === a.prec)); $('#aoY').value = a.y || ''; aoFill(); aoApply();
}
function aoTs() { const a = ADD.ao, y = +a.y; return a.on && y >= 1850 && y <= new Date().getFullYear() ? approxTs(a.prec, y, a.x) : null; }
function aoApply() {
  const t = aoTs(); $('#aoL').textContent = ADD.ao.on ? (t ? `Các ảnh đợt này xếp vào: ${approxLabel(ADD.ao.prec, t, true)}` : 'Nhập năm (4 chữ số) để app xếp ảnh vào đúng chỗ') : '';
  ADD.rows.forEach((r, i) => { if (!r.ready) return; const bd = r.el.querySelector('.badge');
    if (t) { if (r.ts0 == null) { r.ts0 = r.ts; r.src0 = r.src; } r.ts = t + i * 1000; r.approx = ADD.ao.prec; r.src = 'approx'; r.el.classList.add('apx'); r.el.querySelector('.r-dt').value = ymd(r.ts); bd.className = 'badge'; bd.textContent = 'ước chừng · ' + approxLabel(r.approx, r.ts, true); }
    else if (r.approx) { r.ts = r.ts0; r.src = r.src0; delete r.approx; r.el.classList.remove('apx'); r.el.querySelector('.r-dt').value = ymd(r.ts); bd.className = 'badge'; bd.textContent = 'ngày chụp như cũ'; }
    rowAge(r); });
  if (ADD.rows.length) setTimeout(regroupAdd, 30);
}
$('#aoOn').onchange = e => { ADD.ao.on = e.target.checked; haptic(5); aoUi(); if (ADD.ao.on) setTimeout(() => $('#aoY').focus(), 80); };
$('#aoP').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; ADD.ao.prec = b.dataset.v; ADD.ao.x = null; aoUi(); };
$('#aoY').addEventListener('input', e => { ADD.ao.y = e.target.value.replace(/\D/g, '').slice(0, 4); aoApply(); });
$('#aoX').onchange = e => { ADD.ao.x = e.target.value; aoApply(); };
// hộp chọn ngày ước chừng dùng chung (sự kiện, ảnh lẻ, chọn nhiều)
function pickApprox({ title, ts, approx } = {}) {
  const M = $('#mApx'), d = new Date(ts || Date.now()); let prec = approx || 'y';
  M.querySelector('.ax-t').textContent = title || 'Ngày ước chừng'; $('#axY').value = d.getFullYear(); $('#axD').value = ymd(d.getTime());
  const fill = () => { $$('#axP button').forEach(b => b.classList.toggle('on', b.dataset.v === prec)); $('#axXF').hidden = prec === 'y' || prec === 'd'; $('#axYF').hidden = prec === 'd'; $('#axDF').hidden = prec !== 'd';
    $('#axXL').textContent = prec === 's' ? 'Mùa' : 'Tháng'; const sel = $('#axX');
    if (prec === 's') { sel.innerHTML = SEASONS.map(q => `<option value="${q.k}">${q.t}</option>`).join(''); sel.value = SEASONS.find(q => Math.abs(q.m - d.getMonth()) <= 1)?.k || 'ha'; }
    else if (prec === 'm') { sel.innerHTML = Array.from({ length: 12 }, (_, i) => `<option value="${i}">Tháng ${i + 1}</option>`).join(''); sel.value = d.getMonth(); } hint(); };
  const val = () => { if (prec === 'd') { const t = parseYmd($('#axD').value); return t ? { prec, day: $('#axD').value, ts: t } : null; } const y = +$('#axY').value; if (!(y >= 1850 && y <= new Date().getFullYear() + 1)) return null; const t = approxTs(prec, y, prec === 'y' ? null : prec === 'm' ? +$('#axX').value : $('#axX').value); return { prec, ts: t, y }; };
  const hint = () => { const v = val(); $('#axH').textContent = v ? (v.prec === 'd' ? fmtLong(v.ts) : 'Xếp vào: ' + approxLabel(v.prec, v.ts, true)) : 'Nhập năm (4 chữ số)'; };
  fill(); openModal(M);
  return new Promise(res => {
    const done = v => { ob.disconnect(); $('#axP').onclick = $('#axOk').onclick = null; $('#axY').oninput = $('#axX').onchange = $('#axD').oninput = null; M.classList.remove('open'); res(v); };
    $('#axP').onclick = e => { const b = e.target.closest('[data-v]'); if (b) { prec = b.dataset.v; haptic(5); fill(); } };
    $('#axY').oninput = hint; $('#axX').onchange = hint; $('#axD').oninput = hint;
    $('#axOk').onclick = () => { const v = val(); if (!v) { toast('Bạn nhập năm (4 chữ số) nhé', 1800); return; } done(v); };
    const ob = new MutationObserver(() => { if (!M.classList.contains('open')) done(null); }); ob.observe(M, { attributes: true });
  });
}
function resetAdd() { if ($('#addGrp')) $('#addGrp').value = ''; ADD.day = null; if ($('#addDay')) { $('#addDay').value = ''; $('#addDayH').textContent = ''; } for (const r of ADD.rows) if (r.url) URL.revokeObjectURL(r.url); ADD.rows = []; ADD.ao = { on: false, prec: 'y', y: null, x: null }; aoUi(); $('#addList').innerHTML = ''; $('#addProg').style.display = 'none'; $('#addProg i').style.width = 0; refreshAddBtn(); }
function refreshAddBtn() {
  { const days = new Set(ADD.rows.filter(r => r.ready && !r.bad).map(r => ymd(r.ts))), box = $('#addGrpBox'); box.hidden = days.size < 2 && !$('#addGrp').value; const ts = ADD.rows.filter(r => r.ready && !r.bad).map(r => r.ts).sort((a, b) => a - b); box.querySelector('.addgrp-s').textContent = ts.length && days.size > 1 ? `${ts.length} ảnh · ${days.size} ngày · ${dmy(ts[0]).slice(0, 5)} – ${dmy(ts[ts.length - 1])}` : ''; }
  const b = $('#addSave'), n = ADD.rows.filter(r => !r.dup).length || (ADD.rows.some(r => r.dup) ? 1 : 0);
  b.disabled = !n || ADD.pending > 0 || ADD.busy;
  b.textContent = ADD.busy ? 'Đang lưu…' : ADD.pending ? `Đang đọc ${ADD.pending} tệp…` : n ? `Lưu ${n} khoảnh khắc vào dòng thời gian` : 'Lưu vào dòng thời gian';
}
// sau khi đọc xong cả đợt: tự căn ngày rồi xếp sẵn theo nhóm ngày (không hỏi gì)
// ?test: bảng "Chi tiết tệp" để soi tệp iPhone đưa vào (tên, loại, cỡ, lastModified, các thẻ ngày đọc được)
async function renderAddDebug() {
  if (!TEST) return; let box = $('#addDbg'); if (!box) { $('#addList').insertAdjacentHTML('afterend', '<details id="addDbg" class="dbg"><summary>🔍 Chi tiết tệp</summary><pre></pre></details>'); box = $('#addDbg'); }
  const out = [];
  for (const r of ADD.rows) { const f = r.file, m = r.isV ? null : await readMeta(f);
    out.push(`${f.name} · ${f.type || '?'} · ${fmtSize(f.size)} · lastModified ${new Date(f.lastModified).toLocaleString('vi-VN')}\n  → ${new Date(r.ts).toLocaleString('vi-VN')} [${r.src}]` + (m ? `\n  EXIF: ${m.exif.map(x => `gốc=${x.orig || '-'} số hoá=${x.digi || '-'} sửa=${x.dt || '-'}${x.off ? ' ' + x.off : ''}`).join(' | ') || 'không có'} · XMP: ${m.xmp || '-'}` : `\n  video: ${f.vdSrc || 'creationdate'}`)); }
  box.querySelector('pre').textContent = out.join('\n\n');
}
function regroupAdd() {
  if (TEST) setTimeout(renderAddDebug, 0);
  if (ADD.pending) return;
  alignDates(ADD.rows);
  const rows = ADD.rows.filter(r => r.ready || r.bad).sort((a, b) => (a.ts || 0) - (b.ts || 0)), list = $('#addList');
  list.querySelectorAll('.add-day').forEach(x => x.remove());
  let day = null, n = 0;
  for (const r of rows) {
    const d = r.ts ? ymd(r.ts) : '';
    if (d !== day) { day = d; const cnt = rows.filter(x => x.ts && ymd(x.ts) === d).length; const ev = TL.events.find(e => e.days.includes(d)); list.insertAdjacentHTML('beforeend', `<div class="add-day">${icon('calendar', 15)}<b>${d ? (r.approx ? approxLabel(r.approx, r.ts) : fmtLong(r.ts)) : 'Chưa rõ ngày'}</b><span>${cnt} ảnh${ev ? ` · vào “${esc(ev.title)}”` : ' · ngày mới'}</span></div>`); n++; }
    list.appendChild(r.el);
    if (r.src === 'align') { const bd = r.el.querySelector('.badge'); bd.className = 'badge'; bd.innerHTML = icon('sparkle', 12, 2) + '<span>ngày tự căn theo ảnh cùng đợt</span>'; r.el.querySelector('.r-dt').value = ymd(r.ts); rowAge(r); }
    else if (r.src === 'name') { const bd = r.el.querySelector('.badge'); bd.textContent = 'ngày từ tên tệp'; }
  }
}
function rowAge(r) { r.el.querySelector('.age').textContent = ageText(S.kid, r.ts); }
// ---------- chống nhập trùng: dấu vân tay = cỡ tệp + băm 64 KB đầu và 64 KB cuối ----------
async function fingerprint(blob) {
  const n = 65536, a = new Uint8Array(await blob.slice(0, n).arrayBuffer()), b = blob.size > n ? new Uint8Array(await blob.slice(Math.max(n, blob.size - n)).arrayBuffer()) : new Uint8Array(0);
  let h = 0x811c9dc5; for (const arr of [a, b]) for (let i = 0; i < arr.length; i++) { h ^= arr[i]; h = Math.imul(h, 16777619) >>> 0; }
  return blob.size + ':' + h.toString(36);
}
async function fpOf(m) { if (m.fp) return m.fp; const o = await dbGetRaw('blobs', 'o_' + m.id); if (!o) return null; m.fp = await fingerprint(o); try { await dbPut('moments', m); } catch (e) { } return m.fp; }
// trùng hẳn (cùng dấu vân tay) hoặc gần như chắc trùng (cùng loại, cùng cỡ khung hình, cùng giây chụp đọc từ EXIF, cùng thời lượng video)
async function findDup(r) {
  const live = (S.all || []).filter(m => !m.deleted);
  for (const m of live) if ((m.size || 0) === r.file.size && await fpOf(m) === r.fp) return { m, sure: true };
  if (r.src === 'meta' && r.th?.w) for (const m of live) if (m.type === (r.isV ? 'video' : 'image') && m.w === r.th.w && m.h === r.th.h && Math.abs(m.ts - r.ts) < 1000 && (!r.isV || Math.abs((m.dur || 0) - (r.th.dur || 0)) < .2)) return { m, sure: false };
  for (const o of ADD.rows) if (o !== r && o.ready && !o.dup && o.fp === r.fp) return { m: null, sure: true, batch: true };
  return null;
}
function markDup(r, d) {
  r.dup = !!d; const el = r.el; el.classList.toggle('dup', r.dup); let b = el.querySelector('.dupb');
  if (!r.dup) { b?.remove(); return; }
  if (!b) { b = document.createElement('div'); b.className = 'dupb'; el.querySelector('.ln').after(b); }
  b.innerHTML = `${icon('check', 14, 2)}<span>${d.batch ? 'Trùng với một tệp khác trong đợt này' : d.sure ? 'Đã có trong app' : 'Có vẻ đã có trong app'}${d.m ? ` (ngày ${dmy(d.m.ts)})` : ''} · sẽ bỏ qua</span><button type="button">Vẫn thêm</button>`;
  b.querySelector('button').onclick = () => { r.dup = false; r.forced = true; el.classList.remove('dup'); b.remove(); refreshAddBtn(); };
}
// dọn các bản trùng đã lỡ thêm: giữ bản nằm trong nhóm/nhật ký hoặc bản thêm sớm nhất, bản thừa vào thùng rác (có hoàn tác)
async function findDuplicates(silent) {
  const live = (S.all || []).filter(m => !m.deleted), bySize = new Map();
  for (const m of live) { const k = m.size || 0; if (!k) continue; if (!bySize.has(k)) bySize.set(k, []); bySize.get(k).push(m); }
  const groups = new Map(); let n = 0;
  for (const [, list] of bySize) { if (list.length < 2) continue; for (const m of list) { const f = await fpOf(m); if (!f) continue; if (!groups.has(f)) groups.set(f, []); groups.get(f).push(m); } }
  const inUse = new Set([...(S.groups || []).flatMap(g => g.momentIds), ...(S.allDiaries || []).flatMap(d => d.pages.flatMap(p => p.panels.map(q => q.mid)))]);
  const extra = [];
  for (const [, list] of groups) { if (list.length < 2) continue; list.sort((a, b) => (inUse.has(b.id) - inUse.has(a.id)) || (a.created || 0) - (b.created || 0)); extra.push(...list.slice(1)); n++; }
  if (TEST) T.lastDup = extra.map(m => m.id);
  if (!extra.length) { if (!silent) toast('Không có ảnh, video nào bị trùng 👍', 2400); return 0; }
  if (silent) return extra.length;
  if (!(await ask(`Tìm thấy ${extra.length} bản trùng`, `${n} ảnh/video bị lưu hơn một lần. App giữ 1 bản (ưu tiên bản đang ở nhóm/nhật ký), các bản thừa vào thùng rác 30 ngày — khôi phục được.`, `Dọn ${extra.length} bản thừa`))) return 0;
  await trashMoments(extra, `Đã dọn ${extra.length} bản trùng`); return extra.length;
}
async function addFiles(list) {
  const files = [...list].filter(okFile);
  if (!files.length) { toast('Chỉ nhận ảnh hoặc video thôi nhé'); return; }
  if (!$('#mAdd').classList.contains('open')) openAdd();
  let heic = 0;
  for (const f of files) {
    const isV = /^video\//.test(f.type) || /\.(mov|mp4|m4v|webm|3gp)$/i.test(f.name);
    const el = document.createElement('div'); el.className = 'row-add';
    el.innerHTML = `<div class="th"><span class="pl">⏳</span></div><div><input class="r-ti" maxlength="80" placeholder="Đặt tên (không bắt buộc)"><div class="ln"><input class="r-dt" type="date"><span class="age"></span><span class="badge" style="display:none"></span></div></div>`;
    $('#addList').appendChild(el); el.style.animationDelay = Math.min(ADD.rows.length, 8) * .05 + 's';
    const r = { file: f, isV, el, ts: 0, src: '', th: null, url: null, ready: false }; ADD.rows.push(r); ADD.pending++; refreshAddBtn();
    try {
      const [dt, th, gp] = await Promise.all([readDate(f, isV), isV ? videoThumb(f) : imageThumb(f), readGps(f, isV)]); r.gps = gp;
      r.ts = dt.ts; r.src = dt.src; r.th = th; r.url = URL.createObjectURL(th.blob);
      el.querySelector('.th').style.backgroundImage = `url("${r.url}")`;
      el.querySelector('.pl').textContent = isV ? '▶ ' + fmtDur(th.dur) : '';
      const bd = el.querySelector('.badge'); bd.style.display = '';
      const heicNo = !isV && !th.ok && isHeic(f);
      if (heicNo) heic++;
      if (heicNo) { bd.className = 'badge warn'; bd.textContent = 'HEIC · mở bằng Safari để xem'; }
      else if (r.src === 'meta') { bd.className = 'badge'; bd.textContent = 'ngày chụp tự đọc'; }
      else if (r.src === 'name') { bd.className = 'badge'; bd.textContent = 'ngày đọc từ tên tệp'; }
      else { bd.className = 'badge file'; bd.innerHTML = icon('warn', 13, 2.2) + '<span>ngày lưu tệp – kiểm tra lại</span>'; }
      if (ADD.day && ymd(r.ts) !== ADD.day) { r.ts = parseYmd(ADD.day, r.ts); r.src = 'user'; bd.className = 'badge'; bd.textContent = 'đặt theo ngày của sự kiện'; }
      el.querySelector('.r-dt').value = ymd(r.ts); rowAge(r);
      try { r.fp = await fingerprint(f); markDup(r, await findDup(r)); } catch (e) { }
      el.querySelector('.r-dt').addEventListener('change', e => { const t = parseYmd(e.target.value, r.ts); if (t) { r.ts = t; r.src = 'user'; rowAge(r); setTimeout(regroupAdd, 50); const b2 = el.querySelector('.badge'); b2.className = 'badge'; b2.textContent = 'bạn đã chỉnh ngày'; } });
      r.ready = true; if (ADD.ao.on && aoTs()) aoApply();
    } catch (e) { console.warn(e); el.querySelector('.pl').textContent = '⚠️'; r.bad = true; }
    ADD.pending--; refreshAddBtn();
  }
  regroupAdd();
  if (heic) toast(`Có ${heic} ảnh HEIC: vẫn được lưu đủ, mở bằng Safari để xem rõ`, 4200);
}
$('#drop').onclick = () => $('#fileIn').click();
$('#fileIn').onchange = e => { const f = e.target.files; if (f?.length) addFiles(f); e.target.value = ''; };
['dragover', 'dragenter'].forEach(ev => $('#drop').addEventListener(ev, e => { e.preventDefault(); $('#drop').classList.add('over'); }));
$('#drop').addEventListener('dragleave', () => $('#drop').classList.remove('over'));
{
  let depth = 0; const has = e => [...(e.dataTransfer?.types || [])].includes('Files');
  addEventListener('dragenter', e => { if (!has(e) || !S.kid) return; e.preventDefault(); depth++; if (!$('#mAdd').classList.contains('open')) $('#dropAll').classList.add('on'); });
  addEventListener('dragover', e => { if (has(e)) e.preventDefault(); });
  addEventListener('dragleave', e => { if (!has(e)) return; depth = Math.max(0, depth - 1); if (!depth) $('#dropAll').classList.remove('on'); });
  addEventListener('drop', e => { if (!has(e)) return; e.preventDefault(); depth = 0; $('#dropAll').classList.remove('on'); $('#drop').classList.remove('over'); if (S.kid && e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });
}
$('#addSave').onclick = saveAdd;
async function saveAdd() {
  const rows = ADD.rows.filter(r => r.ready && !r.bad && !r.dup); if (!rows.length || ADD.busy) { if (!ADD.busy && ADD.rows.some(r => r.dup)) { toast('Các tệp này đã có trong app rồi — không cần thêm lại', 2600); $('#mAdd').classList.remove('open'); resetAdd(); } return; }
  if (!ADD.kids.length) { const ks = $('#addKids'); ks.classList.remove('need'); void ks.offsetWidth; ks.classList.add('need'); toast(ME() ? 'Ảnh này có ai? Chạm avatar để chọn nhé' : 'Ảnh này của bé nào? Chạm avatar để chọn nhé', 2600); return; }
  ADD.gname = ($('#addGrp')?.value || '').trim(); ADD.busy = true; refreshAddBtn(); $('#addProg').style.display = 'block';
  await askPersist();
  const ids = [];
  try {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i], id = uid(), f = r.file;
      await dbPut('blobs', f, 'o_' + id);
      await dbPut('blobs', r.th.blob, 't_' + id);
      const m = { id, fp: r.fp, tv: 2, kidId: ADD.kids[0], kidIds: ADD.kids.slice(), ts: r.ts, ...(r.approx ? { approx: r.approx, dateSrc: 'approx' } : {}), ...(r.gps ? { gps: r.gps } : {}), title: r.el.querySelector('.r-ti').value.trim(), note: '', type: r.isV ? 'video' : 'image', mime: f.type || '', name: f.name || '', size: f.size, dur: r.th.dur || 0, w: r.th.w, h: r.th.h, color: r.th.color, heic: !r.isV && !r.th.ok && isHeic(f), dateSrc: r.src, created: Date.now() + i };
      await dbPut('moments', m); S.all.push(m); ids.push(id);
      $('#addProg i').style.width = ((i + 1) / rows.length * 100) + '%';
    }
  } catch (e) {
    console.error(e); toast(/quota/i.test(e?.name + e?.message) ? 'Máy hết chỗ trống — bạn xoá bớt hoặc sao lưu rồi dọn máy nhé' : 'Lưu chưa được: ' + (e?.message || e), 5000);
  }
  ADD.busy = false; $('#mAdd').classList.remove('open'); resetAdd(); refreshKid();
  if (!ids.length) return;
  buildGalaxy(); buildScrub();
  const news = S.all.filter(m => ids.includes(m.id)), target = news.reduce((a, b) => b.ts > a.ts ? b : a, news[0]);
  leaveIntro(true); closeLBNow(); if (S.mode !== 'tl') exitGalaxy();
  TL.refreshAll(null, ids); const k = target && TL.keyOfMid(target.id); if (k) setTimeout(() => TL.scrollToKey(k, { bounce: false }), 120);
  const own = news.length ? kidsOf(news[0]).map(id => cap(S.kids.find(x => x.id === id)?.name)).filter(Boolean).join(', ') : '';
  const evs = [...new Set(news.map(m => TL.keyOfMid(m.id)).filter(Boolean))].map(k2 => TL.events.find(e => e.key === k2)).filter(Boolean);
  const gname = ADD.gname; ADD.gname = '';
  if (gname) { const g = { id: 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), kidIds: [...new Set(news.flatMap(kidsOf))], name: gname, note: '', cover: null, momentIds: news.slice().sort((a, b) => a.ts - b.ts).map(m => m.id), created: Date.now() };
    S.groups = [...(S.groups || []), g]; await metaSet('groups', S.groups); TL.render(); setTimeout(() => TL.scrollToKey('g:' + g.id), 200); toast(`Đã tạo nhóm “${gname}” · ${TL.spanTxt(news)}`, 3200); setTimeout(() => maybeRemindBackup(ids.length), 3600); updateNow(); return; }
  if (TL.suggestGroup(ids)) { updateNow(); setTimeout(() => maybeRemindBackup(ids.length), 8500); return; }
  const e1 = evs.length === 1 ? evs[0] : null, named = e1 && (TL.meta?.titles?.[e1.key] || e1.group);
  if (e1 && !named) undoToast(`Đã thêm ${ids.length} ảnh vào ngày ${dmy(e1.ts0).slice(0, 5)} · Đặt tên?`, async () => { const t = await prompt2(`Đặt tên cho ngày ${dmy(e1.ts0)}`, '', 60); if (t?.trim()) { await TL.setTitle(e1.key, t.trim()); toast('Đã đặt tên “' + t.trim() + '”', 1600); } }, 6500, { label: 'Đặt tên', icon: 'edit' });
  else toast(evs.length === 1 ? `Đã thêm ${ids.length} ảnh vào “${evs[0].title}”` : evs.length > 1 ? `Đã thêm ${ids.length} ảnh vào ${evs.length} ngày` : `Đã thêm ${ids.length} khoảnh khắc vào dải của ${own}`, 2800);
  updateNow(); setTimeout(() => maybeRemindBackup(ids.length), e1 && !named ? 7000 : 0);
}

// nhập ảnh không qua hộp Thêm (dùng cho nhật ký): vẫn đọc ngày giờ chụp, làm ảnh nhỏ, lưu thành khoảnh khắc
async function importFilesQuiet(files, onProg, day, kids) {
  kids = kids?.length ? kids : [S.kid.id];
  const list = [...files].filter(okFile), ids = []; await askPersist();
  // bước 1: đọc ngày của cả đợt, tự căn ngày cho ảnh chỉ có ngày lưu tệp
  const rows = [];
  for (const f of list) { const isV = /^video\//.test(f.type) || /\.(mov|mp4|m4v|webm|3gp)$/i.test(f.name); const dt = await readDate(f, isV); rows.push({ file: f, isV, ts: dt.ts, src: dt.src, ready: true }); }
  alignDates(rows);
  // bước 2: ảnh nhỏ + lưu
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i], f = r.file, isV = r.isV, fp = await fingerprint(f);
    { const live = (S.all || []).filter(m => !m.deleted); let hit = null; for (const m of live) if ((m.size || 0) === f.size && await fpOf(m) === fp) { hit = m; break; } if (hit) { ids.push(hit.id); onProg?.(i + 1, rows.length); continue; } } // đã có thì dùng lại, không lưu bản thứ hai
    const th = isV ? await videoThumb(f) : await imageThumb(f), dt = { ts: r.ts, src: r.src };
    if (day && ymd(dt.ts) !== day) { dt.ts = parseYmd(day, dt.ts); dt.src = 'user'; }
    const id = uid();
    await dbPut('blobs', f, 'o_' + id); await dbPut('blobs', th.blob, 't_' + id);
    const m = { id, fp, tv: 2, kidId: kids[0], kidIds: kids.slice(), ts: dt.ts, title: '', note: '', type: isV ? 'video' : 'image', mime: f.type || '', name: f.name || '', size: f.size, dur: th.dur || 0, w: th.w, h: th.h, color: th.color, heic: !isV && !th.ok && isHeic(f), dateSrc: dt.src, created: Date.now() + i };
    await dbPut('moments', m); S.all.push(m); ids.push(id); onProg?.(i + 1, rows.length);
  }
  refreshKid();
  buildGalaxy(); buildScrub(); updateNow(); TL.render();
  return ids;
}
async function diaryChanged() {
  if (!S.kid) return;
  const ds = await dbAll('diaries'); S.allDiaries = ds.filter(d => !d.deleted); S.trashD = ds.filter(d => d.deleted); refreshKid();
  const keep = FL.s, m = S.mode;
  buildGalaxy(); buildScrub();
  if (m === 'fly' || m === 'focus') { if (m === 'focus' && S.lbIdx < 0) S.mode = 'fly'; FL.s = FL.tgt = keep; }
  updateNow(); TL.refreshAll(TL.isOpen() ? undefined : null);
}
function flyToBook(id) {
  if (S.mode === 'tl' || !document.body.classList.contains('galaxy')) { const e = TL.events.find(x => x.diaries.some(d => d.id === id)); if (e) { TL.scrollToKey(e.key); setTimeout(() => { const el = document.querySelector(`.ev[data-key="${CSS.escape(e.key)}"] .bk`); el?.animate([{ transform: 'scale(1.5)' }, { transform: 'none' }], { duration: 700, easing: getComputedStyle(document.documentElement).getPropertyValue('--sp-wobbly') || 'ease-out' }); }, 700); } return; }
  const b = (G.books || []).find(x => x.d.id === id); if (!b) return;
  leaveIntro(true); closeLBNow(); setMode('fly', b.card.s); cam.k = 2;
  setTimeout(() => { b.pop = 1; Burst.fire(b.g.position, 70, 7); }, 1300);
}

// ---------- Cài đặt ----------
async function renderSettings() {
  renderBkLast(); DRV?.renderSettings(); $('#verNow').textContent = VERSION; $('#abVer').textContent = 'Phiên bản ' + VERSION; checkUpdate(true);
  if ($('#kidNhacAll')) $('#kidNhacAll').hidden = S.kids.length < 2;
  const ms = await dbAll('moments');
    { const h = $('#kidsList').previousElementSibling; if (h) h.textContent = ME() ? 'Bạn và người thân' : 'Các bé'; $('#kidAdd span').textContent = ME() ? 'Thêm người thân' : 'Thêm bé'; }
  $('#kidsList').innerHTML = sortPeople(S.kids).map(k => `<div class="kid-row"><img src="${P.avatarNow(k)}" alt="" style="width:40px;height:40px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px ${k.color || '#ff8fbf'}"><div><div class="n">${esc(cap(k.name))}</div><div class="b">${ME() ? (isMe(k) ? 'Bạn · ' : roleName(k) + ' · ') : ''}${k.birth ? 'Sinh ' + dmy(parseYmd(k.birth)) : 'chưa có ngày sinh'} · ${ms.filter(m => !m.deleted && kidsOf(m).includes(k.id)).length} khoảnh khắc</div></div><div class="kr-acts"><button data-nhac="${k.id}"${k.birth ? '' : ' hidden'}>${icon('cake', 16)}<span>Nhắc sinh nhật</span></button><button data-prof="${k.id}">${icon('star', 16)}<span>Hồ sơ</span></button><button data-kid="${k.id}">${icon('edit', 16)}<span>Sửa</span></button></div></div>`).join('');
  $$('#segTheme button').forEach(b => b.classList.toggle('on', b.dataset.v === S.theme));
  $$('#segMusic button').forEach(b => b.classList.toggle('on', b.dataset.v === S.music));
  $('#musicHint').textContent = S.music === 'builtin' ? 'Giai điệu hộp nhạc dịu êm do app tự chơi — không lo bản quyền.' : S.music === 'file' ? `Đang dùng: ${S.musicName || 'bài của bạn'} · bấm “Bài của bạn” lần nữa để đổi bài.` : 'Trình chiếu không có nhạc.';
  $('#verTxt').textContent = 'Hành Trình Của Bạn · v' + VERSION;
  renderGem(); renderBgUi(); $('#setBig').checked = document.documentElement.classList.contains('big'); $('#setOtd').checked = !(await metaGet('otdOff'));
  try {
    const e = await navigator.storage?.estimate?.(), p = await navigator.storage?.persisted?.();
    $('#storeInfo').textContent = e ? `Đang dùng ${fmtSize(e.usage || 0)} trong máy${p ? ' · đã bật lưu bền vững ✓' : ''}.` : '';
  } catch (er) { }
}
$('#bSet').onclick = () => { renderSettings(); openModal($('#mSet')); };
$('#setOtd').onchange = async e => { await metaSet('otdOff', !e.target.checked); await TL.reload(); };
// CHẾ ĐỘ CHỮ TO (người lớn tuổi): lưu trong máy này (localStorage) để áp ngay từ lúc mở app
$('#setBig').onchange = e => { setBig(e.target.checked); toast(e.target.checked ? 'Đã bật chữ to' : 'Đã về cỡ chữ thường', 1600); };
function setBig(on) { document.documentElement.classList.toggle('big', on); try { localStorage.setItem('bigText', on ? '1' : ''); } catch (er) { } setTimeout(() => TL.render(), 50); }
try { if (localStorage.getItem('bigText')) document.documentElement.classList.add('big'); } catch (er) { }
$('#bDup').onclick = () => { $('#mSet').classList.remove('open'); findDuplicates(); };
$('#bTrash').onclick = () => { $('#mSet').classList.remove('open'); openTrash(); };
$('#trList').addEventListener('click', async e => {
  const t = e.target.closest('[data-tm]'); if (t) { const id = t.dataset.tm; if (TRSEL.has(id)) TRSEL.delete(id); else TRSEL.add(id); t.classList.toggle('on', TRSEL.has(id)); haptic(4); trBtns(); return; }
  const rk = e.target.closest('[data-rk]'); if (rk) { await restoreKid(rk.dataset.rk); openTrash(); return; }
  const rd = e.target.closest('[data-rd]'); if (rd) { const d = S.trashD.find(x => x.id === rd.dataset.rd); delete d.deleted; delete d.trashKid; await dbPut('diaries', d); await diaryChanged(); toast('Đã khôi phục nhật ký', 1500); openTrash(); }
});
$('#trRestore').onclick = async () => { const list = TRSEL.size ? S.trash.filter(m => TRSEL.has(m.id)) : S.trash.slice(); if (!list.length) return; await restoreMoments(list); openTrash(); };
$('#trPurge').onclick = async () => {
  const list = TRSEL.size ? S.trash.filter(m => TRSEL.has(m.id)) : S.trash.slice(); if (!list.length) return;
  if (!(await ask(`Xoá vĩnh viễn ${list.length} mục?`, 'Lần này xoá hẳn khỏi máy, không khôi phục được nữa.', 'Xoá vĩnh viễn', true))) { openTrash(); return; }
  for (const m of list) { await dbDel('blobs', 'o_' + m.id); await dbDel('blobs', 't_' + m.id); await dbDel('moments', m.id); } toast(`Đã xoá vĩnh viễn ${list.length} mục`, 1800); openTrash();
};
$('#bDiary').onclick = () => { leaveIntro(); if (S.mode === 'show') stopShow(); D.openList(); };
async function renderGem() { const k = await metaGet('geminiKey'); $('#gemInfo').textContent = k ? 'Đã có khoá trong máy này ✓ — nút “✨ AI viết lời” đã hiện trong trình chỉnh nhật ký.' : 'Chưa có khoá — app vẫn tự ghép lời miễn phí.'; $('#gemDel').hidden = !k; $('#gemKey').value = ''; D.setAiVisible(!!k); }
$('#gemSave').onclick = async () => { const v = $('#gemKey').value.trim(); if (!/^[\w-]{20,}$/.test(v)) { toast('Khoá trông chưa đúng — bạn dán lại nguyên khoá nhé'); return; } await metaSet('geminiKey', v); D.resetModel(); renderGem(); toast('Đã lưu khoá trong máy này ✓'); };
$('#gemDel').onclick = async () => { if (!(await ask('Xoá khoá Gemini?', 'App sẽ quay về tự ghép lời miễn phí. Bạn dán lại khoá lúc nào cũng được.', 'Xoá khoá', true))) return; await dbDel('meta', 'geminiKey'); D.resetModel(); renderGem(); toast('Đã xoá khoá'); };
$('#kidsList').onclick = e => { const nh = e.target.closest('[data-nhac]'); if (nh) { $('#mSet').classList.remove('open'); nhacFor([S.kids.find(k => k.id === nh.dataset.nhac)]); return; } const pf = e.target.closest('[data-prof]'); if (pf) { $('#mSet').classList.remove('open'); P.openProfile(dispKid(S.kids.find(k => k.id === pf.dataset.prof))); return; } const b = e.target.closest('[data-kid]'); if (!b) return; $('#mSet').classList.remove('open'); openKid(S.kids.find(k => k.id === b.dataset.kid)); };
$('#kidAdd').innerHTML = icon('plus', 16, 2.2) + '<span>Thêm bé</span>';
$('#kidAdd').insertAdjacentHTML('afterend', `<button id="kidNhacAll" style="margin-left:8px">${icon('cake', 16)}<span>Nhắc sinh nhật cả nhà</span></button>`);
$('#kidNhacAll').onclick = () => { $('#mSet').classList.remove('open'); nhacFor(S.kids); };
$('#kidNhacAll').insertAdjacentHTML('afterend', `<button id="kidShareAll">${icon('people', 16)}<span>🔗 Gửi hồ sơ bé sang máy khác</span></button><p class="hint" style="margin:6px 2px 0;font-size:12.5px;color:var(--muted)">Link chỉ chứa thông tin các bé (tên, ngày giờ sinh, avatar nhỏ), nằm sau dấu # nên không gửi lên máy chủ nào.</p>`);
$('#kidShareAll').onclick = () => shareProfiles();
$('#kidAdd').onclick = () => { $('#mSet').classList.remove('open'); openKid(null); };
$('#segTheme').onclick = e => { const b = e.target.closest('button'); if (b) { setTheme(b.dataset.v); renderSettings(); } };
$('#segMusic').onclick = async e => {
  const b = e.target.closest('button'); if (!b) return; const v = b.dataset.v;
  if (v === 'file' && (S.music === 'file' || !(await dbGet('blobs', 'music')))) { $('#musicIn').click(); return; }
  S.music = v; await metaSet('music', v); renderSettings();
  if (v === 'builtin') { Music.start('builtin'); setTimeout(() => { if (S.mode !== 'show') Music.stop(); }, 5200); toast('🎐 Nghe thử hộp nhạc…', 2500); }
};
$('#musicIn').onchange = async e => {
  const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
  await dbPut('blobs', f, 'music'); S.music = 'file'; S.musicName = f.name; await metaSet('music', 'file'); await metaSet('musicName', f.name);
  renderSettings(); toast('🎵 Đã chọn: ' + f.name);
};
$('#bExport').onclick = () => doBackup();
async function doBackup() {
  if (!S.kids.length) return;
  toast('Đang tạo bản sao lưu…', 60000);
  try {
    const blob = await buildBackup();
    const name = `NganHa-${noAccent(S.kids.map(k => k.name).join('-')) || 'sao-luu'}-${ymd(Date.now())}.nganha`;
    if (TEST) T.lastBackup = blob;
    await shareOrDownload(new File([blob], name, { type: 'application/octet-stream' }), name);
    await metaSet('lastBackup', Date.now()); await metaSet('bkSince', 0); renderBkLast();
    toast(`Đã tạo bản sao lưu (${fmtSize(blob.size)}) — cất vào Tệp / iCloud Drive cho chắc nhé`, 4200);
  } catch (er) { console.error(er); toast('Chưa tạo được bản sao lưu: ' + er.message, 5000); }
}
// ---------- cập nhật app: tải lại vỏ app mới nhất (KHÔNG đụng dữ liệu, ảnh trong IndexedDB) ----------
const UPD = { latest: null, at: 0 };
async function doUpdateApp() {
  toast('Đang tải bản mới nhất…', 8000); const done = () => location.reload();
  try {
    const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); if (reg) await reg.update();
    if (window.caches) for (const k of await caches.keys()) if (k.startsWith('nganha')) await caches.delete(k);
  } catch (e) { }
  if (TEST) { T.updated = true; return; } done();
}
const verCmp = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); return 0; };
async function checkUpdate(force) {
  if (!force && Date.now() - UPD.at < 10 * 60e3) return UPD.latest; UPD.at = Date.now();
  try { const t = await (await fetch('sw.js?v=' + Date.now(), { cache: 'no-store' })).text(); const m = /VERSION\s*=\s*'([\d.]+)'/.exec(t); if (m) UPD.latest = m[1]; } catch (e) { }
  const st = $('#updState'); if (st) { const nw = UPD.latest && verCmp(UPD.latest, VERSION) > 0; st.textContent = !UPD.latest ? 'chưa kiểm tra được (mất mạng?)' : nw ? `Có bản mới ${UPD.latest}` : 'Đã là bản mới nhất'; st.classList.toggle('new', !!nw); }
  if (UPD.latest && verCmp(UPD.latest, VERSION) > 0) showUpdBanner(UPD.latest);
  return UPD.latest;
}
function showUpdBanner(v) {
  try { if (sessionStorage.getItem('updAsked') === v) return; sessionStorage.setItem('updAsked', v); } catch (e) { }
  $('#updBan')?.remove(); const b = document.createElement('div'); b.id = 'updBan';
  b.innerHTML = `<span>✨ Có bản mới ${esc(v)}</span><button class="primary" data-u="go">Cập nhật</button><button class="later" data-u="no">Để sau</button>`;
  document.body.appendChild(b); requestAnimationFrame(() => b.classList.add('on'));
  b.onclick = e => { const a = e.target.closest('[data-u]')?.dataset.u; if (!a) return; b.classList.remove('on'); setTimeout(() => b.remove(), 400); if (a === 'go') doUpdateApp(); };
}
$('#bUpdate').onclick = () => doUpdateApp();
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkUpdate(); });
// ---------- ảnh đại diện video cũ bị đen (nhập từ bản trước trên iPhone): tạo lại trong nền, mỗi lần 1 video ----------
const RT = { q: [], busy: false, seen: new Set() };
async function thumbLum(blob) { try { const bm = await createImageBitmap(blob), c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(bm, 0, 0, 16, 16); bm.close?.(); const d = x.getImageData(0, 0, 16, 16).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; return s / 256; } catch (e) { return -1; } }
function queueThumbFix(ms) { for (const m of ms) if (m.type === 'video' && !m.deleted && m.tv !== 2 && !RT.seen.has(m.id)) { RT.seen.add(m.id); RT.q.push(m); } runThumbFix(); }
async function runThumbFix() {
  if (RT.busy) return; RT.busy = true;
  while (RT.q.length) {
    if (S.mode === 'show' || document.hidden) { await sleep(1500); continue; }
    const m = RT.q.shift(); await sleep(250);
    try {
      const t = await dbGet('blobs', 't_' + m.id), lum = t ? await thumbLum(t) : -1;
      if (lum < 0 || lum < 12) {
        const o = await dbGet('blobs', 'o_' + m.id); if (!o) continue;
        const th = await videoThumb(o.type ? o : new Blob([o], { type: /quicktime|\.mov$/i.test((m.mime || '') + m.name) ? 'video/quicktime' : 'video/mp4' }));
        if (th.ok) { await dbPut('blobs', th.blob, 't_' + m.id); m.color = th.color; if (!m.w) { m.w = th.w; m.h = th.h; } if (!m.dur) m.dur = th.dur; TL.refreshThumb?.(m.id); const c = G.cards.find(x => x.m.id === m.id); if (c) Stream.refresh(c); if (TEST) (T.fixedThumbs ||= []).push(m.id); }
        else continue; // chưa lấy được khung thật: để lần mở app sau thử lại
      }
      m.tv = 2; await dbPut('moments', m);
    } catch (e) { console.warn('tạo lại ảnh đại diện video', e); }
  }
  RT.busy = false;
}
// ---------- v1.4.1: nhắc sao lưu 1 chạm, nơi đang lưu dữ liệu, link hồ sơ bé ----------
const isStandalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
async function renderBkLast() {
  const t = await metaGet('lastBackup'), el = $('#bkLast'); if (!el) return;
  const nd = t ? Math.max(0, Math.round((Date.now() - t) / 864e5)) : 0; el.textContent = t ? `Lần sao lưu gần nhất: ${fmtLong(t)} (${nd ? nd + ' ngày trước' : 'hôm nay'})` : 'Chưa sao lưu lần nào — ảnh của bạn chỉ nằm trong máy này.';
  $('#whereData').textContent = `Dữ liệu đang lưu ở: ${isStandalone() ? 'App ở Màn hình chính' : /iP(hone|ad|od)/.test(navigator.userAgent) ? 'Safari' : 'Trình duyệt'} · ${location.host || 'tệp trong máy'}. Mỗi nơi giữ dữ liệu riêng.`;
}
async function maybeRemindBackup(added = 0) {
  if (!S.kids.length || !(S.all || []).length) return;
  const since = ((await metaGet('bkSince')) || 0) + added; if (added) await metaSet('bkSince', since);
  const last = await metaGet('lastBackup'), lastAsk = (await metaGet('bkRemind')) || 0, now = Date.now();
  const due = since >= 10 || (last ? now - last > 7 * 864e5 : (S.all.length >= 10 || now - Math.min(...S.all.map(m => m.created || now)) > 7 * 864e5));
  if (!due || now - lastAsk < 20 * 3600e3) return;
  await metaSet('bkRemind', now);
  const show = (n = 0) => { if (document.querySelector('.modal.open, .cm') || /\b(evopen|pvopen|hsopen|evshow|showing|dopen)\b/.test(document.body.className)) { if (n < 40) setTimeout(() => show(n + 1), 3000); return; } undoToast('💾 Sao lưu ngay — ảnh của bạn chỉ nằm trong máy này', () => doBackup(), 9000, { label: 'Sao lưu', icon: 'download', cls: 'bk' }); };
  setTimeout(show, added ? 2600 : 0);
}
const b64u = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode(...u8.subarray(i, i + 8192)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = t => { const s = atob(t.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((t.length + 3) % 4)); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
async function zip(u8, on) { if (!window.CompressionStream) return null; const cs = new (on ? CompressionStream : DecompressionStream)('deflate-raw'); return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(cs)).arrayBuffer()); }
async function smallAvatar(k) {
  const im = new Image(); im.src = await P.avatarURL(k); try { await im.decode(); } catch (e) { return ''; }
  const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d'), s = Math.min(im.naturalWidth, im.naturalHeight); x.drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) / 2, s, s, 0, 0, 96, 96);
  let u = c.toDataURL('image/webp', .72); if (!u.startsWith('data:image/webp')) u = c.toDataURL('image/jpeg', .72); return u;
}
async function profileLink() {
  const kids = []; for (const k of S.kids) kids.push({ id: k.id, name: k.name, role: k.role || null, since: k.since || null, wed: k.wed || null, showAge: !!k.showAge, birthLunar: k.birthLunar || null, fullName: k.fullName || null, birth: k.birth, birthTime: k.birthTime || null, place: k.place || null, weight: k.weight || null, length: k.length || null, gender: k.gender || null, color: k.color, avStyle: k.avStyle || 0, av: k.avatar ? await smallAvatar(k) : '' });
  const raw = new TextEncoder().encode(JSON.stringify({ v: 1, kids })), z = await zip(raw, true);
  return location.origin + location.pathname + (TEST ? location.search : '') + '#hoso=' + (z ? 'z' + b64u(z) : 'j' + b64u(raw));
}
async function shareProfiles() {
  const url = await profileLink(); if (TEST) T.lastProfileLink = url;
  const text = `Hồ sơ ${S.kids.map(k => cap(k.name)).join(', ')} trên Hành Trình Của Bạn — mở link này ở máy/ứng dụng khác để khỏi nhập lại.`;
  if (!TEST && navigator.share && MOBILE) { try { await navigator.share({ title: 'Hồ sơ bé · Hành Trình Của Bạn', text, url }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(url); toast('Đã chép link hồ sơ bé — dán vào ô “Dán link hồ sơ” ở máy kia nhé (link chỉ chứa thông tin bé, không có ảnh)', 4200); }
  catch (e) { prompt2('Chép link hồ sơ bé', url, 4000); }
}
async function readProfileLink(text) {
  const m = /#hoso=([zj])([\w-]+)/.exec(text || ''); if (!m) return null;
  let u8 = unb64u(m[2]); if (m[1] === 'z') u8 = await zip(u8, false); return JSON.parse(new TextDecoder().decode(u8));
}
async function importProfiles(text) {
  let data; try { data = await readProfileLink(text); } catch (e) { toast('Link hồ sơ bị hỏng hoặc thiếu — bạn chép lại cả đường link nhé', 4000); return false; }
  if (!data?.kids?.length) return false;
  if (location.hash.includes('hoso=')) history.replaceState(null, '', location.pathname + location.search);
  const have = await dbAll('kids'), fresh = data.kids.filter(k => !have.some(h => !h.deleted && (h.id === k.id || (cap(h.name) === cap(k.name) && h.birth === k.birth))));
  if (!fresh.length) { toast('Các bé trong link này đã có sẵn trong app rồi', 3000); return false; }
  const line = fresh.map(k => `${cap(k.name)}${k.fullName ? ` (${k.fullName})` : ''}${k.birth ? `, sinh ${dmy(parseYmd(k.birth))}` : ''}`).join('; ');
  if (!(await ask(fresh.length > 1 ? `Thêm ${fresh.length} bé?` : `Thêm 1 bé: ${line}?`, fresh.length > 1 ? line : 'Thông tin bé lấy từ link hồ sơ — ảnh, video không đi kèm (mở bản sao lưu để có ảnh).', 'Đồng ý'))) return false;
  for (const k of fresh) {
    const { av, ...kk } = k; kk.created = Date.now(); kk.avatar = 0;
    if (av) { try { const b = await (await fetch(av)).blob(); await dbPut('blobs', b, 'av_' + kk.id); kk.avatar = Date.now(); } catch (e) { } }
    await dbPut('kids', kk); await metaSet('gAsk:' + kk.id, 1); await metaSet('nameSplit:' + kk.id, { old: kk.name, ts: Date.now() });
  }
  S.kids = (await dbAll('kids')).filter(k => !k.deleted).sort((a, b) => (a.created || 0) - (b.created || 0)); await P.warm(S.kids);
  $('#mKid').classList.remove('open'); document.body.classList.remove('intro'); leaveIntro(true);
  await selectKid(S.kid?.id || fresh[0].id, true); renderSettings();
  toast(`Đã thêm ${fresh.map(k => cap(k.name)).join(', ')} — không cần nhập lại`, 3200); return true;
}
// v1.6.0: mời người dùng cũ tạo hồ sơ "Tôi" — banner nhỏ, bỏ qua được, không bắt khai lại gì
function meBanner() {
  $('#gban')?.remove(); const b = document.createElement('div'); b.id = 'gban'; b.className = 'meban';
  b.innerHTML = `<span class="mb-ic">✨</span><b>Mới: Hành Trình Của Bạn <small style="display:block;font-weight:600;color:var(--muted)">Tạo hồ sơ của chính bạn để xếp mọi kỷ niệm vào cuộc đời bạn, chia thành từng chương. ${S.kids.length > 1 ? 'Các bé' : esc(cap(S.kids[0]?.name || 'Bé'))} thành người thân vai trò Con — ảnh, nhật ký giữ nguyên.</small></b><button data-m="1" class="mb-go">Tạo hồ sơ của tôi</button><button class="later" data-m="">Để sau</button>`;
  document.body.appendChild(b); requestAnimationFrame(() => b.classList.add('on'));
  b.onclick = async e => { const t = e.target.closest('[data-m]'); if (!t) return; await metaSet('meAsk', Date.now()); b.classList.remove('on'); setTimeout(() => b.remove(), 400); if (t.dataset.m) createMe(false); else toast('Lúc nào muốn, bạn mở menu tên ở góc trên › “Tạo hồ sơ của tôi”', 3200); };
}
// hỏi giới tính bằng banner nhỏ (không chặn màn hình), có "Để sau"
function genderBanner(k) {
  $('#gban')?.remove(); const b = document.createElement('div'); b.id = 'gban';
  b.innerHTML = `<img src="${P.avatarNow(dispKid(k))}" alt=""><b>${esc(cap(k.name))} là bé trai hay bé gái? <small style="font-weight:600;color:var(--muted)">để chọn màu & avatar</small></b><button data-g="m">Bé trai</button><button data-g="f">Bé gái</button><button class="later" data-g="">Để sau</button>`;
  document.body.appendChild(b); requestAnimationFrame(() => b.classList.add('on'));
  b.onclick = async e => { const t = e.target.closest('[data-g]'); if (!t) return; await metaSet('gAsk:' + k.id, 1); b.classList.remove('on'); setTimeout(() => b.remove(), 400);
    const g = t.dataset.g; if (!g) return; k.gender = g; if (!k.avatar) k.color = defaultColor(g, S.kids.filter(x => x !== k).map(x => x.color)); await dbPut('kids', k); await P.warm([k]); renderKidBtn(); TL.render(); buildGalaxy(); };
}
$('#bImport').onclick = () => $('#importIn').click();
$('#importIn').onchange = async e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) await doImport(f); };
async function doImport(f) {
  toast('Đang mở bản sao lưu…', 60000);
  try {
    const r = await importBackup(f, p => toast(`Đang nhập… ${Math.round(p * 100)}%`, 60000));
    S.kids = await dbAll('kids');
    $('#mSet').classList.remove('open'); $('#mKid').classList.remove('open');
    await selectKid(S.kid?.id || S.kids[0]?.id, !S.kid);
    toast(`Đã nhập ${r.nm} khoảnh khắc${r.nd ? `, ${r.nd} nhật ký` : ''}${r.nk ? `, ${r.nk} bé` : ''}${r.skip ? ` · bỏ qua ${r.skip} cái đã có` : ''}`, 4500);
    return r;
  } catch (er) { console.error(er); toast(er.message || 'Không mở được tệp này', 5000); }
}

// ---------- Phong cách ----------
function setTheme(t, anim = true) {
  S.theme = t; document.body.dataset.theme = t; try { MAP?.setTheme(t); } catch (e) { } document.documentElement.classList.toggle('dawn', t === 'dawn'); S.mixT = t === 'dawn' ? 1 : 0; if (!anim) { S.mix = S.mixT; applyThemeMats(); }
  $('#themeIco').textContent = t === 'dawn' ? '🌌' : '🌅'; const tb = $('#tbTheme'); if (tb) { tb.innerHTML = icon(t === 'dawn' ? 'moon' : 'sun', 22, 1.9); tb.title = t === 'dawn' ? 'Đổi sang Đêm ngân hà' : 'Đổi sang Bình minh'; } $('#bTheme').title = t === 'dawn' ? 'Đổi sang Đêm ngân hà' : 'Đổi sang Bình minh';
  document.querySelector('meta[name="theme-color"]').content = t === 'dawn' ? '#fde4d6' : '#0b0a24';
  refreshLabels(); metaSet('theme', t);
}
$('#bTheme').onclick = () => { const t = S.theme === 'dawn' ? 'night' : 'dawn'; if (BG.cfg && BG.cfg.kind === 'scene') BG.cfg.kind = 'auto'; setTheme(t); applyBg(); saveBg(); toast(t === 'dawn' ? 'Bình minh' : 'Đêm ngân hà', 1400); };
$('#bOverview').onclick = () => { if (document.body.classList.contains('galaxy')) exitGalaxy(); else enterGalaxy(); };
$('#bAdd').onclick = () => { leaveIntro(); openAdd(); };
$('#bShow').onclick = () => { leaveIntro(); startShow(); };

// ---------- Trình chiếu ----------
const SH = { list: [], i: -1, phase: '', t: 0, dur: 0, hold: 0, from: null, to: null, gate: null, cur: null, camS: 0, prevS: -1e9 };
// KỂ CHUYỆN: trình chiếu có dẫn truyện cho cả đời / một chương / một người / một chuyến đi
async function startStory(o = {}) {
  if (!S.kid) return; const me = ME();
  if (o.person && !LIFE()) { /* đang xem riêng 1 người: lọc trong dải hiện tại */ }
  else if ((o.chapter || o.person || o.ids || o.life) && me && !LIFE()) await enterFamily();
  let filter = null, card = null;
  if (o.chapter) { const c = o.chapter, y0 = new Date(c.ts).getFullYear(), y1 = c.end ? new Date(c.end - 864e5).getFullYear() : new Date().getFullYear(); filter = m => m.ts >= c.ts && (!c.end || m.ts < c.end); card = { kick: `Chương ${c.num}`, title: `${c.ic} ${c.title}`, sub: y1 > y0 ? `${y0} – ${y1}` : String(y0), people: [me] }; }
  else if (o.person) { const k = o.person; filter = m => kidsOf(m).includes(k.id); card = { kick: isMe(k) ? 'Kể chuyện' : 'Kể chuyện về', title: isMe(k) ? 'Những khoảnh khắc của bạn' : cap(k.name), sub: isMe(k) ? '' : roleName(k), people: [k] }; }
  else if (o.ids) { const ids = new Set(o.ids); filter = m => ids.has(m.id); card = { kick: 'Kể chuyện', title: o.title || 'Chuyến đi', sub: o.sub || '', people: (o.people || []) }; }
  return startShow({ filter, card, birth: !filter && LIFE() && me?.birth && !me.birthApprox });
}
async function startShow(opt = {}) {
  if (!S.kid) return;
  if (!G.cards.length || (opt.filter && !G.cards.some(c => opt.filter(c.m)))) { toast(opt.filter ? 'Phần này chưa có ảnh nào để kể — thêm ảnh rồi mình cùng xem nhé' : 'Thêm vài khoảnh khắc rồi mình cùng xem nhé ✨', 3000); if (!opt.filter) openAdd(); return; }
  closeLBNow(); $('#kidMenu').hidden = true; leaveIntro(true);
  S.mode = 'show'; setRenderDpr(); document.body.classList.add('showing', 'galaxy'); hover.c = null;
  SH.list = [];
  for (const it of G.items) {
    if (it.kind === 'star') { if (!opt.filter) SH.list.push(G.stops.find(s => s.kind === 'star')); }
    else if (it.kind === 'm' && opt.filter && !opt.filter(it.m)) continue;
    else if (it.kind === 'm') { SH.list.push(G.stops.find(s => s.card === it.card)); for (const b of G.books || []) if (b.card === it.card) SH.list.push({ kind: 'book', s: b.s, book: b }); }
  }
  SH.i = -1; SH.prevS = (SH.list[0]?.s ?? 0) - 1; SH.camS = FL.s - 10; FL.camS = SH.camS;
  if (opt.card) { await startMusic(); await lifeCard(opt.card); if (S.mode === 'show') showNext(); return; }
  if (LIFE() && !opt.birth) { await startMusic(); await lifeCard(); if (S.mode === 'show') showNext(); return; }
  if (!opt.birth && (S.family || !S.kid.birth || !isChild(S.kid))) { await startMusic(); showNext(); return; }
  // đoạn mở đầu ngày sinh (chạm để bỏ qua) rồi mới bay vào dải ngân hà
  const k = dispKid(S.kid), b0 = dayStart(parseYmd(k.birth)), mine = S.moments.slice().sort((a, b) => a.ts - b.ts);
  const pick = (arr, n) => arr.length <= n ? arr : Array.from({ length: n }, (_, i) => arr[Math.round(i * (arr.length - 1) / (n - 1))]);
  const urls = async arr => (await Promise.all(arr.map(m => dbGet('blobs', 't_' + m.id)))).filter(Boolean).map(b => { const u = URL.createObjectURL(b); SH.introUrls.push(u); return u; });
  SH.introUrls = []; let musicOn = false; const run = SH.runId;
  INTRO = birthIntro({ THREE, renderer, ac: Music.audio(), mobile: MOBILE, reduced: REDUCED_M, kid: k, avatar: await P.avatarURL(k), birthTime: k.birthTime ? P.birthTimeTxt(k.birthTime) : '', stats: P.birthStats(k).filter(x => x !== k.place),
    pregUrls: await urls(pick(mine.filter(m => m.ts < b0 && m.ts >= b0 - 294 * 864e5 && m.type !== 'video'), 5)), birthUrls: await urls(pick(mine.filter(m => m.ts >= b0 && m.ts < b0 + 864e5), 7)), haptic,
    onMusic: () => { if (!musicOn) { musicOn = true; startMusic(); } },
    onDone: () => { INTRO = null; setTimeout(() => { SH.introUrls.forEach(u => URL.revokeObjectURL(u)); SH.introUrls = []; }, 3000); if (S.mode === 'show' && SH.runId === run) { if (!musicOn) { musicOn = true; startMusic(); } showNext(); } } });
}
// mở đầu trình chiếu cả đời: "Hành trình của <tên> · từ <năm sinh>" + avatar mọi người (chạm để bỏ qua)
async function lifeCard(o) {
  const me = ME(); if (!me && !o) return; const y0 = me?.birth ? me.birth.slice(0, 4) : '';
  o = o || { kick: 'Hành Trình Của Bạn', title: 'Hành trình của ' + cap(me.name), sub: y0 ? `từ ${y0}` : '', people: sortPeople(S.kids).slice(0, 9) };
  const el = document.createElement('div'); el.id = 'lifecard'; const ps = (o.people || []).filter(Boolean);
  el.innerHTML = `<div class="lc-in"><small>${esc(o.kick || '')}</small><h1>${[...o.title].map((c, i) => `<span style="animation-delay:${(.15 + i * .04).toFixed(2)}s">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('')}</h1>${o.sub ? `<p>${esc(o.sub)}</p>` : ''}<div class="lc-av">${ps.length === 1 && !ps[0].avatar ? `<span class="lc-cb">${chibiSVG(S.kids.find(x => x.id === ps[0].id) || ps[0], { w: 110 })}</span>` : ps.map((k, i) => `<img src="${P.avatarNow(k)}" alt="" style="--c:${k.color};animation-delay:${(1.1 + i * .12).toFixed(2)}s">`).join('')}</div></div>`;
  document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('on'));
  await new Promise(r => { const t = setTimeout(r, REDUCED_M ? 1800 : 4200); el.onclick = () => { clearTimeout(t); r(); }; SH.lcClose = () => { clearTimeout(t); r(); }; });
  el.classList.remove('on'); setTimeout(() => el.remove(), 600); SH.lcClose = null;
}
let INTRO = null; const REDUCED_M = matchMedia('(prefers-reduced-motion: reduce)').matches;
async function startMusic() { let blob = null; if (S.music === 'file') blob = await dbGet('blobs', 'music'); Music.start(S.music === 'file' && !blob ? 'builtin' : S.music, blob); }
let capTok = 0;
function capSet(t, s) { const c = $('#cap'); c.classList.remove('on'); const tok = ++capTok; const wait = Math.max(350, 3300 - (performance.now() - (SH.yearT || 0))); setTimeout(() => { c.querySelector('.t').textContent = t; c.querySelector('.s').textContent = s; if (S.mode === 'show' && tok === capTok) c.classList.add('on'); }, wait); }
function capOff() { capTok++; $('#cap').classList.remove('on'); }
function showYear(g) {
  if (g.shown === SH.runId) return; g.shown = SH.runId;
  const y = $('#year'); y.querySelector('.y').textContent = g.it.year; y.querySelector('.s').textContent = gateSub(g.it.year, g.it.age);
  y.classList.remove('on'); void y.offsetWidth; y.classList.add('on'); SH.yearT = performance.now();
  clearTimeout(showYear.t); showYear.t = setTimeout(() => y.classList.remove('on'), 3300);
  Burst.fire(g.g.position, 90, 10);
}
function showNext() {
  if (S.mode !== 'show') return;
  if (SH.cur?.card) stopCardVideo(SH.cur.card);
  capOff(); SH.i++;
  const from = { pos: cam.pos.clone(), look: cam.look.clone() }, to = { pos: new V3(), look: new V3() };
  let st = SH.list[SH.i];
  if (!st) { // về cổng cuối
    const P = G.portal; flyPose(P.it.s - 2, to.pos, to.look); to.look.copy(P.g.position);
    st = G.stops.find(s => s.kind === 'portal'); SH.final = true;
  } else SH.final = false;
  if (st.card) focusPose(st.card, to.pos, to.look, portrait() ? 9.2 : 7.4);
  else if (st.kind === 'star') { flyPose(st.s - 1, to.pos, to.look); to.look.copy(G.star.g.position); }
  else if (st.kind === 'book') { const g = st.book.g; tmpA.subVectors(from.pos, g.position); tmpA.y = 0; tmpA.normalize(); tmpA.y = .25; tmpA.normalize(); to.pos.copy(g.position).addScaledVector(tmpA, portrait() ? 7.5 : 6); to.look.copy(g.position); }
  const d = from.pos.distanceTo(to.pos);
  const gate = G.gates.find(g => g.it.s > Math.min(SH.prevS, st.s) && g.it.s < Math.max(SH.prevS, st.s)), gateBetween = !!gate;
  SH.gate = gate || null;
  if (gate && from.pos.distanceTo(to.pos) > 70) SH.gate = null;
  if (SH.gate) { // điểm giữa = tâm cổng, nhìn dọc theo dải → máy quay chui qua vòng sáng
    const gp = gate.g.position.clone(), tg = bandTan(gate.it.s), gl = gp.clone().addScaledVector(tg, 12);
    SH.cP = gp.clone().multiplyScalar(2).sub(from.pos.clone().add(to.pos).multiplyScalar(.5));
    SH.cL = gl.clone().multiplyScalar(2).sub(from.look.clone().add(to.look).multiplyScalar(.5));
  }
  SH.from = from; SH.to = to; SH.t = 0; SH.dur = SH.gate ? 5.2 : clamp(1.4 + d * .05, 2.2, 3.6); SH.phase = 'fly';
  SH.fromS = SH.prevS < -1e8 ? st.s - 12 : SH.prevS; SH.toS = st.s; SH.prevS = st.s; SH.cur = st; SH.lift = Math.min(6, d * .12);
  updateNow();
}
function updateShow(dt) {
  if (S.mode !== 'show') return;
  SH.t += dt;
  if (SH.phase === 'fly') {
    const p = easeIO(clamp(SH.t / SH.dur, 0, 1));
    if (SH.gate) {
      const q = 1 - p, bz = (a, c, b, o) => o.set(q * q * a.x + 2 * q * p * c.x + p * p * b.x, q * q * a.y + 2 * q * p * c.y + p * p * b.y, q * q * a.z + 2 * q * p * c.z + p * p * b.z);
      bz(SH.from.pos, SH.cP, SH.to.pos, cam.pos); bz(SH.from.look, SH.cL, SH.to.look, cam.look);
      if (p > .3 && SH.gate.shown !== SH.runId) { SH.gate.flash = 1; showYear(SH.gate); }
    } else {
      cam.pos.lerpVectors(SH.from.pos, SH.to.pos, p); cam.pos.y += Math.sin(p * Math.PI) * SH.lift;
      cam.look.lerpVectors(SH.from.look, SH.to.look, p);
    }
    SH.camS = lerp(SH.fromS, SH.toS, p) - 6;
    if (SH.t >= SH.dur) {
      SH.phase = 'hold'; SH.t = 0; const st = SH.cur;
      if (SH.final) { capOff(); P.avatarURL(dispKid(S.kid)).then(av => { if (S.mode === 'show') SH.outro = showOutro({ name: KN(), age: ageText(S.kid, Date.now(), false).replace(/^T/, 't'), avatar: av, ms: 4800 }); }); SH.hold = 4.9; }
      else if (st.kind === 'book') {
        SH.hold = 99; st.book.pop = 1; Burst.fire(st.book.g.position, 50, 6);
        D.openViewer(st.book.d.id, { auto: { flips: 3 }, onClose: () => { if (S.mode === 'show' && SH.cur === st) SH.t = SH.hold = Math.min(SH.t, 99) ; } });
      }
      else if (st.card) {
        const m = st.card.m, [t1] = cardText(m);
        { const dd = m.approx ? approxLabel(m.approx, m.ts) : dmy(m.ts), ev = TL.events.find(e => e.ms.includes(m)) || TL.eventsAll?.find(e => e.ms.includes(m)), ag = ageText(S.kid, m.ts); capSet(m.title || ev?.title || dd, [dd, ag, (m.note || (ev && ev.ms[0] === m ? ev.note : '') || '').slice(0, 90)].filter(Boolean).join(' · ')); }
        SH.hold = 4 + (performance.now() - (SH.yearT || 0) < 3300 ? 1.5 : 0);
        if (m.type === 'video') { startCardVideo(st.card); SH.hold = clamp((m.dur || 4) + .3, 4, 10.3); }
        if (m.voice && m.type !== 'video') { const run = SH.runId; SH.hold = 99; Music.duck(true); VOICE.play(m, { onEnd: () => { Music.duck(false); if (SH.runId === run && SH.cur === st) SH.hold = Math.min(SH.hold, SH.t + 1.2); } }).then(au => { SH.voice = au; if (!au && SH.runId === run) { Music.duck(false); SH.hold = 4; } }); }
      } else { const SI = starInfo(); capSet(SI.t, SI.d ? (SI.y ? SI.d.slice(0, 4) : dmy(parseYmd(SI.d))) : ''); SH.hold = 4; Burst.fire(G.star.g.position, 80, 9); }
    }
  } else if (SH.phase === 'hold') {
    tmpA.subVectors(SH.to.look, SH.to.pos).normalize(); cam.pos.addScaledVector(tmpA, dt * .12);
    const st = SH.cur;
    if (st?.card?.vid?.v && st.card.vid.ok) { const v = st.card.vid.v; if ((v.ended || v.currentTime >= 10) && SH.t > 2.5) SH.t = Math.max(SH.t, SH.hold); }
    if (SH.t >= SH.hold) { if (SH.final) stopShow(true); else showNext(); }
  }
  cam.tPos.copy(cam.pos); cam.tLook.copy(cam.look);
}
function stopShow(ended) {
  if (S.mode !== 'show') return;
  if (INTRO) { const it = INTRO; INTRO = null; it.skip(); }
  SH.lcClose?.(); if (SH.voice) { SH.voice.pause(); SH.voice = null; Music.duck(false); }
  if (!ended) SH.outro?.close(); SH.outro = null;
  if (D.viewer.auto) D.closeViewer();
  if (SH.cur?.card) stopCardVideo(SH.cur.card);
  Music.stop(); capOff(); $('#year').classList.remove('on');
  document.body.classList.remove('showing');
  const st = SH.cur; S.mode = 'fly';
  SH.runId = (SH.runId || 0) + 1;
  exitGalaxy(ended ? null : (st?.card?.m.id || st?.book?.card?.m.id));
  if (ended) toast('Hết rồi — bạn thêm khoảnh khắc mới để dải ngân hà dài thêm nhé', 3500);
}
$('#stopShow').onclick = e => { e.stopPropagation(); stopShow(); };
SH.runId = 1;

// ---------- Kích thước & vòng lặp ----------
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(S.mode === 'tl' ? Math.min(dpr, MOBILE ? 1 : 1.25) : dpr); renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.fov = w / h < .9 ? 64 : 55; camera.updateProjectionMatrix();
  if (S.kid) buildScrub();
}
addEventListener('resize', resize);
const COVER = /\b(evopen|pvopen|hsopen|evshow|dopen)\b/;
let last = performance.now(), fpsAcc = 0, fpsN = 0, fpsT = 0, lowCnt = 0;
const perf = { fps: 0, frames: 0, ms: 0 };
function frame(dt) {
  S.time += dt;
  if (INTRO?.active) { INTRO.render(dt); return; }
  if (Math.abs(S.mix - S.mixT) > .0005) { S.mix += clamp(S.mixT - S.mix, -dt / 1.4, dt / 1.4); applyThemeMats(); }
  updateShow(dt);
  updateCamera(dt);
  const tl = S.mode === 'tl'; G.group.visible = !tl; if (bandMesh) bandMesh.visible = !tl; if (dust) dust.visible = !tl; core.visible = !tl;
  if (!tl) { updateHover(dt); updateCards(dt); updateBooks(dt); Stream.update(dt, camera.position); }
  updateEnv(dt);
  Burst.update(dt);
  if (!tl) updateScrubKnob();
  if (tl && (perf.frames & 1) && !TEST) return; // nền dòng sự kiện vẽ 30 khung/giây để dành sức cho cuộn
  if (tl && !TEST && (performance.now() - (S.tlScrollAt || 0) < 260 || COVER.test(document.body.className))) return; // đang cuộn / bị trang khác che kín → khỏi vẽ
  renderer.render(scene, camera);
}
const FPSM = { on: false, el: null, ts: [], tap: [], last: 0 };
function fpsMeter(on) {
  FPSM.on = on; try { localStorage.setItem('nh_fps', on ? '1' : ''); } catch (e) { }
  if (on && !FPSM.el) { FPSM.el = document.createElement('div'); FPSM.el.id = 'fpsm'; document.body.appendChild(FPSM.el); } else if (!on && FPSM.el) { FPSM.el.remove(); FPSM.el = null; }
}
try { if (localStorage.getItem('nh_fps')) setTimeout(() => fpsMeter(true), 500); } catch (e) { }
function fpsTick(now) {
  const T5 = now - 5000; FPSM.ts.push(now); while (FPSM.ts.length && FPSM.ts[0] < T5) FPSM.ts.shift();
  if (now - FPSM.last < 250) return; FPSM.last = now; const a = FPSM.ts; if (a.length < 3) return;
  const d = a.slice(1).map((t, i) => t - a[i]), cur = d.slice(-20), fps = 1000 / (cur.reduce((x, y) => x + y, 0) / cur.length);
  let lo = 999; for (let i = 0; i + 15 <= d.length; i += 5) { const w = d.slice(i, i + 15), f = 1000 / (w.reduce((x, y) => x + y, 0) / w.length); if (f < lo) lo = f; }
  FPSM.el.textContent = `${fps.toFixed(0)} fps\nthấp nhất 5s: ${(lo === 999 ? fps : lo).toFixed(0)}\nkhung >32ms: ${d.filter(x => x > 32).length}` + (TL.strip?.open ? `\ndải: ${(TL.strip.spd || 0).toFixed(1)} px/s` : '');
}
$('#verTxt').addEventListener('click', () => { const t = performance.now(); FPSM.tap = FPSM.tap.filter(x => t - x < 2500); FPSM.tap.push(t); if (FPSM.tap.length >= 5) { FPSM.tap = []; fpsMeter(!FPSM.on); toast(FPSM.on ? 'Đã bật đồng hồ FPS' : 'Đã tắt đồng hồ FPS', 1400); } });
function loop(now) {
  requestAnimationFrame(loop);
  if (FPSM.on) fpsTick(now);
  if (MAPOPEN) { last = now; return; } // bản đồ đang mở: nghỉ vẽ ngân hà
  const raw = (now - last) / 1000; last = now; const dt = Math.min(.05, Math.max(0, raw));
  const f0 = performance.now(); frame(dt); perf.frames++; perf.ms = perf.ms * .95 + (performance.now() - f0) * .05;
  // tự hạ độ phân giải nếu máy yếu (giữ mượt)
  fpsAcc += raw; fpsN++;
  if (fpsAcc > 2) {
    perf.fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0;
    if (!document.hidden && perf.fps < 42 && dpr > 1 && !Q.has('noadapt')) { if (++lowCnt >= 2) { dpr = Math.max(1, dpr - .25); resize(); lowCnt = 0; } } else lowCnt = 0;
  }
}
document.addEventListener('visibilitychange', () => { last = performance.now(); });

// ---------- Nhắc sinh nhật (.ics cho app Lịch) ----------
// ---------- Google Drive (ẩn hẳn nếu config.js chưa có Client ID) ----------
const avCache = new Map(), PLACES = { v: -1, map: null };
DRV = initDrive({ clientId: GOOGLE_CLIENT_ID || (TEST && Q.has('mock') ? 'mock-client.apps.googleusercontent.com' : ''), TEST, version: VERSION,
  dbGetRaw, dbPut: dbPutRaw, dbDel: dbDelRaw, dbAll, dbKeys, metaGet, metaSet: (k, v) => dbPutRaw('meta', v, k), toast, ask, icon, esc,
  kidName: id => cap(S.kids.find(k => k.id === id)?.name || ''), titleOf: m => { const k = TL.keyOfMid?.(m.id); return k ? TL.events.find(e => e.key === k)?.title || '' : m.title || ''; },
  avatarSmall: async k => { const c = avCache.get(k.id); if (c && c.t === k.avatar) return c.u; const u = await smallAvatar(k); avCache.set(k.id, { t: k.avatar, u }); return u; },
  openSettings: () => { $('#bSet').click(); setTimeout(() => $('#drvSec')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 450); },
  onMomentDrive: m => { const i = (S.all || []).findIndex(x => x.id === m.id); if (i >= 0) Object.assign(S.all[i], { driveFileId: m.driveFileId, driveThumbId: m.driveThumbId }); },
  onStatus: () => { },
  // nơi đặt mỗi ảnh trên Drive: theo sự kiện trên dòng thời gian của bé đầu tiên trong ảnh
  places: async () => {
    if (TEST && T.legacyPlaces) return new Map();
    if (PLACES.v === DATAVER && PLACES.map) return PLACES.map;
    const map = new Map(), all = (await dbAll('moments')).filter(m => !m.deleted), kids = (await dbAll('kids')).filter(k => !k.deleted);
    for (const k of kids) {
      const ms = all.filter(m => (m.kidIds?.[0] || m.kidId) === k.id); if (!ms.length) continue;
      const evs = TL.eventsForKid({ ...k, name: cap(k.name) }, ms, await metaGet('ev:' + k.id));
      for (const e of evs) for (const m of e.ms) map.set(m.id, { kidId: k.id, kidName: cap(k.name), key: e.key, title: e.title, ts0: e.ts0, ts1: e.ts1 });
    }
    PLACES.v = DATAVER; PLACES.map = map; return map;
  },
  onRemoteApplied: async () => {
    S.kids = (await dbAll('kids')).filter(k => !k.deleted).sort((a, b) => (a.created || 0) - (b.created || 0)); S.groups = (await metaGet('groups')) || []; S.chCfg = (await metaGet('chapters')) || {}; await loadHidden();
    if (!S.kids.length) return; await P.warm(S.kids);
    if ($('#mKid').classList.contains('open') && !kidEditing) { $('#mKid').classList.remove('open'); document.body.classList.remove('intro'); leaveIntro(true); }
    if (!S.kid || !S.kids.some(k => k.id === S.kid.id)) await selectKid(S.kids[0].id, false); else { await loadAll(); await TL.reload(); buildGalaxy(); buildScrub(); renderKidBtn(); updateNow(); }
    if ($('#mSet').classList.contains('open')) renderSettings();
  } });
const N = initNhac({ metaGet, metaSet, icon, toast, openModal, closeModal, dmy, noAccent, TEST, download: f => shareOrDownload(f, f.name), onSaved: () => { TL.render(); if (P.isOpen()) P.openProfile(dispKid(S.kid)); } });
const VOICE = initVoice({ dbGet: dbGetRaw, dbPut: dbPutRaw, dbDel: dbDelRaw, dbGetRaw, saveMoment: m => dbPut('moments', m), ask, toast, openModal, closeModal, get drive() { return DRV; }, onChange: () => { loadAll().then(() => TL.refreshAll(TL.cur?.key)); } });
const LICH = initLich({ people: () => S.kids.map(dispKid), metaGet, metaSet, prompt: prompt2, ask, toast, openModal, closeModal, contextMenu, parseYmd, deliverICS: (ks, o) => N.deliver(ks, o) });
const nhacFor = kids => N.open((kids || [S.kid]).filter(Boolean).map(dispKid));

// ---------- Hồ sơ bé, avatar ----------
const P = initProfile({ people: () => S.kids.map(dispKid), nhac: k => nhacFor([S.kids.find(x => x.id === k.id)]), metaGet, removeKid: async k => { const raw = S.kids.find(x => x.id === k.id); if (!raw) return; kidEditing = raw; $('#kidDel').click(); }, openBgSettings: () => openBgSettings(), contextMenu, dbGet, dbPut, allMoments: () => S.all || [], kidsOf, openModal, closeModal, toast, WD, noAccent, TEST, shareOrDownload,
  editKid: k => openKid(S.kids.find(x => x.id === k.id)), rawKid: id => S.kids.find(x => x.id === id), dispKid: id => dispKid(S.kids.find(x => x.id === id)),
  saveKid: async k => { await dbPut('kids', k); await P.warm([k]); renderKidBtn(); TL.render(); buildGalaxy(); } });

// ---------- Nhật ký truyện tranh ----------
const D = initDiary({ adultView: () => LIFE() || (S.kid && !isChild(S.kid)), typeFor: mids => { const c = {}; for (const id of mids) { const e = TL.events.find(x => x.ms.some(m => m.id === id)); if (e) c[e.type] = (c[e.type] || 0) + 1; } return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || null; }, icon, longPress, contextMenu, undoToast, prompt: prompt2, trashDiary: d => trashDiary(d), parseYmd, dbGet, dbPut, dbDel, dbAll, metaGet, kid: () => S.kid ? { ...S.kid, name: KN() } : null, allMoments: () => S.all || [], kidsOf, kids: () => S.kids.map(dispKid), family: () => !!S.family, ageText, dmy, ymd, WD, toast, ask, shareOrDownload,
  importFiles: importFilesQuiet, openModal, closeModal, loadImgBlob: b => loadImg(URL.createObjectURL(b)), noAccent, MUTE, TEST, audio: () => Music.audio(), onChange: diaryChanged, flyToBook });

// ---------- Dòng sự kiện (màn chính v1.2) ----------
async function deleteMoment(m) { await trashMoments([m], 'Đã chuyển vào thùng rác'); }
async function updateMoment(m, moved) {
  await dbPut('moments', m);
  if (moved) { buildGalaxy(); buildScrub(); } else { const c = G.cards.find(x => x.m.id === m.id); if (c) Stream.refresh(c); }
}
async function makeDiary(ms) {
  if (!ms.length) return; let list = ms.slice().sort((a, b) => a.ts - b.ts);
  if (list.length > 24) { const k = list.length / 24; list = Array.from({ length: 24 }, (_, i) => list[Math.floor(i * k)]); toast('Ngày này nhiều ảnh quá — app chọn 24 ảnh tiêu biểu, bạn đổi ảnh trong trình chỉnh được', 3800); }
  const d = await D.build(list); await D.saveDiary(d, true); TL.closeEvent(); D.openEditor(d.id);
  const nd = new Set(list.map(m => ymd(m.ts))).size; toast(nd > 1 ? `Đã tạo 1 cuốn nhật ký ${nd} chương (mỗi ngày một chương)` : 'Đã tạo nhật ký — bạn chỉnh lời, khung tuỳ thích nhé', 3500);
}
// đổi ảnh đại diện: nhân vật chibi hoặc ảnh thật (từ máy / từ ảnh trong app, cắt tròn)
function avatarMenu(k, at) {
  contextMenu({ at, title: 'Ảnh đại diện', items: [
    { icon: 'smile', label: 'Nhân vật chibi <small class="cm-n">tóc, áo, phụ kiện</small>', act: () => P.openChibi(k, async kk => { await dbPut('kids', kk); await P.warm([kk]); renderKidBtn(); TL.render(); buildGalaxy(); toast('Đã đổi nhân vật', 1500); }) },
    { icon: 'image', label: 'Ảnh thật <small class="cm-n">chọn từ máy hoặc ảnh trong app</small>', act: () => P.openAvatar({ ...k, chibi: null, role: null }, async kk => { const raw = S.kids.find(x => x.id === k.id); Object.assign(raw, { avatar: kk.avatar, avStyle: kk.avStyle }); await dbPut('kids', raw); await P.warm([raw]); renderKidBtn(); TL.render(); buildGalaxy(); toast('Đã đổi ảnh đại diện', 1500); }) }] });
}
// ---------- sheet THÀNH VIÊN (hành trình của bạn): mỗi người một công tắc bật/tắt hiện trên dòng thời gian ----------
S.hidden = new Set();
async function loadHidden() { S.hidden = new Set((await metaGet('sy:hidden')) || []); }
function memberSheet() {
  let M = $('#mMem');
  if (!M) { document.body.insertAdjacentHTML('beforeend', `<div class="modal" id="mMem"><div class="card glass" style="width:min(460px,100%)"><h2>Thành viên</h2><p class="lead">Bật / tắt để hiện từng người trên dòng thời gian. Ảnh chụp chung vẫn hiện khi còn người khác đang bật.</p><div class="mm-l"></div>
    <div class="mm-a"><button data-m="add">${icon('plus', 17, 2.2)}<span>Thêm người thân</span></button><button data-m="av">${icon('smile', 17, 2)}<span>Đổi ảnh đại diện của bạn</span></button><button data-m="edit">${icon('edit', 17, 2)}<span>Sửa hồ sơ của bạn</span></button></div></div></div>`);
    M = $('#mMem'); initSheets(m => closeModal(m));
    M.addEventListener('change', async e => { const c = e.target.closest('.cong-tac'); if (!c) return; const id = c.dataset.id, on = c.checked;
      const vis = S.kids.filter(k => !S.hidden.has(k.id) && k.id !== id); if (!on && !vis.length) { c.checked = true; toast('Cần còn ít nhất 1 người được hiện', 1600); return; }
      if (on) S.hidden.delete(id); else S.hidden.add(id); haptic(8); await metaSet('sy:hidden', [...S.hidden]); refreshKid(); buildGalaxy(); buildScrub(); TL.render(); renderMem(); });
    M.addEventListener('click', e => { const r = e.target.closest('.mm-r'); if (r && !e.target.closest('.cong-tac, label.sw')) { closeModal(M); P.openProfile(dispKid(S.kids.find(k => k.id === r.dataset.id))); return; }
      const b = e.target.closest('[data-m]'); if (!b) return; const me = ME(); closeModal(M);
      if (b.dataset.m === 'add') openKid(null); else if (b.dataset.m === 'av') setTimeout(() => avatarMenu(me, b), 250); else if (b.dataset.m === 'edit') openKid(me); });
  }
  renderMem(); openModal(M);
}
function renderMem() {
  const M = $('#mMem'); if (!M) return; const ps = sortPeople(S.kids);
  M.querySelector('.mm-l').innerHTML = ps.map((k, i) => `<div class="mm-r" data-id="${k.id}" style="--d:${Math.min(i, 8) * 35}ms"><img src="${P.avatarNow(k)}" alt="" style="--c:${k.color || '#ff8fbf'}"><span class="mm-t"><b>${esc(isMe(k) ? cap(k.name) + ' (bạn)' : cap(k.name))}</b><small>${esc([isMe(k) ? 'Bạn' : roleName(k), ageText(k, Date.now(), false)].filter(Boolean).join(' · '))}</small></span><label class="sw"><input type="checkbox" class="cong-tac" data-id="${k.id}"${S.hidden.has(k.id) ? '' : ' checked'} aria-label="Hiện ${esc(cap(k.name))}"></label></div>`).join('');
}
function openKidMenu(a) {
  if (ME() && LIFE()) { memberSheet(); return; }
  const me = ME(), ps = sortPeople(S.kids), go = k => { if (k.id !== S.kid?.id || S.family) { leaveIntro(true); metaSet('family', false); selectKid(k.id, true); } };
  const note = k => isMe(k) ? 'chỉ ảnh có bạn' : [roleName(k), k.birth ? dmy(parseYmd(k.birth)) : ''].filter(Boolean).join(' · ');
  contextMenu({ at: a, title: me ? 'Xem hành trình của' : 'Chọn bé', items: [
    me && { img: P.avatarNow(me), color: me.color, label: '<b>Hành trình của bạn</b>', note: 'cả đời · mọi người', on: LIFE(), act: () => enterFamily() },
    !me && S.kids.length > 1 && { img: P.avatarNow(S.kids[0]), label: 'Cả nhà', note: S.kids.length + ' bé', on: !!S.family, act: () => enterFamily() },
    ...ps.map(k => ({ img: P.avatarNow(k), color: k.color, label: esc(cap(k.name)) + (isMe(k) ? ' <small class="cm-n">(bạn)</small>' : ''), note: note(k), on: !S.family && k.id === S.kid?.id, act: () => go(k) })),
    { sep: 1 },
    S.kid && !LIFE() && { icon: 'star', label: `Hồ sơ của ${esc(isMe(S.kid) ? 'bạn' : KN())}`, act: () => P.openProfile(dispKid(S.kid)) },
    S.kid && { icon: 'edit', label: LIFE() || isMe(S.kid) ? 'Sửa hồ sơ của bạn' : `Sửa thông tin ${esc(KN())}`, act: () => openKid(S.kid) },
    { icon: 'plus', label: me ? 'Thêm người thân' : 'Thêm bé', act: () => openKid(null) },
    me && { icon: 'smile', label: 'Đổi ảnh đại diện của bạn', act: () => avatarMenu(me, a) },

    !me && { icon: 'sparkle', label: 'Tạo hồ sơ của tôi <small class="cm-n">hành trình cả đời</small>', act: () => openKid(null, { role: 'me' }) }] });
}
// chọn bé cho một hoặc nhiều ảnh
function pickKids(ms) {
  const M = $('#mKids'), box = M.querySelector('.mk-k'); let sel = new Set(ms.flatMap(kidsOf));
  M.querySelector('.mk-l').textContent = ms.length > 1 ? `Áp dụng cho ${ms.length} ảnh/video đã chọn.` : 'Chạm avatar để gắn hoặc bỏ gắn.';
  const draw = () => { box.innerHTML = S.kids.map(k => `<button data-k="${k.id}" class="${sel.has(k.id) ? 'on' : ''}" style="--c:${k.color}"><img src="${P.avatarNow(k)}" alt="">${esc(cap(k.name))}</button>`).join(''); };
  draw(); openModal(M);
  return new Promise(res => {
    const click = e => { const b = e.target.closest('[data-k]'); if (!b) return; const id = b.dataset.k; if (sel.has(id)) { if (sel.size < 2) { toast('Ảnh cần có ít nhất 1 người', 1400); return; } sel.delete(id); } else sel.add(id); haptic(5); draw(); };
    const ok = () => { fin(); res([...sel]); };
    const ob = new MutationObserver(() => { if (!M.classList.contains('open')) { fin(); res(null); } });
    function fin() { ob.disconnect(); box.removeEventListener('click', click); M.querySelector('.mk-ok').onclick = null; M.classList.remove('open'); }
    box.addEventListener('click', click); M.querySelector('.mk-ok').onclick = ok; ob.observe(M, { attributes: true });
  });
}
async function setKidsMany(ms, ids) { for (const m of ms) { m.kidIds = ids.slice(); m.kidId = ids[0]; await dbPut('moments', m); } await afterDataChange(); }
async function updateMany(ms) { for (const m of ms) await dbPut('moments', m); await afterDataChange(); }
async function shareMany(ms) {
  const files = []; for (const m of ms) { const b = await dbGet('blobs', 'o_' + m.id); if (!b) continue; const ext = (b.type.split('/')[1] || 'bin').replace('quicktime', 'mov').replace('jpeg', 'jpg'); files.push(new File([b], m.name || `khoanh-khac-${ymd(m.ts)}-${m.id.slice(-4)}.${ext}`, { type: b.type })); }
  if (TEST) { T.lastDownloads = files; return; }
  if (MOBILE && navigator.canShare && navigator.canShare({ files })) { try { await navigator.share({ files }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  for (const f of files) { await shareOrDownload(f, f.name); await sleep(350); }
}
async function setBgFromMoment(m) { const b = (!m.heic && m.type === 'image' && await dbGet('blobs', 'o_' + m.id)) || await dbGet('blobs', 't_' + m.id); if (!b) return; await setBgImage(b); toast('Đã đặt làm hình nền — chỉnh độ mờ, độ tối trong Cài đặt › Hình nền', 2800); }
async function avatarFromMoment(m) {
  const ks = kidsOf(m).map(id => S.kids.find(k => k.id === id)).filter(Boolean);
  const go = async k => { const b = (!m.heic && m.type === 'image' && await dbGet('blobs', 'o_' + m.id)) || await dbGet('blobs', 't_' + m.id); P.openAvatar(k, async kk => { await dbPut('kids', kk); await P.warm([kk]); renderKidBtn(); TL.render(); buildGalaxy(); toast(`Đã đổi avatar của ${cap(kk.name)}`, 1600); }, b); };
  if (ks.length > 1) contextMenu({ title: 'Avatar của bé nào?', items: ks.map(k => ({ icon: 'smile', label: cap(k.name), act: () => go(k) })) }); else go(ks[0] || S.kid);
}
function kidMenu(el) {
  const k = S.kid; if (!k) return;
  contextMenu({ el, title: esc(KN()), items: [
    { icon: 'star', label: `Hồ sơ của ${esc(KN())}`, act: () => P.openProfile(dispKid(k)) },
    { icon: 'smile', label: 'Đổi avatar', act: () => P.openAvatar(k, async kk => { await dbPut('kids', kk); await P.warm([kk]); renderKidBtn(); TL.render(); buildGalaxy(); }) },
    { icon: 'edit', label: 'Sửa tên, ngày sinh, giới tính, màu', act: () => openKid(k) },
    { icon: 'image', label: 'Đổi hình nền', act: () => openBgSettings() },
    S.kids.length > 1 && { icon: 'people', label: 'Xem Cả nhà', act: () => enterFamily() }
  ] });
}
function openBgSettings() { renderSettings(); openModal($('#mSet')); setTimeout(() => $('#bgList')?.closest('.sec')?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 380); }
async function setMomentKids(m, ids) { m.kidIds = ids.slice(); m.kidId = ids[0]; await dbPut('moments', m); refreshKid(); buildGalaxy(); buildScrub(); TL.render(); }
async function saveChapters(cfg) { S.chCfg = cfg; await metaSet('chapters', cfg); refreshKid(); buildGalaxy(); }
const TL = initTimeline({ hidden: () => LIFE() ? S.hidden : new Set(), life: LIFE, me: () => ME() ? dispKid(ME()) : null, chapters: () => S.chapters || [], chCfg: () => S.chCfg || {}, saveChapters, kidsRaw: () => S.kids,
  allCount: () => (S.all || []).length, makeVideo: o => makeVideo(o), voice: { open: (m, o) => VOICE.open(m, o), play: (m, o) => VOICE.play(m, o), ok: () => VOICE.supported() }, openMap: o => MAP.open(o), setPlace, story: o => startStory(o), addOld: (y, prec) => openAdd({ approx: { prec: prec || 'y', y } }), pickApprox, chibi: k => k && !k.avatar ? chibiSVG(S.kids.find(x => x.id === k.id) || k, { w: 46 }) : '', kid: () => S.kid ? { ...S.kid, name: KN() } : null, kidRaw: () => S.kid, moments: () => S.family ? S.all.filter(m => kidsOf(m).some(id => S.kids.some(k => k.id === id))) : S.moments, diaries: () => S.family ? (S.allDiaries || []) : (S.diaries || []),
  groups: () => S.groups || (S.groups = []), setGroups: g => { S.groups = g; }, saveGroups: () => metaSet('groups', S.groups || []),
  driveFolderOf: e => DRV?.signedIn ? DRV.folderOf(e.kids?.[0] || S.kid?.id, e.key) : null,
  music: on => on ? startMusic() : Music.stop(), confetti: c => P.confetti(c), nhac: ks => nhacFor(ks ? ks.map(k => S.kids.find(x => x.id === k.id)) : null),
  kids: () => sortPeople(S.kids).map(dispKid), family: () => !!S.family, kidsOf, avatar: k => P.avatarNow(k), setMomentKids, openProfile: () => P.openProfile(dispKid(S.kid)),
  trashMoments, pickKids, setKidsMany, updateMany, shareMany, setBgFromMoment, avatarFromMoment, kidMenu, prompt: prompt2, diaryMenu: (id, el) => D.diaryMenu(id, el), dbGet, metaGet, metaSet, ymd, dmy, WD, parseYmd, dayStart, ageText, openModal, closeModal, toast, ask,
  openDiary: id => D.openViewer(id), openKidMenu, openAdd: () => openAdd(), makeDiary, importFiles: (f, p, day, kids) => importFilesQuiet(f, p, day, kids), saveOriginal, deleteMoment, updateMoment, duck: v => Music.duck(v), onScroll: f => { S.tlScroll = f; S.tlScrollAt = performance.now(); } });
let gxHint = false;
// tab KỂ CHUYỆN: truyện tranh + trình chiếu kể chuyện + video kỷ niệm
function storyHub(at) {
  const me = ME(), chs = S.chapters || [], ps = sortPeople(S.kids);
  contextMenu({ at, title: 'Kể chuyện', items: [
    { icon: 'book', label: 'Truyện tranh <small class="cm-n">nhật ký từ ảnh thật</small>', act: () => $('#bDiary').click() },
    { sep: 1 },
    me && { icon: 'play', label: 'Kể chuyện đời tôi <small class="cm-n">từ ngày chào đời</small>', act: () => startStory({ life: true }) },
    !me && S.kid && { icon: 'play', label: `Kể chuyện của ${esc(KN())}`, act: () => startShow() },
    me && chs.length && { icon: 'sparkle', label: 'Kể chuyện một chương đời…', act: () => contextMenu({ at, title: 'Chọn chương', items: chs.slice().reverse().map(c => ({ label: `${c.ic} Chương ${c.num} · ${esc(c.title)}`, note: new Date(c.ts).getFullYear() + (c.end ? '–' + new Date(c.end - 864e5).getFullYear() : ''), act: () => startStory({ chapter: c }) })) }) },
    ps.length > 1 && { icon: 'people', label: 'Kể chuyện về một người…', act: () => contextMenu({ at, title: 'Kể chuyện về ai?', items: ps.map(k => ({ img: P.avatarNow(k), color: k.color, label: esc(isMe(k) ? 'Bạn' : cap(k.name)), note: isMe(k) ? '' : roleName(k), act: () => startStory({ person: k }) })) }) },
    { icon: 'grid', label: 'Kể chuyện một chuyến đi / nhóm…', act: () => { const gs = TL.events.filter(e => e.group || e.type === 'trip').slice(0, 30); if (!gs.length) { toast('Chưa có chuyến đi hay nhóm nào — gộp nhiều ngày thành nhóm trước nhé', 3000); return; } contextMenu({ at, title: 'Chọn chuyến đi', items: gs.map(e => ({ icon: 'image', label: esc(e.title), note: TL.spanTxt(e.ms), act: () => startStory({ ids: e.ms.map(m => m.id), title: e.title, sub: TL.spanTxt(e.ms), people: e.kids.map(id => S.kids.find(k => k.id === id)).filter(Boolean) }) })) }); } },
    { icon: 'star', label: 'Tổng kết năm…', act: () => yearReview(at) },
    { sep: 1 },
    openVideoMaker && { icon: 'video', label: 'Video kỷ niệm <small class="cm-n">tự dựng MP4</small>', act: () => openVideoMaker() }
  ] });
}
// ---------- 🎬 VIDEO KỶ NIỆM ----------
const VID = initVideoUI({ MOBILE, toast, openModal, closeModal, dmy, ymd, noAccent, approxLabel, shareOrDownload, get drive() { return DRV; },
  blob: k => dbGet('blobs', k), thumbBlob: id => dbGet('blobs', 't_' + id), thumbURL: async id => { const b = await dbGet('blobs', 't_' + id); return b ? URL.createObjectURL(b) : ''; },
  me: () => ME(), confetti: () => P.confetti('#ffd27f'),
  avatarImgs: async ps => { const out = []; for (const k0 of ps.slice(0, 6)) { const k = S.kids.find(x => x.id === k0.id) || k0, im = new Image(); im.src = k.avatar ? await P.avatarURL(k) : (k.role || k.chibi) ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(chibiSVG(k, { w: 240 })) : P.avatarNow(k); try { await im.decode(); out.push(im); } catch (e) { } } return out; },
  theme: () => S.theme,
  addToTimeline: async (file, o, ms) => { const id = uid(), th = await videoThumb(file); await dbPut('blobs', file, 'o_' + id); await dbPut('blobs', th.blob, 't_' + id); const last = ms.reduce((a, b) => b.ts > a.ts ? b : a, ms[0]), kids = [...new Set(ms.flatMap(kidsOf))];
    const m = { id, kn: 1, tv: 2, kidId: kids[0] || S.kid?.id, kidIds: kids.length ? kids : [S.kid?.id], ts: last.ts + 60e3, title: '🎬 ' + (o.title || 'Video kỷ niệm'), note: '', type: 'video', mime: file.type, name: file.name, size: file.size, dur: th.dur || 0, w: th.w, h: th.h, color: th.color, dateSrc: 'user', created: Date.now() };
    if (o.group) { o.group.momentIds.push(id); await metaSet('groups', S.groups); } await dbPut('moments', m); await afterDataChange(); } });
var openVideoMaker = () => {
  const evs = TL.events.filter(e => e.ms.length >= 3).slice(0, 40); if (!evs.length) { toast('Cần ít nhất 3 ảnh trong một sự kiện để làm video', 2600); return; }
  contextMenu({ title: 'Video kỷ niệm cho…', items: [
    ...(S.chapters || []).slice().reverse().map(c => { const ms = TL.events.filter(e => e.chapter?.key === c.key).flatMap(e => e.ms); return ms.length >= 3 && { label: `${c.ic} Chương ${c.num} · ${esc(c.title)}`, note: `${ms.length} khoảnh khắc`, act: () => makeVideo({ ms, title: c.title, sub: `Chương ${c.num}`, people: [ME()].filter(Boolean) }) }; }),
    ...evs.map(e => ({ icon: e.group || e.type === 'trip' ? 'grid' : 'image', label: esc(e.title), note: TL.spanTxt(e.ms), act: () => makeVideo({ ms: e.ms, title: e.title, sub: TL.spanTxt(e.ms), people: e.kids.map(id => S.kids.find(k => k.id === id)).filter(Boolean), key: e.key, group: e.group }) }))] });
};
function makeVideo(o) { if (S.mode === 'show') stopShow(); VID.open(o); }
// TỔNG KẾT NĂM: chọn ảnh tiêu biểu của năm (cột mốc, chuyến đi, sự kiện nhiều ảnh) → kể chuyện, hoặc lưu thành truyện tranh
function yearPicks(y, n = 28) {
  const evs = TL.events.filter(e => new Date(e.ts0).getFullYear() === y && !e.approx); const score = e => (e.mile ? 50 : 0) + (e.type === 'trip' ? 30 : e.type !== 'daily' ? 15 : 0) + Math.min(20, e.ms.length);
  const ranked = evs.slice().sort((a, b) => score(b) - score(a)), out = [];
  for (const e of ranked) { const imgs = e.ms.filter(m => m.type !== 'video'); const k = e.mile || e.type === 'trip' ? 3 : e.ms.length > 6 ? 2 : 1; for (const m of (imgs.length ? e.stack.filter(m => m.type !== 'video') : e.stack).slice(0, k)) if (!out.includes(m)) out.push(m); if (out.length >= n) break; }
  return { ms: out.sort((a, b) => a.ts - b.ts), evs };
}
function yearReview(at) {
  const ys = [...new Set(TL.events.filter(e => !e.approx).map(e => new Date(e.ts0).getFullYear()))].sort((a, b) => b - a); if (!ys.length) { toast('Chưa có ảnh nào', 1800); return; }
  contextMenu({ at, title: 'Tổng kết năm', items: ys.slice(0, 20).map(y => { const evs = TL.events.filter(e => new Date(e.ts0).getFullYear() === y); return { icon: 'star', label: `Năm ${y}`, note: `${evs.reduce((t, e) => t + e.ms.length, 0)} khoảnh khắc`, act: () => contextMenu({ at, title: `Năm ${y}`, items: [
    { icon: 'play', label: 'Xem tổng kết (kể chuyện)', act: () => { const { ms, evs: E } = yearPicks(y); const n = E.reduce((t, e) => t + e.ms.length, 0), trips = E.filter(e => e.type === 'trip').length, miles = E.filter(e => e.mile).length; startStory({ ids: ms.map(m => m.id), title: `Năm ${y} của ${LIFE() ? 'bạn' : KN()}`, sub: [`${n} khoảnh khắc`, `${E.length} ngày đáng nhớ`, trips ? `${trips} chuyến đi` : '', miles ? `${miles} cột mốc` : ''].filter(Boolean).join(' · '), people: LIFE() ? sortPeople(S.kids).slice(0, 8) : [S.kid] }); } },
    { icon: 'book', label: 'Lưu thành truyện tranh', act: () => { const { ms } = yearPicks(y, 24); if (ms.length) makeDiary(ms); } }] }) }; }) });
}
// ---------- v1.7.0: Bản đồ đời tôi (bản đồ đường phố 3D thực tế, MapLibre + OpenFreeMap) ----------
var MAPOPEN = false;
const MAP = initMap({ theme: () => S.theme, chapters: () => S.chapters || [], thumbURL: async id => { const b = await dbGet('blobs', 't_' + id); return b ? URL.createObjectURL(b) : ''; }, dbGet: dbGetRaw, dbPut: dbPutRaw, metaGet, metaSet, prompt: prompt2, toast, get drive() { return DRV; }, me: () => ME() ? dispKid(ME()) : null,
  chibi: k => chibiSVG(S.kids.find(x => x.id === k.id) || k, { w: 46 }), events: () => TL.events, spanTxt: ms => TL.spanTxt(ms),
  openEvent: key => { if (document.body.classList.contains('galaxy')) exitGalaxy(); TL.openEvent(key); },
  setEventPlace: async (e, pl) => setPlace(e.ms, pl),
  onOpen: () => { MAPOPEN = true; }, onClose: () => { MAPOPEN = false; } });
async function setPlace(ms, pl) { for (const m of ms) { if (pl) m.place = { lat: pl.lat, lon: pl.lon, name: pl.name || '' }; else delete m.place; await dbPut('moments', m); } await afterDataChange(); }
// Nhà mình từ màn làm quen: tìm toạ độ khu vực đã gõ, cắm ghim (chỉnh lại được trên bản đồ)
async function homeFromName(name) {
  try { const r = (await searchPlace(name))[0]; if (!r) return; const ps = (await metaGet('sy:places')) || []; if (ps.some(p => p.kind === 'home')) return; ps.push({ id: Date.now().toString(36), kind: 'home', name: 'Nhà mình', area: name, lat: r.lat, lon: r.lon }); await metaSet('sy:places', ps); toast(`Đã cắm 🏡 Nhà mình ở ${r.name} trên bản đồ — mở “Bản đồ đời tôi” để chỉnh cho đúng`, 4200); } catch (e) { }
}
function tabOn(t) { $$('#tabbar [data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === t)); const i = ['tl', 'diary', 'add', 'show', 'set'].indexOf(t); if (i >= 0) $('#tabbar').style.setProperty('--i', i); }
function enterGalaxy() {
  TL.closeViewer(); TL.closeEvent(); $('#kidMenu').hidden = true;
  document.body.classList.add('galaxy'); setMode('overview'); cam.k = 1.25; tabOn('gx'); haptic(10);
  if (!gxHint) { gxHint = true; setTimeout(() => toast('Chạm một tấm ảnh để về đúng ngày đó trên dòng thời gian', 3400), 900); }
}
function exitGalaxy(mid) {
  closeLBNow(); TL.guard(); document.body.classList.remove('galaxy'); setMode('tl'); tabOn('tl');
  if (mid) { const k = TL.keyOfMid(mid); if (k) setTimeout(() => TL.scrollToKey(k), 420); }
}
function initBars() {
  $('#tabbar').innerHTML = `<button data-t="tl" class="on">${icon('timeline', 25, 1.8)}<span>Kỷ niệm</span></button><button data-t="diary">${icon('book', 25, 1.8)}<span>Kể chuyện</span></button><button data-t="add" class="big" aria-label="Thêm ảnh, video"><i>${icon('plus', 30, 2.4)}</i></button><button data-t="show">${icon('play', 25, 1.8)}<span>Chiếu</span></button><button data-t="set">${icon('gear', 25, 1.8)}<span>Cài đặt</span></button><i class="chi-bao" aria-hidden="true"></i>`;
  $('#tabbar').addEventListener('click', e => {
    const b = e.target.closest('[data-t]'); if (!b) return; const t = b.dataset.t; haptic(6);
    { const TB = $('#tabbar'), idx = ['tl', 'diary', 'add', 'show', 'set'].indexOf(t); TB.style.setProperty('--i', idx); clearInterval(TB._back); TB._back = setInterval(() => { if (document.querySelector('.modal.open, .cm, #onb.open, #mapv.open, #dv.open, .dv.open') || document.body.classList.contains('showing')) return; clearInterval(TB._back); const on = TB.querySelector('.on')?.dataset.t; TB.style.setProperty('--i', Math.max(0, ['tl', 'diary', 'add', 'show', 'set'].indexOf(on))); }, 450); }
    if (t === 'tl') { if (document.body.classList.contains('galaxy')) exitGalaxy(); else if (TL.isOpen()) { TL.closeViewer(); TL.closeEvent(); } else TL.scroller.scrollTo({ top: 0, behavior: 'smooth' }); }
    else if (t === 'diary') storyHub(b);
    else if (t === 'add') { b.classList.remove('spin'); void b.offsetWidth; b.classList.add('spin'); if (!S.kids.length || !(S.all || []).length) { openAdd(); return; } contextMenu({ at: b, title: 'Thêm vào dòng thời gian', items: [
      { icon: 'image', label: 'Thêm ảnh, video', act: () => openAdd() },
      { icon: 'grid', label: 'Tạo nhóm kỷ niệm <small class="cm-n">gom nhiều ngày</small>', act: () => TL.openGroupPicker() }] }); }
    else if (t === 'show') { TL.closeViewer(); TL.closeEvent(); $('#bShow').click(); }
    else if (t === 'set') $('#bSet').click();
  });
  $('#tbGx').innerHTML = icon('galaxy', 23, 1.8); $('#tbGx').onclick = () => $('#bOverview').click();
  $('#tbMore').innerHTML = icon('more', 23, 2.2);
  $('#tbMore').onclick = e => { const gx = document.body.classList.contains('galaxy'); contextMenu({ at: e.currentTarget, title: 'Tuỳ chọn', items: [
    !gx && { icon: 'check', label: 'Chọn nhiều ngày', act: () => TL.startSel('tl') },
    !gx && S.kid && { icon: 'grid', label: 'Tạo nhóm kỷ niệm', act: () => TL.openGroupPicker() },
    { icon: 'image', label: 'Đổi hình nền', act: () => openBgSettings() },
    { icon: S.theme === 'dawn' ? 'moon' : 'sun', label: S.theme === 'dawn' ? 'Đổi sang Đêm ngân hà' : 'Đổi sang Bình minh', act: () => $('#bTheme').click() },
    { icon: 'heart', label: TL.hidePreg ? 'Hiện ảnh lúc mang bầu' : 'Ẩn ảnh lúc mang bầu', act: () => TL.setHidePreg(!TL.hidePreg) },
    { icon: 'map', label: 'Bản đồ đời tôi <small class="cm-n">bản đồ 3D</small>', act: () => MAP.open() },
    { icon: 'galaxy', label: gx ? 'Về dòng thời gian' : 'Xem Toàn cảnh ngân hà', act: () => $('#bOverview').click() },
    S.kid && { icon: 'star', label: `Hồ sơ của ${esc(KN())}`, act: () => P.openProfile(dispKid(S.kid)) },
    { icon: 'calendar', label: 'Lịch kỷ niệm <small class="cm-n">sinh nhật, ngày cưới, giỗ, Tết</small>', act: () => LICH.open() },
    S.kid && { icon: 'cake', label: S.family ? 'Nhắc sinh nhật cả nhà' : `Nhắc sinh nhật ${esc(KN())}`, act: () => nhacFor(S.family ? S.kids : [S.kid]) },
    { icon: 'check', label: 'Tìm ảnh, video trùng', act: () => findDuplicates() },
    { icon: 'trash', label: 'Thùng rác', act: () => openTrash() }
  ] }); };
  $('#tbTheme').innerHTML = icon(S.theme === 'dawn' ? 'moon' : 'sun', 22, 1.9); $('#tbTheme').onclick = () => $('#bTheme').click();
  $('#gxBack').innerHTML = icon('back', 20, 2.2) + '<span>Dòng thời gian</span>'; $('#gxBack').onclick = () => exitGalaxy();
  // thanh công cụ của hộp Thêm: đặt cùng một ngày cho nhiều ảnh
  $('#addList').insertAdjacentHTML('beforebegin', `<div class="addbar" id="addBar" hidden style="display:none!important"><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="addAll" class="ck"> Chọn tất cả</label><input type="date" id="addDay" aria-label="Ngày"><button id="addSetDay">${icon('calendar', 17)}<span>Đặt cùng 1 ngày cho các ảnh đã chọn</span></button><div class="datehint" id="addDayH" style="width:100%;margin:0"></div></div>`);
  $('#addAll').onchange = e => ADD.rows.forEach(r => { const c = r.el.querySelector('.ck'); if (c) c.checked = e.target.checked; });
  $('#addDay').addEventListener('input', () => { const t = parseYmd($('#addDay').value); $('#addDayH').textContent = t ? fmtLong(t) : ''; });
  $('#addSetDay').onclick = () => {
    const day = $('#addDay').value; if (!parseYmd(day)) { toast('Bạn chọn ngày trước nhé'); return; }
    let n = 0; for (const r of ADD.rows) { if (!r.ready || !r.el.querySelector('.ck')?.checked) continue; r.ts = parseYmd(day, r.ts); r.src = 'user'; r.el.querySelector('.r-dt').value = day; rowAge(r); const b = r.el.querySelector('.badge'); b.className = 'badge'; b.textContent = 'bạn đã chỉnh ngày'; n++; }
    toast(n ? `Đã đặt ngày ${dmy(parseYmd(day))} cho ${n} ảnh` : 'Bạn đánh dấu chọn ảnh trước nhé', 2000);
  };
  $('#addBar').insertAdjacentHTML('beforebegin', '<div class="kidsel" id="addKids" hidden></div>');
  $('#addKids').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; const id = b.dataset.k; ADD.kids = ADD.kids.includes(id) ? ADD.kids.filter(x => x !== id) : [...ADD.kids, id]; haptic(5); renderAddKids(); });
  // ngày sinh: hiện chữ rõ để khỏi nhầm ngày/tháng
  const kh = () => {
    if (CAL.mode === 'a') { const sv = lunarSolar(), L = sv && solar2lunar(+sv.slice(8), +sv.slice(5, 7), +sv.slice(0, 4)); $('#kidBdH').textContent = sv ? `Âm lịch ${L.d}/${L.m}${L.leap ? ' nhuận' : ''}/${L.y} = dương lịch ${fmtLong(parseYmd(sv))}` : ($('#kidLy').value.length === 4 ? 'Ngày âm này không có trong năm đó' : ''); return; }
    const t = parseYmd($('#kidBd').value); $('#kidBdH').textContent = t ? 'Sinh ' + fmtLong(t) : '';
  };
  $('#kidBd').addEventListener('input', kh); $('#kidBd').addEventListener('change', kh); kidBdHint = kh;
  // hình nền
  $('#bgList').addEventListener('click', e => {
    const b = e.target.closest('[data-bg]'); if (!b) return; const v = b.dataset.bg, c = BG.cfg; haptic(6);
    if (v === 'auto') c.kind = 'auto'; else if (v.startsWith('scene:')) { c.kind = 'scene'; c.scene = v.slice(6); } else if (v.startsWith('grad:')) { c.kind = 'grad'; c.grad = v.slice(5); }
    else { c.kind = 'image'; bgUrl().then(u => { if (!u) $('#bgFile').click(); }); }
    applyBg(); saveBg(); renderBgUi();
  });
  $('#bgPickFile').onclick = () => $('#bgFile').click();
  $('#bgFile').onchange = e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setBgImage(f); };
  $('#bgPickKid').onclick = async () => {
    const g = $('#bgKidGrid'); g.hidden = !g.hidden; if (g.hidden) return;
    const ms = S.moments.filter(m => m.type === 'image').sort((a, b) => b.ts - a.ts).slice(0, 48);
    g.innerHTML = ms.length ? ms.map(m => `<button data-mid="${m.id}"></button>`).join('') : '<p class="hint">Chưa có ảnh nào của bé.</p>';
    for (const b of g.querySelectorAll('[data-mid]')) dbGet('blobs', 't_' + b.dataset.mid).then(t => { if (t) b.style.backgroundImage = `url("${URL.createObjectURL(t)}")`; });
  };
  $('#bgKidGrid').addEventListener('click', async e => { const b = e.target.closest('[data-mid]'); if (!b) return; const m = S.moments.find(x => x.id === b.dataset.mid); const o = !m.heic && await dbGet('blobs', 'o_' + m.id); setBgImage(o || await dbGet('blobs', 't_' + m.id)); $('#bgKidGrid').hidden = true; });
  const sl = (id, key, k) => $(id).addEventListener('input', e => { BG.cfg[key] = +e.target.value / k; e.target.nextElementSibling.textContent = e.target.value + (key === 'blur' ? 'px' : '%'); applyBg(); saveBg(); });
  sl('#bgBlur', 'blur', 1); sl('#bgDim', 'dim', 100); sl('#bgTint', 'tint', 100);
  $('#bgTintC').addEventListener('click', e => { const t = e.target.dataset.t; if (!t) return; BG.cfg.tintC = t; if (!BG.cfg.tint) BG.cfg.tint = .2; applyBg(); saveBg(); renderBgUi(); });
  $('#bgSpk').onchange = e => { BG.cfg.sparkle = e.target.checked; applyThemeMats(); saveBg(); };
  // bottom sheet kéo được + lùi nền khi mở
  initSheets(m => closeModal(m));
  const upd = () => document.body.classList.toggle('sheet', !!document.querySelector('.modal.open'));
  const mo = new MutationObserver(upd); document.querySelectorAll('.modal').forEach(m => mo.observe(m, { attributes: true, attributeFilter: ['class'] }));
}
var kidBdHint = () => { };
installSprings(); initBars();

// ---------- Khởi động ----------
async function boot() {
  if (matchMedia('(pointer: coarse)').matches) $('#drop').innerHTML = '<span class="big">📸</span>Chạm để chọn ảnh, video<br>từ thư viện của bạn';
  $('#ver').textContent = 'v' + VERSION; $('#verTxt').textContent = 'Hành Trình Của Bạn · v' + VERSION;
  resize();
  try { await Promise.race([Promise.all([document.fonts.load('700 40px Quicksand'), document.fonts.load('600 20px Quicksand')]), sleep(2500)]); } catch (e) { }
  await makePlaceholder();
  let theme = 'night';
  try {
    theme = (await metaGet('theme')) || 'night'; S.music = (await metaGet('music')) || 'builtin'; S.musicName = (await metaGet('musicName')) || '';
    await purgeOld();
    if (!(await metaGet('osmClean'))) { for (const k of (await dbKeys('blobs')).map(String)) if (k.startsWith('osm:')) await dbDelRaw('blobs', k); await metaSet('osmClean', 1); }
    if (TEST && Q.has('mock')) { const mk = await import('./drive-mock.js'); T.MOCK = mk.install(); T.mockDrive = mk; }
    S.drvBoot = await DRV.boot();
    if (DRV.signedIn && !(await dbAll('kids')).length) { await DRV.sync('boot'); } // máy mới / kho trống mà đã đăng nhập: kéo dữ liệu về trước
    S.groups = (await metaGet('groups')) || []; S.chCfg = (await metaGet('chapters')) || {}; await loadHidden();
    S.kids = (await dbAll('kids')).filter(k => !k.deleted).sort((a, b) => (a.created || 0) - (b.created || 0));
  } catch (e) { console.error(e); toast('Trình duyệt chặn bộ nhớ — bạn mở bằng Safari/Chrome thường (không ở chế độ ẩn danh) nhé', 8000); }
  setTheme(theme, false);
  S.mode = 'empty'; OV.dist = 160;
  requestAnimationFrame(t => { last = t; requestAnimationFrame(loop); });
  if (!S.kids.length && /#hoso=/.test(location.hash) && await importProfiles(location.hash)) { /* đã nhập hồ sơ từ link */ }
  else if (!S.kids.length) { document.body.classList.add('intro'); $('#intro').style.display = 'none'; createMe(true); }
  else {
    for (const k of S.kids) if (!k.color) { k.color = defaultColor(k.gender, S.kids.filter(x => x !== k && x.color).map(x => x.color)); await dbPut('kids', k); }
    await splitNames();
    await P.warm(S.kids);
    const id = await metaGet('curKid'); await selectKid(S.kids.some(k => k.id === id) ? id : S.kids[0].id, true);
    { const fam = await metaGet('family'); if (ME() ? fam !== false : S.kids.length > 1 && fam) await enterFamily(); }
    setTimeout(async () => { if (!ME() && !(await metaGet('meAsk'))) { meBanner(); return; } for (const k of S.kids) { if (k.gender || !isChild(k) || await metaGet('gAsk:' + k.id)) continue; genderBanner(k); return; } maybeRemindBackup(); }, S.splitNow ? 9500 : 2500);
    setTimeout(() => queueThumbFix((S.all || []).slice().sort((a, b) => b.ts - a.ts)), 4000);
    if (DRV.signedIn) setTimeout(() => DRV.afterLogin(), 1500);
    setTimeout(() => checkUpdate(true), 3000);
    if (/#hoso=/.test(location.hash)) setTimeout(() => importProfiles(location.hash), 600);
  }
  initSheets(m => closeModal(m)); // các hộp tạo sau (giọng kể, lịch, video, nhân vật…) cũng có thanh kéo
  N.fromHash(); addEventListener("hashchange", () => { N.fromHash(); if (/#hoso=/.test(location.hash)) importProfiles(location.hash); });
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !TEST) navigator.serviceWorker.register('sw.js').catch(() => { });
}

// ---------- Móc kiểm thử (chỉ khi ?test, dùng IndexedDB riêng "nganha_test") ----------
if (TEST) {
  var exifSeg = ts => {
    const d = new Date(ts), s = `${d.getFullYear()}:${pad(d.getMonth() + 1)}:${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}\0`;
    const t = new Uint8Array(64), v = new DataView(t.buffer);
    t.set([0x49, 0x49, 0x2a, 0]); v.setUint32(4, 8, true);
    v.setUint16(8, 1, true); v.setUint16(10, 0x8769, true); v.setUint16(12, 4, true); v.setUint32(14, 1, true); v.setUint32(18, 26, true); v.setUint32(22, 0, true);
    v.setUint16(26, 1, true); v.setUint16(28, 0x9003, true); v.setUint16(30, 2, true); v.setUint32(32, 20, true); v.setUint32(36, 44, true); v.setUint32(40, 0, true);
    for (let i = 0; i < 20; i++) t[44 + i] = s.charCodeAt(i);
    const seg = new Uint8Array(4 + 6 + 64); seg.set([0xff, 0xe1, 0, 72]); seg.set([0x45, 0x78, 0x69, 0x66, 0, 0], 4); seg.set(t, 10);
    return seg;
  };
  const SCENES = ['#ffb3c7,#ffe29a', '#a6e3ff,#d7c4ff', '#b8f0c8,#fff2a8', '#ffc7a6,#ff9ec8', '#c9b6ff,#9ad8ff', '#fff0b3,#ffb0b0'];
  function paint(x, W, H, i, seed) {
    const [a, b] = SCENES[i % SCENES.length].split(',');
    const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, a); g.addColorStop(1, b); x.fillStyle = g; x.fillRect(0, 0, W, H);
    const r = n => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 * n; };
    x.fillStyle = 'rgba(255,255,255,.5)'; for (let k = 0; k < 6; k++) { x.beginPath(); x.arc(r(W), r(H * .5), 20 + r(60), 0, 7); x.fill(); }
    x.fillStyle = '#ffd36b'; x.beginPath(); x.arc(W * .8, H * .2, H * .1, 0, 7); x.fill();
    x.fillStyle = ['#ff7aa8', '#7ab8ff', '#7ad6a0', '#ffa95c'][i % 4]; x.beginPath(); x.ellipse(W * .32, H * .62, W * .09, H * .2, 0, 0, 7); x.fill();
    x.fillStyle = '#ffe0c8'; x.beginPath(); x.arc(W * .32, H * .36, H * .1, 0, 7); x.fill();
    x.fillStyle = '#5a2747'; x.beginPath(); x.arc(W * .3, H * .35, H * .012, 0, 7); x.arc(W * .345, H * .35, H * .012, 0, 7); x.fill();
    x.strokeStyle = '#5a2747'; x.lineWidth = H * .008; x.beginPath(); x.arc(W * .322, H * .38, H * .03, .2, 2.9); x.stroke();
    x.fillStyle = ['#ff5f8f', '#ffcf4a', '#5fc8ff', '#a78bff'][(i + 1) % 4]; x.beginPath(); x.ellipse(W * .62, H * .38, W * .07, H * .11, 0, 0, 7); x.fill();
    x.strokeStyle = 'rgba(90,40,70,.5)'; x.lineWidth = 3; x.beginPath(); x.moveTo(W * .62, H * .49); x.quadraticCurveTo(W * .5, H * .6, W * .36, H * .58); x.stroke();
    x.fillStyle = 'rgba(90,39,71,.85)'; x.font = `700 ${Math.round(H * .07)}px Quicksand`; x.textAlign = 'center'; x.fillText('Ảnh thử ' + (i + 1), W / 2, H * .92);
  }
  async function fakePhoto(i, ts, opt = {}) {
    const W = opt.portrait ? 900 : 1200, H = opt.portrait ? 1200 : 900, c = document.createElement('canvas'); c.width = W; c.height = H;
    paint(c.getContext('2d'), W, H, i, i * 7 + 3);
    const jb = new Uint8Array(await (await canvasToBlob(c, .82)).arrayBuffer());
    const parts = opt.noExif ? [jb] : [jb.subarray(0, 2), exifSeg(ts), jb.subarray(2)];
    return new File(parts, opt.name || `IMG_${i}.jpg`, { type: 'image/jpeg', lastModified: opt.lm || Date.now() });
  }
  async function fakeVideo(i, ts, sec = 2.2) {
    const c = document.createElement('canvas'); c.width = 640; c.height = 480; const x = c.getContext('2d');
    const st = c.captureStream(30); const types = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'];
    const type = types.find(t => window.MediaRecorder?.isTypeSupported?.(t)); if (!type) return null;
    const rec = new MediaRecorder(st, { mimeType: type }); const chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    const t0 = performance.now(); let raf = 0;
    const draw = () => { const k = (performance.now() - t0) / 1000; paint(x, 640, 480, i, 5); x.fillStyle = '#fff'; x.beginPath(); x.arc(320 + Math.sin(k * 3) * 200, 240 + Math.cos(k * 2) * 120, 40, 0, 7); x.fill(); x.fillStyle = '#ff5f8f'; x.font = '700 40px Quicksand'; x.fillText('Video thử ' + k.toFixed(1) + 's', 330, 80); };
    const iv = setInterval(draw, 33); draw();
    rec.start(200); await sleep(sec * 1000); rec.stop(); await new Promise(r => rec.onstop = r); clearInterval(iv); cancelAnimationFrame(raf);
    const ext = type.includes('mp4') ? 'mp4' : 'webm';
    return new File(chunks, `video_${i}.${ext}`, { type: type.split(';')[0], lastModified: ts });
  }
  const waitAdd = async () => { for (let k = 0; k < 600 && (ADD.pending || ADD.rows.some(r => !r.ready && !r.bad)); k++) await sleep(50); };
  // ?test&seed=1[&img=<ảnh mẫu>]: nạp dữ liệu giống thật vào DB thử (dùng trên iPhone ảo, không đụng dữ liệu thật)
  setTimeout(async () => {
    if (!Q.has('seed') || S.kids.length) return;
    let im = null; if (Q.get('img')) { try { im = new Image(); im.crossOrigin = 'anonymous'; im.src = Q.get('img'); await im.decode(); } catch (e) { im = null; } }
    const R = [[330,140,880,682],[545,165,775,360],[380,60,700,682],[0,120,640,682],[120,0,1262,600],[420,100,820,640],[900,100,1262,682],[600,180,740,320]];
    const crop = async (r, W = 1000) => { const [a, b, c, d] = r, w = c - a, h = d - b, k = W / Math.max(w, h), cv = document.createElement('canvas'); cv.width = Math.round(w * k); cv.height = Math.round(h * k); cv.getContext('2d').drawImage(im, a, b, w, h, 0, 0, cv.width, cv.height); return await new Promise(res => cv.toBlob(res, 'image/jpeg', .9)); };
    const file = async (i, ts) => { if (!im) return fakePhoto(i, ts, {}); const jb = new Uint8Array(await (await crop(R[i % R.length])).arrayBuffer()); return new File([jb.subarray(0, 2), exifSeg(ts), jb.subarray(2)], 'IMG_' + (1000 + i) + '.jpg', { type: 'image/jpeg', lastModified: Date.now() }); };
    openKid(null, { role: 'con' }); await sleep(400); $('#kidIn').value = 'Rin - Trần Đại Dũng'; $('#kidBd').value = '2025-05-07'; $('#kidOk').click(); for (let k = 0; k < 100 && !S.kid; k++) await sleep(50);
    const k = S.kid; k.gender = 'm'; k.color = '#5fb4ff'; if (im) { await dbPut('blobs', await crop([560, 150, 760, 330], 400), 'av_' + k.id); k.avatar = Date.now(); } await dbPut('kids', k); await P.warm([k]);
    const D = s => Date.parse(s), list = [[0, D('2025-05-07T09:12')], [1, D('2025-05-07T09:40')], [2, D('2025-05-07T15:00')], [3, D('2025-06-07T10:00')], [4, D('2025-06-07T10:20')], [5, D('2025-06-07T16:30')], [6, D('2025-08-15T08:00')], [7, D('2025-08-15T08:30')]];
    const fs = []; for (const [i, ts] of list) fs.push(await file(i, ts));
    try { const v = await fakeVideo(40, D('2025-08-15T09:20'), 3); if (v) fs.push(v); } catch (e) { }
    openAdd(); await addFiles(fs); await waitAdd(); await saveAdd(); await sleep(1200);
    location.replace(location.pathname + '?test');
  }, 2500);
  window.T = {
    get INTRO() { return INTRO; }, checkUpdate, doUpdateApp, UPD, DRV, dbGetRaw, fingerprint, findDuplicates, queueThumbFix, runThumbFix, RT, profileLink, importProfiles, readProfileLink, maybeRemindBackup, genderBanner, doBackup, renderBkLast, fpsMeter, openKid, S, G, FL, OV, cam, SH, ADD, Stream, Music, perf, camera, renderer, scene, frame, setMode, openLB, closeLB, lbNav, startShow, stopShow, setTheme, openAdd, addFiles, saveAdd, doImport, buildBackup, readBackup, ageText, exifDate, videoDate, readDate, selectKid, dbAll, dbGet,
    async setKid(id, patch) { const k = S.kids.find(x => x.id === id); Object.assign(k, patch); await dbPut('kids', k); await P.warm([k]); renderKidBtn(); TL.render(); return k; }, loadAll,
    dbPut, splitName, splitNames, fakePhoto, fakeVideo, D, TL, P, N, nhacFor, BG, trashMoments, restoreMoments, openTrash, removeKid, restoreKid, alignDates, nameDate, prompt2, enterFamily, kidsOf, setMomentKids, refreshKid, applyBg, loadBg, setBgImage, enterGalaxy, exitGalaxy, renderBgUi, openBook, diaryChanged, importFilesQuiet, exifSeg,
    // giả lập Gemini (không cần khoá thật): trả JSON mẫu, ghi lại yêu cầu để kiểm
    mockGemini(out, status = 200) {
      T.gemReqs = []; const real = T.realFetch || (T.realFetch = window.fetch.bind(window));
      window.fetch = async (url, o = {}) => {
        if (!String(url).includes('generativelanguage.googleapis.com')) return real(url, o);
        T.gemReqs.push({ url: String(url), headers: o.headers, body: o.body ? JSON.parse(o.body) : null });
        if (status !== 200) return new Response(JSON.stringify({ error: { message: status === 400 ? 'API key not valid. Please pass a valid API key.' : 'Resource exhausted' } }), { status });
        if (String(url).includes('/models?')) return new Response(JSON.stringify({ models: [{ name: 'models/gemini-3.6-flash', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-3.5-flash-lite', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-3.1-flash-lite-image', supportedGenerationMethods: ['generateContent'] }] }));
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }] }));
      };
    },
    // nạp ảnh có EXIF đúng giờ chụp từ các blob ảnh cho sẵn
    async addBlobs(list) { const files = []; for (const { blob, ts, name } of list) { const jb = new Uint8Array(await blob.arrayBuffer()); files.push(new File([jb.subarray(0, 2), exifSeg(ts), jb.subarray(2)], name || 'IMG.jpg', { type: 'image/jpeg', lastModified: Date.now() })); } return await importFilesQuiet(files); },
    async kid(name = 'Bin', birth = '2023-03-12', role = 'con') {
      if (kidDraft && !kidEditing) setKidRole(role);
      $('#kidIn').value = name; $('#kidBd').value = birth; $('#kidOk').click();
      for (let k = 0; k < 100 && S.kid?.name !== name; k++) await sleep(50); return S.kid?.id;
    },
    // nạp n ảnh thử qua đúng luồng nhập (đọc EXIF, làm ảnh nhỏ, lưu)
    async addPhotos(n, from, to, opt = {}) {
      const a = Date.parse(from), b = Date.parse(to), files = [];
      for (let i = 0; i < n; i++) files.push(await fakePhoto(opt.base + i || i, a + (b - a) * (n > 1 ? i / (n - 1) : 0) + 9 * 3600e3, { portrait: i % 3 === 1 }));
      openAdd(); await addFiles(files); await waitAdd();
      if (opt.titles) ADD.rows.forEach((r, i) => { if (opt.titles[i]) r.el.querySelector('.r-ti').value = opt.titles[i]; });
      const rd = ADD.rows.map(r => ({ src: r.src, d: ymd(r.ts) }));
      if (!opt.keep) await saveAdd();
      return rd;
    },
    async addVideo(ts, sec) { const f = await fakeVideo(1, Date.parse(ts), sec); if (!f) return 'no-mediarecorder'; openAdd(); await addFiles([f]); await waitAdd(); const r = ADD.rows.map(r => ({ src: r.src, dur: r.th?.dur, ok: r.th?.ok, d: ymd(r.ts) })); await saveAdd(); return r; },
    fps(ms = 3000) { return new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(f); else r(+(n / ((performance.now() - t0) / 1000)).toFixed(1)); }; requestAnimationFrame(f); }); },
    state() { return { mode: S.mode, kid: S.kid?.name, n: S.moments.length, cards: G.cards.length, gates: G.gates.map(g => g.it.year), loaded: Stream.loaded, budget: Stream.BUDGET, lb: S.lbIdx, theme: S.theme, mix: +S.mix.toFixed(2), dpr, fps: +perf.fps.toFixed(1), now: $('#nowD').textContent + ' | ' + $('#nowA').textContent + ' | ' + $('#nowC').textContent, calls: renderer.info.render.calls, tris: renderer.info.render.triangles, tex: renderer.info.memory.textures, music: Music.playing }; },
    async wipe() { for (const st of ['kids', 'moments', 'blobs', 'meta', 'diaries']) await dbx(st, 'readwrite', s => s.clear()); },
    errors: [], VID, makeVideo, get MAP() { return MAP; }, setPlace, metaSet, metaGet, ME, LIFE, setKidRole, pickApprox, saveChapters, aoApply, get ADD() { return ADD; }, chaptersOf,
    errors_: null
  };
  addEventListener('error', e => T.errors.push(String(e.message)));
  addEventListener('unhandledrejection', e => T.errors.push('rej: ' + (e.reason?.message || e.reason)));
}

boot();
