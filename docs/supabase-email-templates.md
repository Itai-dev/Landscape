# Supabase email templates (Hebrew)

The sign-in link people get by email comes from Supabase, not from this repo. Opening it is what confirms an
address, and with it the weekly digest or alerts they asked for on the site, so the email should say so.
It also has to be opened on the same device and browser where it was requested (Supabase's PKCE flow keeps a
code in that browser), which is worth saying too.

Where: Supabase dashboard → Authentication → Email Templates. Paste each template below into the matching
template (Subject and Message body). Keep `{{ .ConfirmationURL }}` exactly as written.

Also check: Authentication → URL Configuration → Site URL is the live site and Redirect URLs include it with
`/**`. Today that is `https://landscape-ten-phi.vercel.app`. When creativein.co.il is connected, set the Site URL
to `https://www.creativein.co.il` and keep both in Redirect URLs (`https://www.creativein.co.il/**` and
`https://landscape-ten-phi.vercel.app/**`) for a few days, so links sent before the switch still work.

Sender: under Authentication → SMTP Settings, use Resend's SMTP with the verified domain. Sender name
`creativein.`, sender address `hello@mail.creativein.co.il` (Resend domain `mail.creativein.co.il`). Supabase's built-in mailer is limited to a few
emails an hour, which is not enough for a launch.

## Magic Link

Subject:

```
הקישור שלכם ל־creativein
```

Message body:

```html
<div dir="rtl" lang="he" style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#222222;max-width:560px">
  <p><strong dir="ltr">creativein.</strong> · תעשיית הקריאייטיב בישראל</p>
  <p>ביקשתם להיכנס ל־<span dir="ltr">creativein</span>. לחיצה על הכפתור מכניסה אתכם לחשבון, ומאשרת את מה שבחרתם באתר:
     ההרשמה ל״השבוע בתעשייה״ או התראות במייל על חברות.</p>
  <p style="margin:24px 0">
    <a href="{{ .ConfirmationURL }}" style="background:#222222;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block">כניסה ואישור</a>
  </p>
  <p style="font-size:14px;color:#5c5c5c">הקישור עובד רק באותו מכשיר ובאותו דפדפן שבהם ביקשתם אותו. הוא תקף לזמן קצר ולשימוש אחד.</p>
  <p style="font-size:14px;color:#5c5c5c">לא ביקשתם? אפשר להתעלם מהמייל. בלי לחיצה על הקישור לא נרשמים לשום דבר.</p>
</div>
```

## Confirm signup

Subject:

```
אישור הכתובת ל־creativein
```

Message body:

```html
<div dir="rtl" lang="he" style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#222222;max-width:560px">
  <p><strong dir="ltr">creativein.</strong> · תעשיית הקריאייטיב בישראל</p>
  <p>כמעט סיימנו. לחיצה על הכפתור מאשרת את כתובת המייל, ואיתה את ההרשמה ל״השבוע בתעשייה״ או להתראות על חברות,
     אם בחרתם בהן באתר.</p>
  <p style="margin:24px 0">
    <a href="{{ .ConfirmationURL }}" style="background:#222222;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block">אישור הכתובת</a>
  </p>
  <p style="font-size:14px;color:#5c5c5c">הקישור עובד רק באותו מכשיר ובאותו דפדפן שבהם נרשמתם.</p>
  <p style="font-size:14px;color:#5c5c5c">לא נרשמתם? אפשר להתעלם מהמייל. בלי אישור לא יישלח אליכם שום דבר.</p>
</div>
```
