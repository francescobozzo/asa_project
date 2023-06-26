import { DeliverooApi } from '@unitn-asa/deliveroo-js-client';
import { PddlAction } from '@unitn-asa/pddl-client';
import log from 'loglevel';
import Agent from '../belief-sets/agent.js';
import Parcel from '../belief-sets/parcel.js';
import { getPlan } from '../belief-sets/pddl.js';
import { Action, ManhattanDistance, computeAction } from '../belief-sets/utils.js';
import AbstractIntentionPlanner from './abstract-intention-planner.js';
import { PDDLPlanPlanner, Planner } from '../belief-sets/pddl-planner.js';
import Tile from '../belief-sets/tile.js';
import { kMaxLength } from 'buffer';
import { trace } from 'console';

class PddlIntentionPlanner extends AbstractIntentionPlanner {
  private isComputing: boolean = false;
  private agentToPlanTiles = new Map<string, Tile[]>();

  constructor(
    mainPlayerSpeedLR: number,
    cumulatedCarriedPenaltyFactor: number,
    useProbabilisticModel: boolean,
    useTrafficModel: boolean,
    isMultiAgentLeaderVersion: boolean,
    client: DeliverooApi
  ) {
    super(
      mainPlayerSpeedLR,
      cumulatedCarriedPenaltyFactor,
      useProbabilisticModel,
      useTrafficModel,
      isMultiAgentLeaderVersion,
      client
    );
  }

  async getPlanFromPlanner(agentId: string) {
    const agent = this.beliefSet.getAgents().get(agentId);
    const pddlProblemContext = this.beliefSet.toPddlDomain(agent);
    if (this.agentToPlanTiles.has(agentId)) {
      this.decreaseTrafficMap(this.agentToPlanTiles.get(agentId));
    }

    const parcels = this.beliefSet
      .getVisibleParcels()
      .concat(this.beliefSet.getNotVisibleParcels())
      .filter((parcel) => !this.beliefSet.parcelsToAvoidIds.has(parcel.id));
    const planPlanner = this.agentToPlanner
      .get(agentId)
      .compute(
        pddlProblemContext,
        parcels,
        Array.from(this.beliefSet.getAgents().values()),
        this.mainPlayerSpeedEstimation,
        this.beliefSet.getParcelsDecayEstimation(),
        this.beliefSet.getRandomValidTile(),
        this.trafficMap
      );
    try {
      this.agentToPlanTiles.set(agentId, []);
      const newPddlPlan = await planPlanner.getPlan;
      const plan: Action[] = [];
      let isFirstTile = true;
      let i = 0;
      if (!newPddlPlan) return [];
      let firstTile = newPddlPlan.length > 0 ? newPddlPlan[0].args[0] : undefined;
      for (const step of newPddlPlan) {
        // TODO: handle parallel operations
        if (step.action === 'move') {
          const fromTile = this.beliefSet.pddlToTile(step.args[0]);
          const toTile = this.beliefSet.pddlToTile(step.args[1]);
          if (isFirstTile) {
            this.trafficMap[fromTile.x][fromTile.y] += 1;
            isFirstTile = false;
            this.agentToPlanTiles.get(agentId).push(fromTile);
          }
          this.trafficMap[toTile.x][toTile.y] += 1;
          this.agentToPlanTiles.get(agentId).push(toTile);
          plan.push(computeAction(fromTile, toTile));
          i += 1;
          const keyDistanceCache = firstTile + step.args[1];
          if (!this.distanceCache.has(keyDistanceCache) || i < this.distanceCache.get(keyDistanceCache)) {
            this.distanceCache.set(keyDistanceCache, i);
            this.distanceCache.set(step.args[1] + firstTile, i);
          }
        } else if (step.action === 'pickup') {
          plan.push(Action.PICKUP);
        } else if (step.action === 'putdown') {
          plan.push(Action.PUTDOWN);
        }
      }
      for (const p of planPlanner.parcels) {
        this.beliefSet.parcelsToAvoidIds.add(p.id);
      }
      return plan;
    } catch (error) {
      log.error(`DEBUG: Couldn't generate a new pddl plan for agent ${agentId} \n`, error);
    }
    return [];
  }

