# Special Card Rules V1

Canonical runtime rules for Kimiyaye Vahsh Special Cards V1.

Source of truth for the active set: `data/special-cards.v1.json`  
`specialRulesVersion = 1`

## Set (8)

| Slug | Persian | Weight |
|------|---------|--------|
| doping | دوپینگ | 10 |
| trap | تله | 10 |
| chameleon | نیرنگ آفتاب‌پرست | 10 |
| inversion | نفرین وارونگی | 10 |
| team_bond | همتازی | 10 |
| null | پوچ | 10 |
| hunt_command | فرمان شکار | 3 |
| armageddon | آرماگدون | 1 |

Total weight = 64. Draw chance default = 10%.

## Draw / inventory

- One draw attempt per player turn, **before** the animal card.
- Max inventory = 3. A 4th draw forces explicit discard (old or new).
- Server owns RNG; client never decides success.

## Usage

- At most one non-Chameleon special per player per trick.
- Chameleon may combine with exactly one other special.
- Specials attach on `PLAY_CARD` (`specialInstanceIds`).
- Face-up / public immediately.

## Resolution order

1. Chameleon (snapshot at play time)
2. Armageddon
3. Inversion (+ A-on-Lead cancel)
4. Doping / Trap (+ floors)
5. Team Bond
6. Determine winner
7. Hunt Command (applies next trick if success)

## Team Bond visual threshold

Gameplay fusion power = `min(sum(effectivePowers), 12.5)` always when bond succeeds.

Dedicated **Fusion Beast / هیولای ترکیبی** visual only when:

`FinalTeamBondPower > 10`

At 10 or below: both original cards stay visible with a Team Bond indicator.

## Legacy

Old specials (Shield, Scout, Silence, Anchor, Adrenaline/Poison, old Chameleon declaration flag) are inactive and not in the V1 pool.

See also:

- `docs/SPECIAL_CARD_INTERACTIONS.md`
- `docs/SPECIAL_CARD_BALANCE_NOTES.md`
