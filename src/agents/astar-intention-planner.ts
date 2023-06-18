import { PriorityQueue } from 'js-sdsl';
import Tile from '../belief-sets/tile.js';
import { Action, Plan, computeAction } from '../belief-sets/utils.js';
import AbstractIntentionPlanner, { GoalType } from './abstract-intention-planner.js';

class AstarIntentionPlanner extends AbstractIntentionPlanner {
  constructor(mainPlayerSpeedLR: number, cumulatedCarriedPenaltyFactor: number, useProbabilisticModel: boolean) {
    super(mainPlayerSpeedLR, cumulatedCarriedPenaltyFactor, useProbabilisticModel);
  }

  computeNewPlan() {
    if (this.isGoalReached() && this.goal.type === GoalType.PARCEL) {
      this.goal = null;
      this.plan = [Action.PICKUP];
    } else if (this.isGoalReached() && this.goal.type === GoalType.DELIVERY_STATION) {
      this.carriedScore = 0;
      this.numCarriedParcels = 0;
      this.goal = null;
      this.plan = [Action.PUTDOWN];
    } else if (this.isGoalReached() && this.goal.type === GoalType.TILE) {
      this.goal = null;
      this.plan = [Action.UNDEFINED];
    } else if (this.goal) {
      const cameFrom = this.shortestPathFromTo(this.x, this.y, this.goal.tile.x, this.goal.tile.y);
      this.plan = cameFrom.has(this.goal.tile) ? cameFrom.get(this.goal.tile).actions : this.plan;
    }
  }

  potentialScore(startX: number, startY: number, endX: number, endY: number): number {
    const cameFrom = this.shortestPathFromTo(startX, startY, endX, endY);
    const goalPlan = cameFrom.get(this.beliefSet.getTile(endX, endY));

    return goalPlan ? goalPlan.potentialScore : 0;
  }

  private shortestPathFromTo(startX: number, startY: number, endX: number, endY: number) {
    class Element {
      constructor(
        public tile: Tile,
        public distanceSoFar: number,
        public potentialCarriedScore: number,
        public carriedParcelTiles: Set<Tile>
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
    frontier.push(new Element(playerTile, 0, this.carriedScore, new Set()));
    const cameFrom = new Map<Tile, Plan>();
    const potentialScoreSoFar = new Map<Tile, number>();
    cameFrom.set(playerTile, new Plan([], 0));
    potentialScoreSoFar.set(playerTile, this.carriedScore);

    while (frontier.size() > 0) {
      const currentElement = frontier.pop();

      // currentElement.print();
      const currentTile = currentElement.tile;
      const currentDistance = currentElement.distanceSoFar;
      const currentPotentialCarriedScore = currentElement.potentialCarriedScore;
      const currentCarriedParcelTiles = currentElement.carriedParcelTiles;
      if (currentTile.isEqual(this.beliefSet.getTile(endX, endY))) break;

      for (const neighbor of this.beliefSet.getNeighbors(currentTile)) {
        const newDistance = currentDistance + 1;
        const newCarriedParcelTiles: Set<Tile> = new Set(
          JSON.parse(JSON.stringify(Array.from(currentCarriedParcelTiles)))
        );
        let neighborEstimatedValue = 0;
        if (!newCarriedParcelTiles.has(neighbor) && neighbor.hasParcel) {
          neighborEstimatedValue = this.computeParcelValueEstimation(neighbor.value, newDistance);
          newCarriedParcelTiles.add(neighbor);
        }
        const potentialCarriedScoreEstimatedValue = this.computePotentialCarriedScoreEstimation(
          currentPotentialCarriedScore,
          currentCarriedParcelTiles.size
        );
        const newPotentialScore = neighborEstimatedValue + potentialCarriedScoreEstimatedValue;

        if (!potentialScoreSoFar.has(neighbor) || newPotentialScore > potentialScoreSoFar.get(neighbor)) {
          potentialScoreSoFar.set(neighbor, newPotentialScore);
          frontier.push(new Element(neighbor, newDistance, newPotentialScore, newCarriedParcelTiles));

          const currentPlanActions = cameFrom.get(currentTile).actions;
          const newPlanActions = currentPlanActions.concat([computeAction(currentTile, neighbor)]);
          cameFrom.set(neighbor, new Plan(newPlanActions, newPotentialScore));
        }
      }
    }
    return cameFrom;
  }
}

export default AstarIntentionPlanner;
