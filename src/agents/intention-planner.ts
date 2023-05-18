import { PriorityQueue } from 'js-sdsl';
import log from 'loglevel';
import DeliverooMap from '../belief-sets/matrix-map.js';
import Tile from '../belief-sets/tile.js';
import { Action, Plan, arrayAverage, computeAction } from '../belief-sets/utils.js';

enum GoalType {
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

class IntentionPlanner {
  private id: string;
  private name: string;
  private x: number = undefined;
  private y: number = undefined;
  private score: number;
  private carriedScore: number = 0;
  private numCarriedParcels: number = 0;
  public beliefSet: DeliverooMap;
  private goal: Goal;
  private modifiedAt: Date[] = [];
  private mainPlayerSpeedLR: number;
  private mainPlayerSpeedEstimation: number = 0.1; // it corresponds to 0.1s

  constructor(mainPlayerSpeedLR: number) {
    this.mainPlayerSpeedLR = mainPlayerSpeedLR;
  }

  // PUBLIC SENSING

  agentsSensingHandler(agents: any) {
    log.debug(`DEBUG: main player perceived ${agents.length} agents`);
    this.beliefSet.updateAgents(agents);
  }

  parcelSensingHandler(parcels: any) {
    log.debug(`DEBUG: main player perceived ${parcels.length} parcels`);
    this.beliefSet.updateParcels(parcels);
    this.beliefSet.updateParcelsDecayEstimation();
    this.computeCarriedScore();
    this.setGoal();
  }

  updateMe(id: string, name: string, x: number, y: number, score: number) {
    log.debug(`DEBUG: update main player position ${x} ${y}`);
    if (this.x !== undefined && this.y !== undefined) this.beliefSet.freeTile(this.x, this.y);
    this.id = id;
    this.name = name;
    if (Number.isInteger(x) && Number.isInteger(y) && (this.x != x || this.y != y)) {
      if (this.modifiedAt.length > 90) this.modifiedAt.pop();
      this.modifiedAt.push(new Date());
    }
    this.x = x;
    this.y = y;
    this.score = score;
    this.beliefSet.occupyTile(this.x, this.y, true);
    this.updateMainPlayerSpeedEstimation();
  }

  // PUBLIC ACTIONS
  getNextAction(): Action {
    if (Number.isInteger(this.x) && Number.isInteger(this.y) && this.beliefSet.getTile(this.x, this.y).value) {
      return Action.PICKUP;
    }

    if (Number.isInteger(this.x) && Number.isInteger(this.y) && this.goal) {
      if (this.isGoalReached() && this.goal.type === GoalType.PARCEL) {
        this.goal = null;
        return Action.PICKUP;
      } else if (this.isGoalReached() && this.goal.type === GoalType.DELIVERY_STATION) {
        this.carriedScore = 0;
        this.numCarriedParcels = 0;
        this.goal = null;
        return Action.PUTDOWN;
      } else if (this.isGoalReached() && this.goal.type === GoalType.TILE) {
        this.goal = null;
        return Action.UNDEFINED;
      }
      const cameFrom = this.shortestPathFromTo(this.x, this.y, this.goal.tile.x, this.goal.tile.y);

      return cameFrom.has(this.goal.tile) ? cameFrom.get(this.goal.tile).actions[0] : Action.UNDEFINED;
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
      log.info(
        `DEBUG: main player estimation updated: ${oldMainPlayerSpeedEstimation} -> ${this.mainPlayerSpeedEstimation}`
      );
    }
  }

  private isGoalDeliveryStationFree() {
    return this.goal && this.goal.type === GoalType.DELIVERY_STATION && !this.goal.tile.isOccupied;
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
          const cameFrom = this.shortestPathFromTo(this.x, this.y, deliveryStation.x, deliveryStation.y);
          const goalPlan = cameFrom.get(deliveryStation);
          if (goalPlan && goalPlan.potentialScore > maxPotentialScore) {
            maxPotentialScore = goalPlan.potentialScore;
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
          const cameFrom = this.shortestPathFromTo(this.x, this.y, parcel.x, parcel.y);
          const goalPlan = cameFrom.get(parcelTile);
          if (goalPlan && goalPlan.potentialScore > maxPotentialScore) {
            maxPotentialScore = goalPlan.potentialScore;
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

  private isGoalReached(): boolean {
    return this.x === this.goal.tile.x && this.y === this.goal.tile.y;
  }

  private shortestPathFromTo(startX: number, startY: number, endX: number, endY: number) {
    class Element {
      constructor(
        public tile: Tile,
        public distanceSoFar: number,
        public potentialCarriedScore: number,
        public numCarriedParcels: number
      ) {}
      print() {
        console.log(`${this.tile.x},${this.tile.y}: ${this.potentialCarriedScore}`);
      }
    }
    const frontier = new PriorityQueue<Element>(
      [],
      (a: Element, b: Element): number => {
        return b.potentialCarriedScore - a.potentialCarriedScore;
      },
      false
    );
    const playerTile = this.beliefSet.getTile(startX, startY);
    frontier.push(new Element(playerTile, 0, this.carriedScore, this.numCarriedParcels));
    const cameFrom = new Map<Tile, Plan>();
    const potentialScoreSoFar = new Map<Tile, number>();
    cameFrom.set(playerTile, new Plan([], 0));
    potentialScoreSoFar.set(playerTile, this.carriedScore);

    const dacayParcelScoreOverDistance = 1;

    while (frontier.size() > 0) {
      const currentElement = frontier.pop();

      // currentElement.print();
      const currentTile = currentElement.tile;
      const currentDistance = currentElement.distanceSoFar;
      const currentPotentialCarriedScore = currentElement.potentialCarriedScore;
      const currentNumCarriedParcels = currentElement.numCarriedParcels;
      if (currentTile.isEqual(this.beliefSet.getTile(endX, endY))) break;

      for (const neighbor of this.beliefSet.getNeighbors(currentTile)) {
        const newDistance = currentDistance + 1;
        const newPotentialScore =
          neighbor.value -
          newDistance * dacayParcelScoreOverDistance +
          (currentPotentialCarriedScore - currentNumCarriedParcels * dacayParcelScoreOverDistance);
        const newNumCarriedParcels = neighbor.value > 0 ? currentNumCarriedParcels + 1 : currentNumCarriedParcels;
        if (!potentialScoreSoFar.has(neighbor) || newPotentialScore > potentialScoreSoFar.get(neighbor)) {
          potentialScoreSoFar.set(neighbor, newPotentialScore);
          frontier.push(new Element(neighbor, newDistance, newPotentialScore, newNumCarriedParcels));

          const currentPlanActions = cameFrom.get(currentTile).actions;
          const newPlanActions = currentPlanActions.concat([computeAction(currentTile, neighbor)]);
          cameFrom.set(neighbor, new Plan(newPlanActions, newPotentialScore));
        }
      }
    }
    return cameFrom;
  }
}

export default IntentionPlanner;
