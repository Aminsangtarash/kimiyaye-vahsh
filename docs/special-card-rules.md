# Special Card Rules — کیمیای وحش v1

Canonical data: `data/special-cards.json`  
These cards complement the 52-animal main deck. They do **not** replace follow-suit or animal rank primacy.

## Distribution (locked)

- Model: **fixed small special hand**
- Special deck: 2 copies × 7 types = **14 cards**
- Each player is dealt **2** specials after animals are dealt
- Specials are private
- Playing a special discards it for the hand (no redraw mid-hand)

## Global constraints

1. At most **one special per player per trick**
2. Strength deltas from specials on one animal cannot exceed **±2** from a single effect type
3. Conflict priority (high → low): Silence → Shield → Poison → Adrenaline → Chameleon → Anchor → Scout
4. No infinite chains; no random retargeting; no permanent hand destruction

---

## Card list

### 1. Adrenaline — آدرنالین

+2 effective strength to your animal in the current trick.

### 2. Poison — زهر

−2 effective strength to one opponent animal in the current trick.

### 3. Chameleon — آفتاب‌پرست

Only while **void** in the led suit: your off-suit animal counts as the **led suit** for comparison this trick. Rank unchanged. Does **not** delete the duty to follow suit when you can.

### 4. Shield — سپر

Cancel one Poison or Adrenaline currently targeting your animal this trick.

### 5. Scout — دیده‌بان

Privately learn how many cards of one suit an opponent still holds.

### 6. Silence — خاموشی

No further specials may be played for the rest of this trick. Already-applied effects stand.

### 7. Anchor — لنگر

After you win a trick, the resulting Superior Suit stays locked for one extra trick (two tricks of that Superior total).

---

## Timing windows (summary)

| Window | Allowed |
|--------|---------|
| Before lead / between tricks | Scout; Anchor (just after a win) |
| During trick, after your animal is played | Adrenaline (self), Chameleon (with void play) |
| During trick, after opponent animal played | Poison |
| Reaction | Shield |
| During trick anytime (your window) | Silence |

## Interaction with Superior Suit

- Chameleon never invents a new Superior; it only mimics **led suit** for comparison.
- Anchor only extends the Superior that the won trick already produced.

## Design intent

Specials reward timing, void management, and teammate information — not coin-flip chaos.
