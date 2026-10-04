// Hành Trình Của Bạn — Đăng nhập Google + đồng bộ Google Drive riêng của từng người (không cần máy chủ).
// • Đăng nhập: Google Identity Services (token model, popup) trên máy tính/Safari; OAuth 2.0 redirect (response_type=token)
//   cho app mở từ Màn hình chính iOS (popup ở đó dễ bật sang Safari rồi không quay về). Token chỉ giữ trong bộ nhớ phiên.
// • Quyền tối thiểu: drive.file (chỉ tệp do app tạo) + drive.appdata (thư mục ẩn của app) + openid email profile.
// • Ảnh/video gốc → thư mục thấy được "Hành Trình Của Bạn / <năm> / <ngày · sự kiện>" (v1.8.0; ảnh đã lên theo cấu trúc cũ "<tên ở nhà> / <năm>" giữ nguyên chỗ); ảnh nhỏ + dữ liệu (nganha-db.json) → appDataFolder.
// • Đồng bộ 2 chiều theo từng bản ghi: so với "bản bóng" (hash lần đồng bộ trước); hai máy cùng sửa → bản sửa sau thắng; xoá hẳn = tombstone.

const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata openid email profile';
const G = 'https://www.googleapis.com';
const ROOT_NAME = 'Hành Trình Của Bạn', OLD_ROOTS = ['Ngân Hà Của Con', 'Ngân Hà Nhà Mình']; // đổi tên app: thư mục cũ được đổi tên tại chỗ (tìm theo appProperties), không tạo trùng
const CHUNK = 4 * 1024 * 1024; // bội số của 256 KB theo yêu cầu upload resumable
const sleep = ms => new Promise(r => setTimeout(r, ms));
const stable = v => JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.keys(x).sort().reduce((o, kk) => (o[kk] = x[kk], o), {}) : x);
const hash = v => { const s = stable(v); let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return s.length.toString(36) + '.' + h.toString(36); };
const qesc = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
class DrvErr extends Error { constructor(msg, code, status) { super(msg); this.code = code; this.status = status; } }

