import { PriorityQueue } from 'js-sdsl';
import { PDDLPlan, tileToPddl } from './pddl.js';
import Tile from './tile.js';
import { Action, ManhattanDistance, Movement, computeAction } from './utils.js';
import log from 'loglevel';

class DeliverooMap {
  private map: Tile[][] = [];

  constructor(width: number, height: number, tiles: any) {
    this.createMap(width, height, tiles);
    this.printWalkable();
    this.print();
  }

  private createMap(width: number, height: number, tiles: any) {
    for (let x = 0; x < width; x++) {
      this.map.push([]);
      for (let y = 0; y < height; y++) this.map[x].push(new Tile(x, y));
    }

    for (let i = 0; i < tiles.length; i++)
      if (tiles[i].delivery) {
        this.map[tiles[i].x][tiles[i].y].isWalkable = true;
        this.map[tiles[i].x][tiles[i].y].isDelivery = true;
      } else this.map[tiles[i].x][tiles[i].y].isWalkable = true;
    log.info('INFO : belief set created');
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
      print() {
        console.log(`${this.tile.x},${this.tile.y}: ${this.priority}`);
      }
    }
    const frontier = new PriorityQueue<Element>(
      [],
      (a: Element, b: Element): number => {
        return a.priority - b.priority;
      },
      false
    );
    const goal = this.map[endX][endY];
    frontier.push(new Element(this.map[startX][startY], 0));
    const cameFrom = new Map<Tile, Movement>();
    const costSoFar = new Map<Tile, number>();
    cameFrom.set(this.map[startX][startY], new Movement(null, Action.UNDEFINED));
    costSoFar.set(this.map[startX][startY], 0);

    while (frontier.size() > 0) {
      let currentElement = frontier.pop();
      currentElement.print();
      const current = currentElement.tile;
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
    console.log(goal);
    console.log(cameFrom);
    return cameFrom;
  }

  private roundTileCoordinates(x: number, y: number) {
    return { roundX: Math.round(x), roundY: Math.round(y) };
  }

  occupyTile(x: number, y: number, isMainPlayer: boolean) {
    const { roundX, roundY } = this.roundTileCoordinates(x, y);
    const tile = this.map[roundX][roundY];
    tile.isOccupied = true;
    if (isMainPlayer) tile.isMainPlayer = true;
    log.debug(`DEBUG: occupyTile: ${roundX},${roundY}`);
  }

  freeTile(x: number, y: number) {
    const { roundX, roundY } = this.roundTileCoordinates(x, y);
    const tile = this.map[roundX][roundY];
    tile.isOccupied = false;
    tile.isMainPlayer = false;
    log.debug(`DEBUG: freeTile: ${roundX},${roundY}`);
  }

  addTileValue(x: number, y: number, value: number) {
    const { roundX, roundY } = this.roundTileCoordinates(x, y);
    const tile = this.map[roundX][roundY];
    tile.hasParcel = true;
    tile.value += value;
    log.debug(`DEBUG: addTileValue: ${roundX},${roundY} ${tile.value}`);
  }

  removeTileValue(x: number, y: number, value: number) {
    const { roundX, roundY } = this.roundTileCoordinates(x, y);
    const tile = this.map[roundX][roundY];
    if (tile.hasParcel) tile.value -= value;
    tile.hasParcel = false;
    log.debug(`DEBUG: removeTileValue: ${roundX},${roundY} ${tile.value}`);
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
    returnValue += `┌${'─'.repeat(this.map.length * 3)}┐\n`;
    for (let i = 0; i < this.map.length; i++) {
      returnValue += '│';
      for (let j = 0; j < this.map[i].length; j++) {
        const tileValue = this.map[i][j].toString();
        returnValue += `${' '.repeat(2 - tileValue.length)} ${tileValue}`;
      }
      returnValue += '│\n';
    }
    returnValue += `└${'─'.repeat(this.map.length * 3)}┘\n`;

    return returnValue;
  }

  print() {
    console.log(this.toString());
  }

  printWalkable() {
    let returnValue = '';
    returnValue += `┌${'─'.repeat(this.map.length * 3)}┐\n`;
    for (let i = 0; i < this.map.length; i++) {
      returnValue += '│';
      for (let j = 0; j < this.map[i].length; j++) {
        returnValue += `  ${this.map[i][j].isWalkable ? 'X' : ' '}`;
      }
      returnValue += '│\n';
    }
    returnValue += `└${'─'.repeat(this.map.length * 3)}┘\n`;

    console.log(returnValue);
  }
}

export default DeliverooMap;
