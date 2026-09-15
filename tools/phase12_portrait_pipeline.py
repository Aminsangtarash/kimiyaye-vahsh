from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json

ROOT = Path(r"d:\Projects\card game\site")
FINAL = ROOT / "assets/cards/portraits/final"
REVIEW = ROOT / "review/portraits"
REVIEW.mkdir(parents=True, exist_ok=True)

def encode_webp(suit_dir: Path):
    for p in sorted(suit_dir.glob("*.png")):
        im = Image.open(p).convert("RGBA")
        out = p.with_suffix(".webp")
        im.save(out, "WEBP", quality=90, method=4)
        print(f"webp {p.name} {im.size} -> {out.stat().st_size}")

def contact_sheet(suit: str, filenames: list[str], out_name: str, cols=5, thumb=(360,480), pad=12):
    paths = [FINAL / suit / f"{n}.png" for n in filenames]
    paths = [p for p in paths if p.exists()]
    if not paths:
        print("no images for", suit)
        return
    rows = (len(paths) + cols - 1) // cols
    w = cols * thumb[0] + (cols + 1) * pad
    h = rows * thumb[1] + (rows + 1) * pad
    sheet = Image.new("RGB", (w, h), (18, 14, 16))
    for i, p in enumerate(paths):
        im = Image.open(p).convert("RGB")
        im.thumbnail(thumb, Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", thumb, (18, 14, 16))
        ox = (thumb[0] - im.width) // 2
        oy = (thumb[1] - im.height) // 2
        canvas.paste(im, (ox, oy))
        r, c = divmod(i, cols)
        x = pad + c * (thumb[0] + pad)
        y = pad + r * (thumb[1] + pad)
        sheet.paste(canvas, (x, y))
    out = REVIEW / out_name
    sheet.save(out, "JPEG", quality=92, optimize=True)
    print("sheet", out, sheet.size)

carnivores = ['wolverine','fox','snow-leopard','wolf','hyena','jaguar','bear','tiger','lion','polar-bear','amarok','griffon','nemean-lion']
encode_webp(FINAL / "carnivores")
contact_sheet("carnivores", carnivores, "carnivores.jpg", cols=5)
print("done")
