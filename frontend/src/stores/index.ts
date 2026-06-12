// Yatri AI — Zustand Global Stores
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  RouteOption, PlanRouteResponse, DisruptionEvent,
  TravelMode, TravelerConfig,
} from '../types';
import type { Language } from '../i18n/translations';

// ─────────────────────────────────────────────
// Trip Planning Store
// ─────────────────────────────────────────────
interface TripStore {
  // Form state
  origin: string;
  destination: string;
  travelDate: string;
  returnDate: string;
  travelers: TravelerConfig;
  travelMode: TravelMode;
  accessibility: boolean;
  detourCity: string;
  journeyType: 'one-way' | 'round-trip' | 'intercity' | 'intracity';
  city: string;
  pickupArea: string;
  dropArea: string;

  // Results
  planResult: PlanRouteResponse | null;
  selectedRoute: RouteOption | null;
  disruption: DisruptionEvent | null;

  // UI state
  isPlanning: boolean;
  planningSessionId: string;

  // Actions
  setOrigin: (v: string) => void;
  setDestination: (v: string) => void;
  setTravelDate: (v: string) => void;
  setReturnDate: (v: string) => void;
  setTravelers: (v: Partial<TravelerConfig>) => void;
  setTravelMode: (v: TravelMode) => void;
  setAccessibility: (v: boolean) => void;
  setDetourCity: (v: string) => void;
  setJourneyType: (v: 'one-way' | 'round-trip' | 'intercity' | 'intracity') => void;
  setCity: (v: string) => void;
  setPickupArea: (v: string) => void;
  setDropArea: (v: string) => void;
  setPlanResult: (v: PlanRouteResponse | null) => void;
  setSelectedRoute: (v: RouteOption | null) => void;
  setDisruption: (v: DisruptionEvent | null) => void;
  setIsPlanning: (v: boolean) => void;
  setPlanningSessionId: (v: string) => void;
  fillDemoData: () => void;
  reset: () => void;
}

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split('T')[0];

const defaultReturn = new Date();
defaultReturn.setDate(defaultReturn.getDate() + 4);
const defaultReturnStr = defaultReturn.toISOString().split('T')[0];

const defaultTravelers: TravelerConfig = { adults: 1, children: 0, seniors: 0, pwd: 0, bags: 1 };

export const useTripStore = create<TripStore>((set) => ({
  origin: '',
  destination: '',
  travelDate: tomorrowStr,
  returnDate: defaultReturnStr,
  travelers: defaultTravelers,
  travelMode: 'ECONOMIC',
  accessibility: false,
  detourCity: '',
  journeyType: 'one-way',
  city: '',
  pickupArea: '',
  dropArea: '',

  planResult: null,
  selectedRoute: null,
  disruption: null,
  isPlanning: false,
  planningSessionId: '',

  setOrigin: (v) => set({ origin: v }),
  setDestination: (v) => set({ destination: v }),
  setTravelDate: (v) => set({ travelDate: v }),
  setReturnDate: (v) => set({ returnDate: v }),
  setTravelers: (v) => set((s) => ({ travelers: { ...s.travelers, ...v } })),
  setTravelMode: (v) => set({ travelMode: v }),
  setAccessibility: (v) => set({ accessibility: v }),
  setDetourCity: (v) => set({ detourCity: v }),
  setJourneyType: (v) => set({ journeyType: v }),
  setCity: (v) => set({ city: v }),
  setPickupArea: (v) => set({ pickupArea: v }),
  setDropArea: (v) => set({ dropArea: v }),
  setPlanResult: (v) => set({ planResult: v }),
  setSelectedRoute: (v) => set({ selectedRoute: v }),
  setDisruption: (v) => set({ disruption: v }),
  setIsPlanning: (v) => set({ isPlanning: v }),
  setPlanningSessionId: (v) => set({ planningSessionId: v }),

  fillDemoData: () => set({
    origin: 'New Delhi (NDLS)',
    destination: 'Mumbai (CSMT)',
    travelDate: tomorrowStr,
    returnDate: defaultReturnStr,
    travelers: defaultTravelers,
    travelMode: 'ECONOMIC',
  }),

  reset: () => set({
    origin: '',
    destination: '',
    travelDate: tomorrowStr,
    returnDate: defaultReturnStr,
    travelers: defaultTravelers,
    travelMode: 'ECONOMIC',
    accessibility: false,
    detourCity: '',
    journeyType: 'one-way',
    city: '',
    pickupArea: '',
    dropArea: '',
    planResult: null,
    selectedRoute: null,
    disruption: null,
    isPlanning: false,
  }),
}));



// ─────────────────────────────────────────────
// UI / Preferences Store
// ─────────────────────────────────────────────
interface UIStore {
  theme: 'dark' | 'light';
  demoMode: boolean;
  accessibilityMode: boolean;
  language: Language;
  defaultTravelMode: TravelMode;
  carbonConscious: boolean;
  showJudgePanel: boolean;
  navOpen: boolean;

  setTheme: (v: 'dark' | 'light') => void;
  toggleDemoMode: () => void;
  setAccessibilityMode: (v: boolean) => void;
  setLanguage: (v: Language) => void;
  setDefaultTravelMode: (v: TravelMode) => void;
  setCarbonConscious: (v: boolean) => void;
  setShowJudgePanel: (v: boolean) => void;
  setNavOpen: (v: boolean) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      theme: 'light',
      demoMode: false,
      accessibilityMode: false,
      language: 'en',
      defaultTravelMode: 'ECONOMIC',
      carbonConscious: false,
      showJudgePanel: false,
      navOpen: false,

      setTheme: (v) => set({ theme: v }),
      toggleDemoMode: () => set((s) => ({ demoMode: !s.demoMode, showJudgePanel: !s.demoMode })),
      setAccessibilityMode: (v) => set({ accessibilityMode: v }),
      setLanguage: (v) => set({ language: v }),
      setDefaultTravelMode: (v) => set({ defaultTravelMode: v }),
      setCarbonConscious: (v) => set({ carbonConscious: v }),
      setShowJudgePanel: (v) => set({ showJudgePanel: v }),
      setNavOpen: (v) => set({ navOpen: v }),
    }),
    {
      name: 'yatri-ui-prefs',
      partialize: (state) => ({
        theme: state.theme,
        demoMode: state.demoMode,
        language: state.language,
        accessibilityMode: state.accessibilityMode,
        defaultTravelMode: state.defaultTravelMode,
        carbonConscious: state.carbonConscious,
        showJudgePanel: state.showJudgePanel,
      }),
    },
  ),
);
