import { Action } from '../../belief-sets/utils.js';
import IBrain from '../IBrain.js';

export default class PddlSingleAgent implements IBrain {
  private plan: Action[];

  computePlan() {
    return [Action.DOWN];
  }

  getNextAction() {
    return [Action.DOWN];
  }

  setPlan(plan: Action[]) {
    this.plan = plan;
    return this.plan;
  }
}
