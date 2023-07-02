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
import PddlMultiAgentLeaderVersionSendPlan from './brains/PddlMultiAgentLeaderVersionSendPlan.js';

export default class Carrier {
  private brain: IBrain;
  private brainType: BRAIN_TYPE;
  private client: DeliverooApi;
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
    this.client = client;

    setInterval(async () => {
      const me = this.beliefSet.getMyPosition();
      if (me) {
        const deliveredParcels = await this.takeAction(me.x, me.y);
        if (deliveredParcels.length > 0) {
          this.deleteParcels(deliveredParcels);
          this.messageHandler.sendDeliveredParcelsInform(this.beliefSet.getMyId(), me, deliveredParcels);
        }
      }
    }, agentClock);
    if (brainType === BRAIN_TYPE.PddlMultiAgentLeaderVersionSendPlan) this.leaderElection();
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

    if (!this.brain) this.initBrain(this.brainType);
  }

  senseMessage(message: Message) {
    switch (message.type) {
      case MessageType.INFORM:
        const { parcels, deliveredParcels, agents } = this.messageHandler.handleInform(message);
        this.beliefSet.senseAgents(agents, true);
        this.beliefSet.senseParcels(parcels, true);
        this.deleteParcels(deliveredParcels);
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

      case MessageType.ASKFORPLAN:
        const { senderId, senderX, senderY } = this.messageHandler.handleAskForPlan(message);
        const parcelsToPick = this.computePlan(senderX, senderY, senderId);
        this.addParcelsToAvoid(parcelsToPick);
        const planToSend = this.brain.getPlan(senderId);
        this.messageHandler.sendPlan(this.beliefSet.getMyId(), senderId, this.beliefSet.getMyPosition(), planToSend);
        break;

      case MessageType.PLAN:
        const returnedPlan = this.messageHandler.handlePlan(message);
        if (this.brain) this.brain.setPlan(returnedPlan);
        break;
    }
  }

  isMeLeader() {
    return this.leaderId === this.beliefSet.getMyId();
  }

  updateParcelDecayEstimation() {
    this.beliefSet.updateParcelDecayEstimation();
  }

  addParcelsToAvoid(parcels: Parcel[]) {
    for (const parcel of parcels) {
      this.parcelsToAvoidIds.add(parcel.id);
    }
  }

  deleteParcels(parcels: Parcel[]) {
    for (const parcel of parcels) {
      this.parcelsToAvoidIds.delete(parcel.id);
    }
    this.beliefSet.deleteParcels(parcels);
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

  private async takeAction(startX: number, startY: number) {
    if (!this.brain) return [];
    return await this.brain.takeAction(
      this.client,
      startX,
      startY,
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
  }

  private computePlan(startX: number, startY: number, agentId: string) {
    if (!this.brain) return [];
    this.brain.computeDesires(
      startX,
      startY,
      this.beliefSet.getParcels(),
      this.parcelsToAvoidIds,
      this.beliefSet.getAgents(),
      this.beliefSet.getDeliveryStations(),
      this.distanceCache,
      this.mainPlayerSpeedEstimation,
      this.beliefSet.getParcelDecayEstimation()
    );
    return this.brain.computePlan(
      startX,
      startY,
      agentId,
      this.beliefSet.mapToPddlProblem(),
      this.beliefSet.getRandomValidTile(),
      this.distanceCache
    );
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

      case BRAIN_TYPE.PddlMultiAgentLeaderVersionSendPlan:
        this.brain = new PddlMultiAgentLeaderVersionSendPlan(
          this.beliefSet.getMyId(),
          Config.UseProbabilisticModel,
          Config.CumulatedCarriedPenaltyFactor,
          Config.TakeActions,
          Config.ActionErrorPatience
        );
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

  private leaderElection() {
    this.client.shout(this.messageHandler.sendAskLeader(this.beliefSet.getMyId(), this.beliefSet.getMyPosition()));
    setTimeout(() => {
      if (!this.leaderId) {
        this.leaderId = this.beliefSet.getMyId();

        this.client.shout(this.messageHandler.sendLeader(this.beliefSet.getMyId(), this.beliefSet.getMyPosition()));
      }
    }, 2500);
  }
}
