import { PolicyPage } from "./PolicyPage";

export function TermsPage() {
  return (
    <PolicyPage
      title="Terms of Service"
      lastUpdated="Placeholder — update before launch"
      sections={[
        {
          h: "1. Introduction",
          p: "This Terms of Service draft is a placeholder for the EventSnap product and company website. It should be reviewed, customized, and approved by legal counsel before public release. It outlines the basic relationship between the service operator and users of the product.",
        },
        {
          h: "2. Account Use",
          p: "Users are responsible for creating accurate account details, keeping credentials secure, and using the dashboard only for legitimate photography business activities. Access to booking records, gallery uploads, invoices, and personal client data should be restricted to authorized users.",
        },
        {
          h: "3. Product Scope",
          p: "EventSnap provides a dashboard for managing bookings, inquiries, invoices, public portfolio content, event galleries, and related operational tasks. The service should not be used for unlawful activity, abusive behavior, or unauthorized access to other users’ records or files.",
        },
        {
          h: "4. Content and Data",
          p: "Users retain ownership of their own content and business data, including uploaded photography, portfolio content, and client records. The service operator may store and process this data to provide the requested functionality and support operations.",
        },
        {
          h: "5. Pricing and Billing",
          p: "Any pricing model, subscription plan, or billing arrangement should be stated clearly in a final commercial agreement or pricing page. This repository does not define final pricing terms, so placeholder pricing statements should be replaced before launch.",
        },
        {
          h: "6. Service Availability",
          p: "The platform may experience planned maintenance or temporary downtime. The operator should communicate outages or significant service changes in a practical, transparent way and should maintain a reasonable troubleshooting process for customer support.",
        },
        {
          h: "7. Limitation and Review",
          p: "This document is intentionally general and should be expanded for your jurisdiction, business model, and launch requirements. Final terms should cover liability, dispute resolution, payment terms, termination, and compliance with local legal requirements before the site is made public.",
        },
      ]}
    />
  );
}
