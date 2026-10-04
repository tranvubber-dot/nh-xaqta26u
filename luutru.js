// Hành Trình Của Bạn — BẢN LƯU BỀN: một tệp HTML tự chứa (doc-hanh-trinh.html) mở được bằng bất kỳ trình duyệt nào,
// không cần app, không cần mạng: người thân, chương đời, sự kiện (ngày, tên, lời kể, nơi chốn, người có mặt), ảnh nhỏ nhúng sẵn,
// bấm ảnh mở bản gốc trên Google Drive (nếu đã lưu lên). Kèm hanh-trinh.json (dữ liệu thô, không ảnh) để sau này nhập lại.
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = n => String(n).padStart(2, '0');
const dmy = ts => { const d = new Date(ts); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };

async function tiny(blob, side = 200) {
  try {
    const bmp = await createImageBitmap(blob), k = Math.min(1, side / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k)); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
    const u = c.toDataURL('image/jpeg', .62); c.width = c.height = 1; return u;
  } catch (e) { return ''; }
}
// o: { me, people[], chapters[], events[] (mới nhất trước), thumbBlob(id), roleName(p), version, perEvent }
export async function buildArchive(o) {
  const per = o.perEvent || 6, people = o.people || [], P = new Map(people.map(p => [p.id, p])), evs = o.events.slice().sort((a, b) => a.ts0 - b.ts0);
  const who = ids => (ids || []).map(id => P.get(id)).filter(p => p && p.role !== 'me').map(p => p.name);
  const data = { app: 'Hành Trình Của Bạn', kind: 'ban-luu-ben', version: o.version, created: new Date().toISOString(), me: o.me ? { name: o.me.name, fullName: o.me.fullName || null, birth: o.me.birth || null } : null,
    people: people.map(p => ({ id: p.id, name: p.name, fullName: p.fullName || null, role: p.role || 'con', relation: o.roleName?.(p) || '', birth: p.birth || null, gender: p.gender || null })),
    chapters: (o.chapters || []).map(c => ({ key: c.key, title: c.title, start: c.start, intro: c.intro || null })),
    events: evs.map(e => ({ key: e.key, title: e.title, from: new Date(e.ts0).toISOString(), to: new Date(e.ts1).toISOString(), note: e.note || '', place: e.geo?.name || null, gps: e.geo ? { lat: e.geo.lat, lon: e.geo.lon } : null, people: who(e.kids), photos: e.ms.length, chapter: e.chapter?.title || null, drive: e.ms.map(m => m.driveFileId).filter(Boolean) })) };
  const blocks = []; let curCh = null, curY = null, nImg = 0;
  for (const e of evs) {
    if (e.chapter && e.chapter.key !== curCh) { curCh = e.chapter.key; curY = null; blocks.push(`<section class="ch"><small>Chương ${e.chapter.num || ''}</small><h2>${esc(e.chapter.ic || '')} ${esc(e.chapter.title)}</h2>${e.chapter.intro ? `<p class="in">${esc(e.chapter.intro)}</p>` : ''}</section>`); }
    const y = new Date(e.ts0).getFullYear(); if (y !== curY) { curY = y; blocks.push(`<h3 class="yr">${y}</h3>`); }
    const imgs = [];
    for (const m of e.ms.filter(m => m.type !== 'video').slice(0, per)) { const t = await o.thumbBlob(m.id); const u = t ? await tiny(t) : ''; if (!u) continue; nImg++; imgs.push(m.driveFileId ? `<a href="https://drive.google.com/file/d/${esc(m.driveFileId)}/view" target="_blank" rel="noopener"><img src="${u}" alt="" loading="lazy"></a>` : `<img src="${u}" alt="" loading="lazy">`); }
    const ppl = who(e.kids), more = e.ms.length - imgs.length;
    blocks.push(`<article><div class="d">${esc(e.days?.length > 1 ? `${dmy(e.ts0)} – ${dmy(e.ts1)}` : dmy(e.ts0))}${e.geo?.name ? ` · 📍 ${esc(e.geo.name.split(',')[0])}` : ''}</div><h4>${esc(e.title)}</h4>${ppl.length ? `<div class="p">Có mặt: ${esc(ppl.join(', '))}</div>` : ''}${e.note ? `<p class="n">${esc(e.note).replace(/\n/g, '<br>')}</p>` : ''}${imgs.length ? `<div class="g">${imgs.join('')}</div>` : ''}${more > 0 ? `<div class="m">+ ${more} ảnh/video khác${e.ms.some(m => m.driveFileId) ? ' trong Google Drive' : ''}</div>` : ''}</article>`);
  }
  const me = o.me, title = me ? `Hành trình của ${me.name}` : 'Hành trình của gia đình';
  const fam = people.filter(p => p.role !== 'me').map(p => `<li><b>${esc(p.name)}</b>${p.fullName ? ` (${esc(p.fullName)})` : ''} — ${esc(o.roleName?.(p) || '')}${p.birth ? `, sinh ${esc(p.birthApprox ? 'năm ' + p.birth.slice(0, 4) : dmy(Date.parse(p.birth + 'T12:00:00')))}` : ''}</li>`).join('');
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>:root{color-scheme:light}body{margin:0;font:16px/1.6 -apple-system,system-ui,"Segoe UI",Roboto,sans-serif;color:#3d1b35;background:#fff7f2}main{max-width:760px;margin:0 auto;padding:24px 16px 60px}
header{text-align:center;padding:28px 12px;border-radius:24px;background:linear-gradient(135deg,#ffd9ea,#ffe9c4);margin-bottom:20px}header h1{margin:0 0 6px;font-size:30px}header p{margin:2px 0;color:#7d5a75}
.fam{background:#fff;border-radius:18px;padding:14px 18px;margin-bottom:18px;box-shadow:0 4px 16px rgba(80,30,60,.08)}.fam ul{margin:6px 0 0;padding-left:20px}
.ch{margin:34px 0 10px;padding:18px;border-radius:20px;background:linear-gradient(135deg,#a78bfa,#ff8fbf);color:#fff}.ch small{opacity:.85;font-weight:700}.ch h2{margin:2px 0 4px}.ch .in{margin:6px 0 0;font-style:italic}
.yr{margin:22px 0 8px;font-size:22px;color:#9a4d7a}article{background:#fff;border-radius:18px;padding:14px 16px;margin:10px 0;box-shadow:0 4px 14px rgba(80,30,60,.07)}article h4{margin:2px 0 4px;font-size:19px}
.d{font-size:13px;font-weight:700;color:#9a6a8a}.p{font-size:14px;color:#7d5a75}.n{margin:8px 0;white-space:normal}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:6px;margin-top:8px}.g img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px;display:block;background:#ffe3ec}
.m{font-size:13px;color:#9a6a8a;margin-top:6px}footer{margin-top:40px;font-size:13px;color:#7d5a75;text-align:center}</style></head><body><main>
<header><h1>${esc(title)}</h1>${me?.fullName ? `<p>${esc(me.fullName)}${me.birth ? ` · sinh ${esc(me.birthApprox ? 'năm ' + me.birth.slice(0, 4) : dmy(Date.parse(me.birth + 'T12:00:00')))}` : ''}</p>` : ''}<p>${evs.length} kỷ niệm · ${o.events.reduce((t, e) => t + e.ms.length, 0)} ảnh, video · bản lưu ngày ${dmy(Date.now())}</p><p style="font-size:13px">Bản lưu bền: mở được bằng bất kỳ trình duyệt nào, không cần app. Bấm ảnh để xem bản gốc trên Google Drive.</p></header>
${fam ? `<section class="fam"><b>Gia đình</b><ul>${fam}</ul></section>` : ''}
${blocks.join('\n')}
<footer>Tạo bởi app Hành Trình Của Bạn · phiên bản ${esc(o.version || '')}<br>Dữ liệu thô (để nhập lại vào app sau này) nằm trong tệp <b>hanh-trinh.json</b> cùng thư mục.</footer>
</main><script type="application/json" id="du-lieu">${JSON.stringify(data).replace(/</g, '\\u003c')}</script></body></html>`;
  return { html: new Blob([html], { type: 'text/html' }), json: new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }), nImg, nEv: evs.length };
}
