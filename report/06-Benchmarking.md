# Benchmarking {#sec:benchmarking}
During the benchmarking phase of the project, six different maps were used to evaluate the proposed solutions. Three maps were specifically designed for the single-agent implementation, while the other three maps were used for the multi-agent implementation.

Each test was conducted by running the agent or agents for a total duration of 5 minutes. It is important to note that there were no strict requirements for result reproducibility (such as random seed initialization), which means that the results may slightly vary across different runs, but they should generally remain within a similar range.

The purpose of the benchmarking phase was to assess the performance and effectiveness of the implemented solutions under realistic conditions and evaluate how well they performed in terms of various metrics such as score, efficiency, and robustness.

## Single-agent
The benchmarking phase for the single-agent implementation included three specific challenges:

1. *challenge_21.js*: This challenge featured a full square map with numerous enemy agents moving randomly. The map had a limited number of delivery zones, and there was no decay in parcel rewards.
2. *challenge_22.js*: In this challenge, a more complex map was used with large roads and no enemy agents. Parcels in this scenario had very low rewards, and the agent's movement speed was also significantly slow.
3. *challenge_23.js*: The most complex scenario for the single-agent implementation involved a map with small roads and a high number of enemy agents. Parcels in this challenge had very high rewards, and the agent's movement speed was set to be very high.

These challenges were designed to test the single-agent implementation's performance and efficiency under different conditions, including variations in map structure, enemy agent presence, parcel rewards, and agent speed.


|               | Chal. 21 | Chal. 22  | Chal. 23 |
|---------------|----------|-----------|----------|
| Prob model    | 210      | no agents | 2288     |
| No prob model | 270      | 186       | 2818     |


### Challenge 21
Based on the investigation and analysis conducted after the 5-minute benchmarking in challenge 21, it was discovered that the main issue lies in the parcel decay estimation mechanism. The conservative design of the mechanism, intended to prevent excessive greediness, is causing a decrease in parcel rewards even when there is no actual decay specified in the challenge.

Additionally, the probabilistic model implementation, which assumes that enemy agents tend to collect parcels in close proximity to their positions, is not applicable in challenge 21 where enemy agents move randomly. This mismatch between the model assumption and the actual behavior of enemy agents results in missing out on valuable parcels.

These findings suggest that the conservative approach and the probabilistic model, as currently implemented, are not suitable for challenge 21. Adjustments or alternative strategies may be required to improve performance and better adapt to the specific characteristics of this challenge.

### Challenge 22
Based on the provided information, the low results obtained in challenge 22 can be attributed to the configuration and characteristics of the challenge itself. The parcels in this challenge are initially spawned with a value around 10, and the decay rate is fast. The single-agent implementation based on PDDL relies on various heuristics to estimate the value of parcels, which is used to compute desires and select the most favorable parcels to take.

However, due to the nature of the implementation, the estimation of parcel value is performed before computing the plan, which means that the length of the plan and the time required to complete it are not known in advance. As a result, taken parcels may reach zero value before they can be delivered. To address this issue, attempts were made to discount parcels further by considering the proximity to the closest delivery zone. However, these adjustments did not yield the desired improvements, and the estimation remained overly conservative.

The challenges posed by fast decaying parcels and the dynamic nature of estimating their value based on uncertain plan lengths can be complex and require careful consideration. It may be necessary to explore alternative strategies or refine the existing heuristics to improve the performance of the single-agent implementation in challenge 22.

### Challenge 23
Based on the information provided, it seems that the results obtained in challenge 23 are relatively better compared to the previous challenges. This can be attributed to several factors:

1. Higher Parcel Rewards: The challenge is designed in such a way that the parcel rewards are higher compared to the previous challenges. This means that even if the agent encounters some delays or inefficiencies in its plan, the overall rewards obtained from delivering parcels are still significant.
2. Probabilistic Model: The probabilistic model takes into account the distance between parcels and opponent agents to estimate the likelihood of successfully delivering a parcel. In a scenario with smaller roads and many enemy agents, this model could help the agent make more informed decisions about which parcels to prioritize and avoid potential collisions or conflicts.
3. Parcel Decay Estimation: The conservative estimation of parcel decay may also play a role in the agent's success in challenge 23. By being cautious and considering the potential decay of parcels, the agent is more likely to prioritize parcels with higher rewards and deliver them before their values decrease significantly.

It is important to note that the qualitative analysis conducted during the 5-minute run is crucial in understanding the agent's performance in this specific environment. The combination of higher parcel rewards, the utilization of the probabilistic model, and the conservative estimation of parcel decay contribute to the agent's improved results in challenge 23.

