import { useEffect, useRef, useState } from 'react';
import {
  Globe, Mail, Shield, CreditCard, Server, Zap, Save, ChevronRight, AlertTriangle,
} from 'lucide-react';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { getPlatformSettings, updatePlatformSettings } from '@/services/settingsService';
import { getSystemStatus, type SystemStatus } from '@/services/systemService';
import type { PlatformSettingsData, ToggleSetting } from '@/types';

const settingsGroups = [
  { id: 'general', label: 'General', icon: Globe },
  { id: 'email', label: 'Email & Notifications', icon: Mail },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'billing', label: 'Billing & Payments', icon: CreditCard },
  { id: 'infrastructure', label: 'Infrastructure', icon: Server },
  { id: 'integrations', label: 'Integrations & API', icon: Zap },
];

export default function SettingsPage() {
  const result = useAsync(getPlatformSettings);
  return <AsyncBoundary result={result}>{data => <SettingsView {...data} />}</AsyncBoundary>;
}

const toggleValues = (toggleSettings: Record<string, ToggleSetting[]>) =>
  Object.fromEntries(Object.values(toggleSettings).flat().map(s => [s.key, s.value]));

function SettingsView({ generalSettings, toggleSettings }: PlatformSettingsData) {
  const [activeGroup, setActiveGroup] = useState('general');
  const [toggles, setToggles] = useState<Record<string, boolean>>(() => toggleValues(toggleSettings));
  const { can } = useAuth();
  const canEdit = can('settingsEdit');
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null | 'error'>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [formValues, setFormValues] = useState(generalSettings);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(savedTimer.current), []);

  useEffect(() => {
    if (activeGroup !== 'infrastructure') return;
    let active = true;
    getSystemStatus().then(
      status => active && setSystemStatus(status),
      () => active && setSystemStatus('error'),
    );
    return () => {
      active = false;
    };
  }, [activeGroup]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const updated = await updatePlatformSettings({ generalSettings: formValues, toggles });
      setFormValues(updated.generalSettings);
      setToggles(toggleValues(updated.toggleSettings));
      setSaved(true);
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Settings could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const currentToggles = toggleSettings[activeGroup] || [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Platform Settings"
        description={canEdit ? 'Configure global platform behavior and integrations' : 'View-only: only Super Admins can change settings'}
        actions={
          canEdit && <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md disabled:opacity-60 ${
              saved ? 'bg-[#10B981] text-white shadow-[#10B981]/30' : 'bg-[#6C63FF] text-white hover:bg-[#5B52EE] shadow-[#6C63FF]/30'
            }`}
          >
            <Save size={15} />
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        }
      />

      {saveError && (
        <div role="alert" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#FFF1F0] border border-[#FECACA] text-[#FF675D] text-sm">
          <AlertTriangle size={15} className="flex-shrink-0" /> {saveError}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Sidebar nav */}
        <div className="bg-white rounded-2xl border border-[#F0F0F8] p-3 h-fit">
          {settingsGroups.map(group => {
            const Icon = group.icon;
            const active = activeGroup === group.id;
            return (
              <button
                key={group.id}
                onClick={() => setActiveGroup(group.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl mb-0.5 transition-all ${active ? 'bg-[#6C63FF] text-white' : 'text-[#4A4A6A] hover:bg-[#F5F6FA]'}`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={16} />
                  <span className="text-sm font-medium">{group.label}</span>
                </div>
                <ChevronRight size={14} className={active ? 'text-white/70' : 'text-[#C0C0D0]'} />
              </button>
            );
          })}
        </div>

        {/* Settings panel */}
        <div className="xl:col-span-3 space-y-5">
          {/* Text input settings (general only) */}
          {activeGroup === 'general' && (
            <div className="bg-white rounded-2xl border border-[#F0F0F8] p-6">
              <h2 className="text-[#1E1E1E] font-semibold mb-5">General Configuration</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Platform Name', key: 'platformName', placeholder: 'EventSnap.ai' },
                  { label: 'Platform URL', key: 'platformUrl', placeholder: 'https://eventsnap.ai' },
                  { label: 'Support Email', key: 'supportEmail', placeholder: 'support@eventsnap.ai' },
                  { label: 'Admin Email', key: 'adminEmail', placeholder: 'admin@eventsnap.ai' },
                  { label: 'Max File Size (MB)', key: 'maxFileSize', placeholder: '100' },
                  { label: 'Default Timezone', key: 'defaultTimezone', placeholder: 'Asia/Kolkata' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-[#4A4A6A] text-xs font-semibold uppercase tracking-wider mb-1.5">{field.label}</label>
                    <input
                      readOnly={!canEdit}
                      value={formValues[field.key as keyof typeof formValues]}
                      onChange={e => setFormValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full px-4 py-2.5 bg-[#F9F9FC] border border-[#E8E8F0] rounded-xl text-sm text-[#1E1E1E] focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/30 focus:border-[#6C63FF]"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Integration-specific settings */}
          {activeGroup === 'integrations' && (
            <div className="bg-white rounded-2xl border border-[#F0F0F8] p-6">
              <h2 className="text-[#1E1E1E] font-semibold mb-2">API Keys & Credentials</h2>
              <p className="text-[#8080A0] text-sm">
                Credentials (storage, email, payments) are set as environment variables on the servers that use them. They are never stored in or shown by the admin panel.
              </p>
            </div>
          )}

          {/* Toggle settings */}
          {currentToggles.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#F0F0F8] p-6">
              <h2 className="text-[#1E1E1E] font-semibold mb-5 capitalize">{settingsGroups.find(g => g.id === activeGroup)?.label} Settings</h2>
              <div className="space-y-1 divide-y divide-[#F5F5FA]">
                {currentToggles.map(setting => (
                  <div key={setting.key} className="flex items-center justify-between py-4">
                    <div className="flex-1 pr-6">
                      <div className="text-[#1E1E1E] text-sm font-semibold">{setting.label}</div>
                      <div className="text-[#8080A0] text-xs mt-0.5">{setting.description}</div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={toggles[setting.key]}
                      aria-label={setting.label}
                      disabled={!canEdit}
                      onClick={() => setToggles(prev => ({ ...prev, [setting.key]: !prev[setting.key] }))}
                      className="relative flex-shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <div className={`w-11 h-6 rounded-full transition-colors ${toggles[setting.key] ? 'bg-[#6C63FF]' : 'bg-[#D0D0E0]'}`}>
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${toggles[setting.key] ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Infrastructure status (only for infrastructure) */}
          {activeGroup === 'infrastructure' && (
            <div className="bg-white rounded-2xl border border-[#F0F0F8] p-6">
              <h2 className="text-[#1E1E1E] font-semibold mb-5">System Status</h2>
              <div className="space-y-3">
                {(systemStatus === null
                  ? [{ service: 'Checking…', ok: true, detail: '' }]
                  : systemStatus === 'error'
                    ? [{ service: 'Admin API', ok: false, detail: 'Unreachable' }]
                    : [
                        { service: 'Admin API', ok: true, detail: 'Operational' },
                        { service: 'Admin database', ok: true, detail: 'Connected' },
                        {
                          service: 'EventSnap platform database (read-only)',
                          ok: systemStatus.platformDatabase === 'connected',
                          detail: systemStatus.platformDatabase === 'connected' ? 'Connected' : 'Not configured (PLATFORM_MONGO_URL)',
                        },
                      ]
                ).map(s => (
                  <div key={s.service} className="flex items-center justify-between px-4 py-3 bg-[#F9F9FC] rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${s.ok ? 'bg-[#10B981]' : 'bg-[#FF675D]'}`} />
                      <span className="text-[#1E1E1E] text-sm font-medium">{s.service}</span>
                    </div>
                    <span className={`text-xs font-semibold ${s.ok ? 'text-[#10B981]' : 'text-[#FF675D]'}`}>{s.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
