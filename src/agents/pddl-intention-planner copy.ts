import log from 'loglevel';
import { getPlan } from '../belief-sets/pddl.js';
import { Action, ManhattanDistance, computeAction } from '../belief-sets/utils.js';
import AbstractIntentionPlanner from './abstract-intention-planner.js';

class PddlIntentionPlanner extends AbstractIntentionPlanner {
  constructor(mainPlayerSpeedLR: number) {
    super(mainPlayerSpeedLR);
  }

  computeNewPlan() {
    const pddlProblemContext = this.beliefSet.toPddlDomain();

    let goal = '';
    let predicates =
      pddlProblemContext.predicates + ` (at ${this.beliefSet.tileToPddl(this.beliefSet.getTile(this.x, this.y))})`;

    if (this.carriedScore === 0) {
      goal = `and (carryingParcel)`;
    } else {
      goal = `and (not (carryingParcel))`;
      predicates += ` (carryingParcel)`;
    }

    getPlan(pddlProblemContext.objects, predicates, goal)
      .then((newPddlPlan) => {
        const plan: Action[] = [];
        for (const step of newPddlPlan) {
          // TODO: handle parallel operations
          if (step.action === 'move') {
            plan.push(computeAction(this.beliefSet.pddlToTile(step.args[0]), this.beliefSet.pddlToTile(step.args[1])));
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
      });
  }

  potentialScore(startX: number, startY: number, endX: number, endY: number): number {
    return ManhattanDistance(this.beliefSet.getTile(startX, startY), this.beliefSet.getTile(endX, endY));
  }
}

export default PddlIntentionPlanner;
