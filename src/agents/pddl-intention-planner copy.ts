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

    getPlan(
      pddlProblemContext.objects,
      pddlProblemContext.predicates + ` (at ${this.beliefSet.tileToPddl(this.beliefSet.getTile(this.x, this.y))})`,
      `and (at ${this.beliefSet.tileToPddl(this.goal.tile)})`
    )
      .then((newPddlPlan) => {
        const plan: Action[] = [];
        for (const step of newPddlPlan) {
          // TODO: handle parallel operations
          if (step.action === 'move') {
            plan.push(computeAction(this.beliefSet.pddlToTile(step.args[0]), this.beliefSet.pddlToTile(step.args[1])));
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
