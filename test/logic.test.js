'use strict';
const test = require('node:test');
const assert = require('node:assert');
const L = require('../logic.js');

test('a new game stacks all discs on the first peg, largest at the bottom', () => {
  const st = L.newGame(4);
  assert.deepStrictEqual(st.pegs, [[4, 3, 2, 1], [], []]);
  assert.strictEqual(st.moves, 0);
  assert.ok(!L.isWon(st));
  assert.strictEqual(L.minMoves(3), 7);
  assert.strictEqual(L.minMoves(8), 255);
});

test('only the top disc moves, onto an empty peg or a bigger disc', () => {
  const st = L.newGame(3);
  assert.strictEqual(L.move(st, 0, 1), 1);
  assert.deepStrictEqual(st.pegs, [[3, 2], [1], []]);
  assert.strictEqual(L.move(st, 0, 2), 2);
  assert.strictEqual(L.move(st, 1, 2), 1, 'a smaller disc goes on a bigger one');
  assert.deepStrictEqual(st.pegs, [[3], [], [2, 1]]);
  assert.strictEqual(st.moves, 3);
});

test('a big disc cannot go on a small one, and impossible moves change nothing', () => {
  const st = L.newGame(3);
  L.move(st, 0, 1);                                    // 1 → 가운데
  const before = JSON.stringify(st);
  assert.strictEqual(L.move(st, 0, 1), null, '2 on 1');
  assert.strictEqual(L.move(st, 2, 0), null, 'from an empty peg');
  assert.strictEqual(L.move(st, 0, 0), null, 'to the same peg');
  for (const bad of [[-1, 0], [0, 3], [0, 1.5], ['0', 1], [null, 1], [undefined, 1], [NaN, 1]]) assert.strictEqual(L.move(st, ...bad), null, String(bad));
  assert.strictEqual(JSON.stringify(st), before);
});

test('canMove matches move', () => {
  const st = L.newGame(3);
  for (let f = 0; f < 3; f++) for (let t = 0; t < 3; t++) {
    const ok = L.canMove(st, f, t);
    const copy = JSON.parse(JSON.stringify(st));
    assert.strictEqual(L.move(copy, f, t) !== null, ok, `${f}→${t}`);
  }
});

test('undo puts the disc back and is unlimited', () => {
  const st = L.newGame(4);
  const start = JSON.stringify(st.pegs);
  const seq = [[0, 1], [0, 2], [1, 2], [0, 1], [2, 0], [2, 1], [0, 1]];
  for (const [f, t] of seq) assert.ok(L.move(st, f, t) !== null);
  for (let i = 0; i < seq.length; i++) assert.ok(L.undo(st));
  assert.strictEqual(JSON.stringify(st.pegs), start);
  assert.strictEqual(st.moves, 0);
  assert.strictEqual(L.undo(st), false);
});

test('winning needs every disc on the last peg', () => {
  const st = L.newGame(2);
  L.move(st, 0, 1); L.move(st, 0, 2);
  assert.ok(!L.isWon(st));
  L.move(st, 1, 2);
  assert.ok(L.isWon(st));
  assert.deepStrictEqual(st.pegs, [[], [], [2, 1]]);
});

test('the fewest-move solution from the start has exactly 2^n - 1 moves and really solves it', () => {
  for (let n = 1; n <= 8; n++) {
    const st = L.newGame(n);
    const path = L.solveFrom(st);
    assert.strictEqual(path.length, L.minMoves(n), `n=${n}`);
    for (const { from, to } of path) assert.ok(L.move(st, from, to) !== null, `n=${n} legal`);
    assert.ok(L.isWon(st), `n=${n} solved`);
  }
});

test('hint works from any position and following hints always finishes', () => {
  for (let n = 3; n <= 6; n++) {
    for (let seed = 1; seed <= 15; seed++) {
      const st = L.newGame(n);
      let x = seed * 7919;
      const rnd = () => { x = (x * 1103515245 + 12345) & 0x7fffffff; return x / 0x7fffffff; };
      for (let i = 0; i < 25; i++) L.move(st, Math.floor(rnd() * 3), Math.floor(rnd() * 3));   // 아무렇게나 옮겨 본 뒤
      const need = L.solveFrom(st).length;
      let guard = 0;
      while (!L.isWon(st)) {
        const h = L.hint(st);
        assert.ok(h && L.canMove(st, h.from, h.to));
        L.move(st, h.from, h.to);
        assert.ok(++guard <= L.minMoves(n), 'hints finish');
      }
      assert.strictEqual(guard, need, 'following hints is the shortest way');
    }
  }
  assert.strictEqual(L.hint(Object.assign(L.newGame(2), { pegs: [[], [], [2, 1]] })), null, 'no hint when solved');
});

test('the shortest way from a position is never longer than starting over', () => {
  const st = L.newGame(5);
  L.move(st, 0, 2); L.move(st, 0, 1);                  // 시작점에서 두 수만 옮긴 상태
  assert.ok(L.solveFrom(st).length <= L.minMoves(5));
  const solved = L.newGame(3);
  solved.pegs = [[], [], [3, 2, 1]];
  assert.deepStrictEqual(L.solveFrom(solved), []);
});
