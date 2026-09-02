import DashboardClient from './dashboard-client';
import { loadBurnData } from '@/lib/loadBurnData';
import { loadHolders } from '@/lib/holders';
import { rankLookup } from '@/lib/ranks';

// ISR: the burn data changes slowly (and is baked in per deploy), so cache the rendered
// HTML and regenerate at most once every 5 minutes. Mirrors the old burn-data.json max-age.
export const revalidate = 300;

// Server Component: read the burn data on the server and hand it to the client dashboard as
// initialData so the REAL numbers are server-rendered into the HTML (the SSR win). loadBurnData
// is fail-soft (returns null -> DashboardClient renders its shell + client-fetches).
export default async function Page() {
  const [initialData, holders] = await Promise.all([loadBurnData(), loadHolders()]);
  // The lookup's example answer is a real wallet at rank 50 in this snapshot, so it never drifts
  // from the truth; when the holder list is unavailable the client shows a static example.
  const example = holders && holders.holders.length >= 50 ? rankLookup(holders, holders.holders[49].a) : null;
  return <DashboardClient initialData={initialData} example={example} />;
}
