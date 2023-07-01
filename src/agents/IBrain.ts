import { Action } from '../belief-sets/utils.js';

interface IBrain {
  computePlan: () => Action[];
  getNextAction: () => Action[];
  setPlan: (plan: Action[]) => Action[];
  //   extendPlan: (plan: Action[]) => Action[];
}

export default IBrain;
