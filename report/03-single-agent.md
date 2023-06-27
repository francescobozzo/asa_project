# Single agent implementation {#sec:single-agent}
Given the complexity of the environment, several ad-hoc solutions have been implemented to overcome different difficulties and challenges.

## Manhattan distance {#sec:manhattan-distance}
The *Manhattan distance* is function that can provide a quick estimation of the distance between two points.

$$
d_{ab} = | b_x - a_x | + | b_y - a_y |
$$

Even though this function might be insufficient in the Deliveroo game since maps can have non-walkable tiles, it is still a decent and fast to compute heuristic that can be used to approximate distances.

## Problem parameters estimation {#sec:problem-parameters-estimation}

As explained in Section {@sec:deliveroo}, multiple parameters can be modified during the game initialization. While some of them are explicitly communicated to the agent, others are obscure and can be only estimated. For this reason, in order to build a more precise player reward estimation, we developed a learning meachnism to approximate the player speed and parcel reward decay over time.

### Player speed {#sec:player-speed}
When our agent moves in the map, it is able to track its position over time: in this way, by using the historical positions alonside with timestamps the agent can estimate its own speed by using the following algorithm:

\begin{algorithm}[H]
\caption{Player speed estimation}
\begin{algorithmic}[1]
\Procedure{updateMainPlayerSpeedEstimation}{$\mathcal{D}, s, \phi$}
\State $\text{deltas} \gets []$ \Comment{Initialize an empty array of deltas}
\ForAll {$\text{timestamp}\ t_i \in \mathcal D$}
\State $deltas.append(t_i - t_{i-1})$ \Comment{Delta of two consecutive timestamps}
\EndFor

\State $c \gets s * (1 - \phi)$ \Comment{Current speed contribution}
\State $n \gets \text{avg}(deltas) * \phi$ \Comment{New speed contribution}
\State $s \gets c + n$ \Comment{New estimation}
\State \Return $c$
\EndProcedure
\end{algorithmic}
\end{algorithm}

Where $\phi$ is the learning rate hyper-parameter that can be used to regulate the impact of the last measured instant speed with respect to its historical value.

### Parcel decay {#sec:parcel-decay}
In addition to the agent speed estiamtion, our agents are able to estimate the parcel reward decay over time. Similarly to the player speed estimation, the parcel decay is computed from timestamp differences, where each timestamp is associated to a sensed reward update of a visible parcel.

\begin{algorithm}[H]
\caption{Get parcel decay estimation}
\begin{algorithmic}[1]
\Procedure{getParcelDecayEstimation}{$\mathcal{D}$}
\State $\text{deltas} \gets []$ \Comment{Initialize an empty array of deltas}
\ForAll {$\text{timestamp}\ t_i \in \mathcal D$}
\State $deltas.append(t_i - t_{i-1})$ \Comment{Delta of two consecutive timestamps}
\EndFor
\State \Return deltas
\EndProcedure
\end{algorithmic}
\end{algorithm}

\begin{algorithm}[H]
\caption{Parcels decay estimation}
\begin{algorithmic}[1]
\Procedure{updateParcelsDecayEstimation}{$\mathcal{P}, d, \phi_2$}
\State $\text{deltas} \gets []$ \Comment{Initialize an empty array of deltas}
\ForAll {$\text{parcel}\ p_i \in \mathcal P$}
\State $deltas.concat(getParcelDecayEstimation(p.timestamps))$ \Comment{}
\EndFor

\State $c \gets d * (1 - \phi_2)$ \Comment{Current decay contribution}
\State $n \gets \text{avg}(deltas) * \phi_2$ \Comment{New decay contribution}
\State $d \gets c + n$ \Comment{New estimation}
\State \Return $d$
\EndProcedure
\end{algorithmic}
\end{algorithm}

Where $\phi_2$ is the learning rate and  can be used to regulate the contribution of the past estimations with respect to the current estimated parcel decay.

## Probabilisitic model {#sec:probabilistic-model}
In the environment there may be multiple competitive agents, and their ability of picking up parcels highly influences the value of a parcel. For this reason, we have devised a penalty value based on a probabilistic model capable of taking into consideration the possible opponents' plans.

The main idea behind the probabilistic model is the following assertion: "if there is a parcel and I am the closest agent I can reach it faster than any other agents, consequentially that parcel should be taken more into consideration, even if its value is lower than other further parcels". More formally:

$$
\text{penalty probability} = \frac{\sum_{a \in \mathcal{A}} \frac{d_{max} - d_{pa}}{d_{max}}}{|A|}
$$

with $\mathcal{A}$ the set of opponent agents, $d_{max}$ the maximum distance betweent the parcel and the union between oppoents agents, main player, and cooperative agents, $d_{pa}$ the distance parcel oppenent agent.


## Potential parcel score {#sec:potential-parcel-score}
The decision process behind the parcel selection is one of the key elements when defining a good agent. Many elements and metrics have been taken into consideration to better estimate the potential reward gain of a parcel. More formally, out agents compute the final reward as:

$$
r_f = r - \left (d_{ap} * \frac{s_a}{decay}\right ) - \left (d_{min} * \frac{s_a}{decay}\right ) - r * \text{penalty probability}
$$

where $d_{ap}$ is the distance between the agent and the parcel, $s_a$ is the estimatated speed, $d_{min}$ is the minimum distance between the parcel and the closest delivery zone, and $\text{penalty probability}$ is the probability computed on Section {@sec:probabilistic-model}.

The resulting formula takes into account multiple factors:
- the agent reward that is spent to approach the parcel and delivery it to the closest delivery zone (minimum cost to deliver that package)
- rough estimation of other agents' intentions through their distance from parcels by using a probabilistic model

## Distances cache {#sec:distance-cache}
To save computation power and to provide a more precise reward estimation, a cache is mantanied to store distances between tiles across the map. Every time a plan is generated, the distance between the starting point and any other tile in the path is stored in the cache. Since this approach does not guarantee that the generated path is the shorted route between two tiles, cache entries are updated once a smaller value is found. Therefore the caching approach is meant to improve over time as a sort of learning mechanism. In general, the cache is used many times in the codebase: in case of a cache miss, the agent uses the Manhattan distance as fallback.

## Replan {#sec:replan}
Since Deliveroo is a dynamic game with potentially multiple agents acting at the same time, we implemented a mechanism replan the current agent's actions when it fails to perform a move for a specific amount of time. This functionality enables agents to avoid them from stucking in narrow and crowded areas of the map. 
