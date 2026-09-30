import { portfolioAssetUrl } from "@/api/portfolioApi";

// Profile photo / cover image hold either a seeded Unsplash id, a full URL /
// data URL uploaded from a device, or a server path ("/api/portfolio/photos/<id>",
// or a legacy "/uploads/..."). Returns
// undefined when nothing is set. Shared by Portfolio Preview and Overview.
export const photoSrc = (v, params) => {
  if (!v) return undefined;
  if (v.startsWith("/")) return portfolioAssetUrl(v);
  return /^(data:|blob:|https?:)/.test(v)
    ? v
    : `https://images.unsplash.com/${v}?${params}`;
};
