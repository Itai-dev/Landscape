import HomePage from "@/components/HomePage";

// What CreativeIn is: the landing page (the weekly email, live proof, examples, tenders, FAQ). It is the home page
// until the agent becomes the home (NEXT_PUBLIC_AGENT_HOME=on), and lives here either way.
const SPLIT = process.env.NEXT_PUBLIC_HOME_HERO !== "ask";

export const metadata = { title: "מה זה CreativeIn", alternates: { canonical: "/about" } };
export const revalidate = 3600;

export default function About() {
  return <HomePage split={SPLIT} />;
}
