"use client";

// A <select> inside a GET form that applies the choice right away (no extra press on "search").
// Empty fields are left out of the address (no "?q=&craft=…").
export default function AutoSelect({ children, ...props }) {
  function apply(e) {
    const form = e.currentTarget.form;
    if (!form) return;
    const empty = [...form.elements].filter((el) => el.name && !el.disabled && el.value === "");
    empty.forEach((el) => (el.disabled = true));
    form.requestSubmit();
    empty.forEach((el) => (el.disabled = false));
  }
  return (
    <select {...props} onChange={apply}>
      {children}
    </select>
  );
}
