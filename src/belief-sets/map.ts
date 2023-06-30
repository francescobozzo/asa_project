import Tile from './tile.js';
import log from 'loglevel';
import { roundCoordinates, setIntersection } from './utils.js';
import { Parcel, Parcels } from './parcel.js';
import { Agent } from './agent.js';

export default class GameMap {
  private map: Tile[][] = [];
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
      } else {
        tile.isWalkable = true;
      }
    }

    log.info('INFO : map created');
  }

  print() {
    console.log(this.toString());
  }

  senseParcels(parcels: Parcel[]) {
    for (let y = 0; y < this.width; y++) {
      for (let x = 0; x < this.width; x++) this.setTileValue(x, y, 0);
    }

    for (const parcel of parcels) {
      this.setTileValue(parcel.x, parcel.y, parcel.reward);
    }
  }

  senseAgents(agents: Agent[]) {
    for (let y = 0; y < this.width; y++) {
      for (let x = 0; x < this.width; x++) this.freeTile(x, y);
    }

    for (const agent of agents) {
      this.occupyTile(agent.x, agent.y, false);
    }
  }

  senseYou(oldX: number, oldY: number, me: Agent) {
    this.freeTile(oldX, oldY);
    this.occupyTile(me.x, me.y, true);
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
