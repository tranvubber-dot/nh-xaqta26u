// Hành Trình Của Bạn — 📕 HỒI KÝ PDF: bìa → mục lục → từng chương đời → sự kiện (ngày, tên, người có mặt, ảnh, lời kể).
// Mỗi trang vẽ bằng Canvas 2D (chữ Quicksand tiếng Việt chuẩn), nén JPEG rồi ghép thành PDF bằng bộ ghi PDF tự viết (không thư viện ngoài).
// Khổ A4 (vẽ ở 150 dpi = 1240 × 1754 px). Chạy hoàn toàn trong máy.
const W = 1240, H = 1754, M = 96, CW = W - 2 * M;
const pad = n => String(n).padStart(2, '0');
const dmy = ts => { const d = new Date(ts); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
const F = (w, s) => `${w} ${s}px Quicksand, system-ui, sans-serif`;
const enc = new TextEncoder();

function wrap(x, text, maxW) {
  const out = []; for (const para of String(text || '').split(/\n+/)) { let line = ''; for (const w of para.split(/\s+/).filter(Boolean)) { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; } out.push(line); }
  return out.filter((l, i, a) => l || (i && a[i - 1]));
}
function rr(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
function cover(x, img, X, Y, w, h, r = 18) { x.save(); rr(x, X, Y, w, h, r); x.clip(); const k = Math.max(w / img.width, h / img.height), iw = img.width * k, ih = img.height * k; x.drawImage(img, X + (w - iw) / 2, Y + (h - ih) / 2, iw, ih); x.restore(); }

// ---------- bộ ghi PDF tối giản: mỗi trang một ảnh JPEG phủ kín ----------
function pdfFrom(pages) { // pages: [{ jpg: Uint8Array, w, h }]
  const parts = [], offs = []; let len = 0; const push = b => { const u = typeof b === 'string' ? enc.encode(b) : b; parts.push(u); len += u.length; };
  const obj = (n, body) => { offs[n] = len; push(`${n} 0 obj\n`); for (const b of body) push(b); push('\nendobj\n'); };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'); const N = pages.length, pw = 595.28, ph = 841.89;
  obj(1, ['<< /Type /Catalog /Pages 2 0 R >>']);
  obj(2, [`<< /Type /Pages /Count ${N} /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] >>`]);
  pages.forEach((p, i) => { const po = 3 + i * 3, co = po + 1, io = po + 2, cs = `q ${pw} 0 0 ${ph} 0 0 cm /Im0 Do Q`;
    obj(po, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 ${io} 0 R >> >> /Contents ${co} 0 R >>`]);
    obj(co, [`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`]);
    obj(io, [`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpg.length} >>\nstream\n`, p.jpg, '\nendstream']); });
  const total = 3 + N * 3, xref = len; push(`xref\n0 ${total}\n0000000000 65535 f \n`); for (let n = 1; n < total; n++) push(String(offs[n]).padStart(10, '0') + ' 00000 n \n');
  push(`trailer\n<< /Size ${total} /Root 1 0 R /Info << /Producer (Hanh Trinh Cua Ban) >> >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts, { type: 'application/pdf' });
}

// o: { title, me, people, chapters, events (bất kỳ thứ tự), image(m, big) → ImageBitmap|null, roleName, chibi(p) → url, onProg(p), maxPages }
export async function buildMemoir(o) {
  try { await document.fonts.load('700 40px Quicksand', 'Hồi ký Tiếng Việt'); await document.fonts.load('600 30px Quicksand', 'ệ'); } catch (e) { }
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.textBaseline = 'alphabetic';
  const pages = [], toc = [], maxP = o.maxPages || 160, P = new Map((o.people || []).map(p => [p.id, p])), title = o.title;
  const evs = o.events.slice().sort((a, b) => a.ts0 - b.ts0); let y = 0, pageNo = 0, cut = false, open = false;
  const bg = () => { x.fillStyle = '#fffaf5'; x.fillRect(0, 0, W, H); };
  const foot = () => { x.fillStyle = '#b09aa8'; x.font = F(600, 22); x.textAlign = 'center'; x.fillText(String(pageNo), W / 2, H - 46); x.textAlign = 'left'; x.fillText(title, M, 60, CW * .7); x.textAlign = 'left'; };
  const flush = async () => { const b = await new Promise(r => c.toBlob(r, 'image/jpeg', .84)); pages.push({ jpg: new Uint8Array(await b.arrayBuffer()), w: W, h: H }); o.onProg?.({ pages: pages.length }); };
  const newPage = async () => { if (open) { foot(); await flush(); } pageNo++; bg(); open = true; y = M + 30; if (pageNo > maxP) cut = true; };
  const reserve = async h => { if (y + h > H - M - 40) await newPage(); };
  // ---- bìa ----
  pageNo = 1; { const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#ffd9ea'); g.addColorStop(.55, '#ffe9c4'); g.addColorStop(1, '#d9ccff'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(255,255,255,${.3 + (i * 37 % 10) / 20})`; x.beginPath(); x.arc((i * 211) % W, (i * 389) % H, 3 + (i % 5), 0, 7); x.fill(); }
    if (o.scene) { const im = new Image(); im.src = o.scene; try { await im.decode(); const k = Math.min(CW / im.width, 440 / im.height); x.drawImage(im, W / 2 - im.width * k / 2, 1010 - im.height * k, im.width * k, im.height * k); } catch (e) { } }
    else { const fam = (o.people || []).slice(0, 8); const sz = Math.min(230, CW / Math.max(1, fam.length)); let fx = W / 2 - fam.length * sz / 2;
    for (const p of fam) { const u = o.chibi?.(p); if (u) { const im = new Image(); im.src = u; try { await im.decode(); x.drawImage(im, fx, 560, sz, sz * 4 / 3); } catch (e) { } } fx += sz; } }
    x.textAlign = 'center'; x.fillStyle = '#9a4d7a'; x.font = F(700, 44); x.fillText('HỒI KÝ', W / 2, 300); x.fillStyle = '#3d1b35'; x.font = F(700, 92);
    wrap(x, title, CW).forEach((l, i) => x.fillText(l, W / 2, 420 + i * 104));
    const y0 = evs.length ? new Date(evs[0].ts0).getFullYear() : '', y1 = evs.length ? new Date(evs[evs.length - 1].ts0).getFullYear() : '';
    x.font = F(600, 40); x.fillStyle = '#7d5a75'; x.fillText(`${y0}${y1 && y1 !== y0 ? ' – ' + y1 : ''} · ${evs.length} kỷ niệm`, W / 2, 1120);
    x.font = F(600, 28); x.fillText(`In ngày ${dmy(Date.now())} · Hành Trình Của Bạn`, W / 2, H - 110); x.textAlign = 'left'; await flush(); }
  // ---- chừa trang mục lục (vẽ sau khi biết số trang) ----
  pages.push(null); pageNo = 2;
  let curCh = null;
  for (const e of evs) {
    if (cut) break; if (!open) await newPage();
    if (!e.chapter && !toc.length) toc.push({ t: 'Kỷ niệm', p: pageNo });
    if (e.chapter && e.chapter.key !== curCh) { // trang mở chương
      curCh = e.chapter.key; if (y > M + 31) await newPage(); if (cut) break; const ch = e.chapter; toc.push({ t: `${ch.ic || ''} Chương ${ch.num} · ${ch.title}`, p: pageNo });
      x.fillStyle = ch.c || '#a78bfa'; rr(x, M, y, CW, 360, 40); x.fill(); x.fillStyle = 'rgba(255,255,255,.9)'; x.font = F(700, 34); x.fillText(`CHƯƠNG ${ch.num}`, M + 50, y + 90);
      x.fillStyle = '#fff'; x.font = F(700, 76); wrap(x, `${ch.ic || ''} ${ch.title}`, CW - 100).slice(0, 2).forEach((l, i) => x.fillText(l, M + 50, y + 190 + i * 86));
      const yA = new Date(ch.ts).getFullYear(), yB = ch.end ? new Date(ch.end - 864e5).getFullYear() : null; x.font = F(600, 32); x.fillText(yB && yB !== yA ? `${yA} – ${yB}` : yB ? `${yA}` : `từ ${yA}`, M + 50, y + 320); y += 410;
      if (ch.intro) { x.fillStyle = '#5a3a52'; x.font = `italic ${F(600, 34)}`; for (const l of wrap(x, ch.intro, CW)) { await reserve(50); x.fillText(l, M, y); y += 50; } y += 30; }
    }
    // khối sự kiện
    const ms = e.ms.filter(m => m.type !== 'video').slice(0, 4), big = ms.length <= 2;
    { x.font = F(700, 50); const tl = Math.min(2, wrap(x, e.title, CW).length); x.font = F(600, 32); const nl = e.note ? Math.min(4, wrap(x, e.note, CW).length) : 0; const hh0 = ms.length === 1 ? 540 : ms.length === 2 ? 420 : ms.length ? 620 : 0;
      await reserve(58 + tl * 62 + 48 + (hh0 ? hh0 + 30 : 0) + nl * 48); } if (cut) break; // giữ tên + ảnh + đầu lời kể trên cùng một trang
    x.fillStyle = '#b05a8a'; x.font = F(700, 28); x.fillText(`${e.days?.length > 1 ? `${dmy(e.ts0)} – ${dmy(e.ts1)}` : dmy(e.ts0)}${e.geo?.name ? ' · ' + e.geo.name.split(',')[0] : ''}`, M, y); y += 58;
    x.fillStyle = '#3d1b35'; x.font = F(700, 50); for (const l of wrap(x, e.title, CW).slice(0, 2)) { x.fillText(l, M, y); y += 62; }
    const ppl = (e.kids || []).map(id => P.get(id)).filter(p => p && p.role !== 'me').map(p => p.name); if (ppl.length) { x.fillStyle = '#7d5a75'; x.font = F(600, 30); x.fillText('Có mặt: ' + ppl.join(', '), M, y, CW); y += 48; }
    if (ms.length) {
      const imgs = []; for (const m of ms) { const b = await o.image(m, big); if (b) imgs.push(b); }
      if (imgs.length) { const hh = imgs.length === 1 ? 540 : imgs.length === 2 ? 420 : 620; await reserve(hh + 20);
        const gap = 18; if (imgs.length === 1) cover(x, imgs[0], M, y, CW, hh); else if (imgs.length === 2) imgs.forEach((im, i) => cover(x, im, M + i * (CW + gap) / 2, y, (CW - gap) / 2, hh));
        else imgs.forEach((im, i) => cover(x, im, M + (i % 2) * (CW + gap) / 2, y + Math.floor(i / 2) * (hh + gap) / 2, (CW - gap) / 2, (hh - gap) / 2));
        imgs.forEach(im => im.close?.()); y += hh + 30; }
    }
    if (e.note) { x.fillStyle = '#4a3444'; x.font = F(600, 32); for (const l of wrap(x, e.note, CW)) { await reserve(48); if (cut) break; x.fillText(l, M, y); y += 48; } }
    y += 34; x.strokeStyle = 'rgba(176,90,138,.25)'; x.lineWidth = 2; x.beginPath(); x.moveTo(W / 2 - 60, y - 10); x.lineTo(W / 2 + 60, y - 10); x.stroke(); y += 30;
  }
  if (open && !cut) { foot(); await flush(); } open = false;
  // ---- mục lục ----
  bg(); x.fillStyle = '#3d1b35'; x.font = F(700, 64); x.fillText('Mục lục', M, M + 100); let ty = M + 200; x.font = F(600, 36);
  for (const t of toc.slice(0, 26)) { x.fillStyle = '#3d1b35'; x.fillText(t.t, M, ty, CW - 120); x.textAlign = 'right'; x.fillStyle = '#9a4d7a'; x.fillText(String(t.p), W - M, ty); x.textAlign = 'left'; ty += 58; }
  if (cut) { x.fillStyle = '#9a6a8a'; x.font = F(600, 28); x.fillText(`Bản này dừng ở ${maxP} trang — xuất riêng từng chương để in đủ.`, M, H - 140, CW); }
  pageNo = 2; foot(); { const b = await new Promise(r => c.toBlob(r, 'image/jpeg', .86)); pages[1] = { jpg: new Uint8Array(await b.arrayBuffer()), w: W, h: H }; }
  c.width = c.height = 1;
  return { pdf: pdfFrom(pages), pages: pages.length, cut };
}
