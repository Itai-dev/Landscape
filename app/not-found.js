export const metadata = { title: "הדף לא נמצא", robots: { index: false } };

export default function NotFound() {
  return (
    <div className="wrap narrow">
      <div className="pagehead">
        <h1>הדף לא נמצא</h1>
        <p>הקישור לא עובד. אולי הוא השתנה, או שהדף הוסר.</p>
      </div>
      <div className="row center">
        <a className="btn primary" href="/">לדף הבית</a>
        <a className="btn" href="/people">לאנשים</a>
        <a className="btn" href="/companies">לחברות</a>
      </div>
    </div>
  );
}
