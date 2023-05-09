import { onlineSolver, PddlAction, PddlProblem } from '@unitn-asa/pddl-client';
import fs from 'fs';
import Tile from './tile.js';

export class PDDLPlan {
  constructor(public objects: string[], predicates: string) {}
}

function readFile(path: string): Promise<string> {
  return new Promise((res, rej) => {
    fs.readFile(path, 'utf8', (err, data) => {
      if (err) rej(err);
      else res(data);
    });
  });
}

export function tileToPddl(tile: Tile) {
  return `y${tile.y}_x${tile.x}`;
}

export function pddlToTile(pddlObject: string): Tile {
  const [y, x] = pddlObject.split('_');
  return new Tile(parseInt(x.slice(1)), parseInt(y.slice(1)));
}

export async function getPlan(objects: string, predicates: string) {
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