  decreaseTrafficMap(planTiles: Tile[]) {
    for (const tile of planTiles) this.trafficMap[tile.x][tile.y] -= 1;
  }

  private buildPDDLPutdownAction(parcels: Parcel[]) {
    const parcelPDDLTiles = parcels.map(
      (p) => `(carrying ${this.beliefSet.tileToPddl(this.beliefSet.getTile(p.x, p.y))})`
    );
    return new PddlAction(
      'putdown',
      '?position',
      `and (at ?position) (delivery ?position)${parcels.length > 0 ? ' ' + parcelPDDLTiles.join(' ') : ''}`,
      'and (delivered)',
      async (position) => console.log('exec putdown parcel', position)
    );
  }

  protected isTimeForANewPlan(): boolean {
    if (this.isComputing) {
      return false;
    }

    this.parcelsToPick = [];
    class ParcelPotentialScore {
      constructor(public parcel: Parcel, public potentialScore: number) {}
    }

    const parcelsPotentialScoresToPick = this.beliefSet
      .getVisibleParcels()
      .concat(this.beliefSet.getNotVisibleParcels())
      .map((parcel) => {
        const score = this.potentialScore(this.x, this.y, parcel.x, parcel.y);
        const probabilisticPenalty = this.useProbabilisticModel ? this.probabilisticPenalty(this.x, this.y, parcel) : 0;
        const trafficPenalty = this.useTrafficModel ? this.trafficPenalty(parcel) : 0;
        return new ParcelPotentialScore(parcel, score - probabilisticPenalty - trafficPenalty);
      })
      .filter((pp) => pp.potentialScore > 0)
      .sort((pp1, pp2) => pp2.potentialScore - pp1.potentialScore);

    let cumulativePotentialScore = 0;
    for (const pp of parcelsPotentialScoresToPick) {
      const realValue = pp.potentialScore - this.cumulatedCarriedPenaltyFactor * cumulativePotentialScore;
      if (realValue > 0 && !this.beliefSet.parcelsToAvoidIds.has(pp.parcel.id)) {
        cumulativePotentialScore += pp.potentialScore;
        this.parcelsToPick.push(pp.parcel);
      }
    }

    const isExploring = this.plan.length === 0 ? false : this.plan[this.plan.length - 1] !== Action.PUTDOWN;
    return (isExploring && this.parcelsToPick.length > 0) || this.plan.length === 0;
  }

  computeNewPlan() {
    if (this.isComputing) {
      return [];
    }
    this.isComputing = true;

    const pddlProblemContext = this.beliefSet.toPddlDomain(undefined);
    pddlProblemContext.actions.push(this.buildPDDLPutdownAction(this.parcelsToPick));
    let goal = 'and (delivered)';
    if (this.parcelsToPick.length === 0)
      goal = `and (at ${this.beliefSet.tileToPddl(this.beliefSet.getRandomValidTile())})`;

    pddlProblemContext.predicates.push(`(at ${this.beliefSet.tileToPddl(this.beliefSet.getTile(this.x, this.y))})`);

    for (const parcel of this.parcelsToPick) {
      pddlProblemContext.predicates.push(
        `(parcel ${this.beliefSet.tileToPddl(this.beliefSet.getTile(parcel.x, parcel.y))})`
      );
    }

    // const oldConsoleLogFunction = console.log;
    // console.log = (...args) => {};
    getPlan(pddlProblemContext, goal)
      .then((newPddlPlan) => {
        const plan: Action[] = [];
        let isFirstTile = true;
        let i = 0;
        let firstTile = newPddlPlan.length > 0 ? newPddlPlan[0].args[0] : undefined;
        for (const step of newPddlPlan) {
          // TODO: handle parallel operations
          if (step.action === 'move') {
            const fromTile = this.beliefSet.pddlToTile(step.args[0]);
            const toTile = this.beliefSet.pddlToTile(step.args[1]);
            if (isFirstTile) {
              this.trafficMap[fromTile.x][fromTile.y] += 1;
              isFirstTile = false;
            }
            this.trafficMap[toTile.x][toTile.y] += 1;
            plan.push(computeAction(fromTile, toTile));
            i += 1;
            const keyDistanceCache = firstTile + step.args[1];
            if (!this.distanceCache.has(keyDistanceCache) || i < this.distanceCache.get(keyDistanceCache)) {
              this.distanceCache.set(keyDistanceCache, i);
              this.distanceCache.set(step.args[1] + firstTile, i);
            }
          } else if (step.action === 'pickup') {
            plan.push(Action.PICKUP);
          } else if (step.action === 'putdown') {
            plan.push(Action.PUTDOWN);
          }
        }
        this.plan = plan;
      })
      .catch((error) => {
        log.debug("DEBUG: Couldn't generate a new pddl plan\n", error);
      })
      .finally(() => {
        this.isComputing = false;
      });
    // console.log = oldConsoleLogFunction;

    return this.parcelsToPick;
  }

