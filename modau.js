// Hành Trình Của Bạn — ĐOẠN MỞ ĐẦU NGÀY SINH của trình chiếu (12–18 giây, chạm để bỏ qua).
// 1) màn tối + tiếng tim thai (Web Audio), ảnh mang bầu lướt mờ  2) sao hội tụ thành NGÔI SAO CHÀO ĐỜI, bùng sáng + vòng sóng + chuông
// 3) ngày / giờ / nơi sinh hiện từng dòng  4) tên thật từng chữ ánh vàng → tên ở nhà to, avatar phát sáng, thông số chào đời
// 5) ảnh ngày chào đời bay ra thành thác polaroid → trao lại cho trình chiếu ngân hà.
// Sao / ngôi sao vẽ bằng Three.js (dùng chung renderer của app), chữ bằng DOM kính có nảy. Thiếu dữ liệu nào thì bỏ dòng đó.

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const MONTHS = m => `tháng ${m + 1}`;

function glowTex(THREE, size = 128, stops = [[0, 'rgba(255,255,255,1)'], [.18, 'rgba(255,240,210,.85)'], [.45, 'rgba(255,190,140,.25)'], [1, 'rgba(255,160,120,0)']]) {
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); stops.forEach(([o, col]) => g.addColorStop(o, col));
  x.fillStyle = g; x.fillRect(0, 0, size, size); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function starTex(THREE, size = 256) { // tia sáng chữ thập + 4 tia chéo mảnh
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'), h = size / 2;
  x.globalCompositeOperation = 'lighter';
  const ray = (ang, len, w, a) => { x.save(); x.translate(h, h); x.rotate(ang); const g = x.createLinearGradient(-len, 0, len, 0); g.addColorStop(0, 'rgba(255,230,190,0)'); g.addColorStop(.5, `rgba(255,250,235,${a})`); g.addColorStop(1, 'rgba(255,230,190,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(0, 0, len, w, 0, 0, Math.PI * 2); x.fill(); x.restore(); };
  ray(0, h, 5, 1); ray(Math.PI / 2, h, 5, 1); ray(Math.PI / 4, h * .6, 2.5, .7); ray(-Math.PI / 4, h * .6, 2.5, .7);
  const g = x.createRadialGradient(h, h, 0, h, h, h * .3); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.4, 'rgba(255,236,200,.7)'); g.addColorStop(1, 'rgba(255,200,150,0)'); x.fillStyle = g; x.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- âm thanh: tim thai "thình thịch" + chuông chào đời ----------
function makeAudio(ac) {
  if (!ac) return { beat() { }, bell() { }, stop() { } };
  const out = ac.createGain(); out.gain.value = .9; const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; out.connect(comp); comp.connect(ac.destination);
  let noiseBuf = null; const noise = () => { if (noiseBuf) return noiseBuf; const n = ac.sampleRate * .25, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2); return noiseBuf = b; };
  function thump(t, v) {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(64, t); o.frequency.exponentialRampToValueAtTime(36, t + .14);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .008); g.gain.exponentialRampToValueAtTime(.0008, t + .3); o.connect(g); g.connect(out); o.start(t); o.stop(t + .32);
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), gn = ac.createGain(); s.buffer = noise(); f.type = 'lowpass'; f.frequency.value = 180; gn.gain.setValueAtTime(v * .55, t); gn.gain.exponentialRampToValueAtTime(.0008, t + .18); s.connect(f); f.connect(gn); gn.connect(out); s.start(t); s.stop(t + .2);
  }
  const timers = [];
  return {
    beat(t0, dur, bpm0, bpm1, v0, v1) { // nhỏ dần + nhanh dần
      let t = 0; while (t < dur) { const p = t / dur, bpm = bpm0 + (bpm1 - bpm0) * p, v = v0 + (v1 - v0) * p, T = ac.currentTime + t0 + t; thump(T, v); thump(T + 60 / bpm * .32, v * .62); t += 60 / bpm; }
    },
    bell(delay = 0) {
      const t = ac.currentTime + delay;
      [[523.25, .22, 3.6], [783.99, .16, 3.2], [1046.5, .2, 3.4], [1318.5, .12, 2.8], [1567.98, .1, 2.6], [2093, .06, 2.2]].forEach(([f, v, len], i) => {
        [[1, 1], [2.01, .25], [3.02, .08]].forEach(([k, a]) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f * k; const st = t + i * .045; g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(v * a, st + .01); g.gain.exponentialRampToValueAtTime(.0005, st + len * (k > 1 ? .4 : 1)); o.connect(g); g.connect(out); o.start(st); o.stop(st + len + .05); });
      });
      // lấp lánh
      [2637, 3136, 3520, 4186, 3520, 4699].forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(), st = t + .35 + i * .09; o.frequency.value = f; g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(.035, st + .005); g.gain.exponentialRampToValueAtTime(.0004, st + .9); o.connect(g); g.connect(out); o.start(st); o.stop(st + 1); });
    },
    stop() { const t = ac.currentTime; out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(0, t + .4); timers.forEach(clearTimeout); setTimeout(() => { try { out.disconnect(); } catch (e) { } }, 600); }
  };
}

