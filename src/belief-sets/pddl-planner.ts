import PddlAction from '../pddl-client/PddlAction.js';
import PddlDomain from '../pddl-client/PddlDomain.js';
import PddlProblem from '../pddl-client/PddlProblem.js';
import { Agent } from './agent.js';
import { Parcel } from './parcel.js';
import { getPlan } from './pddl.js';
import Tile from './tile.js';
import { ManhattanDistanceFromYX, yxToPddl } from './utils.js';

export class Planner {
  private agent: Agent;
  private useProbabilisticModel: boolean = false;
  private useTrafficModel: boolean = false;
  private distanceCache: Map<string, number>;
  private deliveryStations: Tile[];
  private cumulatedCarriedPenaltyFactor: number;

  constructor(
    agent: Agent,
    useProbabilisticModel: boolean,
    useTrafficModel: boolean,
    distanceCache: Map<string, number>,
    deliveryStations: Tile[],
    cumulatedCarriedPenaltyFactor: number
  ) {
    this.agent = agent;
    this.useProbabilisticModel = useProbabilisticModel;
    this.useTrafficModel = useTrafficModel;
    this.distanceCache = distanceCache;
    this.deliveryStations = deliveryStations;
    this.cumulatedCarriedPenaltyFactor = cumulatedCarriedPenaltyFactor;
  }

  compute(
    pdllDomain: PddlDomain,
    pddlProblem: PddlProblem,
    parcels: Parcel[],
    agents: Agent[],
    playerSpeedEstimation: number,
    parcelsDecayEstimation: number,
    tileForRandomMovement: Tile,
    trafficMap: number[][]
  ): PDDLPlanPlanner {
    const parcelsToPick = this.computeParcelsToPick(
      parcels,
      agents,
      playerSpeedEstimation,
      parcelsDecayEstimation,
      trafficMap
    );

    pdllDomain.addAction(this.buildPDDLPutdownAction(parcelsToPick));

    let goal = 'and (delivered)';
    if (parcelsToPick.length === 0) goal = `and (at ${yxToPddl(tileForRandomMovement.y, tileForRandomMovement.x)})`;

    pddlProblem.addInitCondition(`at ${yxToPddl(this.agent.y, this.agent.x)}`);

    for (const parcel of parcelsToPick) {
      pddlProblem.addInitCondition(`(parcel ${yxToPddl(parcel.y, parcel.x)})`);
    }

    return new PDDLPlanPlanner(getPlan(pdllDomain, pddlProblem), parcelsToPick);
  }

  private computeParcelsToPick(
    parcels: Parcel[],
    agents: Agent[],
    playerSpeedEstimation: number,
    parcelsDecayEstimation: number,
    trafficMap: number[][]
  ): Parcel[] {
    const parcelsToPick: Parcel[] = [];

    class ParcelPotentialScore {
      constructor(public parcel: Parcel, public potentialScore: number) {}
    }

    const parcelsPotentialScoresToPick = parcels
      .map((parcel) => {
        const score = this.potentialScore(
          parcels,
          this.agent.x,
          this.agent.y,
          parcel.x,
          parcel.y,
          playerSpeedEstimation,
          parcelsDecayEstimation
        );
        const probabilisticPenalty = this.useProbabilisticModel
          ? this.probabilisticPenalty(this.agent.x, this.agent.y, parcel, agents)
          : 0;
        const trafficPenalty = this.useTrafficModel ? this.trafficPenalty(parcel, trafficMap) : 0;
        return new ParcelPotentialScore(parcel, score - probabilisticPenalty - trafficPenalty);
      })
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

  private trafficPenalty(parcel: Parcel, trafficMap: number[][]): number {
    const x = parcel.x;
    const y = parcel.y;
    let maxTraffic = 0.01;

    for (let i = 0; i < trafficMap.length; i++) {
      for (let j = 0; j < trafficMap[i].length; j++) maxTraffic = Math.max(maxTraffic, trafficMap[i][j]);
    }
    let traffic = 0;
    const neighbours = this.getNeighboursFromTrafficMap(x, y, trafficMap);
    for (const neigh of neighbours) {
      const x = neigh[0];
      const y = neigh[1];
      traffic += trafficMap[x][y];
    }
    traffic /= neighbours.length;
    const trafficProbability = Math.min(traffic / maxTraffic, 1);
    return 2 * parcel.reward * trafficProbability;
  }

  private roundTileCoordinates(x: number, y: number) {
    if (Math.round(x * 10) % 10 === 4 || Math.round(y * 10) % 10 === 4) {
      return { roundX: Math.ceil(x), roundY: Math.ceil(y) };
    } else if (Math.round(x * 10) % 10 === 6 || Math.round(y * 10) % 10 === 6) {
      return { roundX: Math.floor(x), roundY: Math.floor(y) };
    }

    return { roundX: x, roundY: y };
  }

  private getNeighboursFromTrafficMap(x: number, y: number, trafficMap: number[][]) {
    const roundCoords = this.roundTileCoordinates(x, y);
    const roundX = roundCoords.roundX;
    const roundY = roundCoords.roundY;
    const neighbours = [];
    if (roundX > 0 && trafficMap[roundX - 1][roundY] > 0) neighbours.push([roundX - 1, roundY]);
    if (roundX < trafficMap.length - 1 && trafficMap[roundX + 1][roundY] > 0) neighbours.push([roundX + 1, roundY]);
    if (roundY > 0 && trafficMap[roundX][roundY - 1] > 0) neighbours.push([roundX, roundY - 1]);
    if (roundY < trafficMap.length - 1 && trafficMap[roundX][roundY + 1] > 0) neighbours.push([roundX, roundY + 1]);

    return neighbours;
  }
}

export class PDDLPlanPlanner {
  constructor(public getPlan: Promise<any>, public parcels: Parcel[]) {}
}
