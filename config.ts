import * as dotenv from 'dotenv';
import AstarIntentionPlanner from './src/agents/astar-intention-planner.js';
import PddlIntentionPlanner from './src/agents/pddl-intention-planner copy.js';

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

export default {
  Port: process.env.PORT ?? 8080,
  LogLevel: process.env.LOG_LEVEL ?? 'WARN',
  SenseYou: process.env.SENSE_YOU ? process.env.SENSE_YOU === 'true' : true,
  SenseAgents: process.env.SENSE_AGENTS ? process.env.SENSE_YOU === 'true' : true,
  SenseParcels: process.env.SENSE_PARCELS ? process.env.SENSE_PARCELS === 'true' : true,
  TakeActions: process.env.TAKE_ACTIONS ? process.env.TAKE_ACTIONS === 'true' : true,
  ParcelDecayLearningRate: process.env.PARCEL_DECAY_LEARNING_RATE ? process.env.PARCEL_DECAY_LEARNING_RATE : 0.01,
  MainPlayerSpeedLearningRate: process.env.MAIN_PLAYER_SPEED_LEARNING_RATE
    ? process.env.MAIN_PLAYER_SPEED_LEARNING_RATE
    : 0.5,
  Brain: brain,
};
