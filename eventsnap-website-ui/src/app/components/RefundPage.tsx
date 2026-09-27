import { PolicyPage } from "./PolicyPage";

export function RefundPage() {
  return (
    <PolicyPage
      title="Refund Policy"
      lastUpdated="January 1, 2025"
      sections={[
        {
          h: "Overview",
          p: "We want you to be completely satisfied with EventSnap.ai. If you are not satisfied with your purchase for any reason, we offer a straightforward refund policy as described below.",
        },
        {
          h: "14-Day Free Trial",
          p: "All paid plans include a 14-day free trial. You will not be charged during your trial period. You may cancel at any time during your trial at no cost. After the trial ends, your subscription will automatically begin and you will be charged.",
        },
        {
          h: "Monthly Subscriptions",
          p: "For monthly subscriptions, you may cancel at any time. Your subscription will remain active until the end of the current billing period. We do not offer partial-month refunds for monthly subscriptions unless required by applicable law.",
        },
        {
          h: "Annual Subscriptions",
          p: "For annual subscriptions canceled within 30 days of payment, we will issue a full refund. Cancellations after 30 days are not eligible for refunds, but your account will remain active until the end of the annual billing period.",
        },
        {
          h: "How to Request a Refund",
          p: "To request a refund, contact our support team at billing@eventsnap.ai with your account email and reason for the refund request. We will review your request and respond within 2–3 business days. Approved refunds are processed within 5–10 business days.",
        },
        {
          h: "Exceptions",
          p: "Refunds may be denied if your account has violated our Terms of Service. Refunds are not available for one-time add-ons or additional storage purchases. We reserve the right to deny refunds at our discretion if abuse of this policy is detected.",
        },
      ]}
    />
  );
}
