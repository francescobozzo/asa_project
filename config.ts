import * as dotenv from 'dotenv';

dotenv.config();

export default {
  Port: process.env.PORT ?? 8080,
  LogLevel: process.env.LOG_LEVEL ?? 'WARN',
  SenseYou: process.env.SENSE_YOU ? process.env.SENSE_YOU === 'true' : true,
  SenseAgents: process.env.SENSE_AGENTS ? process.env.SENSE_YOU === 'true' : true,
  SenseParcels: process.env.SENSE_PARCELS ? process.env.SENSE_PARCELS === 'true' : true,
  TakeActions: process.env.TAKE_ACTIONS ? process.env.TAKE_ACTIONS === 'true' : true,
};