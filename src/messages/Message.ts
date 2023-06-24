import Agent from '../belief-sets/agent.js';
import Parcel from '../belief-sets/parcel.js';
import Tile from '../belief-sets/tile.js';

export enum MessageType {
  INFORM = 'inform',
  REQUEST = 'request',
  ACKNOWLEDGE = 'acknowledge',
}

class Message {
  constructor(
    public type: MessageType,
    public senderId: string,
    public senderPosition: Tile,
    public timestamp: string,
    public payload: any
  ) {}

  getInfoAgents(): Agent[] {
    return this.payload.agents
      ? this.payload.agents.map(
          (agentRaw) => new Agent(agentRaw.id, agentRaw.name, agentRaw.x, agentRaw.y, agentRaw.score, false)
        )
      : [];
  }

  getInfoParcels(): Parcel[] {
    return this.payload.parcels
      ? this.payload.parcels.map(
          (parcelRaw) =>
            new Parcel(parcelRaw.id, parcelRaw.x, parcelRaw.y, parcelRaw.carriedBy, parcelRaw.reward, false)
        )
      : [];
  }
}

export default Message;
