;; domain file: deliveroo-domain.pddl
(define (domain default)

    (:requirements :strips)

    (:predicates
        (can-move ?from ?to)
        (at ?position)
    )

    (:action move
        :parameters (?from ?to)
        :precondition (and (at ?from) (can-move ?from ?to))
        :effect (and (not (at ?from)) (at ?to))
    )
)