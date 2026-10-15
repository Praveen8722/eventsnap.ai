import { useState } from 'react';
import { ShieldCheck, Edit3, Trash2, Plus, Check, X } from 'lucide-react';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAsync } from '@/hooks/useAsync';
import { getAdminUsersData, inviteAdminUser } from '@/services/adminUserService';
import type { AdminUser, AdminUsersData, NewAdminUser } from '@/types';
import { formatDate, formatMonthYear } from '@/utils/format';

const EMPTY_NEW_USER: NewAdminUser = { name: '', email: '', role: 'Support Agent' };

export default function AdminUsersPage() {
  const result = useAsync(getAdminUsersData);
  return <AsyncBoundary result={result}>{data => <AdminUsersView {...data} />}</AsyncBoundary>;
}

function AdminUsersView({ adminUsers: initialAdminUsers, roles }: AdminUsersData) {
  const [adminUsers, setAdminUsers] = useState(initialAdminUsers);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState<NewAdminUser>(EMPTY_NEW_USER);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const closeAddModal = () => {
    setShowAddModal(false);
    setNewUser(EMPTY_NEW_USER);
    setInviteError('');
  };

  const sendInvite = async () => {
    if (!newUser.name.trim() || !newUser.email.trim()) {
      setInviteError('Enter a name and email address.');
      return;
    }
    setInviting(true);
    setInviteError('');
    try {
      const created = await inviteAdminUser({ ...newUser, name: newUser.name.trim(), email: newUser.email.trim() });
      setAdminUsers(prev => [...prev, created]);
      closeAddModal();
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'The invite could not be sent.');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Users & Roles"
        description={<>{adminUsers.filter(u => u.status === 'active').length} active administrators managing the platform</>}
        actions={
          <Button variant="primary" onClick={() => setShowAddModal(true)}>
            <Plus size={15} /> Add Admin User
          </Button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* User list */}
        <div className="xl:col-span-2 space-y-3">
          {adminUsers.map(user => {
            const roleConfig = roles[user.role];
            const isSelected = selectedUser?.id === user.id;
            return (
              <div
                key={user.id}
                onClick={() => setSelectedUser(isSelected ? null : user)}
                className={`bg-white rounded-2xl p-5 border cursor-pointer transition-all hover:shadow-md ${isSelected ? 'border-[#6C63FF] shadow-md shadow-[#6C63FF]/10' : 'border-[#F0F0F8]'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex-shrink-0 text-white text-sm font-bold flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${roleConfig.color}, ${roleConfig.color}99)` }}>
                    {user.name.split(' ').map(w => w[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[#1E1E1E] text-sm font-semibold">{user.name}</span>
                      {user.status === 'inactive' && <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#F5F5FA] text-[#8080A0] font-semibold">Inactive</span>}
                    </div>
                    <div className="text-[#8080A0] text-xs">{user.email}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge color={roleConfig.color} bg={roleConfig.bg}>
                      {user.role}
                    </Badge>
                    {user.twoFA ? (
                      <div className="flex items-center gap-1 text-[#10B981]" title="2FA enabled">
                        <ShieldCheck size={14} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[#C0C0D0]" title="2FA not enabled">
                        <ShieldCheck size={14} />
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F0EEFF] text-[#8080A0] hover:text-[#6C63FF]" onClick={e => { e.stopPropagation(); setSelectedUser(user); }}>
                        <Edit3 size={13} />
                      </button>
                      <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#FFF1F0] text-[#8080A0] hover:text-[#FF675D]" onClick={e => e.stopPropagation()}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-[#A0A0C0]">
                  <span>Last login: {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}</span>
                  <span>·</span>
                  <span>Joined: {formatMonthYear(user.joined)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Role permissions & user detail */}
        <div className="space-y-4">
          {selectedUser ? (
            <div className="bg-white rounded-2xl border border-[#6C63FF] shadow-md shadow-[#6C63FF]/10 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[#1E1E1E] font-semibold">User Details</h3>
                <button onClick={() => setSelectedUser(null)} className="text-[#A0A0C0] hover:text-[#1E1E1E]"><X size={15} /></button>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full text-white text-base font-bold flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${roles[selectedUser.role].color}, ${roles[selectedUser.role].color}99)` }}>
                  {selectedUser.name.split(' ').map(w => w[0]).join('')}
                </div>
                <div>
                  <div className="text-[#1E1E1E] font-semibold">{selectedUser.name}</div>
                  <div className="text-[#8080A0] text-xs">{selectedUser.email}</div>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-[#6060A0] text-[11px] font-semibold uppercase tracking-wider mb-1.5">Role</label>
                  <select defaultValue={selectedUser.role} className="w-full px-3 py-2 bg-[#F9F9FC] border border-[#E8E8F0] rounded-xl text-sm text-[#1E1E1E] focus:outline-none">
                    {Object.keys(roles).map(r => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-[#1E1E1E] text-sm font-medium">Two-Factor Auth</div>
                    <div className="text-[#8080A0] text-xs">{selectedUser.twoFA ? 'Enabled' : 'Not enabled'}</div>
                  </div>
                  <div className={`w-10 h-5 rounded-full ${selectedUser.twoFA ? 'bg-[#6C63FF]' : 'bg-[#D0D0E0]'} relative cursor-pointer`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${selectedUser.twoFA ? 'left-5' : 'left-0.5'}`} />
                  </div>
                </div>
              </div>

              <button className="w-full py-2 bg-[#6C63FF] text-white rounded-xl text-sm font-semibold hover:bg-[#5B52EE] transition-colors">
                Save Changes
              </button>
            </div>
          ) : null}

          {/* Role permission matrix */}
          <div className="bg-white rounded-2xl border border-[#F0F0F8] p-5">
            <h3 className="text-[#1E1E1E] font-semibold mb-4">Role Permissions</h3>
            <div className="space-y-4">
              {Object.entries(roles).map(([roleName, config]) => (
                <div key={roleName}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge color={config.color} bg={config.bg}>
                      {roleName}
                    </Badge>
                    <span className="text-[#A0A0C0] text-xs">{adminUsers.filter(u => u.role === roleName).length} user{adminUsers.filter(u => u.role === roleName).length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="space-y-1 pl-2">
                    {config.permissions.slice(0, 3).map(p => (
                      <div key={p} className="flex items-center gap-1.5 text-[#6060A0] text-xs">
                        <Check size={11} style={{ color: config.color }} />
                        {p}
                      </div>
                    ))}
                    {config.permissions.length > 3 && (
                      <div className="text-[#A0A0C0] text-[10px] pl-5">+{config.permissions.length - 3} more permissions</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[#1E1E1E] font-bold text-lg">Add Admin User</h2>
              <button onClick={closeAddModal} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#F5F6FA] text-[#8080A0]">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Full Name', key: 'name', placeholder: 'Jane Smith' },
                { label: 'Email Address', key: 'email', placeholder: 'jane@eventsnap.ai' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-[#4A4A6A] text-xs font-semibold uppercase tracking-wider mb-1.5">{field.label}</label>
                  <input
                    value={newUser[field.key as 'name' | 'email']}
                    onChange={e => setNewUser(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-2.5 bg-[#F9F9FC] border border-[#E8E8F0] rounded-xl text-sm text-[#1E1E1E] focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/30"
                  />
                </div>
              ))}
              <div>
                <label className="block text-[#4A4A6A] text-xs font-semibold uppercase tracking-wider mb-1.5">Role</label>
                <select
                  value={newUser.role}
                  onChange={e => setNewUser(prev => ({ ...prev, role: e.target.value as AdminUser['role'] }))}
                  className="w-full px-4 py-2.5 bg-[#F9F9FC] border border-[#E8E8F0] rounded-xl text-sm text-[#1E1E1E] focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/30"
                >
                  {Object.keys(roles).map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
            {inviteError && (
              <p role="alert" className="mt-4 px-4 py-2.5 rounded-xl bg-[#FFF1F0] border border-[#FECACA] text-[#FF675D] text-xs">{inviteError}</p>
            )}
            <div className="flex items-center gap-3 mt-6">
              <button onClick={closeAddModal} className="flex-1 py-2.5 border border-[#E8E8F0] rounded-xl text-sm text-[#4A4A6A] font-medium hover:bg-[#F5F6FA]">
                Cancel
              </button>
              <button onClick={sendInvite} disabled={inviting} className="flex-1 py-2.5 bg-[#6C63FF] text-white rounded-xl text-sm font-semibold hover:bg-[#5B52EE] disabled:opacity-60">
                {inviting ? 'Sending…' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
