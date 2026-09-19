# Special Card Interactions V1

## Chameleon

- Illegal if leader, or if hand still has Lead Suit.
- Snapshot at play: prior Hunter in trick → effectiveSuit = Hunter; else Lead.
- Later Hunter does not rewrite earlier Chameleon.
- Exact power/suit tie: Natural Suit beats Chameleon-transformed.

## Inversion

- Global; ranks 1–12 invert as `13 - base`; A(13) immune.
- Multiple Inversions do not stack.
- A with `effectiveSuit == Lead` cancels entire Inversion (after Armageddon removes destroyed As).

## Armageddon

- Destroys opponent A cards only (before/after play order irrelevant at resolve).
- Illegal with own A.
- Successful destroy: SUCCESSFUL_SPECIAL + LEGENDARY_COUNTER.

## Doping / Trap

- After Inversion: Doping +2.5 on caster; Trap −2.5 × count on each opponent.
- Teammate Traps stack.
- Normal floor 0; A floor 13 (Trap can strip buffs but not below 13).

## Team Bond

- Same effectiveSuit for both teammates; fails if trick already cut by Hunter before bond completes.
- FusionPower capped at 12.5.
- Stronger component becomes individual trick winner / next leader.
- `showsFusionBeast` only when FusionPower > 10 (presentation).

## Hunt Command

- Leader only, not Trick 1, attached to first card.
- Proposed Hunter = leader effectiveSuit ≠ current Hunter.
- Needs teammate same effectiveSuit + team wins trick.
- Consumed on failure; Hunter changes starting **next** trick on success.

## Null

- No effect, no Impact; may be stored/discarded/played.
