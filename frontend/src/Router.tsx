/**
 * Router.tsx
 *
 * Top-level routing component. Handles:
 *  - Unauthenticated: Landing → Login → Register
 *  - Authenticated: role-based AppShell + dashboard
 *
 * No third-party router library — simple state machine.
 */
import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AppShell, AppScreen } from './components/nav/AppShell';
import { PatientDashboard } from './pages/dashboards/PatientDashboard';
import { OfficerDashboard } from './pages/dashboards/OfficerDashboard';
import type { Language } from './i18n';
import { getOfflineQueue, flushOfflineQueue } from './db/offlineQueue';

type PublicPage = 'landing' | 'login' | 'register';

function getDefaultScreen(role: string): AppScreen {
  switch (role) {
    case 'patient': return 'medicine_search';
    case 'pharmacist': return 'dashboard';
    case 'facility': return 'command_center';
    case 'district_officer': return 'command_center';
    case 'state_officer': return 'dashboard';
    case 'national_officer': return 'dashboard';
    default: return 'dashboard';
  }
}

export function Router() {
  const { isAuthenticated, user } = useAuth();
  const [publicPage, setPublicPage] = useState<PublicPage>('landing');
  const [lang, setLang] = useState<Language>('en');
  const [highContrast, setHighContrast] = useState(false);
  const [activeScreen, setActiveScreen] = useState<AppScreen>(
    user ? getDefaultScreen(user.role) : 'dashboard'
  );
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(getOfflineQueue().length);
  const [isSimulating, setIsSimulating] = useState(false);

  // When the user logs in, reset to their default screen
  React.useEffect(() => {
    if (user) setActiveScreen(getDefaultScreen(user.role));
  }, [user?.id]);

  // Online / offline listeners
  React.useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      flushOfflineQueue().then(({ synced }) => {
        setPendingSyncCount(getOfflineQueue().length);
      });
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  const handleSimulateSpike = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/simulate/spike', { method: 'POST' });
      const data = await res.json();
      alert(data.message);
    } catch { alert('Simulation error'); }
    finally { setIsSimulating(false); }
  };

  const handleResetDemo = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/simulate/reset', { method: 'POST' });
      const data = await res.json();
      alert(data.message);
    } catch { alert('Reset error'); }
    finally { setIsSimulating(false); }
  };

  // ── Unauthenticated flow ────────────────────────────────────────────────────
  if (!isAuthenticated) {
    if (publicPage === 'login') {
      return (
        <LoginPage
          onGoToLanding={() => setPublicPage('landing')}
          onGoToRegister={() => setPublicPage('register')}
        />
      );
    }
    if (publicPage === 'register') {
      return (
        <RegisterPage
          onGoToLogin={() => setPublicPage('login')}
          onGoToLanding={() => setPublicPage('landing')}
        />
      );
    }
    return (
      <LandingPage
        onGoToLogin={() => setPublicPage('login')}
        onGoToRegister={() => setPublicPage('register')}
        lang={lang}
      />
    );
  }

  // ── Authenticated flow ──────────────────────────────────────────────────────
  const role = user!.role;

  return (
    <AppShell
      activeScreen={activeScreen}
      onSelectScreen={setActiveScreen}
      lang={lang}
      onToggleLang={() => setLang(l => l === 'en' ? 'ta' : 'en')}
      highContrast={highContrast}
      onToggleContrast={() => setHighContrast(v => !v)}
      criticalAlertCount={0}   // refreshed inside OfficerDashboard
      pendingSyncCount={pendingSyncCount}
      isOnline={isOnline}
      onSimulateSpike={handleSimulateSpike}
      onResetDemo={handleResetDemo}
      isSimulating={isSimulating}
    >
      {role === 'patient' ? (
        <PatientDashboard activeScreen={activeScreen} lang={lang} />
      ) : (
        <OfficerDashboard
          activeScreen={activeScreen}
          lang={lang}
          isOnline={isOnline}
          onTransactionSuccess={() => setPendingSyncCount(getOfflineQueue().length)}
        />
      )}
    </AppShell>
  );
}
