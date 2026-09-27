import { useState } from "react";
import type { Page } from "./components/types";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { HomePage } from "./components/HomePage";
import { FeaturesPage } from "./components/FeaturesPage";
import { HowItWorksPage } from "./components/HowItWorksPage";
import { ForPhotographersPage } from "./components/ForPhotographersPage";
import { PricingPage } from "./components/PricingPage";
import { AboutPage } from "./components/AboutPage";
import { ContactPage } from "./components/ContactPage";
import { FAQPage } from "./components/FAQPage";
import { LoginPage } from "./components/LoginPage";
import { SignUpPage } from "./components/SignUpPage";
import { PrivacyPage } from "./components/PrivacyPage";
import { TermsPage } from "./components/TermsPage";
import { RefundPage } from "./components/RefundPage";

export default function App() {
  const [page, setPage] = useState<Page>("home");

  const go = (p: Page) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isFullScreen = page === "login" || page === "signup";

  const renderPage = () => {
    switch (page) {
      case "home":
        return <HomePage go={go} />;
      case "features":
        return <FeaturesPage go={go} />;
      case "how-it-works":
        return <HowItWorksPage go={go} />;
      case "for-photographers":
        return <ForPhotographersPage go={go} />;
      case "pricing":
        return <PricingPage go={go} />;
      case "about":
        return <AboutPage go={go} />;
      case "contact":
        return <ContactPage />;
      case "faq":
        return <FAQPage go={go} />;
      case "login":
        return <LoginPage go={go} />;
      case "signup":
        return <SignUpPage go={go} />;
      case "privacy":
        return <PrivacyPage />;
      case "terms":
        return <TermsPage />;
      case "refund":
        return <RefundPage />;
      default:
        return <HomePage go={go} />;
    }
  };

  if (isFullScreen) {
    return <div className="min-h-screen bg-background">{renderPage()}</div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar current={page} go={go} />
      <main className="flex-1">{renderPage()}</main>
      <Footer go={go} />
    </div>
  );
}
