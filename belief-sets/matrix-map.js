import PriorityQueue from 'priorityqueue';
import Agent from './agent.js';
import { tileToPddl } from './pddl.js';
import { ManhattanDistance, TileStatus, Tuple, computeAction } from './utils.js';

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
    let neighbors = [];
    // 0 used for walkable and positives for parcels
    if (x > 0 && this.map[x - 1][y] >= 0) neighbors.push(Tuple(x - 1, y));
    if (x < this.map.length - 1 && this.map[x + 1][y] >= 0) neighbors.push(Tuple(x + 1, y));
    if (y > 0 && this.map[x][y - 1] >= 0) neighbors.push(Tuple(x, y - 1));
    if (y < this.map[x].length - 1 && this.map[x][y + 1] >= 0) neighbors.push(Tuple(x, y + 1));
    return neighbors;
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
          cameFrom.set(
            neighbor,
            Tuple(current[0], current[1], computeAction(current[0], current[1], neighbor[0], neighbor[1]))
          );
        }
      }
    }
    return cameFrom;
  }

  toPddlDomain() {
    let currentPosition = null;
    const tiles = [];
    const availableMoves = [];
    const height = this.map.length;

    for (let i = 0; i < height; i++) {
      const width = this.map[i].length;

      for (let j = 0; j < width; j++) {
        tiles.push([i, j]);

        if (this.map[i][j] === TileStatus.Player) currentPosition = [i, j];

        if (this.map[i][j] === TileStatus.NonWalkable) continue;

        if (i + 1 < height && this.map[i + 1][j] !== TileStatus.NonWalkable) {
          availableMoves.push([i, j, i + 1, j]);
        }
        if (i - 1 >= 0 && this.map[i - 1][j] !== TileStatus.NonWalkable) {
          availableMoves.push([i, j, i - 1, j]);
        }
        if (j + 1 < width && this.map[i][j + 1] !== TileStatus.NonWalkable) {
          availableMoves.push([i, j, i, j + 1]);
        }
        if (j - 1 >= 0 && this.map[i][j - 1] !== TileStatus.NonWalkable) {
          availableMoves.push([i, j, i, j - 1]);
        }
      }
    }

    const movePredicates = availableMoves.map(
      (move) => `(can-move ${tileToPddl(move[0], move[1])} ${tileToPddl(move[2], move[3])})`
    );

    const objects = tiles.map((tile) => tileToPddl(tile[0], tile[1]));
    const predicates = movePredicates.join(' '); // add current position

    return {
      objects: objects,
      predicates: predicates,
    };
  }
}

export default DeliverooMap;
