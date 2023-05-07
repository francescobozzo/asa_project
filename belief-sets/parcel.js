class Parcel {
  constructor(id, x, y, carriedBy, reward) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.carriedBy = carriedBy;
    this.reward = reward;
    this.isVisible = true;
  }
}

export default Parcel;
