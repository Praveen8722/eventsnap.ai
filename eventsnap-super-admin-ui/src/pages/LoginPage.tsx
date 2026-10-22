import { useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff, Zap, Shield, Lock, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getSetupStatus, login, setupFirstAdmin } from '@/services/authService';
import type { SetupStatus } from '@/types';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong. Please try again.');
const MIN_PASSWORD_LENGTH = 12;
const inputClass = 'w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-[#4A4A6A] focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/50 transition-all';
const inputStyle = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(108,99,255,0.3)' };
const labelClass = 'block text-[#A0A0C0] text-xs font-semibold uppercase tracking-widest mb-2';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // First-time setup (no admin exists yet): create the platform owner's Super Admin account.
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const setupMode = Boolean(setupStatus?.setupRequired);

  const refreshSetupStatus = () => {
    // Not critical: if the check fails the normal sign-in form is shown.
    getSetupStatus().then(setSetupStatus, () => setSetupStatus(null));
  };

  useEffect(() => {
    document.title = 'Sign In · EventSnap.ai Admin';
    refreshSetupStatus();
  }, []);

  const handleSetup = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !password) {
      setError('Enter your name, email and a password.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords don’t match.');
      return;
    }
    if (setupStatus?.setupTokenRequired && !setupToken.trim()) {
      setError('Enter the setup code configured on the server (ADMIN_SETUP_TOKEN).');
      return;
    }
    setLoading(true);
    try {
      signIn(
        await setupFirstAdmin({
          name: name.trim(),
          email: email.trim(),
          password,
          ...(setupStatus?.setupTokenRequired ? { setupToken: setupToken.trim() } : {}),
        }),
      );
    } catch (err) {
      setError(errorMessage(err));
      refreshSetupStatus();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter your credentials.');
      return;
    }
    setLoading(true);
    try {
      signIn(await login(email, password));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#0D0B1E' }}>
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center px-16 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(108,99,255,0.3) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(255,103,93,0.2) 0%, transparent 50%)' }} />

        {/* Grid lines decoration */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(108,99,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(108,99,255,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-[#6C63FF] flex items-center justify-center shadow-lg shadow-[#6C63FF]/40">
              <Zap size={24} className="text-white" />
            </div>
            <div>
              <div className="text-white text-xl font-bold tracking-wide">EventSnap.ai</div>
              <div className="text-[#FF675D] text-xs font-semibold tracking-widest uppercase">Super Admin</div>
            </div>
          </div>

          <h2 className="text-white text-4xl font-bold leading-tight mb-4">
            Platform<br />
            <span style={{ color: '#6C63FF' }}>Control Center</span>
          </h2>
          <p className="text-[#8080A0] text-base leading-relaxed mb-10">
            Manage the entire EventSnap.ai photography platform — photographers, clients, bookings, subscriptions, and system operations from one place.
          </p>

          {/* What the panel covers (live figures are shown after sign-in) */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Live platform data', value: 'Photographers' },
              { label: 'Booking volume in ₹', value: 'Revenue' },
              { label: 'Galleries & quotas', value: 'Storage' },
              { label: 'Role-based access', value: 'Admin team' },
            ].map(stat => (
              <div key={stat.label} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-white text-xl font-bold">{stat.value}</div>
                <div className="text-[#6060A0] text-xs mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 lg:max-w-[480px] flex flex-col items-center justify-center px-8 py-12 relative">
        <div className="absolute inset-0 bg-white/3 backdrop-blur-sm lg:rounded-l-none" />

        <div className="relative z-10 w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-[#6C63FF] flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-base">EventSnap.ai</div>
              <div className="text-[#FF675D] text-[10px] font-semibold tracking-widest uppercase">Super Admin</div>
            </div>
          </div>

          {setupMode ? (
            <>
              <div className="mb-8">
                <div className="w-12 h-12 rounded-2xl bg-[#6C63FF]/20 flex items-center justify-center mb-4">
                  <UserPlus size={24} className="text-[#6C63FF]" />
                </div>
                <h1 className="text-white text-2xl font-bold mb-1">Create your Super Admin account</h1>
                <p className="text-[#6060A0] text-sm">
                  First-time setup. This is available only once, before any admin exists; afterwards admins join by invite.
                </p>
              </div>

              <form onSubmit={handleSetup} className="space-y-4">
                <div>
                  <label htmlFor="setup-name" className={labelClass}>Full Name</label>
                  <input id="setup-name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" className={inputClass} style={inputStyle} placeholder="Your name" />
                </div>
                <div>
                  <label htmlFor="setup-email" className={labelClass}>Admin Email</label>
                  <input id="setup-email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" className={inputClass} style={inputStyle} placeholder="you@yourcompany.com" />
                </div>
                <div>
                  <label htmlFor="setup-password" className={labelClass}>Password</label>
                  <div className="relative">
                    <input
                      id="setup-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete="new-password"
                      className={`${inputClass} pr-11`}
                      style={inputStyle}
                      placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6060A0] hover:text-[#A0A0C0]"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="setup-confirm" className={labelClass}>Confirm Password</label>
                  <input id="setup-confirm" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" className={inputClass} style={inputStyle} />
                </div>
                {setupStatus?.setupTokenRequired && (
                  <div>
                    <label htmlFor="setup-token" className={labelClass}>Setup Code</label>
                    <input id="setup-token" type="password" value={setupToken} onChange={e => setSetupToken(e.target.value)} autoComplete="off" className={inputClass} style={inputStyle} placeholder="ADMIN_SETUP_TOKEN from the server" />
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#FF675D]/15 border border-[#FF675D]/30" role="alert">
                    <Shield size={14} className="text-[#FF675D] flex-shrink-0" />
                    <p className="text-[#FF675D] text-xs">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: loading ? '#4A4A8A' : 'linear-gradient(135deg, #6C63FF, #8B82FF)' }}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus size={15} />
                      Create Account & Sign In
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-white text-2xl font-bold mb-1">Welcome back</h1>
                <p className="text-[#6060A0] text-sm">Sign in to your admin account</p>
                {setupStatus?.setupDisabled && (
                  <p className="text-[#F59E0B] text-xs mt-3">
                    No admin account exists yet, and first-time setup is turned off on this server. Set ADMIN_SETUP_TOKEN on the API to enable it.
                  </p>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[#A0A0C0] text-xs font-semibold uppercase tracking-widest mb-2">
                    Admin Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-[#4A4A6A] focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/50 transition-all"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(108,99,255,0.3)' }}
                    placeholder="admin@eventsnap.ai"
                  />
                </div>

                <div>
                  <label className="block text-[#A0A0C0] text-xs font-semibold uppercase tracking-widest mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-11 rounded-xl text-sm text-white placeholder:text-[#4A4A6A] focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/50 transition-all"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(108,99,255,0.3)' }}
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6060A0] hover:text-[#A0A0C0]"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#FF675D]/15 border border-[#FF675D]/30">
                    <Shield size={14} className="text-[#FF675D] flex-shrink-0" />
                    <p className="text-[#FF675D] text-xs">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: loading ? '#4A4A8A' : 'linear-gradient(135deg, #6C63FF, #8B82FF)' }}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <Lock size={15} />
                      Sign In to Admin Panel
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2 justify-center">
              <Lock size={12} className="text-[#4A4A6A]" />
              <p className="text-[#4A4A6A] text-xs">Secure admin access · EventSnap.ai Admin</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
