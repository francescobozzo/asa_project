import log from 'loglevel';
import Agent from './agent.js';
import Parcel from './parcel.js';
import { PDDLProblemContext, getPlan } from './pddl.js';
import Tile from './tile.js';
import { Action, ManhattanDistanceFromYX, computeAction, computeActionFromYX, pddlToyx, yxToPddl } from './utils.js';
import { PddlAction } from '@unitn-asa/pddl-client';

export class Planner {
  private agent: Agent;
  private useProbabilisticModel: boolean = false;
  private distanceCache: Map<string, number>;
  private deliveryStations: Tile[];
  private cumulatedCarriedPenaltyFactor: number;

  constructor(
    agent: Agent,
    useProbabilisticModel: boolean,
    distanceCache: Map<string, number>,
    deliveryStations: Tile[],
    cumulatedCarriedPenaltyFactor: number
  ) {
    this.agent = agent;
    this.useProbabilisticModel = useProbabilisticModel;
    this.distanceCache = distanceCache;
    this.deliveryStations = deliveryStations;
    this.cumulatedCarriedPenaltyFactor = cumulatedCarriedPenaltyFactor;
  }

  compute(
    pddlProblemContext: PDDLProblemContext,
    parcels: Parcel[],
    agents: Agent[],
    playerSpeedEstimation: number,
    parcelsDecayEstimation: number,
    tileForRandomMovement: Tile
  ): PDDLPlanPlanner {
    const parcelsToPick = this.computeParcelsToPick(parcels, agents, playerSpeedEstimation, parcelsDecayEstimation);
    let planToReturn: Action[] = [];

    pddlProblemContext.actions.push(this.buildPDDLPutdownAction(parcelsToPick));
    let goal = 'and (delivered)';
    if (parcelsToPick.length === 0) goal = `and (at ${yxToPddl(tileForRandomMovement.y, tileForRandomMovement.x)})`;

    pddlProblemContext.predicates.push(`(at ${yxToPddl(this.agent.y, this.agent.x)})`);

    for (const parcel of parcelsToPick) {
      pddlProblemContext.predicates.push(`(parcel ${yxToPddl(parcel.y, parcel.x)})`);
    }

    return new PDDLPlanPlanner(getPlan(pddlProblemContext, goal), parcelsToPick);
  }

  private computeParcelsToPick(
    parcels: Parcel[],
    agents: Agent[],
    playerSpeedEstimation: number,
    parcelsDecayEstimation: number
  ): Parcel[] {
    const parcelsToPick: Parcel[] = [];

    class ParcelPotentialScore {
      constructor(public parcel: Parcel, public potentialScore: number) {}
    }

    const parcelsPotentialScoresToPick = parcels
      .map(
        (parcel) =>
          new ParcelPotentialScore(
            parcel,
            this.useProbabilisticModel
              ? this.potentialScore(
                  parcels,
                  this.agent.x,
                  this.agent.y,
                  parcel.x,
                  parcel.y,
                  playerSpeedEstimation,
                  parcelsDecayEstimation
                )
              : this.potentialScore(
                  parcels,
                  this.agent.x,
                  this.agent.y,
                  parcel.x,
                  parcel.y,
                  playerSpeedEstimation,
                  parcelsDecayEstimation
                ) - this.probabilisticPenalty(this.agent.x, this.agent.y, parcel, agents)
          )
      )
      .filter((pp) => pp.potentialScore > 0)
      .sort((pp1, pp2) => pp2.potentialScore - pp1.potentialScore);

    let cumulativePotentialScore = 0;
    for (const pp of parcelsPotentialScoresToPick) {
      const realValue = pp.potentialScore - this.cumulatedCarriedPenaltyFactor * cumulativePotentialScore;
      if (realValue > 0) {
        cumulativePotentialScore += pp.potentialScore;
        parcelsToPick.push(pp.parcel);
      }
    }

    return parcelsToPick;
  }

  private buildPDDLPutdownAction(parcels: Parcel[]): string {
    const parcelPDDLTiles = parcels.map((p) => `(carrying ${yxToPddl(p.y, p.x)})`);
    return new PddlAction(
      'putdown',
      '?position',
      `and (at ?position) (delivery ?position)${parcels.length > 0 ? ' ' + parcelPDDLTiles.join(' ') : ''}`,
      'and (delivered)',
      async (position) => console.log('exec putdown parcel', position)
    );
  }

  private potentialScore(
    parcels: Parcel[],
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    playerSpeedEstimation: number,
    parcelsDecayEstimation: number
  ): number {
    const keyDistanceCache = yxToPddl(startY, startX) + yxToPddl(endY, endX);
    let minimumDistance = ManhattanDistanceFromYX(endX, endY, this.deliveryStations[0].x, this.deliveryStations[0].y);
    for (const deliveryZone of this.deliveryStations) {
      const keyDeliveryZoneCache = yxToPddl(endY, endX) + yxToPddl(deliveryZone.y, deliveryZone.x);
      const currentDistance =
        this.distanceCache.get(keyDeliveryZoneCache) ??
        ManhattanDistanceFromYX(endX, endY, deliveryZone.x, deliveryZone.y);
      if (currentDistance < minimumDistance) {
        minimumDistance = currentDistance;
      }
    }

    const parcelsReward = Array.from(parcels.values())
      .filter((parcel) => parcel.x === endX && parcel.y === endY && parcel.carriedBy == null)
      .reduce((sum, current) => sum + current.reward, 0);

    return (
      parcelsReward -
      this.parcelLossEstimation(
        this.distanceCache.get(keyDistanceCache) ?? ManhattanDistanceFromYX(startX, startY, endX, endY),
        playerSpeedEstimation,
        parcelsDecayEstimation
      ) -
      this.parcelLossEstimation(minimumDistance, playerSpeedEstimation, parcelsDecayEstimation)
    );
  }

  private parcelLossEstimation(distance: number, playerSpeedEstimation: number, parcelsDecayEstimation: number) {
    const playerSpeedParcelCoefficient = playerSpeedEstimation / parcelsDecayEstimation;
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

export class PDDLPlanPlanner {
  constructor(public getPlan: Promise<any>, public parcels: Parcel[]) {}
}
