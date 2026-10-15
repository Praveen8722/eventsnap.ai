import { NavLink } from 'react-router';
import { ChevronLeft, ChevronRight, LogOut, Zap } from 'lucide-react';
import { NAV_GROUPS } from '@/config/navigation';
import { useAuth } from '@/hooks/useAuth';
import { initials } from '@/utils/format';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const { logout, user } = useAuth();
  const name = user?.name ?? '';
  const userInitials = initials(name);

  return (
    <aside
      className={`fixed top-0 left-0 h-full z-40 flex flex-col transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}
      style={{ background: '#0D0B1E', borderRight: '1px solid rgba(108,99,255,0.15)' }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-[#6C63FF]/20">
        {collapsed ? (
          <div className="w-8 h-8 rounded-lg bg-[#6C63FF] flex items-center justify-center mx-auto">
            <Zap size={16} className="text-white" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#6C63FF] flex items-center justify-center flex-shrink-0">
                <Zap size={16} className="text-white" />
              </div>
              <div>
                <div className="text-white font-bold text-sm leading-tight tracking-wide">EventSnap.ai</div>
                <div className="text-[#FF675D] text-[10px] font-semibold tracking-widest uppercase">Super Admin</div>
              </div>
            </div>
            <button
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
              className="w-6 h-6 rounded-full flex items-center justify-center text-[#A0A0C0] hover:text-white hover:bg-[#6C63FF]/20 transition-all"
            >
              <ChevronLeft size={14} />
            </button>
          </>
        )}
      </div>

      {collapsed && (
        <button
          onClick={onToggleCollapse}
          aria-label="Expand sidebar"
          className="flex items-center justify-center py-2 text-[#A0A0C0] hover:text-white"
        >
          <ChevronRight size={14} />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 scrollbar-hide">
        {NAV_GROUPS.map(group => (
          <div key={group.label} className="mb-6">
            {!collapsed && (
              <div className="px-3 mb-2">
                <span className="text-[10px] font-semibold tracking-widest uppercase text-[#4A4A6A]">
                  {group.label}
                </span>
              </div>
            )}
            {group.items.map(({ path, label, icon: Icon, badge }) => (
              <NavLink
                key={path}
                to={path}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-all group relative ${
                    isActive
                      ? 'bg-[#6C63FF] text-white shadow-lg shadow-[#6C63FF]/30'
                      : 'text-[#8080A0] hover:text-white hover:bg-[#6C63FF]/15'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={18} className={`flex-shrink-0 ${isActive ? 'text-white' : ''}`} />
                    {!collapsed && (
                      <>
                        <span className="text-sm font-medium flex-1 text-left">{label}</span>
                        {badge && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-[#FF675D] text-white'}`}
                          >
                            {badge}
                          </span>
                        )}
                      </>
                    )}
                    {collapsed && badge && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#FF675D]" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#6C63FF]/20">
        {collapsed ? (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#FF675D] flex items-center justify-center text-white text-xs font-bold" title={name}>
              {userInitials}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#FF675D] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold truncate">{name}</div>
              <div className="text-[#6060A0] text-[10px] truncate">{user?.email}</div>
            </div>
            <button
              onClick={logout}
              aria-label="Sign out"
              title="Sign out"
              className="text-[#6060A0] hover:text-[#FF675D] flex-shrink-0 transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
