import { Link, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Accessibility, ChevronDown, Globe, Home, Menu, Moon, Settings, Sun, Users, X, Zap } from 'lucide-react';
import { useUIStore } from '../../stores';
import { useTranslation } from '../../i18n/useTranslation';
import { LANGUAGES } from '../../i18n/translations';
import type { Language } from '../../i18n/translations';
import toast from 'react-hot-toast';

export default function Navbar() {
  const location = useLocation();
  const { accessibilityMode, setAccessibilityMode, navOpen, setNavOpen, theme, setTheme, language, setLanguage } = useUIStore();
  const { t } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navLinks = [
    { to: '/', labelKey: 'nav.home', icon: Home },
    { to: '/plan', labelKey: 'nav.planTrip', icon: Zap },
    { to: '/group', labelKey: 'nav.groupTrip', icon: Users },
  ];

  const isActive = (path: string) => path === '/'
    ? location.pathname === '/'
    : location.pathname === path || location.pathname.startsWith(`${path}/`);

  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];
  const isHome = location.pathname === '/';

  return (
    <nav style={{
      position: isHome ? 'fixed' : 'sticky',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      background: theme === 'dark' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.3)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(128,128,128,0.15)',
      transition: 'background 0.3s ease',
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, #3B9EFF, #8B5CF6)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>Y</div>
          <div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
              Yatri
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--color-accent)' }}>
              {' '}AI
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2" style={{ display: 'flex' }}>
          {navLinks.map(({ to, labelKey, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="nav-hover-ring"
              data-active={isActive(to)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', fontSize: '0.875rem', fontWeight: isActive(to) ? 700 : 600,
                color: isActive(to) ? 'var(--color-primary)' : 'var(--text-primary)',
                background: isActive(to) ? 'rgba(59,158,255,0.15)' : 'transparent',
                textShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }}
            >
              <Icon size={15} />
              <span className="hidden-mobile">{t(labelKey)}</span>
            </Link>
          ))}

          <div style={{ width: 1, height: 24, background: 'var(--border-default)', margin: '0 4px' }} />

          <div ref={langRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setLangOpen(!langOpen)}
              aria-label="Select language"
              className="nav-hover-ring"
              data-active={langOpen}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 10px', borderRadius: 'var(--radius-md)',
                background: langOpen ? 'var(--bg-elevated)' : 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
                textShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }}
            >
              <Globe size={14} />
              <span className="hidden-mobile">{currentLang.nativeName}</span>
              <ChevronDown size={12} style={{
                transition: 'transform 200ms',
                transform: langOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }} />
            </button>

            <AnimatePresence>
              {langOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 6,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    padding: '6px 0',
                    minWidth: 180,
                    boxShadow: 'var(--shadow-card)',
                    zIndex: 200,
                    overflow: 'hidden',
                  }}
                >
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code as Language);
                        setLangOpen(false);
                        toast(`${lang.nativeName}`, { 
                          duration: 1500,
                          position: 'top-right',
                          style: {
                            padding: '8px 16px',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.875rem',
                            marginTop: '-7px',
                            marginRight: '24px',
                            fontWeight: 700
                          }
                        });
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%',
                        padding: '10px 16px',
                        border: 'none',
                        background: language === lang.code ? 'var(--bg-elevated)' : 'transparent',
                        color: language === lang.code ? 'var(--color-primary)' : 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: language === lang.code ? 700 : 400,
                        textAlign: 'left',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>{lang.flag}</span>
                      <span style={{ flex: 1 }}>{lang.nativeName}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{lang.code.toUpperCase()}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setAccessibilityMode(!accessibilityMode)}
            aria-label="Toggle accessibility mode"
            className="nav-hover-ring"
            data-active={accessibilityMode}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              background: accessibilityMode ? 'rgba(0,217,192,0.15)' : 'transparent',
              color: accessibilityMode ? 'var(--color-ai)' : 'var(--text-primary)',
              cursor: 'pointer',
              textShadow: '0 1px 3px rgba(0,0,0,0.4)',
            }}
          >
            <Accessibility size={16} strokeWidth={2.5} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }} />
          </button>

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
            className="nav-hover-ring"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              background: 'transparent', color: 'var(--text-primary)',
              cursor: 'pointer',
              textShadow: '0 1px 3px rgba(0,0,0,0.4)',
            }}
          >
            {theme === 'dark' ? (
              <Moon size={16} strokeWidth={2.5} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }} />
            ) : (
              <Sun size={16} strokeWidth={2.5} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }} />
            )}
          </button>

          <Link
            to="/preferences"
            className="nav-hover-ring"
            data-active={isActive('/preferences')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              color: isActive('/preferences') ? 'var(--color-primary)' : 'var(--text-primary)',
              background: isActive('/preferences') ? 'rgba(59,158,255,0.15)' : 'transparent',
              textDecoration: 'none',
              textShadow: '0 1px 3px rgba(0,0,0,0.4)',
            }}
            aria-label="Preferences"
          >
            <Settings size={16} strokeWidth={2.5} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }} />
          </Link>

          <button
            onClick={() => setNavOpen(!navOpen)}
            className="mobile-only"
            aria-label="Menu"
            style={{
              display: 'none', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              background: 'transparent', color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            {navOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hidden-mobile { display: none; }
          .mobile-only { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}
