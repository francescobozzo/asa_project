import { DeliverooApi } from '@unitn-asa/deliveroo-js-client';
import { BRAIN_TYPE } from '../../config.js';
import { Agent } from '../belief-sets/agent.js';
import BeliefSet from '../belief-sets/belief-set.js';
import { Parcel } from '../belief-sets/parcel.js';
import Message, { MessageType } from '../messages/Message.js';
import MessageHandler from '../messages/MessageHandler.js';
import IBrain from './brains/IBrain.js';
import { arrayAverage } from '../belief-sets/utils.js';
import log from 'loglevel';
import PddlSingleAgent from './brains/PddlSingleAgent.js';
import Config from '../../config.js';

export default class Carrier {
  private brain: IBrain;
  private beliefSet: BeliefSet;
  private messageHandler: MessageHandler;
  private leaderId: string;
  private distanceCache = new Map<string, number>();
  private modifiedAt: Date[] = [];
  private mainPlayerSpeedLR: number;
  private mainPlayerSpeedEstimation: number = 0.1; // it corresponds to 0.1s
  private parcelsToAvoidIds = new Set<string>();

  constructor(
    client: DeliverooApi,
    brainType: BRAIN_TYPE,
    parcelDecayLR: number,
    mainPlayerSpeedLR: number,
    agentClock: number
  ) {
    this.beliefSet = new BeliefSet(parcelDecayLR);
    this.messageHandler = new MessageHandler(client);
    this.mainPlayerSpeedLR = mainPlayerSpeedLR;
    this.initBrain(brainType);

    setInterval(async () => {
      const me = this.beliefSet.getMyPosition();
      if (me) {
        const deliveredParcels = await this.brain.takeAction(
          client,
          me.x,
          me.y,
          this.beliefSet.getParcels(),
          this.parcelsToAvoidIds,
          this.beliefSet.getAgents(),
          this.beliefSet.getDeliveryStations(),
          this.beliefSet.getRandomValidTile(),
          this.distanceCache,
          this.mainPlayerSpeedEstimation,
          this.beliefSet.getParcelDecayEstimation(),
          this.beliefSet.mapToPddlProblem()
        );
        this.beliefSet.deleteParcels(deliveredParcels);
      }
    }, agentClock);
  }

  initMap(width: number, height: number, tiles: any[]) {
    this.beliefSet.initMap(width, height, tiles);
  }

  senseAgents(agents: Agent[], externalPerception: boolean) {
    this.beliefSet.senseAgents(agents, externalPerception);
    if (!externalPerception)
      this.messageHandler.sendAgentInform(this.beliefSet.getMyId(), this.beliefSet.getMyPosition(), agents);
  }

  senseParcels(parcels: Parcel[], externalPerception: boolean) {
    this.beliefSet.senseParcels(parcels, externalPerception);
    if (!externalPerception)
      this.messageHandler.sendParcelInform(this.beliefSet.getMyId(), this.beliefSet.getMyPosition(), parcels);
  }

  senseYou(me: Agent) {
    this.beliefSet.senseYou(me);
    this.updateMainPlayerSpeedEstimation();
  }

  senseMessage(message: Message) {
    switch (message.type) {
      case MessageType.INFORM:
        const { parcels, agents } = this.messageHandler.handleInform(message);
        this.beliefSet.senseAgents(agents, true);
        this.beliefSet.senseParcels(parcels, true);
        break;

      case MessageType.INTENTION:
        break;

      case MessageType.ASKFORLEADER:
        if (this.isMeLeader()) {
          this.messageHandler.sendLeader(this.beliefSet.getMyId(), this.beliefSet.getMyPosition());
        }
        break;

      case MessageType.LEADER:
        const leaderId = this.messageHandler.handleLeader(message);
        this.leaderId = leaderId;
        break;

      // case MessageType.ASKFORPLAN:
      //   const requesterId = this.messageHandler.handleAskForPlan(message);
      //   const requestedPlan = this.brain.computePlan();
      //   this.messageHandler.sendPlan(
      //     this.beliefSet.getMyId(),
      //     requesterId,
      //     this.beliefSet.getMyPosition(),
      //     requestedPlan
      //   );
      //   break;

      case MessageType.PLAN:
        const returnedPlan = this.messageHandler.handlePlan(message);
        this.brain.setPlan(returnedPlan);
        break;
    }
  }

  isMeLeader() {
    return this.leaderId === this.beliefSet.getMyId();
  }

  updateParcelDecayEstimation() {
    this.beliefSet.updateParcelDecayEstimation();
  }

  // getLeader() {
  //   return this.leaderId;
  // }

  // setLeader(agentId: string) {
  //   this.leaderId = agentId;
  // }

  printMap() {
    this.beliefSet.printMap();
  }

  private initBrain(brainType: BRAIN_TYPE) {
    switch (brainType) {
      case BRAIN_TYPE.PddlSingleAgent:
        this.brain = new PddlSingleAgent(
          Config.UseProbabilisticModel,
          Config.CumulatedCarriedPenaltyFactor,
          Config.TakeActions,
          Config.ActionErrorPatience
        );
        break;
    }
  }

  private updateMainPlayerSpeedEstimation() {
    const deltas = [];
    if (this.modifiedAt.length > 1) {
      for (let i = 1; i < this.modifiedAt.length; i++) {
        deltas.push((this.modifiedAt[i].getTime() - this.modifiedAt[i - 1].getTime()) / 1000);
      }
    }

    if (deltas.length > 0) {
      const oldMainPlayerSpeedEstimation = this.mainPlayerSpeedEstimation;
      const currentContribution = this.mainPlayerSpeedEstimation * (1 - this.mainPlayerSpeedLR);
      const newContribution = arrayAverage(deltas) * this.mainPlayerSpeedLR;
      this.mainPlayerSpeedEstimation = currentContribution + newContribution;
      log.debug(
        `DEBUG: main player estimation updated: ${oldMainPlayerSpeedEstimation} -> ${this.mainPlayerSpeedEstimation}`
      );
    }
  }
}
