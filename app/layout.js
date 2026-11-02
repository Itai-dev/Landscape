import "./globals.css";
import "./chrome.css";
import Providers from "@/components/Providers";
import Header from "@/components/Header";
import MenuCloser from "@/components/MenuCloser";
import TrackClicks from "@/components/TrackClicks";
import { Analytics } from "@vercel/analytics/next";
import { supabaseConfig } from "@/lib/config";
import { THEME_SCRIPT, footerHtml, BRAND, TAGLINE } from "@/lib/chrome.mjs";
import { siteUrl } from "@/lib/digest";

const DESCRIPTION = "תעשיית הקריאייטיב בישראל. האנשים, החברות וההזדמנויות: מינויים, החלפות משרד, משרות ומכרזים, עם מקור לכל פרט. כל יום ראשון במייל, לפי התחום שלכם. חינם.";
const NAME = BRAND;

// The base URL comes from the environment (NEXT_PUBLIC_SITE_URL), so canonical and share links follow
// whichever domain is connected. Each page sets its own canonical path.
export const metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${NAME} · תעשיית הקריאייטיב בישראל`, template: `%s · ${NAME}` },
  description: DESCRIPTION,
  applicationName: NAME,
  openGraph: {
    title: "לא צריך להכיר את כולם. צריך לדעת מי מזמין, ומתי לפנות.",
    description: DESCRIPTION,
    siteName: NAME,
    locale: "he_IL",
    type: "website",
    images: [{ url: "/og/site.png", width: 1200, height: 630, alt: `${NAME} · תעשיית הקריאייטיב בישראל` }],
  },
  twitter: { card: "summary_large_image", images: ["/og/site.png"] },
  icons: { icon: "/favicon.svg", apple: "/apple-touch-icon.png" },
};

// Structured data: who publishes the site, and the site search.
function jsonLd() {
  const url = siteUrl();
  return JSON.stringify([
    { "@context": "https://schema.org", "@type": "Organization", name: NAME, url, logo: `${url}/apple-touch-icon.png`, description: TAGLINE },
    {
      "@context": "https://schema.org", "@type": "WebSite", name: NAME, url, inLanguage: "he-IL",
      potentialAction: { "@type": "SearchAction", target: `${url}/search?q={search_term_string}`, "query-input": "required name=search_term_string" },
    },
  ]).replace(/</g, "\\u003c");
}

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#f8f8f8" };

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
          href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400..700&display=swap"
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd() }} />
      </head>
      <body>
        <Providers supabase={cfg}>
          <Header />
          <MenuCloser />
          <TrackClicks />
          <main>{children}</main>
          {/* Same footer markup as the companies app (lib/chrome.mjs). */}
          <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: footerHtml() }} />
        </Providers>
        {/* Vercel Web Analytics: counts nothing until it is enabled for the project in the Vercel dashboard. */}
        <Analytics />
      </body>
    </html>
  );
}
