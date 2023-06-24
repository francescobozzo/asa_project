import Agent from '../belief-sets/agent.js';
import Parcel from '../belief-sets/parcel.js';
import Tile from '../belief-sets/tile.js';
import Message, { MessageType } from './Message.js';

class MessageFactory {
  static createInformMessage(id: string, position: Tile) {
    return new Message(MessageType.INFORM, id, position, new Date().toISOString(), {});
  }

  static createInformParcelMessage(id: string, position: Tile, parcels: Parcel[]) {
    const message = MessageFactory.createInformMessage(id, position);
    message.payload = { parcels };
    return message;
  }

  static createInformAgentMessage(id: string, position: Tile, agents: Agent[]) {
    const message = MessageFactory.createInformMessage(id, position);
    message.payload = { agents };
    return message;
  }
}

export default MessageFactory;
