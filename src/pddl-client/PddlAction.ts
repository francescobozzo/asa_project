import { PADDING } from './utils.js';

export default class PddlAction {
  constructor(
    private name: string,
    private parameters: string[],
    private preconditions: string,
    private effects: string
  ) {}

  toPddlString() {
    return `\
      (:action ${this.name}
      ${PADDING}:parameters (${this.parameters.join(' ')})
      ${PADDING}:precondition ${this.preconditions}
      ${PADDING}:effect ${this.effects}
      )`;
  }
}
