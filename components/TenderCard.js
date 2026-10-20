import { LinkIcon } from "@/components/Icons";

const Clock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
  </svg>
);

// One tender: what is being bought (our summary), who buys it, the deadline, and the official notice.
// `compact` is the home-page strip version.
export default function TenderCard({ t, compact = false }) {
  const closed = t.state !== "open";
  return (
    <article className={`tcard${closed ? " closed" : ""}${compact ? " compact" : ""}`}>
      <div className="thead">
        <span className={`due ${t.countdown.tone}`}><Clock />{t.countdown.text}</span>
        <span className="when">{closed ? "ההגשה הייתה עד" : "הגשה עד"} <bdi>{t.deadline}</bdi></span>
      </div>
      <h3>{t.scope_summary}</h3>
      <p className="buyer">
        {t.buyer_href ? <a href={t.buyer_href}>{t.buyer_name_he || t.buyer}</a> : <span>{t.buyer}</span>}
        {t.buyer_type_he && <span className="muted"> · {t.buyer_type_he}</span>}
      </p>
      {!compact && (
        <>
          <p className="title" title="הכותרת כפי שפורסמה">
            {t.link_only ? (
              <>{t.kind_he}{t.procedure_no ? <> <bdi>{t.procedure_no}</bdi></> : ""}: לפרטים במקור</>
            ) : /^(מכרז|פנייה|קול קורא|בקשה)/.test(t.title) ? (
              <>בפרסום: {t.title}</>
            ) : (
              <>{t.kind_he}{t.procedure_no ? <> <bdi>{t.procedure_no}</bdi></> : ""}: {t.title}</>
            )}
          </p>
          {t.crafts_he.length > 0 && (
            <div className="crafts">{t.crafts_he.map((c) => <a key={c.slug} className="tag soft" href={`/tenders?craft=${c.slug}`}>{c.he}</a>)}</div>
          )}
        </>
      )}
      <a className="go" href={t.source_url} target="_blank" rel="noopener noreferrer">
        למכרז במקור הרשמי <LinkIcon size={16} />
      </a>
    </article>
  );
}
