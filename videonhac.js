// Hành Trình Của Bạn — nhạc cho VIDEO KỶ NIỆM, dựng bằng OfflineAudioContext (tất định: random có seed → mỗi lần xuất giống hệt).
// 3 giai điệu tự sáng tác (không lo bản quyền): hộp nhạc 70 BPM, vui nhộn 124 BPM, điện ảnh 84 BPM; hoặc bài của bạn (dò BPM đơn giản).
export const mulberry32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const N = n => { const m = /^([A-G])(b|#)?(\d)$/.exec(n); const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0); return 440 * Math.pow(2, (base + (+m[3] + 1) * 12 - 69) / 12); };
const MEL = ['C5 1,A4 .5,C5 .5,F5 1.5,E5 .5', 'E5 1,D5 .5,C5 .5,G4 2', 'A4 1,D5 .5,F5 .5,E5 1,D5 1', 'D5 1.5,C5 .5,Bb4 1,C5 1', 'C5 1,A4 .5,C5 .5,F5 1,A5 1', 'G5 1.5,F5 .5,E5 1,C5 1', 'D5 1,F5 .5,E5 .5,D5 1,A4 1', 'Bb4 1,D5 1,C5 2',
  'F5 .5,G5 .5,A5 1,C6 1,A5 1', 'G5 .5,A5 .5,G5 1,E5 2', 'F5 .5,E5 .5,D5 1,A5 1,F5 1', 'D5 1,F5 1,E5 1,C5 1', 'A5 1,G5 .5,F5 .5,C5 1,F5 1', 'E5 1,G5 1,C6 2', 'D6 1,C6 .5,A5 .5,F5 1,D5 1', 'F5 1,D5 1,F5 2']
  .map(b => b.split(',').map(x => { const [n, d] = x.split(' '); return [N(n), +d]; }));
const CH = [['F3', 'C4', 'F4', 'A4'], ['C3', 'G3', 'C4', 'E4'], ['D3', 'A3', 'D4', 'F4'], ['Bb2', 'F3', 'Bb3', 'D4']].map(c => c.map(N));
export const STYLES = { hopnhac: { bpm: 70, t: 'Hộp nhạc' }, vui: { bpm: 124, t: 'Vui nhộn' }, dienanh: { bpm: 84, t: 'Điện ảnh' } };
export const LEAD = .2; // 0,2 s im lặng đầu (tránh trình phát Apple cắt mất đầu nhạc AAC)

function impulse(ac, R, sec = 3) { const len = Math.floor(ac.sampleRate * sec), b = ac.createBuffer(2, len, ac.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (R() * 2 - 1) * Math.pow(1 - i / len, 3.2); } return b; }
function noiseBuf(ac, R, sec = 1) { const b = ac.createBuffer(1, Math.floor(ac.sampleRate * sec), ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = R() * 2 - 1; return b; }

// dựng nhạc dài dur giây (đã tính phần im lặng đầu); trả { buffer, bpm, offset }
export async function renderMusic(style, dur, { seed = 7, sr = 48000, nostalgia = false } = {}) {
  const S = STYLES[style] || STYLES.hopnhac, BEAT = 60 / S.bpm, total = dur + LEAD + .3, R = mulberry32(seed);
  const ac = new OfflineAudioContext(2, Math.ceil(total * sr), sr);
  const master = ac.createGain(), comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
  const verb = ac.createConvolver(); verb.buffer = impulse(ac, R); const wet = ac.createGain(), dry = ac.createGain();
  dry.connect(master); dry.connect(verb); verb.connect(wet); wet.connect(master); master.connect(comp);
  let out = comp; if (nostalgia) { const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200; comp.connect(lp); out = lp; }
  out.connect(ac.destination);
  master.gain.setValueAtTime(0, 0); master.gain.linearRampToValueAtTime(style === 'vui' ? .62 : .78, LEAD + .6); master.gain.setValueAtTime(style === 'vui' ? .62 : .78, Math.max(LEAD + .7, total - 2.2)); master.gain.linearRampToValueAtTime(0, total - .15);
  wet.gain.value = style === 'vui' ? .25 : .55; dry.gain.value = .8;
  const bell = (f, t, vel, len = 2.4) => { const o0 = ac.createGain(); o0.gain.setValueAtTime(0, t); o0.gain.linearRampToValueAtTime(vel, t + .006); o0.gain.exponentialRampToValueAtTime(.0008, t + len); const pan = ac.createStereoPanner(); pan.pan.value = Math.max(-.6, Math.min(.6, Math.log2(f / 440) * .35)); o0.connect(pan); pan.connect(dry);
    [[1, 1], [2, .28], [3.01, .08], [5.4, .05]].forEach(([k, a], i) => { const o = ac.createOscillator(); o.frequency.value = f * k; const g = ac.createGain(); g.gain.value = a; if (i) { g.gain.setValueAtTime(a, t); g.gain.exponentialRampToValueAtTime(.0005, t + len * (i === 1 ? .5 : .18)); } o.connect(g); g.connect(o0); o.start(t); o.stop(t + len + .05); }); };
  const nb = noiseBuf(ac, R, 1);
  const kick = t => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + .14); g.gain.setValueAtTime(.95, t); g.gain.exponentialRampToValueAtTime(.001, t + .32); o.connect(g); g.connect(master); o.start(t); o.stop(t + .34); };
  const hit = (t, f, q, len, vel) => { const s = ac.createBufferSource(); s.buffer = nb; const bp = ac.createBiquadFilter(); bp.type = f > 5000 ? 'highpass' : 'bandpass'; bp.frequency.value = f; bp.Q.value = q; const g = ac.createGain(); g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(.001, t + len); s.connect(bp); bp.connect(g); g.connect(master); s.start(t, R() * .5); s.stop(t + len + .02); };
  const bass = (f, t, len) => { const o = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain(); o.type = 'sawtooth'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 600; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.32, t + .01); g.gain.exponentialRampToValueAtTime(.01, t + len); o.connect(lp); lp.connect(g); g.connect(master); o.start(t); o.stop(t + len + .02); };
  const pad = (fs, t, len, vel) => { for (const f of fs) for (const det of [-6, 6]) { const o = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; lp.type = 'lowpass'; lp.frequency.value = 1400; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + len * .35); g.gain.linearRampToValueAtTime(0, t + len + .4); o.connect(lp); lp.connect(g); g.connect(dry); o.start(t); o.stop(t + len + .5); } };
  const bars = Math.ceil((dur + 1) / (4 * BEAT)) + 1;
  for (let b = 0; b < bars; b++) {
    const t0 = LEAD + b * 4 * BEAT, mel = MEL[b % 16], ch = CH[b % 4]; if (t0 > total) break;
    if (style === 'hopnhac') {
      let t = t0; for (const [f, d] of mel) { bell(f, t, .2, 2.6); t += d * BEAT; }
      [0, 1, 2, 3, 2, 1, 2, 1].forEach((j, i) => bell(ch[j], t0 + i * BEAT / 2, i === 0 ? .1 : .055, 2));
      if (R() < .55) bell(mel[0][0] * 2, t0 + (2 + Math.floor(R() * 4) * .5) * BEAT, .035, 3);
    } else if (style === 'vui') {
      for (let k = 0; k < 4; k++) { const tb = t0 + k * BEAT; kick(tb); if (k % 2) hit(tb, 1800, .8, .18, .55); for (const h of [0, .5]) hit(tb + h * BEAT, 9000, .5, .05, h ? .18 : .12); bass(ch[0] / 2 * (k === 3 ? 1.5 : 1), tb, BEAT * .9); }
      [0, 2, 1, 3, 2, 1, 3, 2].forEach((j, i) => bell(ch[j] * 2, t0 + i * BEAT / 2, i % 2 ? .05 : .08, .7));
      if (b >= 2) { let t = t0; for (const [f, d] of mel) { bell(f, t, .13, 1.2); t += d * BEAT; } }
    } else { // điện ảnh: pad dây + chuông giai điệu + trống trầm đầu ô nhịp
      pad(ch.slice(0, 3), t0, 4 * BEAT, .035); kick(t0); if (b % 2) hit(t0 + 2 * BEAT, 300, 1, .5, .3);
      if (b >= 1) { let t = t0; for (const [f, d] of mel) { bell(f / 2, t, .17, 3.2); t += d * BEAT; } }
    }
  }
  if (nostalgia) for (let t = LEAD; t < total; t += .03 + R() * .25) hit(t, 3000 + R() * 4000, 2, .01, .02 + R() * .04); // tiếng rè đĩa than
  return { buffer: normalize(await ac.startRendering()), bpm: S.bpm, offset: LEAD };
}
// chuẩn hoá đỉnh về -1 dBFS (nhạc hộp nhạc vốn nhỏ)
export function normalize(b, peak = .89) { let m = 0; for (let c = 0; c < b.numberOfChannels; c++) { const d = b.getChannelData(c); for (let i = 0; i < d.length; i++) { const v = d[i] < 0 ? -d[i] : d[i]; if (v > m) m = v; } } if (m > 1e-4) { const k = peak / m; for (let c = 0; c < b.numberOfChannels; c++) { const d = b.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= k; } } return b; }

