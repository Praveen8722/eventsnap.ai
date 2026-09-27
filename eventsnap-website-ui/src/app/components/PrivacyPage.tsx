import { PolicyPage } from "./PolicyPage";

export function PrivacyPage() {
  return (
    <PolicyPage
      title="Privacy Policy"
      lastUpdated="January 1, 2025"
      sections={[
        {
          h: "1. Information We Collect",
          p: "We collect information you provide directly to us, such as when you create an account, make a booking, or contact our support team. This includes your name, email address, payment information, and any content you upload to our platform such as photos and client details.",
        },
        {
          h: "2. How We Use Your Information",
          p: "We use the information we collect to provide, maintain, and improve our services; process transactions; send transactional and promotional messages; monitor and analyze usage patterns; and comply with legal obligations. We never sell your personal data to third parties.",
        },
        {
          h: "3. Data Sharing",
          p: "We may share your information with trusted third-party service providers who assist us in operating our platform, such as Stripe for payment processing and cloud storage providers. These parties are contractually obligated to protect your data and may not use it for any other purpose.",
        },
        {
          h: "4. Data Retention",
          p: "We retain your data for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time by contacting us at privacy@eventsnap.ai. We will process deletion requests within 30 days.",
        },
        {
          h: "5. Security",
          p: "We implement industry-standard security measures including AES-256 encryption at rest and in transit, SOC 2 Type II compliant infrastructure, regular penetration testing, and access controls. However, no method of transmission over the internet is 100% secure.",
        },
        {
          h: "6. Your Rights",
          p: "Depending on your location, you may have the right to access, correct, or delete your personal data; object to or restrict certain processing; and request data portability. To exercise these rights, contact us at privacy@eventsnap.ai.",
        },
        {
          h: "7. Contact Us",
          p: "If you have any questions about this Privacy Policy, please contact our Data Protection team at privacy@eventsnap.ai or by mail at EventSnap.ai, Inc., 340 Pine Street, San Francisco, CA 94104, USA.",
        },
      ]}
    />
  );
}
