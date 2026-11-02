# Hebrew style guide (October 2026)

How CreativeIn writes Hebrew: on the site, in the companies app and in every email.

Based on research in October 2026. The main source is the Israeli government's writing guide for its digital products, "אפיון שפה למוצרים הדיגיטליים של ממשלת ישראל", which Kinneret Yifrah wrote for Digital Israel in 2020 (https://kinnerety.wixsite.com/digitalisrael/all-the-guidelines). The second is Yifrah's own blog (microcopy.co.il). The third is the live copy of 17 Israeli sites: Wolt, Wix, Haaretz, TheMarker, Geektime, Firma, Leumi, Discount, Bezeq, the Tel Aviv municipality, Isracard, PayBox, Pepper, BuyMe, Bezalel, Globes and Ynet.

## The one decision that differs from the government guide
The government guide ranks plural address last. It prefers neutral singular ("שלך"), first person, nouns and infinitives.

We address readers in the plural imperative ("בחרו", "נסו שוב"), as Wolt, Wix, Haaretz, Firma and Geektime do. "דברו אלינו" also calls this correct Hebrew for addressing everyone. This is the owner's choice. It holds up only with the other rules below: buttons are nouns, consent is first person, and confirmation questions use the infinitive.

## 1. Form of address
- **Plural imperative for instructions and invitations.** ✅ בחרו תחומים · נסו שוב · כתבו לנו
- **One form per message.** Never mix plural and singular. ❌ "בדקו את המייל שלך" → ✅ "בדקו את המייל שלכם", or impersonal: "הקישור נשלח למייל".
- **Never masculine singular.** That includes aria-label, title, alt and placeholder. ❌ חפש · שלח · לחץ · סגור · הצג → ✅ חיפוש · שליחה · סגירה · עוד תוצאות
- **Never slashes or dots** (בחר/י, משתמש.ת). Screen readers trip on them.
- **The infinitive stays in these places:**
  - confirmation questions: "למחוק את החשבון?"
  - a stated possibility: "אפשר להפסיק בכל רגע"
  - list or menu options
  - after כדי or רוצים
- **First person** for consent and for "send me": "אני רוצה לקבל…" · "שלחו לי קישור חדש" · "זה לא המייל שלי"
- **The product speaks as "we":** "לא הצלחנו לשלוח" · "נשלח לכם תזכורת". Use "בואו נ…" only for a step taken together.

## 2. Buttons and links
- **Functional button** = verbal noun plus object, so it's clear what happens. ✅ שמירת התחומים · מחיקת החשבון · שליחת קישור כניסה. ❌ שלח · אישור · המשך (alone)
- **Navigation** = "ל + noun". ✅ לכל המכרזים · לעמוד החברה · לחשבון שלי
- **One main CTA per page.** A short noun phrase with value: "הרשמה למייל השבועי". A plural imperative can go in the heading above it.
- **Dialogs:** two clear opposites. ✅ "מחיקה" / "השארת החשבון". ❌ "ביטול" next to a delete action.
- **Length and punctuation:** 1–4 words on functional buttons. No "!", "." or "?" on buttons.
- **Links describe the destination.** ❌ "לחצו כאן" → ✅ "למדיניות הפרטיות"

## 3. Forms
- **Labels** are short nouns with no colon: "מייל", "שם מלא", "עיר".
- **Placeholders** show an example only, never an instruction. Instructions go in helper text under the field.
- **Helper text** explains why and reassures: "נשתמש בו רק כדי לשלוח את המייל השבועי".
- **Optional fields:** prefer marking them "(לא חובה)" over marking the required ones.

## 4. Errors: what happened, then what to do
- **System faults in "we", never blaming the reader.** Don't use נכשל / שגוי / לא תקין / חוקי / אופס.
  - ❌ "השמירה נכשלה" → ✅ "לא הצלחנו לשמור. מה שכתבתם נשאר כאן. נסו שוב."
- **Validation messages are specific and spoken:**
  - ❌ "כתובת מייל לא תקינה" → ✅ "חסר @ בכתובת" / "הכתובת לא נראית שלמה. בדקו אותה."
  - ❌ "שדה חובה" → ✅ "נצטרך גם כתובת מייל"
- **Limits give a time:** "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות."

## 5. Empty states
A heading that states the situation, then why it's worth acting, then a "ל + noun" button.
- ✅ "עוד אין חברות במעקב" / "מה שבמעקב מגיע ראשון במייל השבועי." / [לחיפוש חברות]
- ❌ "אין נתונים"

