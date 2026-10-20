export default function NotFound() {
  return (
    <div className="wrap narrow stack">
      <h1>לא מצאנו את הדף</h1>
      <p className="muted">אולי הפרופיל מוסתר, או שהקישור השתנה.</p>
      <div className="row"><a className="btn" href="/people">לאנשים</a><a className="btn" href="/">לדף הבית</a></div>
    </div>
  );
}
