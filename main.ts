// The entry: main.ts at the repository's root (Node 22).
// Reads every instance under /input/<id>/level.txt, writes /output/<id>/solution.txt.
// Local run: MAKEFUN_INPUT_DIR=practice/input MAKEFUN_OUTPUT_DIR=out node main.ts
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { solveLevel } from './solver.ts';

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

for (const id of readdirSync(I).sort()) {
  const text = readFileSync(join(I, id, 'level.txt'), 'utf8');
  const solved = solveLevel(text);
  const moves = solved === null ? '' : solved.moves;
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'solution.txt'), `${moves}\n`);
}
