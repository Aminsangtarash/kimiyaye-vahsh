# Kimiyaye Vahsh — Game Rules (v1)

Machine-canonical source: `data/game-rules.json`  
Story knowledge is **not** required to play legally.

## Players and teams

- 4 players, 2 teams of 2
- Partners sit opposite each other

## Cards

- 52 animal cards in four suits: Carnivores, Herbivores, Birds, Reptiles
- 13 ranks per suit: 1–10, then C, B, A
- 14 special cards (7 types × 2); each player is dealt 2 specials

## Goal

- First team to win **7 tricks** wins the hand
- First team to win **3 hands** wins the match

## Dealing

1. Shuffle and deal all 52 animals (13 each)  
2. Shuffle specials and deal 2 to each player  
3. First hand of a match: random leader. Later hands: winner of the previous hand’s last trick leads

## Trick play

1. Leader plays an animal (led suit = that card’s suit)  
2. Others play in order  
3. **If you can follow the led suit, you must**  
4. If void, play any animal  
5. At most one special per player per trick  
6. Resolve winner; winner leads next

## Superior Suit

- First trick of a hand has **no** Superior Suit  
- After each trick, the **printed suit of the winning animal** becomes Superior for the next trick  
- **Anchor** can lock that Superior for one extra trick

### Examples

1. Trick 1 (no Superior), led Birds, Falcon wins → Superior for Trick 2 = Birds  
2. Trick 2 Superior=Birds; a void player wins with a Bird → Superior for Trick 3 = Birds  
3. Winner plays Anchor → Birds remains Superior for the next two tricks

## Trick resolution

1. Apply accepted special modifiers  
2. Superior-suit cards beat non-Superior cards  
3. Among Superior cards, highest effective strength wins  
4. If no Superior card was played, highest effective strength among **led-suit** cards wins  
5. Off-suit non-Superior cannot win if any led-suit or Superior card exists  
6. Tied effective strength on the winning track: earliest play wins

Base strength comes from the 13-segment power mapping (1–10, C=11, B=12, A=13).

## Special cards (summary)

| Card | Effect |
|------|--------|
| Adrenaline | +2 to your animal in this trick |
| Poison | −2 to one opponent animal in this trick |
| Chameleon | If void in led suit, your play counts as led suit for comparison |
| Shield | Cancel one Poison/Adrenaline on your animal |
| Scout | Learn an opponent’s count of one suit |
| Silence | No further specials this trick |
| Anchor | Extend Superior lock by one extra trick after you win |

Details: `docs/special-card-rules.md`

## Surrender, disconnect, inactivity

- Surrender requires partner confirmation online  
- Disconnect: reconnect window; match must remain resolvable  
- Inactivity: auto-play lowest legal animal (no special)

## Modes

- Standalone (no website account required)  
- Connected (same rules; tournaments/rewards later)
