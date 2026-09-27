// Where the dashboard backend (eventsnap-dashboard-backend) is reachable.
// Set NEXT_PUBLIC_API_URL for a hosted build (pages-cd.yaml → Render);
// local development falls back to the backend on this machine.
export const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
