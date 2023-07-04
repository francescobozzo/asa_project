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

## Multi-agent
