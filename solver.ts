export interface Level { w: number; h: number; wall: Uint8Array; goals: number[]; boxes: number[]; player: number }
export interface Room { boxes: number[]; goals: number[]; done: boolean }
export interface Solution { pushes: number; moves: string }
const DIRS: [number, number, string, string][] = [[0, -1, 'u', 'U'], [0, 1, 'd', 'D'], [-1, 0, 'l', 'L'], [1, 0, 'r', 'R']];
function step(w: number, h: number, c: number, dx: number, dy: number): number {
  const x = (c % w) + dx, y = Math.floor(c / w) + dy;
  return x < 0 || x >= w || y < 0 || y >= h ? -1 : y * w + x;
}
export function parseLevel(text: string): Level {
  const rows = text.split('\n').filter((r) => r.length > 0);
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const wall = new Uint8Array(w * h).fill(1);
  const goals: number[] = [], boxes: number[] = [];
  let player = -1;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x], i = y * w + x;
      if (ch === '#') continue;
      wall[i] = 0;
      if (ch === '.' || ch === '*' || ch === '+') goals.push(i);
      if (ch === '$' || ch === '*') boxes.push(i);
      if (ch === '@' || ch === '+') player = i;
    }
  });
  boxes.sort((a, b) => a - b);
  goals.sort((a, b) => a - b);
  return { w, h, wall, goals, boxes, player };
}
export function liveSquares(level: Level): Uint8Array {
  const { w, h, wall, goals } = level;
  const live = new Uint8Array(wall.length);
  const queue = [...goals];
  for (const g of goals) live[g] = 1;
  for (let qi = 0; qi < queue.length; qi++) {
    const x = queue[qi]!;
    for (const [dx, dy] of DIRS) {
      const y = step(w, h, x, -dx, -dy);
      if (y < 0 || live[y] || wall[y]) continue;
      const behind = step(w, h, y, -dx, -dy);
      if (behind < 0 || wall[behind]) continue;
      live[y] = 1;
      queue.push(y);
    }
  }
  return live;
}
function reach(level: Level, occupied: Uint8Array, from: number, seen: Int32Array, stamp: number, stack: Int32Array): number {
  const { w, h, wall } = level;
  let low = from, n = 0;
  stack[n++] = from;
  seen[from] = stamp;
  while (n > 0) {
    const p = stack[--n]!;
    if (p < low) low = p;
    for (const [dx, dy] of DIRS) {
      const q = step(w, h, p, dx, dy);
      if (q < 0 || wall[q] || occupied[q] || seen[q] === stamp) continue;
      seen[q] = stamp;
      stack[n++] = q;
    }
  }
  return low;
}
export function roomsOf(level: Level): Room[] | null {
  const { w, wall, goals, boxes, player } = level;
  const live = liveSquares(level);
  const row = Math.floor(player / w);
  const cut = new Uint8Array(wall.length);
  for (let i = row * w; i < (row + 1) * w; i++) if (!wall[i] && !live[i]) cut[i] = 1;
  if (boxes.some((b) => cut[b]) || goals.some((g) => cut[g])) return null;
  const part = new Int32Array(wall.length).fill(-1);
  const rooms: Room[] = [];
  for (let s = 0; s < wall.length; s++) {
    if (wall[s] || cut[s] || (part[s] ?? -1) >= 0) continue;
    const squares = [s];
    part[s] = rooms.length;
    for (let i = 0; i < squares.length; i++) {
      for (const [dx, dy] of DIRS) {
        const q = step(w, level.h, squares[i]!, dx, dy);
        if (q < 0 || wall[q] || cut[q] || (part[q] ?? -1) >= 0) continue;
        part[q] = rooms.length;
        squares.push(q);
      }
    }
    rooms.push({ boxes: [], goals: [], done: false });
  }
  for (const b of boxes) rooms[part[b]!]!.boxes.push(b);
  for (const g of goals) rooms[part[g]!]!.goals.push(g);
  if (rooms.some((r) => r.boxes.length !== r.goals.length)) return null;
  return rooms.filter((r) => r.boxes.length > 0);
}
function md(w: number, a: number, b: number): number {
  return Math.abs((a % w) - (b % w)) + Math.abs(Math.floor(a / w) - Math.floor(b / w));
}
function heur(w: number, boxes: number[], goals: number[]): number {
  if (boxes.length === 0) return 0;
  if (boxes.length <= 6) {
    let best = Infinity;
    const used = new Array<boolean>(goals.length).fill(false);
    const go = (i: number, acc: number): void => {
      if (acc >= best) return;
      if (i === boxes.length) { best = acc; return; }
      for (let j = 0; j < goals.length; j++) {
        if (used[j]) continue;
        used[j] = true;
        go(i + 1, acc + md(w, boxes[i]!, goals[j]!));
        used[j] = false;
      }
    };
    go(0, 0);
    return best;
  }
  let sum = 0;
  for (const b of boxes) {
    let m = Infinity;
    for (const g of goals) m = Math.min(m, md(w, b, g));
    sum += m;
  }
  return sum;
}
function frozen(level: Level, occupied: Uint8Array, goal: Uint8Array, t: number): boolean {
  const { w, h, wall } = level;
  const tx = t % w, ty = Math.floor(t / w);
  for (let oy = -1; oy <= 0; oy++) for (let ox = -1; ox <= 0; ox++) {
    const x = tx + ox, y = ty + oy;
    if (x < 0 || y < 0 || x + 1 >= w || y + 1 >= h) continue;
    const a = y * w + x, cells = [a, a + 1, a + w, a + w + 1];
    if (!cells.every((c) => wall[c] || occupied[c])) continue;
    if (cells.some((c) => occupied[c] && !goal[c])) return true;
  }
  return false;
}
function wfrozen(level: Level, b: number): boolean {
  const { w, h, wall } = level;
  const isWall = (c: number): boolean => c < 0 || (wall[c] ?? 0) !== 0;
  return isWall(step(w, h, b, -1, 0)) && isWall(step(w, h, b, 1, 0)) && isWall(step(w, h, b, 0, -1)) && isWall(step(w, h, b, 0, 1));
}
function keyOf(boxes: number[], low: number, size: number): number | string {
  if (boxes.length <= 4) {
    let k = low;
    for (const b of boxes) k = k * size + b;
    return k;
  }
  return low + '|' + boxes.join(',');
}
export function solvePushes(level: Level, maxStates = 250_000): Solution | null {
  const { w, h, wall, goals } = level;
  const size = wall.length;
  const goal = new Uint8Array(size);
  for (const g of goals) goal[g] = 1;
  const live = liveSquares(level);
  const solved = (bs: number[]): boolean => bs.every((b) => goal[b]);
  if (level.boxes.some((b) => !live[b])) return null;
  if (solved(level.boxes)) return { pushes: 0, moves: '' };
  const occ = new Uint8Array(size);
  const seen = new Int32Array(size), mark = new Int32Array(size), stack = new Int32Array(size);
  let stamp = 0;
  const B: number[][] = [level.boxes.slice()];
  const P: number[] = [level.player];
  const G: number[] = [0];
  const L: number[] = [];
  const par: number[] = [-1], pf: number[] = [-1], pt: number[] = [-1], pd: number[] = [-1];
  const best = new Map<number | string, number>();
  const heap: [number, number, number, number][] = [];
  const less = (a: [number, number, number, number], b: [number, number, number, number]): boolean =>
    a[0] < b[0] || (a[0] === b[0] && (a[1] < b[1] || (a[1] === b[1] && a[2] < b[2])));
  const hp = (e: [number, number, number, number]): void => {
    let i = heap.length;
    heap.push(e);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!less(heap[i]!, heap[p]!)) break;
      [heap[i], heap[p]] = [heap[p]!, heap[i]!];
      i = p;
    }
  };
  const hq = (): [number, number, number, number] => {
    const top = heap[0]!, last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      for (let i = 0; ; ) {
        let c = 2 * i + 1;
        if (c >= heap.length) break;
        if (c + 1 < heap.length && less(heap[c + 1]!, heap[c]!)) c++;
        if (!less(heap[c]!, heap[i]!)) break;
        [heap[i], heap[c]] = [heap[c]!, heap[i]!];
        i = c;
      }
    }
    return top;
  };
  for (const b of level.boxes) occ[b] = 1;
  const startLow = reach(level, occ, level.player, seen, ++stamp, stack);
  for (const b of level.boxes) occ[b] = 0;
  L.push(startLow);
  best.set(keyOf(level.boxes, startLow, size), 0);
  let order = 0;
  const h0 = heur(w, level.boxes, goals);
  hp([h0, h0, order++, 0]);
  let found = -1;
  while (heap.length > 0) {
    const [, , , s] = hq();
    const boxes = B[s]!, g = G[s]!;
    if (best.get(keyOf(boxes, L[s]!, size)) !== g) continue;
    if (solved(boxes)) { found = s; break; }
    for (const b of boxes) occ[b] = 1;
    reach(level, occ, P[s]!, seen, ++stamp, stack);
    const here = stamp;
    for (let bi = 0; bi < boxes.length; bi++) {
      const b = boxes[bi]!;
      for (let di = 0; di < 4; di++) {
        const [dx, dy] = DIRS[di]!;
        const behind = step(w, h, b, -dx, -dy), t = step(w, h, b, dx, dy);
        if (behind < 0 || t < 0) continue;
        if (seen[behind] !== here) continue;
        if (wall[t] || occ[t] || !live[t]) continue;
        occ[b] = 0;
        occ[t] = 1;
        const fr = frozen(level, occ, goal, t) || (!goal[t] && wfrozen(level, t));
        let next: number[] | null = null, key: number | string = -1, nLow = -1;
        if (!fr) {
          next = boxes.slice();
          next[bi] = t;
          next.sort((a, bb) => a - bb);
          nLow = reach(level, occ, b, mark, ++stamp, stack);
          key = keyOf(next, nLow, size);
        }
        occ[t] = 0;
        occ[b] = 1;
        if (fr || next === null) continue;
        const seenG = best.get(key);
        if (seenG !== undefined && seenG <= g + 1) continue;
        if (B.length >= maxStates) {
          for (const x of boxes) occ[x] = 0;
          return null;
        }
        best.set(key, g + 1);
        B.push(next);
        P.push(b);
        G.push(g + 1);
        L.push(nLow);
        par.push(s);
        pf.push(b);
        pt.push(t);
        pd.push(di);
        const hh = heur(w, next, goals);
        hp([g + 1 + hh, hh, order++, B.length - 1]);
      }
    }
    for (const x of boxes) occ[x] = 0;
  }
  if (found < 0) return null;
  const path: number[] = [];
  for (let s = found; s > 0; s = par[s]!) path.push(s);
  path.reverse();
  let moves = '', player = level.player, boxes = level.boxes.slice();
  for (const s of path) {
    const from = pf[s]!, to = pt[s]!, di = pd[s]!;
    const [dx, dy, , letter] = DIRS[di]!;
    for (const b of boxes) occ[b] = 1;
    moves += walkTo(level, occ, player, step(w, h, from, -dx, -dy));
    for (const b of boxes) occ[b] = 0;
    moves += letter;
    player = from;
    boxes = B[s]!.slice();
  }
  return { pushes: path.length, moves };
}
export function walkTo(level: Level, occupied: Uint8Array, from: number, to: number): string {
  const { w, h, wall } = level;
  if (from === to) return '';
  const prev = new Int32Array(wall.length).fill(-1);
  const how = new Array<string>(wall.length);
  const queue = [from];
  prev[from] = from;
  for (let qi = 0; qi < queue.length; qi++) {
    const p = queue[qi]!;
    if (p === to) break;
    for (const [dx, dy, letter] of DIRS) {
      const q = step(w, h, p, dx, dy);
      if (q < 0 || wall[q] || occupied[q] || prev[q] !== -1) continue;
      prev[q] = p;
      how[q] = letter;
      queue.push(q);
    }
  }
  if (prev[to] === -1) throw new Error('walkTo: the push square is out of reach');
  let s = '';
  for (let p = to; p !== from; p = prev[p]!) s = how[p]! + s;
  return s;
}
function endOf(w: number, from: number, moves: string): number {
  let p = from;
  for (const ch of moves.toLowerCase()) p += ch === 'u' ? -w : ch === 'd' ? w : ch === 'l' ? -1 : 1;
  return p;
}
export function solveLevel(text: string, maxStates = 250_000): Solution | null {
  const level = parseLevel(text);
  if (level.boxes.every((b) => level.goals.includes(b))) return { pushes: 0, moves: '' };
  const rooms = roomsOf(level);
  if (rooms !== null) {
    let player = level.player, pushes = 0, moves = '', ok = true;
    for (const room of rooms) {
      const wall = level.wall.slice();
      for (const other of rooms) {
        if (other === room) continue;
        for (const b of other.done ? other.goals : other.boxes) wall[b] = 1;
      }
      const sub: Level = { w: level.w, h: level.h, wall, goals: room.goals.slice().sort((a, b) => a - b), boxes: room.boxes.slice().sort((a, b) => a - b), player };
      const solved = solvePushes(sub, maxStates);
      if (solved === null) { ok = false; break; }
      pushes += solved.pushes;
      moves += solved.moves;
      player = endOf(level.w, player, solved.moves);
      room.done = true;
    }
    if (ok) return { pushes, moves };
  }
  return solvePushes(level, 100_000);
}
export function replay(text: string, moves: string): { legal: boolean; solved: boolean; pushes: number } {
  const level = parseLevel(text);
  const { w, wall, goals } = level;
  const box = new Uint8Array(wall.length);
  for (const b of level.boxes) box[b] = 1;
  const goal = new Uint8Array(wall.length);
  for (const g of goals) goal[g] = 1;
  let player = level.player, pushes = 0;
  for (const ch of moves.replace(/\s+/g, '')) {
    const dir = DIRS.find(([, , l]) => l === ch.toLowerCase());
    if (!dir) return { legal: false, solved: false, pushes };
    const [dx, dy] = dir;
    const d = dy * w + dx, next = player + d;
    if (next < 0 || next >= wall.length || wall[next]) return { legal: false, solved: false, pushes };
    if (box[next]) {
      const beyond = next + d;
      if (beyond < 0 || beyond >= wall.length || wall[beyond] || box[beyond]) return { legal: false, solved: false, pushes };
      box[next] = 0;
      box[beyond] = 1;
      pushes++;
    }
    player = next;
  }
  let solved = true;
  for (let i = 0; i < box.length; i++) if (box[i] && !goal[i]) solved = false;
  return { legal: true, solved, pushes };
}
