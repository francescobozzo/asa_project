import { DeliverooApi } from '@unitn-asa/deliveroo-js-client';
import Config from './config.js';
import Carrier from './src/agents/carrier.js';
import { Agent } from './src/belief-sets/agent.js';
import { Parcel } from './src/belief-sets/parcel.js';
import Tile from './src/belief-sets/tile.js';
import Message from './src/messages/Message.js';

let actionErrors = 0;
let actionInProgress = false;
const client = new DeliverooApi(`http://localhost:${Config.Port}`, Config.Token);
const carrier = new Carrier(
  client,
  Config.BrainType,
  Config.ParcelDecayLearningRate,
  Config.MainPlayerSpeedLearningRate,
  Config.AgentClock
);

client.socket.on('map', (width: number, height: number, tiles: any) => {
  carrier.initMap(width, height, tiles);
});

client.socket.on('agents sensing', (agents: any[]) => {
  const parsedAgents = agents.map((agent) => new Agent(agent.id, agent.me, agent.x, agent.y, agent.score, true));
  carrier.senseAgents(parsedAgents, false);
});

client.socket.on('parcels sensing', (parcels: any) => {
  const parsedParcels = parcels.map(
    (parcel) => new Parcel(parcel.id, parcel.x, parcel.y, parcel.carriedBy, parcel.reward, true)
  );
  carrier.senseParcels(parsedParcels, false);
  carrier.updateParcelDecayEstimation();
});

client.socket.on('you', (me: any) => {
  const parsedMe = new Agent(me.id, me.name, me.x, me.y, me.score, true);
  carrier.senseYou(parsedMe);
});

client.socket.on('msg', async (id: string, name: string, messageRaw: any, reply) => {
  carrier.senseMessage(
    new Message(
      messageRaw.type,
      messageRaw.senderId,
      new Tile(messageRaw.senderPosition.x, messageRaw.senderPosition.y),
      messageRaw.timestamp,
      messageRaw.payload
    )
  );
});
