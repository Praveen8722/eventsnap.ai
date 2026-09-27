import axios from "axios";

// Mirrors a signed-up/logged-in user's non-sensitive profile info into the
// EventSnap.ai company website's own backend + database (eventSnapWebsiteDB)
// — a completely separate project (eventsnap-website-backend).
//
// eventSnapDB + this app's JWT remain the single source of truth for
// authentication. Nothing here ever sends a password, JWT, or auth secret,
// and a failure here must never affect signup/login for this app — every
// call is best-effort and swallows its own errors.
const WEBSITE_SYNC_URL =
  process.env.COMPANY_WEBSITE_SYNC_URL || "http://localhost:8081/api/users/sync";

export const syncUserToWebsite = async (user) => {
  if (!user?._id) return;

  try {
    await axios.post(
      WEBSITE_SYNC_URL,
      {
        // Stable reference back to the eventSnapDB account — never a secret.
        eventSnapUserId: user._id.toString(),
        name: user.name || "",
        businessName: user.businessName || "",
        email: user.email || "",
        phone: user.phone || "",
        location: user.location || "",
        website: user.website || "",
        businessDescription: user.businessDescription || "",
      },
      { timeout: 5000 }
    );
  } catch (error) {
    // Company website backend may be offline/unreachable — that's fine,
    // it just means this user's profile isn't mirrored there yet.
    console.error("Company website user sync failed:", error.message);
  }
};
