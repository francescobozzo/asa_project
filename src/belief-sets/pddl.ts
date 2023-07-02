import PddlAction from '../pddl-client/PddlAction.js';
import PddlDomain from '../pddl-client/PddlDomain.js';
import pddlOnlineSolver from '../pddl-client/PddlOnlineSolver.js';
import PddlProblem from '../pddl-client/PddlProblem.js';

export class PDDLProblemContext {
  public actions = [moveAction, pickupAction];
  constructor(public objects: string, public predicates: string[]) {}
}

export const moveAction = new PddlAction(
  'move',
  ['?fr', '?to'],
  '(and (at ?fr) (can-move ?fr ?to))',
  '(and (not (at ?fr)) (at ?to))'
);
export const pickupAction = new PddlAction(
  'pickup',
  ['?position'],
  '(and (at ?position) (parcel ?position))',
  '(and (not (parcel ?position)) (carrying ?position))'
);

export async function getPlan(domain: PddlDomain, problem: PddlProblem) {
  // console.log(domain.toPddlString());
  // console.log(problem.toPddlString());

  // const consoleLogFunction = console.log;
  // console.log = function (...args) {};
  const plan = await pddlOnlineSolver(domain, problem);
  // console.log = consoleLogFunction;

  return plan;
}

// https://github.com/unitn-ASA/Deliveroo.js/blob/77545499224b56325ca889c7244bdcebc8a80fb5/packages/%40unitn-asa/pddl-client/src/PddlDomain.js#L31
// if ( this.predicates.find( (e) => e.split(' ')[0] === predicate.split(' ')[0] && e.split(' ').length === predicate.split(' ').length ) )
//   return false;
