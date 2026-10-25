'use strict';

// 하노이 탑: 규칙만 모아 둔 파일 (그리기·입력 없음). 브라우저와 테스트(Node)가 같이 쓴다.
//
// - 기둥 3개(0·1·2번). 처음에 원반 n개가 큰 것부터 아래로 0번 기둥에 쌓여 있다
// - 한 번에 맨 위 원반 하나만 다른 기둥으로 옮긴다. 작은 원반 위에 큰 원반을 올릴 수 없다
// - 원반을 모두 2번 기둥으로 옮기면 클리어. 가장 적게 옮기면 2^n - 1 번
// - 원반 번호: 1 이 가장 작고 n 이 가장 크다. pegs[p] 는 아래에서 위 순서
const LOGIC_HANOI = (() => {
const PEGS = 3, GOAL = 2;

function newGame(n) {
  return { n, pegs: [Array.from({ length: n }, (_, i) => n - i), [], []], moves: 0, history: [] };
}
const minMoves = (n) => 2 ** n - 1;
const top = (st, p) => st.pegs[p][st.pegs[p].length - 1];

// from 기둥의 맨 위 원반을 to 기둥으로 옮길 수 있는가
function canMove(st, from, to) {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= PEGS || to >= PEGS || from === to) return false;
  if (!st.pegs[from].length) return false;
  return !st.pegs[to].length || top(st, to) > top(st, from);
}
// 옮긴다. 안 되면 null, 되면 옮긴 원반 번호
function move(st, from, to) {
  if (!canMove(st, from, to)) return null;
  const d = st.pegs[from].pop();
  st.pegs[to].push(d);
  st.history.push([from, to]);
  st.moves++;
  return d;
}
function undo(st) {
  const h = st.history.pop();
  if (!h) return false;
  st.pegs[h[0]].push(st.pegs[h[1]].pop());
  st.moves--;
  return true;
}
const isWon = (st) => st.pegs[GOAL].length === st.n;

// ---------- 최소 이동 풀이 ----------
// 지금 판을 '원반마다 어느 기둥에 있는지'로 바꿔(3^n 가지) 너비 우선 탐색으로 가장 적게 옮기는 길을 찾는다
function assignment(st) {
  const a = new Array(st.n + 1).fill(0);
  st.pegs.forEach((peg, p) => peg.forEach((d) => { a[d] = p; }));
  return a;
}
// 돌려주는 값: [{ from, to }, ...] (이미 풀렸으면 빈 목록)
function solveFrom(st) {
  const n = st.n;
  const start = assignment(st);
  const key = (a) => { let k = 0; for (let d = 1; d <= n; d++) k = k * 3 + a[d]; return k; };
  const goalKey = key(new Array(n + 1).fill(GOAL));
  const startKey = key(start);
  if (startKey === goalKey) return [];
  const parent = new Map([[startKey, null]]);
  let frontier = [start];
  while (frontier.length) {
    const next = [];
    for (const a of frontier) {
      const k = key(a);
      const tops = [0, 0, 0];                              // 기둥마다 가장 작은 원반 (0 이면 빈 기둥)
      for (let d = n; d >= 1; d--) tops[a[d]] = d;
      for (let from = 0; from < PEGS; from++) {
        if (!tops[from]) continue;
        for (let to = 0; to < PEGS; to++) {
          if (to === from || (tops[to] && tops[to] < tops[from])) continue;
          const b = a.slice(); b[tops[from]] = to;
          const bk = key(b);
          if (parent.has(bk)) continue;
          parent.set(bk, { prev: k, from, to });
          if (bk === goalKey) {
            const path = [];
            for (let c = bk; parent.get(c); c = parent.get(c).prev) path.push({ from: parent.get(c).from, to: parent.get(c).to });
            return path.reverse();
          }
          next.push(b);
        }
      }
    }
    frontier = next;
  }
  return null;                                             // 도달할 수 없을 일은 없다
}
function hint(st) {
  const p = solveFrom(st);
  return p && p.length ? p[0] : null;
}

return { PEGS, GOAL, newGame, minMoves, canMove, move, undo, isWon, solveFrom, hint, top };
})();
if (typeof module !== 'undefined') module.exports = LOGIC_HANOI;
