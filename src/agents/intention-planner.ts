import log from 'loglevel';
import Agent from '../belief-sets/agent.js';
import DeliverooMap from '../belief-sets/matrix-map.js';
import Parcel from '../belief-sets/parcel.js';
import Tile from '../belief-sets/tile.js';
import { Action } from '../belief-sets/utils.js';

function setDifference<T>(setA: Set<T>, setB: Set<T>): Set<T> {
  return new Set([...setA].filter((element) => !setB.has(element)));
}

function randomElementFromArray(array) {
  return array[Math.floor(Math.random() * array.length)];
}

enum GoalType {
  PARCEL = 0,
  DELIVERY_AREA = 1,
  TILE = 2,
}

class Goal {
  constructor(public tile: Tile, public type: GoalType, public id: string) {}
}

class IntentionPlanner {
  private id: string;
  private name: string;
  private x: number;
  private y: number;
  private score: number;
  public beliefSet: DeliverooMap;
  private agents = new Map<string, Agent>();
  private agentIds = new Set<string>();
  private parcels = new Map<string, Parcel>();
  private parcelIds = new Set<string>();
  public deliveryStations: Tile[] = [];
  private goal: Goal;

  constructor() {}

  agentsSensingHandler(agents: any) {
    log.info(`INFO : main player perceived ${agents.length} agents`);
    let currentAgentIds = new Set<string>();
    for (const agent of agents) {
      currentAgentIds.add(agent.id);
      this.agentIds.add(agent.id);
      if (this.agents.has(agent.id)) {
        let agentToUpdate = this.agents.get(agent.id);
        this.beliefSet.freeTile(agentToUpdate.x, agentToUpdate.y);
        this.beliefSet.occupyTile(agent.x, agent.y, false);
        agentToUpdate.update(agent.x, agent.y, agent.score, true);
      } else this.agents.set(agent.id, new Agent(agent.id, agent.name, agent.x, agent.y, agent.score));
    }
    for (const agentId of setDifference(this.agentIds, currentAgentIds)) this.agents.get(agentId).isVisible = false;
    for (const agent of this.agents.values())
      if (agent.isVisible) this.beliefSet.occupyTile(agent.x, agent.y, false);
      else this.beliefSet.freeTile(agent.x, agent.y);
  }

  parcelSensingHandler(parcels: any) {
    log.info(`INFO : main player perceived ${parcels.length} parcels`);
    let currentParcelIds = new Set<string>();
    for (const parcel of parcels) {
      currentParcelIds.add(parcel.id);
      this.parcelIds.add(parcel.id);
      if (this.parcels.has(parcel.id)) {
        let parcelToUpdate = this.parcels.get(parcel.id);
        this.beliefSet.removeTileValue(parcelToUpdate.x, parcelToUpdate.y, parcelToUpdate.reward);
        parcelToUpdate.update(parcel.x, parcel.y, parcel.carriedBy, parcel.reward, true);
        this.beliefSet.addTileValue(parcelToUpdate.x, parcelToUpdate.y, parcelToUpdate.reward);
      } else this.parcels.set(parcel.id, new Parcel(parcel.id, parcel.x, parcel.y, parcel.carriedBy, parcel.reward));
    }
    for (const parcelId of setDifference(this.parcelIds, currentParcelIds)) {
      let parcel = this.parcels.get(parcelId);
      if (parcel.reward === 1) {
        this.parcels.delete(parcel.id);
        this.parcelIds.delete(parcelId);
        this.beliefSet.freeTile(parcel.x, parcel.y);
      } else {
        parcel.reward -= 1;
        parcel.isVisible = false;
      }
      this.beliefSet.removeTileValue(parcel.x, parcel.y, parcel.reward);
    }

    if (!this.goal || this.goal.type === GoalType.TILE) {
      for (let i = 0; i < parcels.length; i++)
        if (parcels[i].carriedBy === null)
          this.goal = new Goal(this.beliefSet.getTile(parcels[i].x, parcels[i].y), GoalType.PARCEL, parcels[i].id);
      if (!this.goal) {
        this.goal = new Goal(this.beliefSet.getRandomValidTile(), GoalType.TILE, 'exploration');
      }
    } else if (
      !this.goal &&
      this.goal.type === GoalType.PARCEL &&
      (!this.parcels.get(this.goal.id) || this.parcels.get(this.goal.id).carriedBy === this.id)
    )
      this.goal = null;
  }

  updateMe(id: string, name: string, x: number, y: number, score: number) {
    log.info(`INFO : update main player position ${x} ${y}`);
    if (this.x && this.y) this.beliefSet.freeTile(this.x, this.y);
    this.id = id;
    this.name = name;
    this.x = x;
    this.y = y;
    this.score = score;
    this.beliefSet.occupyTile(this.x, this.y, true);
  }

  private isGoalReached(): boolean {
    return this.x === this.goal.tile.x && this.y === this.goal.tile.y;
  }

  getNextAction(): Action {
    if (
      this.goal &&
      this.goal.type === GoalType.PARCEL &&
      (!this.parcels.get(this.goal.id) ||
        (this.parcels.get(this.goal.id).carriedBy && this.parcels.get(this.goal.id).carriedBy !== this.id))
    ) {
      this.goal = null;
      log.info('INFO : parcel goal no more available, setting it to null');
    }
    if (Number.isInteger(this.x) && Number.isInteger(this.y) && this.goal) {
      if (this.isGoalReached() && this.goal.type === GoalType.PARCEL) {
        this.goal = null;
        return Action.PICKUP;
      } else if (this.isGoalReached() && this.goal.type === GoalType.DELIVERY_AREA) {
        this.goal = null;
        return Action.PUTDOWN;
      } else if (this.isGoalReached() && this.goal.type === GoalType.TILE) {
        this.goal = null;
        return Action.UNDEFINED;
      }
      const cameFrom = this.beliefSet.shortestPathFromTo(this.x, this.y, this.goal.tile.x, this.goal.tile.y);

      let move = Action.UNDEFINED;
      const states = [];
      let currentMovement = cameFrom.get(this.goal.tile);
      while (
        currentMovement &&
        currentMovement.tile &&
        currentMovement.move !== Action.UNDEFINED
        // !currentMovement.tile.isEqual(this.beliefSet.getTile(this.x, this.y))
      ) {
        move = currentMovement.move;

        let actionLog = `with ${currentMovement.move} from ${currentMovement.tile.x},${currentMovement.tile.y} to`;
        currentMovement = cameFrom.get(currentMovement.tile);
        if (currentMovement.move === Action.UNDEFINED) break;

        actionLog += `to ${currentMovement.tile.x},${currentMovement.tile.y} with ${currentMovement.move}`;
        states.push(actionLog);
      }

      return move;
    }
    return Action.UNDEFINED;
  }
}

export default IntentionPlanner;
