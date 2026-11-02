// Supabase auth errors, in Hebrew and in the plural imperative. Browser and server.
export const MIN_PASSWORD = 8;

export function authErrorHe(error) {
  const m = String(error?.message || "");
  if (error?.status === 429 || /rate|limit|too many/i.test(m)) return "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.";
  if (/invalid login credentials/i.test(m)) return "המייל או הסיסמה לא נכונים. נסו שוב, או היכנסו עם קישור במייל.";
  if (/email not confirmed/i.test(m)) return "עוד לא אישרתם את הכתובת. פתחו את המייל ששלחנו ולחצו על הקישור.";
  if (/password.*(at least|short|characters)|weak password/i.test(m)) return `הסיסמה קצרה מדי. בחרו סיסמה של ${MIN_PASSWORD} תווים לפחות.`;
  if (/same.*password|different from the old/i.test(m)) return "זו הסיסמה הקיימת. בחרו סיסמה חדשה.";
  if (/already registered|already exists/i.test(m)) return "כבר יש חשבון עם הכתובת הזו. היכנסו עם הסיסמה או עם קישור במייל.";
  if (/sending|smtp|email/i.test(m)) return "לא הצלחנו לשלוח את המייל כרגע. נסו שוב בעוד כמה דקות.";
  return "משהו השתבש. בדקו את הפרטים ונסו שוב.";
}
