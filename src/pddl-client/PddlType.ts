const defaultParentType = 'object';

export default class PddlType {
  constructor(private names: string[], private parentType?: string) {}

  public toPddl() {
    return `${this.names.join(' ')} - ${this.parentType ?? defaultParentType}`;
  }
}
