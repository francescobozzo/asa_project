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

class Plan {
  constructor(public actions: Action[], public potentialScore: number) {}
}

function ManhattanDistance(a: Tile, b: Tile) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function ManhattanDistanceFromYX(startX: number, startY: number, endX: number, endY: number) {
  return Math.abs(startX - endX) + Math.abs(startY - endY);
}

function computeAction(from: Tile, to: Tile): Action {
  if (to.x > from.x) return Action.RIGHT;
  if (from.x > to.x) return Action.LEFT;
  if (to.y > from.y) return Action.UP;
  if (from.y > to.y) return Action.DOWN;
  return Action.UNDEFINED;
}

function computeActionFromYX(fromX: number, fromY: number, toX: number, toY: number): Action {
  if (toX > fromX) return Action.RIGHT;
  if (fromX > toX) return Action.LEFT;
  if (toY > fromY) return Action.UP;
  if (fromY > toY) return Action.DOWN;
  return Action.UNDEFINED;
}

function getRandomElementFromArray(array: any[]) {
  return array[Math.floor(Math.random() * array.length)];
}

function setDifference<T>(setA: Set<T>, setB: Set<T>): Set<T> {
  return new Set([...setA].filter((element) => !setB.has(element)));
}

function setIntersection<T>(setA: Set<T>, setB: Set<T>): Set<T> {
  return new Set([...setA].filter((element) => setB.has(element)));
}

function setUnion<T>(setA: Set<T>, setB: Set<T>): Set<T> {
  return new Set([...setA, ...setB]);
}

function arrayAverage(array: number[]): number {
  return array.reduce((a, b) => a + b) / array.length;
}

function yxToPddl(y: number, x: number): string {
  return `y${y}_x${x}`;
}

function pddlToyx(pddlObject: string): number[] {
  const [y, x] = pddlObject.split('_');
  return [parseInt(y.slice(1)), parseInt(x.slice(1))];
}

export {
  Action,
  Plan,
  ManhattanDistance,
  ManhattanDistanceFromYX,
  computeAction,
  computeActionFromYX,
  getRandomElementFromArray,
  arrayAverage,
  setDifference,
  setIntersection,
  setUnion,
  yxToPddl,
  pddlToyx,
};
