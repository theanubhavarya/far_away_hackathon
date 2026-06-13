import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { useTripStore } from '../stores';
import { TRANSPORT_ICONS, formatDuration, formatCurrency, TAG_LABELS } from '../types';
import toast from 'react-hot-toast';

export default function DisruptionPage() {
  const navigate = useNavigate();
  const { disruption, setSelectedRoute, setDisruption } = useTripStore();
  const [accepted, setAccepted] = useState(false);

  if (!disruption) { navigate('/plan'); return null; }

  const handleAccept = (route: any) => {
    setSelectedRoute(route);
    setDisruption(null);
    setAccepted(true);
    toast.success('New plan accepted! Journey updated.', { duration: 3000 });
    setTimeout(() => navigate(`/plan/results/${route.route_id}`), 1500);
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', padding: '24px', maxWidth: 760, margin: '0 auto' }}>
      {/* Alert Banner */}
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="disruption-banner"
        style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}
      >
        <AlertTriangle size={20} style={{ flexShrink: 0, animation: 'disruption-pulse 1.5s infinite' }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
            ⚠️ Alert: Your {disruption.affected_train} is delayed by {disruption.delay_minutes} minutes
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: 2 }}>
            Reason: {disruption.reason}
          </div>
        </div>
      </motion.div>

      {/* AI Replanning Badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24,
          padding: '12px 16px',
          background: 'rgba(0,217,192,0.08)',
          border: '1px solid rgba(0,217,192,0.25)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-ai)', animation: 'ai-pulse 1.5s infinite' }} />
        <span style={{ fontSize: '0.85rem', color: 'var(--color-ai)' }}>
          Disruption Agent activated — Found {disruption.alternative_routes.length} alternative routes
        </span>
      </motion.div>

      {/* Downstream Effects */}
      {disruption.cascade_effects.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card"
          style={{ marginBottom: 24 }}
        >
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', marginBottom: 12, color: 'var(--color-warning)' }}>
            Cascading Effects
          </h3>
          {disruption.cascade_effects.map((effect, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{effect.description}</span>
              {effect.cost_delta > 0 && (
                <span style={{ color: 'var(--color-disruption)', fontFamily: 'var(--font-mono)' }}>+{formatCurrency(effect.cost_delta)}</span>
              )}
            </div>
          ))}
        </motion.div>
      )}

      {/* Alternative Routes */}
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: 16 }}>
        Alternative Routes
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
        {disruption.alternative_routes.map((route, i) => {
          const mainTag = route.tags[0];
          const tagInfo = mainTag ? TAG_LABELS[mainTag] : null;
          return (
            <motion.div
              key={route.route_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="glass-card"
              style={{ border: i === 0 ? '1px solid rgba(59,158,255,0.3)' : undefined }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                    {route.segments.map((seg, si) => (
                      <span key={si} style={{ fontSize: '1rem' }}>{TRANSPORT_ICONS[seg.mode]}</span>
                    ))}
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600 }}>
                    {formatDuration(route.total_time_minutes)}
                  </div>
                  <div style={{ color: 'var(--color-accent)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {formatCurrency(route.fare_per_person || route.total_cost_inr)} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>per traveller</span>
                  </div>
                  {route.travellers && route.travellers > 1 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: 2 }}>
                      Total for {route.travellers} travellers: {formatCurrency(route.total_fare || (route.total_cost_inr * route.travellers))}
                    </div>
                  )}
                  {tagInfo && (
                    <span style={{
                      display: 'inline-block', marginTop: 6,
                      padding: '2px 8px', borderRadius: 'var(--radius-pill)',
                      fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                      background: `${tagInfo.color}15`, color: tagInfo.color,
                      border: `1px solid ${tagInfo.color}30`,
                    }}>{tagInfo.label}</span>
                  )}
                </div>
                <motion.button
                  onClick={() => handleAccept(route)}
                  whileHover={{ scale: 1.03 }}
                  className="btn btn-primary"
                  style={{ whiteSpace: 'nowrap' }}
                  id={`accept-route-${i}`}
                >
                  {i === 0 ? 'Accept Plan' : 'Choose This'} <ArrowRight size={14} />
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* WhatsApp notification simulation */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8 }}
        style={{
          padding: '14px 18px',
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}
      >
        <div style={{ fontSize: '1.4rem' }}>💬</div>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-success)', marginBottom: 4 }}>
            WhatsApp Notification (Simulated)
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            "Yatri AI: Your journey has been replanned. New arrival: 18:15 CSMT. Tap to view updated itinerary."
          </div>
        </div>
      </motion.div>

      {accepted && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop: 20, padding: '16px', textAlign: 'center',
            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <CheckCircle size={24} color="var(--color-success)" style={{ margin: '0 auto 8px' }} />
          <div style={{ color: 'var(--color-success)', fontWeight: 600 }}>New plan accepted! Redirecting...</div>
        </motion.div>
      )}
    </div>
  );
}
