# Special Card Balance Notes V1

Configured (not auto-tuned):

- `SPECIAL_DRAW_CHANCE = 0.10`
- Pool weights total 64 (NULL = common 10; Hunt Command = 3; Armageddon = 1)
- Max inventory 3 with forced discard on overflow
- One non-Chameleon special per player per trick (+ optional Chameleon)
- Fusion power hard cap 12.5 so unbuffed A(13) remains above standard fusions
- Fusion Beast **visual** only above power 10

Telemetry hooks for later review:

- draw attempt / fail / success counts
- per-special play and success rates
- Team Bond success/fail + fusionBeast rate
- Armageddon A destroys
- Hunt Command pending/success/fail
- NULL discard vs play

Do not auto-rebalance from telemetry; human review only.
