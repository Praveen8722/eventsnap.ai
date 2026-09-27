import { ArrowRight, CheckCircle, Clock, CreditCard, FileText, Globe } from "lucide-react";
import { OutlineBtn } from "./OutlineBtn";
import type { Page } from "./types";

export function PaymentsDeepDive({ go }: { go: (p: Page) => void }) {
  return (
      <section className="py-24" style={{ background: "#F8F7FF" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#ECFDF5] rounded-full mb-5">
                <CreditCard size={12} className="text-[#10B981]" />
                <span className="text-[#10B981] text-xs font-bold uppercase tracking-widest">
                  Payments & Invoicing
                </span>
              </div>
              <h2
                className="text-3xl sm:text-4xl font-bold text-foreground mb-5 leading-tight"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                Get paid faster, every time
              </h2>
              <p className="text-[#6060A0] text-base leading-relaxed mb-7">
                Accept deposits, generate professional invoices, and collect
                final payments within EventSnap.ai. Automatic reminders mean you
                never chase money again.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  {
                    label: "Avg. payment time",
                    value: "2.4 days",
                    icon: Clock,
                  },
                  {
                    label: "Payment success rate",
                    value: "98.7%",
                    icon: CheckCircle,
                  },
                  { label: "Supported currencies", value: "135+", icon: Globe },
                  { label: "Invoice templates", value: "12+", icon: FileText },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="bg-white rounded-2xl p-4 border border-[#EEEEF8]"
                  >
                    <s.icon size={15} className="text-[#10B981] mb-2" />
                    <div className="text-[#1E1E1E] font-black text-xl">
                      {s.value}
                    </div>
                    <div className="text-[#8080A0] text-[11px] mt-0.5">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
              <OutlineBtn
                onClick={() => go("pricing")}
                className="bg-[#10B981] text-white font-semibold rounded-2xl hover:bg-[#0EA472] transition-all shadow-md shadow-[#10B981]/25"
              >
                Explore payments <ArrowRight size={15} />
              </OutlineBtn>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-[#10B981]/8 rounded-3xl blur-2xl scale-105" />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-[#EEEEF8] bg-white">
                <img
                  src="https://images.unsplash.com/photo-1647937627386-b8d8420718a6?w=700&h=380&fit=crop&auto=format"
                  alt="Business analytics"
                  className="w-full h-52 object-cover"
                />
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[#1E1E1E] font-semibold text-sm">
                      January Revenue
                    </span>
                    <span className="text-[#10B981] text-sm font-bold">
                      +18.4% MoM
                    </span>
                  </div>
                  <div className="flex items-end gap-0.5 h-10">
                    {[40, 55, 45, 70, 60, 80, 65, 90, 75, 95, 82, 100].map(
                      (h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-sm"
                          style={{
                            height: `${h}%`,
                            background:
                              i === 11
                                ? "#10B981"
                                : `rgba(16,185,129,${0.15 + i * 0.06})`,
                          }}
                        />
                      ),
                    )}
                  </div>
                  <div className="flex justify-between text-[#B0B0C0] text-[10px] mt-1">
                    <span>Jan</span>
                    <span>Jun</span>
                    <span>Dec</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
  );
}
