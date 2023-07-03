# PDDL

During the course of the project we developed two different PDDL-based solutions.

## Simple PDDL
The first PDDL approach we implemented consists on the simple implementation of an agent that is able to start from a position, collect a list of specified parcels, and deliver them to a delivery zone. Since there is no way for PDDL to skip some parcels according to their reward and distance, this approach is mainly baised to the agent's intentions when filtering parcels, as we described in the previous sections.


## Complex PDDL
The biggest downside of our first PDDL approach is the fact that multiple agents do not actually act together to solve a shared problem. As we will see in the Benchmark section, there are same problems in which there is no solution in case the two agents do not collaborate between each other. For this specific purpose, we decided to build a more detailed model of the belief set to be sent to the PDDL Online Planner by using some more complext PDDL constructs such as typings and forall/when clauses.

Types:
- entity and position which are subclasses of object
- agent and parcel which are subclasses of entity (since for both of them we can assign a position in them map)

Predicates:
- at: defines the position of an entity in the map
- can-move: defines whether it is possible to move between two tiles
- carrying: states whether an agent is carrying a specific parcel
- delivery: defines whether a position in the map is a delivery zone or not
- delivered: defines whether a parcel has been delivered
- blocked: it is used to block tiles potential agent movemenets to the tile that are already occupied by other agents.

Actions:
- move: an agent can move from a tile to specifically one of its neighbors that is not blocked
- pickup: an agent can pickup all the packages that are placed on the current tile where the agent is located that are not carried by any other agents.
- putdown: an agent can put down all the parcels that it is carrying to the current tile where it is placed
- deliver: an agent can deliver all the parcels that it is carrying if the tile where it is placed is a delivery zone.

Problem initialization:
- list of all the walkable tiles
- list of the available move between walkable tiles
- list of tiles that are defined as delivery zones
- list of all the agents that partecipate in the shared plan
- list of all the parcels to pickup (also considering already picked up ones)
- list of the blocked tiles (which are occupied by agents)

The final PDDL plan consists of a multiagent plan which involves multiple agents to solve a single problem. Therefore, when implementing this approach with the leader-member paradigm, we opted for having the leader to send a single action at a time (as a sort of single action plan) to the agent that is supposed to act according to the plan schedule
