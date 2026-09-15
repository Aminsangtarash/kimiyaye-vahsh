# -*- coding: utf-8 -*-
"""Build Phase 11/12 production manifest + final prompt files from cards.json."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(r"d:\Projects\card game\site")
CARDS = json.loads((ROOT / "data/cards.json").read_text(encoding="utf-8"))["cards"]

# cardId -> production direction
DIR = {
    # Carnivores normal
    "carnivore-wolverine": dict(pose="aggressive forward snarl, low compact head", expression="ferocious tenacity", cameraAngle="3/4-left", portraitConcept="head-and-shoulders", backgroundConcept="cold crimson frost haze"),
    "carnivore-fox": dict(pose="head slightly angled, alert ears", expression="intelligent cunning, subtly amused", cameraAngle="3/4-right", portraitConcept="close head crop", backgroundConcept="warm charcoal ember mist"),
    "carnivore-snow-leopard": dict(pose="calm predatory stare, soft turned head", expression="silent focus", cameraAngle="3/4-left", portraitConcept="head-and-neck", backgroundConcept="pale crimson snow fog"),
    "carnivore-wolf": dict(pose="howling upward, muzzle raised", expression="alert wild intelligence", cameraAngle="slight-low-upward", portraitConcept="head-and-neck howl", backgroundConcept="moonlit cool crimson mist"),
    "carnivore-hyena": dict(pose="side-turned head, open calculating grin", expression="cunning scavenger confidence", cameraAngle="3/4-right", portraitConcept="head crop", backgroundConcept="dusty red dusk haze"),
    "carnivore-jaguar": dict(pose="frontal-leaning stalk, jaw set", expression="ambush intensity", cameraAngle="frontal-slight-3/4", portraitConcept="head-and-shoulders", backgroundConcept="humid dark crimson fog"),
    "carnivore-bear": dict(pose="massive forward presence, mouth slightly open", expression="raw power", cameraAngle="slight-low", portraitConcept="head-and-chest", backgroundConcept="deep forest-red shadow fog"),
    "carnivore-tiger": dict(pose="3/4 roar building, stripes readable", expression="dominant fury", cameraAngle="3/4-left", portraitConcept="head-and-mane-shoulders", backgroundConcept="hot ember crimson atmosphere"),
    "carnivore-lion": dict(pose="full roar, dynamic mane", expression="dominant regal power", cameraAngle="3/4-right", portraitConcept="head-and-mane", backgroundConcept="cinematic crimson ember haze"),
    "carnivore-polar-bear": dict(pose="frontal frost breath, head high", expression="arctic apex calm threat", cameraAngle="slight-low", portraitConcept="head-and-neck", backgroundConcept="icy pale-red blizzard fog"),
    "carnivore-amarok": dict(pose="mythic wolf howl, oversized presence", expression="legendary night hunger", cameraAngle="slight-low-upward", portraitConcept="legendary head-and-neck", backgroundConcept="mythic crimson aurora mist"),
    "carnivore-griffon": dict(pose="proud eagle-lion head, subtle ruff", expression="noble legendary authority", cameraAngle="3/4-right", portraitConcept="legendary hybrid head", backgroundConcept="luminous red-gold mythical haze"),
    "carnivore-nemean-lion": dict(pose="imposing roar, denser mythic mane", expression="invincible legendary dominance", cameraAngle="3/4-left", portraitConcept="legendary lion head", backgroundConcept="heroic deep crimson glow fog"),
    # Herbivores
    "herbivore-deer": dict(pose="alert head turn, antlers framed", expression="vigilant grace with steel", cameraAngle="3/4-left", portraitConcept="head-and-antlers", backgroundConcept="soft sage morning fog"),
    "herbivore-panda": dict(pose="steady frontal stare", expression="immovable quiet strength", cameraAngle="frontal", portraitConcept="head crop", backgroundConcept="misty bamboo-green haze abstract"),
    "herbivore-kangaroo": dict(pose="alert upright head, ears sharp", expression="coiled athletic readiness", cameraAngle="3/4-right", portraitConcept="head-and-neck", backgroundConcept="dry olive dust haze"),
    "herbivore-buffalo": dict(pose="horned head lowered slightly", expression="herd-wall stubborn power", cameraAngle="slight-low", portraitConcept="head-and-horns", backgroundConcept="dusty green savannah fog"),
    "herbivore-boar": dict(pose="tusks forward charge-ready", expression="aggressive endurance", cameraAngle="3/4-left", portraitConcept="head-and-tusks", backgroundConcept="dark forest-green mist"),
    "herbivore-gorilla": dict(pose="intense forward gaze", expression="controlled immense strength", cameraAngle="frontal-slight-3/4", portraitConcept="head-and-shoulders", backgroundConcept="deep jungle-green shadow fog"),
    "herbivore-rhinoceros": dict(pose="horn-forward armored head", expression="unstoppable mass", cameraAngle="slight-low", portraitConcept="head-and-horn", backgroundConcept="heavy sage dust atmosphere"),
    "herbivore-hippopotamus": dict(pose="mouth partially open threat display", expression="river-king menace", cameraAngle="3/4-right", portraitConcept="head crop", backgroundConcept="murky green water fog abstract"),
    "herbivore-elephant": dict(pose="trunk curled, tusks framing face", expression="ancient controlled power", cameraAngle="3/4-left", portraitConcept="head-trunk-tusks", backgroundConcept="warm olive dust haze"),
    "herbivore-mammoth": dict(pose="massive tusks, stoic forward mass", expression="enduring glacial strength", cameraAngle="slight-low", portraitConcept="head-and-tusks", backgroundConcept="cold sage blizzard fog"),
    "herbivore-bonnacon": dict(pose="mythic bovine head, fierce horns", expression="legendary volatile power", cameraAngle="3/4-right", portraitConcept="legendary horned head", backgroundConcept="mythic green fire-dust haze"),
    "herbivore-unicorn": dict(pose="noble angled head, horn clear", expression="pure fierce mythic focus", cameraAngle="3/4-left", portraitConcept="legendary head-and-horn", backgroundConcept="luminous sage-silver mist"),
    "herbivore-behemoth": dict(pose="colossal behemoth head, overwhelming mass", expression="primordial legendary weight", cameraAngle="slight-low", portraitConcept="legendary massive head", backgroundConcept="stormy deep-green mythic fog"),
    # Birds
    "bird-raven": dict(pose="clever head tilt, beak sharp", expression="cunning watcher", cameraAngle="3/4-right", portraitConcept="head crop", backgroundConcept="indigo storm mist"),
    "bird-owl": dict(pose="frontal face, eyes locked", expression="night hunter stillness", cameraAngle="frontal", portraitConcept="face-and-disk", backgroundConcept="moonlit blue fog"),
    "bird-vulture": dict(pose="3/4 grim beak profile", expression="patient aerial menace", cameraAngle="3/4-left", portraitConcept="head-and-neck", backgroundConcept="cold blue ash haze"),
    "bird-great-hornbill": dict(pose="casque profile, beak dominant", expression="bold territorial presence", cameraAngle="3/4-right", portraitConcept="head-and-casque", backgroundConcept="humid azure canopy haze abstract"),
    "bird-secretary-bird": dict(pose="crest raised, sharp eye", expression="ground-hunter precision", cameraAngle="3/4-left", portraitConcept="head-and-crest", backgroundConcept="clear blue dust haze"),
    "bird-falcon": dict(pose="streamlined head, hunting stare", expression="speed incarnate", cameraAngle="slight-low", portraitConcept="head crop", backgroundConcept="high-altitude blue wind streaks"),
    "bird-bearded-vulture": dict(pose="bearded profile, fierce eye", expression="mountain apex calm", cameraAngle="3/4-right", portraitConcept="head-and-beard", backgroundConcept="alpine blue cliff mist abstract"),
    "bird-ostrich": dict(pose="tall neck curve into frame", expression="alert grounded power", cameraAngle="3/4-left", portraitConcept="head-and-neck", backgroundConcept="dry pale-blue heat haze"),
    "bird-cassowary": dict(pose="casque forward, intense stare", expression="dangerous flightless force", cameraAngle="frontal-slight-3/4", portraitConcept="head-and-casque", backgroundConcept="deep jungle-blue shadow fog"),
    "bird-harpy-eagle": dict(pose="crest flared, hooked beak", expression="aerial authority", cameraAngle="3/4-right", portraitConcept="head-and-crest", backgroundConcept="storm-blue altitude haze"),
    "bird-homa": dict(pose="mythic radiant bird head", expression="legendary royal omen", cameraAngle="3/4-left", portraitConcept="legendary avian head", backgroundConcept="sacred luminous blue-gold mist"),
    "bird-phoenix": dict(pose="flame-kissed head turn", expression="legendary rebirth fire calm", cameraAngle="slight-low", portraitConcept="legendary flaming plumage head", backgroundConcept="cool blue with restrained ember accents"),
    "bird-simurgh": dict(pose="majestic mythic crest, vast presence", expression="legendary sovereign wisdom-power", cameraAngle="3/4-right", portraitConcept="legendary simurgh head", backgroundConcept="epic azure mythic aurora fog"),
    # Reptiles normal + moses
    "reptile-gila-monster": dict(pose="beaded head, tongue hint optional", expression="slow venomous certainty", cameraAngle="3/4-left", portraitConcept="head crop", backgroundConcept="violet desert heat haze"),
    "reptile-alligator-snapping-turtle": dict(pose="beak-like jaws open threat", expression="armored ambush patience", cameraAngle="slight-low", portraitConcept="head-and-jaws", backgroundConcept="murky purple swamp fog"),
    "reptile-python": dict(pose="coiled head raised", expression="constrictor calm focus", cameraAngle="3/4-right", portraitConcept="head-and-neck curve", backgroundConcept="humid violet jungle mist"),
    "reptile-king-cobra": dict(pose="hood fully expanded", expression="calculated strike readiness", cameraAngle="frontal-slight-3/4", portraitConcept="head-and-hood", backgroundConcept="deep purple tension fog"),
    "reptile-black-mamba": dict(pose="sleek raised head, mouth ajar", expression="lethal speed intent", cameraAngle="3/4-left", portraitConcept="head-and-neck", backgroundConcept="dark violet speed haze"),
    "reptile-taipan": dict(pose="alert coiled strike posture", expression="extreme venom precision", cameraAngle="3/4-right", portraitConcept="head crop", backgroundConcept="hot purple dust fog"),
    "reptile-anaconda": dict(pose="massive thick head forward", expression="overwhelming coil power", cameraAngle="slight-low", portraitConcept="huge head-and-neck", backgroundConcept="heavy purple river fog"),
    "reptile-black-caiman": dict(pose="armored snout 3/4, teeth hint", expression="amazon apex aggression", cameraAngle="3/4-left", portraitConcept="head-and-jaws", backgroundConcept="black-violet night water fog"),
    "reptile-crocodile": dict(pose="classic croc head, jaws powerful", expression="ambush king menace", cameraAngle="3/4-right", portraitConcept="head-and-jaws", backgroundConcept="deep purple reed fog abstract"),
    "reptile-komodo-dragon": dict(pose="monitor head forward, tongue optional", expression="apex reptile confidence", cameraAngle="slight-low", portraitConcept="head-and-neck", backgroundConcept="volcanic violet dust haze"),
    "reptile-dragon-of-moses-i": dict(pose="horned serpent head + readable neck", expression="first terror, still graspable scale", cameraAngle="3/4-left", portraitConcept="large-head-and-neck", backgroundConcept="mythic violet storm fog"),
    "reptile-dragon-of-moses-ii": dict(pose="colossal dragon head filling frame", expression="grown beyond ordinary scale", cameraAngle="slight-low", portraitConcept="frame-filling-colossal-head", backgroundConcept="violent violet lava-mist atmosphere"),
    "reptile-dragon-of-moses-iii": dict(pose="extreme scale eye-only composition", expression="incomprehensible vastness", cameraAngle="extreme-close eye", portraitConcept="extreme-scale-eye-only", backgroundConcept="abyssal shadow around giant eye"),
}

STYLE = (
    "stylized semi-realistic fantasy illustration, collectible card portrait quality, "
    "cinematic lighting, strong silhouette, mysterious competitive mood, controlled stylization, "
    "between cartoon and photorealism, atmospheric background only"
)
NEG = (
    "no text, no numbers, no letters, no watermark, no UI, no card frame, no border, no power bar, "
    "no suit symbol, no photography, no chibi, no childish cartoon, no horror gore, no excessive glow, "
    "no full landscape scenery, no extra limbs, no extra eyes"
)

SUIT_DIR = {"carnivore": "carnivores", "herbivore": "herbivores", "bird": "birds", "reptile": "reptiles"}


def gen_prompt(card, d):
    legendary = card["type"] == "legendary"
    leg = "legendary premium presence, richer atmosphere, subtle magical accent only, " if legendary else ""
    species = card["englishName"]
    if card["id"] == "reptile-dragon-of-moses-iii":
        return (
            f"Fantasy trading-card legendary portrait concept extreme-scale-eye-only for Dragon of Moses III: "
            f"intentional composition showing primarily one enormous eye, surrounding dragon scales, "
            f"a tiny fragment of facial structure, and deep shadow. The creature must feel too large to fit in the frame. "
            f"Do NOT show a complete head. Do NOT look like a random zoom of a normal dragon. "
            f"{STYLE}, violet abyssal atmosphere, {leg}vertical 3:4 portrait, {NEG}"
        )
    if card["id"] == "reptile-dragon-of-moses-ii":
        return (
            f"Fantasy trading-card legendary portrait of Dragon of Moses II, second manifestation, "
            f"substantially larger more terrifying dragon head occupying most of the frame, limbs hinted if any, "
            f"lava-eyed intensity, scale feels beyond ordinary, frame almost insufficient, "
            f"{STYLE}, {d['backgroundConcept']}, {leg}camera {d['cameraAngle']}, vertical 3:4, {NEG}"
        )
    if card["id"] == "reptile-dragon-of-moses-i":
        return (
            f"Fantasy trading-card legendary portrait of Dragon of Moses I, first manifestation, "
            f"large frightening horned serpent-dragon with complete head and significant neck still readable, "
            f"graspable scale, {d['expression']}, {STYLE}, {d['backgroundConcept']}, {leg}"
            f"camera {d['cameraAngle']}, vertical 3:4, {NEG}"
        )
    return (
        f"Fantasy trading-card creature portrait of {species}, {d['pose']}, expression: {d['expression']}, "
        f"camera: {d['cameraAngle']}, crop: {d['portraitConcept']}, background: {d['backgroundConcept']}, "
        f"{leg}{STYLE}, vertical 3:4 portrait of the creature only, {NEG}"
    )


def main():
    prompt_root = ROOT / "prompts/portraits/final"
    prompt_root.mkdir(parents=True, exist_ok=True)
    entries = []
    missing_dir = []
    for card in CARDS:
        cid = card["id"]
        if cid not in DIR:
            missing_dir.append(cid)
            continue
        d = DIR[cid]
        suit_folder = SUIT_DIR[card["suit"]]
        slug = card["slug"]
        rel_asset = f"assets/cards/portraits/final/{suit_folder}/{slug}.png"
        rel_webp = f"assets/cards/portraits/final/{suit_folder}/{slug}.webp"
        prompt_file = f"prompts/portraits/final/{slug}.md"
        status = "needs-review" if card.get("status") == "needs-review" else "ready-for-generation"
        prompt_body = gen_prompt(card, d)
        (prompt_root / f"{slug}.md").write_text(
            f"# Production Portrait Prompt — {card['englishName']}\n\n"
            f"**cardId:** `{cid}`  \n"
            f"**rank:** {card['displayRank']} · **suit:** {card['suit']} · **type:** {card['type']}  \n"
            f"**productionStatus (initial):** `{status}`\n\n"
            f"## Direction\n"
            f"- pose: {d['pose']}\n"
            f"- expression: {d['expression']}\n"
            f"- cameraAngle: {d['cameraAngle']}\n"
            f"- portraitConcept: {d['portraitConcept']}\n"
            f"- backgroundConcept: {d['backgroundConcept']}\n\n"
            f"## Generation prompt (portrait only)\n\n{prompt_body}\n",
            encoding="utf-8",
        )
        entries.append(
            {
                "cardId": cid,
                "englishName": card["englishName"],
                "persianName": card["persianName"],
                "suit": card["suit"],
                "rank": card["displayRank"],
                "type": card["type"],
                "pose": d["pose"],
                "expression": d["expression"],
                "cameraAngle": d["cameraAngle"],
                "portraitConcept": d["portraitConcept"],
                "backgroundConcept": d["backgroundConcept"],
                "promptFile": prompt_file,
                "assetPath": rel_asset,
                "optimizedAssetPath": rel_webp,
                "productionStatus": status,
                "revisionCount": 0,
                "generationNotes": "",
                "generationPrompt": prompt_body,
            }
        )

    if missing_dir:
        raise SystemExit(f"Missing DIR for: {missing_dir}")

    # ensure unique asset paths
    paths = [e["assetPath"] for e in entries]
    assert len(paths) == len(set(paths)) == 52

    manifest = {
        "project": "کیمیای وحش",
        "phase": "12-portrait-production",
        "artDirectionRef": "docs/card-art-direction.md",
        "qualityRulesRef": "docs/portrait-production-quality-rules.md",
        "canonicalCardsRef": "data/cards.json",
        "count": 52,
        "portraits": entries,
    }
    (ROOT / "data/portrait-production-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    # export prompts json for generator
    (ROOT / "data/_gen_prompts.json").write_text(
        json.dumps([{k: e[k] for k in ('cardId','slug','suit','assetPath','generationPrompt','productionStatus') if k in e or True}
                    for e in [{**e, 'slug': e['assetPath'].split('/')[-1].replace('.png','')} for e in entries]],
                   ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print("manifest", len(entries), "prompts", len(list(prompt_root.glob('*.md'))))
    print("ready", sum(1 for e in entries if e['productionStatus']=='ready-for-generation'))
    print("needs-review", sum(1 for e in entries if e['productionStatus']=='needs-review'))


if __name__ == "__main__":
    main()
