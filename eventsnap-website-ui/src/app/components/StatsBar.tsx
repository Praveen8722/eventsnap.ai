import { PURPLE } from "./theme";

export function StatsBar() {
  const stats = [
    { value: "10,000+", label: "Active Photographers" },
    { value: "$2.4M+", label: "Paid Out Monthly" },
    { value: "40+", label: "Countries Supported" },
    { value: "4.9 / 5", label: "Average Rating" },
  ];
  return (
    <section className="border-y border-border bg-secondary/40 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p
                className="font-bold text-2xl sm:text-3xl mb-1"
                style={{ color: PURPLE, fontFamily: "Poppins, sans-serif" }}
              >
                {s.value}
              </p>
              <p className="text-muted-foreground text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
