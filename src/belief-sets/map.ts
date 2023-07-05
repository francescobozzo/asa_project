import Tile from './tile.js';
import log from 'loglevel';
import { getNeighboursFromTile, getRandomElementFromArray, roundCoordinates, setIntersection } from './utils.js';
import { Parcel, Parcels } from './parcel.js';
import { Agent } from './agent.js';
import PddlProblem from '../pddl-client/PddlProblem.js';
import { get } from 'http';

export default class GameMap {
  private map: Tile[][] = [];
  private validTiles: Tile[] = [];
  private deliveryStations: Tile[] = [];
  private width: number;
  private height: number;

  constructor(width: number, height: number, sensedTiles: any[]) {
    this.width = width;
    this.height = height;
    this.createMap(sensedTiles);
  }

  createMap(sensedTiles: any) {
    for (let x = 0; x < this.width; x++) {
      this.map.push([]);
      for (let y = 0; y < this.height; y++) this.map[x].push(new Tile(x, y));
    }

    for (let i = 0; i < sensedTiles.length; i++) {
      const [x, y] = [sensedTiles[i].x, sensedTiles[i].y];
      const tile = this.map[x][y];

      if (sensedTiles[i].delivery) {
        tile.isWalkable = true;
        tile.isDelivery = true;
        this.deliveryStations.push(tile);
      } else {
        this.validTiles.push(tile);
        tile.isWalkable = true;
      }
    }

    log.info('INFO : map created');
  }

  senseParcels(parcels: Parcel[]) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) this.setTileValue(x, y, 0);
    }

    for (const parcel of parcels) {
      this.setTileValue(parcel.x, parcel.y, parcel.reward);
    }
  }

  senseAgents(agents: Agent[], me: Agent) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) this.freeTile(x, y);
    }

    for (const agent of agents) {
      this.occupyTile(agent.x, agent.y, false);
    }

    this.occupyTile(me.x, me.y, true);
  }

  senseYou(oldX: number, oldY: number, me: Agent) {
    this.freeTile(oldX, oldY);
    this.occupyTile(me.x, me.y, true);
  }

  toPddlProblem() {
    const tileObjectsSet = new Set<string>();
    const moveInitsSet = new Set<string>();

    // iterate over the map
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        const current = this.map[i][j];

        // if not walkable skip iteration
        if (!current.isWalkable) continue;

        // add tile to the list of objects
        tileObjectsSet.add(`${current.toPddl()} - position`);

        // if delivery zones ad to inits
        if (current.isDelivery) moveInitsSet.add(`delivery ${current.toPddl()}`);

        for (const neighbor of getNeighboursFromTile(current, this.map)) {
          moveInitsSet.add(`can-move ${current.toPddl()} ${neighbor.toPddl()}`);
          moveInitsSet.add(`can-move ${neighbor.toPddl()} ${current.toPddl()}`);

          // TODO penso che questa si possa togliere tranquillamente
          // if (
          //   (!leaderAgent && current.isMainPlayer) ||
          //   (leaderAgent && leaderAgent.x === current.x && leaderAgent.y === current.y)
          // ) {
          //   inits.push(`can-move ${neighbor.toPddl()} ${current.toPddl()}`);
          // }
        }
      }
    }

    const moveInits = Array.from(moveInitsSet);
    const tileObjects = Array.from(tileObjectsSet);
    return { tileObjects, moveInits };
  }

  bfs(start: Agent, parcels: Parcel[]) {
    const stack = [this.map[start.x][start.y]];
    const visited = new Set();
    const reachableParcels = new Set<Parcel>();
    const tileToParcel = new Map<Tile, Parcel>();

    for (const parcel of parcels) {
      tileToParcel.set(this.map[parcel.x][parcel.y], parcel);
    }

    while (stack.length > 0) {
      const current = stack.pop();

      if (!visited.has(current)) {
        visited.add(current);
        if (tileToParcel.has(current)) reachableParcels.add(tileToParcel.get(current));

        for (const neighbour of getNeighboursFromTile(current, this.map)) {
          stack.push(neighbour);
        }
      }
    }

    return Array.from(reachableParcels);
  }

  getDeliveryStations() {
    return this.deliveryStations;
  }

  getRandomValidTile(): Tile {
    return getRandomElementFromArray(this.validTiles);
  }

  print() {
    console.log(this.toString());
  }

  private occupyTile(x: number, y: number, isMainPlayer: boolean) {
    const { roundX, roundY } = roundCoordinates(x, y);
    const tile = this.map[roundX][roundY];
    tile.isOccupied = true;
    if (isMainPlayer) tile.isMainPlayer = true;
    log.debug(`DEBUG: occupyTile: ${roundX},${roundY}`);
  }

  private freeTile(x: number, y: number) {
    const { roundX, roundY } = roundCoordinates(x, y);
    const tile = this.map[roundX][roundY];
    tile.isOccupied = false;
    tile.isMainPlayer = false;
    log.debug(`DEBUG: freeTile: ${roundX},${roundY}`);
  }

  private setTileValue(x: number, y: number, value: number) {
    const { roundX, roundY } = roundCoordinates(x, y);
    const tile = this.map[roundX][roundY];
    tile.value = value;
    tile.hasParcel = tile.value > 0 ? true : false;
    log.debug(`DEBUG: setTileValue: ${roundX},${roundY} ${tile.value}`);
  }

  private toString(): string {
    let returnValue = '';
    returnValue += `┌${'─'.repeat(this.map.length * 3)}┐\n`;
    for (let i = 0; i < this.width; i++) {
      returnValue += '│';
      for (let j = 0; j < this.height; j++) {
        const tileValue = this.map[i][j].toString();
        if (tileValue.length > 2) {
          console.log(tileValue);
        }
        returnValue += `${' '.repeat(2 - tileValue.length)} ${tileValue}`;
      }
      returnValue += '│\n';
    }
    returnValue += `└${'─'.repeat(this.map.length * 3)}┘\n`;

    return returnValue;
  }
}
