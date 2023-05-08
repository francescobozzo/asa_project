export const TileStatus = {
  Walkable: 0,
  NonWalkable: -1,
  Delivery: 0,
  Agent: -3,
  Player: -4,
};

export function TupleSet() {
  this.data = new Map();

  this.add = function ([first, second]) {
    if (!this.data.has(first)) {
      this.data.set(first, new Set());
    }

    this.data.get(first).add(second);
    return this;
  };

  this.has = function ([first, second]) {
    return this.data.has(first) && this.data.get(first).has(second);
  };

  this.delete = function ([first, second]) {
    if (!this.data.has(first) || !this.data.get(first).has(second)) return false;

    this.data.get(first).delete(second);
    if (this.data.get(first).size === 0) {
      this.data.delete(first);
    }

    return true;
  };
}
export let Tuple = (function () {
  let map = new Map();

  function tuple() {
    let current = map;
    let args = Object.freeze(Array.prototype.slice.call(arguments));

    for (let item of args) {
      if (current.has(item)) {
        current = current.get(item);
      } else {
        let next = new Map();
        current.set(item, next);
        current = next;
      }
    }

    if (!current.final) {
      current.final = args;
    }

    return current.final;
  }

  return tuple;
})();

export function ManhattanDistance(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}
