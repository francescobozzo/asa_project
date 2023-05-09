import { DeliverooApi } from '@unitn-asa/deliveroo-js-client';
import IntentionPlanner from './src/agents/intention-planner.js';
import DeliverooMap from './src/belief-sets/matrix-map.js';

const client = new DeliverooApi(
  'http://localhost:8080',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjNiNzNlOGUyYjllIiwibmFtZSI6InRlc3QxIiwiaWF0IjoxNjgwNjQyMDIwfQ.H1EOanRFuikvCMJ7RZfQE0P6hJaDVWCaA20yCIL2pz8'
);

const agent = new IntentionPlanner(false);
client.socket.on('map', (width: number, height: number, tiles: any) => {
  agent.beliefSet = new DeliverooMap(width, height, tiles);
  agent.deliveryStations = tiles.filter((tile: any) => tile.delivery);
});
client.socket.on('you', (me: any) => {
  if (agent.beliefSet !== null) agent.updateMe(me.id, me.name, me.x, me.y, me.score);
});
client.socket.on('agents sensing', (agents: any) => {
  if (agent.beliefSet !== null) agent.agentsSensingHandler(agents);
});
client.socket.on('parcels sensing', async (parcels) => {
  if (agent.beliefSet !== null) {
    agent.parcelSensingHandler(parcels);
    const move = agent.getNextAction();
    console.log('move', move);
    switch (move) {
      case 'up':
      case 'down':
      case 'left':
      case 'right':
        await client.move(move);
        break;
      case 'pickup':
        await client.pickup();
        break;
      default:
        break;
    }
  }
});

// await client.move('right');
// const allowedMoves = ['up', 'right', 'up', 'down'];
// while (true) {
//   const randomMove = allowedMoves[Math.floor(Math.random() * allowedMoves.length)];
//   await client.move(randomMove);
// }
// let config;
// client.socket.on('config', (c) => {
//     config = c;
// })

// client.socket.on('you', (id, name, x, y, score) =>{
//     // console.log(id, name, x, y, score)
// })

// client.socket.on('parcel sensing', (parcels) =>{
//     console.log(parcels)
// })
