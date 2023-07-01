import { DeliverooApi } from '@unitn-asa/deliveroo-js-client';
import { BRAIN_TYPE } from '../../config.js';
import { Agent } from '../belief-sets/agent.js';
import BeliefSet from '../belief-sets/belief-set.js';
import { Parcel } from '../belief-sets/parcel.js';
import Message, { MessageType } from '../messages/Message.js';
import MessageHandler from '../messages/MessageHandler.js';
import IBrain from './IBrain.js';

export default class Carrier {
  private brain: IBrain;
  private beliefSet: BeliefSet;
  private messageHandler: MessageHandler;
  private leaderId: string;

  constructor(client: DeliverooApi, brainType: BRAIN_TYPE, parcelDecayLR: number) {
    this.beliefSet = new BeliefSet(parcelDecayLR);
    this.messageHandler = new MessageHandler(client);
    this.initBrain(brainType);
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

      case MessageType.ASKFORPLAN:
        const requesterId = this.messageHandler.handleAskForPlan(message);
        const requestedPlan = this.brain.computePlan();
        this.messageHandler.sendPlan(
          this.beliefSet.getMyId(),
          requesterId,
          this.beliefSet.getMyPosition(),
          requestedPlan
        );
        break;

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
    this.brain = undefined;
  }
}
