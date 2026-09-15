# -*- coding: utf-8 -*-
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
cards = json.loads((ROOT / "data/cards.json").read_text(encoding="utf-8"))["cards"]
proto = ROOT / "assets/prototypes/portraits"
print("prototypes:", [p.name for p in proto.glob("*.png")] if proto.exists() else [])
print("---")
for x in cards:
    print(
        "|".join(
            [
                x["id"],
                x["slug"],
                x["suit"],
                str(x["displayRank"]),
                x["type"],
                str(x["powerBarFill"]),
                x["englishName"],
            ]
        )
    )
