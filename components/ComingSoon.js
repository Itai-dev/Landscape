// One pattern for everything that waits on sign-up opening: a short line and one way forward.
export default function ComingSoon({ title = "ההרשמה נפתחת בקרוב", text = "בינתיים אפשר לעבור על החברות והאנשים במאגר.", as: H = "h3" }) {
  return (
    <div className="soon">
      <H>{title}</H>
      <p>{text}</p>
      <a className="btn primary" href="/companies">לעבור על החברות</a>
    </div>
  );
}
