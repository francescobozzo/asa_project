import { Agent } from '../belief-sets/agent.js';
import { Parcel } from '../belief-sets/parcel.js';
import Tile from '../belief-sets/tile.js';
import { Action } from '../belief-sets/utils.js';
import Message, { MessageType } from './Message.js';

class MessageFactory {
  static createInformMessage(id: string, position: Tile) {
    return new Message(MessageType.INFORM, id, position, new Date().toISOString(), {});
  }

  static createIntentionMessage(id: string, position: Tile) {
    return new Message(MessageType.INTENTION, id, position, new Date().toISOString(), {});
  }

  static createInformParcelMessage(id: string, position: Tile, parcels: Parcel[]) {
    const message = MessageFactory.createInformMessage(id, position);
    message.payload = { parcels };
    return message;
  }

  static createInformDeliveredParcelsMessage(id: string, position: Tile, deliveredParcels: Parcel[]) {
    const message = MessageFactory.createInformMessage(id, position);
    message.payload = { deliveredParcels };
    return message;
  }

  static createInformAgentMessage(id: string, position: Tile, agents: Agent[]) {
    const message = MessageFactory.createInformMessage(id, position);
    message.payload = { agents };
    return message;
  }

  static createParcelsIntentionMessage(id: string, position: Tile, parcelIds: string[]) {
    const message = MessageFactory.createIntentionMessage(id, position);
    message.payload = { parcelIds };
    return message;
  }

  static createLeaderMessage(id: string, position: Tile) {
    return new Message(MessageType.LEADER, id, position, new Date().toISOString(), {});
  }

  static createAskForLeaderMessage(id: string, position: Tile) {
    return new Message(MessageType.ASKFORLEADER, id, position, new Date().toISOString(), {});
  }

  static createAskForPlanMessage(id: string, position: Tile) {
    return new Message(MessageType.ASKFORPLAN, id, position, new Date().toISOString(), {});
  }

  static createPlanMessage(id: string, position: Tile, actions: Action[]) {
    return new Message(MessageType.PLAN, id, position, new Date().toISOString(), { actions });
  }

  static createAckAction(id: string, position: Tile) {
    return new Message(MessageType.ACKACTION, id, position, new Date().toISOString(), {});
  }
}

export default MessageFactory;
