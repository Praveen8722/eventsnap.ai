import { useState } from 'react';
import { Edit3, Trash2, Plus, Check, X, Copy, Link2 } from 'lucide-react';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import {
  getAdminUsersData, inviteAdminUser, removeAdminUser, resendInvite, updateAdminUser,
} from '@/services/adminUserService';
import type { AdminRole, AdminUser, AdminUsersData, InvitedAdminUser, NewAdminUser } from '@/types';
import { formatDate, formatDateTime, formatMonthYear, initials } from '@/utils/format';
import { omit } from '@/utils/omit';

const EMPTY_NEW_USER: NewAdminUser = { name: '', email: '', role: 'Support Agent' };
const errorText = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

export default function AdminUsersPage() {
  const result = useAsync(getAdminUsersData);
  return <AsyncBoundary result={result}>{data => <AdminUsersView {...data} />}</AsyncBoundary>;
}

function AdminUsersView({ adminUsers: initialAdminUsers, roles }: AdminUsersData) {
  const { user: me } = useAuth();
  const [adminUsers, setAdminUsers] = useState(initialAdminUsers);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState<NewAdminUser>(EMPTY_NEW_USER);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteLink, setInviteLink] = useState<InvitedAdminUser | null>(null);
  const [listError, setListError] = useState('');

  const replaceUser = (updated: AdminUser) => {
    setAdminUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));
    setSelectedUser(current => (current?.id === updated.id ? updated : current));
  };

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
      setAdminUsers(prev => [...prev, omit(created, 'inviteUrl')]);
      closeAddModal();
      setInviteLink(created);
    } catch (error) {
      setInviteError(errorText(error, 'The invite could not be created.'));
    } finally {
      setInviting(false);
    }
  };

  const remove = async (user: AdminUser) => {
    if (!window.confirm(`Remove ${user.name} (${user.email})? They will no longer be able to sign in.`)) return;
    setListError('');
    try {
      await removeAdminUser(user.id);
      setAdminUsers(prev => prev.filter(u => u.id !== user.id));
      setSelectedUser(current => (current?.id === user.id ? null : current));
    } catch (error) {
      setListError(errorText(error, 'The admin could not be removed.'));
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

      {listError && (
        <p role="alert" className="px-4 py-3 rounded-xl bg-[#FFF1F0] border border-[#FECACA] text-[#FF675D] text-sm">{listError}</p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* User list */}
        <div className="xl:col-span-2 space-y-3">
          {adminUsers.map(user => {
            const roleConfig = roles[user.role];
            const isSelected = selectedUser?.id === user.id;
            const isMe = user.id === me?.id;
            return (
              <div
                key={user.id}
                onClick={() => setSelectedUser(isSelected ? null : user)}
                className={`bg-white rounded-2xl p-5 border cursor-pointer transition-all hover:shadow-md ${isSelected ? 'border-[#6C63FF] shadow-md shadow-[#6C63FF]/10' : 'border-[#F0F0F8]'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex-shrink-0 text-white text-sm font-bold flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${roleConfig.color}, ${roleConfig.color}99)` }}>
                    {initials(user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[#1E1E1E] text-sm font-semibold">{user.name}</span>
                      {isMe && <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#F0EEFF] text-[#6C63FF] font-semibold">You</span>}
                      {user.invitePending ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#FFFBEB] text-[#F59E0B] font-semibold">Invite pending</span>
                      ) : (
                        user.status === 'inactive' && <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#F5F5FA] text-[#8080A0] font-semibold">Inactive</span>
                      )}
                    </div>
                    <div className="text-[#8080A0] text-xs">{user.email}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge color={roleConfig.color} bg={roleConfig.bg}>
                      {user.role}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <button
                        aria-label={`Edit ${user.name}`}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F0EEFF] text-[#8080A0] hover:text-[#6C63FF]"
                        onClick={e => { e.stopPropagation(); setSelectedUser(user); }}
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        aria-label={`Remove ${user.name}`}
                        disabled={isMe}
                        title={isMe ? 'You cannot remove your own account' : undefined}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#FFF1F0] text-[#8080A0] hover:text-[#FF675D] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#8080A0]"
                        onClick={e => { e.stopPropagation(); remove(user); }}
                      >
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
          {selectedUser && (
            <UserDetails
              key={selectedUser.id}
              user={selectedUser}
              roles={roles}
              isMe={selectedUser.id === me?.id}
              onClose={() => setSelectedUser(null)}
              onUpdated={replaceUser}
              onInviteLink={setInviteLink}
            />
          )}

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
              <button onClick={closeAddModal} aria-label="Close" className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#F5F6FA] text-[#8080A0]">
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
                  onChange={e => setNewUser(prev => ({ ...prev, role: e.target.value as AdminRole }))}
                  className="w-full px-4 py-2.5 bg-[#F9F9FC] border border-[#E8E8F0] rounded-xl text-sm text-[#1E1E1E] focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/30"
                >
                  {Object.keys(roles).map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <p className="text-[#8080A0] text-xs">You&apos;ll get a one-time link (valid 72 hours) to send them. They set their own password.</p>
            </div>
            {inviteError && (
              <p role="alert" className="mt-4 px-4 py-2.5 rounded-xl bg-[#FFF1F0] border border-[#FECACA] text-[#FF675D] text-xs">{inviteError}</p>
            )}
            <div className="flex items-center gap-3 mt-6">
              <button onClick={closeAddModal} className="flex-1 py-2.5 border border-[#E8E8F0] rounded-xl text-sm text-[#4A4A6A] font-medium hover:bg-[#F5F6FA]">
                Cancel
              </button>
              <button onClick={sendInvite} disabled={inviting} className="flex-1 py-2.5 bg-[#6C63FF] text-white rounded-xl text-sm font-semibold hover:bg-[#5B52EE] disabled:opacity-60">
                {inviting ? 'Creating…' : 'Create Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {inviteLink && <InviteLinkModal invite={inviteLink} onClose={() => setInviteLink(null)} />}
    </div>
  );
}

function UserDetails({ user, roles, isMe, onClose, onUpdated, onInviteLink }: {
  user: AdminUser;
  roles: AdminUsersData['roles'];
  isMe: boolean;
  onClose: () => void;
  onUpdated: (user: AdminUser) => void;
  onInviteLink: (invite: InvitedAdminUser) => void;
}) {
  const [role, setRole] = useState<AdminRole>(user.role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const dirty = role !== user.role;

  const run = async (action: () => Promise<void>, done = '') => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(done);
    } catch (err) {
      setError(errorText(err, 'The change could not be saved.'));
    } finally {
      setBusy(false);
    }
  };

  const save = () => run(async () => onUpdated(await updateAdminUser(user.id, { role })), 'Saved.');
  const toggleStatus = () =>
    run(async () => onUpdated(await updateAdminUser(user.id, { status: user.status === 'active' ? 'inactive' : 'active' })));
  const reinvite = () =>
    run(async () => {
      const invite = await resendInvite(user.id);
      onUpdated(omit(invite, 'inviteUrl'));
      onInviteLink(invite);
    });

  return (
    <div className="bg-white rounded-2xl border border-[#6C63FF] shadow-md shadow-[#6C63FF]/10 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[#1E1E1E] font-semibold">User Details</h3>
        <button onClick={onClose} aria-label="Close" className="text-[#A0A0C0] hover:text-[#1E1E1E]"><X size={15} /></button>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full text-white text-base font-bold flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${roles[user.role].color}, ${roles[user.role].color}99)` }}>
          {initials(user.name)}
        </div>
        <div>
          <div className="text-[#1E1E1E] font-semibold">{user.name}</div>
          <div className="text-[#8080A0] text-xs">{user.email}</div>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-[#6060A0] text-[11px] font-semibold uppercase tracking-wider mb-1.5">Role</label>
          <select
            value={role}
            disabled={isMe || busy}
            onChange={e => setRole(e.target.value as AdminRole)}
            className="w-full px-3 py-2 bg-[#F9F9FC] border border-[#E8E8F0] rounded-xl text-sm text-[#1E1E1E] focus:outline-none disabled:opacity-60"
          >
            {Object.keys(roles).map(r => (
              <option key={r}>{r}</option>
            ))}
          </select>
          {isMe && <p className="text-[#A0A0C0] text-[10px] mt-1">You can&apos;t change your own role.</p>}
        </div>
        {user.inviteExpiresAt && (
          <p className="text-[#8080A0] text-xs">Invite link expires {formatDateTime(user.inviteExpiresAt)}.</p>
        )}
      </div>

      {error && <p role="alert" className="mb-3 text-[#FF675D] text-xs">{error}</p>}
      {notice && <p className="mb-3 text-[#10B981] text-xs">{notice}</p>}

      <button
        onClick={save}
        disabled={!dirty || busy}
        className="w-full py-2 bg-[#6C63FF] text-white rounded-xl text-sm font-semibold hover:bg-[#5B52EE] transition-colors disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Save Changes'}
      </button>
      <div className="grid grid-cols-1 gap-2 mt-2">
        {user.invitePending ? (
          <button onClick={reinvite} disabled={busy} className="py-2 border border-[#E8E8F0] rounded-xl text-xs text-[#4A4A6A] font-semibold hover:bg-[#F5F6FA] disabled:opacity-50">
            New invite link
          </button>
        ) : (
          <button
            onClick={toggleStatus}
            disabled={busy || isMe}
            className={`py-2 border rounded-xl text-xs font-semibold disabled:opacity-50 ${user.status === 'active' ? 'border-[#FFD8D6] text-[#FF675D] hover:bg-[#FFF1F0]' : 'border-[#D1FAE5] text-[#10B981] hover:bg-[#ECFDF5]'}`}
          >
            {user.status === 'active' ? 'Deactivate' : 'Activate'}
          </button>
        )}
      </div>
    </div>
  );
}

function InviteLinkModal({ invite, onClose }: { invite: InvitedAdminUser; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => navigator.clipboard?.writeText(invite.inviteUrl).then(() => setCopied(true), () => {});
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6" role="dialog" aria-label="Invite link">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[#1E1E1E] font-bold text-lg flex items-center gap-2"><Link2 size={18} className="text-[#6C63FF]" /> Invite link for {invite.name}</h2>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#F5F6FA] text-[#8080A0]">
            <X size={16} />
          </button>
        </div>
        <p className="text-[#4A4A6A] text-sm mb-3">
          Send this link to {invite.email} privately. It works once and expires {formatDateTime(invite.inviteExpiresAt)}. It won&apos;t be shown again; you can create a new one from their details.
        </p>
        <div className="flex items-center gap-2 p-3 bg-[#F9F9FC] border border-[#E8E8F0] rounded-xl">
          <code className="flex-1 text-xs text-[#1E1E1E] break-all">{invite.inviteUrl}</code>
          <button onClick={copy} aria-label="Copy invite link" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F0EEFF] text-[#6C63FF] flex-shrink-0">
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
        </div>
        <button onClick={onClose} className="w-full mt-5 py-2.5 bg-[#6C63FF] text-white rounded-xl text-sm font-semibold hover:bg-[#5B52EE]">Done</button>
      </div>
    </div>
  );
}
