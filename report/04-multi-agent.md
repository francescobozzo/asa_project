# Multi agent implementation {#sec:multi-agent}

The communication protocol is based on the provided library that offers multiple endpoints to handle different messages: `say`, `shout`, `ask`, and `broadcast`.

## Information sharing agents
During the game, teams can share the data they sense from the environment between each other. For simplicity, for this specific purpose our agents use broadcast messages that are visible to every agent that is connected to the game.

In this way, every agent can build its one plan based on the information which is sensed by all the other agent across the map.

Moreover, agents also communicate by broadcast message the packages that they are going to pickup with the current plan they just generated. This mechanism helps in reducing the number of collisions of agents in the map and avoiding useless longer paths to pickup already taken parcels.


## Leader-members agents
The leader negotiation is a fundamental step in the multi-agent architecture where one agent is chosen to be the leader who computes all the plans for the other agents. 

### Leader negotiation
The election of the leader is a well known problem in the computer science literature, nevertheless we have decided to keep a simple solution since the focus on the project was something else. The negotiation is achieved thanks to two message types: `askforaleader` and `leader`. The former is sent by every agent as a broadcast communication when they connect to the game (when they receive for the first time their position): as the name says, the message simply asks if a leader has already been elected. The latter is used to communicate the leader identity and it is used only by the agent who has been elected as the leader.

After the `askforleader` message is sent, a timeout of $2.5s$ is set. If no answer by an actual leader is received during that time interval, it means that the game has no already elected leader and consequentially the agent who asked for the leader identity will be elected as the leader itself. At this point, this agent communicates as a broadcast message that it has just elected itself as the leader.

![Leader negotation.](./images/leader_negotiation.png){ width=250px #fig:leader-negotation}

Please, consider that with this simple implementation very rare scenarios where two (or more) agents exactly connect at the same time could generate a race condition that would likely create more than one active leader.
