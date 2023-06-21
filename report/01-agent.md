# Agent {#sec:agent}
In the field of *Computer Science* an *agent* is an individual situated in some environment, and capable of flexible autonoumous action in that environment in order to meet its design objectives. With respect to a more traditional algorithm, there is no need of defining every edge case, a well defined agent should have a reasoning component capable of taking decisions even in unkown situations. The flexibility of an agent can be quantified across two main scales:

- reactive: delay required to respond to a change in the environment;
- proactive: ability of taking action in advance for the maximization of future goals.

Based on the environment and the agent itself there are different communication models but generally the agent perceives observations from the environment using sensors and performs actions against the environment employing actuators.

Another fundamental characteristic of an agent is its autonomy, the internal "brain" should handle the decision process with or without collected information, it should also evolve with respect to possible requirement changes.

Finally an agent can be designed to solve tasks or goals. When we talk about tasks we mean small objectives that must be completed to achieve the final bigger goal. On the other hand we have a goal agent, it takes the goal and it has to define autonomously a list of tasks to fulfill the assigned goal.

## Multi-agent system {#sec:multi-agent-system}
A multi-agent system, as suggested by the name, is a group of agents placed in same environment. There are two main type of interactions: *cooperative* and *competitive*. During this project we will focus on both of them in several stages of the development.

A competitive system is composed of many agents acting against each other, the goal can be divided into to sub-goals, maximizing the personal reward and minimize the oppenents' ones.

A cooperative system is composed of many agents acting to maximize the shared reward, each agent must be capable of cooperate, coordinate and negotiate as much as possible.

In a cooperative system an important implementation detail is the communication, it should be fast and reliable with a the lowest possible delay.

## Architecture {#sec:architecture}
There exist multiple architectures that can be used to build an agent capable of acting in a given environment. We have decided to opt for the architecture described in the following pseudocode

\begin{algorithm}[H]
\caption{Agent control loop}
\begin{algorithmic}[1]
\Procedure{AgentControLoop}{}
    \State $B \gets B_0$ \Comment{Belief set initialization}
    \State $I \gets I_0$ \Comment{Intention set initialization}
    \While {true}
        \State perceive $\rho$
        \State $B \gets \text{update}(B, \rho)$ \Comment{Belief set update}
        \State $D \gets \text{options}(B)$ \Comment{Desires computation}
        \State $I \gets \text{filters}(B, D, I)$ \Comment{Intention update}
        \State $\pi \gets \text{plan}(B, I)$ \Comment{Plan computation}
        \While {not ($\text{empty}(\pi)\text{ or succeeded}(I, B)\text{ or impossible}(I, B))$}
            \State $\alpha \gets hd(\pi)$ \Comment{Get next action}
            \State $\text{execute}(\alpha)$ \Comment{Execute action}
            \State $\pi \gets \text{tail}(\pi)$ \Comment{Remove executed action}
            \State perceive $\rho$
            \State $B \gets \text{update}(B, \rho)$ \Comment{Belief set update}
            \If {\text{reconsider(I, B)}}
                \State $D \gets \text{options}(B)$ \Comment{Desires computation}
                \State $I \gets \text{filters}(B, D, I)$ \Comment{Intention update}
            \EndIf
            \If {$\text{not sound}(\pi, I, B)$}
                \State $\pi \gets \text{plan}(B, I)$ \Comment{Plan computation}
            \EndIf
        \EndWhile
    \EndWhile
    \EndProcedure
\end{algorithmic}
\end{algorithm}

A belief set $B$ is udpated after every environment communication, it is then used to compute the desires set $D$ which is filterd to create the intentions set $I$. Finally the intentions set is used in combination with the belief set to create a plan $\pi$ to satisfy all the intensions. The plan is then execute action by action $\alpha$. For every new information collected during the exectution the belief set, the intentions set, and the desires set are updated. After the update a replan can be done, during this phase a new plan is computed.