## Multi-agent
The three maps used for the benchmark phase of the multi-agent implementation provide different scenarios to evaluate the performance of the agents. Let's take a closer look at each challenge:

1. *challenge_31.js*: This map features a multi-linear layout with a single perpendicular hallway. There are no enemy agents present, and there are many parcels with high rewards. This scenario tests the agents' ability to efficiently collect parcels and deliver them to the appropriate delivery zones. The absence of enemy agents allows the agents to focus solely on maximizing their rewards without the added complexity of avoiding conflicts.
2. *challenge_32.js*: In this map, the multi-linear layout is maintained, but the perpendicular hallway is removed. Instead, the two agents need to collaborate and coordinate their actions to score points. This challenge emphasizes the importance of teamwork and communication between the agents. They must work together to collect parcels and deliver them effectively, taking into account the limitations imposed by the modified map layout.
3. *challenge_33.js*: This challenge is a modified version of challenge_31.js, where the map is divided into two different blocks. This division introduces additional complexity and requires the agents to navigate between the blocks to collect and deliver parcels. It tests the agents' ability to plan and coordinate their movements efficiently, considering the divided nature of the map.

By evaluating the agents' performance on these three challenges, it is possible to assess their ability to adapt to different map layouts, collaborate with other agents, and make strategic decisions based on the specific game conditions.

|                     | Chal. 31 | Chal. 32 | Chal. 33 |
|---------------------|----------|----------|----------|
| Information sharing | 786      | 0        | 0        |
| Plan communication  | 323      | 0        | 0        |
| Action dispatch     | 873      | 1058     | 387      |

### Challenge 31
In the context of challenge 31, which features a large map with a high number of parcels and an infinite visibility radius, efficiency issues were encountered due to the large number of nodes in the graph used during the PDDL algorithm. To mitigate this problem, an additional hyper-parameter was introduced to limit the number of parcels taken during a plan. Consequentially the complexity of the PDDL computation can be significantly reduced, by selectively considering a limited number of parcels, the number of nodes in the graph used by the PDDL algorithm is reduced, leading to improved efficiency and faster plan computation.

### Challenge 32
This map is the most interesting case study for the evaluation. There are two different approaches, where the agents can spawn on different rows or in the same row, they present unique challenges and require different strategies.

In the scenario where the agents spawn in the same row, the narrow road and the presence of both agents create a need for deep coordination and collaboration. One agent needs to bring parcels closer to the other agent, who can then deliver them. This coordination requires careful planning and communication between the agents to ensure efficient parcel collection and delivery, which only the action dispatch approach is able to offer among the different methods we developed.

On the other hand, when the agents spawn on different rows, they act as separate entities since they cannot block each other's paths. This reduces the need for direct coordination, but still requires effective decision-making and resource allocation between the two agents. The high parcel rewards and the large number of parcels in this scenario contribute to achieving a very high result.

Furthermore, the infinite visibility radius eliminates the necessity for map exploration, enabling agents to concentrate exclusively on optimizing their actions using the provided information. On the flip side, agents must judiciously choose the parcels to include in their desire set by filtering out unreachable ones. In our case, we implemented a Breadth-first search to identify non-reachable parcels as part of the intentions filtering process.

Overall, the evaluation of the multi-agent implementation in this challenging scenario showcases the agents' ability to coordinate their actions, strategically handle parcel collection and delivery, and take advantage of the high parcel rewards to achieve a favorable outcome.

### Challenge 33
The modified version of challenge 31 presents a scenario that requires a less refined strategy compared to the previous challenges. There is no specific strategy needed for the exchange of parcels between agents, as each agent can independently compute its own plan and divide the parcels to pick up.

One of the notable aspects of this challenge is the configuration of the map, particularly the visibility radius. With a reduced visibility radius, the agents are required to explore the map to discover new parcels. However, the map is designed with a good distribution of parcels, allowing the agents to find a sufficient number of parcels within their visibility range. After a couple of deliveries, the need for further exploration decreases as the agents become more familiar with the map layout.

The map being divided into blocks adds an additional element to the challenge. Agents can spawn in the same block or different locations, but the overall behavior and strategies remain consistent. The agents can still compute individual plans and divide the parcels accordingly.

Overall, this modified challenge offers an interesting combination of reduced visibility, exploration requirements, and map division. It allows the agents to adapt their strategies accordingly and optimize their parcel collection and delivery processes.
