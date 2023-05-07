import TileStatus from './utils.js';
import Parcel from './parcel.js';
import Agent from './agent.js';

class DeliverooMap {
  constructor(width, height, tiles) {
    this.map = [];
    this.#createMap(width, height);
    this.#updateTiles(tiles);
  }

  #createMap(width, height) {
    for (let i = 0; i < height; i++) {
      this.map.push([]);
      for (let j = 0; j < width; j++) this.map[i].push(TileStatus.NonWalkable);
    }
  }

  #updateTiles(tiles) {
    for (const tile of tiles)
      this.updateTile(tile.x, tile.y, tile.delivery ? TileStatus.Delivery : TileStatus.Walkable);
  }

  updateTile(x, y, status) {
    this.map[x][y] = status;
  }

  toString() {
    let returnValue = '';
    for (let i = 0; i < this.map.length; i++) {
      for (let j = 0; j < this.map[i].length; j++) {
        if (this.map[i][j] === TileStatus.Delivery) returnValue += '  D';
        else if (this.map[i][j] === TileStatus.Walkable) returnValue += '  X';
        else if (this.map[i][j] === TileStatus.Player) returnValue += '  P';
        else if (this.map[i][j] === TileStatus.NonWalkable) returnValue += '   ';
        else if (this.map[i][j] instanceof Agent) returnValue += '  A';
        else returnValue += '  ' + this.map[i][j].toString();
      }
      returnValue += '\n';
    }
    return returnValue;
  }
}

export default DeliverooMap;
