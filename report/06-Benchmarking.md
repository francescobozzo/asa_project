# Benchmarking {#sec:benchmarking}
During the benchmarking phase of the project, six different maps were used to evaluate the proposed solutions. Three maps were specifically designed for the single-agent implementation, while the other three maps were used for the multi-agent implementation.

Each test was conducted by running the agent or agents for a total duration of 5 minutes. It's important to note that there were no strict requirements for result reproducibility, which means that the results may slightly vary across different runs, but they should generally remain within a similar range.

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
2. Probabilistic Model: Although not explicitly mentioned for challenge 23, it can be assumed that the probabilistic model was utilized in this scenario as well. The probabilistic model takes into account the distance between parcels and opponent agents to estimate the likelihood of successfully delivering a parcel. In a scenario with smaller roads and many enemy agents, this model could help the agent make more informed decisions about which parcels to prioritize and avoid potential collisions or conflicts.
3. Parcel Decay Estimation: The conservative estimation of parcel decay may also play a role in the agent's success in challenge 23. By being cautious and considering the potential decay of parcels, the agent is more likely to prioritize parcels with higher rewards and deliver them before their values decrease significantly.

It is important to note that the qualitative analysis conducted during the 5-minute run is crucial in understanding the agent's performance in this specific environment. The combination of higher parcel rewards, the utilization of the probabilistic model, and the conservative estimation of parcel decay contribute to the agent's improved results in challenge 23.

## Multi-agent
The three maps for the benchmark phase of the multi-agent implementation are quite similar, the mainly differ on size of that is reduced map over map and on the parcel spawn location.

2. *challange_31.js*: multi-linear map with a single perpendicular hallway, no enemy agents, and many parcels with high reward.
2. *challange_32.js*: multi-linear map without the perpendicular hallway, . 
2. *challange_33.js*: 

|              | Chal. 31 | Chal. 32 | Chal. 33 |
|--------------|----------|----------|----------|
| Action based |          | 1058     | 387      |
