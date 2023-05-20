import { DeliverooApi } from '@unitn-asa/deliveroo-js-client';
import log from 'loglevel';
import Config from './config.js';
import DeliverooMap from './src/belief-sets/matrix-map.js';
import { Action } from './src/belief-sets/utils.js';

switch (Config.LogLevel) {
  case 'DEBUG':
    log.setLevel('DEBUG');
    break;
  case 'INFO':
    log.setLevel('INFO');
    break;
  case 'WARN':
    log.setLevel('WARN');
    break;
  case 'ERROR':
    log.setLevel('ERROR');
    break;
  case 'SILENT':
    log.setLevel('SILENT');
    break;
  case 'TRACE':
    log.setLevel('TRACE');
    break;
}

log.info(`INFO : sense you ${Config.SenseYou}`);
log.info(`INFO : sense agents ${Config.SenseAgents}`);
log.info(`INFO : sense parcels ${Config.SenseParcels}`);
log.info(`INFO : take actions ${Config.TakeActions}`);

const client = new DeliverooApi(
  `http://localhost:${Config.Port}`,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjNiNzNlOGUyYjllIiwibmFtZSI6InRlc3QxIiwiaWF0IjoxNjgwNjQyMDIwfQ.H1EOanRFuikvCMJ7RZfQE0P6hJaDVWCaA20yCIL2pz8'
);

let parcelDecayLR: number;
if (typeof Config.ParcelDecayLearningRate === 'string') parcelDecayLR = parseFloat(Config.ParcelDecayLearningRate);
else parcelDecayLR = Config.ParcelDecayLearningRate;
let mainPlayerSpeedLR: number;
if (typeof Config.MainPlayerSpeedLearningRate === 'string')
  mainPlayerSpeedLR = parseFloat(Config.MainPlayerSpeedLearningRate);
else mainPlayerSpeedLR = Config.MainPlayerSpeedLearningRate;

const BrainClass = Config.Brain;
log.info('INFO : using brain', BrainClass.name);
const agent = new BrainClass(mainPlayerSpeedLR);
client.socket.on('map', (width: number, height: number, tiles: any) => {
  agent.beliefSet = new DeliverooMap(width, height, tiles, parcelDecayLR);
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
        switch (move) {
          case Action.UNDEFINED:
            break;
          case Action.PICKUP:
            log.debug(`INFO : ${move} action taken`);
            await client.pickup();
            break;
          case Action.PUTDOWN:
            log.debug(`INFO : ${move} action taken`);
            await client.putdown();
            break;
          default:
            log.debug(`INFO : ${move} action taken`);
            await client.move(move);
            break;
        }
      }
    }
  });
