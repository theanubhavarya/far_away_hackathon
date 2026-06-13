import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import JourneyHealthWidget from './components/layout/JourneyHealthWidget';
import LandingPage from './pages/LandingPage';
import PlannerPage from './pages/PlannerPage';
import ResultsPage from './pages/ResultsPage';
import TimelinePage from './pages/TimelinePage';
import DisruptionPage from './pages/DisruptionPage';
import BookingPage from './pages/BookingPage';
import GroupPage from './pages/GroupPage';
import GroupResultsPage from './pages/GroupResultsPage';
import PreferencesPage from './pages/PreferencesPage';
import { useUIStore } from './stores';

export default function App() {
  const { theme } = useUIStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', position: 'relative' }}>
        <div className="bg-doodles" />
        <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/plan" element={<PlannerPage />} />
          <Route path="/plan/results" element={<ResultsPage />} />
          <Route path="/plan/results/:routeId" element={<TimelinePage />} />
          <Route path="/plan/results/:routeId/disruption" element={<DisruptionPage />} />
          <Route path="/book/:routeId" element={<BookingPage />} />
          <Route path="/group" element={<GroupPage />} />
          <Route path="/group/:groupId" element={<GroupPage />} />
          <Route path="/group/:groupId/results" element={<GroupResultsPage />} />
          <Route path="/preferences" element={<PreferencesPage />} />
        </Routes>
        <JourneyHealthWidget />
      </div>
    </BrowserRouter>
  );
}
