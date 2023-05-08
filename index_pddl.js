import { DeliverooApi } from '@unitn-asa/deliveroo-js-client';
import DeliverooMap from './belief-sets/matrix-map.js';
import { getPlan, pddlToTile, tileToPddl } from './belief-sets/pddl.js';
import { computeAction } from './belief-sets/utils.js';

const client = new DeliverooApi(
  'http://localhost:8080',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjNiNzNlOGUyYjllIiwibmFtZSI6InRlc3QxIiwiaWF0IjoxNjgwNjQyMDIwfQ.H1EOanRFuikvCMJ7RZfQE0P6hJaDVWCaA20yCIL2pz8'
);

client.socket.on('map', (width, height, tiles) => {
  const agent = { x: null, y: null };
  const beliefSet = new DeliverooMap(width, height, tiles);
  console.log(beliefSet.toString());

  const { objects, predicates } = beliefSet.toPddlDomain();

  client.socket.on('parcels sensing', async (parcels) => {
    if (Number.isInteger(agent.x) && Number.isInteger(agent.y)) {
      const newPredicates = predicates + ` (at ${tileToPddl(agent.y, agent.x)})`;
      const plan = await getPlan(objects, newPredicates);
      console.log(plan);

      for (const action of plan.values()) {
        switch (action.action) {
          case 'move':
            const from = pddlToTile(action.args[0]);
            const to = pddlToTile(action.args[1]);

            const direction = computeAction(from.y, from.x, to.y, to.x); // FIX: for some reason, y and x are swapped
            console.log(direction);
            // client.move(direction);
            break;
          default:
            console.error('Action not supported yet: ', action.action);
            break;
        }
      }

      process.exit();
    }
  });
  client.socket.on('you', (me) => {
    agent.x = me.x;
    agent.y = me.y;
  });
});
