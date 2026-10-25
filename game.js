'use strict';
// 오락실 튜토리얼이 '진짜로 일어난 일'을 알아채는 신호 (arcade/public/tutorial.js 가 듣는다. 튜토리얼이 아니면 아무도 안 듣는다)
const tutorialSignal = (type) => window.dispatchEvent(new CustomEvent('arcade:tutorial', { detail: { type } }));

// 하노이 탑: 화면·입력·소리. 규칙과 풀이는 logic.js (LOGIC_HANOI)
(() => {
const L = LOGIC_HANOI;
const $ = (id) => document.getElementById(id);
const SIZES = [3, 4, 5, 6, 7, 8];                         // 단계 = 원반 수
const DONE_KEY = 'hanoiDone', LAST_KEY = 'hanoiLast';
const COLORS = ['#ff5a4f', '#ff9f43', '#ffd23f', '#4cd964', '#3dc6e0', '#3d8bff', '#8a7cff', '#ff5fa2'];

// ---------- 저장소 ----------
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} },
};
const loadDone = () => { try { return JSON.parse(store.get(DONE_KEY)) || {}; } catch (_) { return {}; } };
let done = loadDone();                                    // { 원반 수: { moves, stars } }
const clearedCount = () => Object.keys(done).length;
let last = SIZES.includes(Number(store.get(LAST_KEY))) ? Number(store.get(LAST_KEY)) : 3;

// ---------- 소리 ----------
let audio = null;
let muted = store.get('hanoiMuted') === '1';
function tone(freq, dur, type = 'sine', vol = 0.09, slide = 0) {
  if (muted) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const t = audio.currentTime;
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(audio.destination);
    o.start(t);
    o.stop(t + dur);
  } catch (_) {}
}
const seq = (notes, step, type = 'triangle', vol = 0.09) => notes.forEach((f, i) => setTimeout(() => tone(f, step * 0.0009, type, vol), i * step));
const sfx = {
  pick: () => tone(620, 0.05, 'triangle', 0.06),
  drop: (d) => tone(200 + 40 * (9 - d), 0.08, 'triangle', 0.08),
  bad: () => tone(140, 0.1, 'square', 0.05),
  undo: () => tone(500, 0.08, 'triangle', 0.07, -150),
  hint: () => tone(880, 0.12, 'sine', 0.07, 260),
  win: () => seq([523, 659, 784, 1047], 100, 'triangle', 0.1),
};
function toggleMute() { muted = !muted; store.set('hanoiMuted', muted ? '1' : '0'); $('muteBtn').textContent = muted ? '🔇' : '🔊'; }
$('muteBtn').onclick = (e) => { e.currentTarget.blur(); toggleMute(); };
$('muteBtn').textContent = muted ? '🔇' : '🔊';

// ---------- 상태 ----------
let n = last, st = L.newGame(n);
let from = -1, hintMove = null, hints = 0;
let playing = false, solvedShown = false;
const pegEls = [];

// ---------- 그리기 ----------
function buildPegs() {
  const box = $('pegs');
  box.innerHTML = '';
  pegEls.length = 0;
  for (let p = 0; p < L.PEGS; p++) {
    const el = document.createElement('div');
    el.className = 'peg' + (p === L.GOAL ? ' goal' : '');
    el.setAttribute('role', 'button'); el.setAttribute('aria-label', `${p + 1}번 기둥`);
    el.onclick = () => onPeg(p);
    box.appendChild(el); pegEls.push(el);
  }
}
function render() {
  for (let p = 0; p < L.PEGS; p++) {
    const el = pegEls[p];
    el.innerHTML = `<span class="num">${p + 1}</span>`;
    const peg = st.pegs[p];
    peg.forEach((d, i) => {
      const disc = document.createElement('div');
      const w = 34 + (d / st.n) * 62;                       // 가장 큰 원반은 기둥 칸의 96%, 가장 작은 건 34%쯤
      disc.className = 'disc' + (p === from && i === peg.length - 1 ? ' lift' : '');
      disc.style.width = `${w}%`;
      disc.style.background = COLORS[(d - 1) % COLORS.length];
      disc.textContent = String(d);
      el.appendChild(disc);
    });
    el.classList.toggle('sel', p === from);
    el.classList.toggle('hintFrom', !!hintMove && hintMove.from === p);
    el.classList.toggle('hintTo', !!hintMove && hintMove.to === p);
  }
  $('lvl').textContent = `${st.n}개`;
  $('movesN').textContent = String(st.moves);
  const msg = $('msg');
  if (hintMove) msg.textContent = `💡 ${hintMove.from + 1}번 기둥 → ${hintMove.to + 1}번 기둥`;
  else if (from >= 0) msg.textContent = `${from + 1}번 기둥의 원반을 어디로 옮길까요?`;
  else msg.textContent = `이동 ${st.moves}번 · 최소 ${L.minMoves(st.n)}번 · 3번 기둥으로 옮겨요`;
  $('undoBtn').disabled = !st.history.length;
}

