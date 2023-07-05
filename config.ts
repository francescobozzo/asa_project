import * as dotenv from 'dotenv';
import log from 'loglevel';

export enum BRAIN_TYPE {
  AStarSingelAgent,
  PddlSingleAgent,
  PddlMultiAgentDistributedVersion,
  PddlMultiAgentLeaderVersionSendPlan,
  PddlMultiAgentLeaderVersionSendAction,
}

const brainTypeMap = new Map<string, BRAIN_TYPE>([
  ['AStarSingelAgent', BRAIN_TYPE.AStarSingelAgent],
  ['PddlSingleAgent', BRAIN_TYPE.PddlSingleAgent],
  ['PddlMultiAgentDistributedVersion', BRAIN_TYPE.PddlMultiAgentDistributedVersion],
  ['PddlMultiAgentLeaderVersionSendPlan', BRAIN_TYPE.PddlMultiAgentLeaderVersionSendPlan],
  ['PddlMultiAgentLeaderVersionSendAction', BRAIN_TYPE.PddlMultiAgentLeaderVersionSendAction],
]);

dotenv.config();

switch (process.env.LOG_LEVEL || 'WARN') {
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

export default {
  Port: process.env.PORT ?? 8080,
  Token: process.env.TOKEN,
  LogLevel: process.env.LOG_LEVEL ?? 'WARN',
  SenseYou: process.env.SENSE_YOU ? process.env.SENSE_YOU === 'true' : true,
  SenseAgents: process.env.SENSE_AGENTS ? process.env.SENSE_YOU === 'true' : true,
  SenseParcels: process.env.SENSE_PARCELS ? process.env.SENSE_PARCELS === 'true' : true,
  TakeActions: process.env.TAKE_ACTIONS ? process.env.TAKE_ACTIONS === 'true' : true,
  ParcelDecayLearningRate: process.env.PARCEL_DECAY_LEARNING_RATE
    ? parseFloat(process.env.PARCEL_DECAY_LEARNING_RATE)
    : 0.01,
  MainPlayerSpeedLearningRate: process.env.MAIN_PLAYER_SPEED_LEARNING_RATE
    ? parseFloat(process.env.MAIN_PLAYER_SPEED_LEARNING_RATE)
    : 0.5,
  BrainType: brainTypeMap.get(process.env.BRAIN_TYPE) ?? BRAIN_TYPE.PddlSingleAgent,
  AgentClock: parseInt(process.env.AGENT_CLOCK) ?? 10,
  ActionErrorPatience: parseInt(process.env.ACTION_ERROR_PATIENCE) ?? 10,
  CumulatedCarriedPenaltyFactor: parseFloat(process.env.CUMULATED_CARRIED_PENALTY_FACTOR) ?? 0.15,
  UseProbabilisticModel: process.env.USE_PROBABILISTIC_MODEL ? process.env.USE_PROBABILISTIC_MODEL === 'true' : false,
  MultiAgentDistributedVersion: process.env.MULTI_AGENT_DISTRIBUTED_VERSION
    ? process.env.MULTI_AGENT_DISTRIBUTED_VERSION === 'true'
    : true,
  MultiAgentLeaderVersion: process.env.MULTI_AGENT_LEADER_VERSION
    ? process.env.MULTI_AGENT_LEADER_VERSION === 'true'
    : true,
  UseTrafficMultiAgentLeaderVersion: process.env.USE_TRAFFIC_MULTI_AGENT_LEADER_VERSION
    ? process.env.USE_TRAFFIC_MULTI_AGENT_LEADER_VERSION === 'true'
    : false,
  MaxCarriedParcel: parseInt(process.env.MAX_CARRIED_PARCEL) ?? 100,
};
