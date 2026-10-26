// One pattern for everything that waits on sign-up opening: a short line and one way forward.
export default function ComingSoon({ title = "ההרשמה נפתחת בקרוב", text = "בינתיים, הציצו בחברות ובאנשים שבמאגר.", as: H = "h3" }) {
  return (
    <div className="soon">
      <H>{title}</H>
      <p>{text}</p>
      <a className="btn primary" href="/companies">לכל החברות</a>
    </div>
  );
}
