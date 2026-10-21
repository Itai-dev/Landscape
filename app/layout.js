import "./globals.css";
import "./chrome.css";
import Providers from "@/components/Providers";
import Header from "@/components/Header";
import MenuCloser from "@/components/MenuCloser";
import { supabaseConfig } from "@/lib/config";
import { THEME_SCRIPT, footerHtml } from "@/lib/chrome.mjs";

export const metadata = {
  title: { default: "Landscape · תעשיית הקריאייטיב בישראל", template: "%s · Landscape" },
  description: "מי מזמין מה בתעשיית הקריאייטיב בישראל, מה השתנה השבוע ולמה עכשיו. סטודיואים, מותגים, משרדי פרסום ואנשים, וגיליון שבועי חינם לפי התחום שלכם.",
  icons: { icon: "/favicon.svg" },
};

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
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300..700&family=Heebo:wght@300..700&display=swap"
        />
      </head>
      <body>
        <Providers supabase={cfg}>
          <Header />
          <MenuCloser />
          <main>{children}</main>
          {/* Same footer markup as the companies app (lib/chrome.mjs). */}
          <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: footerHtml() }} />
        </Providers>
      </body>
    </html>
  );
}
