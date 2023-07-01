import PddlAction from './PddlAction.js';
import PddlPredicate from './PddlPredicate.js';
import PddlType from './PddlType.js';
import { PADDING } from './utils.js';

export default class PddlDomain {
  static nextId = 0;

  constructor(
    private name: string,
    private types: PddlType[],
    private predicates: PddlPredicate[],
    private actions: PddlAction[]
  ) {}

  addAction(pddlAction: PddlAction) {
    this.actions.push(pddlAction);
  }

  toPddlString() {
    return `\
;; domain file: domain-${this.name}-${PddlDomain.nextId++}.pddl
(define (domain default)
  (:requirements :strips)
  (:types
${this.types.map((type) => PADDING.repeat(2) + type.toPddl()).join('\n')}
  )

  (:predicates
${this.predicates.map((predicate) => PADDING.repeat(2) + predicate.toPddl()).join('\n')}
  )

${this.actions.map((action) => action.toPddlString()).join('\n')}
)`;
  }
}
