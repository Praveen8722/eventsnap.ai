import { DARK_GRADIENT } from "./theme";

export function PolicyPage({
  title,
  lastUpdated,
  sections,
}: {
  title: string;
  lastUpdated: string;
  sections: { h: string; p: string }[];
}) {
  return (
    <div>
      <section className="py-14" style={{ background: DARK_GRADIENT }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1
            className="text-3xl sm:text-4xl font-bold text-white mb-3"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            {title}
          </h1>
          <p className="text-white/50 text-sm">Last updated: {lastUpdated}</p>
        </div>
      </section>
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-sm max-w-none">
          {sections.map(({ h, p }) => (
            <div key={h} className="mb-8">
              <h2
                className="font-bold text-lg text-foreground mb-3"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                {h}
              </h2>
              <p className="text-muted-foreground leading-relaxed">{p}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
