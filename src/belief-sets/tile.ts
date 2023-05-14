class Tile {
  isOccupied = false;
  isWalkable = false;
  isDelivery = false;
  isMainPlayer = false;
  hasParcel = false;
  value = 0;

  constructor(public x: number, public y: number) {}

  isEqual(tile: Tile): boolean {
    return this.x === tile.x && this.y === tile.y;
  }

  toString(): string {
    if (this.isMainPlayer) return 'I';
    else if (this.isOccupied) return 'A';
    else if (this.isDelivery) return 'D';
    // else if (this.hasParcel) return 'P';
    else if (!this.isWalkable) return ' ';
    else return `${this.value}`;
  }
}

export default Tile;
