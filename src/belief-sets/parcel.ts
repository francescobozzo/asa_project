import { arrayAverage, roundCoordinates } from './utils.js';

export class Parcel {
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

  perceived(parcel: any, isVisible: boolean) {
    const rc = roundCoordinates(parcel.x, parcel.y);

    this.update(rc.roundX, rc.roundY, parcel.carriedBy, parcel.reward, isVisible);
  }
}

export class Parcels {
  private parcels = new Map<string, Parcel>();

  senseParcels(parcels: Parcel[], externalPerception: boolean) {
    const viewedParcelIds = new Set<string>();

    for (const parcel of parcels) {
      viewedParcelIds.add(parcel.id);
      if (!this.parcels.has(parcel.id)) {
        const isVisible = !externalPerception;
        this.parcels.set(
          parcel.id,
          new Parcel(parcel.id, parcel.x, parcel.y, parcel.carriedBy, parcel.reward, isVisible)
        );
      } else {
        const isVisible = externalPerception ? this.parcels.get(parcel.id).isVisible : true;
        this.parcels.get(parcel.id).perceived(parcel, isVisible);
      }
    }

    if (!externalPerception)
      for (const parcelId of this.parcels.keys()) {
        if (!viewedParcelIds.has(parcelId)) {
          this.parcels.get(parcelId).isVisible = false;
        }
      }
  }

  getParcels() {
    return Array.from(this.parcels.values());
  }

  getParcelsByAgentId(agentId: string) {
    const parcels: Parcel[] = [];

    for (const parcel of this.parcels.values())
      if (parcel.isVisible && parcel.carriedBy === agentId) parcels.push(parcel);

    return parcels;
  }

  getParcelsDecayEstimation(currentEstimation: number, parcelDecayLR: number) {
    let deltas = [];
    for (const parcel of this.parcels.values()) {
      deltas = deltas.concat(parcel.getParcelDecayEstimation());
    }

    if (deltas.length > 0) {
      const currentContribution = currentEstimation * (1 - parcelDecayLR);
      const newContribution = arrayAverage(deltas) * parcelDecayLR;
      return currentContribution + newContribution;
    }
    return undefined;
  }

  print() {
    console.log(this.parcels);
  }
}
