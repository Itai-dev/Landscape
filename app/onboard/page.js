import Onboard from "./Onboard";
import RefCapture from "@/components/RefCapture";
import { seedById, orgLabel, roleHe } from "@/lib/people";

export const metadata = { title: "בניית פרופיל" };

export default async function Page({ searchParams }) {
  const sp = await searchParams;
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
