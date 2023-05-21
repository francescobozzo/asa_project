import { DeliverooApi } from '@unitn-asa/deliveroo-js-client';
import log from 'loglevel';
import Config from './config.js';
import DeliverooMap from './src/belief-sets/matrix-map.js';
import { Action } from './src/belief-sets/utils.js';

const BrainClass = Config.Brain;
log.info(`INFO : sense you ${Config.SenseYou}`);
log.info(`INFO : sense agents ${Config.SenseAgents}`);
log.info(`INFO : sense parcels ${Config.SenseParcels}`);
log.info(`INFO : take actions ${Config.TakeActions}`);
log.info('INFO : using brain', BrainClass.name);
log.info(`INFO : main player speed estimation learning rate ${Config.MainPlayerSpeedLearningRate}`);
log.info(`INFO : parcel decay estimation learning rate ${Config.ParcelDecayLearningRate}`);

const client = new DeliverooApi(`http://localhost:${Config.Port}`, Config.Token);

const agent = new BrainClass(Config.MainPlayerSpeedLearningRate);
client.socket.on('map', (width: number, height: number, tiles: any) => {
  agent.beliefSet = new DeliverooMap(width, height, tiles, Config.ParcelDecayLearningRate);
});

if (Config.SenseYou)
  client.socket.on('you', (me: any) => {
    if (agent.beliefSet !== null) agent.updateMe(me.id, me.name, me.x, me.y, me.score);
  });

if (Config.SenseAgents)
  client.socket.on('agents sensing', (agents: any) => {
    if (agent.beliefSet !== null) agent.agentsSensingHandler(agents);
  });

if (Config.SenseParcels)
  client.socket.on('parcels sensing', async (parcels) => {
    if (agent.beliefSet !== null) {
      agent.parcelSensingHandler(parcels);
      if (Config.TakeActions) {
        const move = agent.getNextAction();

        let result = null;
        switch (move) {
          case Action.UNDEFINED:
            break;
          case Action.PICKUP:
            log.debug(`INFO : ${move} action taken`);
            result = await client.pickup();
            if (result.length >= 0) agent.actionAccomplished();
            break;
          case Action.PUTDOWN:
            log.debug(`INFO : ${move} action taken`);
            result = await client.putdown();
            if (result.length >= 0) agent.actionAccomplished();
            break;
          default:
            log.debug(`INFO : ${move} action taken`);
            result = await client.move(move.toString());
            if (result !== false) agent.actionAccomplished();
            break;
        }
        console.log(result);
      }
    }
  });
