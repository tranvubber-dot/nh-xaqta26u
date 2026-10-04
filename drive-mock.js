// CHỈ DÙNG KHI THỬ (?test&mock): giả lập Google Identity Services + Google Drive API v3 trong trình duyệt.
// Kho giả nằm trong IndexedDB "mock_drive" (dùng chung cho nhiều "máy" = nhiều DB thử trên cùng origin).
// Hỗ trợ: userinfo, files.list (q đơn giản, spaces), files.create (thư mục), files.get (alt=media), files.update (trashed),
// upload resumable (POST/PATCH + PUT từng khúc, 308 + Range, hỏi tiến độ "bytes */N"). Có bơm lỗi: rớt mạng, 401, Drive đầy.
const DB = 'mock_drive';
let _db;
const open = () => _db ? Promise.resolve(_db) : new Promise((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => { r.result.createObjectStore('files', { keyPath: 'id' }); r.result.createObjectStore('sess', { keyPath: 'id' }); }; r.onsuccess = () => res(_db = r.result); r.onerror = () => rej(r.error); });
const tx = async (st, mode, fn) => { const d = await open(); return new Promise((res, rej) => { const t = d.transaction(st, mode), s = t.objectStore(st); let out; const q = fn(s); if (q) q.onsuccess = () => out = q.result; t.oncomplete = () => res(out); t.onerror = () => rej(t.error); }); };
const get = (st, id) => tx(st, 'readonly', s => s.get(id)), put = (st, v) => tx(st, 'readwrite', s => s.put(v)), all = st => tx(st, 'readonly', s => s.getAll());
const J = (o, status = 200, headers = {}) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', ...headers } });
let n = 0; const nid = p => p + Date.now().toString(36) + (++n).toString(36) + Math.random().toString(36).slice(2, 5);

export const MOCK = { calls: [], putCount: 0, failPutAt: 0, fail401: 0, quota: false, tokenN: 0, user: { name: 'Bố Rin', email: 'bo.rin@example.com', picture: '' }, slow: 0 };
export async function reset() { await tx('files', 'readwrite', s => s.clear()); await tx('sess', 'readwrite', s => s.clear()); }
export async function files() { return all('files'); }

