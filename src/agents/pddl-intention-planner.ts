import { PddlAction } from '@unitn-asa/pddl-client';
import log from 'loglevel';
import Parcel from '../belief-sets/parcel.js';
import { getPlan } from '../belief-sets/pddl.js';
import { Action, ManhattanDistance, computeAction } from '../belief-sets/utils.js';
import AbstractIntentionPlanner from './abstract-intention-planner.js';

class PddlIntentionPlanner extends AbstractIntentionPlanner {
  constructor(mainPlayerSpeedLR: number) {
    super(mainPlayerSpeedLR);
  }

  private buildPDDLPutdownAction(parcels: Parcel[]) {
    const parcelPDDLTiles = parcels.map(
      (p) => `(carrying ${this.beliefSet.tileToPddl(this.beliefSet.getTile(p.x, p.y))})`
    );
    return new PddlAction(
      'putdown',
      '?position',
      `and (at ?position) (delivery ?position) ${parcelPDDLTiles.join(' ')}`,
      'and (delivered)',
      async (position) => console.log('exec putdown parcel', position)
    );
  }

  computeNewPlan() {
    const pddlProblemContext = this.beliefSet.toPddlDomain();
    const visibleParcels = this.beliefSet.getVisibleParcels();

    const parcelsToPick = visibleParcels.filter(
      (parcel) => this.potentialScore(this.x, this.y, parcel.x, parcel.y) > 0
    );
    pddlProblemContext.actions.push(this.buildPDDLPutdownAction(parcelsToPick));

    const goal = 'and (delivered)';
    pddlProblemContext.predicates.push(`(at ${this.beliefSet.tileToPddl(this.beliefSet.getTile(this.x, this.y))})`);

    for (const parcel of parcelsToPick) {
      pddlProblemContext.predicates.push(
        `(parcel ${this.beliefSet.tileToPddl(this.beliefSet.getTile(parcel.x, parcel.y))})`
      );
    }
    // pddlproblemcontext.predicates.push(
    //   `(parcel ${this.beliefset.tiletopddl(this.beliefset.gettile(visibleparcels[0].x, visibleparcels[0].y))})`
    // );

    // const oldConsoleLogFunction = console.log;
    // console.log = (...args) => {};
    getPlan(pddlProblemContext, goal)
      .then((newPddlPlan) => {
        const plan: Action[] = [];
        let i = 0;
        let firstTile = newPddlPlan.length > 0 ? newPddlPlan[0].args[0] : undefined;
        for (const step of newPddlPlan) {
          // TODO: handle parallel operations
          if (step.action === 'move') {
            plan.push(computeAction(this.beliefSet.pddlToTile(step.args[0]), this.beliefSet.pddlToTile(step.args[1])));
            i += 1;
            const keyDistanceCache = firstTile + step.args[1];
            if (!this.distanceCache.has(keyDistanceCache) || i < this.distanceCache.get(keyDistanceCache)) {
              this.distanceCache.set(keyDistanceCache, i);
              this.distanceCache.set(step.args[1] + firstTile, i);
            }
          } else if (step.action === 'pickup') {
            plan.push(Action.PICKUP);
          } else if (step.action === 'putdown') {
            plan.push(Action.PUTDOWN);
          }
        }
        this.plan = plan;
        console.log(plan);
      })
      .catch((error) => {
        log.debug("DEBUG: Couldn't generate a new pddl plan\n", error);
      });
    // console.log = oldConsoleLogFunction;
  }

  potentialScore(startX: number, startY: number, endX: number, endY: number): number {
    const keyDistanceCache =
      this.beliefSet.tileToPddl(this.beliefSet.getTile(startX, startY)) +
      this.beliefSet.tileToPddl(this.beliefSet.getTile(endX, endY));
    return (
      this.beliefSet.getTile(endX, endY).value -
      this.computeParcelLossEstimation(
        this.distanceCache.get(keyDistanceCache) ??
          ManhattanDistance(this.beliefSet.getTile(startX, startY), this.beliefSet.getTile(endX, endY))
      )
    );
  }
}

export default PddlIntentionPlanner;
