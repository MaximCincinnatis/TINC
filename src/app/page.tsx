import DashboardClient from './dashboard-client';
import { loadBurnData } from '@/lib/loadBurnData';

// ISR: the burn data changes slowly (and is baked in per deploy), so cache the rendered
// HTML and regenerate at most once every 5 minutes. Mirrors the old burn-data.json max-age.
export const revalidate = 300;

// Server Component: read the burn data on the server and hand it to the client dashboard as
// initialData so the REAL numbers are server-rendered into the HTML (the SSR win). loadBurnData
// is fail-soft (returns null -> DashboardClient renders its shell + client-fetches).
export default async function Page() {
  const initialData = await loadBurnData();
  return <DashboardClient initialData={initialData} />;
}
