import { PriorityQueue } from 'p-queue-ts';
import { PDDLPlan, tileToPddl } from './pddl.js';
import Tile from './tile.js';
import { Action, ManhattanDistance, Movement, computeAction } from './utils.js';

class DeliverooMap {
  private map: Tile[][];
  constructor(width: number, height: number, tiles: any) {
    this.createMap(width, height, tiles);
  }

  private createMap(width: number, height: number, tiles: any) {
    for (let i = 0; i < height; i++) {
      this.map.push([]);
      for (let j = 0; j < width; j++) this.map[i].push(new Tile(i, j));
    }

    for (let i = 0; i < tiles.length; i++)
      if (tiles[i].delivery) this.map[tiles[i].x][tiles[i].y].isDelivery = true;
      else this.map[tiles[i].x][tiles[i].y].isWalkable = false;
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
      return a.priority < b.priority;
    });
    const goal = this.map[endX][endY];
    frontier.push(new Element(this.map[startX][startY], 0));
    const cameFrom = new Map<Tile, Movement>();
    const costSoFar = new Map<Tile, number>();
    cameFrom.set(this.map[startX][startY], new Movement(null, Action.UNDEFINED));
    costSoFar.set(this.map[startX][startY], 0);

    while (frontier.size() > 0) {
      const current: Tile = frontier.pop();
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

  occupyTile(x: number, y: number, isMainPlayer: boolean) {
    this.map[x][y].isOccupied = true;
    if (isMainPlayer) this.map[x][y].isMainPlayer = true;
  }

  freeTile(x: number, y: number) {
    this.map[x][y].isOccupied = false;
    this.map[x][y].isMainPlayer = false;
  }

  addTileValue(x: number, y: number, value: number) {
    this.map[x][y].value += value;
  }

  removeTileValue(x: number, y: number, value: number) {
    this.map[x][y].value -= value;
  }

  getTile(x: number, y: number): Tile {
    return this.map[x][y];
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
