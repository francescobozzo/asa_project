import { DeliverooApi } from '@unitn-asa/deliveroo-js-client';
import log from 'loglevel';
import Config from './config.js';
import DeliverooMap from './src/belief-sets/matrix-map.js';
import Tile from './src/belief-sets/tile.js';
import { Action } from './src/belief-sets/utils.js';
import Message, { MessageType } from './src/messages/Message.js';
import MessageFactory from './src/messages/MessageFactory.js';

const BrainClass = Config.Brain;
log.info(`INFO : sense you ${Config.SenseYou}`);
log.info(`INFO : sense agents ${Config.SenseAgents}`);
log.info(`INFO : sense parcels ${Config.SenseParcels}`);
log.info(`INFO : take actions ${Config.TakeActions}`);
log.info('INFO : using brain', BrainClass.name);
log.info(`INFO : main player speed estimation learning rate ${Config.MainPlayerSpeedLearningRate}`);
log.info(`INFO : parcel decay estimation learning rate ${Config.ParcelDecayLearningRate}`);

const client = new DeliverooApi(`http://localhost:${Config.Port}`, Config.Token);

const agent = new BrainClass(
  Config.MainPlayerSpeedLearningRate,
  Config.CumulatedCarriedPenaltyFactor,
  Config.UseProbabilisticModel,
  Config.MultiAgentLeaderVersion,
  client
);
let isLeaderInitialised = false;

client.socket.on('map', (width: number, height: number, tiles: any) => {
  agent.beliefSet = new DeliverooMap(width, height, tiles, Config.ParcelDecayLearningRate);
});

if (Config.SenseYou)
  client.socket.on('you', (me: any) => {
    if (agent.beliefSet !== null) agent.updateMe(me.id, me.name, me.x, me.y, me.score);

    if (!isLeaderInitialised && Config.MultiAgentLeaderVersion) {
      isLeaderInitialised = true;

      client.shout(MessageFactory.createAskForLeaderMessage(agent.id, agent.beliefSet.getTile(agent.x, agent.y)));

      setTimeout(() => {
        if (!agent.leaderId) {
          agent.leaderId = agent.id;

          client.shout(MessageFactory.createLeaderMessage(agent.id, agent.beliefSet.getTile(agent.x, agent.y)));
        }
      }, 5000);
    }
  });

if (Config.SenseAgents)
  client.socket.on('agents sensing', (agents: any) => {
    if (agent.beliefSet !== null) {
      agent.agentsSensingHandler(agents);
      if (Config.MultiAgentDistributedVersion)
        client.shout(
          MessageFactory.createInformAgentMessage(
            agent.id,
            agent.beliefSet.getTile(agent.x, agent.y),
            Array.from(agent.beliefSet.getAgents().values())
          )
        );
    }
  });

if (Config.SenseParcels)
  client.socket.on('parcels sensing', async (parcels) => {
    if (agent.beliefSet !== null) {
      const parcelsToPick = agent.parcelSensingHandler(parcels);

      if (Config.MultiAgentDistributedVersion) {
        client.shout(
          MessageFactory.createInformParcelMessage(
            agent.id,
            agent.beliefSet.getTile(agent.x, agent.y),
            agent.beliefSet.getVisibleParcels()
          )
        );

        if (Config.MultiAgentDistributedVersion && parcelsToPick && parcelsToPick.length > 0) {
          client.shout(
            MessageFactory.createParcelsIntentionMessage(
              agent.id,
              agent.beliefSet.getTile(agent.x, agent.y),
              parcelsToPick.map((parcel) => parcel.id)
            )
          );
        }
      }
    }
  });

