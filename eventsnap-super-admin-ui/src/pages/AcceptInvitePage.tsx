import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CheckCircle, Eye, EyeOff, Lock, Shield, Zap } from 'lucide-react';
import { ROUTES } from '@/config/routes';
import { acceptInvite, getInvite } from '@/services/authService';
import type { InviteInfo } from '@/types';

const MIN_PASSWORD_LENGTH = 12;
const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong. Please try again.');
const inputStyle = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(108,99,255,0.3)' };

/** Where an invited admin sets their password (link from the invite: /accept-invite?token=…). */
export default function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.title = 'Accept Invite · EventSnap.ai Admin';
    let active = true;
    if (!token) {
      setLoadError('This invite link is incomplete. Open the full link you were sent.');
      return;
    }
    getInvite(token).then(
      info => active && setInvite(info),
      err => active && setLoadError(errorMessage(err)),
    );
    return () => {
      active = false;
    };
  }, [token]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('The passwords don’t match.');
      return;
    }
    setSaving(true);
    try {
      await acceptInvite(token, password);
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ background: '#0D0B1E' }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-[#6C63FF] flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-base">EventSnap.ai</div>
            <div className="text-[#FF675D] text-[10px] font-semibold tracking-widest uppercase">Super Admin</div>
          </div>
        </div>

        {done ? (
          <div className="space-y-4">
            <CheckCircle size={32} className="text-[#10B981]" />
            <h1 className="text-white text-2xl font-bold">You’re all set</h1>
            <p className="text-[#8080A0] text-sm">
              Your password is saved. Sign in with {invite?.email} and your new password.
            </p>
            <Link to={ROUTES.login} className="block w-full py-3 rounded-xl text-white font-semibold text-sm text-center" style={{ background: 'linear-gradient(135deg, #6C63FF, #8B82FF)' }}>
              Go to sign in
            </Link>
          </div>
        ) : loadError ? (
          <div className="space-y-4" role="alert">
            <h1 className="text-white text-2xl font-bold">Invite not valid</h1>
            <p className="text-[#FF675D] text-sm">{loadError}</p>
            <Link to={ROUTES.login} className="text-[#8B82FF] text-sm hover:underline">Back to sign in</Link>
          </div>
        ) : !invite ? (
          <div className="flex justify-center py-12" role="status" aria-label="Checking invite">
            <div className="w-8 h-8 rounded-full border-2 border-[#6C63FF]/20 border-t-[#6C63FF] animate-spin" />
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-white text-2xl font-bold mb-1">Welcome, {invite.name}</h1>
              <p className="text-[#6060A0] text-sm">
                You’ve been invited as <span className="text-[#A0A0C0] font-semibold">{invite.role}</span>. Choose a password for {invite.email}.
              </p>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label htmlFor="new-password" className="block text-[#A0A0C0] text-xs font-semibold uppercase tracking-widest mb-2">New password</label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full px-4 py-3 pr-11 rounded-xl text-sm text-white placeholder:text-[#4A4A6A] focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/50"
                    style={inputStyle}
                    placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                  />
                  <button type="button" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6060A0] hover:text-[#A0A0C0]">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirm-password" className="block text-[#A0A0C0] text-xs font-semibold uppercase tracking-widest mb-2">Confirm password</label>
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/50"
                  style={inputStyle}
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#FF675D]/15 border border-[#FF675D]/30" role="alert">
                  <Shield size={14} className="text-[#FF675D] flex-shrink-0" />
                  <p className="text-[#FF675D] text-xs">{error}</p>
                </div>
              )}
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #6C63FF, #8B82FF)' }}
              >
                <Lock size={15} /> {saving ? 'Saving…' : 'Set password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
