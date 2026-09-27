import { Calendar, BarChart3, Users, TrendingUp } from "lucide-react";
import { SectionLabel } from "./SectionLabel";
import { PURPLE, CORAL, BRAND_GRADIENT, DARK_GRADIENT } from "./theme";

export function AnalyticsSection() {
  const bars = [40, 65, 55, 80, 70, 90, 75, 95, 85, 100, 88, 110];
  const max = Math.max(...bars);
  return (
    <section
      className="py-24 relative overflow-hidden"
      style={{ background: DARK_GRADIENT }}
    >
      <div
        className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: CORAL }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <SectionLabel color={CORAL}>Business Analytics</SectionLabel>
            <h2
              className="text-3xl sm:text-4xl font-bold text-white mb-5 leading-tight"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              See exactly how your business is growing
            </h2>
            <p className="text-white/60 text-lg leading-relaxed mb-8">
              Real-time dashboards and reports show your revenue, booking
              trends, gallery views, and client retention — so you always know
              where to focus.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Revenue Tracking", icon: TrendingUp },
                { label: "Booking Analytics", icon: Calendar },
                { label: "Client Insights", icon: Users },
                { label: "Performance Reports", icon: BarChart3 },
              ].map(({ label, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: "rgba(108,99,255,0.2)" }}
                >
                  <Icon
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: "#b8b2ff" }}
                  />
                  <span className="text-white/80 text-sm font-medium">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* Chart preview */}
          <div
            className="rounded-2xl p-6"
            style={{ background: "#1e1a3e", border: `1px solid ${PURPLE}35` }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-white/40 text-xs font-semibold tracking-widest uppercase">
                  Monthly Revenue
                </p>
                <p
                  className="text-white font-bold text-2xl mt-1"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  $24,860
                </p>
                <p className="text-emerald-400 text-xs mt-1">
                  ↑ 23% vs last year
                </p>
              </div>
              <div className="flex gap-2">
                {["1M", "6M", "1Y"].map((t, i) => (
                  <button
                    key={t}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${i === 2 ? "text-white" : "text-white/40 hover:text-white/70"}`}
                    style={i === 2 ? { background: PURPLE } : {}}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-end gap-1.5 h-36">
              {bars.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-md transition-all"
                  style={{
                    height: `${(h / max) * 100}%`,
                    background:
                      i === bars.length - 1 ? BRAND_GRADIENT : `${PURPLE}50`,
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2">
              {[
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ].map((m) => (
                <span key={m} className="text-white/25 text-xs">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
