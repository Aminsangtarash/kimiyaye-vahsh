# Source Audit — کیمیای وحش (Phase 01)

**Canonical data file:** `site/data/cards.json` (schema: `cards.schema.json`)

تاریخ ممیزی: 2026-09-12  
دامنه: فقط منابع متنی/نام‌فایل؛ بدون ساخت UI، Frame یا Game Engine.

## منابع یافت‌شده

| منبع | نوع | نقش |
|------|-----|-----|
| `prompts.txt` | متن قوانین کارت | ۴ دسته، رنگ تم، سیستم قدرت ۱–۱۳ / A·B·C، قوانین چیدمان کارت، lore اژدهای موسی |
| `لیست گوشتخواران.txt` | رتبه | ۱۳ کارت با قدرت (۱–۱۰ + A/B/C) |
| `لیست گیاه خواران.txt` | فهرست بدون رتبه | ۱۷ نام |
| `لیست پرندگان.txt` | فهرست نیمه‌رتبه‌ای | چند قدرت صریح + نام‌های بدون رتبه |
| `لیست خزندگان.txt` | جدول رتبه کامل | ۱۳ کارت + دلیل جایگاه |
| `گوشتخواران/` + `.zip` | تصویر | ۱۳ کارت نام‌دار + چند Gemini بی‌نام |
| `گیاهخواران/` + `.zip` | تصویر | ۱۴ تصویر نام‌دار (شامل King Kong خارج از لیست) |
| `پرندگان/` + `.zip` | تصویر | ۱۳ نام‌دار در فولدر؛ ZIP حاوی ۲۲ Gemini اضافی بی‌نام |
| `خزندگان/` + `.zip` | تصویر | موجودات نام‌دار + Geminiهای بی‌نام |

## گوشت‌خواران — Base List قفل‌شده

منبع معتبر: `لیست گوشتخواران.txt` → `site/data/carnivores.json`

| Rank | originalName | englishName |
|------|--------------|-------------|
| 1 | wolverine | Wolverine |
| 2 | fox | Fox |
| 3 | snow loard | Snow Leopard |
| 4 | wolf | Wolf |
| 5 | hyena | Hyena |
| 6 | jagvar | Jaguar |
| 7 | bear | Bear |
| 8 | tiger | Tiger |
| 9 | lion | Lion |
| 10 | polar bear | Polar Bear |
| C | amarok | Amarok |
| B | griffon | Griffon |
| A | nemean lion | Nemean Lion |

۱۳/۱۳ عضو قفل؛ حذف/جایگزینی ممنوع در این فاز.  
نکته asset: فایل‌ها `8_lion` / `9_tiger` هستند؛ رتبه Base List برعکس است و برنده است.

### رتبه‌های A / B / C (بدون mapping عددی)

```json
{ "originalRank": "A", "numericPower": null, "displayRank": "A" }
```

- Nemean Lion → A  
- Griffon → B  
- Amarok → C  

Mapping به ۱۱/۱۲/۱۳ فعلاً انجام نشده؛ `faceRankMap` = deferred.

### Design Target: normal / legendary

ترجیح نرم (نه قانون سخت): **۱۰ normal + ۳ legendary** در هر Suit.

- `type`: `"normal"` | `"legendary"` | `null`
- اگر مطمئن نیستیم: `status: "needs-review"` و `type: null` (بدون حدس قطعی)
- فعلاً needs-review: `birds-mish-margh`, `herbivores-king-kong`

## World Bible

**یافت نشد.** هیچ فایل با نام/محتوای World Bible، lore bible، یا سند جهان‌سازی جداگانه در `d:\Projects\card game` وجود ندارد.  
تنها lore مکتوب فعلی: بخش اژدهای موسی در `prompts.txt` + ستون «دلیل جایگاه» در `لیست خزندگان.txt`.

## ZIP خزندگان — نام فایل‌ها → موجودات

