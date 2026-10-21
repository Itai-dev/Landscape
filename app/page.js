import HomePage from "@/components/HomePage";

// Home: the hero with the update carousel, search in the header. The search-first version is at /test
// (NEXT_PUBLIC_HOME_HERO=ask makes it the home page).
const SPLIT = process.env.NEXT_PUBLIC_HOME_HERO !== "ask";

export const metadata = { alternates: { canonical: "/" } };

// Tender deadlines count down: rebuild the page hourly.
export const revalidate = 3600;

export default function Home() {
  return <HomePage split={SPLIT} />;
}
