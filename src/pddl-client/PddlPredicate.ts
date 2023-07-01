export default class PddlPredicate {
  constructor(private name: string, private parameters: string[]) {}

  public toPddl() {
    return `(${this.name} ${this.parameters.join(' ')})`;
  }
}
