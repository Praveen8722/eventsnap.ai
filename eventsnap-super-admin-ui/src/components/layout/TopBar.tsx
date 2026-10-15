import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell, ChevronDown, Globe, LogOut, Search, Settings, User } from 'lucide-react';
import { ROUTES } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';
import { getRecentAlerts, markAllNotificationsRead } from '@/services/notificationService';
import type { NotificationAlert, NotificationType } from '@/types';
import { initials } from '@/utils/format';

const dotColor: Record<NotificationType, string> = {
  warning: '#F59E0B',
  error: '#FF675D',
  info: '#6C63FF',
  success: '#10B981',
};

interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [recentAlerts, setRecentAlerts] = useState<NotificationAlert[]>([]);
  const hasUnread = recentAlerts.some(alert => !alert.read);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Alerts are non-critical chrome: keep showing the last good list if a refresh fails.
  const reloadAlerts = useCallback(() => {
    getRecentAlerts().then(setRecentAlerts, () => {});
  }, []);

  useEffect(reloadAlerts, [reloadAlerts]);

  const markAllRead = () => {
    markAllNotificationsRead().then(reloadAlerts, reloadAlerts);
  };

  const closeMenus = () => {
    setShowProfile(false);
    setShowNotifications(false);
  };

  const goTo = (path: string) => {
    navigate(path);
    closeMenus();
  };

  const profileMenu = [
    { icon: User, label: 'Profile Settings' },
    { icon: Settings, label: 'Preferences' },
    { icon: Globe, label: 'Platform Settings', action: () => goTo(ROUTES.settings) },
  ];

  return (
    <header
      className="sticky top-0 h-16 z-30 flex items-center justify-between px-6 border-b"
      style={{
        background: 'rgba(255,255,255,0.97)',
        borderColor: 'rgba(0,0,0,0.08)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-center gap-4 flex-1">
        <div>
          <h1 className="text-[#1E1E1E] font-semibold text-base">{title}</h1>
          <p className="text-[#8080A0] text-xs">EventSnap.ai Administration Panel</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md mx-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0A0C0]" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search photographers, clients, bookings..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-[#F5F6FA] border border-[#E8E8F0] rounded-xl text-[#1E1E1E] placeholder:text-[#A0A0C0] focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/30 focus:border-[#6C63FF]"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Platform status */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10B981]/10 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
          <span className="text-[#10B981] text-[11px] font-semibold">All Systems Operational</span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              if (!showNotifications) reloadAlerts();
              setShowNotifications(s => !s);
              setShowProfile(false);
            }}
            aria-label="Notifications"
            className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#F5F6FA] transition-colors"
          >
            <Bell size={18} className="text-[#6060A0]" />
            {hasUnread && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FF675D] rounded-full border-2 border-white" />}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-[#E8E8F0] z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-[#F0F0F8] flex items-center justify-between">
                <span className="font-semibold text-[#1E1E1E] text-sm">Notifications</span>
                {hasUnread && (
                  <button onClick={markAllRead} className="text-[10px] text-[#6C63FF] font-semibold hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {recentAlerts.length === 0 && (
                  <p className="px-4 py-6 text-center text-[#A0A0C0] text-xs">No notifications</p>
                )}
                {recentAlerts.map(n => (
                  <div key={n.id} className="px-4 py-3 hover:bg-[#F9F9FF] flex items-start gap-3 border-b border-[#F5F5FA] cursor-pointer">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: dotColor[n.type] }} />
                    <div className="flex-1">
                      <p className={`text-[#1E1E1E] text-xs ${n.read ? 'font-normal' : 'font-semibold'}`}>{n.text}</p>
                      <p className="text-[#A0A0C0] text-[10px] mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 text-center">
                <button
                  onClick={() => goTo(ROUTES.notifications)}
                  className="text-[#6C63FF] text-xs font-semibold hover:underline"
                >
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => { setShowProfile(s => !s); setShowNotifications(false); }}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-[#F5F6FA] transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#FF675D] flex items-center justify-center text-white text-xs font-bold">
              {initials(user?.name ?? '')}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-[#1E1E1E] text-xs font-semibold">{user?.name}</div>
              <div className="text-[#A0A0C0] text-[10px]">{user?.role}</div>
            </div>
            <ChevronDown size={14} className="text-[#A0A0C0]" />
          </button>

          {showProfile && (
            <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl shadow-2xl border border-[#E8E8F0] z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-[#F0F0F8]">
                <p className="text-[#1E1E1E] text-sm font-semibold">{user?.name}</p>
                <p className="text-[#A0A0C0] text-xs truncate">{user?.email}</p>
              </div>
              <div className="py-1">
                {profileMenu.map(({ icon: Icon, label, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F9F9FF] text-[#4A4A6A] text-sm transition-colors"
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                ))}
              </div>
              <div className="border-t border-[#F0F0F8] py-1">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#FFF0EF] text-[#FF675D] text-sm transition-colors"
                >
                  <LogOut size={15} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overlay to close dropdowns */}
      {(showProfile || showNotifications) && (
        <div className="fixed inset-0 z-40" onClick={closeMenus} />
      )}
    </header>
  );
}