## 6. Success and confirmation
- **Short, factual, past tense.** No "בהצלחה" and no "!". ✅ "נשמר" · "התחומים עודכנו" · "הסרנו אתכם מהרשימה."
- **Say what happens next.** Never guess feelings (❌ "איזה כיף!").

## 7. Emails
- **Subject lines** are concrete, with the main thing first, 30–50 characters. At most one emoji, never in an error. Never "!!!" or "אל תפספסו".
- **Transactional mail** is functional: "הקישור שלכם ל־CreativeIn".
- **The weekly email** opens with "בוקר טוב," because it goes out Sunday morning. Transactional mail has no greeting.
- **Sign-off:** "צוות CreativeIn". Never "בברכה, הנהלת האתר".
- **Footer:** why they're receiving it, a link to stop the weekly email, and the sender's identity (anti-spam law §30A).

## 8. Tone
- **Warm, professional, short, specific.** Short and simple beats nice.
- **No hype or slogans.** ❌ "המהפכה של…", "איתכם ובשבילכם" → ✅ "37 עדכונים חדשים השבוע".
- **Plain words:**
  - אפשר, not ניתן
  - ל / בשביל, not עבור
  - עוד לא, not טרם
  - אם, not במידה ו
  - כש, not כאשר
  - בלי, not מבלי
  - מידע, not אינפורמציה
  - אפשרות, not אופציה
  - Spell out "על ידי"; never write ע״י
- **Name disciplines, not people**, in crafts and filters: "ארט דיירקשן", not "ארט דיירקטור". This also solves gender.
- **Talk to people, not about them.** Avoid "משתמשים", "נרשמים" and "לקוחות" in copy addressed to readers.

## 9. Typography
- **Maqaf ־ (U+05BE), no spaces.**
  - Between a Hebrew prefix and Latin text or digits: ב־2026, ה־AI, ל־Figma, ב־CreativeIn.
  - In compounds: פוסט־פרודקשן, תלת־ממד.
  - ❌ "ב-2026", "בFigma"
- **Dashes:**
  - An aside takes an en dash with spaces (" – ").
  - A range takes an en dash without spaces: "8,000–12,000 ₪", "9:00–18:00".
- **Gershayim ״ and geresh ׳** (typographic, not ASCII):
  - acronyms: מנכ״ל, ש״ח
  - loan sounds and abbreviations: ג׳וניור, פיץ׳, צ׳
- **Quotation marks:** straight "…" for quotes and names. ״ appears only inside acronyms. Never use quotes for emphasis; use bold.
- **Latin inside Hebrew:**
  - Keep the original spelling and case (Figma, After Effects, CreativeIn), and don't transliterate.
  - Wrap any injected name, query or address in `<bdi>`.
  - Prefer a Hebrew word at the end of a sentence over a Latin one.
- **Numbers:**
  - Thousands get a comma (12,000). Percent: 25%.
  - Money is number, space, ₪ ("4,500 ₪"). Write "שקלים" in running text, never "NIS".
- **Dates and times:**
  - "1 בנובמבר 2026" · "יום ראשון, 1 בנובמבר" · "1.11" · 24-hour time "17:05"
  - Deadlines: "עד 1 בנובמבר, 12:00"
  - Relative: "אתמול", "לפני 3 ימים"
- **Exclamation marks:** almost never. **Emoji:** not in the product.

## 10. Glossary
| Use | Not |
|---|---|
| קריאייטיב | קריאטיב, קריאיטיב |
| ארט דיירקשן / ארט דיירקטור | ארט דירקטור (also ours by alias, for search) |
| קריאייטיב דיירקשן, ניהול קריאייטיב | — |
| מושן (מושן דיזיין) | מושן גרפיקס as a filter name |
| פוסט־פרודקשן | פוסט פרודקשן, פוסט-פרודקשן |
| תלת־ממד | 3D in running text |
| סושיאל | סוציאל |
| פרילנסרים, עצמאים | פרי-לנסר |
| בריף, בריפים | תדריך |
| קופירייטינג, קופירייטר | רעיונאי |
| UX/UI, עיצוב חוויית משתמש | יו־אקס |
| AI (ה־AI), בינה מלאכותית in long text | איי איי |
| תיק עבודות | פורטפוליו (when the Hebrew word is natural) |
| מיתוג | ברנדינג |
| מייל, כתובת מייל | אימייל, דוא״ל |
| ג׳וניור, סניור / בכיר | ג'וניור with an ASCII apostrophe |
| CreativeIn (Latin, capital C and I), ב־CreativeIn | קריאייטיב־אין |
| המייל השבועי / השבוע בתעשייה · עדכונים · הזדמנויות (verified only) · חברות | גיליון · מפה |
