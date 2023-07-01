import Config from './config.js';
import { Agent } from './src/belief-sets/agent.js';
import { Parcel } from './src/belief-sets/parcel.js';
import BeliefSet from './src/belief-sets/belief-set.js';
import { DeliverooApi } from '@unitn-asa/deliveroo-js-client';
import Carrier from './src/agents/carrier.js';

const client = new DeliverooApi(`http://localhost:${Config.Port}`, Config.Token);

const carrier = new Carrier(Config.ParcelDecayLearningRate);

client.socket.on('map', (width: number, height: number, tiles: any) => {
  carrier.initMap(width, height, tiles);
  carrier.printMap();
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
});

client.socket.on('you', (me: any) => {
  const parsedMe = new Agent(me.id, me.name, me.x, me.y, me.score, true);
  carrier.senseYou(parsedMe);
});

client.socket.on('msg', async (id: string, name: string, messageRaw: any, reply) => {});
