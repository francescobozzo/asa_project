import * as dotenv from 'dotenv';
import log from 'loglevel';
import AstarIntentionPlanner from './src/agents/astar-intention-planner.js';
import PddlIntentionPlanner from './src/agents/pddl-intention-planner.js';

dotenv.config();

let brain = null;
switch (process.env.BRAIN) {
  case 'PDDL':
    brain = PddlIntentionPlanner;
    break;
  case 'ASTAR':
    brain = AstarIntentionPlanner;
    break;
  default:
    brain = PddlIntentionPlanner;
    break;
}

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
  Brain: brain,
  AgentClock: parseInt(process.env.AGENT_CLOCK) ?? 10,
  ActionErrorPatience: parseInt(process.env.ACTION_ERROR_PATIENCE) ?? 10,
  CumulatedCarriedPenaltyFactor: parseFloat(process.env.CUMULATED_CARRIED_PENALTY_FACTOR) ?? 0.15,
  UseProbabilisticModel: process.env.USE_PROBABILISTIC_MODEL ? process.env.USE_PROBABILISTIC_MODEL === 'true' : false,
  MultiAgent: process.env.MULTI_AGENT ? process.env.MULTI_AGENT === 'true' : true,
  MultiAgentLeaderVersion: process.env.MULTI_AGENT_LEADER_VERSION
    ? process.env.MULTI_AGENT_LEADER_VERSION === 'true'
    : true,
};
