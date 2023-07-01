import { Agents, Agent } from './agent.js';
import GameMap from './map.js';
import { Parcel, Parcels } from './parcel.js';

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
  }

  senseAgents(agents: Agent[], externalPerception: boolean) {
    this.agents.senseAgents(agents, externalPerception);
    if (this.map && this.me && !externalPerception) {
      this.map.senseAgents(agents, this.me);
      this.map.print();
    }
  }

  senseParcels(parcels: Parcel[], externalPerception: boolean) {
    this.parcels.senseParcels(parcels, externalPerception);
    if (this.map) {
      this.map.senseParcels(this.parcels.getParcels());
      this.map.print();
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
      this.map.print();
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