// ---------- 창 ----------
const overlayOpen = () => !$('overlay').classList.contains('hidden');
function showOverlay(html) { $('overlay').innerHTML = html; $('overlay').classList.remove('hidden'); }
function hideOverlay() { $('overlay').classList.add('hidden'); }

// ---------- 행동 ----------
function loadLevel(size) {
  n = SIZES.includes(size) ? size : 3;
  last = n; store.set(LAST_KEY, String(n));
  st = L.newGame(n);
  from = -1; hintMove = null; hints = 0; playing = true; solvedShown = false;
  hideOverlay(); buildPegs(); render();
}
function onPeg(p) {
  if (!playing || solvedShown) return;
  if (from < 0) {                                          // 옮길 원반이 있는 기둥을 고른다
    if (!st.pegs[p].length) { sfx.bad(); shake(p); return; }
    from = p; hintMove = null; sfx.pick(); tutorialSignal('select'); render();
    return;
  }
  if (p === from) { from = -1; render(); return; }          // 같은 기둥을 다시 누르면 취소
  const d = L.move(st, from, p);
  if (d === null) { sfx.bad(); shake(p); $('msg').textContent = '작은 원반 위에만 올릴 수 있어요! (큰 원반은 작은 원반 위에 못 올려요)'; return; }
  from = -1; hintMove = null;
  sfx.drop(d); tutorialSignal('move');
  render();
  if (L.isWon(st)) { solvedShown = true; setTimeout(onClear, 350); }      // 다 옮겼으면 바로 잠가서, 클리어 창이 뜨기 전에 더 옮기지 않게
}
function shake(p) { const el = pegEls[p]; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
function undo() {
  if (!playing || solvedShown || !L.undo(st)) return;
  from = -1; hintMove = null; sfx.undo(); tutorialSignal('undo'); render();
}
function restart() {
  if (!playing || solvedShown) return;
  loadLevel(n); tutorialSignal('restart');
}
function hint() {
  if (!playing || solvedShown) return;
  const h = L.hint(st);
  if (!h) return;
  from = -1; hintMove = h; hints++; sfx.hint(); tutorialSignal('hint'); render();
}
function starsFor(moves, min) {
  const base = moves <= min ? 3 : moves <= Math.ceil(min * 1.25) ? 2 : 1;
  return hints > 0 ? Math.min(base, 2) : base;              // 힌트를 쓰면 별은 최대 두 개
}
function onClear() {
  if (!L.isWon(st)) return;
  solvedShown = true; sfx.win(); tutorialSignal('clear');
  const min = L.minMoves(n), stars = starsFor(st.moves, min);
  const prev = done[n];
  const best = !prev || stars > prev.stars || (stars === prev.stars && st.moves < prev.moves);
  if (best) { done[n] = { moves: st.moves, stars }; store.set(DONE_KEY, JSON.stringify(done)); }
  store.set('hanoiCleared', String(clearedCount()));
  const idx = SIZES.indexOf(n), nextSize = SIZES[idx + 1];
  showOverlay(`
    <h2>탑을 옮겼어요! 🗼</h2>
    <div class="stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
    <p>이동 <b>${st.moves}</b>번 (최소 ${min}번)${hints ? ` · 힌트 ${hints}번` : ''}${best && prev ? '<br>🏆 내 최고 기록!' : ''}</p>
    ${stars === 3 ? '<p style="font-size:12.5px">최소 이동으로 옮겼어요! 대단해요</p>' : '<p style="font-size:12.5px">최소 이동으로, 힌트 없이 옮기면 ⭐ 세 개예요</p>'}
    <div class="col">${nextSize ? `<button id="nextBtn">원반 ${nextSize}개 ▶</button>` : '<p>가장 큰 탑까지 옮겼어요! 🏆</p>'}<button id="againBtn" class="sub">다시 하기</button><button id="listBtn" class="sub">원반 수 고르기</button></div>`);
  $('nextBtn') && ($('nextBtn').onclick = () => loadLevel(nextSize));
  $('againBtn').onclick = () => loadLevel(n);
  $('listBtn').onclick = showLevels;
}
function showLevels() {
  playing = false; solvedShown = false;
  showOverlay(`
    <h2>원반 수 고르기</h2>
    <p>깬 단계 <b>${clearedCount()}</b> / ${SIZES.length}</p>
    <div class="scroll"><div class="levels">${SIZES.map((s) => `<button data-n="${s}" class="${done[s] ? 'done' : ''}${s === last ? ' cur' : ''}">${s}개<small>${done[s] ? '⭐'.repeat(done[s].stars) : `최소 ${L.minMoves(s)}번`}</small></button>`).join('')}</div></div>
    <button id="backBtn" class="sub">닫기</button>`);
  document.querySelectorAll('#overlay .levels button').forEach((b) => { b.onclick = () => loadLevel(Number(b.dataset.n)); });
  $('backBtn').onclick = () => { if (st) { playing = true; hideOverlay(); } };
}
function showTitle() {
  playing = false;
  showOverlay(`
    <h1>하노이 탑</h1>
    <p>탑을 <b>3번 기둥</b>으로 옮기세요!</p>
    <div class="card2" style="font-size:13px">🗼 한 번에 <b>맨 위 원반 하나</b>만 옮겨요<br>🚫 <b>작은 원반 위에 큰 원반</b>은 못 올려요<br>⭐ 최소 이동으로, 힌트 없이 옮기면 별 세 개!<br>원반이 늘수록 어려워져요 (3개 ~ 8개)</div>
    <div class="col"><button id="startBtn">${clearedCount() ? '이어서 하기' : '시작하기'}<small>원반 ${last}개 · 깬 단계 ${clearedCount()}/${SIZES.length}</small></button><button id="listBtn" class="sub">원반 수 고르기</button></div>`);
  $('startBtn').onclick = () => loadLevel(last);
  $('listBtn').onclick = showLevels;
}

// ---------- 입력 ----------
addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key >= '1' && e.key <= '3') { onPeg(Number(e.key) - 1); return; }
  if (e.key === 'z' || e.key === 'Z') undo();
  else if (e.key === 'r' || e.key === 'R') restart();
  else if (e.key === 'h' || e.key === 'H') hint();
  else if (e.key === 'm' || e.key === 'M') toggleMute();
});
$('undoBtn').onclick = (e) => { e.currentTarget.blur(); undo(); };
$('restartBtn').onclick = (e) => { e.currentTarget.blur(); restart(); };
$('hintBtn').onclick = (e) => { e.currentTarget.blur(); hint(); };
$('menuBtn').onclick = (e) => { e.currentTarget.blur(); if (!overlayOpen()) showLevels(); };

buildPegs(); render();
showTitle();

/* @test-hooks:start */
window.__hn = { get st() { return st; }, get n() { return n; }, get playing() { return playing; }, get done() { return done; }, get from() { return from; }, SIZES, loadLevel, peg: onPeg, undo, restart, hint };
/* @test-hooks:end */
})();
