import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import type { RouteOption, TransportMode } from '../../types';
import { TRANSPORT_ICONS, formatDuration, formatCurrency, formatCarbon } from '../../types';

interface IntercityComparisonTableProps {
  routes: RouteOption[];
}

function getPrimaryMode(route: RouteOption): TransportMode {
  // Find the longest-duration non-cab segment
  const nonCab = route.segments.filter((s) => s.mode !== 'cab');
  if (nonCab.length === 0) return route.segments[0]?.mode || 'cab';
  return nonCab.reduce((a, b) => a.duration_minutes > b.duration_minutes ? a : b).mode;
}

function getBestValues(routes: RouteOption[]) {
  return {
    cost: Math.min(...routes.map((r) => r.total_cost_inr)),
    time: Math.min(...routes.map((r) => r.total_time_minutes)),
    transfers: Math.min(...routes.map((r) => Math.max(r.segments.length - 1, 0))),
    comfort: Math.max(...routes.map((r) => r.comfort_score)),
    reliability: Math.max(...routes.map((r) => r.reliability_score)),
    carbon: Math.min(...routes.map((r) => r.carbon_grams)),
  };
}

export default function IntercityComparisonTable({ routes }: IntercityComparisonTableProps) {
  const [expanded, setExpanded] = useState(false);
  const displayRoutes = routes.slice(0, 5);
  const best = getBestValues(displayRoutes);

  const highlightStyle = (isBest: boolean): React.CSSProperties => ({
    color: isBest ? 'var(--color-ai)' : 'var(--text-secondary)',
    fontWeight: isBest ? 700 : 500,
    position: 'relative' as const,
  });

  const cellBase: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: '0.78rem',
    fontFamily: 'var(--font-mono)',
    borderBottom: '1px solid var(--border-default)',
    whiteSpace: 'nowrap',
  };

  const headerCell: React.CSSProperties = {
    ...cellBase,
    fontSize: '0.68rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    position: 'sticky' as const,
    top: 0,
    background: 'var(--glass-bg-elevated)',
    zIndex: 2,
  };

  return (
    <div className="glass-card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--text-primary)',
          transition: 'all var(--transition-fast)',
        }}
        aria-expanded={expanded}
        id="compare-routes-btn"
      >
        <BarChart3 size={16} color="var(--color-ai)" />
        <span style={{ flex: 1, textAlign: 'left', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.9rem' }}>
          Compare Routes
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginRight: 8 }}>
          {displayRoutes.length} routes
        </span>
        {expanded ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ overflowX: 'auto', borderTop: '1px solid var(--border-default)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                <thead>
                  <tr>
                    <th style={{ ...headerCell, textAlign: 'left' }}>Route</th>
                    <th style={{ ...headerCell, textAlign: 'center' }}>Mode</th>
                    <th style={{ ...headerCell, textAlign: 'right' }}>Cost</th>
                    <th style={{ ...headerCell, textAlign: 'right' }}>Duration</th>
                    <th style={{ ...headerCell, textAlign: 'center' }}>Transfers</th>
                    <th style={{ ...headerCell, textAlign: 'center' }}>Comfort</th>
                    <th style={{ ...headerCell, textAlign: 'center' }}>Reliability</th>
                    <th style={{ ...headerCell, textAlign: 'right' }}>Carbon</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRoutes.map((route, i) => {
                    const primaryMode = getPrimaryMode(route);
                    const transfers = Math.max(route.segments.length - 1, 0);
                    const isTop = route.ml_rank === 1 || i === 0;

                    return (
                      <motion.tr
                        key={route.route_id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        style={{
                          background: isTop ? 'rgba(0, 217, 192, 0.03)' : 'transparent',
                          transition: 'background var(--transition-fast)',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-overlay)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = isTop ? 'rgba(0, 217, 192, 0.03)' : 'transparent'; }}
                      >
                        <td style={{ ...cellBase, textAlign: 'left' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {isTop && <span style={{ fontSize: '0.85rem' }}>🏆</span>}
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              Route {i + 1}
                            </span>
                            {route.ml_rank && (
                              <span style={{
                                fontSize: '0.6rem', fontWeight: 700,
                                padding: '1px 5px', borderRadius: 'var(--radius-pill)',
                                background: 'rgba(0, 217, 192, 0.1)',
                                color: 'var(--color-ai)',
                                border: '1px solid rgba(0, 217, 192, 0.2)',
                              }}>
                                #{route.ml_rank}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ ...cellBase, textAlign: 'center' }}>
                          <span style={{ fontSize: '1rem' }}>
                            {TRANSPORT_ICONS[primaryMode] || '🚌'}
                          </span>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2, textTransform: 'capitalize' }}>
                            {primaryMode}
                          </div>
                        </td>
                        <td style={{ ...cellBase, textAlign: 'right', ...highlightStyle(route.total_cost_inr === best.cost) }}>
                          {formatCurrency(route.total_cost_inr)}
                          {route.total_cost_inr === best.cost && <span style={{ fontSize: '0.6rem', marginLeft: 4 }}>✦</span>}
                        </td>
                        <td style={{ ...cellBase, textAlign: 'right', ...highlightStyle(route.total_time_minutes === best.time) }}>
                          {formatDuration(route.total_time_minutes)}
                          {route.total_time_minutes === best.time && <span style={{ fontSize: '0.6rem', marginLeft: 4 }}>✦</span>}
                        </td>
                        <td style={{ ...cellBase, textAlign: 'center', ...highlightStyle(transfers === best.transfers) }}>
                          {transfers}
                          {transfers === best.transfers && <span style={{ fontSize: '0.6rem', marginLeft: 4 }}>✦</span>}
                        </td>
                        <td style={{ ...cellBase, textAlign: 'center', ...highlightStyle(route.comfort_score === best.comfort) }}>
                          {route.comfort_score.toFixed(1)}
                          {route.comfort_score === best.comfort && <span style={{ fontSize: '0.6rem', marginLeft: 4 }}>✦</span>}
                        </td>
                        <td style={{ ...cellBase, textAlign: 'center', ...highlightStyle(route.reliability_score === best.reliability) }}>
                          {Math.round(route.reliability_score * 100)}%
                          {route.reliability_score === best.reliability && <span style={{ fontSize: '0.6rem', marginLeft: 4 }}>✦</span>}
                        </td>
                        <td style={{ ...cellBase, textAlign: 'right', ...highlightStyle(route.carbon_grams === best.carbon) }}>
                          {formatCarbon(route.carbon_grams)}
                          {route.carbon_grams === best.carbon && <span style={{ fontSize: '0.6rem', marginLeft: 4 }}>✦</span>}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{
              padding: '8px 20px 12px',
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: '0.65rem', color: 'var(--text-muted)',
              borderTop: '1px solid var(--border-default)',
            }}>
              <span style={{ color: 'var(--color-ai)' }}>✦</span> Best in category
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
