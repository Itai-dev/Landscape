import { redirect } from "next/navigation";
import Onboard from "./Onboard";
import { PROFILES_ENABLED } from "@/lib/config";
import RefCapture from "@/components/RefCapture";
import { seedById, orgLabel, roleHe } from "@/lib/people";

export const metadata = { title: "בניית פרופיל" };

export default async function Page({ searchParams }) {
  const sp = await searchParams;
  // Stage 1: no profiles. Old links land on the weekly digest (an invite link keeps its code, on the survey).
  if (!PROFILES_ENABLED) redirect(/^[a-z0-9]{4,16}$/i.test(String(sp?.ref || "")) ? `/survey?ref=${String(sp.ref).toLowerCase()}` : "/digest");
  const seed = seedById(sp?.claim);
  // "This is me" on a person listed from public sources: start from the published name, role and company.
  const claim = seed
    ? { id: seed.id, name: seed.name, roles: seed.roles.map((r) => ({ role: r.role, shown: roleHe(r.role) || r.role, org: orgLabel(r) })) }
    : null;
  return (
    <div className="wrap narrow">
      <RefCapture />
      <Onboard claim={claim} />
    </div>
  );
}
