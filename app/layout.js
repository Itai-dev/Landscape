import "./globals.css";
import Providers from "@/components/Providers";
import Header from "@/components/Header";
import { supabaseConfig } from "@/lib/config";

export const metadata = {
  title: { default: "Landscape · תעשיית הקריאייטיב בישראל", template: "%s · Landscape" },
  description: "אנשים, סטודיואים, חברות הפקה, מותגים וסוכנויות בתעשיית הקריאייטיב בישראל. פרופיל מקצועי בדקה, ישר מקורות החיים או מהפורטפוליו.",
  icons: { icon: "/favicon.svg" },
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
          href="https://fonts.googleapis.com/css2?family=Mona+Sans:wght@400..800&family=Heebo:wght@400..800&display=swap"
        />
      </head>
      <body>
        <Providers supabase={cfg}>
          <Header />
          <main>{children}</main>
          <footer>
            <div className="wrap">
              <a className="brand" href="/">Landscape<span>.</span></a>
              <a href="/people">אנשים</a>
              <a href="/companies">חברות</a>
              <a href="/companies#signals">עדכונים</a>
              <a href="/onboard">הצטרפות</a>
              <a href="/privacy">פרטיות</a>
              <span className="fine">תעשיית הקריאייטיב בישראל, במקום אחד</span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
