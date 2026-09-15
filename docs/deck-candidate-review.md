# Deck Candidate Review — Phase 02

پروژه: **کیمیای وحش (Kimiyaye Vahsh)**  
فاز: **02 — Deck Selection & Ranking Draft**  
وضعیت: پیش‌نویس قابل بررسی (هنوز نهایی نیست)

## ساختار نهایی مورد هدف

| مورد | مقدار |
|------|--------|
| دسته‌ها | Carnivores · Herbivores · Birds · Reptiles |
| کارت در هر دسته | ۱۳ |
| مجموع Main Deck | ۵۲ |
| ترکیب ترجیحی هر دسته | ۱۰ `normal` + ۳ `legendary` |
| سختی قانون | **ترجیحی** — Hardcoded نیست |
| سیاست کمبود داده | مستند کن؛ موجود جدید اختراع نکن |

### وضعیت رعایت در Draft فعلی

| Suit | Total | Normal | Legendary | Matches 10+3? | توضیح |
|------|-------|--------|-----------|---------------|--------|
| carnivore | 13 | 10 | 3 | بله | Base List قفل |
| herbivore | 13 | 10 | 3 | بله | Unicorn / Bonnacon / Behemoth از منبع؛ King Kong زوری وارد نشد |
| bird | 13 | 10 | 3 | بله | Homa / Phoenix / Simurgh از منبع؛ Mish Margh زوری وارد نشد |
| reptile | 13 | 10 | 3 | بله | Dragon of Moses I/II/III از لیست رتبه‌دار |

- **Forced inventions:** هیچ  
- **Gaps که جلوی ۱۰+۳ را بگیرد:** هیچ (در این draft)

موجودات مبهم (`King Kong`, `Mish Margh`) به‌جای پر کردن اجباری اسلات legendary، در **bench** با وضعیت needs-review مانده‌اند.

## اصول اصلی Deck (تونالیته)

منبع: `docs/design-principles.md`

**باید:** حرفه‌ای · فانتزی · مرموز · رقابتی · قابل فهم · مناسب نوجوان و بزرگسال  

**نباید:** کودکانه · Chibi · بیش از حد شلوغ · Horror · Photorealistic Stock-like  

این اصول برای تمام Suitها و فاز هنر بعدی الزامی است؛ در Phase 02 فقط به‌صورت سند ثبت می‌شوند.

## مبنا

- `data/cards.json` (Canonical Phase 01)
- `data/suits.json`
- منابع اولیه: `لیست *.txt`, `prompts.txt`, فولدر/ZIP تصاویر
- ممیزی‌های Phase 01: `SOURCE_AUDIT.md`, `NAME_AUDIT.md`, `carnivores.json`

## هدف این فاز

ساخت **اولین نسخه کامل ۵۲ کارت اصلی** (۴ × ۱۳) برای بررسی.

خارج از محدوده:

- تصویر نهایی کارت
- Card Frame
- UI / محیط بازی / Game Engine

## قوانین انتخاب

1. هر Suit دقیقاً ۱۳ کارت با رتبه‌های یکتا: `1–10` + `C` + `B` + `A`
2. هدف نرم طراحی: حدوداً ۱۰ `normal` + ۳ `legendary` در هر Suit (Hardcoded نیست)
3. A/B/C به عدد ۱۱/۱۲/۱۳ تبدیل نمی‌شوند؛ `numericPower` برای face ranks همچنان `null`
4. هیچ نامی بدون حفظ `originalName` در Canonical تغییر نکرده؛ این فایل فقط انتخاب/رتبه می‌کند
5. گزینه‌های حذف‌شده حذف فیزیکی نمی‌شوند → به `bench` منتقل می‌شوند

## خروجی داده

| فایل | نقش |
|------|-----|
| `data/main-deck.draft.json` | ۵۲ کارت اصلی + ۱۲ bench |
| `docs/deck-candidate-review.md` | همین سند rationales |

