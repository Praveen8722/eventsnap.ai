import { Star } from "lucide-react";
import { SectionLabel } from "./SectionLabel";
import { TESTIMONIALS_DATA } from "./data";

export function TestimonialsSection() {
  return (
    <section className="py-24" style={{ background: "#f7f6ff" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <SectionLabel>Testimonials</SectionLabel>
          <h2
            className="text-3xl sm:text-4xl font-bold text-foreground mb-4"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            Loved by photographers everywhere
          </h2>
          <p className="text-muted-foreground text-lg">
            Don't take our word for it — here's what our photographers say.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS_DATA.map(({ name, role, avatar, rating, quote }) => (
            <div
              key={name}
              className="bg-white rounded-2xl p-7 border border-border hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center gap-1 mb-5">
                {[...Array(rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <p className="text-foreground text-sm leading-relaxed mb-6 italic">
                "{quote}"
              </p>
              <div className="flex items-center gap-3">
                <img
                  src={avatar}
                  alt={name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold text-sm text-foreground">
                    {name}
                  </p>
                  <p className="text-muted-foreground text-xs mt-0.5">{role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
