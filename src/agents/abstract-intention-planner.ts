import { DeliverooApi } from '@unitn-asa/deliveroo-js-client';
import log from 'loglevel';
import DeliverooMap from '../belief-sets/matrix-map.js';
import { Parcel } from '../belief-sets/parcel.js';
import { Planner } from '../belief-sets/pddl-planner.js';
import Tile from '../belief-sets/tile.js';
import { Action, arrayAverage } from '../belief-sets/utils.js';
import MessageFactory from '../messages/MessageFactory.js';

export enum GoalType {
  PARCEL = 'parcel',
  DELIVERY_STATION = 'delivery_station',
  TILE = 'tile',
}

class Goal {
  constructor(public tile: Tile, public type: GoalType, public id: string) {}

  toString() {
    return `${this.type} ${this.id} x=${this.tile.x}, y=${this.tile.y}`;
  }
}

abstract class AbstractIntentionPlanner {
  protected id: string;
  private name: string;
  protected x: number = undefined;
  protected y: number = undefined;
  private score: number;
  protected carriedScore: number = 0;
  protected numCarriedParcels: number = 0;
  public beliefSet: DeliverooMap;
  protected goal: Goal;
  private modifiedAt: Date[] = [];
  private mainPlayerSpeedLR: number;
  protected mainPlayerSpeedEstimation: number = 0.1; // it corresponds to 0.1s
  protected plan: Action[] = [];
  protected distanceCache = new Map<string, number>();
  protected cumulatedCarriedPenaltyFactor: number;
  protected useProbabilisticModel: boolean = false;
  protected useTrafficModel: boolean = false;
  protected parcelsToPick: Parcel[] = [];
  protected isMultiAgentLeaderVersion: boolean;
  protected client: DeliverooApi;
  public leaderId: string;
  public isAskingForANewPlan = false;
  public agentToPlanner = new Map<string, Planner>();
  protected trafficMap: number[][] = [];

  constructor(
    mainPlayerSpeedLR: number,
    cumulatedCarriedPenaltyFactor: number,
    useProbabilisticModel: boolean,
    useTrafficModel: boolean,
    isMultiAgentLeaderVersion: boolean,
    client: DeliverooApi
  ) {
    this.mainPlayerSpeedLR = mainPlayerSpeedLR;
    this.cumulatedCarriedPenaltyFactor = cumulatedCarriedPenaltyFactor;
    this.useProbabilisticModel = useProbabilisticModel;
    this.useTrafficModel = useTrafficModel;
    this.isMultiAgentLeaderVersion = isMultiAgentLeaderVersion;
    this.client = client;
  }

  abstract potentialScore(startX: number, startY: number, endX: number, endY: number): number;
  abstract computeNewPlan();

  // PUBLIC SENSING

  initTrafficMap() {
    for (let i = 0; i < this.beliefSet.getSizeLength(); i++) {
      this.trafficMap.push([]);
      for (let j = 0; j < this.beliefSet.getSizeLength(); j++) this.trafficMap[i].push(-1);
    }
    for (const tile of this.beliefSet.validTiles) this.trafficMap[tile.y][tile.x] = 0;
  }

  agentsSensingHandler(agents: any) {
    log.debug(`DEBUG: main player perceived ${agents.length} agents`);
    this.beliefSet.updateAgents(agents);
  }

  parcelSensingHandler(parcels: any) {
    log.debug(`DEBUG: main player perceived ${parcels.length} parcels`);
    const sensedNewParsels = this.beliefSet.updateParcels(parcels);

    this.beliefSet.updateParcelsDecayEstimation();
    this.computeCarriedScore();
    this.setGoal();
    if (this.isTimeForANewPlan()) {
      return this.getNewPlan();
    }

    return [];
  }

  updateMe(id: string, name: string, x: number, y: number, score: number) {
    log.debug(`DEBUG: update main player position ${x} ${y}`);
    if (this.x !== undefined && this.y !== undefined) this.beliefSet.freeTile(this.x, this.y);
    this.id = id;
    this.name = name;
    if (Number.isInteger(x) && Number.isInteger(y) && (this.x != x || this.y != y)) {
      if (this.modifiedAt.length > 90) this.modifiedAt.shift();
      this.modifiedAt.push(new Date());
    }
    this.x = x;
    this.y = y;
    this.score = score;
    this.beliefSet.occupyTile(this.x, this.y, true);
    this.updateMainPlayerSpeedEstimation();
  }

  // PUBLIC ACTIONS

  getNewPlan() {
    if (Number.isInteger(this.x) && Number.isInteger(this.y)) {
      // check that previous action is completed

      if (this.isMultiAgentLeaderVersion && this.leaderId && this.leaderId !== this.id && !this.isAskingForANewPlan) {
        // ask leader for a plan
        this.isAskingForANewPlan = true;
        const planMessage = this.client.say(
          this.leaderId,
          MessageFactory.createAskForPlanMessage(this.id, this.beliefSet.getTile(this.x, this.y))
        );
      } else if (this.amITheLeader()) {
        // I am the leader, I can compute my plan myself
        return this.computeNewPlan();
      } else if (this.goal && !this.isMultiAgentLeaderVersion) {
        return this.computeNewPlan();
      }
    }
    return [];
  }

  getNextAction() {
    if (Number.isInteger(this.x) && Number.isInteger(this.y) && this.plan.length > 0) {
      const parcelsReward = Array.from(this.beliefSet.parcels.values())
        .filter((parcel) => parcel.x === this.x && parcel.y === this.y && !parcel.carriedBy)
        .reduce((sum, current) => sum + current.reward, 0);

      if (parcelsReward > 0) this.plan.unshift(Action.PICKUP);

      if (this.beliefSet.getTile(this.x, this.y).isDelivery && this.carriedScore > 0) this.plan.unshift(Action.PUTDOWN);
      return this.plan[0];
    }
    return Action.UNDEFINED;
  }

