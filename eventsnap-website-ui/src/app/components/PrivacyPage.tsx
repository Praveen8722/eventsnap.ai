import { PolicyPage } from "./PolicyPage";

export function PrivacyPage() {
  return (
    <PolicyPage
      title="Privacy Policy"
      lastUpdated="Placeholder — update before launch"
      sections={[
        {
          h: "1. Overview",
          p: "This draft Privacy Policy is a placeholder for the EventSnap marketing site and product. It should be reviewed by your legal counsel before public launch. It describes the types of account, booking, portfolio, and contact data that may be collected in a photography business workflow.",
        },
        {
          h: "2. Information We Collect",
          p: "EventSnap may collect account details such as name, email, phone, business details, profile images, portfolio content, and contact form submissions. For photographers using the dashboard, it may also store booking information, inquiry records, invoice data, event gallery uploads, and public share settings associated with a client or event.",
        },
        {
          h: "3. How We Use Information",
          p: "We use this data to operate the product, manage bookings and inquiries, deliver gallery access, maintain portfolio pages, support invoicing, and improve the dashboard experience. Personal information is not used for unrelated business purposes without consent or a legal basis.",
        },
        {
          h: "4. Sharing and Storage",
          p: "Information may be shared with service providers required to run the product, such as cloud hosting, email delivery, or database infrastructure. We should keep any third-party provider list explicit and ensure appropriate data-processing terms are in place before launch.",
        },
        {
          h: "5. Data Retention",
          p: "Retention periods should be documented in your actual privacy policy and should align with your business needs, legal obligations, and support requirements. You may define how long inquiry records, gallery content, and profile details are stored before they are removed or archived.",
        },
        {
          h: "6. Security and Access",
          p: "EventSnap should use secure storage, access controls, and encrypted transport for user and business data. This product is already built around account-specific access to bookings, galleries, and invoices, and these protections should remain in place for production use.",
        },
        {
          h: "7. Rights and Contact",
          p: "Depending on your jurisdiction, users may have rights to request access, correction, deletion, or portability of personal data. Replace this section with the actual contact details you want to publish for privacy requests and support, such as privacy@yourdomain.com.",
        },
      ]}
    />
  );
}
