import { DeliverooApi } from '@unitn-asa/deliveroo-js-client';
import IntentionPlanner from './agents/intention-planner.js';
import DeliverooMap from './belief-sets/matrix-map.js';
import { TileStatus, TupleSet, Tuple } from './belief-sets/utils.js';

const client = new DeliverooApi(
  'http://localhost:8080',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjNiNzNlOGUyYjllIiwibmFtZSI6InRlc3QxIiwiaWF0IjoxNjgwNjQyMDIwfQ.H1EOanRFuikvCMJ7RZfQE0P6hJaDVWCaA20yCIL2pz8'
);

client.socket.on('map', (width, height, tiles) => {
  const beliefSet = new DeliverooMap(width, height, tiles);
  console.log(beliefSet.toString());

  const agent = new IntentionPlanner(beliefSet, true);
  // client.socket.on('agents sensing', (agents) => {
  //   agent.agentsSensingHandler(agents);
  // });
  // client.socket.on('parcels sensing', (parcels) => {
  //   agent.parcelSensingHandler(parcels);
  // });
  client.socket.on('you', (me) => {
    // agent.updateMe(me.id, me.name, me.x, me.y, me.score);
    if (Number.isInteger(me.x) && Number.isInteger(me.y)) {
      const goalX = 1;
      const goalY = 9;
      const cameFrom = agent.beliefSet.shortestPathFromTo(me.x, me.y, goalX, goalY);
      console.log(cameFrom);
      let moves = [];
      let current = cameFrom.get(Tuple(goalX, goalY));
      while (current !== null && current !== undefined) {
        moves.push(current[2]);
        current = cameFrom.get(Tuple(current[0], current[1]));
      }
      console.log(moves);
      client.move(moves.pop());
    }
  });
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