---

## 1) Carnivore — قفل ثابت (Phase 02)

**وضعیت: LOCKED — حذف یا جایگزینی ممنوع.**

لیست ثابت تأییدشده:

| Rank | englishName | originalName | type |
|------|-------------|--------------|------|
| 1 | Wolverine | wolverine | normal |
| 2 | Fox | fox | normal |
| 3 | Snow Leopard | snow loard | normal |
| 4 | Wolf | wolf | normal |
| 5 | Hyena | hyena | normal |
| 6 | Jaguar | jagvar | normal |
| 7 | Bear | bear | normal |
| 8 | Tiger | tiger | normal |
| 9 | Lion | lion | normal |
| 10 | Polar Bear | polar bear | normal |
| C | Amarok | amarok | legendary |
| B | Griffon | griffon | legendary |
| A | Nemean Lion | nemean lion | legendary |

Typoها فقط در `englishName` اصلاح شده‌اند؛ `originalName` حفظ شده:

- `snow loard` → Snow Leopard
- `jagvar` → Jaguar

منبع معتبر: `لیست گوشتخواران.txt` / `carnivores.json` / `suitLocks.carnivore` در `main-deck.draft.json`

یادداشت باقی‌مانده: نام فایل‌های `8_lion` / `9_tiger` با رتبه لیست هم‌خوان نیستند؛ رتبه لیست مبناست.

---

## 2) Reptile — لیست رتبه‌دار منبع

منبع معتبر: `لیست خزندگان.txt`

### تصمیم قطعی — Dragon of Moses

**سه کارت Legendary مستقل** هستند، نه سه تصویر جایگزین از یک موجود.

طبق داستان: عصا **سه بار** به اژدها تبدیل می‌شود و هر بار موجود بزرگ‌تر، قدرتمندتر و ترسناک‌تر می‌شود.

| Card | Rank | مدل |
|------|------|------|
| Dragon of Moses I | C | کارت افسانه‌ای مستقل |
| Dragon of Moses II | B | کارت افسانه‌ای مستقل |
| Dragon of Moses III | A | کارت افسانه‌ای مستقل |

این تصمیم **FINAL** است و در `suitLocks.reptile-legendaries` قفل شده.

### هویت و Art Direction (metadata)

هنوز تصویر ساخته نمی‌شود؛ فقط راهنمای فاز هنر ثبت شده است.

| Card | Rank | portraitConcept | راهنما |
|------|------|-----------------|--------|
| Dragon of Moses I | C | `large-head-and-neck` | اندازه هنوز قابل درک؛ بخش بزرگی از سر و گردن |
| Dragon of Moses II | B | `frame-filling-colossal-head` | بزرگ‌تر و مهیب‌تر؛ سر Frame را بیشتر پر کند |
| Dragon of Moses III | A | `extreme-scale-eye-only` | **استثنای هنری:** Frame=Legendary ثابت؛ Portrait فقط giant eye + scales + fragment of face + strong shadow — هدف: اندازه غیرقابل تصور |

نمونه metadata برای III:

```json
{
  "portraitConcept": "extreme-scale-eye-only",
  "artisticException": true,
  "artDirection": {
    "frameRule": "same-legendary-frame",
    "visibleElements": [
      "giant eye",
      "surrounding scales",
      "fragment of face",
      "strong shadow"
    ],
    "goal": "Communicate an unimaginable / incomprehensible creature size — the frame cannot contain it."
  }
}
```

۱۳ ردیف رتبه‌دار عیناً Main Deck شدند. **Gharial** (asset اضافی) به bench رفت.

