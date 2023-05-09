import Tile from './tile.js';

enum Action {
  LEFT = 'left',
  RIGHT = 'right',
  DOWN = 'down',
  UP = 'up',
  PICKUP = 'pickup',
  PUTDOWN = 'putdown',
  UNDEFINED = 'none',
}

class Movement {
  constructor(public tile: Tile, public move: Action) {}
}

function ManhattanDistance(a: Tile, b: Tile) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function computeAction(b: Tile, a: Tile): Action {
  if (a.x > b.x) return Action.RIGHT;
  if (b.x > a.x) return Action.LEFT;
  if (a.y > a.y) return Action.DOWN;
  if (b.y > a.y) return Action.UP;
  return Action.UNDEFINED;
}

export { Action, Movement, ManhattanDistance, computeAction };
