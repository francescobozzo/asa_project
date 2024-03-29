import log from 'loglevel';
import Tile from './tile.js';
import { arrayAverage, getRandomElementFromArray, setDifference, setUnion } from './utils.js';

import PddlProblem from '../pddl-client/PddlProblem.js';
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
    // this.printWalkable();
    // this.print();
    this.parcelDecayLR = parcelDecayLR;
  }

  // PUBLIC SENSING

  /**
   * Update parcels when sensing
   * @param parcels
   * @returns True if new parcels are observed
   */
  updateParcels(parcels: any[]) {
    const sensedIds = new Set<string>(parcels.map((p) => p.id));
    // the difference between old visible parcels and new visible parcels contains
    // future not visible parcels
    const newNotVisible = setDifference(this.visibleParcelIds, sensedIds);

    this.visibleParcelIds = sensedIds;
    // sensed parcels are removed form not visible parcels and the result is merged
    // with new not visible parcels computed above
    this.notVisibleParcelIds = setUnion(setDifference(this.notVisibleParcelIds, sensedIds), newNotVisible);

    // updating the list of saved parcels
    this.updateParcelsList(parcels);

    // visible parcels' values are saved in the map
    for (const parcelId of this.visibleParcelIds.values()) {
      const parcel = this.parcels.get(parcelId);
      if (!parcel.carriedBy) this.setTileValue(parcel.x, parcel.y, parcel.reward);
    }

    // not visible parcels' values are not saved in the map
    // not visible parcels are marked as notVisible
    for (const parcelId of this.notVisibleParcelIds.values()) {
      const parcel = this.parcels.get(parcelId);
      parcel.isVisible = false;
    }

    // delete parcels with reward equal to 0
    for (const parcelId of Array.from(this.parcels.keys())) {
      const parcel = this.parcels.get(parcelId);
      if (parcel.reward <= 0) {
        this.setTileValue(parcel.x, parcel.y, 0);
        this.parcels.delete(parcelId);
        this.notVisibleParcelIds.delete(parcelId);
        this.visibleParcelIds.delete(parcelId);
        this.parcelsToAvoidIds.delete(parcelId);
      }
    }
    // this.print();

    return newNotVisible.size !== 0;
  }

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

  updateAgents(agents: any[]) {
    const sensedIds = new Set<string>(agents.map((p) => p.id));
    // the difference between old visible agents and new visible agents contains
    // future not visible agents
    const newNotVisible = setDifference(this.visibleAgentIds, sensedIds);

    this.visibleAgentIds = sensedIds;
    // sensed agents are removed form not visible agents and the result is merged
    // with new not visible agents computed above
    this.notVisibleAgentIds = setUnion(setDifference(this.notVisibleAgentIds, sensedIds), newNotVisible);

    // updating the list of saved agents
    this.updateAgentsList(agents);

    // visible agents' are marked in the map
    for (const agentId of this.visibleAgentIds.values()) {
      const agent = this.agents.get(agentId);
      this.occupyTile(agent.x, agent.y, false);
    }

    // not visible agents are marked as notVisible
    for (const agentId of this.notVisibleAgentIds.values()) {
      const agent = this.agents.get(agentId);
      this.freeTile(agent.x, agent.y);
    }
    // this.print();
  }

  // PRIVATE SENSING

  private updateParcelsList(parcels: any[]) {
    for (const parcel of parcels) {
      if (!this.parcels.has(parcel.id)) {
        this.parcels.set(parcel.id, new Parcel(parcel.id, parcel.x, parcel.y, parcel.carriedBy, parcel.reward, true));
        this.setTileValue(parcel.x, parcel.y, parcel.reward);
      } else {
        const savedParcel = this.parcels.get(parcel.id);
        this.setTileValue(savedParcel.x, savedParcel.y, 0);
        savedParcel.update(parcel.x, parcel.y, parcel.carriedBy, parcel.reward, true);
      }
    }
  }

  private updateAgentsList(agents: any[]) {
    for (const agent of agents) {
      if (!this.agents.has(agent.id))
        this.agents.set(agent.id, new Agent(agent.id, agent.name, agent.x, agent.y, agent.score));
      else {
        const savedAgent = this.agents.get(agent.id);
        this.freeTile(savedAgent.x, savedAgent.y);
        savedAgent.update(agent.x, agent.y, agent.score, true);
      }
    }
  }

  // PUBLIC ON MAP ACTION

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

  setTileValue(x: number, y: number, value: number) {
    const { roundX, roundY } = this.roundTileCoordinates(x, y);
    const tile = this.map[roundX][roundY];
    tile.value = value;
    tile.hasParcel = tile.value > 0 ? true : false;
    log.debug(`DEBUG: setTileValue: ${roundX},${roundY} ${tile.value}`);
  }

  getTile(x: number, y: number): Tile {
    const { roundX, roundY } = this.roundTileCoordinates(x, y);
    return this.map[roundX][roundY];
  }

  getCarriedScore(agentId: string) {
    let carriedScore = 0;
    let numCarriedParcels = 0;
    for (const parcel of this.parcels.values())
      if (parcel.isVisible && parcel.carriedBy === agentId) {
        carriedScore += parcel.reward;
        numCarriedParcels += 1;
      }

    return [carriedScore, numCarriedParcels];
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

  private createMap(width: number, height: number, sensedTiles: any) {
    for (let x = 0; x < width; x++) {
      this.map.push([]);
      for (let y = 0; y < height; y++) this.map[x].push(new Tile(x, y));
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

    log.info('INFO : belief set created');
  }

  // PUBLIC EXPORTER

  toPddlDomain(mainAgent: Agent) {
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
          predicates.push(`delivery ${this.tileToPddl(current)}`);
        }

        for (const neighbor of this.getNeighbors(current)) {
          predicates.push(`can-move ${this.tileToPddl(current)} ${this.tileToPddl(neighbor)}`);

          if (
            (!mainAgent && current.isMainPlayer) ||
            (mainAgent && mainAgent.x === current.x && mainAgent.y === current.y)
          ) {
            predicates.push(`can-move ${this.tileToPddl(neighbor)} ${this.tileToPddl(current)}`);
          }
        }
      }
    }

    return new PddlProblem('deliveroo', predicates, tileObjects, '');
  }

  tileToPddl(tile: Tile) {
    return `y${tile.y}_x${tile.x}`;
  }

  pddlToTile(pddlObject: string): Tile {
    const [y, x] = pddlObject.split('_');
    return this.map[parseInt(x.slice(1))][parseInt(y.slice(1))];
  }

  toString(): string {
    let returnValue = '';
    returnValue += `┌${'─'.repeat(this.map.length * 3)}┐\n`;
    for (let i = 0; i < this.map.length; i++) {
      returnValue += '│';
      for (let j = 0; j < this.map[i].length; j++) {
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

  // PUBLIC PRINTERS

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

  printAgents() {
    let returnValue = '';
    returnValue += `┌${'─'.repeat(this.map.length * 3)}┐\n`;
    for (let i = 0; i < this.map.length; i++) {
      returnValue += '│';
      for (let j = 0; j < this.map[i].length; j++) {
        if (this.map[i][j].isMainPlayer) returnValue += `  I`;
        else if (this.map[i][j].isOccupied) returnValue += `  A`;
        else if (this.map[i][j].isWalkable) returnValue += `  X`;
        else returnValue += `   `;
      }
      returnValue += '│\n';
    }
    returnValue += `└${'─'.repeat(this.map.length * 3)}┘\n`;

    console.log(returnValue);
  }

  getSizeLength() {
    return this.map.length;
  }
}

export default DeliverooMap;
