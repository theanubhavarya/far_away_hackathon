import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, SlidersHorizontal, Star } from 'lucide-react';
import { useTripStore } from '../stores';
import { useTranslation } from '../i18n/useTranslation';
import type { RouteOption } from '../types';
import { TRANSPORT_ICONS, formatDuration, formatCurrency, formatCarbon, getCarbonColor, TAG_LABELS } from '../types';
import AIExplanationPanel from '../components/ui/AIExplanationPanel';
import IntercityComparisonTable from '../components/ui/IntercityComparisonTable';
import RouteBreakdown from '../components/ui/RouteBreakdown';
import IntercityInsights from '../components/ui/IntercityInsights';

export function RouteCard({ route, index, allRoutes, onSelect, t }: { route: RouteOption; index: number; allRoutes: RouteOption[]; onSelect: () => void; t: (key: string) => string }) {
  const isRecommended = route.tags.includes('RECOMMENDED');
  const transferCount = Math.max(route.segments.length - 1, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      whileHover={{ y: -3, scale: 1.008 }}
      onClick={onSelect}
      className="glass-card"
      style={{
        cursor: 'pointer',
        border: route.ml_rank === 1
          ? '1.5px solid var(--color-ai)'
          : isRecommended
            ? '1px solid rgba(0,217,192,0.4)'
            : '1px solid var(--glass-border)',
        boxShadow: route.ml_rank === 1
          ? 'var(--shadow-glow-ai)'
          : isRecommended
            ? '0 0 20px rgba(0,217,192,0.08)'
            : undefined,
        position: 'relative', overflow: 'hidden',
      }}
      role="button"
      tabIndex={0}
      aria-label={
        route.travellers && route.travellers > 1
          ? `Route option: ${formatDuration(route.total_time_minutes)}, ${formatCurrency(route.fare_per_person || route.total_cost_inr)} per traveller, total ${formatCurrency(route.total_fare || route.total_cost_inr)} for ${route.travellers} travellers`
          : `Route option: ${formatDuration(route.total_time_minutes)}, ${formatCurrency(route.total_cost_inr)}`
      }
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      {/* Recommended glow strip or AI Recommended banner */}
      {route.ml_rank === 1 ? (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          background: 'linear-gradient(135deg, var(--color-ai), var(--color-primary))',
          color: '#050D1A',
          fontSize: '0.68rem', fontWeight: 800,
          padding: '4px 10px',
          borderBottomLeftRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-glow-ai)',
          display: 'flex', alignItems: 'center', gap: 4,
          textTransform: 'uppercase', letterSpacing: '0.05em',
          zIndex: 10,
        }}>
          <span>🏆</span> AI Recommended #1
        </div>
      ) : isRecommended ? (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, #00D9C0, #3B9EFF)',
        }} />
      ) : null}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Transport mode sequence */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 150 }}>
          {route.trip_type === 'round_trip' && route.outbound && route.return_leg ? (
            <>
              {/* Outbound Leg */}
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                  Outbound
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                  {route.outbound.segments.map((seg, i) => (
                    <span key={i} className={`mode-pill ${seg.mode}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                      {TRANSPORT_ICONS[seg.mode]} {seg.mode.charAt(0).toUpperCase() + seg.mode.slice(1)}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  {route.outbound.departure_time} → {route.outbound.arrival_time}
                </div>
              </div>
              
              {/* Divider */}
              <div style={{ borderTop: '1px dashed var(--border-hover)', margin: '2px 0' }} />

              {/* Return Leg */}
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                  Return
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                  {route.return_leg.segments.map((seg, i) => (
                    <span key={i} className={`mode-pill ${seg.mode}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                      {TRANSPORT_ICONS[seg.mode]} {seg.mode.charAt(0).toUpperCase() + seg.mode.slice(1)}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  {route.return_leg.departure_time} → {route.return_leg.arrival_time}
                </div>
              </div>
            </>
          ) : (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                {route.segments.map((seg, i) => (
                  <span key={i} className={`mode-pill ${seg.mode}`} style={{ fontSize: '0.7rem', padding: '3px 8px' }}>
                    {TRANSPORT_ICONS[seg.mode]} {seg.mode.charAt(0).toUpperCase() + seg.mode.slice(1)}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                {route.departure_time} → {route.arrival_time}
              </div>
            </div>
          )}
        </div>

        {/* Center: duration + cost */}
        <div style={{ flex: 1, minWidth: 140 }}>
          {route.ml_rank === 1 ? (
            <div style={{ height: 18 }} /> // spacer for banner
          ) : route.ml_rank === 2 || route.ml_rank === 3 ? (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(0, 217, 192, 0.12)',
              color: 'var(--color-ai)',
              border: '1px solid rgba(0, 217, 192, 0.25)',
              alignSelf: 'flex-start',
              marginBottom: 4,
            }}>
              <span>{route.ml_rank === 2 ? '🥈' : '🥉'}</span> AI Rank #{route.ml_rank}
            </div>
          ) : (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
              ML Rank #{route.ml_rank ?? index + 1}
            </div>
          )}
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {formatDuration(route.total_time_minutes)}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-accent)', marginTop: 2 }}>
            {formatCurrency(route.fare_per_person || route.total_cost_inr)} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>per traveller</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: 2 }}>
            Total cost: {formatCurrency(route.total_fare || route.total_cost_inr)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {transferCount} transfer{transferCount === 1 ? '' : 's'}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {t('results.upTo')} {formatCurrency(route.cost_breakdown.total_max_inr)} {t('results.inclAll')}
          </div>
        </div>

        {/* Right: scores */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'right', minWidth: 120 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Comfort:</span>
            <Star size={11} color="var(--color-accent)" fill="var(--color-accent)" />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>{route.comfort_score.toFixed(1)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Reliability:</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: route.reliability_score >= 0.85 ? 'var(--color-success)' : 'var(--text-primary)' }}>
              {Math.round(route.reliability_score * 100)}%
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Carbon:</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: getCarbonColor(route.carbon_grams) }}>
              {formatCarbon(route.carbon_grams)}
            </span>
          </div>
          {route.sustainability_score !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Eco Index:</span>
              <span style={{
                fontSize: '0.72rem', fontWeight: 700,
                color: route.sustainability_score >= 80 ? 'var(--color-success)' : 'var(--text-secondary)'
              }}>
                {route.sustainability_score}/100
              </span>
            </div>
          )}
        </div>
      </div>

      {/* AI Explanation & Route Breakdown Panels */}
      <div style={{ marginTop: 12, borderTop: '1px solid var(--border-default)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <AIExplanationPanel route={route} allRoutes={allRoutes} />
        <RouteBreakdown route={route} />
      </div>

      {/* Tags + CTA */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {route.tags.filter((t) => TAG_LABELS[t]).map((tag) => {
            const info = TAG_LABELS[tag];
            return (
              <span key={tag} style={{
                padding: '3px 8px', borderRadius: 'var(--radius-pill)',
                fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.05em',
                background: `${info.color}15`,
                color: info.color,
                border: `1px solid ${info.color}40`,
              }}>
                {info.label}
              </span>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: 'var(--color-primary)' }}>
          {t('results.viewDetails')} <ArrowRight size={13} />
        </div>
      </div>
    </motion.div>
  );
}

export default function ResultsPage() {
  const navigate = useNavigate();
  const { planResult, setSelectedRoute, journeyType } = useTripStore();
  const { t } = useTranslation();
  const [sortBy, setSortBy] = useState<'ml' | 'cost' | 'time' | 'comfort' | 'carbon'>('ml');
  const [maxBudget, setMaxBudget] = useState(10000);

  if (!planResult) {
    navigate('/plan');
    return null;
  }

  const sorted = [...planResult.routes]
    .filter((r) => r.total_cost_inr <= maxBudget)
    .sort((a, b) => {
      if (sortBy === 'ml') return (a.ml_rank ?? 999) - (b.ml_rank ?? 999);
      if (sortBy === 'cost') return a.total_cost_inr - b.total_cost_inr;
      if (sortBy === 'time') return a.total_time_minutes - b.total_time_minutes;
      if (sortBy === 'comfort') return b.comfort_score - a.comfort_score;
      if (sortBy === 'carbon') return a.carbon_grams - b.carbon_grams;
      return 0;
    });

  const handleSelect = (route: RouteOption) => {
    setSelectedRoute(route);
    navigate(`/plan/results/${route.route_id}`);
  };

  return (
    <div className="page-container" style={{ minHeight: 'calc(100vh - 64px)' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: 4 }}>
            {planResult.origin} → {planResult.destination}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {sorted.length} {t('results.routesFound')} • {planResult.travel_date} • {planResult.planning_time_ms}ms
          </p>
        </motion.div>

        {/* Sort & Filter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-card"
          style={{ marginBottom: 20, padding: '16px 20px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <SlidersHorizontal size={14} color="var(--text-muted)" />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('results.sortBy')}</span>
            </div>
            {([
              { key: 'ml', labelKey: 'ML Rank' },
              { key: 'cost', labelKey: 'results.cost' },
              { key: 'time', labelKey: 'results.time' },
              { key: 'comfort', labelKey: 'results.comfort' },
              { key: 'carbon', labelKey: 'results.carbon' },
            ] as const).map(({ key, labelKey }) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                id={`sort-${key}`}
                aria-pressed={sortBy === key}
                style={{
                  padding: '5px 12px', borderRadius: 'var(--radius-pill)',
                  border: `1px solid ${sortBy === key ? 'var(--color-primary)' : 'var(--border-default)'}`,
                  background: sortBy === key ? 'rgba(59,158,255,0.1)' : 'transparent',
                  color: sortBy === key ? 'var(--color-primary)' : 'var(--text-secondary)',
                  fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {labelKey.startsWith('results.') ? t(labelKey) : labelKey}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('results.maxBudget')} ₹{maxBudget.toLocaleString()}</span>
              <input
                type="range"
                min={1000}
                max={15000}
                step={500}
                value={maxBudget}
                onChange={(e) => setMaxBudget(Number(e.target.value))}
                aria-label="Maximum budget filter"
                style={{ accentColor: 'var(--color-accent)', cursor: 'pointer', width: 100 }}
              />
            </div>
          </div>
        </motion.div>

        {/* Intercity Mode UX Components */}
        {journeyType === 'intercity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
            <IntercityComparisonTable routes={sorted} />
            <IntercityInsights routes={sorted} />
          </div>
        )}

        {/* Route Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sorted.map((route, i) => (
            <RouteCard key={route.route_id} route={route} index={i} allRoutes={sorted} onSelect={() => handleSelect(route)} t={t} />
          ))}
          {sorted.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              {t('results.noRoutes')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
