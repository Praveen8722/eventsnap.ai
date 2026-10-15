import { Suspense, useEffect, useState } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { PageLoader } from '@/components/common/PageLoader';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { getPageTitle } from '@/config/navigation';

export function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { pathname } = useLocation();
  const pageTitle = getPageTitle(pathname);

  useEffect(() => {
    document.title = `${pageTitle} · EventSnap.ai Admin`;
  }, [pageTitle]);

  return (
    <div className="min-h-screen bg-[#F5F6FA] flex">
      <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(c => !c)} />
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-[72px]' : 'ml-[260px]'}`}
      >
        <TopBar title={pageTitle} />
        <main className="flex-1 p-6 overflow-y-auto">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <ScrollRestoration />
    </div>
  );
}