محتویات `خزندگان.zip` (۱۵ فایل):

| فایل | موجود شناسایی‌شده |
|------|-------------------|
| `alligator_turtle.png` | Alligator Snapping Turtle |
| `python.png` | Python |
| `kong_cobra.png` | King Cobra (typo در نام) |
| `black_mamba.png` | Black Mamba |
| `taipan.png` | Taipan |
| `anaconda.png` | Anaconda |
| `crocodill.png` | Crocodile (typo) |
| `black caiman.png` | Black Caiman |
| `Komodo_dragon.png` | Komodo Dragon |
| `dragon_of_Moses.png` | Dragon of Moses I (C) |
| `dragon_of_Moses_2.png` | Dragon of Moses II (B) |
| `dragon_of_Moses_3.png` | Dragon of Moses III (A) |
| `gharial.png` | Gharial (**خارج از لیست رتبه‌دار**) |
| `Gemini_Generated_Image_1c93d6…png` | بی‌نام — نگه داشته می‌شود، هویت نامشخص |
| `Gemini_Generated_Image_fj8cb9…png` | بی‌نام — نگه داشته می‌شود، هویت نامشخص |

نکته: فولدر استخراج‌شده `خزندگان/` Geminiهای بیشتری نسبت به ZIP دارد (حدود ۱۶ فایل Gemini اضافی). هیچ‌کدام نام موجود ندارند → در داده Deck به‌عنوان asset بی‌نام ثبت می‌شوند، نه حذف.

**Gila Monster** در لیست رتبه ۲ است ولی در ZIP و فولدر فایل نام‌دار ندارد.

## ZIPهای دیگر (خلاصه)

- **گوشتخواران.zip:** ۱۳ کارت شماره‌دار ۱–۱۳ + ۱ Gemini؛ با لیست هم‌خوان (به‌جز جابه‌جایی lion/tiger در txt که با `prompts.txt` و نام فایل حل شد: شیر=۸، ببر=۹).
- **پرندگان.zip:** همان نام‌دارهای فولدر + ۲۲ Gemini بی‌نام که در فولدر استخراج‌شده نیستند.
- **گیاهخواران.zip:** ۱۴ تصویر نام‌دار؛ مسیر ZIP تخت است (`گیاهخواران/*.png`) در حالی که فولدر تو در تو است (`گیاهخواران/گیاهخواران/`).

## دسته‌ها (از prompts)

1. گوشتخواران پستاندار — تم قرمز  
2. گیاه‌خواران پستاندار — تم سبز  
3. خزندگان — تم بنفش  
4. پرندگان — تم آبی  

سیستم قدرت مشترک: عدد ۱–۱۰ + حروف C/B/A (=۱۱/۱۲/۱۳)، نوار قدرت ۱۳ قسمتی.

## موجودات افسانه‌ای شناسایی‌شده

| موجود | دسته | وضعیت رتبه |
|-------|------|------------|
| Amarok | carnivores | C |
| Griffon | carnivores | B |
| Nemean Lion | carnivores | A |
| Dragon of Moses I/II/III | reptiles | C/B/A — **سه کارت Legendary مستقل** (نه alt-art)؛ هر تبدیل بزرگ‌تر/قوی‌تر/ترسناک‌تر |

| Homa | birds | C (۱۱) |
| Phoenix | birds | B (۱۲) |
| Simurgh | birds | A (۱۳) |
| Unicorn, Bonnacon, Behemoth | herbivores | بدون رتبه |
| King Kong | herbivores | فقط asset |
| Mish Margh | birds | فقط لیست |

## اصل حفظ داده

هیچ ردیف لیست، asset نام‌دار، یا Gemini بی‌نام حذف نشده است.  
موارد مبهم با `dataStatus`: `unranked` | `list-only` | `asset-only` | `conflict` علامت‌گذاری می‌شوند.

خروجی ساختاریافته: `site/data/deck.json`, `suits.json`, `schema.json`.
