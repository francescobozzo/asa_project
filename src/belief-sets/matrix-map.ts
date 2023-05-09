import { PriorityQueue } from 'p-queue-ts';
import { PDDLPlan, tileToPddl } from './pddl.js';
import Tile from './tile.js';
import { Action, ManhattanDistance, Movement, computeAction } from './utils.js';

class DeliverooMap {
  private map: Tile[][] = [];
  constructor(width: number, height: number, tiles: any) {
    this.createMap(width, height, tiles);
  }

  private createMap(width: number, height: number, tiles: any) {
    for (let x = 0; x < width; x++) {
      this.map.push([]);
      for (let y = 0; y < height; y++) this.map[x].push(new Tile(x, y));
    }

    for (let i = 0; i < tiles.length; i++)
      if (tiles[i].delivery) this.map[tiles[i].y][tiles[i].x].isDelivery = true;
      else this.map[tiles[i].y][tiles[i].x].isWalkable = false;
  }

  private getNeighbors(tile: Tile): Tile[] {
    const neighbors: Tile[] = [];
    const x = tile.x;
    const y = tile.y;

    if (x > 0 && this.map[x - 1][y].isWalkable && !this.map[x - 1][y].isOccupied) neighbors.push(this.map[x - 1][y]);
    if (x < this.map.length - 1 && this.map[x + 1][y].isWalkable && !this.map[x + 1][y].isOccupied)
      neighbors.push(this.map[x + 1][y]);
    if (y > 0 && this.map[x][y - 1].isWalkable && !this.map[x][y - 1].isOccupied) neighbors.push(this.map[x][y - 1]);
    if (y < this.map[x].length - 1 && this.map[x][y + 1].isWalkable && !this.map[x][y + 1].isOccupied)
      neighbors.push(this.map[x][y + 1]);
    return neighbors;
  }

  shortestPathFromTo(startX: number, startY: number, endX: number, endY: number): Map<Tile, Movement> {
    class Element {
      constructor(public tile: Tile, public priority: number) {}
    }
    const frontier = new PriorityQueue((a: Element, b: Element): boolean => {
      console.log(a);
      console.log(b);
      return a.priority < b.priority;
    });
    const goal = this.map[endX][endY];
    frontier.push(new Element(this.map[startX][startY], 0));
    const cameFrom = new Map<Tile, Movement>();
    const costSoFar = new Map<Tile, number>();
    cameFrom.set(this.map[startX][startY], new Movement(null, Action.UNDEFINED));
    costSoFar.set(this.map[startX][startY], 0);

    while (frontier.size() > 0) {
      const current: Tile = frontier.pop().tile;
      if (current.isEqual(goal)) break;
      for (const neighbor of this.getNeighbors(current)) {
        const newCost = costSoFar.get(current) + 1;
        if (!costSoFar.has(neighbor) || newCost < costSoFar.get(neighbor)) {
          costSoFar.set(neighbor, newCost);
          const priority = newCost + ManhattanDistance(goal, neighbor);
          frontier.push(new Element(neighbor, priority));
          cameFrom.set(neighbor, new Movement(current, computeAction(current, neighbor)));
        }
      }
    }
    return cameFrom;
  }

  private roundTileCoordinates(x: number, y: number) {
    return { roundX: Math.round(x), roundY: Math.round(y) };
  }

  occupyTile(x: number, y: number, isMainPlayer: boolean) {
    const { roundX, roundY } = this.roundTileCoordinates(x, y);
    this.map[roundX][roundY].isOccupied = true;
    if (isMainPlayer) this.map[roundX][roundX].isMainPlayer = true;
  }

  freeTile(x: number, y: number) {
    if (x && y) {
      const { roundX, roundY } = this.roundTileCoordinates(x, y);
      this.map[roundX][roundY].isOccupied = false;
      this.map[roundX][roundY].isMainPlayer = false;
    } else {
      console.warn('Failing to free a tile: ', x, y);
    }
  }

  addTileValue(x: number, y: number, value: number) {
    const { roundX, roundY } = this.roundTileCoordinates(x, y);
    this.map[roundX][roundY].value += value;
  }

  removeTileValue(x: number, y: number, value: number) {
    const { roundX, roundY } = this.roundTileCoordinates(x, y);
    this.map[roundX][roundY].value -= value;
  }

  getTile(x: number, y: number): Tile {
    const { roundX, roundY } = this.roundTileCoordinates(x, y);
    return this.map[roundX][roundY];
  }

  toPddlDomain(): PDDLPlan {
    const objects: string[] = [];
    const movePredicates: string[] = [];
    const height = this.map.length;

    for (let i = 0; i < height; i++) {
      const width = this.map[i].length;

      for (let j = 0; j < width; j++) {
        const current = this.map[i][j];
        objects.push(tileToPddl(current));

        if (!current.isWalkable) continue;

        for (const neighbor of this.getNeighbors(current)) {
          `(can-move ${tileToPddl(current)} ${tileToPddl(neighbor)})`;
        }
      }

      const predicates = movePredicates.join(' '); // add current position

      return new PDDLPlan(objects, predicates);
    }
  }

  toString(): string {
    let returnValue = '';
    for (let i = 0; i < this.map.length; i++)
      for (let j = 0; j < this.map[i].length; j++) returnValue += this.map[i][j].toString();

    return returnValue;
  }

  print() {
    console.log(this.toString());
  }
}

export default DeliverooMap;