| Rank | English | Persian | Type | Rank source | Status |
|------|---------|---------|------|-------------|--------|
| 1 | Alligator Snapping Turtle | لاک‌پشت گازگیر تمساحی | normal | source-list | candidate |
| 2 | Gila Monster | هیولای گیلا | normal | source-list | candidate |
| 3 | Python | پایتون | normal | source-list | candidate |
| 4 | King Cobra | شاه‌کبرا | normal | source-list | candidate |
| 5 | Black Mamba | مامبای سیاه | normal | source-list | candidate |
| 6 | Taipan | تایپان | normal | source-list | candidate |
| 7 | Anaconda | آناکوندا | normal | source-list | candidate |
| 8 | Crocodile | کروکودیل | normal | source-list | candidate |
| 9 | Black Caiman | کایمن سیاه | normal | source-list | candidate |
| 10 | Komodo Dragon | اژدهای کومودو | normal | source-list | candidate |
| C | Dragon of Moses I | اژدهای موسی، تجلی نخست | legendary | source-list-final | approved |
| B | Dragon of Moses II | اژدهای موسی، تجلی دوم | legendary | source-list-final | approved |
| A | Dragon of Moses III | اژدهای موسی، تجلی نهایی | legendary | source-list-final | approved |

یادداشت:

- Gila Monster بدون asset نام‌دار هم در Deck مانده (طبق لیست).
- `mythicForm` برای این سه کارت منسوخ/null است؛ نباید به‌عنوان multi-form art خوانده شوند.

---

## 3) Bird — نیمه‌منبع + پیش‌نویس ۱–۶

### از منبع (۷–۱۰ و A/B/C)

| Rank | Card | دلیل |
|------|------|------|
| 7 | Bearded Vulture | صریح در لیست |
| 8 | Ostrich | صریح در لیست |
| 9 | Cassowary | صریح در لیست |
| 10 | Harpy Eagle | صریح در لیست؛ asset=`10_eagle.png` → **needs-review** هویت هنر |
| C | Homa | قدرت ۱۱ در لیست → face C |
| B | Phoenix | قدرت ۱۲ / `phonix` → face B |
| A | Simurgh | قدرت ۱۳ + تأکید prompts |

### پیش‌نویس Phase 02 برای رتبه‌های ۱–۶

معیار: ترجیح هویت رقابتی/شکارچی، تمایز بصری، اولویت asset موجود، پرهیز از شلوغی خوشه عقاب.

| Rank | English | Persian | Type | Rank source | Status |
|------|---------|---------|------|-------------|--------|
| 1 | Raven | غراب | normal | phase-02-draft | draft |
| 2 | Owl | جغد | normal | phase-02-draft | draft |
| 3 | Vulture | کرکس | normal | phase-02-draft | draft |
| 4 | Great Hornbill | نوک‌شاخ بزرگ | normal | phase-02-draft | draft |
| 5 | Secretary Bird | مرغ منشی | normal | phase-02-draft | draft |
| 6 | Falcon | شاهین | normal | phase-02-draft | draft |
| 7 | Bearded Vulture | کرکس ریش‌دار | normal | source-list | candidate |
| 8 | Ostrich | شترمرغ | normal | source-list | candidate |
| 9 | Cassowary | کاسوآر | normal | source-list | candidate |
| 10 | Harpy Eagle | عقاب هارپی | normal | source-list | needs-review |
| C | Homa | هما | legendary | source-list | candidate |
| B | Phoenix | ققنوس | legendary | source-list | candidate |
| A | Simurgh | سیمرغ | legendary | source-list | candidate |

### Bench پرندگان

| Card | دلیل |
|------|------|
| Shikra | رپتور کوچک‌تر از Falcon انتخابی |
| Heron | حضور رزمی کمتر |
| Wandering Albatross | هویت رقابتی ضعیف‌تر |
| Philippine Eagle | شلوغی eagle-cluster؛ Harpy در ۱۰ ماند |
| Eagle (generic) | همپوشانی / needs-review |
| Mish Margh | هویت/type نامشخص — وارد legendary نشد |

---

## 4) Herbivore — پیش‌نویس کامل رتبه

