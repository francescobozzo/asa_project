# Agent
In the field of *Computer Science* an *agent* is an individual situated in some environment, and capable of flexible autonoumous action in that environment in order to meet its design objectives. With respect to a more traditional algorithm, there is no need of defining every edge case, a well defined agent should have a reasoning component capable of taking decisions even in unkown situations. The flexibility of an agent can be quantified across two main scales:

- reactive: delay required to respond to a change in the environment;
- proactive: ability of taking action in advance for the maximization of future goals.

Based on the environment and the agent itself there are different communication models but generally the agent perceives observations from the environment using sensors and performs actions against the environment employing actuators.

Another fundamental characteristic of an agent is its autonomy, the internal "brain" should handle the decision process with or without collected information, it should also evolve with respect to possible requirement changes.

Finally an agent can be designed to solve tasks or goals. When we talk about tasks we mean small objectives that must be completed to achieve the final bigger goal. On the other hand we have a goal agent, it takes the goal and it has to define autonomously a list of tasks to fulfill the assigned goal.

## Multi-agent system
A mutli-agent system, as suggested by the name, is a group of agents placed in same environment. There are two main type of interactions: cooperative and competitive. During this project we will focus on both of them in several stages of the development.

A competitive system is composed of many agents acting against each other, the goal can be divided into to sub-goals, maximizing the personal reward and minimize the oppenents' ones.

A cooperative system is composed of many agents acting to maximize the shared reward, each agent must be capable of cooperate, coordinate and negotiate as much as possible.