// bài của bạn: giải mã, dò BPM bằng onset flux + tự tương quan (60–180), cắt đúng độ dài, mờ dần cuối
export async function userMusic(blob, dur, { sr = 48000 } = {}) {
  const raw = await blob.arrayBuffer(), dc = new OfflineAudioContext(2, sr, sr), src = await dc.decodeAudioData(raw.slice(0));
  // dò nhịp trên 60 s đầu, đơn kênh 11 kHz
  const k = Math.max(1, Math.round(src.sampleRate / 11025)), d0 = src.getChannelData(0), n = Math.min(d0.length, src.sampleRate * 60), hop = 512, win = 1024, frames = Math.floor(n / k / hop) - 2, flux = new Float32Array(frames);
  let prev = 0; for (let f = 0; f < frames; f++) { let e = 0; for (let i = 0; i < win; i += 2) { const v = d0[(f * hop + i) * k] || 0; e += v * v; } e = Math.sqrt(e); flux[f] = Math.max(0, e - prev); prev = e; }
  const fps = src.sampleRate / k / hop; let best = 0, bpm = 0;
  const at = x => { const i = Math.floor(x), f = x - i; return (flux[i] || 0) * (1 - f) + (flux[i + 1] || 0) * f; };
  for (let b = 60; b <= 180; b += .25) { const lag = fps * 60 / b; let s = 0; for (let f = 0; f + lag * 4 < frames; f++) s += flux[f] * (at(f + lag) + .5 * at(f + 2 * lag) + .25 * at(f + 4 * lag)); s /= Math.max(1, frames - lag * 4); if (s > best) { best = s; bpm = b; } }
  bpm = Math.round(bpm);
  while (bpm > 0 && bpm < 80) bpm *= 2; while (bpm > 160) bpm /= 2;
  const lag = fps * 60 / bpm; let ph = 0, pb = -1; for (let p = 0; p < lag; p++) { let s = 0; for (let f = p; f < frames; f += lag) s += flux[Math.round(f)]; if (s > pb) { pb = s; ph = p; } }
  const offset = ph / fps;
  // ghép ra bộ đệm đúng độ dài (lặp nếu bài ngắn), mờ dần 2 s cuối
  const total = dur + LEAD + .3, ac = new OfflineAudioContext(2, Math.ceil(total * sr), sr), s = ac.createBufferSource(), g = ac.createGain(); s.buffer = src; s.loop = src.duration < total; s.connect(g); g.connect(ac.destination);
  g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(.9, LEAD + .4); g.gain.setValueAtTime(.9, total - 2.2); g.gain.linearRampToValueAtTime(0, total - .15); s.start(LEAD);
  return { buffer: normalize(await ac.startRendering()), bpm: bpm || 100, offset: LEAD + offset, clear: best > 1e-4 };
}
