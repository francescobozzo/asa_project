import { DeliverooApi } from '@unitn-asa/deliveroo-js-client';
import { Agent } from '../../belief-sets/agent.js';
import { Parcel } from '../../belief-sets/parcel.js';
import Tile from '../../belief-sets/tile.js';
import PddlProblem from '../../pddl-client/PddlProblem.js';
import { Action } from '../../belief-sets/utils.js';

interface IBrain {
  computeDesires: (
    startX: number,
    startY: number,
    parcels: Parcel[],
    parcelsToAvoidIds: Set<string>,
    agents: Agent[],
    deliveryStations: Tile[],
    distanceCache: Map<string, number>,
    playerSpeedEstimation: number,
    parcelDecayEstimation: number
  ) => boolean;
  computePlan: (
    startX: number,
    startY: number,
    pddlProblem: PddlProblem,
    randomValidTile: Tile,
    distanceCache: Map<string, number>
  ) => Parcel[];
  takeAction: (
    client: DeliverooApi,
    startX: number,
    startY: number,
    parcels: Parcel[],
    parcelsToAvoidIds: Set<string>,
    agents: Agent[],
    deliveryStations: Tile[],
    randomValidTile: Tile,
    distanceCache: Map<string, number>,
    playerSpeedEstimation: number,
    parcelDecayEstimation: number,
    pddlProblem: PddlProblem
  ) => Promise<Parcel[]>;
  setPlan: (plan: Action[]) => Action[];
  //   extendPlan: (plan: Action[]) => Action[];
}

export default IBrain;
