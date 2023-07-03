import { DeliverooApi } from '@unitn-asa/deliveroo-js-client';
import log from 'loglevel';
import Config, { BRAIN_TYPE } from '../../config.js';
import { Agent } from '../belief-sets/agent.js';
import BeliefSet from '../belief-sets/belief-set.js';
import { Parcel } from '../belief-sets/parcel.js';
import { Action, arrayAverage } from '../belief-sets/utils.js';
import Message, { MessageType } from '../messages/Message.js';
import MessageHandler from '../messages/MessageHandler.js';
import IBrain from './brains/IBrain.js';
import PddlMultiAgentLeaderVersionSendPlan from './brains/PddlMultiAgentLeaderVersionSendPlan.js';
import PddlSingleAgent from './brains/PddlSingleAgent.js';
import PDDLMulitAgentLeaderVersionSendAction from './brains/PDDLMultiAgentLeaderVersionSendAction.js';

export default class Carrier {
  private brain: PDDLMulitAgentLeaderVersionSendAction = new PDDLMulitAgentLeaderVersionSendAction();
  private brainType: PDDLMulitAgentLeaderVersionSendAction;
  private client: DeliverooApi;
  private beliefSet: BeliefSet;
  private messageHandler: MessageHandler;
  private leaderId: string;
  private distanceCache = new Map<string, number>();
  private modifiedAt: Date[] = [];
  private mainPlayerSpeedLR: number;
  private mainPlayerSpeedEstimation: number = 0.1; // it corresponds to 0.1s
  private parcelsToAvoidIds = new Set<string>();
  private isElectingLeader = false;
  private isAskingForPlan = false;
  private isActionRunning = false;
  private isActionOtherAgentRunning = false;
  private friendlyAgents = new Set<string>();

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
      if (this.leaderId && this.beliefSet.amIInitialized() && this.isMeLeader()) {
        this.brain.computePlan(this.beliefSet.getReachableParcels(), this.beliefSet.toPddlProblem(this.friendlyAgents));
      }

      if (this.beliefSet.amIInitialized() && !this.isActionRunning) {
        this.isActionRunning = true;
        const action = this.brain.getAction(this.beliefSet.getMyId());
        console.log(action);

        if (
          action &&
          action.agentId &&
          action.agentId !== this.beliefSet.getMyId() &&
          this.isMeLeader() &&
          !this.isActionOtherAgentRunning
        ) {
          this.isActionOtherAgentRunning = true;
          console.log('invio', [action.action]);
          this.messageHandler.sendPlan(this.beliefSet.getMyId(), action.agentId, this.beliefSet.getMyPosition(), [
            action.action,
          ]);
        } else if (action) {
          let result = null;
          switch (action.action) {
            case Action.UNDEFINED:
              break;
            case Action.PICKUP:
              result = await client.pickup();
              if (result.length >= 0) {
                this.brain.accomplishAction(this.beliefSet.getMyId());
                if (!this.isMeLeader()) {
                  this.messageHandler.sendAckAction(action.agentId, this.leaderId, this.beliefSet.getMyPosition());
                }
              }
              break;
            case Action.PUTDOWN:
              result = await client.putdown();
              // console.log(result);
              if (result.length >= 0) {
                this.brain.accomplishAction(this.beliefSet.getMyId());
                this.beliefSet.deleteCarriedParcels();
                this.messageHandler.sendParcelInform(
                  this.beliefSet.getMyId(),
                  this.beliefSet.getMyPosition(),
                  this.beliefSet.getParcels()
                );
                if (!this.isMeLeader()) {
                  this.messageHandler.sendAckAction(action.agentId, this.leaderId, this.beliefSet.getMyPosition());
                }
              }
              break;
            default:
              result = await client.move(action.action.toString());
              if (result !== false) {
                this.brain.accomplishAction(this.beliefSet.getMyId());
                if (!this.isMeLeader()) {
                  this.messageHandler.sendAckAction(action.agentId, this.leaderId, this.beliefSet.getMyPosition());
                }
              }
              break;
          }
        }
        this.isActionRunning = false;
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
    if (!this.isElectingLeader && !this.leaderId) {
      this.isElectingLeader = true;
      this.leaderElection();
    }
  }

  senseMessage(message: Message) {
    const sender = new Agent(
      message.senderId,
      message.senderId,
      message.senderPosition.x,
      message.senderPosition.y,
      0,
      true
    );
    this.beliefSet.senseAgents([sender], true);
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
        this.friendlyAgents.add(message.senderId);
        break;

      case MessageType.LEADER:
        const leaderId = this.messageHandler.handleLeader(message);
        this.leaderId = leaderId;
        break;

      case MessageType.ASKFORPLAN:
        const { senderId, senderX, senderY } = this.messageHandler.handleAskForPlan(message);
        // const parcelsToPick = this.computePlan(senderX, senderY, senderId);
        // this.addParcelsToAvoid(parcelsToPick);
        // const planToSend = this.brain.getPlan(senderId);
        // this.messageHandler.sendPlan(this.beliefSet.getMyId(), senderId, this.beliefSet.getMyPosition(), planToSend);
        break;

      case MessageType.PLAN:
        const returnedPlan = this.messageHandler.handlePlan(message);
        console.log('receieved', returnedPlan);
        if (this.brain) this.brain.setPlan(this.beliefSet.getMyId(), returnedPlan);
        this.isAskingForPlan = false;
        break;

      case MessageType.ACKACTION:
        this.brain.accomplishAction(message.senderId);
        this.isActionOtherAgentRunning = false;
        console.log('ack');
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

  printMap() {
    this.beliefSet.printMap();
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
    this.messageHandler.sendAskLeader(this.beliefSet.getMyId(), this.beliefSet.getMyPosition());
    setTimeout(() => {
      if (!this.leaderId) {
        this.leaderId = this.beliefSet.getMyId();
        this.messageHandler.sendLeader(this.beliefSet.getMyId(), this.beliefSet.getMyPosition());
      }
    }, 2500);
  }
}
