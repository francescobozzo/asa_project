import { PddlAction, PddlDomain, PddlExecutor, PddlProblem, onlineSolver } from '@unitn-asa/pddl-client';
import fs from 'fs';

export class PDDLProblemContext {
  constructor(public objects: string, public predicates: string) {}
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

export async function getPlan(objects: string, predicates: string, goal: string) {
  const domain = new PddlDomain('deliveroo', moveAction);
  const problem = new PddlProblem('deliveroo-problem-1', objects, predicates, goal);

  const consoleLogFunction = console.log;
  console.log = function (...args) {};
  const plan = await onlineSolver(domain.toPddlString(), problem.toPddlString());
  console.log = consoleLogFunction;

  return plan;
}

export function executePlan(plan) {
  const pddlExecutor = new PddlExecutor(moveAction);
  pddlExecutor.exec(plan);
}
