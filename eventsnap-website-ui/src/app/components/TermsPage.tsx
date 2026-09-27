import { PolicyPage } from "./PolicyPage";

export function TermsPage() {
  return (
    <PolicyPage
      title="Terms of Service"
      lastUpdated="January 1, 2025"
      sections={[
        {
          h: "1. Acceptance of Terms",
          p: "By accessing or using EventSnap.ai, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use our services. These terms apply to all users of the platform.",
        },
        {
          h: "2. Account Registration",
          p: "You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized access.",
        },
        {
          h: "3. Acceptable Use",
          p: "You agree not to use EventSnap.ai for any unlawful purpose or in any way that could harm, disable, or impair the platform. You may not attempt to gain unauthorized access to any part of our services, systems, or networks, or engage in any activity that disrupts our services.",
        },
        {
          h: "4. Intellectual Property",
          p: "EventSnap.ai and its original content, features, and functionality are owned by EventSnap.ai, Inc. and are protected by international copyright, trademark, and other laws. You retain ownership of any content you upload to our platform.",
        },
        {
          h: "5. Payment Terms",
          p: "Paid subscriptions are billed in advance on a monthly or annual basis. All fees are non-refundable except as described in our Refund Policy. We reserve the right to change our pricing with 30 days' notice. Failure to pay may result in service suspension.",
        },
        {
          h: "6. Termination",
          p: "We may terminate or suspend your account at any time for violation of these Terms. You may cancel your account at any time from your account settings. Upon termination, your right to use the service will immediately cease.",
        },
        {
          h: "7. Limitation of Liability",
          p: "EventSnap.ai shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use our services. Our total liability to you shall not exceed the amount you paid us in the 12 months prior to the claim.",
        },
      ]}
    />
  );
}
