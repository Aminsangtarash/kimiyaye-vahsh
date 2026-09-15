# Name Review — کیمیای وحش (Phase 01)

قانون: هیچ اصلاحی بدون حفظ مقدار اصلی (`originalName`) انجام نشده است.

هر کارت دارای:

```json
{
  "originalName": "",
  "englishName": "",
  "persianName": ""
}
```

`nameEn` / `nameFa` به‌عنوان alias سازگاری باقی مانده‌اند.

## Typo / Spelling (اصلی حفظ شد)

| originalName | englishName | منبع |
|--------------|-------------|------|
| snow loard | Snow Leopard | لیست گوشت‌خواران |
| jagvar | Jaguar | لیست گوشت‌خواران |
| phonix | Phoenix | لیست پرندگان / فایل |
| reven | Raven | لیست پرندگان |
| wandering albatoress | Wandering Albatross | لیست پرندگان |
| wolverin (asset) | Wolverine | نام فایل |
| kong_cobra (asset) | King Cobra | نام فایل |
| crocodill (asset) | Crocodile | نام فایل |
| Greate hornbill (asset) | Great Hornbill | نام فایل |
| griffon | Griffon | املای جایگزین griffin هم رایج است |

## فارسی — نکات

| englishName | persianName | یادداشت |
|-------------|-------------|---------|
| Wolverine | گورکن عسلی | به‌جای آوانویسی ولوورین |
| Raven | غراب | مشخص‌تر از کلاغ |
| Great Hornbill | نوک‌شاخ بزرگ | به‌جای آوانویسی هورنبیل |
| Shikra | شکرا | فرم رایج‌تر از شیکرا |
| Cassowary | کاسوآر | نرمال‌سازی کاسوآری |
| Gharial | گاریال | اصلاح پیش‌نویس غارایال |
| Bearded Vulture | کرکس ریش‌دار | همای ریش‌دار عمداً استفاده نشد (تداخل با هما) |
| Buffalo | بوفالو | مبهم: گاومیش؟ — در notes |
| Yak | یاک | جایگزین: گاو تبتی |
| Griffon | گریفون | جایگزین ادبی: شیردال |

نام‌های فارسی لیست خزندگان بدون تغییر پذیرفته شدند.

## Duplicate / همپوشانی (حذف نشد)

1. **Eagle cluster:** `eagle` + `harpy eagle` + `philippine eagle` + asset `10_eagle.png`
2. **Vulture cluster:** `vulture` vs `bearded vulture` (جدا نگه داشته شد)
3. **Lion cluster:** `lion` vs `nemean lion` (واقعی vs افسانه‌ای — OK)
4. **Ape cluster:** `gorilla` vs `king kong` (هر دو مانده)
5. **Bear cluster:** `bear` vs `polar bear` (OK)

## واقعی / افسانه‌ای

با فیلدهای `type` / `status` هم‌خوان است. مورد مبهم نام:

- **Mish Margh / میش‌مرغ** — `needs-review`
- **King Kong** — `needs-review`

## دسته (Suit)

| مورد | وضعیت |
|------|--------|
| همه اعضای Base List گوشت‌خواران | دسته قفل — OK |
| Dragon of Moses در Reptiles | طبق منبع — OK |
| Griffon در Carnivores | طبق Base List — OK (هیبرید) |
| Gorilla در Herbivores | طبق لیست — OK |
| King Kong در Herbivores | asset-only؛ مناسب بودن دسته needs-review |
| Falcon در Birds | asset-only؛ دسته منطقی — OK |
| Gharial در Reptiles | asset-only؛ دسته منطقی — OK |

## خروجی داده

- `deck.json` — همه کارت‌ها
- `carnivores.json` — Base List
- `candidates-by-suit.json` — همه گزینه‌ها