export function birthIntro(o) {
  const { THREE, renderer, kid, reduced } = o;
  const col = new THREE.Color(kid.color || '#ff8fbf'), gold = new THREE.Color('#ffd27f');
  const W = () => innerWidth, H = () => innerHeight, portrait = () => H() > W();
  // ---------- cảnh 3D riêng ----------
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#05040b');
  const cam = new THREE.PerspectiveCamera(60, W() / H(), .1, 300); cam.position.set(0, 0, 30);
  const starY = () => (portrait() ? .44 : .5) * Math.tan(30 * Math.PI / 180) * 30; // ngôi sao ở ~28% từ trên xuống
  const N = o.mobile ? 1100 : 1800;
  const pos = new Float32Array(N * 3), start = new Float32Array(N * 3), seed = new Float32Array(N), cmix = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r = 14 + Math.pow(Math.random(), .6) * 46, a = Math.random() * Math.PI * 2, b = Math.acos(Math.random() * 2 - 1);
    start[i * 3] = Math.cos(a) * Math.sin(b) * r * 1.2; start[i * 3 + 1] = Math.sin(a) * Math.sin(b) * r; start[i * 3 + 2] = clamp(Math.cos(b) * r * .8, -60, 12);
    seed[i] = Math.random(); cmix[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aStart', new THREE.BufferAttribute(start, 3)); geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1)); geo.setAttribute('aMix', new THREE.BufferAttribute(cmix, 1));
  const U = { uT: { value: 0 }, uB: { value: 0 }, uTime: { value: 0 }, uPx: { value: renderer.getPixelRatio() }, uC: { value: new THREE.Vector3(0, starY(), 0) }, uCol: { value: col }, uGold: { value: gold }, uFade: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 aStart; attribute float aSeed; attribute float aMix; uniform float uT, uB, uTime, uPx, uFade; uniform vec3 uC; varying float vA; varying float vM;
      void main(){
        float t = clamp((uT - aSeed * .3) / .7, 0., 1.); t = t * t * (3. - 2. * t);
        vec3 d = aStart; float ang = (1. - t) * (3.2 + aSeed * 4.) + uTime * .03 * (1. - t);
        float c = cos(ang), s = sin(ang); d.xy = mat2(c, -s, s, c) * d.xy;
        vec3 p = uC + d * (1. - t) * (1. - t);
        vec3 dir = normalize(aStart + vec3(.001)); p += dir * uB * (6. + aSeed * 26.) * (1. + uB);
        p.y -= uB * uB * 3.;
        vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
        float tw = .6 + .4 * sin(uTime * (2. + aSeed * 4.) + aSeed * 40.);
        gl_PointSize = (2.2 + aSeed * 3.6) * (1. + t * .7) * uPx * (40. / -mv.z);
        vA = uFade * (.45 + .55 * t) * tw * (1. - smoothstep(.0, 1., uB) * .55) * (t > .985 && uB < .001 ? .3 : 1.); vM = aMix;
      }`,
    fragmentShader: `uniform vec3 uCol, uGold; varying float vA; varying float vM; void main(){ vec2 q = gl_PointCoord - .5; float d = length(q); float a = smoothstep(.5, .0, d); a *= a; vec3 c = mix(mix(vec3(1.), uCol, .55), uGold, step(.55, vM)); gl_FragColor = vec4(c * a * vA * 1.6, a * vA); }`
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; scene.add(pts);
  // ngôi sao chào đời
  const gT = glowTex(THREE), sT = starTex(THREE);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: gT, color: col.clone().lerp(new THREE.Color('#fff'), .45), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: sT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: gT, color: gold, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  [halo, glow, core].forEach(s => { s.position.set(0, starY(), 0); scene.add(s); });
  // vòng sóng ánh sáng
  const rT = glowTex(THREE, 256, [[0, 'rgba(255,255,255,0)'], [.78, 'rgba(255,220,170,0)'], [.9, 'rgba(255,236,200,.9)'], [.94, 'rgba(255,255,255,1)'], [1, 'rgba(255,220,170,0)']]);
  const rings = [0, .18, .4].map((_, i) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: rT, color: i === 1 ? col.clone().lerp(new THREE.Color('#fff'), .3) : gold, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); m.position.set(0, starY(), 0); scene.add(m); return m; });
  // ---------- lớp chữ DOM ----------
  const ov = document.createElement('div'); ov.className = 'bi' + (reduced ? ' rm' : ''); ov.setAttribute('role', 'presentation');
  const d = new Date(kid.birth + 'T12:00:00'), timeTxt = o.birthTime || '', place = kid.place || '';
  const lines = [`Ngày ${d.getDate()} ${MONTHS(d.getMonth())} năm ${d.getFullYear()}`, timeTxt && `lúc ${timeTxt}`, place && `tại ${place}`].filter(Boolean);
  const full = (kid.fullName || '').trim(), home = kid.name, stats = o.stats || [];
  ov.innerHTML = `<div class="bi-preg"></div><div class="bi-pc">Hành trình 9 tháng</div>
    <div class="bi-mid"><div class="bi-lines">${lines.map((l, i) => `<div class="bi-l" style="--i:${i}">${esc(l)}</div>`).join('')}</div>
      ${full ? `<div class="bi-full">${[...full].map((ch, i) => ch === ' ' ? '<i> </i>' : `<span style="--i:${i}">${esc(ch)}</span>`).join('')}</div>` : ''}
      <div class="bi-home"><img src="${o.avatar}" alt=""><b>${esc(home)}</b></div>
      ${stats.length ? `<div class="bi-st">${stats.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}</div>
    <div class="bi-pol"></div><div class="bi-flash"></div><div class="bi-skip">Chạm để bỏ qua</div>`;
  document.body.appendChild(ov); document.body.classList.add('bintro'); requestAnimationFrame(() => ov.classList.add('on'));
  const AU = makeAudio(o.ac);
  // ---------- kịch bản thời gian ----------
  const hasPreg = (o.pregUrls || []).length > 0;
  const TT = reduced ? { conv0: 0, conv1: .01, burst: .6, lines: 1.0, full: 1.6, home: 2.2, pol: 99, end: 5.2 } : (() => {
    const conv0 = hasPreg ? 2.6 : 1.4, burst = conv0 + 4.2, ln = burst + .8, fl = ln + lines.length * .7 + .2, hm = fl + (full ? Math.min(2.2, .5 + full.length * .05) + .3 : 0), pol = hm + 2.4 + (stats.length ? .4 : 0), end = pol + ((o.birthUrls || []).length ? 3.5 : .8);
    return { conv0, conv1: burst - .25, burst, lines: ln, full: fl, home: hm, pol, end };
  })();
  let t = 0, fired = {}, done = false, active = true;
  const once = (k, at, f) => { if (!fired[k] && t >= at) { fired[k] = 1; f(); } };
  if (!reduced && o.ac) AU.beat(.25, TT.burst - .5, 76, 142, .95, .32);
  // ảnh mang bầu lướt mờ ảo
  if (hasPreg && !reduced) {
    const box = ov.querySelector('.bi-preg'), urls = o.pregUrls.slice(0, 5);
    urls.forEach((u, i) => { const im = new Image(); im.src = u; im.style.setProperty('--r', ((i % 2 ? 1 : -1) * (3 + i * 2)) + 'deg'); im.style.animationDelay = (.5 + i * (2.0 / urls.length)) + 's'; im.style.animationDuration = (2.0 / urls.length + 1.2) + 's'; box.appendChild(im); });
    ov.querySelector('.bi-pc').classList.add('on');
  }
  function polaroids() {
    const box = ov.querySelector('.bi-pol'), urls = (o.birthUrls || []).slice(0, 7); if (!urls.length) return;
    urls.forEach((u, i) => {
      const p = document.createElement('div'); p.className = 'bi-p'; p.innerHTML = `<img src="${u}" alt="">`; box.appendChild(p);
      const ang = (i / urls.length) * Math.PI * 2 + .4, rx = Math.cos(ang) * W() * .34, ry = Math.sin(ang) * H() * .22 - H() * .05, rot = (Math.random() - .5) * 30;
      p.animate([{ transform: 'translate(-50%,-50%) translate(0px,-80px) scale(.15) rotate(0deg)', opacity: 0 }, { transform: `translate(-50%,-50%) translate(${rx}px,${ry}px) scale(1.04) rotate(${rot}deg)`, opacity: 1, offset: .26, easing: 'cubic-bezier(.2,1.4,.4,1)' },
        { transform: `translate(-50%,-50%) translate(${rx * 1.06}px,${ry + 14}px) scale(1) rotate(${rot * 1.15}deg)`, opacity: 1, offset: .66, easing: 'cubic-bezier(.5,0,.8,.6)' },
        { transform: `translate(-50%,-50%) translate(${rx * 1.2}px,${ry + H() * 1.05}px) scale(.92) rotate(${rot * 2.4}deg)`, opacity: .9 }], { duration: 3300, delay: i * 110, fill: 'forwards' });
    });
  }
  function finish(fast) {
    if (done) return; done = true; AU.stop(); document.body.classList.remove('bintro'); ov.classList.add('out'); if (fast) ov.classList.add('fast');
    setTimeout(() => { active = false; ov.remove(); geo.dispose(); mat.dispose(); [gT, sT].forEach(x => x.dispose()); rings.forEach(r => r.material.dispose()); rT.dispose(); [glow, core, halo].forEach(s => s.material.dispose()); }, fast ? 380 : 900);
    o.onDone?.(fast);
  }
  ov.addEventListener('click', () => { if (!o.music && !fired.music) { fired.music = 1; o.onMusic?.(); } finish(true); });
  function render(dt) {
    if (!active) return false;
    t += dt; U.uTime.value += dt; U.uPx.value = renderer.getPixelRatio();
    cam.aspect = W() / H(); cam.updateProjectionMatrix(); const sy = starY(); U.uC.value.set(0, sy, 0); [halo, glow, core, ...rings].forEach(s => s.position.y = sy);
    U.uFade.value = clamp(t / 1.2, 0, 1);
    U.uT.value = reduced ? 1 : ease(clamp((t - TT.conv0) / (TT.conv1 - TT.conv0), 0, 1));
    // ngôi sao lớn dần khi sao hội tụ, nhịp đập theo tim thai
    const form = clamp((t - (TT.conv1 - 1.4)) / 1.4, 0, 1), pulse = 1 + Math.sin(t * 9) * .04 * (1 - clamp(t - TT.burst, 0, 1));
    const after = clamp((t - TT.burst) / .5, 0, 1), boom = t >= TT.burst ? Math.exp(-(t - TT.burst) * 2.2) : 0;
    glow.material.opacity = form * .8 + boom * .2; glow.scale.setScalar((3 + form * 5 + boom * 16) * pulse);
    core.material.opacity = Math.min(1, form * 1.2); core.scale.setScalar((2 + form * 4.5 + boom * 9) * pulse); core.material.rotation = t * .25;
    halo.material.opacity = after * .35 + boom * .5; halo.scale.setScalar(14 + boom * 30 + Math.sin(t * 1.3) * .6);
    U.uB.value = t >= TT.burst ? clamp((t - TT.burst) / 2.2, 0, 1) : 0;
    rings.forEach((r, i) => { const k = clamp((t - TT.burst - i * .18) / 1.6, 0, 1); r.scale.setScalar(1 + ease(k) * (48 + i * 16)); r.material.opacity = k > 0 && k < 1 ? Math.pow(1 - k, 1.4) : 0; });
    once('music', TT.burst - 1.4, () => o.onMusic?.());
    once('burst', TT.burst, () => { if (!reduced) { ov.querySelector('.bi-flash').classList.add('on'); o.haptic?.(30); } AU.bell(0); ov.querySelector('.bi-pc').classList.remove('on'); ov.classList.add('born'); });
    once('lines', TT.lines, () => ov.querySelector('.bi-lines').classList.add('on'));
    once('full', TT.full, () => ov.querySelector('.bi-full')?.classList.add('on'));
    once('home', TT.home, () => { ov.querySelector('.bi-home').classList.add('on'); setTimeout(() => ov.querySelector('.bi-st')?.classList.add('on'), reduced ? 0 : 450); o.haptic?.(12); });
    once('pol', TT.pol, () => { ov.classList.add('bipol'); polaroids(); });
    if (t >= TT.end) finish(false);
    renderer.render(scene, cam);
    return true;
  }
  return { render, skip: () => finish(true), get active() { return active; }, get t() { return t; }, TT };
}

// cảnh kết trình chiếu: "Hành trình còn tiếp…" + tuổi hiện tại
export function showOutro({ name, age, avatar, ms = 4600 }) {
  const ov = document.createElement('div'); ov.className = 'bo';
  ov.innerHTML = `<div class="bo-in"><img src="${avatar}" alt=""><b>Hành trình còn tiếp…</b><span>${esc(name)} hôm nay ${esc(age)}</span><small>Khoảnh khắc tiếp theo đang chờ bạn ✨</small></div>`;
  document.body.appendChild(ov); requestAnimationFrame(() => ov.classList.add('on'));
  const close = () => { ov.classList.remove('on'); setTimeout(() => ov.remove(), 700); };
  const tm = setTimeout(close, ms); ov.addEventListener('click', () => { clearTimeout(tm); close(); });
  return { close };
}
