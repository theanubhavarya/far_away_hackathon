/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftRight, MapPin, Users, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { searchCities, planRoutes, getIntracityLocations } from '../lib/api';
import { useTripStore, useUIStore } from '../stores';
import { useTranslation } from '../i18n/useTranslation';
import type { CitySearchResult, TravelMode } from '../types';
import { TRAVEL_MODE_OPTIONS } from '../types';
import toast from 'react-hot-toast';
import GoogleMapComponent from '../components/map/GoogleMap';
import DatePicker from '../components/ui/DatePicker';

// ── City Autocomplete Input ────────────────────────────────────────
function CityInput({
  value, onChange, placeholder, icon, id,
}: {
  value: string; onChange: (v: string, city?: CitySearchResult) => void;
  placeholder: string; icon?: React.ReactNode; id: string;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: results } = useQuery({
    queryKey: ['cities', query],
    queryFn: () => searchCities(query),
    enabled: query.length >= 2,
    staleTime: 60000,
  });

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            {icon}
          </span>
        )}
        <input
          id={id}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="input-field"
          style={{ paddingLeft: icon ? 40 : 16 }}
          autoComplete="off"
          aria-label={placeholder}
          aria-autocomplete="list"
          aria-expanded={open}
        />
      </div>
      <AnimatePresence>
        {open && results && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-hover)',
              borderRadius: 'var(--radius-md)',
              marginTop: 4, overflow: 'hidden',
              boxShadow: 'var(--shadow-card)',
            }}
            role="listbox"
          >
            {results.map((city) => (
              <button
                key={city.code}
                role="option"
                onClick={() => { setQuery(city.display); onChange(city.display, city); setOpen(false); }}
                style={{
                  width: '100%', padding: '10px 14px', textAlign: 'left',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  borderBottom: '1px solid var(--border-default)',
                  transition: 'background var(--transition-fast)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-overlay)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <MapPin size={13} color="var(--color-primary)" />
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>{city.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{city.station} • {city.code}</div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Area Autocomplete Input ────────────────────────────────────────
function AreaInput({
  value, onChange, placeholder, icon, id, locations, disabled,
}: {
  value: string; onChange: (v: string) => void;
  placeholder: string; icon?: React.ReactNode; id: string;
  locations: string[]; disabled?: boolean;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return locations;
    return locations.filter(loc => loc.toLowerCase().includes(query.toLowerCase()));
  }, [query, locations]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            {icon}
          </span>
        )}
        <input
          id={id}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => !disabled && setOpen(true)}
          placeholder={placeholder}
          className="input-field"
          style={{ paddingLeft: icon ? 40 : 16, opacity: disabled ? 0.6 : 1 }}
          autoComplete="off"
          disabled={disabled}
          aria-label={placeholder}
          aria-autocomplete="list"
          aria-expanded={open}
        />
      </div>
      <AnimatePresence>
        {open && !disabled && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-hover)',
              borderRadius: 'var(--radius-md)',
              marginTop: 4, maxHeight: 200, overflowY: 'auto',
              boxShadow: 'var(--shadow-card)',
            }}
            role="listbox"
          >
            {results.map((loc) => (
              <button
                key={loc}
                role="option"
                onClick={() => { setQuery(loc); onChange(loc); setOpen(false); }}
                style={{
                  width: '100%', padding: '10px 14px', textAlign: 'left',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  borderBottom: '1px solid var(--border-default)',
                  transition: 'background var(--transition-fast)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-overlay)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <MapPin size={13} color="var(--color-primary)" />
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>{loc}</div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── AI Thinking State ──────────────────────────────────────────────
const AGENT_SEQUENCE = [
  { name: 'Orchestrator', messages: ['Analyzing journey request...', 'Decomposing into task graph', 'Assigning agents...'] },
  { name: 'Routing Agent', messages: ['Scanning 2,847 path combinations...', 'Applying mode weights...', 'Filtered to 12 optimal paths'] },
  { name: 'Pricing Agent', messages: ['Fetching live fare estimates...', 'Calculating hidden costs...', 'Cost breakdown complete'] },
  { name: 'Disruption Agent', messages: ['Checking real-time status...', 'No current disruptions detected ✓'] },
  { name: 'Result', messages: ['Optimization complete. Found 5 routes.'] },
];

function AIThinkingState({ origin, destination }: { origin: string; destination: string }) {
  const { t } = useTranslation();
  const [agentStates, setAgentStates] = useState<Array<{ status: 'idle' | 'thinking' | 'complete'; message: string }>>(
    AGENT_SEQUENCE.map(() => ({ status: 'idle', message: '' }))
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      for (let i = 0; i < AGENT_SEQUENCE.length; i++) {
        if (cancelled) break;
        const agent = AGENT_SEQUENCE[i];
        setAgentStates((prev) => {
          const next = [...prev];
          next[i] = { status: 'thinking', message: agent.messages[0] };
          return next;
        });
        await new Promise((r) => setTimeout(r, 600));
        for (let m = 1; m < agent.messages.length; m++) {
          if (cancelled) break;
          await new Promise((r) => setTimeout(r, 500));
          setAgentStates((prev) => {
            const next = [...prev];
            next[i] = { status: 'thinking', message: agent.messages[m] };
            return next;
          });
        }
        await new Promise((r) => setTimeout(r, 300));
        setAgentStates((prev) => {
          const next = [...prev];
          next[i] = { status: 'complete', message: agent.messages[agent.messages.length - 1] };
          return next;
        });
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ padding: '8px 0' }}
    >
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 4 }}>
          {t('thinking.title')}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {origin} → {destination}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {AGENT_SEQUENCE.map((agent, i) => {
          const state = agentStates[i];
          const dotColor = state.status === 'complete' ? 'var(--color-success)'
            : state.status === 'thinking' ? 'var(--color-primary)' : 'var(--text-muted)';
          return (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}
            >
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: dotColor,
                boxShadow: state.status === 'thinking' ? `0 0 8px ${dotColor}` : 'none',
                animation: state.status === 'thinking' ? 'ai-pulse 1s infinite' : 'none',
                marginTop: 4, flexShrink: 0,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: dotColor, fontWeight: 600 }}>
                  {agent.name}
                </div>
                {state.message && (
                  <motion.div
                    key={state.message}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}
                  >
                    {state.message}
                  </motion.div>
                )}
              </div>
              {state.status === 'complete' && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ color: 'var(--color-success)', fontSize: '0.85rem' }}>
                  ✓
                </motion.span>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── Travel Mode Selector ───────────────────────────────────────────
function TravelModeSelector({ value, onChange }: { value: TravelMode; onChange: (v: TravelMode) => void }) {
  const { t } = useTranslation();
  return (
    <div>
      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
        {t('planner.travelMode')}
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {TRAVEL_MODE_OPTIONS.map((mode) => {
          const selected = value === mode.id;
          return (
            <motion.button
              key={mode.id}
              onClick={() => onChange(mode.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              id={`mode-${mode.id.toLowerCase()}`}
              aria-label={`Travel mode: ${mode.label}`}
              aria-pressed={selected}
              style={{
                padding: '10px 12px', borderRadius: 'var(--radius-md)',
                background: selected ? 'rgba(59,158,255,0.1)' : 'var(--bg-surface)',
                border: `1px solid ${selected ? 'var(--color-primary)' : 'var(--border-default)'}`,
                boxShadow: selected ? 'var(--shadow-glow-primary)' : 'none',
                cursor: 'pointer', textAlign: 'left',
                transition: 'all var(--transition-fast)',
              }}
            >
              <div style={{ fontSize: '1.1rem', marginBottom: 2 }}>{mode.icon}</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: selected ? 'var(--color-primary)' : 'var(--text-primary)' }}>
                {mode.label}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.3, marginTop: 2 }}>
                {mode.description}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Planner Page ─────────────────────────────────────────────
export default function PlannerPage() {
  const navigate = useNavigate();
  const { demoMode } = useUIStore();
  const { t } = useTranslation();
  const {
    origin, destination, travelDate, returnDate, travelers, travelMode, accessibility, detourCity,
    journeyType, isPlanning, planResult,
    city, pickupArea, dropArea,
    setOrigin, setDestination, setTravelDate, setReturnDate, setTravelers, setTravelMode,
    setJourneyType,
    setCity, setPickupArea, setDropArea,
    setPlanResult, setIsPlanning, setPlanningSessionId, fillDemoData,
  } = useTripStore();
  const [travelersOpen, setTravelersOpen] = useState(false);
  const [originCity, setOriginCity] = useState<CitySearchResult | null>(null);
  const [destCity, setDestCity] = useState<CitySearchResult | null>(null);

  // Dynamic Intracity location list fetch
  const { data: locationData, isLoading: isLoadingLocations } = useQuery({
    queryKey: ['intracity-locations', city],
    queryFn: () => getIntracityLocations(city),
    enabled: journeyType === 'intracity' && !!city,
    staleTime: 300000,
  });
  const locations = locationData?.locations || [];

  // Synthesized cities for map centering in intracity mode
  const displayOriginCity = useMemo(() => {
    if (journeyType !== 'intracity') return originCity;
    if (city === 'Delhi') {
      return { name: 'Delhi', station: 'Delhi Transit Hub', code: 'DEL', airport: '', lat: 28.6139, lon: 77.2090, display: 'Delhi' } as CitySearchResult;
    }
    if (city === 'Bangalore') {
      return { name: 'Bangalore', station: 'Bangalore Transit Hub', code: 'BLR', airport: '', lat: 12.9716, lon: 77.5946, display: 'Bangalore' } as CitySearchResult;
    }
    return null;
  }, [journeyType, city, originCity]);

  const displayDestCity = useMemo(() => {
    if (journeyType !== 'intracity') return destCity;
    if (city === 'Delhi') {
      return { name: 'Delhi', station: 'Delhi Transit Hub', code: 'DEL', airport: '', lat: 28.6139, lon: 77.2090, display: 'Delhi' } as CitySearchResult;
    }
    if (city === 'Bangalore') {
      return { name: 'Bangalore', station: 'Bangalore Transit Hub', code: 'BLR', airport: '', lat: 12.9716, lon: 77.5946, display: 'Bangalore' } as CitySearchResult;
    }
    return null;
  }, [journeyType, city, destCity]);

  // Demo auto-fill
  useEffect(() => {
    if (demoMode) {
      fillDemoData();
      searchCities('New Delhi').then((res) => {
        if (res && res.length > 0) {
          setOriginCity(res[0]);
        }
      }).catch(() => {});
      searchCities('Mumbai').then((res) => {
        if (res && res.length > 0) {
          setDestCity(res[0]);
        }
      }).catch(() => {});
    }
  }, [demoMode, fillDemoData]);



  const planMutation = useMutation({
    mutationFn: planRoutes,
    onSuccess: (data) => {
      setPlanResult(data);
      toast.success(`Found ${data.routes.length} routes in ${data.planning_time_ms}ms!`);
      setTimeout(() => {
        setIsPlanning(false);
        navigate('/plan/results');
      }, 3600); // wait for animation
    },
    onError: () => {
      toast.error('Planning failed. Please try again.');
      setIsPlanning(false);
    },
  });

  const handlePlan = () => {
    if (journeyType === 'intracity') {
      if (!city) {
        toast.error('City is required');
        return;
      }
      if (!pickupArea) {
        toast.error('From Area is required');
        return;
      }
      if (!dropArea) {
        toast.error('To Area is required');
        return;
      }
      if (pickupArea === dropArea) {
        toast.error('From Area and To Area cannot be identical');
        return;
      }

      const sessionId = `session-${Date.now()}`;
      setPlanningSessionId(sessionId);
      setPlanResult(null);
      setIsPlanning(true);

      const apiCall = planMutation.mutateAsync({
        origin: city,
        destination: city,
        city,
        pickup_area: pickupArea,
        drop_area: dropArea,
        travel_date: travelDate,
        travelers,
        mode: travelMode,
        accessibility,
      });
      const minDelay = new Promise((r) => setTimeout(r, 3600));
      Promise.all([apiCall, minDelay]).catch(() => { });
      return;
    }

    if (!origin || !destination) {
      toast.error('Please enter origin and destination');
      return;
    }
    if (journeyType === 'round-trip' && returnDate < travelDate) {
      toast.error('Return date cannot be before departure date');
      return;
    }
    const sessionId = `session-${Date.now()}`;
    setPlanningSessionId(sessionId);
    setPlanResult(null);
    setIsPlanning(true);

    // Minimum animation duration (3.5s for drama)
    const apiCall = planMutation.mutateAsync({
      origin, destination, travel_date: travelDate,
      return_date: journeyType === 'round-trip' ? returnDate : undefined,
      travelers,
      mode: travelMode,
      accessibility,
      detour_city: detourCity || undefined,
    });
    const minDelay = new Promise((r) => setTimeout(r, 3600));
    Promise.all([apiCall, minDelay]).catch(() => {});
  };

  const swapCities = () => {
    const tmp = origin;
    setOrigin(destination);
    setDestination(tmp);
  };

  const totalTravelers = travelers.adults + travelers.children + travelers.seniors + travelers.pwd;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      {/* ── LEFT PANEL ─────────────────────────────────────────── */}
      <div style={{
        width: '35%', minWidth: 340, overflowY: 'auto',
        borderRight: '1px solid var(--border-default)',
        background: 'var(--bg-surface)',
      }}>
        <div style={{ padding: '24px 20px' }}>
          <AnimatePresence mode="wait">
            {isPlanning ? (
              <motion.div
                key="thinking"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <AIThinkingState origin={origin} destination={destination} />
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
              >
                <div>
                  <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', marginBottom: 4 }}>{t('planner.title')}</h1>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {journeyType === 'intercity' ? "AI-powered Intercity Route Recommendation" : t('planner.subtitle')}
                  </p>
                  {journeyType === 'intercity' && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, opacity: 0.9 }}>
                      Compare flights, trains, buses and mixed journeys using machine learning.
                    </p>
                  )}
                </div>

                {/* Journey type toggle */}
                <div style={{ display: 'flex', gap: 4, background: 'var(--bg-base)', padding: 4, borderRadius: 'var(--radius-md)' }}>
                  {(['one-way', 'round-trip', 'intercity', 'intracity'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setJourneyType(type)}
                      style={{
                        flex: 1, padding: '6px 8px',
                        borderRadius: 8, border: 'none', cursor: 'pointer',
                        fontSize: '0.75rem', fontWeight: 600,
                        background: journeyType === type ? 'var(--bg-elevated)' : 'transparent',
                        color: journeyType === type ? 'var(--text-primary)' : 'var(--text-muted)',
                        transition: 'all var(--transition-fast)',
                        textTransform: 'capitalize',
                      }}
                      id={`journey-type-${type}`}
                    >
                      {type === 'one-way' ? t('planner.oneWay') : type === 'round-trip' ? t('planner.roundTrip') : type === 'intercity' ? t('planner.intercity') : 'Intracity'}
                    </button>
                  ))}
                </div>

                {journeyType === 'intercity' && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      background: 'rgba(0, 217, 192, 0.08)',
                      border: '1px solid rgba(0, 217, 192, 0.2)',
                      borderRadius: 'var(--radius-pill)',
                      alignSelf: 'center',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'var(--color-ai)',
                        boxShadow: 'var(--shadow-glow-ai)',
                        animation: 'ai-pulse 1.5s infinite',
                      }}
                    />
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-ai)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      ML Recommendation Engine Active
                    </span>
                  </motion.div>
                )}

                {/* Location / Intracity inputs */}
                {journeyType === 'intracity' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label htmlFor="city-select" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>City</label>
                      <select
                        id="city-select"
                        value={city}
                        onChange={(e) => {
                          setCity(e.target.value);
                          setPickupArea('');
                          setDropArea('');
                        }}
                        className="input-field"
                        style={{ width: '100%', padding: '10px 12px' }}
                      >
                        <option value="">Select City</option>
                        <option value="Delhi">Delhi</option>
                        <option value="Bangalore">Bangalore</option>
                      </select>
                    </div>

                    {city && locations.length === 0 && !isLoadingLocations && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-disruption)', marginTop: 4 }}>
                        No intracity routes available.
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label htmlFor="pickup-area" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>From Area</label>
                      <AreaInput
                        id="pickup-area"
                        value={pickupArea}
                        onChange={setPickupArea}
                        placeholder={isLoadingLocations ? "Loading locations..." : "Enter pickup location..."}
                        icon={<MapPin size={14} />}
                        locations={locations}
                        disabled={!city || locations.length === 0}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label htmlFor="drop-area" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>To Area</label>
                      <AreaInput
                        id="drop-area"
                        value={dropArea}
                        onChange={setDropArea}
                        placeholder={isLoadingLocations ? "Loading locations..." : "Enter drop location..."}
                        icon={<MapPin size={14} />}
                        locations={locations}
                        disabled={!city || locations.length === 0}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <label htmlFor="from-city" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('planner.from')}</label>
                      <CityInput
                        id="from-city"
                        value={origin}
                        onChange={(v, city) => { setOrigin(v); if (city) setOriginCity(city); }}
                        placeholder={t('planner.cityPlaceholder')}
                        icon={<MapPin size={14} />}
                      />
                      <label htmlFor="to-city" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('planner.to')}</label>
                      <CityInput
                        id="to-city"
                        value={destination}
                        onChange={(v, city) => { setDestination(v); if (city) setDestCity(city); }}
                        placeholder={t('planner.cityPlaceholder')}
                        icon={<MapPin size={14} />}
                      />
                    </div>
                    {/* Swap button */}
                    <button
                      onClick={swapCities}
                      aria-label="Swap origin and destination"
                      style={{
                        position: 'absolute', right: -16, top: '50%', transform: 'translateY(-50%)',
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'var(--bg-elevated)', border: '1px solid var(--border-hover)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'var(--color-primary)',
                        transition: 'all var(--transition-fast)',
                        zIndex: 10,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-overlay)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                    >
                      <ArrowLeftRight size={14} />
                    </button>
                  </div>
                )}

                {/* Date */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label htmlFor="travel-date" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>{t('planner.date')}</label>
                    <DatePicker
                      id="travel-date"
                      value={travelDate}
                      onChange={setTravelDate}
                      minDate={new Date().toISOString().split('T')[0]}
                      label="Travel date"
                    />
                  </div>
                  {journeyType === 'round-trip' && (
                    <div style={{ flex: 1 }}>
                      <label htmlFor="return-date" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Return Date</label>
                      <DatePicker
                        id="return-date"
                        value={returnDate}
                        onChange={setReturnDate}
                        minDate={travelDate}
                        label="Return date"
                      />
                    </div>
                  )}
                </div>

                {/* Travelers */}
                <div>
                  <button
                    onClick={() => setTravelersOpen(!travelersOpen)}
                    style={{
                      width: '100%', padding: '12px 16px',
                      background: 'var(--bg-base)', border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10,
                      color: 'var(--text-primary)',
                      transition: 'all var(--transition-fast)',
                    }}
                    aria-expanded={travelersOpen}
                    aria-label="Configure travelers"
                  >
                    <Users size={14} color="var(--text-muted)" />
                    <span style={{ flex: 1, textAlign: 'left', fontSize: '0.875rem' }}>
                      {totalTravelers} traveler{totalTravelers !== 1 ? 's' : ''} • {travelers.bags} bag{travelers.bags !== 1 ? 's' : ''}
                    </span>
                    {travelersOpen ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
                  </button>
                  <AnimatePresence>
                    {travelersOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ padding: '16px', background: 'var(--bg-base)', border: '1px solid var(--border-default)', borderTop: 'none', borderRadius: '0 0 var(--radius-md) var(--radius-md)' }}>
                          {([
                            { key: 'adults', label: 'Adults', emoji: '👤', min: 1, max: 9 },
                            { key: 'children', label: 'Children', emoji: '👶', min: 0, max: 9 },
                            { key: 'seniors', label: 'Seniors', emoji: '👴', min: 0, max: 9 },
                            { key: 'pwd', label: 'Differently Abled', emoji: '♿', min: 0, max: 9 },
                            { key: 'bags', label: 'Bags', emoji: '🧳', min: 0, max: 10 },
                          ] as const).map(({ key, label, emoji, min, max }) => (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{emoji} {label}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <button
                                  onClick={() => setTravelers({ [key]: Math.max(min, travelers[key] - 1) })}
                                  disabled={travelers[key] <= min}
                                  aria-label={`Decrease ${label}`}
                                  style={{
                                    width: 28, height: 28, borderRadius: '50%',
                                    border: '1px solid var(--border-hover)',
                                    background: 'var(--bg-elevated)', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--text-primary)', fontSize: '1rem', lineHeight: 1,
                                    opacity: travelers[key] <= min ? 0.4 : 1,
                                  }}
                                >−</button>
                                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, minWidth: 16, textAlign: 'center' }}>
                                  {travelers[key]}
                                </span>
                                <button
                                  onClick={() => setTravelers({ [key]: Math.min(max, travelers[key] + 1) })}
                                  disabled={travelers[key] >= max}
                                  aria-label={`Increase ${label}`}
                                  style={{
                                    width: 28, height: 28, borderRadius: '50%',
                                    border: '1px solid var(--border-hover)',
                                    background: 'var(--bg-elevated)', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--text-primary)', fontSize: '1rem', lineHeight: 1,
                                    opacity: travelers[key] >= max ? 0.4 : 1,
                                  }}
                                >+</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Travel mode selector */}
                {journeyType !== 'intercity' && (
                  <TravelModeSelector value={travelMode} onChange={setTravelMode} />
                )}

                {/* CTA Button */}
                <motion.button
                  onClick={handlePlan}
                  disabled={journeyType === 'intracity' ? (!city || !pickupArea || !dropArea) : (!origin || !destination)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn btn-primary btn-lg btn-full"
                  id="find-routes-btn"
                  aria-label="Find routes"
                >
                  <Zap size={18} />
                  {t('planner.findRoutes')}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── RIGHT PANEL: Map ────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative' }}>
        <GoogleMapComponent
          originCity={displayOriginCity}
          destCity={displayDestCity}
          routes={planResult ? planResult.routes : []}
          onMapSelectOrigin={(city) => {
            setOriginCity(city);
            setOrigin(city.name);
          }}
          onMapSelectDestination={(city) => {
            setDestCity(city);
            setDestination(city.name);
          }}
        />
        {/* Overlay when no cities selected */}
        {!displayOriginCity && !displayDestCity && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <div style={{
              textAlign: 'center', padding: 24,
              background: 'var(--glass-bg)',
              borderRadius: 'var(--radius-lg)',
              backdropFilter: 'blur(8px)',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🗺️</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('planner.mapOverlay')}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
                📍 or click on the map to select
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
