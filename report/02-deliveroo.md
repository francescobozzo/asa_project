\newpage
# Deliveroo {#sec:deliveroo}
*Deliveroo* is the environement provided to test the developed agents of the project, it is composed of a grid of tiles divided into two main categories: walkable (green and red) and not walkable (black). A walkable tile can be a delivery zone (red).

Several parcels, represented by cubes, are scattered around the map, the goal of the agent is to move across it collecting the largest number of parcels. The final objective is to deliver collected elements in one delivery zone.

![An example of grid map with different parcels and agents.](./images/grid-map.png){ width=250px #fig:grid-map}

The agent has can move up, down, left, and right. It can pass through parcels and delivery zones but it is blocked by other agents that can be play the game at the same time.

Multiple parcels can be carried by one agent, and the value of them continues to decrease 

The agent can sense other agents and parcels, respectively within two well defined radiuses.

There are several parameters associated to the environment:

- *parcel tick*: frequency of parcels' values decrease;
- *movement speed*: time required for an agent's move;
- *parcel value and density*: maximum number of parcels allowed in the map and associated starting value amplitude.
- qui in generale aggiungerei principalmente quelli che poi sono piu' interessanti per la nostra spiegatzione nelle pagine dopo.

Given all the customizable parameters and the size of the map, the number of different game scenarios are huge. An agent must be well developed in order to be able to act in all of them, both alone or cooperating with other agents.

There are two main strategies that can be employed for the solution of the game:

- *single-agent*: the agent acts alone;
- *multi-agent*: the agent communicates with other mates to share information for the maximization of the summuation of all the rewards;
