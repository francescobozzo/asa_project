class Parcel {
  public modifiedAt: Date[] = [];
  constructor(
    public id: string,
    public x: number,
    public y: number,
    public carriedBy: string,
    public reward: number,
    public isVisible = true
  ) {
    this.modifiedAt.push(new Date());
  }

  getParcelDecayEstimation() {
    const deltas = [];
    if (this.modifiedAt.length <= 1) return deltas;
    for (let i = 1; i < this.modifiedAt.length; i++) {
      const deltaSeconds = (this.modifiedAt[i].getTime() - this.modifiedAt[i - 1].getTime()) / 1000;
      deltas.push(deltaSeconds);
    }
    return deltas;
  }

  update(x: number, y: number, carriedBy: string, reward: number, isVisible: boolean) {
    this.x = x;
    this.y = y;
    this.carriedBy = carriedBy;
    if (reward != this.reward) this.modifiedAt.push(new Date());
    this.reward = reward;
    this.isVisible = isVisible;
  }
}

export default Parcel;
