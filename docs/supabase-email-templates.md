# Supabase email templates (Hebrew)

The sign-in link people get by email comes from Supabase, not from this repo. Opening it is what confirms an
address, and with it the weekly digest or alerts they asked for on the site, so the email should say so.
The link points straight at `/auth/callback` with a `token_hash`, which the server verifies. So it works in
whatever browser opens it: the mail app's own browser, another browser, another phone. (Supabase's default
`{{ .ConfirmationURL }}` uses PKCE, which works only in the browser that asked for the link; people who tap the
link inside Gmail or Outlook then land signed out.)

Where: Supabase dashboard → Authentication → Email Templates. Paste each template below into the matching
template (Subject and Message body). Keep the link exactly as written:
`{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email` (the site always asks for a return address that
already has a `?`, so `&` is right).

Also check: Authentication → URL Configuration → Site URL is `https://www.creativein.co.il`, and Redirect URLs
include `https://www.creativein.co.il/**`. A return address that isn't on that list makes Supabase fall back to
the Site URL, and the link breaks.

Sender: under Authentication → SMTP Settings, use Resend's SMTP with the verified domain. Sender name
`CreativeIn`, sender address `hello@mail.creativein.co.il` (Resend domain `mail.creativein.co.il`). Supabase's built-in mailer is limited to a few
emails an hour, which is not enough for a launch.

## Magic Link

Subject:

```
הקישור שלכם ל־CreativeIn
```

Message body:

```html
<div dir="rtl" lang="he" style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#222222;max-width:560px">
  <p style="margin:0 0 4px"><img src="{{ .SiteURL }}/brand/creativein-wordmark.png" width="132" height="36" alt="CreativeIn" style="display:block;border:0"></p>
  <p style="margin:0 0 16px;font-size:14px;color:#5c5c5c">תעשיית הקריאייטיב בישראל</p>
  <p>ביקשתם להיכנס ל־<span dir="ltr">CreativeIn</span>. לחיצה על הכפתור מכניסה אתכם לחשבון, ומאשרת את מה שבחרתם באתר:
     ההרשמה ל״השבוע בתעשייה״ או התראות במייל על חברות.</p>
  <p style="margin:24px 0">
    <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email" style="background:#222222;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block">כניסה ואישור</a>
  </p>
  <p style="font-size:14px;color:#5c5c5c">הקישור תקף לזמן קצר ולשימוש אחד.</p>
  <p style="font-size:14px;color:#5c5c5c">לא ביקשתם? אפשר להתעלם מהמייל. בלי לחיצה על הקישור לא נרשמים לשום דבר.</p>
</div>
```

## Confirm signup

Subject:

```
אישור הכתובת ל־CreativeIn
```

Message body:

```html
<div dir="rtl" lang="he" style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#222222;max-width:560px">
  <p style="margin:0 0 4px"><img src="{{ .SiteURL }}/brand/creativein-wordmark.png" width="132" height="36" alt="CreativeIn" style="display:block;border:0"></p>
  <p style="margin:0 0 16px;font-size:14px;color:#5c5c5c">תעשיית הקריאייטיב בישראל</p>
  <p>כמעט סיימנו. לחיצה על הכפתור מאשרת את כתובת המייל, ואיתה את ההרשמה ל״השבוע בתעשייה״ או להתראות על חברות,
     אם בחרתם בהן באתר.</p>
  <p style="margin:24px 0">
    <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email" style="background:#222222;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block">אישור הכתובת</a>
  </p>
  <p style="font-size:14px;color:#5c5c5c">לא נרשמתם? אפשר להתעלם מהמייל. בלי אישור לא יישלח אליכם שום דבר.</p>
</div>
```
