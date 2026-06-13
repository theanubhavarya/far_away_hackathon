import { motion } from 'framer-motion';
import { useUIStore } from '../stores';
import { TRAVEL_MODE_OPTIONS } from '../types';
import { useTranslation } from '../i18n/useTranslation';
import { LANGUAGES } from '../i18n/translations';
import toast from 'react-hot-toast';

function ToggleSwitch({ value, onChange, id }: { value: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: value ? 'var(--color-primary)' : 'var(--border-hover)',
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff',
        position: 'absolute', top: 3,
        left: value ? 23 : 3,
        transition: 'left 0.2s',
      }} />
    </button>
  );
}

export default function PreferencesPage() {
  const {
    accessibilityMode, setAccessibilityMode,
    carbonConscious, setCarbonConscious,
    defaultTravelMode, setDefaultTravelMode,
    language, setLanguage,
  } = useUIStore();
  const { t } = useTranslation();

  const handleSave = () => {
    toast.success('Preferences saved!');
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', padding: '32px 24px', maxWidth: 600, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 8 }}>{t('pref.title')}</h1>
        <p style={{ color: 'var(--text-muted)' }}>{t('pref.subtitle')}</p>
      </motion.div>

      {/* Default Travel Mode */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: 16 }}>{t('pref.defaultMode')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {TRAVEL_MODE_OPTIONS.slice(0, 6).map((mode) => (
            <button
              key={mode.id}
              onClick={() => setDefaultTravelMode(mode.id)}
              id={`pref-mode-${mode.id.toLowerCase()}`}
              aria-pressed={defaultTravelMode === mode.id}
              style={{
                padding: '10px 12px', borderRadius: 'var(--radius-md)', textAlign: 'left',
                background: defaultTravelMode === mode.id ? 'rgba(59,158,255,0.1)' : 'var(--bg-surface)',
                border: `1px solid ${defaultTravelMode === mode.id ? 'var(--color-primary)' : 'var(--border-default)'}`,
                cursor: 'pointer', transition: 'all var(--transition-fast)',
              }}
            >
              <div style={{ fontSize: '1.1rem', marginBottom: 2 }}>{mode.icon}</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: defaultTravelMode === mode.id ? 'var(--color-primary)' : 'var(--text-primary)' }}>
                {mode.label}
              </div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Toggles */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="glass-card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: 20 }}>{t('pref.travelPreferences')}</h3>
        {[
          { label: t('pref.accessibility'), desc: t('pref.accessibilityDesc'), value: accessibilityMode, onChange: setAccessibilityMode, id: 'pref-accessibility' },
          { label: t('pref.carbon'), desc: t('pref.carbonDesc'), value: carbonConscious, onChange: setCarbonConscious, id: 'pref-carbon' },
        ].map(({ label, desc, value, onChange, id }) => (
          <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div style={{ flex: 1, marginRight: 16 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{desc}</div>
            </div>
            <ToggleSwitch value={value} onChange={onChange} id={id} />
          </div>
        ))}
      </motion.div>

      {/* Language */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="glass-card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: 16 }}>{t('common.language')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {LANGUAGES.map(({ code, nativeName, flag }) => (
            <button
              key={code}
              onClick={() => setLanguage(code)}
              id={`lang-${code}`}
              aria-pressed={language === code}
              style={{
                padding: '10px 16px', borderRadius: 'var(--radius-md)',
                background: language === code ? 'rgba(59,158,255,0.1)' : 'var(--bg-surface)',
                border: `1px solid ${language === code ? 'var(--color-primary)' : 'var(--border-default)'}`,
                color: language === code ? 'var(--color-primary)' : 'var(--text-secondary)',
                fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                textAlign: 'left',
              }}
            >
              {flag} {nativeName}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.button
        onClick={handleSave}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="btn btn-primary btn-lg btn-full"
        id="save-preferences-btn"
      >
        {t('pref.save')}
      </motion.button>
    </div>
  );
}
