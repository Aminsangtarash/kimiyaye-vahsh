# Rule Edge Cases — v1

Canonical resolver: `data/game-rules.json` + `data/special-cards.json`.

## Follow-suit

| Case | Ruling |
|------|--------|
| Hold led suit but want to play Superior | Illegal. Must follow. |
| Void + play Superior | Legal. Superior can win. |
| Void + Chameleon | Card counts as led suit for comparison; printed rank unchanged. |
| Chameleon while holding led suit | Illegal. |

## Superior Suit

| Case | Ruling |
|------|--------|
| First trick | No Superior. |
| Winner’s printed suit differs from effective Chameleon suit | Superior becomes **printed** suit of the winning card. |
| Anchor when no Superior would be set | Set Superior from winner, then lock for two upcoming tricks. |
| Two Anchors in a row | Later Anchor replaces remaining lock duration (no stack beyond its own window). |

## Strength ties

| Case | Ruling |
|------|--------|
| Two cards same effective strength on winning track | Earliest play wins (deterministic). |
| Adrenaline + Poison on different cards | Independent. |
| Two Adrenalines on one card | Second illegal via stacking + per-trick special limit. |

## Special timing

| Case | Ruling |
|------|--------|
| Silence after Adrenaline already applied | Adrenaline stands; later specials blocked. |
| Shield vs Poison | Poison cancelled if Shield responds in window. |
| Scout during Silence | Allowed only before trick specials are locked; if Silence already active mid-trick, Scout cannot be played mid-trick. Between tricks Scout is fine. |
| Max specials | 1 per player per trick even if hand holds 2. |

## Hand / match ending

| Case | Ruling |
|------|--------|
| Team reaches 7 tricks mid-hand | Hand over; that team wins the hand. |
| Both somehow at 6 and last tricks | Continue until 7; cannot both hold 7. |
| Disconnect mid-trick | Server must finish trick via AI/forfeit policy without soft-lock. |

## Impossible states (engine must reject)

- Playing a suit card you do not hold  
- Following illegally when holding led suit  
- Negative remaining special uses without discard  
- Superior lock < 0  
- More than 13 tricks won total per hand without termination check  

## Simulator notes

Heuristic batches (`tools/simulate_special_balance.py`) showed ~50/50 team wins with and without specials and no soft-lock loops across 1500 hands. This is a sanity check, not a proof of human-optimal balance.
