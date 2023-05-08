import { TileStatus, TupleSet, Tuple, ManhattanDistance } from './utils.js';
import Parcel from './parcel.js';
import Agent from './agent.js';
import PriorityQueue from 'priorityqueue';

class DeliverooMap {
  constructor(width, height, tiles) {
    this.map = [];
    this.#createMap(width, height);
    this.#updateTiles(tiles);
  }

  #createMap(width, height) {
    for (let i = 0; i < height; i++) {
      this.map.push([]);
      for (let j = 0; j < width; j++) this.map[i].push(TileStatus.NonWalkable);
    }
  }

  #updateTiles(tiles) {
    for (const tile of tiles)
      this.updateTile(tile.x, tile.y, tile.delivery ? TileStatus.Delivery : TileStatus.Walkable);
  }

  updateTile(x, y, status) {
    this.map[x][y] = status;
  }

  toString() {
    let returnValue = '';
    for (let i = 0; i < this.map.length; i++) {
      for (let j = 0; j < this.map[i].length; j++) {
        if (this.map[i][j] === TileStatus.Delivery) returnValue += '  D';
        else if (this.map[i][j] === TileStatus.Walkable) returnValue += '  X';
        else if (this.map[i][j] === TileStatus.Player) returnValue += '  P';
        else if (this.map[i][j] === TileStatus.NonWalkable) returnValue += '   ';
        else if (this.map[i][j] instanceof Agent) returnValue += '  A';
        else returnValue += '  ' + this.map[i][j].toString();
      }
      returnValue += '\n';
    }
    return returnValue;
  }

  #computeNeighbors(x, y) {
    console.log(x, y);
    let neighbors = [];
    // 0 used for walkable and positives for parcels
    if (x > 0 && this.map[x - 1][y] >= 0) neighbors.push(Tuple(x - 1, y));
    if (x < this.map.length - 1 && this.map[x + 1][y] >= 0) neighbors.push(Tuple(x + 1, y));
    if (y > 0 && this.map[x][y - 1] >= 0) neighbors.push(Tuple(x, y - 1));
    if (y < this.map[x].length - 1 && this.map[x][y + 1] >= 0) neighbors.push(Tuple(x, y + 1));
    return neighbors;
  }

  #computeAction(x1, y1, x2, y2) {
    if (x1 > x2) return 'left';
    if (x2 > x1) return 'right';
    if (y1 > y2) return 'down';
    if (y2 > y1) return 'up';
  }

  shortestPathFromTo(startX, startY, endX, endY) {
    class Elem {
      constructor(tuple, priority) {
        this.tuple = tuple;
        this.priority = priority;
      }
    }
    const comparator = (a, b) => {
      return a.priority < b.priority;
    };
    let frontier = new PriorityQueue({ comparator });
    frontier.push(new Elem(Tuple(startX, startY), 0));
    let cameFrom = new Map();
    let costSoFar = new Map();
    cameFrom.set(Tuple(startX, startY), null);
    costSoFar.set(Tuple(startX, startY), 0);

    while (frontier.length > 0) {
      const current = frontier.pop().tuple;
      if (current[0] === endX && current[1] === endY) break;
      for (const neighbor of this.#computeNeighbors(current[0], current[1])) {
        const newCost = costSoFar[current] + 1;
        if (!costSoFar.has(neighbor) || newCost < costSoFar.get(neighbor)) {
          costSoFar.set(neighbor, newCost);
          const priority = newCost + ManhattanDistance(Tuple(endX, endY), neighbor);
          frontier.push(new Elem(neighbor, priority));
          if (neighbor[0] === endX && neighbor[1] === endY) console.log(neighbor);
          cameFrom.set(
            neighbor,
            Tuple(current[0], current[1], this.#computeAction(current[0], current[1], neighbor[0], neighbor[1]))
          );
        }
      }
    }
    return cameFrom;
  }
}

export default DeliverooMap;
