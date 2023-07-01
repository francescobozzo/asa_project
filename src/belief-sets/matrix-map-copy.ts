import log from 'loglevel';
import { PDDLProblemContext } from './pddl.js';
import Tile from './tile.js';
import { arrayAverage, getRandomElementFromArray } from './utils.js';

import { Agent } from './agent.js';
import { Parcel } from './parcel.js';

class DeliverooMap {
  private map: Tile[][] = [];
  public validTiles: Tile[] = [];
  public deliveryStations: Tile[] = [];
  private agents = new Map<string, Agent>();
  private visibleAgentIds = new Set<string>();
  private notVisibleAgentIds = new Set<string>();
  public parcels = new Map<string, Parcel>();
  public visibleParcelIds = new Set<string>();
  public notVisibleParcelIds = new Set<string>();
  private parcelDecayLR: number;
  private parcelsDecayEstimation: number = 1;
  public parcelsToAvoidIds = new Set<string>();

  constructor(width: number, height: number, sensedTiles: any, parcelDecayLR: number) {}

  // PUBLIC SENSING

  getAgents() {
    return this.agents;
  }

  getMapDiagonal() {
    return Math.ceil(this.map.length * Math.sqrt(2));
  }

  getVisibleParcelIds() {
    return this.visibleAgentIds;
  }

  getNotVisibleParcelIds() {
    return this.notVisibleAgentIds;
  }

  getParcelsDecayEstimation() {
    return this.parcelsDecayEstimation;
  }

  // PRIVATE SENSING

  // PUBLIC ON MAP ACTION

  // getTile(x: number, y: number): Tile {
  //   const { roundX, roundY } = this.roundTileCoordinates(x, y);
  //   return this.map[roundX][roundY];
  // }

  getVisibleParcels(): Parcel[] {
    const parcels = [];
    for (const parcelId of this.visibleParcelIds) {
      parcels.push(this.parcels.get(parcelId));
    }

    return parcels;
  }

  getNotVisibleParcels(): Parcel[] {
    const parcels = [];
    for (const parcelId of this.notVisibleParcelIds) {
      parcels.push(this.parcels.get(parcelId));
    }

    return parcels;
  }

  getParcels() {
    return this.parcels;
  }

  // getRandomNeighbor(x: number, y: number): Tile {
  //   return getRandomElementFromArray(this.getNeighbors(this.getTile(x, y)));
  // }

  getRandomValidTile(): Tile {
    return getRandomElementFromArray(this.validTiles);
  }

  getRandomDeliveryStation(): Tile {
    return getRandomElementFromArray(this.deliveryStations);
  }

  // PRIVATE INNER FUNCTIONS

  // PUBLIC EXPORTER

  tileToPddl(tile: Tile) {
    return `y${tile.y}_x${tile.x}`;
  }

  pddlToTile(pddlObject: string): Tile {
    const [y, x] = pddlObject.split('_');
    return this.map[parseInt(x.slice(1))][parseInt(y.slice(1))];
  }

  getSizeLength() {
    return this.map.length;
  }
}

export default DeliverooMap;
