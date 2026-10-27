// Who runs CreativeIn, as the law asks a business selling online to show it (consumer protection law §14ג:
// name, ID or business number, address, a way to reach it). Values come only from the environment, never
// from the repo. Server only.
//   BUSINESS_NAME     (falls back to DIGEST_SENDER_NAME)
//   BUSINESS_ID       the business number (עוסק פטור: the owner's ID number)
//   BUSINESS_ADDRESS  (falls back to DIGEST_SENDER_ADDRESS)
//   NEXT_PUBLIC_PRIVACY_EMAIL  the contact address
const env = (k) => String(process.env[k] || "").trim();

export function business() {
  return {
    name: env("BUSINESS_NAME") || env("DIGEST_SENDER_NAME"),
    id: env("BUSINESS_ID"),
    address: env("BUSINESS_ADDRESS") || env("DIGEST_SENDER_ADDRESS"),
    email: env("NEXT_PUBLIC_PRIVACY_EMAIL"),
  };
}

/** Everything the terms and the confirmation email must show is set: payments stay closed until it is. */
export function businessReady() {
  const b = business();
  return Boolean(b.name && b.id && b.address && b.email);
}