export function install() {
  if (window.__mockDrive) return MOCK; window.__mockDrive = true;
  window.google = { accounts: { oauth2: {
    initTokenClient: cfg => ({ requestAccessToken: () => setTimeout(() => cfg.callback({ access_token: 'mocktok' + (++MOCK.tokenN), expires_in: 3599, scope: cfg.scope }), 40) }),
    hasGrantedAllScopes: () => true, revoke: (t, cb) => cb && cb()
  } } };
  const real = window.fetch.bind(window);
  window.fetch = async (input, opt = {}) => {
    const url = String(input?.url || input);
    if (!/^https:\/\/(www\.)?googleapis\.com\//.test(url)) return real(input, opt);
    if (MOCK.slow) await new Promise(r => setTimeout(r, MOCK.slow));
    const u = new URL(url), m = (opt.method || 'GET').toUpperCase(), h = new Headers(opt.headers || {}), path = u.pathname;
    MOCK.calls.push(m + ' ' + path + u.search.slice(0, 60));
    const isSess = u.searchParams.has('upload_id');
    if (!isSess) { const auth = h.get('Authorization') || ''; if (!/^Bearer mocktok\d+/.test(auth)) return J({ error: { code: 401 } }, 401); if (MOCK.fail401 > 0) { MOCK.fail401--; return J({ error: { code: 401, message: 'expired' } }, 401); } }
    if (path === '/oauth2/v3/userinfo') return J(MOCK.user);
    // upload phiên resumable: PUT từng khúc
    if (isSess && m === 'PUT') {
      MOCK.putCount++; if (MOCK.failPutAt && MOCK.putCount === MOCK.failPutAt) throw new TypeError('Failed to fetch (giả lập rớt mạng)');
      const s = await get('sess', u.searchParams.get('upload_id')); if (!s) return J({ error: { code: 404 } }, 404);
      const cr = h.get('Content-Range') || '', mm = /bytes (\d+)-(\d+)\/(\d+)/.exec(cr), q = /bytes \*\/(\d+)/.exec(cr);
      const have = s.parts.reduce((a, b) => a + b.size, 0);
      const finish = async () => { const blob = new Blob(s.parts, { type: s.mime }); let f = s.fileId ? await get('files', s.fileId) : null; if (!f) f = { id: nid('f'), name: s.meta.name, parents: s.meta.parents || ['root'], mimeType: s.mime, trashed: false, created: Date.now() }; f.blob = blob; f.size = blob.size; f.modifiedTime = new Date().toISOString(); await put('files', f); s.done = f.id; await put('sess', s); return J({ id: f.id, name: f.name }, s.fileId ? 200 : 201); };
      if (q) { if (s.done) return J({ id: s.done }, 200); return new Response('', { status: 308, headers: have ? { Range: `bytes=0-${have - 1}` } : {} }); }
      if (!mm) return J({ error: { code: 400 } }, 400);
      const a = +mm[1]; if (a !== have) return new Response('', { status: 308, headers: have ? { Range: `bytes=0-${have - 1}` } : {} });
      if (MOCK.quota) return J({ error: { code: 403, errors: [{ reason: 'storageQuotaExceeded' }] } }, 403);
      s.parts.push(opt.body instanceof Blob ? opt.body : new Blob([opt.body || ''])); await put('sess', s);
      const now = have + (opt.body?.size || 0); if (now >= s.total) return finish();
      return new Response('', { status: 308, headers: { Range: `bytes=0-${now - 1}` } });
    }
    // mở phiên upload
    if (path.startsWith('/upload/drive/v3/files')) {
      if (MOCK.quota) return J({ error: { code: 403, errors: [{ reason: 'storageQuotaExceeded' }] } }, 403);
      const fileId = path.split('/')[5] || null, meta = opt.body ? JSON.parse(opt.body) : {};
      const s = { id: nid('s'), meta, fileId, total: +(h.get('X-Upload-Content-Length') || 0), mime: h.get('X-Upload-Content-Type') || 'application/octet-stream', parts: [] };
      await put('sess', s);
      return new Response('', { status: 200, headers: { Location: `https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=${s.id}` } });
    }
    if (path === '/drive/v3/files' && m === 'GET') {
      const q = u.searchParams.get('q') || '', sp = u.searchParams.get('spaces') || 'drive';
      let fs = (await all('files')).filter(f => (sp === 'appDataFolder') === (f.parents || []).includes('appDataFolder'));
      const names = [...q.matchAll(/name='((?:[^'\\]|\\.)*)'/g)].map(x => x[1].replace(/\\(.)/g, '$1')), name = names.length ? names : null, par = /'([^']+)' in parents/.exec(q)?.[1], mime = /mimeType='([^']+)'/.exec(q)?.[1];
      const ap = /appProperties has \{ key='([^']+)' and value='((?:[^'\\]|\\.)*)' \}/.exec(q); if (ap) fs = fs.filter(f => f.appProperties?.[ap[1]] === ap[2].replace(/\\(.)/g, '$1'));
      if (name != null && !ap) fs = fs.filter(f => name.includes(f.name)); if (par) fs = fs.filter(f => (f.parents || []).includes(par)); if (mime) fs = fs.filter(f => f.mimeType === mime); if (/trashed=false/.test(q)) fs = fs.filter(f => !f.trashed);
      return J({ files: fs.map(f => ({ id: f.id, name: f.name, mimeType: f.mimeType, modifiedTime: f.modifiedTime, size: f.size, parents: f.parents })) });
    }
    if (path === '/drive/v3/files' && m === 'POST') { const meta = JSON.parse(opt.body || '{}'), f = { id: nid('d'), name: meta.name, parents: meta.parents || ['root'], mimeType: meta.mimeType, appProperties: meta.appProperties, trashed: false, created: Date.now(), modifiedTime: new Date().toISOString() }; await put('files', f); return J({ id: f.id }); }
    const fm = /^\/drive\/v3\/files\/([^/]+)$/.exec(path);
    if (fm) {
      const f = await get('files', fm[1]); if (!f) return J({ error: { code: 404 } }, 404);
      if (m === 'GET') { if (u.searchParams.get('alt') === 'media') return new Response(f.blob || new Blob([]), { status: 200 }); const { blob, ...meta } = f; return J(meta); }
      if (m === 'PATCH') { const b = JSON.parse(opt.body || '{}'); if (b.appProperties) { f.appProperties = { ...(f.appProperties || {}), ...b.appProperties }; delete b.appProperties; } Object.assign(f, b);
        const add = u.searchParams.get('addParents'), rem = u.searchParams.get('removeParents'); if (rem) f.parents = (f.parents || []).filter(x => !rem.split(',').includes(x)); if (add) f.parents = [...new Set([...(f.parents || []), ...add.split(',')])]; MOCK.moves = (MOCK.moves || 0) + (add ? 1 : 0);
        await put('files', f); return J({ id: f.id, parents: f.parents }); }
    }
    return J({ error: { code: 400, message: 'mock: không hỗ trợ ' + m + ' ' + path } }, 400);
  };
  return MOCK;
}
