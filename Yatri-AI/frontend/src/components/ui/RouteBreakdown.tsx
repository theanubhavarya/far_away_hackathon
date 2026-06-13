import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Route } from 'lucide-react';
import type { RouteOption } from '../../types';
import { TRANSPORT_COLORS, TRANSPORT_ICONS, formatDuration, formatCurrency } from '../../types';

interface RouteBreakdownProps {
  route: RouteOption;
}

export default function RouteBreakdown({ route }: RouteBreakdownProps) {
  const [expanded, setExpanded] = useState(false);
  const { segments } = route;

  if (!segments || segments.length === 0) return null;

  return (
    <div style={{ marginTop: 6 }}>
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontSize: '0.73rem', fontWeight: 600,
          color: 'var(--color-primary)',
          padding: '4px 0',
          transition: 'all var(--transition-fast)',
        }}
        aria-expanded={expanded}
        aria-label="View route breakdown"
      >
        <Route size={12} />
        Route Breakdown
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              marginTop: 8, padding: '14px 16px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
            }}>
              {segments.map((seg, i) => {
                const color = TRANSPORT_COLORS[seg.mode] || '#3B9EFF';
                const icon = TRANSPORT_ICONS[seg.mode] || '🚌';
                const isLast = i === segments.length - 1;

                return (
                  <motion.div
                    key={seg.segment_id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    {/* Origin stop */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      {/* Timeline dot & line */}
                      <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        width: 20, flexShrink: 0,
                      }}>
                        <div style={{
                          width: 10, height: 10, borderRadius: '50%',
                          background: i === 0 ? 'var(--color-primary)' : color,
                          border: '2px solid var(--bg-surface)',
                          boxShadow: i === 0 ? 'var(--shadow-glow-primary)' : `0 0 6px ${color}40`,
                        }} />
                        <div style={{
                          width: 2, height: 32, flexShrink: 0,
                          background: `linear-gradient(to bottom, ${color}, ${color}60)`,
                        }} />
                      </div>

                      {/* Stop name */}
                      <div style={{ paddingTop: 0 }}>
                        <div style={{
                          fontSize: '0.8rem', fontWeight: 600,
                          color: 'var(--text-primary)',
                        }}>
                          {seg.origin_stop.city}
                        </div>
                        <div style={{
                          fontSize: '0.68rem', color: 'var(--text-muted)',
                          fontFamily: 'var(--font-mono)',
                        }}>
                          {seg.origin_stop.station_name} • {seg.departure_time}
                        </div>
                      </div>
                    </div>

                    {/* Transport segment */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      marginLeft: 10, paddingLeft: 20,
                      borderLeft: `2px dashed ${color}40`,
                    }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '5px 10px',
                        background: `${color}10`,
                        border: `1px solid ${color}25`,
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.72rem',
                        color: color,
                        fontWeight: 600,
                      }}>
                        <span style={{ fontSize: '0.9rem' }}>{icon}</span>
                        <span style={{ textTransform: 'capitalize' }}>{seg.mode}</span>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>•</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>
                          {formatDuration(seg.duration_minutes)}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>•</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--color-accent)' }}>
                          {formatCurrency(seg.fare_inr)}
                        </span>
                      </div>
                    </div>

                    {/* Destination stop (only for last segment) */}
                    {isLast && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 4 }}>
                        <div style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center',
                          width: 20, flexShrink: 0,
                        }}>
                          <div style={{
                            width: 10, height: 10, borderRadius: '50%',
                            background: 'var(--color-accent)',
                            border: '2px solid var(--bg-surface)',
                            boxShadow: 'var(--shadow-glow-accent)',
                          }} />
                        </div>
                        <div>
                          <div style={{
                            fontSize: '0.8rem', fontWeight: 600,
                            color: 'var(--text-primary)',
                          }}>
                            {seg.destination_stop.city}
                          </div>
                          <div style={{
                            fontSize: '0.68rem', color: 'var(--color-accent)',
                            fontFamily: 'var(--font-mono)',
                          }}>
                            {seg.destination_stop.station_name} • Arrives {seg.arrival_time}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Transfer gap between segments */}
                    {!isLast && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        marginLeft: 10, paddingLeft: 20, paddingTop: 2, paddingBottom: 6,
                        borderLeft: `2px dotted var(--border-hover)`,
                      }}>
                        <span style={{
                          fontSize: '0.65rem', color: 'var(--text-muted)',
                          fontStyle: 'italic', padding: '2px 8px',
                          background: 'var(--bg-elevated)',
                          borderRadius: 'var(--radius-sm)',
                        }}>
                          🔄 Transfer at {seg.destination_stop.station_name}
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
