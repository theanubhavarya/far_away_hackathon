import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, ChevronDown, ChevronUp, Clock, IndianRupee, Leaf, Share2, Shield, Star } from 'lucide-react';
import { useTripStore } from '../stores';
import type { RouteSegment } from '../types';
import { TRANSPORT_COLORS, TRANSPORT_ICONS, formatCarbon, formatCurrency, formatDuration, getCarbonColor } from '../types';
import toast from 'react-hot-toast';

function KpiCard({ icon: Icon, label, value, color }: {
  icon: typeof Clock;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="glass-card" style={{ padding: '16px', textAlign: 'center', flex: 1, minWidth: 100 }}>
      <Icon size={18} color={color || 'var(--color-primary)'} style={{ margin: '0 auto 8px' }} />
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: color || 'var(--text-primary)' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

function TimelineSegment({ segment, index, total }: { segment: RouteSegment; index: number; total: number }) {
  const color = TRANSPORT_COLORS[segment.mode];
  const icon = TRANSPORT_ICONS[segment.mode];
  const isLast = index === total - 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      style={{ display: 'flex', gap: 16 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40, flexShrink: 0 }}>
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: color, border: '2px solid var(--bg-base)', boxShadow: `0 0 12px ${color}` }} />
        {!isLast && <div style={{ flex: 1, width: 2, background: color, opacity: 0.35, marginTop: 4 }} />}
      </div>
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{segment.origin_stop.station_name}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
          Departs {segment.departure_time}
        </div>
        <div style={{ padding: '10px 14px', background: `${color}10`, border: `1px solid ${color}25`, borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>{icon}</span>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{segment.operator}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{segment.class_type}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right', flex: '1 1 min-content' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDuration(segment.duration_minutes)}</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>
                {formatCurrency(segment.fare_inr)}
              </div>
            </div>
          </div>
        </div>
        {isLast && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{segment.destination_stop.station_name}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>
              Arrives {segment.arrival_time}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function TimelinePage() {
  const { routeId } = useParams();
  const navigate = useNavigate();
  const { selectedRoute } = useTripStore();
  const [costOpen, setCostOpen] = useState(false);

  if (!selectedRoute) {
    navigate('/plan');
    return null;
  }

  const { segments, total_time_minutes, total_cost_inr, comfort_score, reliability_score, carbon_grams, cost_breakdown } = selectedRoute;
  const totalCost = selectedRoute.total_fare || total_cost_inr;
  const costPerPerson = selectedRoute.fare_per_person || totalCost;
  const transferCount = Math.max(segments.length - 1, 0);

  return (
    <div className="page-container" style={{ minHeight: 'calc(100vh - 64px)', maxWidth: 720, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: 4 }}>Journey Timeline</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {segments[0]?.origin_stop.city} to {segments[segments.length - 1]?.destination_stop.city}
        </p>
      </motion.div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
        <KpiCard icon={Clock} label="Total Time" value={formatDuration(total_time_minutes)} />
        <KpiCard icon={IndianRupee} label="Total Cost" value={formatCurrency(totalCost)} color="var(--color-accent)" />
        <KpiCard icon={IndianRupee} label="Per Person" value={formatCurrency(costPerPerson)} color="var(--color-accent)" />
        <KpiCard icon={Clock} label="Transfers" value={`${transferCount}`} />
        <KpiCard icon={Star} label="Comfort" value={`${comfort_score.toFixed(1)}/5`} color="#8B5CF6" />
        <KpiCard icon={Shield} label="Reliability" value={`${Math.round(reliability_score * 100)}%`} color="var(--color-success)" />
        <KpiCard icon={Leaf} label="Carbon" value={formatCarbon(carbon_grams)} color={getCarbonColor(carbon_grams)} />
        {selectedRoute.sustainability_score !== undefined && (
          <KpiCard icon={Leaf} label="Sustainability" value={`${selectedRoute.sustainability_score}/100`} color={getCarbonColor(carbon_grams)} />
        )}
        {selectedRoute.ml_rank !== undefined && (
          <KpiCard icon={Star} label="ML Rank" value={`#${selectedRoute.ml_rank}`} color="var(--color-ai)" />
        )}
      </div>

      <div style={{ marginBottom: 32 }}>
        {segments.map((segment, i) => (
          <TimelineSegment key={segment.segment_id} segment={segment} index={i} total={segments.length} />
        ))}
      </div>

      <div className="glass-card" style={{ marginBottom: 24 }}>
        <button
          onClick={() => setCostOpen(!costOpen)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-primary)' }}
          aria-expanded={costOpen}
        >
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.95rem' }}>Complete Cost Breakdown</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {formatCurrency(cost_breakdown.total_min_inr)} to {formatCurrency(cost_breakdown.total_max_inr)}
            </div>
          </div>
          {costOpen ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
        </button>
        {costOpen && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-default)' }}>
            {[
              { label: 'Transport fares', amount: cost_breakdown.transport_total_inr },
              { label: 'Estimated local cab', amount: cost_breakdown.estimated_local_cab_inr },
              { label: 'Food estimate', amount: cost_breakdown.estimated_food_inr },
              { label: 'Optional fees', amount: cost_breakdown.optional_fees_inr },
            ].map(({ label, amount }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button onClick={() => navigate(`/book/${routeId}`)} className="btn btn-primary btn-lg" style={{ flex: 1 }} id="book-journey-btn">
          Book This Journey
        </button>
        <button onClick={() => toast.success('Journey alert set.')} className="btn btn-secondary" style={{ flex: 1 }} id="set-alert-btn">
          <Bell size={15} /> Set Journey Alert
        </button>
        <button onClick={() => toast.success('Shareable link copied.')} className="btn btn-ghost" id="share-group-btn">
          <Share2 size={15} />
        </button>
      </div>
    </div>
  );
}
