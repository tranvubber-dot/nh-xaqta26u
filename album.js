// Hành Trình Của Bạn — 👨‍👩‍👧 ALBUM CHUNG CẢ NHÀ qua Google Drive (quyền drive.file: app chỉ thấy tệp nó tạo hoặc bạn tự chọn).
// • Bạn tạo thư mục "Album chung cả nhà" và mời người nhà bằng email (quyền xem + thêm ảnh).
// • Gửi ảnh của một kỷ niệm vào album (đã có bản gốc trên Drive thì sao chép, không tải lại).
// • Lấy ảnh người nhà chia sẻ: mở Google Picker (khoá GOOGLE_API_KEY + GOOGLE_APP_ID trong config.js), chọn nhiều ảnh → app tải về
//   và xếp vào hành trình theo ngày chụp (bỏ ảnh trùng như khi thêm ảnh thường).
import { icon } from './ui.js';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MIMES = 'image/jpeg,image/png,image/heic,image/heif,image/webp,video/mp4,video/quicktime';

export function initAlbum(A) {
  let loading = null;
  const loadPicker = () => loading ||= new Promise((res, rej) => {
    if (window.google?.picker) return res();
    const s = document.createElement('script'); s.src = 'https://apis.google.com/js/api.js'; s.async = true;
    s.onload = () => window.gapi.load('picker', { callback: res, onerror: rej, timeout: 15000, ontimeout: rej }); s.onerror = () => { loading = null; rej(new Error('Không tải được Google Picker — kiểm tra mạng')); }; document.head.appendChild(s);
  });
  async function render(box) {
    if (!box) return; const D = A.drive;
    if (!D?.on) { box.hidden = true; return; } box.hidden = false;
    if (!D.signedIn) { box.innerHTML = `<h3>👨‍👩‍👧 Album chung cả nhà</h3><p class="hint" style="margin:0">Đăng nhập Google ở mục phía trên để tạo album chung, mời người nhà cùng xem và thêm ảnh.</p>`; return; }
    const a = await D.album(), ps = a ? await D.albumPeople() : [];
    box.innerHTML = `<h3>👨‍👩‍👧 Album chung cả nhà</h3><p class="hint" style="margin-top:0">Một thư mục trên Google Drive của bạn để cả nhà cùng xem và thêm ảnh. Người được mời mở bằng Google Drive hoặc app này (“Lấy ảnh từ album người nhà”).</p>
      ${a ? `<p class="hint">Album: <b>${esc(a.name || 'Album chung cả nhà')}</b>${ps.length ? ` · đã mời: ${ps.map(p => esc(p.displayName || p.emailAddress)).join(', ')}` : ' · chưa mời ai'}</p>` : ''}
      <div class="drow" style="flex-wrap:wrap;margin-top:8px"><button data-al="invite">${icon('people', 16, 2)}<span>${a ? 'Mời thêm người nhà' : 'Tạo album + mời người nhà'}</span></button><button data-al="pick">${icon('download', 16, 2)}<span>Lấy ảnh từ album người nhà</span></button>${a ? `<button data-al="open">${icon('image', 16, 2)}<span>Mở album trên Drive</span></button>` : ''}</div>`;
    box.onclick = async e => { const b = e.target.closest('[data-al]'); if (!b) return; const k = b.dataset.al;
      if (k === 'invite') { const em = (await A.prompt('Email Google của người nhà', '', 80, 'email'))?.trim(); if (!em) return; if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { A.toast('Email chưa đúng — bạn kiểm tra lại nhé', 2200); return; }
        b.disabled = true; try { await D.shareAlbum(em); A.toast(`Đã mời ${em} vào album chung 💌 — họ sẽ nhận email từ Google`, 3200); window.SFX?.play('ting'); } catch (er) { A.toast('Chưa mời được: ' + (er.message || er), 3200); } b.disabled = false; render(box); }
      else if (k === 'open') { const a2 = await D.album(); if (a2) window.open('https://drive.google.com/drive/folders/' + a2.id, '_blank'); }
      else if (k === 'pick') pick(); };
  }
  async function pick() {
    const D = A.drive; if (!D?.signedIn) { A.toast('Bạn đăng nhập Google trước nhé', 2200); return; }
    if (!A.apiKey || !A.appId) { A.toast('Bản cài này chưa có khoá Google Picker', 2600); return; }
    try {
      A.toast('Đang mở Google Picker…', 1500); await loadPicker(); const tok = await D.accessToken(), G = window.google.picker;
      const shared = new G.DocsView(G.ViewId.DOCS).setMimeTypes(MIMES).setIncludeFolders(true).setOwnedByMe(false).setMode(G.DocsViewMode.GRID);
      const mine = new G.DocsView(G.ViewId.DOCS).setMimeTypes(MIMES).setIncludeFolders(true).setOwnedByMe(true).setMode(G.DocsViewMode.GRID);
      A.closeAll?.();
      new G.PickerBuilder().addView(shared).addView(mine).enableFeature(G.Feature.MULTISELECT_ENABLED).setOAuthToken(tok).setDeveloperKey(A.apiKey).setAppId(A.appId).setLocale('vi').setTitle('Chọn ảnh, video từ album người nhà')
        .setCallback(d => { if (d[G.Response.ACTION] === G.Action.PICKED) importDocs(d[G.Response.DOCUMENTS] || []); }).build().setVisible(true);
    } catch (e) { A.toast(e.message || 'Chưa mở được Google Picker', 3000); }
  }
  // tải các tệp đã chọn về rồi nhập như ảnh thường (đọc ngày chụp, bỏ trùng)
  async function importDocs(docs) {
    const files = []; let i = 0;
    for (const d of docs) { i++; A.toast(`Đang tải ${i}/${docs.length} từ Drive…`, 2500); const id = d.id || d[window.google?.picker?.Document?.ID]; const b = await A.drive.fetchFile(id); if (!b) continue;
      files.push(new File([b], d.name || ('anh-' + id), { type: d.mimeType || b.type, lastModified: d.lastEditedUtc || Date.now() })); }
    if (!files.length) { A.toast('Chưa tải được tệp nào — app chỉ đọc được tệp bạn vừa chọn trong Picker', 3200); return 0; }
    const r = await A.importFiles(files); A.toast(`Đã thêm ảnh từ album người nhà vào hành trình ✨`, 2600); window.SFX?.play('ting'); return r;
  }
  // gửi ảnh của một kỷ niệm vào album chung
  async function sendEvent(e) {
    const D = A.drive; if (!D?.signedIn) { A.toast('Bạn đăng nhập Google trước nhé', 2200); return 0; } let n = 0;
    A.toast(`Đang gửi ${e.ms.length} ảnh vào album chung…`, 2500);
    for (const m of e.ms) { const b = await A.blob(m.id); const ext = (m.type === 'video' ? 'mp4' : 'jpg'); const id = await D.toAlbum(m, b, `${A.ymd(m.ts)} ${e.title}`.replace(/[\\/:*?"<>|]+/g, '') + ` ${++n}.${ext}`); if (!id) n--; }
    A.toast(n ? `Đã gửi ${n} ảnh vào album chung 👨‍👩‍👧` : 'Chưa gửi được — kiểm tra mạng rồi thử lại', 2600); if (n) window.SFX?.play('ting'); return n;
  }
  return { render, pick, sendEvent, importDocs };
}
