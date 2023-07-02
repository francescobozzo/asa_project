import PddlDomain from './PddlDomain.js';
import PddlProblem from './PddlProblem.js';

declare global {
  var fetch: typeof import('node-fetch').default;
}

type PddlPlanStep = {
  action: string;
  args: string[];
  parallel: boolean;
};

export default async function pddlOnlineSolver(pddlDomain: PddlDomain, pddlProblem: PddlProblem) {
  const response = await fetch('http://solver.planning.domains/solve', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ domain: pddlDomain.toPddlString(), problem: pddlProblem.toPddlString() }),
  });

  if (response.status != 200) {
    throw new Error('Error at http://solver.planning.domains/solve ' + (await response.text()));
  }

  const content = await response.json();
  // console.log(content.result.plan);
  // console.log(content);

  if (content['status'] == 'error') {
    if (!content['result'].plan && content['result'].output.split('\n')[0] != ' --- OK.') {
      console.error('Plan not found');
      return;
    }
    throw new Error('Error at http://solver.planning.domains/solve ' + content['result'].error);
  }

  const plan: PddlPlanStep[] = [];
  if (content['result'].plan) {
    for (const step of content['result'].plan) {
      if (step == '(reach-goal)') break;

      const line: string[] = (step.name || step).replace('(', '').replace(')', '').split(' ');
      const action = line.shift();

      plan.push({ action: action, args: line, parallel: false });
    }
  }

  return plan;
}
