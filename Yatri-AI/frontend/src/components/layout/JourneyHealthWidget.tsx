import { motion, AnimatePresence } from 'framer-motion';
import { useTripStore } from '../../stores';

export default function JourneyHealthWidget() {
  const { disruption, selectedRoute } = useTripStore();
  const hasRoute = !!selectedRoute;

  if (!hasRoute) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50,
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 20px',
          background: disruption
            ? 'rgba(244,63,94,0.15)'
            : 'rgba(16,185,129,0.1)',
          border: `1px solid ${disruption ? 'rgba(244,63,94,0.4)' : 'rgba(16,185,129,0.3)'}`,
          borderRadius: 'var(--radius-pill)',
          backdropFilter: 'blur(12px)',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: disruption ? 'var(--color-disruption)' : 'var(--color-success)',
          whiteSpace: 'nowrap',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: disruption ? 'var(--color-disruption)' : 'var(--color-success)',
            animation: disruption ? 'disruption-pulse 1.5s infinite' : 'ai-pulse 2s infinite',
          }} />
          {disruption
            ? `⚠️ Disruption detected — ${disruption.delay_minutes}min delay`
            : '✓ All systems normal'
          }
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
