class Tile {
  isOccupied = false;
  isWalkable = true;
  isDelivery = false;
  isMainPlayer = false;
  value = 0;

  constructor(public x: number, public y: number) {}

  isEqual(tile: Tile): boolean {
    return this.x === tile.x && this.y === tile.y;
  }
}

export default Tile;
