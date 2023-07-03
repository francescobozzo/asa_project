import { get } from 'http';
import PddlProblem from '../pddl-client/PddlProblem.js';
import { Agent, Agents } from './agent.js';
import GameMap from './map.js';
import { Parcel, Parcels } from './parcel.js';
import Tile from './tile.js';
import { getNeighboursFromTile, roundCoordinates } from './utils.js';

export default class BeliefSet {
  private map: GameMap;
  private agents: Agents = new Agents();
  private parcels: Parcels = new Parcels();
  private me: Agent;
  private parcelsDecayEstimation: number = 1;
  private parcelDecayLR: number;

  constructor(parcelDecayLR: number) {
    this.parcelDecayLR = parcelDecayLR;
  }

  initMap(width: number, height: number, sensedTiles: any[]) {
    this.map = new GameMap(width, height, sensedTiles);

    setTimeout(() => {
      this.updateValueNotVisibleParcels(this.map, this.parcels);
    }, 1000);
  }

  senseAgents(agents: Agent[], externalPerception: boolean) {
    this.agents.senseAgents(agents, externalPerception);
    if (this.map && this.me && !externalPerception) {
      this.map.senseAgents(agents, this.me);
      // this.map.print();
    }
  }

  senseParcels(parcels: Parcel[], externalPerception: boolean) {
    this.parcels.senseParcels(parcels, externalPerception);
    if (this.map) {
      this.map.senseParcels(this.parcels.getParcels());
      // this.map.print();
    }
  }

  senseYou(me: Agent) {
    if (!this.me) {
      this.me = me;
    }
    if (this.map) {
      const oldX = me.x;
      const oldY = me.y;
      this.map.senseYou(oldX, oldY, me);
      this.me.update(me.x, me.y, me.score, true);
      // this.map.print();
    }
  }

  getCarriedScoreByAgentId(agentId: string) {
    let carriedScore = 0;
    let numCarriedParcels = 0;

    for (const parcel of this.parcels.getParcelsByAgentId(agentId)) {
      carriedScore += parcel.reward;
      numCarriedParcels += 1;
    }

    return [carriedScore, numCarriedParcels];
  }

  updateParcelDecayEstimation() {
    const newEstimation = this.parcels.getParcelsDecayEstimation(this.parcelsDecayEstimation, this.parcelDecayLR);
    if (newEstimation !== undefined) this.parcelsDecayEstimation = newEstimation;
  }

  // update not visible parcels value using a sort of dynamic set interval
  updateValueNotVisibleParcels(map: GameMap, parcels: Parcels) {
    const parcelsIdToDelete = new Set<string>();
    for (const parcel of parcels.getParcels()) {
      if (!parcel.isVisible) parcel.reward -= 1;

      if (parcel.reward <= 0) parcelsIdToDelete.add(parcel.id);
    }

    for (const parcelId of parcelsIdToDelete) {
      parcels.deleteParcel(parcelId);
    }

    // refresh the map
    map.senseParcels(parcels.getParcels());

    setTimeout(() => {
      this.updateValueNotVisibleParcels(this.map, this.parcels);
    }, this.parcels.getParcelsDecayEstimation(this.parcelsDecayEstimation, this.parcelDecayLR) * 1000 ?? 1000);
  }

  toPddlProblem(friendlyAgents: Set<string>) {
    const { tileObjects, moveInits } = this.map.toPddlProblem();
    const { agentObjects, agentInits } = this.agents.toPddlProblem(friendlyAgents);
    const { parcelObjects, parcelInits } = this.parcels.toPddlProblem();
    let objects = tileObjects.concat(agentObjects);
    objects = objects.concat(parcelObjects);
    objects.push(`a_${this.me.id} - agent`);

    let inits = moveInits.concat(agentInits);
    inits = inits.concat(parcelInits);
    inits = inits.concat([`blocked y${this.me.y}_x${this.me.x}`]);
    inits.push(`at a_${this.me.id} y${this.me.y}_x${this.me.x}`);
    inits.push(`blocked y${this.me.y}_x${this.me.x}`);

    return new PddlProblem('deliveroo', objects, inits, '');
  }

  amIInitialized() {
    return this.me !== undefined && this.me !== null;
  }

  getMyId() {
    return this.me.id;
  }

  getMyPosition() {
    if (this.me) return new Tile(this.me.x, this.me.y);
    return undefined;
  }

  getParcels() {
    return this.parcels.getParcels();
  }

  getReachableParcels() {
    let reachableParcels = [];
    for (const agent of this.getAgents()) {
      if (Number.isInteger(agent.x) && Number.isInteger(agent.y)) {
        reachableParcels = reachableParcels.concat(this.map.bfs(agent, this.getParcels()));
      } else {
        return [];
      }
    }

    if (Number.isInteger(this.me.x) && Number.isInteger(this.me.y))
      return reachableParcels.concat(this.map.bfs(this.me, this.getParcels()));
    else {
      return [];
    }
  }

  getAgents() {
    return this.agents.getAgents();
  }

  getDeliveryStations() {
    return this.map.getDeliveryStations();
  }

  getParcelDecayEstimation() {
    return this.parcelsDecayEstimation;
  }

  getRandomValidTile(): Tile {
    return this.map.getRandomValidTile();
  }

  deleteParcels(parcels: Parcel[]) {
    this.parcels.deleteParcels(parcels.map((parcel) => parcel.id));
    this.map.senseParcels(this.parcels.getParcels());
  }

  deleteCarriedParcels() {
    const carriedParcels = this.parcels.getParcels().filter((parcel) => parcel.carriedBy === this.me.id);
    this.deleteParcels(carriedParcels);
  }
  // mapToPddlProblem() {
  //   return this.map.toPddlProblem(this.me);
  // }

  printMap() {
    this.map.print();
  }

  printAgents() {
    this.agents.print();
  }

  printParcels() {
    this.parcels.print();
  }
}
