export const metadata = { title: "הדף לא נמצא", robots: { index: false } };

export default function NotFound() {
  return (
    <div className="wrap narrow">
      <div className="pagehead">
        <h1>הדף לא נמצא</h1>
        <p>הקישור לא עובד. אולי הוא השתנה, או שהדף הוסר. אבל כבר הגעתם, אז כדאי להציץ במה שהשתנה השבוע.</p>
      </div>
      <div className="row center">
        <a className="btn primary" href="/digest">לגיליון של השבוע</a>
        <a className="btn" href="/tenders">למכרזים הפתוחים</a>
        <a className="btn" href="/companies">לחברות</a>
      </div>
    </div>
  );
}
