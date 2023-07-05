# PDDL

During the course of the project we developed two different PDDL-based solutions.

## Simple PDDL
The first PDDL approach we implemented consists on the simple implementation of an agent that is able to start from a position, collect a list of specified parcels, and deliver them to a delivery zone. Since there is no way for PDDL to skip some parcels according to their reward and distance, this approach is mainly baised to the agent's intentions when filtering parcels, as we described in the previous sections.


## Complex PDDL {#sec:complex-pddl}
The main drawback of our initial PDDL approach is the lack of collaboration among multiple agents to solve a shared problem. As discussed in the Section {@sec:benchmarking}, certain problems cannot be solved unless the two agents collaborate with each other. To address this issue, we decided to develop a more intricate belief model to be sent to the PDDL Online Planner, utilizing complex PDDL constructs such as typings and forall/when clauses.

Here are the details of the types, predicates, and actions used in our enhanced model:

Types:

- "entity" and "position" are subclasses of "object."
- "agent" and "parcel" are subclasses of "entity", as both can be assigned positions on the map.

Predicates:

- "at" defines the position of an entity on the map.
- "can-move" determines whether it is possible to move between two tiles.
- "carrying" indicates whether an agent is carrying a specific parcel.
- "delivery" identifies whether a position on the map is a delivery zone or not.
- "delivered" signifies whether a parcel has been delivered.
- "blocked" is used to block potential agent movements to tiles already occupied by other agents.

Actions:
- "move": an agent can move from one tile to a neighboring tile that is not blocked.
- "pickup": an agent can collect parcels present on the current tile if they are not already being carried by any agent.
- "putdown": an agent can place all the parcels it is carrying onto the current tile.
- "deliver": an agent can deliver all the parcels it is carrying if the current tile is a delivery zone.

Problem initialization:

- A list of all walkable tiles.
- A list of available moves between walkable tiles.
- A list of tiles designated as delivery zones.
- A list of all agents participating in the shared plan.
- A list of parcels, including both those to pick up and the ones already carried.
- A list of blocked tiles occupied by agents.

The final PDDL plan involves a multiagent approach, where multiple agents collaborate to solve a single problem. To implement this approach using the leader-election paradigm, we chose to have the leader send one action at a time (similar to a single-action plan) to the agent responsible for executing the action according to the planned schedule. As described in {@sec:action-dispatch}, this mechanism also necessitates an acknowledgment messaging system from the agent performing the action to the team leader.
