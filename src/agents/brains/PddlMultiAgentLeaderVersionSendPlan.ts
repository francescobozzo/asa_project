import { DeliverooApi } from '@unitn-asa/deliveroo-js-client';
import log from 'loglevel';
import { Agent } from '../../belief-sets/agent.js';
import { Parcel } from '../../belief-sets/parcel.js';
import { getPlan, moveAction, pickupAction } from '../../belief-sets/pddl.js';
import Tile from '../../belief-sets/tile.js';
import { Action, ManhattanDistanceFromYX, computeActionFromYX, pddlToyx, yxToPddl } from '../../belief-sets/utils.js';
import PddlAction from '../../pddl-client/PddlAction.js';
import PddlDomain from '../../pddl-client/PddlDomain.js';
import PddlPredicate from '../../pddl-client/PddlPredicate.js';
import PddlProblem from '../../pddl-client/PddlProblem.js';
import IBrain from './IBrain.js';

export default class PddlMultiAgentLeaderVersionSendPlan implements IBrain {
  private plans = new Map<string, Action[]>();
  private meId: string;
  private isProbabilistic: boolean;
  private cumulativeCarriedPenaltyfactor: number;
  private isComputing: boolean = false;
  private parcelsToPick: Parcel[] = [];
  private isActionInProgress: boolean = false;
  private consecutiveFailedActions: number = 0;
  private isTakeAction: boolean = false;
  private actionErrorPatience: number;

  constructor(
    meId: string,
    isProbabilistic: boolean,
    cumulativeCarriedPenaltyfactor: number,
    isTakeAction: boolean,
    actionErrorPatience: number
  ) {
    this.meId = meId;
    this.isProbabilistic = isProbabilistic;
    this.cumulativeCarriedPenaltyfactor = cumulativeCarriedPenaltyfactor;
    this.isTakeAction = isTakeAction;
    this.actionErrorPatience = actionErrorPatience;
  }

  computeDesires(
    startX: number,
    startY: number,
    parcels: Parcel[],
    parcelsToAvoidIds: Set<string>,
    agents: Agent[],
    deliveryStations: Tile[],
    distanceCache: Map<string, number>,
    playerSpeedEstimation: number,
    parcelDecayEstimation: number
  ) {
    if (this.isComputing) return false;

    this.parcelsToPick = [];
    class ParcelPotentialScore {
      constructor(public parcel: Parcel, public potentialScore: number) {}
    }

    const parcelsPotentialScoresToPick = parcels
      .map((parcel) => {
        const score = this.potentialScore(
          startX,
          startY,
          parcel.x,
          parcel.y,
          parcels,
          deliveryStations,
          distanceCache,
          playerSpeedEstimation,
          parcelDecayEstimation
        );
        const probabilisticPenalty = this.isProbabilistic
          ? this.probabilisticPenalty(startX, startY, parcel, agents)
          : 0;
        return new ParcelPotentialScore(parcel, score - probabilisticPenalty);
      })
      .filter((pp) => pp.potentialScore > 0)
      .sort((pp1, pp2) => pp2.potentialScore - pp1.potentialScore);

    let cumulativePotentialScore = 0;
    for (const pp of parcelsPotentialScoresToPick) {
      const realValue = pp.potentialScore - this.cumulativeCarriedPenaltyfactor * cumulativePotentialScore;
      if (realValue > 0 && !parcelsToAvoidIds.has(pp.parcel.id)) {
        cumulativePotentialScore += pp.potentialScore;
        this.parcelsToPick.push(pp.parcel);
      }
    }
  }

