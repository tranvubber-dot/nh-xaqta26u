// Hành Trình Của Bạn — ÂM THANH HIỆU ỨNG vui vẻ, tổng hợp ngay bằng Web Audio (không tải tệp, không tốn mạng).
// Tiếng ngắn 50–250 ms, nhẹ, kiểu iOS / game casual: pop, whoosh, tick, ting, boing, chuỗi nốt vui, pip, lật giấy, plop.
// Mỗi lần chênh cao độ ngẫu nhiên ±3 %, có giới hạn tần suất; iOS 17+ đặt audioSession 'ambient' để theo nút gạt im lặng
// và không cắt nhạc người dùng đang nghe. AudioContext chỉ mở ở lần chạm đầu tiên.
const S = { on: true, vol: .35, ac: null, out: null, last: {}, recent: [], noise: null, block: () => false };

function ctx() {
  if (S.ac) return S.ac;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch (e) { }
  S.ac = new AC({ latencyHint: 'interactive' });
  const comp = S.ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
  S.out = S.ac.createGain(); S.out.gain.value = S.vol; S.out.connect(comp); comp.connect(S.ac.destination);
  const b = S.ac.createBuffer(1, S.ac.sampleRate * .5, S.ac.sampleRate), d = b.getChannelData(0); let x = 1; for (let i = 0; i < d.length; i++) { x = (x * 16807) % 2147483647; d[i] = x / 1073741823.5 - 1; } S.noise = b;
  return S.ac;
}
// nốt chuông mềm: sine + bội âm nhỏ, vào nhanh, tắt dần
function tone(ac, t, f, len, vol, { type = 'sine', to = 0, harm = .18 } = {}) {
  const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .006); g.gain.exponentialRampToValueAtTime(.0005, t + len); g.connect(S.out);
  const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + len * .8); o.connect(g); o.start(t); o.stop(t + len + .02);
  if (harm) { const o2 = ac.createOscillator(), g2 = ac.createGain(); o2.frequency.setValueAtTime(f * 2.01, t); if (to) o2.frequency.exponentialRampToValueAtTime(to * 2.01, t + len * .8); g2.gain.value = harm; o2.connect(g2); g2.connect(g); o2.start(t); o2.stop(t + len * .6); }
}
function noise(ac, t, len, vol, { type = 'bandpass', f0 = 1200, f1 = 400, q = .9 } = {}) {
  const s = ac.createBufferSource(); s.buffer = S.noise; const fl = ac.createBiquadFilter(); fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + len);
  const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + len * .3); g.gain.exponentialRampToValueAtTime(.0005, t + len); s.connect(fl); fl.connect(g); g.connect(S.out); s.start(t, Math.random() * .3); s.stop(t + len + .02);
}
const SOUNDS = {
  pop: (ac, t, k) => { tone(ac, t, 520 * k, .11, .5, { to: 880 * k, harm: .1 }); },
  whoosh: (ac, t, k) => { noise(ac, t, .22, .32, { f0: 1600 * k, f1: 320 * k, q: .7 }); },
  tick: (ac, t, k) => { tone(ac, t, 1900 * k, .04, .16, { harm: 0 }); },
  ting: (ac, t, k) => { tone(ac, t, 1318 * k, .26, .28, { harm: .12 }); tone(ac, t + .07, 1976 * k, .24, .2, { harm: .08 }); },
  boing: (ac, t, k) => { const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.42, t + .01); g.gain.exponentialRampToValueAtTime(.0005, t + .32); g.connect(S.out);
    const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(180 * k, t); o.frequency.exponentialRampToValueAtTime(420 * k, t + .09); o.frequency.exponentialRampToValueAtTime(300 * k, t + .3);
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 18; lg.gain.value = 26 * k; lfo.connect(lg); lg.connect(o.frequency); o.connect(g); o.start(t); lfo.start(t); o.stop(t + .34); lfo.stop(t + .34); },
  melody: (ac, t, k) => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(ac, t + i * .09, f * k, .22, .24, { harm: .15 })); },
  pip: (ac, t, k) => { tone(ac, t, 880 * k, .06, .2, { harm: .05 }); },
  page: (ac, t, k) => { noise(ac, t, .09, .22, { type: 'highpass', f0: 2500 * k, f1: 5000 * k, q: .5 }); noise(ac, t + .07, .12, .16, { type: 'bandpass', f0: 3000 * k, f1: 1500 * k, q: .8 }); },
  plop: (ac, t, k) => { tone(ac, t, 420 * k, .15, .45, { to: 110 * k, harm: .05 }); }
};
const GAP = { tick: 40, pop: 60, pip: 60 };
export function play(name, delayMs = 0) {
  if (!S.on || !SOUNDS[name] || document.hidden || S.block()) return;
  const now = performance.now(); if (now - (S.last[name] || 0) < (GAP[name] || 90)) return; S.last[name] = now;
  S.recent = S.recent.filter(x => now - x < 300); if (S.recent.length >= 6) return; S.recent.push(now); // không dồn tiếng
  const ac = ctx(); if (!ac || ac.state !== 'running') return;
  const k = 1 + (Math.random() * 2 - 1) * .03; // chênh cao độ ±3 %
  try { SOUNDS[name](ac, ac.currentTime + .005 + delayMs / 1000, k); } catch (e) { }
}
export function setOn(v) { S.on = !!v; }
export function setVol(v) { S.vol = Math.max(0, Math.min(1, +v)); if (S.out) S.out.gain.value = S.vol; }
export const state = () => ({ on: S.on, vol: S.vol });
export function initSfx({ block } = {}) {
  if (block) S.block = block;
  // mở AudioContext ở lần chạm đầu tiên (trình duyệt chặn tự phát tiếng trước khi người dùng chạm)
  const unlock = () => { const ac = ctx(); if (ac && ac.state !== 'running') ac.resume().catch(() => { }); };
  addEventListener('pointerdown', unlock, { capture: true, passive: true }); addEventListener('touchend', unlock, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.ac?.state === 'suspended') S.ac.resume().catch(() => { }); });
  return { play, setOn, setVol, state };
}
