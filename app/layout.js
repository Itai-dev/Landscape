import "./globals.css";
import Providers from "@/components/Providers";
import Header from "@/components/Header";
import { supabaseConfig } from "@/lib/config";

export const metadata = {
  title: { default: "Landscape — מפת תעשיית הקריאייטיב", template: "%s · Landscape" },
  description: "המפה והקהילה של תעשיית הקריאייטיב בישראל: סטודיואים, חברות, לקוחות ואנשים. פרופיל שנבנה לבד מקורות החיים או מהפורטפוליו.",
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };

export default function RootLayout({ children }) {
  // Public Supabase settings go to the browser through context, so any env naming works.
  const cfg = supabaseConfig();
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Mona+Sans:wght@400..800&family=Heebo:wght@400..800&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>
        <Providers supabase={cfg}>
          <Header />
          <main>{children}</main>
          <footer>
            <div className="wrap">
              <a className="brand" href="/">Landscape<span>.</span></a>
              <a href="/map/app.html">המפה</a>
              <a href="/people">אנשים</a>
              <a href="/onboard">בניית פרופיל</a>
              <a href="/privacy">פרטיות</a>
              <span className="fine">מפת תעשיית הקריאייטיב בישראל</span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
