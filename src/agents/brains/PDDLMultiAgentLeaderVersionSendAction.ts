import { Parcel } from '../../belief-sets/parcel.js';
import { getPlan } from '../../belief-sets/pddl.js';
import { Action, computeActionFromYX, pddlToyx } from '../../belief-sets/utils.js';
import PddlAction from '../../pddl-client/PddlAction.js';
import PddlDomain from '../../pddl-client/PddlDomain.js';
import PddlPredicate from '../../pddl-client/PddlPredicate.js';
import PddlProblem from '../../pddl-client/PddlProblem.js';
import PddlType from '../../pddl-client/PddlType.js';

class LeaderAction {
  constructor(public agentId: string, public action: Action) {}
}

export default class PDDLMulitAgentLeaderVersionSendAction {
  private plansByAgentIds = new Map<string, Action[]>();
  private isComputing = false;
  private isAgentExectutingAction = new Map<string, boolean>();
  private isAgentPlanDone = new Map<string, boolean>();
  private plan: LeaderAction[] = [];
  private isActionRunning = false;

  computePlan(parcels: Parcel[], pddlProblem: PddlProblem) {
    if (parcels.length === 0 || this.isComputing || this.plan.length > 0) return;
    console.log('generating plan');
    this.isComputing = true;

    // TODO se parcel non raggiungibile si blocca tutto
    let goal = '(and ';
    for (const parcel of parcels) {
      goal += `(delivered ${parcel.id}) `;
      // goal += `(carrying a_25b10e83b72 ${parcel.id})`;
    }
    goal += ')';

    pddlProblem.setGoal(goal);

    getPlan(domain, pddlProblem)
      .then((newPddlPlan) => {
        if (!newPddlPlan) return;
        // this.isAgentPlanDone = new Map<string, boolean>();
        for (const step of newPddlPlan) {
          const agentId = step.args[0].split('_')[1];
          // if (!this.plansByAgentIds.has(agentId)) this.plansByAgentIds.set(agentId, []);
          // if (!this.isAgentPlanDone.has(agentId)) this.isAgentPlanDone.set(agentId, false);

          switch (step.action) {
            case 'move':
              const fromPos = pddlToyx(step.args[1]);
              const toPos = pddlToyx(step.args[2]);

              this.plan.push(
                new LeaderAction(agentId, computeActionFromYX(fromPos[1], fromPos[0], toPos[1], toPos[0]))
              );
              // this.plansByAgentIds.get(agentId).push(computeActionFromYX(fromPos[1], fromPos[0], toPos[1], toPos[0]));
              break;
            case 'pickup':
              // this.plansByAgentIds.get(agentId).push(Action.PICKUP);
              this.plan.push(new LeaderAction(agentId, Action.PICKUP));
              break;
            case 'putdown':
              // this.plansByAgentIds.get(agentId).push(Action.PUTDOWN);
              this.plan.push(new LeaderAction(agentId, Action.PUTDOWN));
              break;
            case 'deliver':
              // this.plansByAgentIds.get(agentId).push(Action.PUTDOWN);
              this.plan.push(new LeaderAction(agentId, Action.PUTDOWN));
              break;
          }
        }
      })
      .catch((error) => {
        console.error('errore nella generazione del piano %s', error);
      })
      .finally(() => {
        this.isComputing = false;
      });
  }

  getAction(agentId: string) {
    if (this.plan.length === 0) return new LeaderAction(undefined, Action.UNDEFINED);

    return this.plan[0];
    // const plan = this.plansByAgentIds.get(agentId);
    // if (!this.isAgentExectutingAction.has(agentId)) this.isAgentExectutingAction.set(agentId, false);
    // if (!plan || plan.length === 0) {
    //   if (!this.isAgentExectutingAction.get(agentId) && plan && plan.length === 0) {
    //     this.isAgentPlanDone.set(agentId, true);
    //   }
    //   return Action.UNDEFINED;
    // }
    // this.isAgentExectutingAction.set(agentId, true);
    // return plan[0];
  }

  setPlan(agentId: string, plan: Action[]) {
    this.plan = plan.map((action) => new LeaderAction(agentId, action));
  }

  accomplishAction(agentId: string) {
    if ((this.plan && this.plan.length === 0) || (this.plan && this.plan[0].agentId !== agentId)) return;
    this.plan.shift();
    // this.plansByAgentIds.get(agentId).shift();
    // this.isAgentExectutingAction.set(agentId, false);
  }

  private isPlanCompleted() {
    // for (const value of this.isAgentPlanDone.values()) if (!value) return false;
    // return true;
  }
}

const domain = new PddlDomain(
  'deliveroo',
  [new PddlType(['entity', 'position'], 'object'), new PddlType(['agent', 'parcel'], 'entity')],
  [
    new PddlPredicate('at', ['?entity - entity', '?position - position']),
    new PddlPredicate('can-move', ['?from - position', '?to - position']),
    new PddlPredicate('carrying', ['?agent - agent', '?parcel - parcel']),
    new PddlPredicate('delivery', ['?position - position']),
    new PddlPredicate('delivered', ['?parcel - parcel']),
    new PddlPredicate('blocked ', ['?position - position']),
  ],
  [
    new PddlAction(
      'move',
      ['?agentId - agent', '?fr - position', '?to - position'],
      '(and (at ?agentId ?fr) (can-move ?fr ?to) (not (blocked ?to)))',
      '(and (not (at ?agentId ?fr)) (at ?agentId ?to) (not (blocked ?fr)) (blocked ?to))'
    ),
    new PddlAction(
      'pickup',
      ['?agentId - agent', '?position - position'],
      '(and (at ?agentId ?position))',
      `
        (forall (?p - parcel)
          (when (at ?p ?position)
            (and (carrying ?agentId ?p) (not (at ?p ?position)))
          )
        )`
    ),
    new PddlAction(
      'deliver',
      ['?agentId - agent', '?position - position'],
      '(and (at ?agentId ?position) (delivery ?position))',
      `
        (forall (?p - parcel)
          (when (carrying ?agentId ?p)
            (and (not (carrying ?agentId ?p)) (delivered ?p))
          )
        )`
    ),

    new PddlAction(
      'putdown',
      ['?agentId - agent', '?position - position'],
      '(and (at ?agentId ?position))',
      `
        (forall (?p - parcel)
          (when (carrying ?agentId ?p)
            (and (not (carrying ?agentId ?p)) (at ?p ?position))
          )
        )`
    ),
  ]
);
