\newpage
# Problem Analysis
Qui spiegerei le varie macroaree su cui abbiamo operato (senza spiegare le soluzioni adottate):

- decay stimato
- propabilistic model
- parcel value discounted
- replan
- cache

## Problem parameters estimation

As explained in Section {@sec:deliveroo}, multiple parameters can be modified during the game initialization. Some of them are given to the agent, others are obscure and can be only estimated using different solutions. We mainly focused on the estimation of player speed and parcel decay for a more accurate computation of the potential reward associated to a given parcel.

### Player speed
Each time the agent moves the new position is communicated by the environment to the agent, we have decied to keep track of the timestamp in which the information is perceived.

### Parcel decay
