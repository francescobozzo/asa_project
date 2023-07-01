import Message, { MessageType } from './Message.js';

export default class MessageHandler {
  handleInform(message) {
    const parcels = message.getInfoParcels();
    const agents = message.getInfoAgents();
  }
}
