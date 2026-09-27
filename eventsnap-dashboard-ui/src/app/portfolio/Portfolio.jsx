"use client";

import { useState } from 'react';
import { PortfolioDataProvider } from './portfolioStore';
import { Sidebar, NAV_ITEMS } from './Sidebar';
import { PortfolioOverview } from './PortfolioOverview';
import { EditPortfolio } from './EditPortfolio';
import { PortfolioPreview } from './PortfolioPreview';
import { GalleryManagement } from './GalleryManagement';
import { ServicesManagement } from './ServicesManagement';
import { PricingManagement } from './PricingManagement';
import { TestimonialsManagement } from './TestimonialsManagement';
import { FAQManagement } from './FAQManagement';
import { ContactInformation } from './ContactInformation';
import { PortfolioLink } from './PortfolioLink';
import { QRCodePage } from './QRCodePage';
import { PortfolioSettings } from './PortfolioSettings';

// ─── Main Portfolio Container ─────────────────────────────────────────────────
export function Portfolio() {
  const [active, setActive] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const renderPage = () => {
    switch (active) {
      case 'overview': return <PortfolioOverview onNavigate={(sub) => setActive(sub)} />;
      case 'edit': return <EditPortfolio />;
      case 'preview': return <PortfolioPreview />;
      case 'gallery': return <GalleryManagement />;
      case 'services': return <ServicesManagement />;
      case 'pricing': return <PricingManagement />;
      case 'testimonials': return <TestimonialsManagement />;
      case 'faq': return <FAQManagement />;
      case 'contact': return <ContactInformation />;
      case 'link': return <PortfolioLink />;
      case 'qrcode': return <QRCodePage />;
      case 'settings': return <PortfolioSettings />;
      default: return <PortfolioOverview onNavigate={(sub) => setActive(sub)} />;
    }
  };

  const activeItem = NAV_ITEMS.find(n => n.id === active);

  return (
    <PortfolioDataProvider>
      <div className="flex gap-0 min-h-[calc(100vh-72px)]">
        {/* Portfolio sub-sidebar */}
        <Sidebar
          active={active}
          setActive={setActive}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 bg-white sticky top-0 z-10">
            <span className="text-xs text-gray-400">Portfolio</span>
            <span className="text-xs text-gray-300">/</span>
            <span className="text-xs font-medium text-[#1E1E1E]">{activeItem?.label}</span>
          </div>
          <div className="p-6">
            {renderPage()}
          </div>
        </div>
      </div>
    </PortfolioDataProvider>
  );
}