export function initDrive(A) {
  const cid = A.clientId;
  const on = !!cid;
  const D = { token: null, exp: 0, user: null, cfg: null, q: { running: false, total: 0, done: 0, cur: '', err: '' }, syncing: false, again: false, dirtyT: 0, paused: false, mem: new Map(), inflight: new Map(), status: '' };
  const $ = s => document.querySelector(s);
  const standalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  const redirectUri = () => location.origin + location.pathname.replace(/index\.html$/, '');
  const saveCfg = () => A.metaSet('drv', D.cfg);
  const signedIn = () => !!(D.cfg && D.cfg.email);
  const emit = () => { A.onStatus?.(api); renderPill(); renderSettings(); };

  // ---------- token ----------
  function saveSession() { try { sessionStorage.setItem('drvTok', JSON.stringify({ t: D.token, e: D.exp })); } catch (e) { } }
  function loadSession() { try { const s = JSON.parse(sessionStorage.getItem('drvTok') || 'null'); if (s && s.e > Date.now() + 60e3) { D.token = s.t; D.exp = s.e; } } catch (e) { } }
  function loadGIS() {
    if (window.google?.accounts?.oauth2) return Promise.resolve();
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = () => res(); s.onerror = () => rej(new DrvErr('Không tải được dịch vụ đăng nhập Google (kiểm tra mạng)', 'net')); document.head.appendChild(s); });
  }
  function redirectLogin(prompt) {
    const st = Math.random().toString(36).slice(2); try { sessionStorage.setItem('drvState', st); sessionStorage.setItem('drvBack', location.search); } catch (e) { }
    const p = new URLSearchParams({ client_id: cid, redirect_uri: redirectUri(), response_type: 'token', scope: SCOPES, include_granted_scopes: 'true', state: st });
    if (D.cfg?.email) p.set('login_hint', D.cfg.email); if (prompt) p.set('prompt', prompt);
    location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + p;
  }
  // quay về từ redirect: đọc token trong #hash rồi xoá hash
  function readRedirect() {
    if (!/[#&]access_token=/.test(location.hash) && !/[#&]error=/.test(location.hash)) return false;
    const p = new URLSearchParams(location.hash.slice(1)); let ok = false;
    let want = null; try { want = sessionStorage.getItem('drvState'); } catch (e) { }
    if (p.get('access_token') && (!want || p.get('state') === want)) { D.token = p.get('access_token'); D.exp = Date.now() + (+p.get('expires_in') || 3600) * 1000; saveSession(); ok = true; }
    let back = ''; try { back = sessionStorage.getItem('drvBack') || ''; sessionStorage.removeItem('drvState'); } catch (e) { }
    history.replaceState(null, '', location.pathname + (back || location.search));
    if (!ok && p.get('error')) A.toast('Chưa đăng nhập được Google: ' + p.get('error'), 4000);
    return ok;
  }
  // interactive = có thao tác của người dùng (được mở popup / chuyển trang)
  async function getToken(interactive = false, prompt) {
    if (D.token && Date.now() < D.exp - 60e3) return D.token;
    if (standalone() && !A.TEST) { if (interactive) { redirectLogin(prompt); await new Promise(() => { }); } throw new DrvErr('Cần đăng nhập lại Google', 'login'); }
    await loadGIS();
    return new Promise((res, rej) => {
      let done = false; const fail = e => { if (done) return; done = true; rej(e); };
      const tc = window.google.accounts.oauth2.initTokenClient({
        client_id: cid, scope: SCOPES, include_granted_scopes: true, login_hint: D.cfg?.email || undefined,
        callback: r => { if (done) return; done = true; if (r.error) return rej(new DrvErr('Google từ chối: ' + r.error, 'login')); if (window.google.accounts.oauth2.hasGrantedAllScopes && !window.google.accounts.oauth2.hasGrantedAllScopes(r, 'https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.appdata')) return rej(new DrvErr('Bạn cần cho phép app lưu tệp vào Google Drive', 'scope')); D.token = r.access_token; D.exp = Date.now() + (+r.expires_in || 3600) * 1000; saveSession(); res(D.token); },
        error_callback: e => fail(new DrvErr(e?.type === 'popup_closed' ? 'Bạn đã đóng cửa sổ đăng nhập' : 'Cần đăng nhập lại Google', 'login'))
      });
      try { tc.requestAccessToken({ prompt: prompt ?? (interactive && !D.cfg?.email ? 'select_account' : '') }); } catch (e) { fail(new DrvErr('Cần đăng nhập lại Google', 'login')); }
      if (!interactive) setTimeout(() => fail(new DrvErr('Cần đăng nhập lại Google', 'login')), 12000);
    });
  }
  async function call(path, opt = {}, retry = true) {
    const tok = await getToken(false);
    let r; try { r = await fetch(path.startsWith('http') ? path : G + path, { ...opt, headers: { Authorization: 'Bearer ' + tok, ...(opt.headers || {}) } }); }
    catch (e) { throw new DrvErr('Mất mạng', 'net'); }
    if (r.status === 401 && retry) { D.token = null; return call(path, opt, false); }
    if (r.status === 403 || r.status === 429) { let j = null; try { j = await r.clone().json(); } catch (e) { } const reason = j?.error?.errors?.[0]?.reason || ''; if (/storageQuotaExceeded|quotaExceeded/.test(reason)) throw new DrvErr('Google Drive của bạn đã đầy', 'quota', r.status); if (/rateLimit|userRateLimit/.test(reason) || r.status === 429) throw new DrvErr('Drive bận, thử lại sau', 'retry', r.status); }
    if (r.status >= 500) throw new DrvErr('Drive bận, thử lại sau', 'retry', r.status);
    return r;
  }
  const json = async (path, opt) => { const r = await call(path, opt); if (!r.ok) throw new DrvErr('Lỗi Drive ' + r.status, 'http', r.status); return r.json(); };

  // ---------- đăng nhập / đăng xuất ----------
  async function signIn() {
    if (!on) return false;
    try {
      await getToken(true);
      const u = await json('/oauth2/v3/userinfo');
      D.cfg = { ...(D.cfg || {}), email: u.email, name: u.name || u.email, picture: u.picture || '', since: D.cfg?.since || Date.now() };
      await saveCfg(); A.toast(`Đã đăng nhập ${u.email}`, 2200); emit();
      await afterLogin(); return true;
    } catch (e) { if (e.code !== 'login' || !standalone()) A.toast(e.message, 3600); D.status = e.message; emit(); return false; }
  }
  async function afterLogin() { await loadReg(); await sync('login'); pump(); processTrash(); }
  async function signOut() {
    const t = D.token; D.token = null; D.exp = 0; try { sessionStorage.removeItem('drvTok'); } catch (e) { }
    try { if (t && window.google?.accounts?.oauth2?.revoke) window.google.accounts.oauth2.revoke(t, () => { }); } catch (e) { }
    REG = null; D.cfg = { slim: false, all: !!D.cfg?.all, folders: D.cfg?.folders || {} }; await saveCfg(); D.q.total = D.q.done = 0; emit(); A.toast('Đã đăng xuất Google — ảnh, dữ liệu trong máy và trên Drive vẫn còn nguyên', 3200);
  }

  // ---------- thư mục ----------
  // tạo thư mục phải lần lượt (2 luồng tải lên chạy song song từng tạo ra 2 thư mục gốc trùng tên)
  let fq = Promise.resolve(); const serial = fn => { const p = fq.then(fn, fn); fq = p.catch(() => { }); return p; };
  const folder = (name, parent) => serial(() => folder0(name, parent));
  async function folder0(name, parent) {
    const F = D.cfg.folders ||= {}, key = (parent || 'root') + '/' + name; if (F[key]) return F[key];
    const q = `name='${qesc(name)}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${parent || 'root'}' in parents`;
    const j = await json('/drive/v3/files?' + new URLSearchParams({ q, fields: 'files(id,name)', spaces: 'drive', pageSize: '10' }));
    let id = j.files?.[0]?.id;
    if (!id) id = (await json('/drive/v3/files?fields=id', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parent || 'root'] }) })).id;
    F[key] = id; await saveCfg(); markDirty(); return id;
  }
  // ---------- thư mục theo SỰ KIỆN: Hành Trình Của Bạn / <bé> / <năm> / <ngày · tên sự kiện> ----------
  // mỗi thư mục mang appProperties.nganha = 'root' | 'kid:<id>' | 'year:<kid>:<yyyy>' | 'ev:<kid>:<khoá sự kiện>' để tìm lại đúng (không theo tên),
  // sổ đăng ký thư mục (meta drvFolders) đồng bộ qua nganha-db.json để máy khác dùng lại, không tạo trùng
  const safe = (t, n = 80) => String(t || '').replace(/[\/\\:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n).trim() || 'Không tên';
  let REG = null, regDirty = false;
  const loadReg = async () => REG || (REG = (await A.metaGet('drvFolders')) || {});
  const saveReg = async () => { if (regDirty) { regDirty = false; await A.metaSet('drvFolders', REG); } };
  const ensureFolder = (prop, name, parent) => serial(() => ensureFolder0(prop, name, parent));
  async function ensureFolder0(prop, name, parent) {
    await loadReg(); let f = REG[prop];
    if (!f) {
      // bản cũ (v1.5.0) đã tạo thư mục theo tên: nhận lại, gắn nhãn appProperties
      const legacy = D.cfg.folders?.[(parent || 'root') + '/' + name] || (prop === 'root' ? OLD_ROOTS.map(n => D.cfg.folders?.['root/' + n]).find(Boolean) : null);
      let id = legacy || null;
      if (!id) { const q = `appProperties has { key='nganha' and value='${qesc(prop)}' } and mimeType='application/vnd.google-apps.folder' and trashed=false`; const j = await json('/drive/v3/files?' + new URLSearchParams({ q, fields: 'files(id,name,parents)', spaces: 'drive', pageSize: '5' })); const hit = j.files?.[0]; if (hit) { id = hit.id; f = { id, name: hit.name, parent: hit.parents?.[0] || parent }; } }
      if (id && !f) { await json(`/drive/v3/files/${id}?fields=id`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appProperties: { nganha: prop } }) }); f = { id, name, parent }; }
      if (!f) { id = (await json('/drive/v3/files?fields=id', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parent || 'root'], appProperties: { nganha: prop } }) })).id; f = { id, name, parent }; }
      REG[prop] = f; regDirty = true;
    }
    if (f.name !== name || (parent && f.parent !== parent)) { // đổi tên sự kiện / đổi năm → đổi tên, chuyển thư mục
      const q = new URLSearchParams({ fields: 'id' }); if (parent && f.parent !== parent) { q.set('addParents', parent); if (f.parent) q.set('removeParents', f.parent); }
      await json(`/drive/v3/files/${f.id}?` + q, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      f.name = name; if (parent) f.parent = parent; regDirty = true;
    }
    return f.id;
  }
  const p2 = n => String(n).padStart(2, '0'), ymdS = t => { const d = new Date(t); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
  function folderName(p) {
    const a = new Date(p.ts0), b = new Date(p.ts1); let range = ymdS(p.ts0);
    if (ymdS(p.ts0) !== ymdS(p.ts1)) range += a.getFullYear() !== b.getFullYear() ? ' → ' + ymdS(p.ts1) : a.getMonth() !== b.getMonth() ? ` → ${p2(b.getMonth() + 1)}-${p2(b.getDate())}` : ' → ' + p2(b.getDate());
    return safe(`${range} · ${p.title}`, 80);
  }
  async function eventFolder(p) {
    if (p.flat) { // v1.8.0: một hành trình — "Hành Trình Của Bạn / <năm> / <ngày · sự kiện>"
      const root = await ensureFolder('root', ROOT_NAME, 'root'), y = String(new Date(p.ts0).getFullYear()), yf = await ensureFolder(`year:all:${y}`, y, root);
      return ensureFolder(`ev:all:${p.key}`, folderName(p), yf);
    }
    const root = await ensureFolder('root', ROOT_NAME, 'root'), kf = await ensureFolder('kid:' + p.kidId, safe(p.kidName, 60), root);
    const y = String(new Date(p.ts0).getFullYear()), yf = await ensureFolder(`year:${p.kidId}:${y}`, y, kf);
    return ensureFolder(`ev:${p.kidId}:${p.key}`, folderName(p), yf);
  }
  const fileName2 = (m, p) => { const d = new Date(m.ts), ext = (/\.([a-z0-9]{2,5})$/i.exec(m.name || '')?.[1] || (m.type === 'video' ? 'mp4' : 'jpg')).toLowerCase(); return safe(`${p.ts0 && ymdS(p.ts0) !== ymdS(p.ts1) ? `${p2(d.getMonth() + 1)}-${p2(d.getDate())} ` : ''}${p2(d.getHours())}.${p2(d.getMinutes())} — ${m.title || p.title}`, 100) + '.' + ext; };
  // xếp lại tệp đã có trên Drive cho khớp sự kiện (đổi tên, đổi ngày, gộp, tách, nhóm, nâng cấp từ cấu trúc cũ): chỉ đổi thư mục/tên, không tải lại
  async function organize() {
    if (!on || !signedIn() || D.org || !navigator.onLine) return; D.org = true; let n = 0;
    try {
      const places = await A.places(); await loadReg();
      const all = await A.dbAll('moments'), ms = all.filter(m => m.driveFileId && !m.deleted);
      for (const m of ms) {
        const p = places.get(m.id); if (!p) continue;
        const fid = await eventFolder(p), name = fileName2(m, p);
        if (m.driveParent === fid && m.driveName === name) continue;
        let old = m.driveParent; if (!old) { const j = await json(`/drive/v3/files/${m.driveFileId}?fields=parents`); old = (j.parents || []).join(','); }
        const q = new URLSearchParams({ fields: 'id' }); if (old !== fid) { q.set('addParents', fid); if (old) q.set('removeParents', old); }
        await json(`/drive/v3/files/${m.driveFileId}?` + q, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
        const fresh = (await A.dbGetRaw('moments', m.id)) || m; fresh.driveParent = fid; fresh.driveName = name; await A.dbPut('moments', fresh);
        D.org_n = ++n; await sleep(n % 20 ? 120 : 1200); // giới hạn tốc độ
      }
      // thư mục gốc trùng (bản 1.5.0 có thể tạo 2 cái) mà bên trong không còn tệp nào → thùng rác Drive
      if (REG.root) {
        const q = `(${[ROOT_NAME, ...OLD_ROOTS].map(n => `name='${qesc(n)}'`).join(' or ')}) and mimeType='application/vnd.google-apps.folder' and trashed=false and 'root' in parents`;
        const dup = ((await json('/drive/v3/files?' + new URLSearchParams({ q, fields: 'files(id)', spaces: 'drive', pageSize: '20' }))).files || []).filter(f => f.id !== REG.root.id);
        const hasFile = async (id, depth) => { const c = (await json('/drive/v3/files?' + new URLSearchParams({ q: `'${id}' in parents and trashed=false`, fields: 'files(id,mimeType)', spaces: 'drive', pageSize: '100' }))).files || []; for (const f of c) { if (f.mimeType !== 'application/vnd.google-apps.folder') return true; if (depth < 4 && await hasFile(f.id, depth + 1)) return true; } return false; };
        for (const f of dup) if (!(await hasFile(f.id, 0))) await json(`/drive/v3/files/${f.id}?fields=id`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) });
      }
      // thư mục sự kiện không còn tệp nào (kể cả ảnh đang trong thùng rác app) → thùng rác Drive
      const live = new Set((await A.dbAll('moments')).map(m => m.driveParent).filter(Boolean));
      for (const [prop, f] of Object.entries(REG)) if (prop.startsWith('ev:') && !live.has(f.id)) { try { await json(`/drive/v3/files/${f.id}?fields=id`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) }); } catch (e) { if (e.status !== 404) continue; } delete REG[prop]; regDirty = true; }
    } catch (e) { console.warn('xếp thư mục Drive:', e.message); }
    finally { await saveReg(); D.org = false; if (n || regDirty) markDirty(); }
  }
  async function pathFor(m) { // không tìm được sự kiện: "Hành Trình Của Bạn / <năm>"
    const root = await ensureFolder('root', ROOT_NAME, 'root'), y = String(new Date(m.ts).getFullYear());
    return ensureFolder(`year:all:${y}`, y, root);
  }
  const fileName = m => { const d = new Date(m.ts), p = n => String(n).padStart(2, '0'); const ext = (/\.([a-z0-9]{2,5})$/i.exec(m.name || '')?.[1] || (m.type === 'video' ? 'mp4' : 'jpg')).toLowerCase(); const t = (A.titleOf(m) || '').replace(/[\\/:*?"<>|]+/g, '').slice(0, 60); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}.${p(d.getMinutes())}${t ? ' — ' + t : ''}.${ext}`; };

  // ---------- upload resumable (tiếp tục được khi rớt mạng / tải lại trang) ----------
  async function upload({ blob, name, mime, parents, fileId, key, onProg }) {
    let sess = await A.metaGet('ups:' + key);
    if (!sess || sess.size !== blob.size || Date.now() - sess.t > 6 * 864e5) {
      const r = await call(fileId ? `/upload/drive/v3/files/${fileId}?uploadType=resumable&fields=id` : '/upload/drive/v3/files?uploadType=resumable&fields=id', { method: fileId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': mime || 'application/octet-stream', 'X-Upload-Content-Length': String(blob.size) }, body: JSON.stringify(fileId ? {} : { name, parents }) });
      if (!r.ok) throw new DrvErr('Không mở được phiên tải lên (' + r.status + ')', 'http', r.status);
      sess = { uri: r.headers.get('Location'), size: blob.size, t: Date.now(), started: false }; if (!sess.uri) throw new DrvErr('Drive không trả địa chỉ tải lên', 'http');
      await A.metaSet('ups:' + key, sess);
    }
    let off = 0;
    const put = async (headers, body) => { try { return await fetch(sess.uri, { method: 'PUT', headers, body }); } catch (e) { throw new DrvErr('Mất mạng', 'net'); } };
    const rangeEnd = r => { const g = r.headers.get('Range'); return g ? +g.split('-')[1] + 1 : 0; };
    if (sess.started) { // hỏi Drive đã nhận tới đâu
      const r = await put({ 'Content-Range': `bytes */${blob.size}` });
      if (r.status === 200 || r.status === 201) { const j = await r.json(); await A.metaSet('ups:' + key, null); return j.id; }
      if (r.status === 308) off = rangeEnd(r);
      else { await A.metaSet('ups:' + key, null); throw new DrvErr('Phiên tải lên hết hạn, tải lại từ đầu', 'retry', r.status); }
    }
    while (true) {
      const end = Math.min(blob.size, off + CHUNK);
      if (!sess.started) { sess.started = true; await A.metaSet('ups:' + key, sess); }
      const r = await put({ 'Content-Range': blob.size ? `bytes ${off}-${end - 1}/${blob.size}` : 'bytes */0' }, blob.slice(off, end));
      if (r.status === 308) { off = rangeEnd(r); onProg?.(off / blob.size); continue; }
      if (r.ok) { const j = await r.json(); await A.metaSet('ups:' + key, null); onProg?.(1); return j.id; }
      if (r.status >= 500) throw new DrvErr('Drive bận, thử lại sau', 'retry', r.status);
      if (r.status === 404 || r.status === 410) { await A.metaSet('ups:' + key, null); throw new DrvErr('Phiên tải lên hết hạn', 'retry', r.status); }
      throw new DrvErr('Tải lên thất bại (' + r.status + ')', 'http', r.status);
    }
  }
  async function download(id) { const r = await call(`/drive/v3/files/${id}?alt=media`); if (!r.ok) throw new DrvErr('Không tải được tệp từ Drive (' + r.status + ')', 'http', r.status); return r.blob(); }

  // ---------- hàng đợi tải lên: ảnh nhỏ trước, rồi bản gốc mới nhất trước; 2 việc song song ----------
  async function jobs() {
    const ms = (await A.dbAll('moments')).filter(m => !m.deleted), keys = new Set((await A.dbKeys('blobs')).map(String)), out = [];
    for (const m of ms) if (!m.driveThumbId && keys.has('t_' + m.id)) out.push({ m, kind: 't' });
    const all = D.cfg.all, since = D.cfg.since || 0;
    for (const m of ms.sort((a, b) => b.ts - a.ts)) if (!m.driveFileId && keys.has('o_' + m.id) && (all || (m.created || 0) >= since)) out.push({ m, kind: 'o' });
    return out;
  }
  async function runJob(j) {
    const m = (await A.dbGetRaw('moments', j.m.id)) || j.m; if (m.deleted) return;
    if (j.kind === 't') {
      if (m.driveThumbId) return; const b = await A.dbGetRaw('blobs', 't_' + m.id); if (!b) return;
      m.driveThumbId = await upload({ blob: b, name: 't_' + m.id + '.jpg', mime: b.type || 'image/jpeg', parents: ['appDataFolder'], key: 't_' + m.id });
    } else {
      if (m.driveFileId) return; const b = await A.dbGetRaw('blobs', 'o_' + m.id); if (!b) return;
      const pl = (await A.places()).get(m.id), parent = pl ? await eventFolder(pl) : await pathFor(m), nm = pl ? fileName2(m, pl) : fileName(m); await saveReg();
      D.q.cur = nm; emit();
      m.driveFileId = await upload({ blob: b, name: nm, mime: b.type || m.mime || 'application/octet-stream', parents: [parent], key: 'o_' + m.id, onProg: p => { D.q.part = p; renderPill(); } });
      if (pl) { m.driveParent = parent; m.driveName = nm; } if (!pl || pl.flat) m.dv = 2; // v1.8.0: tệp nằm theo cấu trúc một hành trình
      if (D.cfg.slim) { await A.dbDel('blobs', 'o_' + m.id); D.cfg.saved = (D.cfg.saved || 0) + b.size; await saveCfg(); }
    }
    const fresh = (await A.dbGetRaw('moments', m.id)) || m; fresh.driveThumbId = m.driveThumbId || fresh.driveThumbId; fresh.driveFileId = m.driveFileId || fresh.driveFileId; if (m.driveParent) { fresh.driveParent = m.driveParent; fresh.driveName = m.driveName; } if (m.dv) fresh.dv = m.dv; await A.dbPut('moments', fresh); A.onMomentDrive?.(fresh);
  }
  let backoff = 0, retryT = 0;
  async function pump() {
    if (!on || !signedIn() || D.q.running || D.paused || !navigator.onLine) return;
    D.q.running = true; D.q.err = '';
    try {
      let list = await jobs(); D.q.total = D.q.done + list.length; emit();
      while (list.length) {
        const batch = list.splice(0, 2);
        const rs = await Promise.allSettled(batch.map(runJob));
        for (const r of rs) { if (r.status === 'fulfilled') { D.q.done++; backoff = 0; D.pendingSync = true; } else throw r.reason; }
        if (D.q.done % 10 === 0) sync('upload'); // đợt dài: cứ 10 tệp ghi dữ liệu một lần
        D.q.part = 0; emit();
        if (!list.length) { const more = await jobs(); if (more.length) { list = more; D.q.total = D.q.done + list.length; } }
      }
      D.q.cur = ''; if (D.q.done) { clearTimeout(D.dirtyT); sync('upload'); } // có ảnh mới lên Drive → ghi mã tệp vào dữ liệu đồng bộ ngay
    } catch (e) {
      D.q.err = e.message; D.q.cur = '';
      if (e.code === 'quota') { D.paused = true; A.toast('☁️ Google Drive đã đầy — dọn bớt Drive rồi bấm "Lưu tất cả ảnh cũ lên Drive" để tiếp tục', 6000); }
      else if (e.code === 'login') { D.status = 'Cần đăng nhập lại Google để tiếp tục lưu'; }
      else { backoff = Math.min(300e3, (backoff || 5e3) * 2); clearTimeout(retryT); retryT = setTimeout(pump, backoff); }
    } finally { D.q.running = false; if (D.q.done >= D.q.total) { D.q.total = D.q.done = 0; } emit(); }
  }
  addEventListener('online', () => { D.q.err = ''; pump(); sync('online'); });

  // ---------- tệp gốc/ảnh nhỏ không có trong máy: tải từ Drive (ảnh nhỏ lưu lại, bản gốc chỉ giữ tạm) ----------
  async function fetchBlob(key) {
    if (!on || !signedIn()) return null;
    const kind = key[0], id = key.slice(2); if (!/^[ot]_/.test(key)) return null;
    if (D.mem.has(key)) { const b = D.mem.get(key); D.mem.delete(key); D.mem.set(key, b); return b; }
    if (D.inflight.has(key)) return D.inflight.get(key);
    const p = (async () => {
      const m = await A.dbGetRaw('moments', id); const fid = m && (kind === 'o' ? m.driveFileId : m.driveThumbId); if (!fid) return null;
      try {
        let b = await download(fid); if (!b.type && m) b = new Blob([b], { type: kind === 't' ? 'image/jpeg' : m.mime || (m.type === 'video' ? 'video/mp4' : 'image/jpeg') });
        if (kind === 't') await A.dbPut('blobs', b, key);
        else { D.mem.set(key, b); while (D.mem.size > 4) D.mem.delete(D.mem.keys().next().value); }
        return b;
      } catch (e) { return null; }
    })();
    D.inflight.set(key, p); try { return await p; } finally { D.inflight.delete(key); }
  }

  // ---------- thùng rác: tệp đã xoá hẳn trong app → thùng rác Drive (không xoá vĩnh viễn) ----------
  async function processTrash() {
    if (!on || !signedIn()) return; const q = (await A.metaGet('drvTrashQ')) || []; if (!q.length) return; const left = [];
    for (const id of q) { try { const r = await call(`/drive/v3/files/${id}?fields=id`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) }); if (!r.ok && r.status !== 404) left.push(id); } catch (e) { left.push(id); } }
    await A.metaSet('drvTrashQ', left);
  }

  // ---------- đồng bộ dữ liệu (nganha-db.json trong appDataFolder) ----------
  async function collectLocal() {
    const recs = {};
    for (const k of await A.dbAll('kids')) recs['k:' + k.id] = k;
    for (const m of await A.dbAll('moments')) recs['m:' + m.id] = m;
    for (const d of await A.dbAll('diaries')) recs['d:' + d.id] = d;
    for (const key of (await A.dbKeys('meta')).map(String)) if (/^(ev:|bg:|sy:)|^(groups|drvFolders|chapters|anniv)$/.test(key)) { const v = await A.metaGet(key); if (v != null) recs['x:' + key] = v; }
    for (const k of await A.dbAll('kids')) if (k.avatar && !k.deleted) { const u = await A.avatarSmall(k); if (u) recs['a:' + k.id] = u; }
    return recs;
  }
  async function pullDb() {
    const j = await json('/drive/v3/files?' + new URLSearchParams({ q: "name='nganha-db.json' and trashed=false", spaces: 'appDataFolder', fields: 'files(id,modifiedTime)', pageSize: '5' }));
    const f = j.files?.[0]; if (!f) return { id: null, data: { v: 1, app: 'NganHaCuaCon', recs: {} } };
    const b = await download(f.id); let data; try { data = JSON.parse(await b.text()); } catch (e) { data = { v: 1, recs: {} }; }
    data.recs ||= {}; return { id: f.id, data };
  }
  async function pushDb(id, data) {
    data.updated = Date.now(); data.ver = A.version; data.app = 'NganHaCuaCon'; data.v = 1;
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const nid = await upload({ blob, name: 'nganha-db.json', mime: 'application/json', parents: ['appDataFolder'], fileId: id || undefined, key: 'db' });
    return nid || id;
  }
  // cùng một bé được tạo ở 2 nơi (cùng tên ở nhà + ngày sinh) → gộp về một mã (mã nhỏ hơn), viết lại mọi bản ghi tham chiếu
  async function unifyKids(remote) {
    const alias = (await A.metaGet('kidAlias')) || {}, kids = new Map();
    const add = k => { if (!k || k.deleted) return; const key = (k.name || '').trim().toLowerCase() + '|' + k.birth; (kids.get(key) || kids.set(key, new Set()).get(key)).add(k.id); };
    for (const k of await A.dbAll('kids')) add(k);
    for (const [key, r] of Object.entries(remote.recs)) if (key.startsWith('k:') && r.d) add(r.d);
    for (const ids of kids.values()) if (ids.size > 1) { const [canon, ...rest] = [...ids].sort(); for (const x of rest) alias[x] = canon; }
    for (const x of Object.keys(alias)) { let c = alias[x]; while (alias[c]) c = alias[c]; alias[x] = c; }
    await A.metaSet('kidAlias', alias); return alias;
  }
  const mapIds = (alias, arr) => [...new Set((arr || []).map(id => alias[id] || id))];
  function rewrite(alias, key, d) {
    if (!d || !Object.keys(alias).length) return d;
    if (key.startsWith('m:')) { const o = { ...d }; if (alias[o.kidId]) o.kidId = alias[o.kidId]; o.kidIds = mapIds(alias, o.kidIds); if (o.unk) o.unk = mapIds(alias, o.unk); return o; }
    if (key.startsWith('d:')) { const o = { ...d }; if (alias[o.kidId]) o.kidId = alias[o.kidId]; if (o.kids) o.kids = mapIds(alias, o.kids); return o; }
    if (key === 'x:groups') return d.map(g => ({ ...g, kidIds: mapIds(alias, g.kidIds) }));
    return d;
  }
  async function applyRec(key, d) {
    const id = key.slice(2);
    if (key.startsWith('k:')) { if (d) await A.dbPut('kids', d); else { await A.dbDel('kids', id); } }
    else if (key.startsWith('m:')) { if (d) { const cur = await A.dbGetRaw('moments', id); await A.dbPut('moments', d); if (cur && cur.ts !== d.ts) { } } else { await A.dbDel('moments', id); await A.dbDel('blobs', 'o_' + id); await A.dbDel('blobs', 't_' + id); } }
    else if (key.startsWith('d:')) { if (d) await A.dbPut('diaries', d); else await A.dbDel('diaries', id); }
    else if (key.startsWith('x:')) { if (d != null) await A.metaSet(key.slice(2), d); else await A.dbDel('meta', key.slice(2)); }
    else if (key.startsWith('a:')) { if (d) { try { const b = await (await fetch(d)).blob(); await A.dbPut('blobs', b, 'av_' + id); await A.metaSet('avSmall:' + id, null); } catch (e) { } } }
  }
  async function sync(reason) {
    if (!on || !signedIn()) return false;
    if (D.syncing) { D.again = true; return false; }
    D.syncing = true; D.status = 'Đang đồng bộ…'; emit(); let changedLocal = 0;
    try {
      const remote = await pullDb();
      const alias = await unifyKids(remote.data);
      // viết lại bản ghi trong máy đang trỏ tới mã bé cũ, rồi xoá bé trùng
      if (Object.keys(alias).length) {
        for (const m of await A.dbAll('moments')) { const n = rewrite(alias, 'm:', m); if (stable(n) !== stable(m)) await A.dbPut('moments', n); }
        for (const d of await A.dbAll('diaries')) { const n = rewrite(alias, 'd:', d); if (stable(n) !== stable(d)) await A.dbPut('diaries', n); }
        const gs = await A.metaGet('groups'); if (gs) await A.metaSet('groups', rewrite(alias, 'x:groups', gs));
        for (const x of Object.keys(alias)) { const k = await A.dbGetRaw('kids', x); if (k) { for (const pre of ['ev:', 'bg:']) { const v = await A.metaGet(pre + x); if (v && !(await A.metaGet(pre + alias[x]))) await A.metaSet(pre + alias[x], v); await A.dbDel('meta', pre + x); } await A.dbDel('kids', x); changedLocal++; } }
      }
      const local = await collectLocal(), lu = (await A.metaGet('syncLU')) || {}, now = Date.now(); let shadow = (await A.metaGet('syncShadow')) || {};
      // an toàn: kho trong máy trống trơn (máy mới, vừa xoá dữ liệu trình duyệt, đang dọn dở) thì KHÔNG coi là "đã xoá hết" — chỉ kéo về
      if (!Object.keys(local).some(k => k.startsWith('k:') || k.startsWith('m:'))) shadow = {};
      // an toàn (v1.8.0): trên Drive KHÔNG có tệp dữ liệu / tệp trống (bị xoá dữ liệu ẩn của app, đổi tài khoản, lỗi liệt kê) → coi như lần đầu: đẩy dữ liệu trong máy lên, KHÔNG xoá gì trong máy
      if (!remote.id || !Object.keys(remote.data.recs || {}).length) shadow = {};
      const R = remote.data.recs, keys = new Set([...Object.keys(local), ...Object.keys(R), ...Object.keys(shadow)]);
      let push = false; const newShadow = {}, tombs = [], rdel = [], liveR = Object.values(R).filter(r => r.d != null).length, liveL = Object.keys(local).filter(k => k.startsWith('m:') || k.startsWith('k:')).length;
      for (const key of keys) {
        if (key.startsWith('k:') && alias[key.slice(2)]) { if (!R[key] || R[key].d) { R[key] = { u: now, h: null, d: null }; push = true; } newShadow[key] = null; continue; }
        const L = local[key], Rr = R[key], S = shadow[key] ?? null;
        const lh = L === undefined ? null : hash(L), rh = Rr ? (Rr.d == null ? null : Rr.h) : null;
        const lChg = lh !== S, rChg = rh !== S;
        if (lChg && !lu[key]) lu[key] = now;
        if (!lChg && !rChg) { newShadow[key] = S; continue; }
        if (lh === rh) { newShadow[key] = lh; delete lu[key]; continue; }
        const takeLocal = lChg && (!rChg || (lu[key] || now) >= (Rr?.u || 0));
        if (takeLocal && L === undefined && Rr?.d != null) { tombs.push(key); continue; } // xoá hẳn: xét gộp ở dưới cho an toàn
        if (takeLocal) { R[key] = { u: lu[key] || now, h: lh, d: L === undefined ? null : L }; newShadow[key] = lh; push = true; delete lu[key]; }
        else if (L !== undefined && (Rr?.d ?? null) == null && (key.startsWith('m:') || key.startsWith('k:'))) { rdel.push({ key, lh, L }); continue; } // Drive bảo xoá: xét gộp ở dưới cho an toàn
        else { const d = rewrite(alias, key, Rr?.d ?? null); await applyRec(key, d); newShadow[key] = d == null ? null : hash(d); if (newShadow[key] !== rh) { R[key] = { u: now, h: newShadow[key], d }; push = true; } changedLocal++; delete lu[key]; }
      }
      // một lần mà xoá quá nhiều (>30% và >10 bản ghi) thì nghi là kho trong máy bị hỏng/đang dọn → không xoá trên Drive, lấy lại về máy
      const massDel = tombs.length > 10 && tombs.length > liveR * .3;
      for (const key of tombs) { if (massDel) { const d = rewrite(alias, key, R[key].d); await applyRec(key, d); newShadow[key] = hash(d); changedLocal++; } else { R[key] = { u: lu[key] || now, h: null, d: null }; newShadow[key] = null; push = true; } delete lu[key]; }
      if (massDel) console.warn('Đồng bộ: bỏ qua', tombs.length, 'lệnh xoá bất thường');
      // ngược lại: Drive đòi xoá quá nhiều bản ghi trong máy (>30% và >10) → không tin, giữ dữ liệu trong máy và đẩy lại lên Drive
      const massR = rdel.length > 10 && rdel.length > liveL * .3;
      for (const { key, lh, L } of rdel) { if (massR) { R[key] = { u: now, h: lh, d: L }; newShadow[key] = lh; push = true; } else { await applyRec(key, null); newShadow[key] = null; changedLocal++; } delete lu[key]; }
      if (massR) console.warn('Đồng bộ: Drive đòi xoá', rdel.length, 'bản ghi — bỏ qua, giữ dữ liệu trong máy');
      for (const k of Object.keys(newShadow)) if (newShadow[k] == null && !R[k]) delete newShadow[k];
      if (push || !remote.id) remote.id = await pushDb(remote.id, remote.data);
      await A.metaSet('syncShadow', newShadow); await A.metaSet('syncLU', lu);
      D.cfg.lastSync = Date.now(); D.cfg.dbId = remote.id; await saveCfg(); D.status = '';
      if (changedLocal) { REG = null; await A.onRemoteApplied?.(changedLocal); }
      setTimeout(organize, 400);
      return true;
    } catch (e) {
      D.status = e.code === 'login' ? 'Cần đăng nhập lại Google để đồng bộ' : e.code === 'net' ? 'Đang chờ mạng để đồng bộ' : e.message;
      if (e.code === 'retry' || e.code === 'net') { clearTimeout(D.syncRetry); D.syncRetry = setTimeout(() => sync('retry'), 30e3); }
      return false;
    } finally { D.syncing = false; emit(); if (D.again) { D.again = false; setTimeout(() => sync('again'), 300); } }
  }
  // gọi sau mỗi thay đổi dữ liệu: gom lại 5 giây rồi đồng bộ; có ảnh mới thì đẩy hàng đợi
  function markDirty() { if (!on || !signedIn()) return; clearTimeout(D.dirtyT); D.dirtyT = setTimeout(() => { D.dirtyT = 0; sync('change'); pump(); }, 5000); }
  document.addEventListener('visibilitychange', () => { if (!on || !signedIn()) return; if (!document.hidden) { sync('focus'); pump(); } else if (D.dirtyT || D.pendingSync) { clearTimeout(D.dirtyT); D.dirtyT = 0; D.pendingSync = false; sync('hide'); } });

  // ---------- giao diện: viên tiến độ + mục Cài đặt ----------
  function renderPill() {
    if (!on) return; let p = $('#drvPill');
    const show = signedIn() && (D.q.running && D.q.total > 0);
    if (!p) { if (!show) return; p = document.createElement('button'); p.id = 'drvPill'; p.onclick = () => A.openSettings?.('drive'); document.body.appendChild(p); }
    p.classList.toggle('on', show); if (!show) return;
    p.textContent = `☁️ Đang lưu ${Math.min(D.q.done + 1, D.q.total)}/${D.q.total}${D.q.part ? ` · ${Math.round(D.q.part * 100)}%` : ''}`;
  }
  const fmtSize = b => b > 1e9 ? (b / 1e9).toFixed(1).replace('.', ',') + ' GB' : Math.max(0, Math.round(b / 1e6)) + ' MB';
  async function renderSettings() {
    const box = $('#drvSec'); if (!box) return; box.hidden = !on; if (!on) return;
    if (!signedIn()) {
      box.innerHTML = `<h3>Google Drive</h3><p class="hint">Đăng nhập Google để tự chép ảnh, video lên Drive của bạn và mở lại đủ dữ liệu ở máy khác, ở Safari hay app ở Màn hình chính — chỉ cần đăng nhập. App chỉ thấy các tệp do chính nó tạo trong Drive của bạn.</p><button class="primary" data-d="in">${A.icon('people', 17)}<span>Đăng nhập Google</span></button>`;
    } else {
      const ms = (await A.dbAll('moments')).filter(m => !m.deleted), up = ms.filter(m => m.driveFileId).length;
      const st = D.status || (D.q.running ? `Đang lưu ${Math.min(D.q.done + 1, D.q.total)}/${D.q.total}${D.q.cur ? ' · ' + D.q.cur : ''}` : D.q.err ? 'Lỗi: ' + D.q.err + ' — sẽ tự thử lại' : D.cfg.lastSync ? 'Đã đồng bộ lúc ' + (d => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')} · ${d.getDate()}/${d.getMonth() + 1}`)(new Date(D.cfg.lastSync)) : 'Chưa đồng bộ');
      box.innerHTML = `<h3>Google Drive</h3>
        <div class="drv-acc">${D.cfg.picture ? `<img src="${A.esc(D.cfg.picture)}" alt="" referrerpolicy="no-referrer">` : `<i>${A.esc((D.cfg.name || '?')[0])}</i>`}<div><b>${A.esc(D.cfg.name || '')}</b><small>${A.esc(D.cfg.email)}</small></div></div>
        <p class="drv-st">${A.esc(st)}</p><p class="hint">${up}/${ms.length} ảnh, video đã có bản gốc trên Drive${D.cfg.all ? '' : ' (tự lưu ảnh mới thêm từ lúc đăng nhập)'}. App chỉ thấy các tệp do chính nó tạo trong Drive của bạn.</p>
        <p class="hint drv-tree">Ảnh xếp theo: <b>Hành Trình Của Bạn › tên bé › năm › ngày · tên sự kiện</b> (nhóm nhiều ngày: “2025-09-12 → 15 · Đi biển”). Đổi tên, gộp, tách sự kiện trong app thì thư mục trên Drive đổi theo.</p>
        <div class="drv-b">${!D.cfg.all || up < ms.length ? `<button data-d="all">${A.icon('download', 16)}<span>Lưu tất cả ảnh cũ lên Drive</span></button>` : ''}<button data-d="sync">${A.icon('timeline', 16)}<span>Đồng bộ ngay</span></button>${rootId() ? `<button data-d="open">${A.icon('image', 16)}<span>Mở thư mục Hành Trình Của Bạn trên Drive</span></button>` : ''}${D.status && /đăng nhập lại/i.test(D.status) ? `<button class="primary" data-d="re">Đăng nhập lại</button>` : ''}</div>
        <label class="tog drv-slim"><span>Chỉ giữ bản nhỏ trên máy <small>bản gốc đã lên Drive thì xoá khỏi máy, mở xem sẽ tải lại từ Drive${D.cfg.saved ? ` · đã tiết kiệm ${fmtSize(D.cfg.saved)}` : ''}</small></span><input type="checkbox" data-d="slim" ${D.cfg.slim ? 'checked' : ''}></label>
        <button class="drv-out" data-d="out">Đăng xuất (không xoá gì)</button>`;
    }
  }
  document.addEventListener('click', async e => {
    const b = e.target.closest('#drvSec [data-d]'); if (!b || b.tagName === 'INPUT') return; const a = b.dataset.d;
    if (a === 'in' || a === 're') signIn();
    else if (a === 'out') { if (await A.ask('Đăng xuất Google?', 'Ảnh, video, dữ liệu trong máy và trên Drive vẫn giữ nguyên. Đăng nhập lại là đồng bộ tiếp.', 'Đăng xuất')) signOut(); }
    else if (a === 'all') { D.cfg.all = true; D.paused = false; await saveCfg(); emit(); pump(); A.toast('Đang lưu dần các ảnh cũ lên Drive — cứ dùng app bình thường', 2600); }
    else if (a === 'sync') { await sync('manual'); pump(); A.toast(D.status || 'Đã đồng bộ', 1800); }
    else if (a === 'open') window.open('https://drive.google.com/drive/folders/' + rootId(), '_blank');
  });
  document.addEventListener('change', async e => {
    const c = e.target.closest('#drvSec [data-d="slim"]'); if (!c) return;
    if (c.checked && !(await A.ask('Chỉ giữ bản nhỏ trên máy?', 'Bản gốc nào đã lên Drive sẽ được xoá khỏi máy để nhẹ máy; khi mở xem, app tải lại từ Drive (cần mạng). Ảnh chưa lên Drive vẫn giữ nguyên.', 'Bật'))) { c.checked = false; return; }
    D.cfg.slim = c.checked; await saveCfg(); if (c.checked) await slimNow(); emit();
  });
  async function slimNow() { let n = 0, s = 0; for (const m of await A.dbAll('moments')) if (m.driveFileId) { const b = await A.dbGetRaw('blobs', 'o_' + m.id); if (b) { await A.dbDel('blobs', 'o_' + m.id); n++; s += b.size; } } D.cfg.saved = (D.cfg.saved || 0) + s; await saveCfg(); if (n) A.toast(`Đã dọn ${n} bản gốc khỏi máy · tiết kiệm ${fmtSize(s)}`, 3000); return n; }

  // ---------- khởi động ----------
  async function boot() {
    D.cfg = (await A.metaGet('drv')) || { folders: {} };
    if (!on) return { redirected: false };
    loadSession(); const redirected = readRedirect();
    if (redirected && !signedIn()) { try { const u = await json('/oauth2/v3/userinfo'); D.cfg = { ...D.cfg, email: u.email, name: u.name || u.email, picture: u.picture || '', since: D.cfg.since || Date.now() }; await saveCfg(); } catch (e) { } }
    emit();
    return { redirected };
  }
  addEventListener('hashchange', async () => { if (on && /[#&](access_token|error)=/.test(location.hash) && readRedirect()) { try { const u = await json('/oauth2/v3/userinfo'); D.cfg = { ...D.cfg, email: u.email, name: u.name || u.email, picture: u.picture || '', since: D.cfg.since || Date.now() }; await saveCfg(); emit(); await afterLogin(); } catch (e) { } } });
  const rootId = () => REG?.root?.id || D.cfg?.folders?.['root/' + ROOT_NAME] || OLD_ROOTS.map(n => D.cfg?.folders?.['root/' + n]).find(Boolean) || null;
  const folderOf = (kidId, key) => REG?.['ev:all:' + key]?.id || REG?.['ev:' + kidId + ':' + key]?.id || null;
  // tệp phụ trong appDataFolder (bản đồ sa bàn đã tải theo khu, giọng kể…): tên cố định, ghi đè được
  async function appFind(name) { const j = await json('/drive/v3/files?' + new URLSearchParams({ q: `name='${qesc(name)}' and trashed=false`, spaces: 'appDataFolder', fields: 'files(id)', pageSize: '2' })); return j.files?.[0]?.id || null; }
  async function putApp(name, blob) { if (!on || !signedIn() || !navigator.onLine) return null; try { const id = await appFind(name); return await upload({ blob, name, mime: blob.type || 'application/octet-stream', parents: id ? undefined : ['appDataFolder'], fileId: id || undefined, key: 'app:' + name }); } catch (e) { console.warn('putApp', e.message); return null; } }
  async function getApp(name) { if (!on || !signedIn() || !navigator.onLine) return null; try { const id = await appFind(name); return id ? await download(id) : null; } catch (e) { return null; } }
  // tệp thấy được trong thư mục sự kiện (giọng kể, video kỷ niệm)
  async function putVisible({ blob, name, kidId, key, mime }) { if (!on || !signedIn() || !navigator.onLine) return null; try { const places = await A.places(); let parent = null; for (const p of places.values()) if (p.key === key && (p.flat || !kidId || p.kidId === kidId)) { parent = await eventFolder(p); break; } if (!parent) parent = await ensureFolder('root', ROOT_NAME, 'root'); return await upload({ blob, name: safe(name, 100), mime: mime || blob.type, parents: [parent], key: 'vis:' + name + ':' + blob.size }); } catch (e) { console.warn('putVisible', e.message); return null; } }
  // tệp cố định trong thư mục gốc thấy được (bản lưu bền doc-hanh-trinh.html, hanh-trinh.json): có rồi thì ghi đè
  async function putRoot(name, blob, mime) {
    if (!on || !signedIn() || !navigator.onLine) return null;
    try { await loadReg(); const root = await ensureFolder('root', ROOT_NAME, 'root'); await saveReg();
      const j = await json('/drive/v3/files?' + new URLSearchParams({ q: `name='${qesc(name)}' and '${root}' in parents and trashed=false`, fields: 'files(id)', spaces: 'drive', pageSize: '2' }));
      const id = j.files?.[0]?.id; return await upload({ blob, name, mime: mime || blob.type, parents: id ? undefined : [root], fileId: id || undefined, key: 'root:' + name + ':' + blob.size });
    } catch (e) { console.warn('putRoot', e.message); return null; } }
  // ---------- v1.8.0: ALBUM CHUNG CẢ NHÀ — thư mục riêng (nhãn appProperties 'album') chia sẻ cho người nhà ----------
  async function album(create = false) {
    if (!on || !signedIn()) return null; await loadReg(); if (REG.album?.id) return REG.album;
    if (!create) { try { const j = await json('/drive/v3/files?' + new URLSearchParams({ q: "appProperties has { key='nganha' and value='album' } and mimeType='application/vnd.google-apps.folder' and trashed=false", fields: 'files(id,name)', spaces: 'drive', pageSize: '2' })); const f = j.files?.[0]; if (f) { REG.album = { id: f.id, name: f.name }; regDirty = true; await saveReg(); return REG.album; } } catch (e) { } return null; }
    const root = await ensureFolder('root', ROOT_NAME, 'root'); const id = await ensureFolder('album', 'Album chung cả nhà', root); await saveReg(); return REG.album || { id };
  }
  async function shareAlbum(email) {
    const a = await album(true); if (!a) return false;
    await json(`/drive/v3/files/${a.id}/permissions?` + new URLSearchParams({ sendNotificationEmail: 'true', emailMessage: 'Mời bạn cùng xem và thêm ảnh vào album chung của gia đình (app Hành Trình Của Bạn).', fields: 'id' }), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'writer', type: 'user', emailAddress: email }) });
    return true;
  }
  async function albumPeople() { const a = await album(); if (!a) return []; try { const j = await json(`/drive/v3/files/${a.id}/permissions?fields=permissions(id,emailAddress,role,displayName)`); return (j.permissions || []).filter(p => p.role !== 'owner'); } catch (e) { return []; } }
  // gửi ảnh vào album: đã có bản gốc trên Drive thì sao chép tệp (không tải lại), chưa có thì tải thẳng lên
  async function toAlbum(m, blob, name) {
    const a = await album(true); if (!a) return null;
    if (m.driveFileId) { try { return (await json(`/drive/v3/files/${m.driveFileId}/copy?fields=id`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parents: [a.id], name }) })).id; } catch (e) { } }
    if (!blob) return null; return upload({ blob, name, mime: blob.type || m.mime, parents: [a.id], key: 'alb:' + m.id });
  }
  async function accessToken() { return getToken(false); }
  const fetchFile = async id => { if (!on || !signedIn()) return null; try { return await download(id); } catch (e) { return null; } };
  const api = { on, boot, organize, putApp, getApp, putVisible, putRoot, album, shareAlbum, albumPeople, toAlbum, accessToken, fetchFile, folderOf, rootId, loadReg, signIn, signOut, sync, pump, markDirty, fetchBlob, processTrash, slimNow, renderSettings, afterLogin, get signedIn() { return signedIn(); }, get state() { return D; }, standalone, redirectUri, SCOPES };
  return api;
}
