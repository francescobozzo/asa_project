import { onlineSolver, PddlAction, PddlProblem } from '@unitn-asa/pddl-client';
import fs from 'fs';

function readFile(path) {
  return new Promise((res, rej) => {
    fs.readFile(path, 'utf8', (err, data) => {
      if (err) rej(err);
      else res(data);
    });
  });
}

export function tileToPddl(y, x) {
  return `y${y}_x${x}`;
}

export function pddlToTile(pddlObject) {
  const [y, x] = pddlObject.split('_');
  return { y: parseInt(y.slice(1)), x: parseInt(x.slice(1)) };
}

export async function getPlan(objects, predicates) {
  const moveAction = new PddlAction(
    'move',
    '?fr ?to',
    'and (at ?fr) (can-move ?fr ?to)',
    'and (not (at ?fr)) (at ?to)',
    async (l) => console.log('exec move', l)
  );

  // FIX: waiting for fix
  // https://github.com/unitn-ASA/Deliveroo.js/issues/1
  // const domain = new PddlDomain('deliveroo', moveAction);

  const domain = await readFile('./domain_deliveroo.pddl');
  const problem = new PddlProblem('deliveroo-problem-1', objects, predicates, 'and (at y8_x6)');

  return await onlineSolver(domain, problem.toPddlString());
}
