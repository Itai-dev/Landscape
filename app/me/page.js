import { redirect } from "next/navigation";
import { serverClient, currentUser } from "@/lib/supabase/server";
import MeClient from "./MeClient";
import ComingSoon from "@/components/ComingSoon";
import AccountClient from "./AccountClient";
import { PROFILES_ENABLED } from "@/lib/config";
import FollowsClient from "./FollowsClient";
import SignupForm from "@/components/SignupForm";
import { OAUTH } from "@/lib/oauth";
import index from "@/lib/generated/orgs.json";
import { BellIcon, BuildingIcon, SparkIcon, CheckIcon } from "@/components/Icons";
import { activeConsent } from "@/lib/consent";
import { firstSendLabel } from "@/lib/digestSchedule";
import { FREQUENCIES, ALERT_MODES, craftLabel } from "@/lib/taxonomy";
import { isOpen as surveyOpen, CLOSES_LABEL } from "@/lib/survey/config";
import { PREMIUM, followLimit, FREE_FOLLOWS } from "@/lib/premium";
import { planOf } from "@/lib/subscription";
import { KINDS } from "@/lib/kinds.mjs";
import { cityHe } from "@/lib/orgs";
import dataset from "@/site/data/dataset.json";
import PlanClient from "./PlanClient";
import "./me.css";

// Filter choices for list export (premium): company types, crafts, and the cities with at least 3 companies.
const EXPORT_OPTIONS = (() => {
  const n = new Map();
  for (const o of dataset.orgs) { const c = o.location?.city; if (c) n.set(c, (n.get(c) || 0) + 1); }
  return {
    kinds: KINDS.map((k) => ({ slug: k.kind, he: k.plural_he })),
    categories: Object.entries(dataset.taxonomy.categories_he || {}).map(([slug, he]) => ({ slug, he })).sort((a, b) => a.he.localeCompare(b.he, "he")),
    cities: [...n].filter(([, k]) => k >= 3).sort((a, b) => b[1] - a[1]).map(([slug]) => ({ slug, he: cityHe(slug) })),
  };
})();

const ORG_NAMES = new Map(index.orgs.map((o) => [o.id, o.name_he || o.name]));

export const metadata = { title: PROFILES_ENABLED ? "הפרופיל שלי" : "האזור האישי", robots: { index: false } };

