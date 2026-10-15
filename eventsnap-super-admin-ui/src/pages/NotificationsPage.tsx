import { useState } from 'react';
import {
  Bell, CheckCircle, AlertTriangle, Info, XCircle, X, Check, type LucideIcon,
} from 'lucide-react';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAsync } from '@/hooks/useAsync';
import { dismissNotification, getNotificationsData, markAllNotificationsRead, markNotificationRead } from '@/services/notificationService';
import type { NotificationType, NotificationsData } from '@/types';

const typeConfig: Record<NotificationType, { icon: LucideIcon, color: string; bg: string; border: string }> = {
  success: { icon: CheckCircle, color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
  warning: { icon: AlertTriangle, color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
  error: { icon: XCircle, color: '#FF675D', bg: '#FFF1F0', border: '#FECACA' },
  info: { icon: Info, color: '#6C63FF', bg: '#F0EEFF', border: '#C4B5FD' },
};

export default function NotificationsPage() {
  const result = useAsync(getNotificationsData);
  return <AsyncBoundary result={result}>{data => <NotificationsView {...data} />}</AsyncBoundary>;
}

function NotificationsView({ notifications: initialNotifications, categories }: NotificationsData) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [actionError, setActionError] = useState('');

  const unreadCount = notifications.filter(n => !n.read).length;

  const filtered = notifications.filter(n => {
    const matchCategory = categoryFilter === 'All' || n.category === categoryFilter;
    const matchRead = !showUnreadOnly || !n.read;
    return matchCategory && matchRead;
  });

  /** Runs an API action and applies the matching local update only once the server confirms it. */
  const runAction = (action: () => Promise<unknown>, applyLocally: () => void) => {
    setActionError('');
    action().then(applyLocally, (error: unknown) => {
      setActionError(error instanceof Error ? error.message : 'The action could not be completed.');
    });
  };

  const markAllRead = () => {
    runAction(markAllNotificationsRead, () => setNotifications(prev => prev.map(n => ({ ...n, read: true }))));
  };

  const markRead = (id: string) => {
    runAction(() => markNotificationRead(id), () => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n)));
  };

  const dismiss = (id: string) => {
    runAction(() => dismissNotification(id), () => setNotifications(prev => prev.filter(n => n.id !== id)));
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notifications"
        description={<>{unreadCount > 0 ? <span className="text-[#6C63FF] font-semibold">{unreadCount} unread</span> : 'All caught up'} — platform alerts and updates</>}
        actions={
          <>
            <button
              onClick={() => setShowUnreadOnly(s => !s)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${showUnreadOnly ? 'bg-[#6C63FF] text-white border-[#6C63FF]' : 'bg-white text-[#4A4A6A] border-[#E8E8F0] hover:bg-[#F5F6FA]'}`}
            >
              <Bell size={15} />
              Unread only
            </button>
            {unreadCount > 0 && (
              <Button onClick={markAllRead}>
                <Check size={15} /> Mark all read
              </Button>
            )}
          </>
        }
      />

      {actionError && (
        <div role="alert" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#FFF1F0] border border-[#FECACA] text-[#FF675D] text-sm">
          <XCircle size={15} className="flex-shrink-0" /> {actionError}
        </div>
      )}

      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              categoryFilter === cat
                ? 'bg-[#6C63FF] text-white border-[#6C63FF]'
                : 'bg-white text-[#8080A0] border-[#F0F0F8] hover:border-[#6C63FF]/30 hover:text-[#1E1E1E]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-[#F0F0F8] flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#F0EEFF] flex items-center justify-center mb-4">
              <Bell size={22} className="text-[#6C63FF]" />
            </div>
            <p className="text-[#1E1E1E] font-semibold">No notifications</p>
            <p className="text-[#A0A0C0] text-sm mt-1">You're all caught up!</p>
          </div>
        ) : (
          filtered.map(notif => {
            const tc = typeConfig[notif.type];
            const Icon = tc.icon;
            return (
              <div
                key={notif.id}
                className={`bg-white rounded-2xl border transition-all ${!notif.read ? 'border-l-4' : 'border border-[#F0F0F8]'}`}
                style={!notif.read ? { borderLeftColor: tc.color, borderTop: `1px solid ${tc.border}`, borderRight: `1px solid ${tc.border}`, borderBottom: `1px solid ${tc.border}` } : {}}
              >
                <div className="p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: tc.bg }}>
                    <Icon size={18} style={{ color: tc.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[#1E1E1E] text-sm font-semibold">{notif.title}</span>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-[#6C63FF] flex-shrink-0" />
                          )}
                        </div>
                        <Badge size="sm" color="#6060A0" bg="#F5F5FA">{notif.category}</Badge>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-[#A0A0C0] text-xs">{notif.time}</span>
                        {!notif.read && (
                          <button
                            onClick={() => markRead(notif.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F0EEFF] text-[#8080A0] hover:text-[#6C63FF] transition-colors"
                            title="Mark as read"
                          >
                            <Check size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => dismiss(notif.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#FFF1F0] text-[#8080A0] hover:text-[#FF675D] transition-colors"
                          title="Dismiss"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                    <p className="text-[#4A4A6A] text-xs mt-2 leading-relaxed">{notif.message}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
