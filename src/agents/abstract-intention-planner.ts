import log from 'loglevel';
import DeliverooMap from '../belief-sets/matrix-map.js';
import Tile from '../belief-sets/tile.js';
import { Action, arrayAverage } from '../belief-sets/utils.js';

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
  private id: string;
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
  private mainPlayerSpeedEstimation: number = 0.1; // it corresponds to 0.1s
  protected plan: Action[] = [];

  constructor(mainPlayerSpeedLR: number) {
    this.mainPlayerSpeedLR = mainPlayerSpeedLR;
  }

  abstract potentialScore(startX: number, startY: number, endX: number, endY: number): number;
  abstract computeNewPlan();

  // PUBLIC SENSING

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
    if (this.plan.length === 0) {
      this.getNewPlan();
    }
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
      if (this.beliefSet.getTile(this.x, this.y).hasParcel) {
        // if you are on a parcel take it no matter what is your current plan
        this.plan = [Action.PICKUP];
      } else if (this.goal) {
        this.computeNewPlan();
      }
    }
  }

  getNextAction() {
    if (Number.isInteger(this.x) && Number.isInteger(this.y) && this.plan.length > 0) {
      return this.plan.shift();
    }
    return Action.UNDEFINED;
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
      let maxPotentialScore = 0;
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
}

export default AbstractIntentionPlanner;
