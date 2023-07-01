import { roundCoordinates } from './utils.js';

export class Agent {
  constructor(
    public id: string,
    public name: string,
    public x: number,
    public y: number,
    public score: number,
    public isVisible = true
  ) {}

  update(x: number, y: number, score: number, isVisible: boolean) {
    this.x = x;
    this.y = y;
    this.score = score;
    this.isVisible = isVisible;
  }

  perceived(agent: any, isVisible: boolean) {
    const rc = roundCoordinates(agent.x, agent.y);
    this.update(rc.roundX, rc.roundY, agent.score, isVisible);
  }
}

export class Agents {
  private agents = new Map<string, Agent>();

  senseAgents(agents: Agent[], externalPerception: boolean) {
    const viewedAgentIds = new Set<string>();

    for (const agent of agents) {
      viewedAgentIds.add(agent.id);
      if (!this.agents.has(agent.id)) {
        this.agents.set(agent.id, new Agent(agent.id, agent.name, agent.x, agent.y, agent.score, !externalPerception));
      } else {
        const isVisible = externalPerception ? this.agents.get(agent.id).isVisible : true;
        this.agents.get(agent.id).perceived(agent, isVisible);
      }
    }

    if (!externalPerception)
      for (const agentId of this.agents.keys()) {
        if (!viewedAgentIds.has(agentId)) {
          this.agents.get(agentId).isVisible = false;
        }
      }
  }

  print() {
    console.log(this.agents);
  }
}
