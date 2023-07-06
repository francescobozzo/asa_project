# Single agent implementation {#sec:single-agent}
Considering the intricate nature of the environment, a multitude of tailored solutions have been implemented to address various complexities, difficulties, and challenges encountered.

## Manhattan distance {#sec:manhattan-distance}
The Manhattan distance is a mathematical function that offers a rapid estimation of the distance between two points. It is calculated by summing the absolute differences between the respective x-coordinates and y-coordinates of the two points:

$$
d_{ab} = | b_x - a_x | + | b_y - a_y |
$$

While this function may not be fully suitable for the Deliveroo game due to the presence of non-walkable tiles on the maps, it serves as a reasonable and computationally efficient heuristic for approximating distances in certain cases.

## Problem parameters estimation {#sec:problem-parameters-estimation}
As detailed in Section {@sec:deliveroo}, various parameters can be adjusted during the initialization of the game. While certain parameters are directly communicated to the agent, others remain obscure and can only be estimated. To enhance the accuracy of estimating player rewards, we have implemented a learning mechanism aimed at approximating the player's speed and the decay of parcel rewards over time. This mechanism enables us to build a more precise estimation for optimizing player rewards.

### Player speed {#sec:player-speed}
During the agent's movement within the map, it maintains a record of its position over time. This historical positional data, along with corresponding timestamps, allows the agent to estimate its own speed using the following algorithm:

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

Here, $\phi$ represents the learning rate hyper-parameter, which can be utilized to control the influence of the most recent measured instantaneous speed in relation to its historical value.

### Parcel decay {#sec:parcel-decay}
Apart from estimating the agent's speed, our agents are also capable of estimating the decay of parcel rewards over time. Similar to the player speed estimation, the parcel decay is calculated based on differences in timestamps. Each timestamp is associated with a sensed reward update of a visible parcel, allowing us to estimate the decay of the parcel rewards as time progresses.

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
\State $deltas.concat(getParcelDecayEst(p.timestamps))$ \Comment{}
\EndFor

\State $c \gets d * (1 - \phi_2)$ \Comment{Current decay contribution}
\State $n \gets \text{avg}(deltas) * \phi_2$ \Comment{New decay contribution}
\State $d \gets c + n$ \Comment{New estimation}
\State \Return $d$
\EndProcedure
\end{algorithmic}
\end{algorithm}

Here, $\phi_2$ represents the learning rate, which controls the contribution of past estimations relative to the current estimated parcel decay. It allows us to regulate the influence of previous estimations when updating and refining the estimation of the parcel decay over time.

## Probabilisitic model {#sec:probabilistic-model}
Within the environment, multiple competitive agents coexist, and their effectiveness in picking up parcels significantly impacts the value of each individual parcel. To address this, we have developed a penalty value based on a probabilistic model that takes into account the potential plans of other competing agents.

The underlying concept behind this probabilistic model can be summarized as follows: "If there is a parcel available and I am the closest agent to it, I have a higher probability of reaching and acquiring it faster than any other agents. Consequently, this parcel should be given more weight and consideration, even if its assigned value is lower than that of other parcels located further away." This assertion can be formulated more formally as follows:

$$
\text{penalty probability} = \frac{\sum_{a \in \mathcal{A}} \frac{d_{max} - d_{pa}}{d_{max}}}{|A|}
$$

Here, we denote $\mathcal{A}$ as the set of opponent agents, $d_{max}$ as the maximum distance between the parcel and the collective group comprising opponent agents, the main player, and cooperative agents. Additionally, $d_{pa}$ represents the distance between the parcel and an opponent agent.

## Potential parcel score {#sec:potential-parcel-score}
The process of parcel selection plays a crucial role in defining an effective agent. To accurately estimate the potential reward gain of a parcel, our agents consider various elements and metrics. Formally, the final reward for a parcel is computed as follows:

$$
r_f = r - \left (d_{ap} * \frac{s_a}{decay}\right ) - \left (d_{min} * \frac{s_a}{decay}\right ) - r * \text{penalty probability}
$$

Here, $d_{ap}$ represents the distance between the agent and the parcel, $s_a$ denotes the estimated speed of the agent, $d_{min}$ represents the minimum distance between the parcel and the nearest delivery zone, and $\text{penalty probability}$ corresponds to the probability calculated using the probabilistic model discussed in Section {@sec:probabilistic-model}.

The resulting formula takes into consideration multiple factors, including:

- The reward that the agent expends to approach the parcel and deliver it to the nearest delivery zone, which represents the minimum cost associated with delivering that particular parcel.
- An approximate estimation of other agents' intentions based on their distances from the parcels, incorporating a probabilistic model.

## Distances cache {#sec:distance-cache}
In order to optimize computational efficiency and enhance the accuracy of reward estimation, a cache is maintained to store distances between tiles throughout the map. Whenever a plan is generated, the distance between the starting point and any other tile along the path is stored in the cache. However, it should be noted that this approach does not guarantee the shortest route between two tiles. As a result, cache entries are updated whenever a smaller distance value is discovered. This caching mechanism acts as a form of learning, gradually improving over time.

Throughout the codebase, the cache is utilized in numerous instances. In the event of a cache miss, the agent resorts to using the Manhattan distance as a fallback measure. By employing this caching strategy, the goal is to strike a balance between computation efficiency and accurate reward estimation.

## Replan {#sec:replan}
As Deliveroo is a dynamic game that involves simultaneous actions from multiple agents, we have implemented a mechanism to replan the actions of the current agent if it fails to execute a move within a specific time frame. This functionality allows agents to prevent getting stuck in narrow or crowded areas of the map. By triggering a replanning process when necessary, agents can adapt their actions and navigate through challenging situations more effectively.
