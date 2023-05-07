import TileStatus from '../belief-sets/utils.js';
import Parcel from '../belief-sets/parcel.js';
import Agent from '../belief-sets/agent.js';

function getDifference(setA, setB) {
  return new Set([...setA].filter((element) => !setB.has(element)));
}

class IntentionPlanner {
  constructor(beliefSet, verbose) {
    this.beliefSet = beliefSet;
    this.agents = new Map();
    this.savedAgentIds = new Set();
    this.parcels = new Map();
    this.savedParcelIds = new Set();
    this.isVerbose = verbose;
  }

  agentsSensingHandler(agents) {
    let viewedAgentIds = new Set();
    for (const agent of agents) {
      viewedAgentIds.add(agent.id);
      this.savedAgentIds.add(agent.id);
      if (this.agents.has(agent.id)) {
        let cachedAgent = this.agents.get(agent.id);
        this.beliefSet.updateTile(Math.ceil(cachedAgent.x), Math.ceil(cachedAgent.y), TileStatus.Walkable);
        cachedAgent.x = agent.x;
        cachedAgent.y = agent.y;
        cachedAgent.score = agent.score;
      } else this.agents.set(agent.id, new Agent(agent.id, agent.name, agent.x, agent.y, agent.score));
    }
    for (const agentId of getDifference(this.savedAgentIds, viewedAgentIds)) this.agents.get(agentId).isVisible = false;
    for (const agent of this.agents.values()) {
      this.beliefSet.updateTile(
        Math.ceil(agent.x),
        Math.ceil(agent.y),
        agent.isVisible ? TileStatus.NonWalkable : TileStatus.Walkable
      );
    }
    if (this.isVerbose) console.log(this.beliefSet.toString());
  }

  parcelSensingHandler(parcels) {
    let viewedParcelIds = new Set();
    for (const parcel of parcels) {
      viewedParcelIds.add(parcel.id);
      this.savedParcelIds.add(parcel.id);
      if (this.parcels.has(parcel.id)) {
        let cachedParcel = this.parcels.get(parcel.id);
        cachedParcel.x = parcel.x;
        cachedParcel.y = parcel.y;
        cachedParcel.carriedBy = parcel.carriedBy;
        cachedParcel.reward = parcel.reward;
      } else this.parcels.set(parcel.id, new Parcel(parcel.id, parcel.x, parcel.y, parcel.carriedBy, parcel.reward));
    }
    for (const parcelId of getDifference(this.savedParcelIds, viewedParcelIds)) {
      let parcel = this.parcels.get(parcelId);
      if (parcel.reward == 1) {
        this.parcels.delete(parcel.id);
        this.savedParcelIds.delete(parcelId);
        this.beliefSet.updateTile(parcel.x, parcel.y, TileStatus.Walkable);
      } else parcel.reward -= 1;
    }

    for (const parcel of this.parcels.values())
      this.beliefSet.updateTile(parcel.x, parcel.y, parcel.isVisible ? parcel.reward : TileStatus.Walkable);
    if (this.isVerbose) console.log(this.beliefSet.toString());
  }

  updateMe(id, name, x, y, score) {
    this.id = id;
    this.name = name;
    this.x = x;
    this.y = y;
    this.score = score;
    this.beliefSet.updateTile(x, y, TileStatus.Player);
  }
}

export default IntentionPlanner;
