import { Agent } from '../belief-sets/agent.js';
import BeliefSet from '../belief-sets/belief-set.js';
import { Parcel } from '../belief-sets/parcel.js';
import Message, { MessageType } from '../messages/Message.js';
import MessageHandler from '../messages/Handler.js';
import IBrain from './IBrain.js';

export default class Carrier {
  private brain: IBrain;
  private beliefSet: BeliefSet;
  private handler: MessageHandler = new MessageHandler();

  constructor(parcelDecayLR: number) {
    this.beliefSet = new BeliefSet(parcelDecayLR);
  }

  initMap(width: number, height: number, tiles: any[]) {
    this.beliefSet.initMap(width, height, tiles);
  }

  senseAgents(agents: Agent[], externalPerception: boolean) {
    this.beliefSet.senseAgents(agents, externalPerception);
  }

  senseParcels(parcels: Parcel[], externalPerception: boolean) {
    this.beliefSet.senseParcels(parcels, externalPerception);
  }

  senseYou(me: Agent) {
    this.beliefSet.senseYou(me);
  }

  handle(message: Message) {
    switch (message.type) {
      case MessageType.INFORM:
        this.handler.handleInform(message);
        break;
      case MessageType.INTENTION:
        break;
      case MessageType.ASKFORLEADER:
        break;
      case MessageType.LEADER:
        break;
      case MessageType.ASKFORPLAN:
        break;
      case MessageType.PLAN:
        break;
    }
  }

  printMap() {
    this.beliefSet.printMap();
  }
}
