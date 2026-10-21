import HomePage from "@/components/HomePage";

// Home hero: a centered search block (default), or the earlier split hero with the update carousel
// (NEXT_PUBLIC_HOME_HERO=split brings it back; /test always shows it, for comparison).
const HERO_SPLIT = process.env.NEXT_PUBLIC_HOME_HERO === "split";

export const metadata = { alternates: { canonical: "/" } };

// Tender deadlines count down: rebuild the page hourly.
export const revalidate = 3600;

export default function Home() {
  return <HomePage split={HERO_SPLIT} />;
}
