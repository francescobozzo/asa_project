import log from 'loglevel';
import { PDDLProblemContext } from './pddl.js';
import Tile from './tile.js';
import { arrayAverage, getRandomElementFromArray, setDifference, setUnion } from './utils.js';

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

  constructor(width: number, height: number, sensedTiles: any, parcelDecayLR: number) {
    this.createMap(width, height, sensedTiles);
    this.parcelDecayLR = parcelDecayLR;
  }

  // PUBLIC SENSING

  updateParcelsFromMessagePayload(parcels: Parcel[]) {
    for (const parcel of parcels) {
      if (this.visibleParcelIds.has(parcel.id)) continue;

      if (this.notVisibleParcelIds.has(parcel.id)) {
        this.parcels.get(parcel.id).update(parcel.x, parcel.y, parcel.carriedBy, parcel.reward, false);
        this.notVisibleParcelIds.add(parcel.id);
      } else {
        this.parcels.set(parcel.id, parcel);
        this.notVisibleParcelIds.add(parcel.id);
      }
    }
  }

  updateAgentsFromMessagePayload(agents: Agent[]) {
    for (const agent of agents) {
      if (this.visibleAgentIds.has(agent.id)) continue;

      if (this.notVisibleAgentIds.has(agent.id)) {
        this.agents.get(agent.id).update(agent.x, agent.y, agent.score, false);
      } else {
        this.agents.set(agent.id, agent);
        this.notVisibleAgentIds.add(agent.id);
      }
    }
  }

  updateAgentsFromMessageSender(senderId: string, senderName: string, senderPosition: Tile) {
    if (!this.agents.has(senderId)) {
      this.notVisibleAgentIds.add(senderId);
      this.agents.set(senderId, new Agent(senderId, senderName, senderPosition.x, senderPosition.y, 0, false));
    } else {
      const previousAgent = this.agents.get(senderId);
      previousAgent.x = senderPosition.x;
      previousAgent.y = senderPosition.y;
      this.agents.set(senderId, previousAgent);
    }
  }

  updateParcelsDecayEstimation() {
    let deltas = [];
    for (const parcelId of this.visibleParcelIds)
      deltas = deltas.concat(this.parcels.get(parcelId).getParcelDecayEstimation());
    if (deltas.length > 0) {
      const oldParcelsDecayEstimation = this.parcelsDecayEstimation;
      const currentContribution = this.parcelsDecayEstimation * (1 - this.parcelDecayLR);
      const newContribution = arrayAverage(deltas) * this.parcelDecayLR;
      this.parcelsDecayEstimation = currentContribution + newContribution;
      log.debug(
        `DEBUG: parcel decay estimation upated: ${oldParcelsDecayEstimation} -> ${this.parcelsDecayEstimation} `
      );
    }
  }

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

  getTile(x: number, y: number): Tile {
    const { roundX, roundY } = this.roundTileCoordinates(x, y);
    return this.map[roundX][roundY];
  }

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

  getNeighbors(tile: Tile): Tile[] {
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

  private roundTileCoordinates(x: number, y: number) {
    if (Math.round(x * 10) % 10 === 4 || Math.round(y * 10) % 10 === 4) {
      return { roundX: Math.ceil(x), roundY: Math.ceil(y) };
    } else if (Math.round(x * 10) % 10 === 6 || Math.round(y * 10) % 10 === 6) {
      return { roundX: Math.floor(x), roundY: Math.floor(y) };
    }

    return { roundX: x, roundY: y };
  }

  getRandomNeighbor(x: number, y: number): Tile {
    return getRandomElementFromArray(this.getNeighbors(this.getTile(x, y)));
  }

  getRandomValidTile(): Tile {
    return getRandomElementFromArray(this.validTiles);
  }

  getRandomDeliveryStation(): Tile {
    return getRandomElementFromArray(this.deliveryStations);
  }

  // PRIVATE INNER FUNCTIONS

  // PUBLIC EXPORTER

  toPddlDomain(mainAgent: Agent) {
    console.log('Generating pddl domain');
    const tileObjects: string[] = [];
    const predicates: string[] = [];
    const height = this.map.length;

    for (let i = 0; i < height; i++) {
      const width = this.map[i].length;

      for (let j = 0; j < width; j++) {
        const current = this.map[i][j];
        tileObjects.push(this.tileToPddl(current));

        if (!current.isWalkable) continue;

        // if (current.hasParcel) {
        //   predicates.push(`(parcel ${this.tileToPddl(current)})`);
        // }

        if (current.isDelivery) {
          predicates.push(`(delivery ${this.tileToPddl(current)})`);
        }

        for (const neighbor of this.getNeighbors(current)) {
          predicates.push(`(can-move ${this.tileToPddl(current)} ${this.tileToPddl(neighbor)})`);

          if (
            (!mainAgent && current.isMainPlayer) ||
            (mainAgent && mainAgent.x === current.x && mainAgent.y === current.y)
          ) {
            predicates.push(`(can-move ${this.tileToPddl(neighbor)} ${this.tileToPddl(current)})`);
          }
        }
      }
    }

    const objects = tileObjects.join(' ');
    return new PDDLProblemContext(objects, predicates);
  }

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
