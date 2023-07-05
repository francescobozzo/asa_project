# Conclusion {#sec:conclusion}
The Deliveroo environment provided a suitable scenario for the development of single and multi-agent strategies, allowing for a deep understanding of various aspects of the architecture presented in {@sec:architecture}.

Processing and storing received information in a belief set and computing desires based on this information was a crucial step in the implementation. Desires could be expressed in different ways, such as the number or location of parcels to pick, the maximum or minimum distance of the path, the maximum or minimum reward, and more. The project primarily focused on parcel-based desires due to limitations in the PDDL solver used, which did not support numbers. This limitation impacted the solver's capabilities and necessitated a more detailed problem definition.

Desires were used to compute plans that aimed to maximize the reward function. The time required for plan computation played a dominant role, highlighting the need to strike a balance in the replanning strategy.

The utilization of PDDL solutions provided the advantage of focusing solely on defining the desires set without concerning the plan computation. However, this approach had its pros and cons. The obtained plans could be non-optimal, and the inability to introduce heuristics during plan computation limited the ability to obtain more refined instructions. Plan refinement was only possible after receiving the plan, and it required simulation on a copy of the belief set, posing additional challenges.

The results presented in section {@sec:benchmarking} demonstrated the applicability of PDDL-based strategies for the Deliveroo environment. The focus was primarily on developing multiple solutions without delving into extensive optimizations. Future work in this area could involve:

- Developing an agent capable of selecting different strategies based on the environment and available information.
- Defining additional heuristics for desires computation to enhance decision-making.
- Exploring the adoption of a different PDDL version that supports numbers, enabling more flexible problem definition.
- Designing a strategy for plan evaluation and refinement to enhance plan quality.

These avenues of future work can contribute to further improving the effectiveness and efficiency of the agent's decision-making and planning processes in the Deliveroo environment.
