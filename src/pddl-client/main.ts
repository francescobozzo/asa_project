import PddlAction from './PddlAction.js';
import PddlDomain from './PddlDomain.js';
import pddlOnlineSolver from './PddlOnlineSolver.js';
import PddlPredicate from './PddlPredicate.js';
import PddlProblem from './PddlProblem.js';
import PddlType from './PddlType.js';

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

// console.log(domain.toPddlString());

const problem = new PddlProblem(
  'deliveroo',
  [
    'y0_x0 - position',
    'y1_x0 - position',
    'y2_x0 - position',
    'y3_x0 - position',
    'agent1 - agent',
    'agent2 - agent',
    'parcel1 - parcel',
    'parcel2 - parcel',
  ],
  [
    'can-move y0_x0 y1_x0',
    'can-move y1_x0 y0_x0',
    'can-move y1_x0 y2_x0',
    'can-move y2_x0 y1_x0',
    'can-move y2_x0 y3_x0',
    'can-move y3_x0 y2_x0',
    'at agent1 y0_x0',
    'blocked y0_x0',
    'at agent2 y2_x0',
    'blocked y2_x0',
    'at parcel1 y0_x0',
    'delivery y3_x0',
  ],
  '(and (delivered parcel1))'
);

// console.log(problem.toPddlString());

const plan = await pddlOnlineSolver(domain, problem);
// console.log(plan);
