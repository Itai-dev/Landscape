"use client";

// A <select> inside a GET form that applies the choice right away (no extra press on "search").
export default function AutoSelect({ children, ...props }) {
  return (
    <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
      {children}
    </select>
  );
}
