# PDDL {#sec:pddl}
Throughout the project, we developed two PDDL planning approaches:

- PDDL planning one agent at a time: This approach involves a single-agent pathfinder that picks up all requested parcels and delivers them collectively. It is used in the single agent approach, distributed multiagent, and plan communication multiagent scenarios.
- PDDL planning more agents at a time: This approach employs a sophisticated multiagent planner capable of handling multiple agents simultaneously. It is utilized in the action dispatch multiagent approach.

## PDDL planning one agent at a time {#sec:one-pddl}
The initial PDDL approach we implemented involves a straightforward implementation of an agent. This agent is capable of starting from a given position, collecting a specified list of parcels, and delivering them to designated delivery zones in the map. Due to the limitations of PDDL, it is not possible to prioritize parcels based on their reward and distance. As a result, this approach heavily relies on the agent's intentions when filtering parcels, as explained in Section {@sec:potential-parcel-score}.

Here are the details of the predicates, actions, and problem initialization used in our basic PDDL model:

Predicates:

- "at" defines the position of the agent and parcels.
- "can-move" determines whether it is possible to move between two tiles.
- "carrying" indicates whether the agent is carrying a specific parcel.
- "delivery" identifies whether a position on the map is a delivery zone or not.
- "delivered" signifies that all the given parcels have been delivered. It always represents the goal of the plan.

Actions:

- "move": the agent can move from one tile to a neighboring tile.
- "pickup": the agent can collect a parcel present on the current tile.
- "putdown": the agent can place all the carried parcels that have been asked to collect onto the current tile.

Problem initialization:

- A list of all walkable tiles.
- A list of available moves between walkable tiles.
- A list of tiles designated as delivery zones.
- A list of all the parcels that the agent must deliver in order to complete the plan.

Goal: deliver all the listed parcels.

## PDDL planning more agents at a time {#sec:many-pddl}
The main drawback of our initial PDDL approach is the lack of collaboration among multiple agents to solve a shared problem. As discussed in the Section {@sec:benchmarking}, certain problems cannot be solved unless the two agents collaborate with each other. To address this issue, we decided to develop a more intricate belief model to be sent to the PDDL Online Planner, utilizing complex PDDL constructs such as typings and forall/when clauses.

Here are the details of the types, predicates, actions, and problem initialization used in our enhanced model:

Types:

- "entity" and "position" are subclasses of "object".
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
- A list of all the parcels that must be delivered, including both those to pick up and the ones already carried.
- A list of blocked tiles occupied by agents.

Goal: delivered all the listed parcels.

The final PDDL plan involves a multiagent approach, where multiple agents collaborate to solve a single problem. To implement this approach using the leader-election paradigm, we chose to have the leader send one action at a time (similar to a single-action plan) to the agent responsible for executing the action according to the planned schedule. As described in {@sec:action-dispatch}, this mechanism also necessitates an acknowledgment messaging system from the agent performing the action to the team leader.
