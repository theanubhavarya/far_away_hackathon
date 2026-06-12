import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import type { RouteOption } from '../../types';

interface AIExplanationPanelProps {
  route: RouteOption;
  allRoutes: RouteOption[];
}

interface Reason {
  icon: string;
  text: string;
  strength: number; // 0-1, used for ordering
}

function generateReasons(route: RouteOption, allRoutes: RouteOption[]): Reason[] {
  const reasons: Reason[] = [];
  if (allRoutes.length === 0) return reasons;

  const minTime = Math.min(...allRoutes.map((r) => r.total_time_minutes));
  const minCost = Math.min(...allRoutes.map((r) => r.total_cost_inr));
  const maxComfort = Math.max(...allRoutes.map((r) => r.comfort_score));
  const minCarbon = Math.min(...allRoutes.map((r) => r.carbon_grams));
  const maxReliability = Math.max(...allRoutes.map((r) => r.reliability_score));

  // Lowest travel time
  if (route.total_time_minutes === minTime) {
    reasons.push({ icon: '⚡', text: 'Lowest total travel time', strength: 0.95 });
  } else if (route.total_time_minutes <= minTime * 1.15) {
    reasons.push({ icon: '⚡', text: 'Near-fastest travel time', strength: 0.7 });
  }

  // Within budget (within 20% of cheapest)
  if (route.total_cost_inr === minCost) {
    reasons.push({ icon: '💰', text: 'Cheapest route available', strength: 0.9 });
  } else if (route.total_cost_inr <= minCost * 1.2) {
    reasons.push({ icon: '💰', text: 'Within budget range', strength: 0.65 });
  }

  // High comfort score
  if (route.comfort_score === maxComfort) {
    reasons.push({ icon: '👑', text: 'Highest comfort score', strength: 0.85 });
  } else if (route.comfort_score >= 3.5) {
    reasons.push({ icon: '✨', text: 'High comfort score', strength: 0.6 });
  }

  // Fewer transfers
  const transferCount = Math.max(route.segments.length - 1, 0);
  if (transferCount === 0) {
    reasons.push({ icon: '🎯', text: 'Direct route — no transfers', strength: 0.88 });
  } else if (transferCount <= 1) {
    reasons.push({ icon: '🔄', text: 'Fewer transfers', strength: 0.55 });
  }

  // Lowest carbon
  if (route.carbon_grams === minCarbon) {
    reasons.push({ icon: '🌿', text: 'Lowest carbon footprint', strength: 0.8 });
  } else if (route.carbon_grams <= minCarbon * 1.3) {
    reasons.push({ icon: '🌱', text: 'Low environmental impact', strength: 0.5 });
  }

  // High reliability
  if (route.reliability_score === maxReliability) {
    reasons.push({ icon: '🛡️', text: 'Most reliable schedule', strength: 0.75 });
  } else if (route.reliability_score >= 0.85) {
    reasons.push({ icon: '✓', text: 'High reliability', strength: 0.5 });
  }

  // Sustainability
  if (route.sustainability_score !== undefined && route.sustainability_score >= 80) {
    reasons.push({ icon: '♻️', text: 'Excellent sustainability score', strength: 0.6 });
  }

  // Sort by strength descending, cap at 5
  reasons.sort((a, b) => b.strength - a.strength);
  return reasons.slice(0, 5);
}

export default function AIExplanationPanel({ route, allRoutes }: AIExplanationPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const reasons = generateReasons(route, allRoutes);

  if (reasons.length === 0) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontSize: '0.73rem', fontWeight: 600,
          color: 'var(--color-ai)',
          padding: '4px 0',
          transition: 'all var(--transition-fast)',
        }}
        aria-expanded={expanded}
        aria-label="Why this route is recommended"
      >
        <Sparkles size={12} />
        Why Recommended?
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
              marginTop: 8, padding: '12px 14px',
              background: 'rgba(0, 217, 192, 0.04)',
              border: '1px solid rgba(0, 217, 192, 0.15)',
              borderRadius: 'var(--radius-md)',
            }}>
              <div style={{
                fontSize: '0.7rem', fontWeight: 700,
                color: 'var(--color-ai)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                marginBottom: 8,
              }}>
                Selected because
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {reasons.map((reason, i) => (
                  <motion.div
                    key={reason.text}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: '0.78rem', color: 'var(--text-secondary)',
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', width: 20, textAlign: 'center' }}>{reason.icon}</span>
                    <span>{reason.text}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
