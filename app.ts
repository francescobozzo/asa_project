import Config from './config.js';
import { Agent } from './src/belief-sets/agent.js';
import { Parcel } from './src/belief-sets/parcel.js';
import BeliefSet from './src/belief-sets/belief-set.js';
import { DeliverooApi } from '@unitn-asa/deliveroo-js-client';

const client = new DeliverooApi(`http://localhost:${Config.Port}`, Config.Token);

const beliefSet = new BeliefSet();
client.socket.on('map', (width: number, height: number, tiles: any) => {
  beliefSet.initMap(width, height, tiles);
  beliefSet.printMap();
});

client.socket.on('agents sensing', (agents: any[]) => {
  const parsedAgents = agents.map((agent) => new Agent(agent.id, agent.me, agent.x, agent.y, agent.score, true));
  beliefSet.senseAgents(parsedAgents);
});

client.socket.on('parcels sensing', (parcels: any) => {
  const parsedParcels = parcels.map(
    (parcel) => new Parcel(parcel.id, parcel.x, parcel.y, parcel.carriedBy, parcel.reward, true)
  );
  beliefSet.senseParcels(parcels);
});

client.socket.on('you', (me: any) => {
  const parsedMe = new Agent(me.id, me.name, me.x, me.y, me.score, true);
  beliefSet.senseYou(parsedMe);
});
