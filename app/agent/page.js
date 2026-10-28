import { CRAFTS } from "@/lib/taxonomy";
import { ROLES, GOALS } from "@/lib/agent";
import AgentFlow from "./AgentFlow";
import "./agent.css";

export const metadata = {
  title: "הסוכן",
  description: "ספרו במשפט מה אתם עושים, וקבלו תדריך אישי: מה השתנה בתעשייה בשבילכם, למה זה רלוונטי, ומה אפשר לעשות עם זה.",
  robots: { index: false },
};

// The agent, test version: a short conversation instead of a sign-up form, then a personal briefing.
// Not linked from the site yet; the profile stays in the reader's browser (localStorage "landscape-agent").
export default function Agent() {
  return <AgentFlow crafts={CRAFTS} roles={ROLES} goals={GOALS} />;
}