if (Config.MultiAgentLeaderVersion || Config.MultiAgentDistributedVersion) {
  client.socket.on('msg', (id: string, name: string, messageRaw: any, reply) => {
    console.log(messageRaw);
    const message = new Message(
      messageRaw.type,
      messageRaw.senderId,
      new Tile(messageRaw.senderPosition.x, messageRaw.senderPosition.y),
      messageRaw.timestamp,
      messageRaw.payload
    );

    agent.beliefSet.updateAgentsFromMessageSender(message.senderId, name, message.senderPosition);

    switch (message.type) {
      case MessageType.INFORM:
        const parcels = message.getInfoParcels();
        const agents = message.getInfoAgents();

        agent.beliefSet.updateParcelsFromMessagePayload(parcels);
        agent.beliefSet.updateAgentsFromMessagePayload(agents);
        break;
      case MessageType.INTENTION:
        for (const parcelId of message.getParcelIdsIntention()) {
          agent.beliefSet.parcelsToAvoidIds.add(parcelId);
        }
        break;
      case MessageType.ASKFORLEADER:
        if (agent.leaderId === agent.id) {
          client.shout(MessageFactory.createLeaderMessage(agent.id, agent.beliefSet.getTile(agent.x, agent.y)));
        }
        break;
      case MessageType.LEADER:
        agent.leaderId = message.senderId;
        break;
      case MessageType.ASKFORPLAN:
        client.say(
          message.senderId,
          MessageFactory.createPlanMessage(agent.id, agent.beliefSet.getTile(agent.x, agent.y), [Action.RIGHT])
        );
        break;
      case MessageType.PLAN:
        const plan = message.getPlan();
        agent.plan = plan;
        agent.isAskingForANewPlan = false;
        break;
    }
  });
}

let actionInProgress = false;
let actionErrors = 0;
const agentDoAction = async () => {
  if (Config.TakeActions && !actionInProgress) {
    actionInProgress = true;

    if (actionErrors >= Config.ActionErrorPatience) {
      agent.setGoal();
      const parcelsToPick = agent.computeNewPlan();
      if (Config.MultiAgentDistributedVersion && parcelsToPick && parcelsToPick.length > 0) {
        client.shout(
          MessageFactory.createParcelsIntentionMessage(
            agent.id,
            agent.beliefSet.getTile(agent.x, agent.y),
            parcelsToPick.map((parcel) => parcel.id)
          )
        );
      }
      actionErrors = 0;
    }

    const move = agent.getNextAction();

    let result = null;
    switch (move) {
      case Action.UNDEFINED:
        break;
      case Action.PICKUP:
        log.info(`INFO : ${move} action taken`);
        result = await client.pickup();
        if (result.length >= 0) agent.actionAccomplished();
        else actionErrors += 1;
        break;
      case Action.PUTDOWN:
        log.info(`INFO : ${move} action taken`);
        result = await client.putdown();
        if (result.length >= 0) agent.actionAccomplished();
        else actionErrors += 1;
        break;
      default:
        log.info(`INFO : ${move} action taken`);
        result = await client.move(move.toString());
        if (result !== false) agent.actionAccomplished();
        else actionErrors += 1;

        break;
    }
    actionInProgress = false;
  }
};

setInterval(agentDoAction, Config.AgentClock);

// update not visible parcels value using a sort of dynamic set interval
var updateValueNotVisibleParcels = function () {
  if (agent.beliefSet) {
    for (const parcelId of agent.beliefSet.notVisibleParcelIds.values()) {
      const parcel = agent.beliefSet.getParcels().get(parcelId);
      parcel.reward -= 1;

      if (!agent.beliefSet.getTile(parcel.x, parcel.y).isDelivery)
        agent.beliefSet.setTileValue(parcel.x, parcel.y, parcel.reward);
    }

    const parcelsIdToDelete: string[] = (Array.from(agent.beliefSet.getParcels().keys()) as string[]).filter(
      (parcelId) =>
        !agent.beliefSet.notVisibleParcelIds.has(parcelId) && !agent.beliefSet.visibleParcelIds.has(parcelId)
    );
    for (const parcelId of parcelsIdToDelete) {
      const parcel = agent.beliefSet.parcels.get(parcelId);
      agent.beliefSet.setTileValue(parcel.x, parcel.y, 0);
      agent.beliefSet.parcels.delete(parcelId);
    }
  }
  setTimeout(updateValueNotVisibleParcels, agent.beliefSet?.getParcelsDecayEstimation() * 1000 ?? 1000);
};
setTimeout(updateValueNotVisibleParcels, agent.beliefSet?.getParcelsDecayEstimation() * 1000 ?? 1000);