  potentialScore(startX: number, startY: number, endX: number, endY: number): number {
    const keyDistanceCache =
      this.beliefSet.tileToPddl(this.beliefSet.getTile(startX, startY)) +
      this.beliefSet.tileToPddl(this.beliefSet.getTile(endX, endY));
    let minimumDistance = ManhattanDistance(this.beliefSet.getTile(endX, endY), this.beliefSet.deliveryStations[0]);
    for (const deliveryZone of this.beliefSet.deliveryStations) {
      const keyDeliveryZoneCache =
        this.beliefSet.tileToPddl(this.beliefSet.getTile(endX, endY)) +
        this.beliefSet.tileToPddl(this.beliefSet.getTile(deliveryZone.x, deliveryZone.y));
      const currentDistance =
        this.distanceCache.get(keyDeliveryZoneCache) ??
        ManhattanDistance(this.beliefSet.getTile(endX, endY), deliveryZone);
      if (currentDistance < minimumDistance) {
        minimumDistance = currentDistance;
      }
    }

    const parcelsReward = Array.from(this.beliefSet.parcels.values())
      .filter((parcel) => parcel.x === endX && parcel.y === endY && parcel.carriedBy == null)
      .reduce((sum, current) => sum + current.reward, 0);

    return (
      parcelsReward -
      this.computeParcelLossEstimation(
        this.distanceCache.get(keyDistanceCache) ??
          ManhattanDistance(this.beliefSet.getTile(startX, startY), this.beliefSet.getTile(endX, endY))
      ) -
      this.computeParcelLossEstimation(minimumDistance)
    );
  }

  private probabilisticPenalty(startX: number, endX: number, parcel: Parcel): number {
    const agentDistances = new Map<Agent, number>();
    const agentProbabilities = new Map<Agent, number>();
    let maxDistance = ManhattanDistance(
      this.beliefSet.getTile(startX, endX),
      this.beliefSet.getTile(parcel.x, parcel.y)
    );
    for (const agent of this.beliefSet.getAgents().values()) {
      if (agent.isVisible) {
        const distance = ManhattanDistance(
          this.beliefSet.getTile(parcel.x, parcel.y),
          this.beliefSet.getTile(agent.x, agent.y)
        );
        agentDistances.set(agent, distance);
        maxDistance = maxDistance > distance ? maxDistance : distance;
      }
    }

    let probability = 0;
    for (const [agent, distance] of agentDistances) {
      agentProbabilities.set(agent, (maxDistance - distance) / maxDistance);
      probability += (maxDistance - distance) / maxDistance;
    }
    probability /= agentDistances.size;
    return parcel.reward * probability;
  }

  private trafficPenalty(parcel: Parcel): number {
    const x = parcel.x;
    const y = parcel.y;
    let maxTraffic = 0.01;

    for (let i = 0; i < this.trafficMap.length; i++) {
      for (let j = 0; j < this.trafficMap[i].length; j++) maxTraffic = Math.max(maxTraffic, this.trafficMap[i][j]);
    }
    let traffic = 0;
    const neighbours = this.beliefSet.getNeighbors(this.beliefSet.getTile(x, y));
    for (const neigh of neighbours) {
      traffic += this.trafficMap[neigh.x][neigh.y];
    }
    traffic /= neighbours.length;
    const trafficProbability = Math.min(traffic / maxTraffic, 1);
    return 2 * parcel.reward * trafficProbability;
  }
}

export default PddlIntentionPlanner;