  actionAccomplished() {
    this.plan.shift();
  }

  // PRIVATE INNER FUNCTIONS
  private computeCarriedScore() {
    const [carriedScore, numCarriedParcels] = this.beliefSet.getCarriedScore(this.id);
    this.carriedScore = carriedScore;
    this.numCarriedParcels = numCarriedParcels;
  }

  private updateMainPlayerSpeedEstimation() {
    const deltas = [];
    if (this.modifiedAt.length > 1) {
      for (let i = 1; i < this.modifiedAt.length; i++) {
        deltas.push((this.modifiedAt[i].getTime() - this.modifiedAt[i - 1].getTime()) / 1000);
      }
    }

    if (deltas.length > 0) {
      const oldMainPlayerSpeedEstimation = this.mainPlayerSpeedEstimation;
      const currentContribution = this.mainPlayerSpeedEstimation * (1 - this.mainPlayerSpeedLR);
      const newContribution = arrayAverage(deltas) * this.mainPlayerSpeedLR;
      this.mainPlayerSpeedEstimation = currentContribution + newContribution;
      log.debug(
        `DEBUG: main player estimation updated: ${oldMainPlayerSpeedEstimation} -> ${this.mainPlayerSpeedEstimation}`
      );
    }
  }

  private isGoalADeliveryStation() {
    return this.goal && this.goal.type === GoalType.DELIVERY_STATION;
  }

  private setGoal() {
    const parcels = this.beliefSet.getParcels();
    // the player has at least one parcel
    if (this.carriedScore > 0 && !this.isGoalADeliveryStation()) {
      let maxPotentialScore = -Number.MAX_VALUE;
      let bestDeliveryStation = null;
      for (const deliveryStation of this.beliefSet.deliveryStations)
        if (!deliveryStation.isOccupied) {
          const potentialScore = this.potentialScore(this.x, this.y, deliveryStation.x, deliveryStation.y);
          if (potentialScore > maxPotentialScore) {
            maxPotentialScore = potentialScore;
            bestDeliveryStation = deliveryStation;
          }
        }

      if (bestDeliveryStation) {
        this.goal = new Goal(bestDeliveryStation, GoalType.DELIVERY_STATION, 'delivery');
        log.info(
          'INFO : New Goal: delivering parcel(s)\n\t',
          this.goal.toString(),
          `with ${this.carriedScore} of potential value and ${this.numCarriedParcels} parcels`
        );
      }
    } else if (!this.goal || (this.goal && this.goal.type === GoalType.TILE)) {
      // no goal or random walk
      let maxPotentialScore = 0;
      let bestParcel = null;
      for (const parcel of parcels.values())
        if (parcel.carriedBy === null && parcel.isVisible) {
          const parcelTile = this.beliefSet.getTile(parcel.x, parcel.y);

          const potentialScore = this.potentialScore(this.x, this.y, parcelTile.x, parcelTile.y);
          if (potentialScore > maxPotentialScore) {
            maxPotentialScore = potentialScore;
            bestParcel = parcel;
          }
        }
      if (bestParcel) {
        this.goal = new Goal(this.beliefSet.getTile(bestParcel.x, bestParcel.y), GoalType.PARCEL, bestParcel.id);
        log.info('INFO : New Goal: tracking visible parcel\n\t', this.goal.toString());
      }

      // no goal and no visible parcels
      if (!this.goal) {
        this.goal = new Goal(this.beliefSet.getRandomValidTile(), GoalType.TILE, 'exploration');
        log.info(
          'INFO : New Goal: the agent is exploring randomly the map since no parcel is sensed\n\t',
          this.goal.toString()
        );
      }
    } else if (
      this.goal.type === GoalType.PARCEL &&
      (!parcels.get(this.goal.id) || parcels.get(this.goal.id).carriedBy === this.id || this.goal.tile.isOccupied)
    ) {
      this.goal = null;
      log.info('INFO : New Goal: resetting goal to null since tracked parcel was picked by another agent');
    }
  }

  protected isGoalReached(): boolean {
    return this.x === this.goal.tile.x && this.y === this.goal.tile.y;
  }

  protected computeParcelValueEstimation(parcelValue: number, distance: number) {
    return parcelValue - this.computeParcelLossEstimation(distance);
  }

  protected computePotentialCarriedScoreEstimation(parcelsValue: number, parcelsNumber: number) {
    return parcelsValue - this.computeParcelLossEstimation(1) * parcelsNumber;
  }

  protected computeParcelLossEstimation(distance: number) {
    const playerSpeedParcelCoefficient = this.mainPlayerSpeedEstimation / this.beliefSet.getParcelsDecayEstimation();
    return distance * playerSpeedParcelCoefficient;
  }

  protected isTimeForANewPlan(): boolean {
    return this.plan.length === 0;
  }

  addNewPlanner(agentId: string) {
    if (!this.agentToPlanner.has(agentId)) {
      this.agentToPlanner.set(
        agentId,
        new Planner(
          this.beliefSet.getAgents().get(agentId),
          this.useProbabilisticModel,
          this.useTrafficModel,
          this.distanceCache,
          this.beliefSet.deliveryStations,
          this.cumulatedCarriedPenaltyFactor
        )
      );
    }
  }

  async getPlanFromPlanner(agentId: string) {
    return undefined;
  }

  amITheLeader() {
    return this.isMultiAgentLeaderVersion && this.leaderId && this.leaderId === this.id;
  }
}

export default AbstractIntentionPlanner;
