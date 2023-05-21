import { PddlAction, PddlDomain, PddlExecutor, PddlProblem, onlineSolver } from '@unitn-asa/pddl-client';
import fs from 'fs';

export class PDDLProblemContext {
  public actions = [moveAction, pickupAction];
  constructor(public objects: string, public predicates: string[]) {}
}

function readFile(path: string): Promise<string> {
  return new Promise((res, rej) => {
    fs.readFile(path, 'utf8', (err, data) => {
      if (err) rej(err);
      else res(data);
    });
  });
}

const moveAction = new PddlAction(
  'move',
  '?fr ?to',
  'and (at ?fr) (can-move ?fr ?to)',
  'and (not (at ?fr)) (at ?to)',
  async (from, to) => console.log('exec move', from, to)
);
const pickupAction = new PddlAction(
  'pickup',
  '?position',
  'and (at ?position) (parcel ?position)',
  'and (not (parcel ?position)) (carrying ?position)',
  async (position) => console.log('exec pickup parcel', position)
);
// const moveToValueAction = new PddlAction(
//   'move-to-value',
//   '?fr ?to',
//   'and (at ?fr) (can-move ?fr ?to) (parcel ?to)',
//   'and (at ?to) (carrying ?to) (not (parcel ?to))'
// );

export async function getPlan(context: PDDLProblemContext, goal: string) {
  console.log('non ti scordare di me');
  console.log(context.actions);
  const domain = new PddlDomain('deliveroo', ...context.actions);
  console.log('el motoporco');
  const problem = new PddlProblem('deliveroo-problem-1', context.objects, context.predicates.join(' '), goal);

  console.log(domain.toPddlString());
  console.log(problem.toPddlString());

  // const consoleLogFunction = console.log;
  // console.log = function (...args) {};
  const plan = await onlineSolver(domain.toPddlString(), problem.toPddlString());
  // console.log = consoleLogFunction;

  return plan;
}

export function executePlan(plan) {
  const pddlExecutor = new PddlExecutor(moveAction);
  pddlExecutor.exec(plan);
}

// https://github.com/unitn-ASA/Deliveroo.js/blob/77545499224b56325ca889c7244bdcebc8a80fb5/packages/%40unitn-asa/pddl-client/src/PddlDomain.js#L31
// if ( this.predicates.find( (e) => e.split(' ')[0] === predicate.split(' ')[0] && e.split(' ').length === predicate.split(' ').length ) )
//   return false;
