import "./globals.css";
import "./chrome.css";
import Providers from "@/components/Providers";
import Header from "@/components/Header";
import MenuCloser from "@/components/MenuCloser";
import TrackClicks from "@/components/TrackClicks";
import { Analytics } from "@vercel/analytics/next";
import { supabaseConfig } from "@/lib/config";
import { FOOTER, TAGLINE, THEME_SCRIPT, THEME_BUTTON } from "@/lib/chrome.mjs";

const DESCRIPTION = "מי מונה לשיווק, מי החליף משרד, אילו מכרזים נפתחו ומי מזמין את מה שאתם עושים. כל יום ראשון במייל, לפי התחום שלכם, עם הסיבה לפנות עכשיו. חינם.";

export const metadata = {
  title: { default: "Landscape · מי מזמין מה בתעשיית הקריאייטיב", template: "%s · Landscape" },
  description: DESCRIPTION,
  openGraph: {
    title: "לא צריך להכיר את כולם. צריך לדעת מי מזמין, ומתי לפנות.",
    description: DESCRIPTION,
    locale: "he_IL",
    type: "website",
  },
  icons: { icon: "/favicon.svg" },
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };

export default function RootLayout({ children }) {
  // Public Supabase settings go to the browser through context, so any env naming works.
  const cfg = supabaseConfig();
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <head>
        {/* Light by default; the header toggle can switch to dark or to the device setting. Runs before paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Mona+Sans:wght@400..800&family=Heebo:wght@400..800&display=swap"
        />
      </head>
      <body>
        <Providers supabase={cfg}>
          <Header />
          <MenuCloser />
          <TrackClicks />
          <main>{children}</main>
          <footer className="foot">
            <div className="wrap">
              <a className="brand" href="/" lang="en">Landscape<span>.</span></a>
              {FOOTER.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
              {/* On phones the colour-theme button lives here, so the header fits on one row. */}
              <span className="foottheme" dangerouslySetInnerHTML={{ __html: THEME_BUTTON }} />
              <span className="fine">{TAGLINE}</span>
            </div>
          </footer>
        </Providers>
        {/* Vercel Web Analytics: counts nothing until it is enabled for the project in the Vercel dashboard. */}
        <Analytics />
      </body>
    </html>
  );
}
