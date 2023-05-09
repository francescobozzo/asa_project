class Parcel {
  constructor(
    public id: string,
    public x: number,
    public y: number,
    public carriedBy: string,
    public reward: number,
    public isVisible = true
  ) {}

  update(x: number, y: number, carriedBy: string, reward: number, isVisible: boolean) {
    this.x = x;
    this.y = y;
    this.carriedBy = carriedBy;
    this.reward = reward;
    this.isVisible = isVisible;
  }
}

export default Parcel;
