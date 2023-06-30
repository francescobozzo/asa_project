import { Agents, Agent } from './agent.js';
import GameMap from './map.js';
import { Parcel, Parcels } from './parcel.js';

export default class BeliefSet {
  private map: GameMap;
  private agents: Agents = new Agents();
  private parcels: Parcels = new Parcels();
  private me: Agent;

  initMap(width: number, height: number, sensedTiles: any[]) {
    this.map = new GameMap(width, height, sensedTiles);
  }

  senseAgents(agents: Agent[]) {
    this.agents.senseAgents(agents);
    if (this.map) {
      this.map.senseAgents(agents);
      this.map.print();
    }
  }

  senseParcels(parcels: Parcel[]) {
    this.parcels.senseParcels(parcels);
    if (this.map) {
      this.map.senseParcels(parcels);
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
