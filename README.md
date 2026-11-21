# Sokoban solver

Push-optimal Sokoban solver for make.fun's sokoban-solver-01-run-20261121.

The generator's levels split into independent rooms joined only by the player's walk down a hallway, and P* is the sum of the rooms' optima. So the solver cuts the level into rooms, solves each room push-optimally with A* over pushes (state = sorted boxes + the player's reachable region, named by its lowest square; admissible assignment heuristic, dead-square / frozen-block / wall-frozen pruning), and stitches the rooms' move strings together with walks. If a level does not decompose, the same search runs over the whole level. No clock, no randomness: every budget is a count of states, so two runs write identical bytes.

Practice set: 1,000,000 (every instance at P*); house baseline plain-astar scores 200,000 on the same set. Also 1,000,000 on three extra sets drawn with the kit's generator. Whole practice set runs in ~4.3 s pinned to 1 CPU (wall budget 60 s).

Run: `node main.ts` reads `/input/<id>/level.txt`, writes `/output/<id>/solution.txt`. Locally: `MAKEFUN_INPUT_DIR=practice/input MAKEFUN_OUTPUT_DIR=out node main.ts`.
