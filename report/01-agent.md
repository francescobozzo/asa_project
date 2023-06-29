# Agent {#sec:agent}
In the field of Computer Science, the term "agent" refers to an individual situated within an environment and capable of autonomously and flexibly taking actions to achieve its design objectives. Unlike traditional algorithms, agents do not require explicit definition of every edge case. Instead, a well-defined agent possesses a reasoning component that enables it to make decisions even in unknown situations. The flexibility of an agent can be assessed along two primary dimensions:

- Reactive: This dimension measures the delay required for the agent to respond to changes in the environment.
- Proactive: This dimension gauges the agent's ability to take proactive action to maximize future goals.

Communication models between agents and their environments vary depending on the specific characteristics of the environment and the agent itself. Generally, an agent perceives observations from the environment through sensors and carries out actions on the environment using actuators.

Autonomy is a fundamental characteristic of an agent. The internal decision-making process of an agent, often referred to as its "brain", should be capable of handling decisions with or without collected information. Furthermore, it should be able to adapt and evolve in response to potential changes in requirements.

Agents can be designed to solve tasks or goals. Task-oriented agents focus on accomplishing smaller objectives that contribute to the achievement of a larger final goal. On the other hand, goal-oriented agents receive a specific goal and autonomously determine a list of tasks necessary to fulfill the assigned goal.

## Multi-agent system {#sec:multi-agent-system}
A multi-agent system, as implied by its name, refers to a collection of agents situated within the same environment. Interactions within such a system can be broadly categorized into two types: cooperative and competitive. Throughout this project, we will delve into both of these interaction modes at various stages of development.

In a competitive system, multiple agents act in opposition to one another, where the overarching goal can be divided into sub-goals focused on maximizing personal rewards while minimizing opponents' gains. Within this scenario, the objective function may be shared among enemy agents, and it is also plausible to have multiple functions where each agent interferes with enemies solely to achieve its own goals.

On the other hand, a cooperative system consists of numerous agents working together to maximize a shared reward. In such systems, each agent must possess the capability to cooperate, coordinate, and engage in negotiation to the greatest extent possible. Cooperative systems can be further classified into two main categories:

- Simple (reciprocal) cooperation: This form of cooperation occurs when the benefits derived from collaboration outweigh the costs associated with the actions taken. It is considered the simplest type of cooperation as it leads to increased fitness for both the helper and the helped parties.
- Altruistic cooperation: In this case, the cost incurred by the individuals or species offering assistance surpasses the advantages gained. This approach is often regarded as more challenging since it cannot be readily explained by a purely "genetic-centric" perspective.

An essential aspect to consider when implementing a cooperative system is the communication mechanism. It should prioritize speed, reliability, and minimize delays as much as possible.

## Architecture {#sec:architecture}
There are several architectural options available for constructing an agent with the ability to operate within a specific environment. For our purposes, we have chosen to adopt the BDI architecture outlined in the following pseudocode.

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

After each communication with the environment, the belief set, denoted as $B$, undergoes an update. Subsequently, the desires set, referred to as $D$, is computed based on the updated belief set and then filtered to generate the intentions set, denoted as $I$. The intentions set, in conjunction with the belief set, is utilized to formulate a comprehensive plan, denoted as $\pi$, which aims to fulfill all the intentions. This plan is then executed incrementally, action by action, represented as $\alpha$. Whenever the agent receives new information from the environment, the belief set, intentions set, and desires set are updated accordingly. Following this update, the agent can decide whether to generate a new plan or adhere to the existing one.
