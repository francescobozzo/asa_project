import { DeliverooApi } from '@unitn-asa/deliveroo-js-client';
import { Agent } from '../belief-sets/agent.js';
import { Parcel } from '../belief-sets/parcel.js';
import Tile from '../belief-sets/tile.js';
import { Action } from '../belief-sets/utils.js';
import Message from './Message.js';
import MessageFactory from './MessageFactory.js';

export default class MessageHandler {
  constructor(private client: DeliverooApi) {}

  handleInform(message: Message) {
    const parcels = message.getInfoParcels();
    const agents = message.getInfoAgents();
    return { parcels, agents };
  }

  handleIntention(message: Message) {
    const parcelsToAvoidIds = new Set<string>();
    for (const parcelId of message.getParcelIdsIntention()) {
      parcelsToAvoidIds.add(parcelId);
    }
    return parcelsToAvoidIds;
  }

  handleLeader(message: Message) {
    return message.senderId;
  }

  handleAskForPlan(message: Message) {
    return message.senderId;
  }

  handlePlan(message: Message) {
    return message.getPlan();
  }

  sendPlan(senderId: string, receiverId: string, senderPosition: Tile, plan: Action[]) {
    this.client.say(receiverId, MessageFactory.createPlanMessage(senderId, senderPosition, plan));
  }

  sendLeader(senderId: string, senderPosition: Tile) {
    this.client.shout(MessageFactory.createLeaderMessage(senderId, senderPosition));
  }

  sendAgentInform(senderId: string, senderPosition: Tile, agents: Agent[]) {
    this.client.shout(MessageFactory.createInformAgentMessage(senderId, senderPosition, agents));
  }

  sendParcelInform(senderId: string, senderPosition: Tile, parcels: Parcel[]) {
    this.client.shout(MessageFactory.createInformParcelMessage(senderId, senderPosition, parcels));
  }
}
