import HomePage from "@/components/HomePage";
import { AGENT_HOME } from "@/lib/chrome.mjs";
import { CRAFTS } from "@/lib/taxonomy";
import { ROLES, GOALS } from "@/lib/agent";
import AgentFlow from "@/app/agent/AgentFlow";
import "@/app/agent/agent.css";

// Home. With the agent home on (NEXT_PUBLIC_AGENT_HOME=on): the agent (a short conversation, then the reader's
// briefing; "/?q=…" is a question to the agent), and the landing page lives at /about. Off: the landing page
// (the hero with the update carousel; NEXT_PUBLIC_HOME_HERO=ask makes it search-first, as at /test).
const SPLIT = process.env.NEXT_PUBLIC_HOME_HERO !== "ask";

export const metadata = { alternates: { canonical: "/" } };

// Tender deadlines count down: rebuild the page hourly.
export const revalidate = 3600;

export default function Home() {
  if (AGENT_HOME) return <AgentFlow crafts={CRAFTS} roles={ROLES} goals={GOALS} home />;
  return <HomePage split={SPLIT} />;
}
