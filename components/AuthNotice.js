"use client";
import { useEffect, useState } from "react";

// Messages passed back through the URL: a failed magic link, or a deleted account.
export default function AuthNotice() {
  const [kind, setKind] = useState(null);
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setKind(sp.has("auth_error") ? "auth_error" : sp.has("deleted") ? "deleted" : null);
  }, []);
  if (kind === "auth_error") {
    return (
      <div className="notice err" role="alert" style={{ marginBlockEnd: 20 }}>
        הקישור לא הכניס אתכם: אולי פג תוקפו, או שנפתח בדפדפן אחר מזה שבו נרשמתם (למשל בתוך אפליקציית המייל). אפשר לבקש כאן קישור חדש ולפתוח אותו באותו דפדפן.
      </div>
    );
  }
  if (kind === "deleted") {
    return <div className="notice ok" role="status" style={{ marginBlockEnd: 20 }}>החשבון וכל המידע נמחקו.</div>;
  }
  return null;
}
