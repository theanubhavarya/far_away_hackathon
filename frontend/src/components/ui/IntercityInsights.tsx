import { Sparkles } from 'lucide-react';
import type { RouteOption } from '../../types';
import { formatDuration, formatCurrency } from '../../types';

interface IntercityInsightsProps {
  routes: RouteOption[];
}

interface Insight {
  icon: string;
  text: string;
  score: number; // For ranking priorities
}

function getPrimaryMode(route: RouteOption): string {
  const nonCab = route.segments.filter((s) => s.mode !== 'cab');
  if (nonCab.length === 0) return route.segments[0]?.mode || 'cab';
  return nonCab.reduce((a, b) => a.duration_minutes > b.duration_minutes ? a : b).mode;
}

export default function IntercityInsights({ routes }: IntercityInsightsProps) {
  if (!routes || routes.length === 0) return null;

  const insights: Insight[] = [];

  // Group routes by primary mode
  const flights = routes.filter(r => getPrimaryMode(r) === 'flight');
  const trains = routes.filter(r => getPrimaryMode(r) === 'train');

  // 1. Flight vs Train Time Saved
  if (flights.length > 0 && trains.length > 0) {
    const fastestFlight = [...flights].sort((a, b) => a.total_time_minutes - b.total_time_minutes)[0];
    const fastestTrain = [...trains].sort((a, b) => a.total_time_minutes - b.total_time_minutes)[0];
    const diff = fastestTrain.total_time_minutes - fastestFlight.total_time_minutes;
    if (diff > 30) {
      insights.push({
        icon: '⚡',
        text: `Flight saves ${formatDuration(diff)} compared to rail.`,
        score: diff / 60, // higher time difference = higher score
      });
    }
  }

  // 2. Train vs Flight Emission Reductions
  if (trains.length > 0 && flights.length > 0) {
    const greenestTrain = [...trains].sort((a, b) => a.carbon_grams - b.carbon_grams)[0];
    const greenestFlight = [...flights].sort((a, b) => a.carbon_grams - b.carbon_grams)[0];
    const diffGrams = greenestFlight.carbon_grams - greenestTrain.carbon_grams;
    if (diffGrams > 0 && greenestFlight.carbon_grams > 0) {
      const pct = Math.round((diffGrams / greenestFlight.carbon_grams) * 100);
      if (pct > 10) {
        insights.push({
          icon: '🌿',
          text: `Rail journey reduces travel carbon emissions by ${pct}% compared to flying.`,
          score: pct, // higher percentage = higher score
        });
      }
    }
  }

  // 3. Cheap Bus / Budget highlight
  const cheapestRoute = [...routes].sort((a, b) => a.total_cost_inr - b.total_cost_inr)[0];
  const cheapestMode = getPrimaryMode(cheapestRoute);
  if (cheapestMode === 'bus' || cheapestMode === 'train') {
    insights.push({
      icon: '💰',
      text: `${cheapestMode.charAt(0).toUpperCase() + cheapestMode.slice(1)} is the most economical route at ${formatCurrency(cheapestRoute.total_cost_inr)}.`,
      score: 50,
    });
  }

  // 4. Comfort score insights
  const mostComfortable = [...routes].sort((a, b) => b.comfort_score - a.comfort_score)[0];
  if (mostComfortable.comfort_score >= 4.0) {
    const mode = getPrimaryMode(mostComfortable);
    const indexInOriginal = routes.indexOf(mostComfortable) + 1;
    insights.push({
      icon: '👑',
      text: `Route ${indexInOriginal} (${mode}) offers premium travel comfort with a score of ${mostComfortable.comfort_score.toFixed(1)}/5.0.`,
      score: mostComfortable.comfort_score * 10,
    });
  }

  // Sort by score descending and take up to 4
  const sortedInsights = insights.sort((a, b) => b.score - a.score).slice(0, 4);

  if (sortedInsights.length === 0) return null;

  return (
    <div className="glass-card" style={{ padding: '16px 20px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Sparkles size={16} color="var(--color-ai)" />
        <h3 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.9rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          margin: 0,
        }}>
          AI Travel Insights
        </h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sortedInsights.map((insight, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.4,
            }}
          >
            <span style={{ fontSize: '0.9rem', flexShrink: 0, width: 18, textAlign: 'center' }}>
              {insight.icon}
            </span>
            <span>{insight.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
