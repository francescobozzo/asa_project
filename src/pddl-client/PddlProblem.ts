export default class PddlProblem {
  static nextId = 0;

  constructor(private name: string, private objects: string[], private init: string[], private goal: string) {}

  setGoal(goal: string) {
    this.goal = goal;
  }

  addInitCondition(condition: string) {
    this.init.push(condition);
  }

  toPddlString() {
    return `
;; problem file: problem-${this.name}-${PddlProblem.nextId++}.pddl
(define (problem default)
  (:domain default)
  (:objects ${this.objects.join(' ')})
  (:init ${this.init.map((predicate) => `(${predicate})`).join(' ')})
  (:goal ${this.goal})
)`;
  }
}