لیست منبع بدون رتبه بود (۱۷ نام + King Kong فقط asset).

هدف نرم: ۱۰ normal + ۳ legendary.

### Legendary draft

| Rank | Card | منطق پیش‌نویس |
|------|------|----------------|
| C | Bonnacon | افسانه‌ای کمتر شناخته؛ پله اول face |
| B | Unicorn | افسانه‌ای کلاسیک میانی |
| A | Behemoth | قوی‌ترین mythical گیاه‌خوار |

King Kong وارد Main نشد (needs-review + اسلات legendary پر است).

### Normal draft (۱–۱۰)

منطق کلی: از حضور رزمی/تهدید کمتر → جثه و فشار بیشتر، با حفظ تمایز کارتی.

| Rank | English | Persian | Type | Rank source | Status |
|------|---------|---------|------|-------------|--------|
| 1 | Deer | گوزن | normal | phase-02-draft | draft |
| 2 | Panda | پاندا | normal | phase-02-draft | draft |
| 3 | Kangaroo | کانگورو | normal | phase-02-draft | draft |
| 4 | Buffalo | بوفالو | normal | phase-02-draft | draft |
| 5 | Boar | گراز | normal | phase-02-draft | draft |
| 6 | Gorilla | گوریل | normal | phase-02-draft | draft |
| 7 | Rhinoceros | کرگدن | normal | phase-02-draft | draft |
| 8 | Hippopotamus | اسب آبی | normal | phase-02-draft | draft |
| 9 | Elephant | فیل | normal | phase-02-draft | draft |
| 10 | Mammoth | ماموت | normal | phase-02-draft | draft |
| C | Bonnacon | بوناکن | legendary | phase-02-draft | draft |
| B | Unicorn | تک‌شاخ | legendary | phase-02-draft | draft |
| A | Behemoth | بهیموت | legendary | phase-02-draft | draft |

### Bench گیاه‌خواران

| Card | دلیل |
|------|------|
| Tapir | list-only، تمایز کمتر |
| Okapi | list-only، فانتزی رقابتی کمتر |
| Yak | همپوشانی با Buffalo |
| Giraffe | جثه بدون تهدید هم‌تراز Hippo/Rhino/Elephant |
| King Kong | needs-review type/suit |

یادداشت: Buffalo از نظر گونه مبهم است (گاومیش؟) — در notes Canonical مانده؛ رتبه draft است.

---

## خلاصه شمارش

| Suit | Main | Legendary | Bench |
|------|------|-----------|-------|
| carnivore | 13 | 3 | 0 |
| herbivore | 13 | 3 | 5 |
| bird | 13 | 3 | 6 |
| reptile | 13 | 3 | 1 |
| **Total** | **52** | **12** | **12** |

`rankSource`:

- `base-list`: 13
- `source-list`: 20
- `phase-02-draft`: 19

---

## موارد باز برای تأیید انسانی

1. **Herbivore ranks 1–10 و ترتیب C/B/A** — کامل draft هستند.
2. **Bird ranks 1–6** — draft؛ جابه‌جایی با Shikra / Philippine Eagle ممکن است.
3. **Harpy Eagle art** — آیا `10_eagle.png` همان Harpy است؟
4. **Tiger=8 / Lion=9** در برابر مثال قدیمی Lion=8 در prompts.
5. **Gila Monster** بدون هنر نام‌دار در Main مانده.
6. **Bonnacon** بدون asset در Main مانده (مثل Gila).
7. آیا **Mammoth** باید ۱۰ بماند یا با Elephant جابه‌جا شود؟
8. آیا **King Kong** باید جایگزین یکی از legendary گیاه‌خوار شود؟

---

## مرحله بعد (خارج از این Phase)

پس از تأیید/اصلاح این draft:

- قفل کردن Main Deck 52
- (اختیاری) تصمیم mapping A/B/C → عدد
- سپس فاز هنر/Frame — نه الان
