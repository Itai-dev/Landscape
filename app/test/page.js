import HomePage from "@/components/HomePage";

// The search-first home page (a centered question and search), kept for comparison. Not indexed.
export const metadata = { title: "דף הבית, גרסת חיפוש", robots: { index: false, follow: false }, alternates: { canonical: "/" } };

export const revalidate = 3600;

export default function TestHome() {
  return <HomePage />;
}
