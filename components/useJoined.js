"use client";
import { useEffect, useState } from "react";
import { useUser } from "@/components/useUser";
import { readJoined, setJoined, markFromEmail, JOINED_EVENT, JOINED_KEY } from "@/lib/joined.mjs";

/**
 * Who's reading, for the calls to action: "member" (signed in here), "joined" (signed up, but not signed in
 * in this browser), "pending" (sent the form, not confirmed yet), "guest", or undefined while loading.
 */
export function useJoined() {
  const user = useUser();
  const [flag, setFlag] = useState(undefined);
  useEffect(() => {
    markFromEmail(window.location.search);
    const sync = () => setFlag(readJoined());
    sync();
    const onStorage = (e) => e.key === JOINED_KEY && sync();
    window.addEventListener(JOINED_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => { window.removeEventListener(JOINED_EVENT, sync); window.removeEventListener("storage", onStorage); };
  }, []);
  useEffect(() => { if (user) setJoined("yes"); }, [user?.id]);
  if (user) return "member";
  if (user === undefined || flag === undefined) return undefined;
  return flag === "yes" ? "joined" : flag === "pending" ? "pending" : "guest";
}

/** Renders `children` (a sign-up prompt) only for guests; `joined` for people who already signed up
 *  (signed in or not), `pending` (defaults to `joined`) for those who haven't confirmed the email yet. */
export function GuestOnly({ children, joined = null, pending }) {
  const who = useJoined();
  if (who === "guest" || who === undefined) return children;
  return who === "pending" && pending !== undefined ? pending : joined;
}
