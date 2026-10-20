"use client";

// Things this browser keeps for the signed-in person (survey drafts hold rates and salary).
export function clearLocalData() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("landscape-survey-draft") || k.startsWith("landscape-ref"))) localStorage.removeItem(k);
    }
  } catch {}
}

// Sign-out that also clears what this browser kept for the person.
export default function SignOutButton({ className = "btn" }) {
  return (
    <form action="/auth/signout" method="post" onSubmit={clearLocalData}>
      <button className={className}>יציאה</button>
    </form>
  );
}
