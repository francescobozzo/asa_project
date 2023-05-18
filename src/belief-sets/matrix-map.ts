import log from 'loglevel';
import { PDDLPlan, tileToPddl } from './pddl.js';
import Tile from './tile.js';
import { getRandomElementFromArray, setDifference, setUnion, arrayAverage } from './utils.js';

import Agent from './agent.js';
import Parcel from './parcel.js';

class DeliverooMap {
  private map: Tile[][] = [];
  private validTiles: Tile[] = [];
  public deliveryStations: Tile[] = [];
  private agents = new Map<string, Agent>();
  private visibleAgentIds = new Set<string>();
  private notVisibleAgentIds = new Set<string>();
  private parcels = new Map<string, Parcel>();
  private visibleParcelIds = new Set<string>();
  private notVisibleParcelIds = new Set<string>();
  private parcelDecayLR: number;
  private parcelsDecayEstimation: number = 1;

  constructor(width: number, height: number, sensedTiles: any, parcelDecayLR: number) {
    this.createMap(width, height, sensedTiles);
    this.printWalkable();
    this.print();
    this.parcelDecayLR = parcelDecayLR;
  }

  // PUBLIC SENSING

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
      this.setTileValue(parcel.x, parcel.y, 0);
      parcel.reward -= 1; // TODO: multiply per inferred decay, considering spawn time
      parcel.isVisible = false;
    }

    // delete parcels with reward equal to 0
    for (const parcelId of Array.from(this.parcels.keys())) {
      const parcel = this.parcels.get(parcelId);
      if (parcel.reward === 0) {
        this.parcels.delete(parcelId);
        this.notVisibleParcelIds.delete(parcelId);
        this.visibleParcelIds.delete(parcelId);
      }
    }
    // this.print();
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
      log.info(
        `DEBUG: parcel decay estimation upated: ${oldParcelsDecayEstimation} -> ${this.parcelsDecayEstimation} `
      );
    }
  }
  getParcelsDecayEstimation() {
    // return arrayAverage(deltas);
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
}

export default DeliverooMap;