  computePlan(
    startX: number,
    startY: number,
    agentId: string,
    pddlProblem: PddlProblem,
    randomValidTile: Tile,
    distanceCache: Map<string, number>
  ) {
    if (this.isComputing) return [];
    this.isComputing = true;

    const pddlDomain = new PddlDomain(
      'deliveroo',
      [],
      [
        new PddlPredicate('at', ['?fr']),
        new PddlPredicate('can-move', ['?fr', '?to']),
        new PddlPredicate('parcel', ['?position']),
        new PddlPredicate('delivery', ['?position']),
        new PddlPredicate('carrying', ['?position']),
        new PddlPredicate('delivered', []),
      ],
      [moveAction, pickupAction]
    );

    pddlDomain.addAction(this.buildPDDLPutdownAction(this.parcelsToPick));
    let goal = '(and (delivered))';
    if (this.parcelsToPick.length === 0) goal = `(and (at ${yxToPddl(randomValidTile.y, randomValidTile.x)}))`;

    pddlProblem.addInitCondition(`at ${yxToPddl(startY, startX)}`);

    for (const parcel of this.parcelsToPick) {
      pddlProblem.addInitCondition(`parcel ${yxToPddl(parcel.y, parcel.x)}`);
    }

    pddlProblem.setGoal(goal);

    // const oldConsoleLogFunction = console.log;
    // console.log = (...args) => {};
    getPlan(pddlDomain, pddlProblem)
      .then((newPddlPlan) => {
        const plan: Action[] = [];
        let i = 0;
        let firstTile = newPddlPlan.length > 0 ? newPddlPlan[0].args[0] : undefined;
        for (const step of newPddlPlan) {
          // TODO: handle parallel operations
          if (step.action === 'move') {
            const fromTile = pddlToyx(step.args[0]);
            const toTile = pddlToyx(step.args[1]);
            plan.push(computeActionFromYX(fromTile[1], fromTile[0], toTile[1], toTile[0]));
            i += 1;
            const keyDistanceCache = firstTile + step.args[1];
            if (!distanceCache.has(keyDistanceCache) || i < distanceCache.get(keyDistanceCache)) {
              distanceCache.set(keyDistanceCache, i);
              distanceCache.set(step.args[1] + firstTile, i);
            }
          } else if (step.action === 'pickup') {
            plan.push(Action.PICKUP);
          } else if (step.action === 'putdown') {
            plan.push(Action.PUTDOWN);
          }
        }
        this.plans.set(agentId, plan);
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

  async takeAction(
    client: DeliverooApi,
    leaderId: string,
    startX: number,
    startY: number,
    parcels: Parcel[],
    parcelsToAvoidIds: Set<string>,
    agents: Agent[],
    deliveryStations: Tile[],
    randomValidTile: Tile,
    distanceCache: Map<string, number>,
    playerSpeedEstimation: number,
    parcelDecayEstimation: number,
    pddlProblem: PddlProblem
  ) {
    let isPutdownDone = false;
    if (this.isTakeAction && !this.isActionInProgress) {
      const plan = this.plans.get(this.meId);
      this.isActionInProgress = true;
      const amITheLeader = leaderId === this.meId;
      const isPlanFailed = this.consecutiveFailedActions >= this.actionErrorPatience;
      const noPlanOrEmptyPlan = !plan || (plan && plan.length == 0);

      if (leaderId && amITheLeader && !this.isComputing && (isPlanFailed || noPlanOrEmptyPlan)) {
        this.computeDesires(
          startX,
          startY,
          parcels,
          parcelsToAvoidIds,
          agents,
          deliveryStations,
          distanceCache,
          playerSpeedEstimation,
          parcelDecayEstimation
        );
        this.computePlan(startX, startY, this.meId, pddlProblem, randomValidTile, distanceCache);
        this.consecutiveFailedActions = 0;
      } else if (!this.isComputing && (isPlanFailed || noPlanOrEmptyPlan)) {
        this.setPlan([]);
      }

      const move = plan && plan.length > 0 ? plan[0] : Action.UNDEFINED;

      let result = null;
      switch (move) {
        case Action.UNDEFINED:
          break;
        case Action.PICKUP:
          log.info(`INFO : ${move} action taken`);
          result = await client.pickup();
          if (result.length >= 0) {
            plan.shift();
            this.consecutiveFailedActions = 0;
          } else this.consecutiveFailedActions += 1;
          break;
        case Action.PUTDOWN:
          log.info(`INFO : ${move} action taken`);
          result = await client.putdown();
          if (result.length >= 0) {
            plan.shift();
            this.consecutiveFailedActions = 0;
            isPutdownDone = true;
          } else this.consecutiveFailedActions += 1;
          break;
        default:
          log.info(`INFO : ${move} action taken`);
          result = await client.move(move.toString());
          if (result !== false) {
            plan.shift();
            this.consecutiveFailedActions = 0;
          } else this.consecutiveFailedActions += 1;
          break;
      }
      this.isActionInProgress = false;
    }

    return isPutdownDone ? this.parcelsToPick : [];
  }

  setPlan(plan: Action[]) {
    this.plans.set(this.meId, plan);
    return plan;
  }

  getPlan(agentId: string) {
    return this.plans.has(agentId) ? this.plans.get(agentId) : [];
  }

  private buildPDDLPutdownAction(parcels: Parcel[]) {
    const parcelPDDLTiles = parcels.map((p) => `(carrying ${yxToPddl(p.y, p.x)})`);
    return new PddlAction(
      'putdown',
      ['?position'],
      `(and (at ?position) (delivery ?position)${parcels.length > 0 ? ' ' + parcelPDDLTiles.join(' ') : ''})`,
      '(and (delivered))'
    );
  }

  private potentialScore(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    parcels: Parcel[],
    deliveryStations: Tile[],
    distanceCache: Map<string, number>,
    playerSpeedEstimation: number,
    parcelDecayEstimation: number
  ): number {
    const keyDistanceCache = yxToPddl(startY, startX) + yxToPddl(endY, endX);
    let minimumDistance = ManhattanDistanceFromYX(endX, endY, deliveryStations[0].x, deliveryStations[0].y);
    for (const deliveryZone of deliveryStations) {
      const keyDeliveryZoneCache = yxToPddl(endY, endX) + yxToPddl(deliveryZone.y, deliveryZone.x);
      const currentDistance =
        distanceCache.get(keyDeliveryZoneCache) ?? ManhattanDistanceFromYX(endX, endY, deliveryZone.x, deliveryZone.y);
      if (currentDistance < minimumDistance) {
        minimumDistance = currentDistance;
      }
    }

    const parcelsReward = Array.from(parcels.values())
      .filter((parcel) => parcel.x === endX && parcel.y === endY && parcel.carriedBy == null)
      .reduce((sum, current) => sum + current.reward, 0);

    return (
      parcelsReward -
      this.computeParcelLossEstimation(
        distanceCache.get(keyDistanceCache) ?? ManhattanDistanceFromYX(startX, startY, endX, endY),
        playerSpeedEstimation,
        parcelDecayEstimation
      ) -
      this.computeParcelLossEstimation(minimumDistance, playerSpeedEstimation, parcelDecayEstimation)
    );
  }

  private computeParcelLossEstimation(distance: number, playerSpeedEstimation: number, parcelDecayEstimation: number) {
    const playerSpeedParcelCoefficient = playerSpeedEstimation / parcelDecayEstimation;
    return distance * playerSpeedParcelCoefficient;
  }

  private probabilisticPenalty(startX: number, endX: number, parcel: Parcel, agents: Agent[]): number {
    const agentDistances = new Map<Agent, number>();
    const agentProbabilities = new Map<Agent, number>();
    let maxDistance = ManhattanDistanceFromYX(startX, endX, parcel.x, parcel.y);
    for (const agent of agents) {
      if (agent.isVisible) {
        const distance = ManhattanDistanceFromYX(parcel.x, parcel.y, agent.x, agent.y);
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
}
