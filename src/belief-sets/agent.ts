class Agent {
  constructor(
    public id: string,
    public name: string,
    public x: number,
    public y: number,
    public score: number,
    public isVisible = true
  ) {}

  update(x: number, y: number, score: number, isVisible: boolean) {
    this.x = x;
    this.y = y;
    this.score = score;
    this.isVisible = isVisible;
  }
}

export default Agent;
