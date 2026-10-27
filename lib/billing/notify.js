// Sends one premium email (lib/premiumEmail.js) to the account's confirmed address. Best effort: a failed
// send is logged and never undoes a payment or a cancellation. Server only.
import { sendBatch } from "@/lib/mailer";

export async function notify(db, { userId, email = "", message, key }) {
  try {
    let to = email;
    if (!to && db?.auth?.admin) {
      const { data } = await db.auth.admin.getUserById(userId);
      to = data?.user?.email || "";
    }
    if (!to) return { skipped: "no_address" };
    const out = await sendBatch([{ to: [to], subject: message.subject, html: message.html, text: message.text }], { idempotencyKey: key });
    return out.skipped ? { skipped: out.skipped } : { sent: true };
  } catch (e) {
    console.error("premium email failed", key, e.message);
    return { error: e.message };
  }
}
