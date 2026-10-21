import HomePage from "@/components/HomePage";

// The earlier home page (split hero with the update carousel), kept for comparison. Not indexed.
export const metadata = { title: "גרסה קודמת לדף הבית", robots: { index: false, follow: false }, alternates: { canonical: "/" } };

export const revalidate = 3600;

export default function TestHome() {
  return <HomePage split />;
}
