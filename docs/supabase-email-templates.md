# Supabase email templates (Hebrew)

The sign-in link people get by email comes from Supabase, not from this repo. Opening it is what confirms an
address, and with it the weekly digest or alerts they asked for on the site, so the email should say so.
It also has to be opened on the same device and browser where it was requested (Supabase's PKCE flow keeps a
code in that browser), which is worth saying too.

Where: Supabase dashboard → Authentication → Email Templates. Paste each template below into the matching
template (Subject and Message body). Keep `{{ .ConfirmationURL }}` exactly as written.

Also check: Authentication → URL Configuration → Site URL is the live site
(`https://landscape-ten-phi.vercel.app`) and Redirect URLs include `https://landscape-ten-phi.vercel.app/**`.

## Magic Link

Subject:

```
הקישור שלכם ל־Landscape
```

Message body:

```html
<div dir="rtl" lang="he" style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#110034;max-width:560px">
  <p><strong>Landscape</strong> · תעשיית הקריאייטיב בישראל</p>
  <p>ביקשתם להיכנס ל־Landscape. לחיצה על הכפתור מכניסה אתכם לחשבון, ומאשרת את מה שבחרתם באתר:
     ההרשמה ל״השבוע בתעשייה״ או התראות במייל על חברות.</p>
  <p style="margin:24px 0">
    <a href="{{ .ConfirmationURL }}" style="background:#110034;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;display:inline-block">כניסה ואישור</a>
  </p>
  <p style="font-size:14px;color:#5b5670">כדאי לפתוח את הקישור באותו מכשיר ובאותו דפדפן שבהם ביקשתם אותו. הקישור תקף לזמן קצר ולשימוש אחד.</p>
  <p style="font-size:14px;color:#5b5670">לא ביקשתם? אפשר להתעלם מהמייל. בלי לחיצה על הקישור לא נרשמים לשום דבר.</p>
</div>
```

## Confirm signup

Subject:

```
אישור הכתובת ל־Landscape
```

Message body:

```html
<div dir="rtl" lang="he" style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#110034;max-width:560px">
  <p><strong>Landscape</strong> · תעשיית הקריאייטיב בישראל</p>
  <p>כמעט סיימנו. לחיצה על הכפתור מאשרת את כתובת המייל, ואיתה את ההרשמה ל״השבוע בתעשייה״ או להתראות על חברות,
     אם בחרתם בהן באתר.</p>
  <p style="margin:24px 0">
    <a href="{{ .ConfirmationURL }}" style="background:#110034;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;display:inline-block">אישור הכתובת</a>
  </p>
  <p style="font-size:14px;color:#5b5670">כדאי לפתוח את הקישור באותו מכשיר ובאותו דפדפן שבהם נרשמתם.</p>
  <p style="font-size:14px;color:#5b5670">לא נרשמתם? אפשר להתעלם מהמייל. בלי אישור לא יישלח אליכם שום דבר.</p>
</div>
```
