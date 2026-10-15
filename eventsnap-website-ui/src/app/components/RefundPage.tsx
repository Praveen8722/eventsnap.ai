import { PolicyPage } from "./PolicyPage";

export function RefundPage() {
  return (
    <PolicyPage
      title="Refund Policy"
      lastUpdated="Placeholder — update before launch"
      sections={[
        {
          h: "1. Placeholder Policy",
          p: "This Refund Policy is a placeholder draft for EventSnap. The project codebase does not define final commercial billing terms, so this page should be reviewed and approved by your legal and finance team before launch.",
        },
        {
          h: "2. Billing Model",
          p: "If EventSnap is sold on a custom quote basis, a trial basis, or a subscription model, the final refund policy should match that billing structure exactly. For example, the policy should state whether any trial is included, how cancellation works, and what happens to outstanding invoices or credits.",
        },
        {
          h: "3. Request Process",
          p: "A final refund policy should explain how users request refunds, how long review will take, whether a refund is partial or full, and which contact email or support channel is used for finance requests. Replace this placeholder with your actual process and contact details.",
        },
        {
          h: "4. Exceptions",
          p: "Any final policy should include exceptions such as service misuse, non-refundable fees, or custom work already delivered. The policy should also reflect the jurisdiction in which you operate and any laws that may override generic customer refund terms.",
        },
      ]}
    />
  );
}