// The person's follows and alert choice, read with their own session (RLS: own rows only).
async function loadFollows(sb, userId) {
  const [{ data: rows }, { data: prefs }] = await Promise.all([
    sb.from("org_follows").select("org_id, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
    sb.from("newsletter_prefs").select("alerts, alerts_consent_at").eq("user_id", userId).maybeSingle(),
  ]);
  const follows = (rows || []).filter((r) => ORG_NAMES.has(r.org_id)).map((r) => ({ id: r.org_id, name: ORG_NAMES.get(r.org_id), href: `/companies/${encodeURIComponent(r.org_id)}` }));
  return { follows, alerts: prefs?.alerts || "off", consent: Boolean(prefs?.alerts_consent_at), names: Object.fromEntries(ORG_NAMES) };
}

// A Notion-style avatar: the Google photo when there is one, otherwise initials on a colour picked from the address.
function avatarOf(user) {
  const m = user.user_metadata || {};
  const name = String(m.full_name || m.name || "").trim();
  const local = String(user.email || "").split("@")[0].replace(/[._-]+/g, " ").trim();
  const words = (name || local).split(/\s+/).filter(Boolean);
  const initials = ((words[0]?.[0] || "") + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase() || "?";
  let h = 0;
  for (const ch of String(user.email || "")) h = (h * 31 + ch.charCodeAt(0)) % 360;
  const first = name ? name.split(/\s+/)[0] : "";
  return { photo: typeof m.avatar_url === "string" && m.avatar_url.startsWith("https://") ? m.avatar_url : "", initials, hue: h, first };
}

// The signed-in personal area (stage 1): greeting, summary cards, tracking, settings.
function MeHome({ user, follows, prefs, plan = null, justFollowed = "", demo = false }) {
  const av = avatarOf(user);
    const on = Boolean(prefs && prefs.frequency && prefs.frequency !== "off" && activeConsent(prefs));
    const crafts = (prefs?.crafts || []).map(craftLabel);
    const freqHe = FREQUENCIES.find((f) => f.slug === prefs?.frequency)?.he || "";
    const alertsHe = ALERT_MODES.find((m) => m.slug === follows.alerts)?.he || "בלי התראות";
    return (
      <div className="wrap narrow stack mepage">
        {demo && <p className="notice small">תצוגה לדוגמה (רק באתר התצוגה המקדימה): שום דבר לא נשמר.</p>}
        <header className="mehead">
          <span className="meavatar" style={{ "--h": av.hue }} aria-hidden="true">
            {av.photo ? <img src={av.photo} alt="" width={72} height={72} referrerPolicy="no-referrer" /> : <span>{av.initials}</span>}
          </span>
          <div>
            <p className="kicker">האזור האישי</p>
            <h1>{av.first ? <>שלום, <bdi>{av.first}</bdi></> : "שלום"}</h1>
            <p className="muted small"><bdi>{user.email}</bdi></p>
          </div>
        </header>

        <section className="mecards" aria-label="סיכום">
          <a className="mecard" href="/digest/settings">
            <span className="mi"><SparkIcon size={22} /></span>
            <span className="mt"><b>המייל השבועי</b> <span className={`st${on ? " on" : ""}`}>{on ? "פעיל" : "כבוי"}</span></span>
            <span className="md">{on ? `${freqHe}. הבא ${firstSendLabel(prefs.frequency)}.` : "השבוע בתעשייה, לפי התחומים שלכם. חינם."}</span>
            {crafts.length > 0 && <span className="md">{crafts.slice(0, 3).join(", ")}{crafts.length > 3 ? ` ועוד ${crafts.length - 3}` : ""}</span>}
            <span className="go">{on ? "להגדרות המייל השבועי" : "להפעלת המייל השבועי"}</span>
          </a>
          <a className="mecard" href="#follows">
            <span className="mi"><BuildingIcon size={22} /></span>
            <span className="mt"><b>המעקב שלי</b> <span className="st">{follows.follows.length === 1 ? "חברה אחת" : `${follows.follows.length} חברות`}</span></span>
            <span className="md">התראות במייל: {alertsHe}</span>
            {PREMIUM && plan?.paywall && !plan?.premium && <span className="md">{follows.follows.length} מתוך {FREE_FOLLOWS} בחינם</span>}
            <span className="go">לרשימת המעקב</span>
          </a>
          {PREMIUM && (
            <a className="mecard" href={plan?.premium ? "#plan" : "/premium"}>
              <span className="mi"><CheckIcon size={22} /></span>
              <span className="mt"><b>פרימיום</b> <span className={`st${plan?.premium ? " on" : ""}`}>{plan?.premium ? "פעיל" : "לא פעיל"}</span></span>
              <span className="md">{plan?.premium ? "מעקב בלי הגבלה, התראות מיידיות, ייצוא רשימות וחיפוש עם AI." : "מעקב בלי הגבלה, התראות בתוך שעה, ייצוא רשימות וחיפוש עם AI."}</span>
              <span className="go">{plan?.premium ? "לניהול המנוי" : "לפרטים על פרימיום"}</span>
            </a>
          )}
          {surveyOpen() && (
            <a className="mecard" href="/survey">
              <span className="mi"><BellIcon size={22} /></span>
              <span className="mt"><b>סקר התעריפים 2026</b></span>
              <span className="md">4 דקות, אנונימי. פתוח עד {CLOSES_LABEL}. אפשר לחזור ולעדכן תשובות.</span>
              <span className="go">למילוי הסקר</span>
            </a>
          )}
        </section>

        <FollowsClient initial={{ ...follows, premium: Boolean(plan?.premium), max: plan?.limit ?? followLimit(false, false), offer: PREMIUM, paywall: Boolean(plan?.paywall) }} justFollowed={justFollowed} />
        {PREMIUM && !demo && <PlanClient premium={Boolean(plan?.premium)} paywall={Boolean(plan?.paywall)} sub={plan?.sub || null} options={EXPORT_OPTIONS} />}
        <AccountClient />
      </div>
    );
}

export default async function Me({ searchParams }) {
  const sb = await serverClient();
  if (!sb) {
    return (
      <div className="wrap narrow stack">
        <div className="pagehead"><h1>{PROFILES_ENABLED ? "הפרופיל שלי" : "האזור האישי"}</h1></div>
        <ComingSoon title={PROFILES_ENABLED ? "הפרופילים נפתחים בקרוב" : "ההרשמה במייל נפתחת בקרוב"} />
      </div>
    );
  }
  const user = await currentUser(sb);
  if (!PROFILES_ENABLED) {
    // Stage 1: an account is only the email behind the digest, the alerts and the survey. No profile to edit.
    const spd = await searchParams;
    // Preview deploys only (never production): /me?demo=1 shows the personal area with sample data, nothing saved.
    if (!user && process.env.VERCEL_ENV !== "production" && spd?.demo === "1") {
      const sample = { email: "name@example.com", user_metadata: { full_name: "נועה לוי" } };
      const names = ["שטראוס", "ישראכרט", "גיתם BBDO"];
      return <MeHome demo user={sample} prefs={{ frequency: "weekly", crafts: ["creative-direction", "art-direction"], consent_at: "2026-10-26" }}
        follows={{ follows: names.map((n, i) => ({ id: `demo-${i}`, name: n, href: "/companies" })), alerts: "daily", consent: true, names: {} }} />;
    }
    if (!user) {
      // Signed out (or on another device): a sign-in link brings people back to their follows and settings.
      return (
        <div className="wrap narrow stack">
          <div className="pagehead"><h1>כניסה</h1><p>היכנסו עם המייל והסיסמה{OAUTH.includes("google") ? ", עם Google" : ""} או עם קישור במייל: המעקב שלכם מכל מכשיר, ההתראות והניוזלטר.</p></div>
          <div className="card"><SignupForm next="/me#follows" digest={false} /></div>
          <p className="small muted center">עוד אין לכם חשבון? <a href="/join">להרשמה, בחינם</a></p>
        </div>
      );
    }
    const sp = await searchParams;
    // Old sign-up links landed here; the welcome flow is /welcome now.
    if (sp?.welcome === "1") redirect("/welcome");
    const [follows, { data: prefs }, plan] = await Promise.all([
      loadFollows(sb, user.id),
      sb.from("newsletter_prefs").select("frequency, crafts, consent_at, unsubscribed_at").eq("user_id", user.id).maybeSingle(),
      PREMIUM ? planOf(sb, user.id) : null,
    ]);
    // "instant" alerts are premium; after a plan ends they arrive daily, and the page says so.
    if (follows.alerts === "instant" && !plan?.premium) follows.alerts = "daily";
    return <MeHome user={user} follows={follows} prefs={prefs} plan={plan} justFollowed={typeof sp?.followed === "string" ? sp.followed : ""} />;
  }
  if (!user) redirect("/onboard");
  const [{ data: profile }, { data: prefs }] = await Promise.all([
    sb.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    sb.from("newsletter_prefs").select("frequency, topics").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!profile) redirect("/onboard");
  const { visibility, ai_fields, slug, ...rest } = profile;
  return (
    <div className="wrap narrow stack">
      <div className="pagehead">
        <h1>הפרופיל שלי</h1>
        <p><bdi className="small">{user.email}</bdi></p>
        <div className="row center" style={{ marginBlockStart: 16 }}><a className="btn" href={`/p/${slug}`}>לצפייה בפרופיל</a></div>
      </div>
      <MeClient
        initial={{ profile: rest, visibility, ai_fields, prefs: prefs || { frequency: "off", topics: [] } }}
      />
    </div>
  );
}
