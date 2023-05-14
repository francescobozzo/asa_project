import log from 'loglevel';
import { PriorityQueue } from 'js-sdsl';
import DeliverooMap from '../belief-sets/matrix-map.js';
import Tile from '../belief-sets/tile.js';
import { Action, ManhattanDistance, Movement, computeAction } from '../belief-sets/utils.js';

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
  private x: number;
  private y: number;
  private score: number;
  private carriedScore: number = 0;
  public beliefSet: DeliverooMap;
  private goal: Goal;

  constructor() {}

  // PUBLIC SENSING

  agentsSensingHandler(agents: any) {
    log.debug(`DEBUG: main player perceived ${agents.length} agents`);
    this.beliefSet.updateAgents(agents);
  }

  parcelSensingHandler(parcels: any) {
    log.debug(`DEBUG: main player perceived ${parcels.length} parcels`);
    this.beliefSet.updateParcels(parcels);
    this.computeCarriedScore();
    this.setGoal();
  }

  updateMe(id: string, name: string, x: number, y: number, score: number) {
    log.debug(`DEBUG: update main player position ${x} ${y}`);
    if (this.x && this.y) this.beliefSet.freeTile(this.x, this.y);
    this.id = id;
    this.name = name;
    this.x = x;
    this.y = y;
    this.score = score;
    this.beliefSet.occupyTile(this.x, this.y, true);
  }

  // PUBLIC ACTIONS
  getNextAction(): Action {
    if (Number.isInteger(this.x) && Number.isInteger(this.y) && this.goal) {
      if (this.isGoalReached() && this.goal.type === GoalType.PARCEL) {
        this.goal = null;
        return Action.PICKUP;
      } else if (this.isGoalReached() && this.goal.type === GoalType.DELIVERY_STATION) {
        this.carriedScore = 0;
        this.goal = null;
        return Action.PUTDOWN;
      } else if (this.isGoalReached() && this.goal.type === GoalType.TILE) {
        this.goal = null;
        return Action.UNDEFINED;
      }
      const cameFrom = this.shortestPathFromTo(this.x, this.y, this.goal.tile.x, this.goal.tile.y);

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

  // PRIVATE INNER FUNCTIONS
  private computeCarriedScore() {
    this.carriedScore = this.beliefSet.getCarriedScore(this.id);
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
      this.goal = new Goal(this.beliefSet.getRandomDeliveryStation(), GoalType.DELIVERY_STATION, 'delivery');
      log.info(
        'INFO : New Goal: delivering parcel(s)\n\t',
        this.goal.toString(),
        `with ${this.carriedScore} of potential value`
      );
    } else if (!this.goal || (this.goal && this.goal.type === GoalType.TILE)) {
      // no goal or random walk
      for (const parcel of parcels.values())
        if (parcel.carriedBy === null && parcel.isVisible) {
          this.goal = new Goal(this.beliefSet.getTile(parcel.x, parcel.y), GoalType.PARCEL, parcel.id);
          log.info('INFO : New Goal: tracking visible parcel\n\t', this.goal.toString());
          break;
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

  private shortestPathFromTo(startX: number, startY: number, endX: number, endY: number): Map<Tile, Movement> {
    class Element {
      constructor(public tile: Tile, public priority: number) {}
      print() {
        console.log(`${this.tile.x},${this.tile.y}: ${this.priority}`);
      }
    }
    const frontier = new PriorityQueue<Element>(
      [],
      (a: Element, b: Element): number => {
        return a.priority - b.priority;
      },
      false
    );
    const playerTile = this.beliefSet.getTile(startX, startY);
    frontier.push(new Element(playerTile, 0));
    const cameFrom = new Map<Tile, Movement>();
    const costSoFar = new Map<Tile, number>();
    cameFrom.set(playerTile, new Movement(null, Action.UNDEFINED));
    costSoFar.set(playerTile, 0);

    while (frontier.size() > 0) {
      let currentElement = frontier.pop();
      // currentElement.print();
      const current = currentElement.tile;
      if (current.isEqual(this.goal.tile)) break;

      for (const neighbor of this.beliefSet.getNeighbors(current)) {
        const newCost = costSoFar.get(current) + 1;
        if (!costSoFar.has(neighbor) || newCost < costSoFar.get(neighbor)) {
          costSoFar.set(neighbor, newCost);
          const priority = newCost + ManhattanDistance(this.goal.tile, neighbor);
          frontier.push(new Element(neighbor, priority));
          cameFrom.set(neighbor, new Movement(current, computeAction(current, neighbor)));
        }
      }
    }
    return cameFrom;
  }
}

export default IntentionPlanner;
