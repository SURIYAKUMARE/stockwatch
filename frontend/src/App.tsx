import React, { useState, useEffect } from 'react';
import { Sidebar, ScreenId } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { CommandCenter } from './components/CommandCenter';
import { PriorityAlerts } from './components/PriorityAlerts';
import { StockEntry } from './components/StockEntry';
import { CentreDetail } from './components/CentreDetail';
import { ForecastAccuracy } from './components/ForecastAccuracy';
import { Transfers } from './components/Transfers';
import { WeeklyReport } from './components/WeeklyReport';
import { LandingPage } from './components/LandingPage';
import { LoginModal } from './components/LoginModal';
import { RegisterModal } from './components/RegisterModal';
import { PatientFinder } from './components/PatientFinder';
import { PatientDashboard } from './pages/dashboards/PatientDashboard';
import { PharmacyDashboard } from './components/PharmacyDashboard';
import { FacilityDashboard } from './components/FacilityDashboard';
import { StateDashboard } from './components/StateDashboard';
import { NationalDashboard } from './components/NationalDashboard';
import { DeduplicationReview } from './components/DeduplicationReview';
import { AuditLogViewer } from './components/AuditLogViewer';
import { OfflineQueueModal } from './components/OfflineQueueModal';
import { NetworkMapScreen } from './pages/dashboards/NetworkMapScreen';
import { WifiOff } from 'lucide-react';

import {
  Centre,
  Medicine,
  MatrixData,
  KPIData,
  AlertItem,
  UserRole,
  AuthUser
} from './types';
import { Language } from './i18n';
import {
  getOfflineQueue,
  flushOfflineQueue,
  clearSensitiveOfflineStorage,
  refreshOfflineBootstrapData
} from './db/offlineQueue';

const DEMO_USERS: Record<UserRole, AuthUser> = {
  patient: {
    id: 'usr_pat_demo',
    username: 'patient_demo',
    name: 'S. Kousalya (Patient)',
    email: 'kousalya@gmail.com',
    role: 'patient',
    scopes: { state_id: 'TN', district_id: 'coimbatore' }
  },
  pharmacist: {
    id: 'usr_pharma_demo',
    username: 'pharma_demo',
    name: 'K. Senthil, B.Pharm',
    email: 'senthil@medrx.in',
    role: 'pharmacist',
    scopes: { state_id: 'TN', district_id: 'coimbatore', pharmacy_id: 'pharma_coimbatore_central' }
  },
  chc_facility: {
    id: 'usr_chc_demo',
    username: 'chc_demo',
    name: 'Dr. M. Sangeetha (MO CHC)',
    email: 'mo.pollachi@phc.tn.gov.in',
    role: 'chc_facility',
    centre_id: 'chc_pollachi',
    scopes: { state_id: 'TN', district_id: 'coimbatore', facility_id: 'chc_pollachi' }
  },
  facility: {
    id: 'usr_phc_demo',
    username: 'phc_demo',
    name: 'R. Karpagam, D.Pharm (PHC Pharmacist)',
    email: 'phc.valparai@phc.tn.gov.in',
    role: 'facility',
    centre_id: 'phc_valparai',
    scopes: { state_id: 'TN', district_id: 'coimbatore', facility_id: 'phc_valparai' }
  },
  district_officer: {
    id: 'usr_district_demo',
    username: 'district_demo',
    name: 'Dr. P. Rajesh (DDHS)',
    email: 'ddhs.cbe@tn.gov.in',
    role: 'district_officer',
    scopes: { state_id: 'TN', district_id: 'coimbatore' }
  },
  state_officer: {
    id: 'usr_state_demo',
    username: 'state_demo',
    name: 'Dr. J. Nirmala (Addl. Director)',
    email: 'dph.state@tn.gov.in',
    role: 'state_officer',
    scopes: { state_id: 'TN' }
  },
  national_officer: {
    id: 'usr_national_demo',
    username: 'national_demo',
    name: 'Dr. V. K. Paul (NHM Advisor)',
    email: 'advisor.nhm@gov.in',
    role: 'national_officer',
    scopes: {}
  },
  block_officer: {
    id: 'usr_block_demo',
    username: 'block_demo',
    name: 'Dr. Anaimalai BMO',
    email: 'bmo.anaimalai@tn.gov.in',
    role: 'block_officer',
    scopes: { state_id: 'TN', district_id: 'coimbatore' }
  }
};

export function App() {
  // Authentication & Role
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('stockwatch_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return null; }
    }
    // Default to District Officer so dashboard is immediately visible & interactive for evaluator
    return DEMO_USERS.district_officer;
  });

  const [activeScreen, setActiveScreen] = useState<ScreenId>('command_center');
  const [lang, setLang] = useState<Language>('en');
  const [highContrast, setHighContrast] = useState<boolean>(false);

  // Modals
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [showQueueModal, setShowQueueModal] = useState<boolean>(false);
  const [loginDefaultRole, setLoginDefaultRole] = useState<string | undefined>(undefined);

  // Network, PWA & Offline Queue
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(getOfflineQueue().length);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [canInstallPWA, setCanInstallPWA] = useState<boolean>(false);

  // Core Data
  const [centres, setCentres] = useState<Centre[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [matrixData, setMatrixData] = useState<MatrixData | null>(null);
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Drilldown selection for CentreDetail & Transfers
  const [selectedCentreId, setSelectedCentreId] = useState<string>('phc_valparai');
  const [selectedMedicineId, setSelectedMedicineId] = useState<string>('med_pcm');

  // Load all initial data from backend
  const refreshAllData = async () => {
    setIsLoading(true);
    try {
      const [metaRes, kpiRes, matrixRes, alertsRes] = await Promise.all([
        fetch('/api/metadata').then((r) => r.json()),
        fetch('/api/kpis').then((r) => r.json()),
        fetch('/api/matrix').then((r) => r.json()),
        fetch('/api/alerts').then((r) => r.json())
      ]);

      setCentres(metaRes.centres || []);
      setMedicines(metaRes.medicines || []);
      setKpiData(kpiRes);
      setMatrixData(matrixRes);
      setAlerts(alertsRes || []);
    } catch (e) {
      console.error('Failed to load API data', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAllData();
    refreshOfflineBootstrapData();

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
      setCanInstallPWA(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    const handleOnline = () => {
      setIsOnline(true);
      flushOfflineQueue().then(({ synced }) => {
        setPendingSyncCount(getOfflineQueue().length);
        if (synced > 0) refreshAllData();
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      setCanInstallPWA(false);
      setDeferredInstallPrompt(null);
    }
  };

  const handleSyncNow = async () => {
    const { synced } = await flushOfflineQueue();
    setPendingSyncCount(getOfflineQueue().length);
    if (synced > 0) refreshAllData();
  };

  const handleSimulateSpike = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/simulate/spike', { method: 'POST' });
      const data = await res.json();
      alert(data.message);
      await refreshAllData();
    } catch (e) {
      alert('Error triggering simulation');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleResetDemo = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/simulate/reset', { method: 'POST' });
      const data = await res.json();
      alert(data.message);
      await refreshAllData();
    } catch (e) {
      alert('Error resetting demo');
    } finally {
      setIsSimulating(false);
    }
  };

  // Change Role Handler (with auto-screen switch)
  const handleChangeRole = (role: UserRole) => {
    const targetUser = DEMO_USERS[role] || {
      id: `usr_${role}`,
      username: `${role}_demo`,
      name: `${role.toUpperCase()} User`,
      email: `${role}@phc.tn.gov.in`,
      role: role
    };
    setCurrentUser(targetUser);
    localStorage.setItem('stockwatch_user', JSON.stringify(targetUser));

    // Switch to role default screen
    if (role === 'patient') {
      setActiveScreen('patient_finder');
    } else if (role === 'pharmacist') {
      setActiveScreen('pharmacy_dashboard');
    } else if (role === 'chc_facility' || role === 'facility') {
      setActiveScreen('facility_dashboard');
    } else if (role === 'state_officer') {
      setActiveScreen('state_dashboard');
    } else if (role === 'national_officer') {
      setActiveScreen('national_dashboard');
    } else {
      setActiveScreen('command_center');
    }
  };

  // Login Success Handler
  const handleLoginSuccess = (user: AuthUser, token: string) => {
    setCurrentUser(user);
    localStorage.setItem('stockwatch_user', JSON.stringify(user));
    localStorage.setItem('stockwatch_token', token);
    setShowLoginModal(false);

    if (user.role === 'patient') {
      setActiveScreen('patient_finder');
    } else if (user.role === 'pharmacist') {
      setActiveScreen('pharmacy_dashboard');
    } else if (user.role === 'chc_facility' || user.role === 'facility') {
      setActiveScreen('facility_dashboard');
    } else if (user.role === 'state_officer') {
      setActiveScreen('state_dashboard');
    } else if (user.role === 'national_officer') {
      setActiveScreen('national_dashboard');
    } else {
      setActiveScreen('command_center');
    }
  };

  // Logout Handler
  const handleLogout = () => {
    if (currentUser?.id) {
      clearSensitiveOfflineStorage(currentUser.id);
    }
    setCurrentUser(null);
    localStorage.removeItem('stockwatch_user');
    localStorage.removeItem('stockwatch_token');
    setActiveScreen('command_center');
  };

  const handleSelectCell = (centreId: string, medicineId: string) => {
    setSelectedCentreId(centreId);
    setSelectedMedicineId(medicineId);
    setActiveScreen('centre_detail');
  };

  const handleNavigateToTransfers = (centreId: string, medicineId: string) => {
    setSelectedCentreId(centreId);
    setSelectedMedicineId(medicineId);
    setActiveScreen('transfers');
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    await fetch(`/api/alerts/${alertId}/ack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: currentUser?.name || 'Authorized Officer' })
    });
    refreshAllData();
  };

  const handleTakeAction = async (alertId: string, action: string, notes?: string) => {
    await fetch(`/api/alerts/${alertId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, user: currentUser?.name || 'Authorized Officer', notes: notes || '' })
    });
    refreshAllData();
  };

  const criticalCount = alerts.filter((a) => a.tier === 'CRITICAL').length;

  // If user is null and not exploring medicines, render Landing Page
  if (!currentUser && activeScreen !== 'patient_finder') {
    return (
      <div className={`min-h-screen bg-[#F7F9FB] text-[#14202B] ${highContrast ? 'high-contrast' : ''}`}>
        <LandingPage
          onExploreMedicines={() => setActiveScreen('patient_finder')}
          onOpenLogin={(role) => {
            setLoginDefaultRole(role);
            setShowLoginModal(true);
          }}
          lang={lang}
        />
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={handleLoginSuccess}
          onOpenRegister={() => {
            setShowLoginModal(false);
            setShowRegisterModal(true);
          }}
          defaultRole={loginDefaultRole}
        />
        <RegisterModal
          isOpen={showRegisterModal}
          onClose={() => setShowRegisterModal(false)}
          onSuccess={() => {
            setShowRegisterModal(false);
            setShowLoginModal(true);
          }}
        />
      </div>
    );
  }

  // Active Authenticated App View
  return (
    <div className={`min-h-screen flex bg-[#F7F9FB] text-[#14202B] ${highContrast ? 'high-contrast' : ''}`}>
      {/* Left Sidebar */}
      <Sidebar
        activeScreen={activeScreen}
        onSelectScreen={setActiveScreen}
        lang={lang}
        currentUser={currentUser}
        criticalAlertCount={criticalCount}
        pendingSyncCount={pendingSyncCount}
        onGoHome={() => setCurrentUser(null)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <TopNav
          currentRole={currentUser?.role || 'district_officer'}
          onChangeRole={handleChangeRole}
          lang={lang}
          onToggleLang={() => setLang(lang === 'en' ? 'ta' : 'en')}
          isOnline={isOnline}
          pendingSyncCount={pendingSyncCount}
          onSyncNow={handleSyncNow}
          highContrast={highContrast}
          onToggleContrast={() => setHighContrast(!highContrast)}
          onSimulateSpike={handleSimulateSpike}
          onResetDemo={handleResetDemo}
          isSimulating={isSimulating}
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenLogin={() => setShowLoginModal(true)}
          onOpenQueueModal={() => setShowQueueModal(true)}
          canInstallPWA={canInstallPWA}
          onInstallPWA={handleInstallPWA}
        />

        {/* Offline Persistent Warning Banner */}
        {!isOnline && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5 font-medium">
              <WifiOff size={16} className="text-amber-700 shrink-0" />
              <span>
                <strong>Offline Mode Active:</strong> Operating on cached records. Stock updates and shortage requests are stored in your device's IndexedDB and will auto-synchronize when reconnected.
              </span>
            </div>
            <button
              onClick={() => setShowQueueModal(true)}
              className="px-2.5 py-1 rounded-md bg-amber-200/90 hover:bg-amber-300 font-bold text-amber-950 transition text-[11px]"
            >
              View Queue ({pendingSyncCount})
            </button>
          </div>
        )}

        {/* Active Screen View */}
        <main className="flex-1 overflow-y-auto">
          {/* Public / Patient Finder & Care Dashboard */}
          {activeScreen === 'patient_finder' && (
            <PatientDashboard lang={lang} />
          )}

          {/* Pharmacist Portal */}
          {activeScreen === 'pharmacy_dashboard' && (
            <PharmacyDashboard
              currentUser={currentUser}
              lang={lang}
            />
          )}

          {/* CHC & Sub-Centre Health Facility Portal */}
          {activeScreen === 'facility_dashboard' && (
            <FacilityDashboard
              currentUser={currentUser}
              lang={lang}
              onNavigateToTransfers={handleNavigateToTransfers}
            />
          )}

          {/* State Directorate Overview */}
          {activeScreen === 'state_dashboard' && (
            <StateDashboard
              currentUser={currentUser}
              lang={lang}
              onDrillDownToDistrict={() => setActiveScreen('command_center')}
            />
          )}

          {/* National Health Mission Surveillance */}
          {activeScreen === 'national_dashboard' && (
            <NationalDashboard
              currentUser={currentUser}
              lang={lang}
            />
          )}

          {/* Catalogue Deduplication Engine */}
          {activeScreen === 'deduplication' && (
            <DeduplicationReview
              currentUser={currentUser}
              lang={lang}
            />
          )}

          {/* Regulatory Audit Trail */}
          {activeScreen === 'audit_logs' && (
            <AuditLogViewer
              currentUser={currentUser}
              lang={lang}
            />
          )}

          {/* District Command Center Matrix */}
          {activeScreen === 'command_center' && (
            <CommandCenter
              matrixData={matrixData}
              kpiData={kpiData}
              lang={lang}
              onSelectCell={handleSelectCell}
              onNavigateToTransfers={handleNavigateToTransfers}
              isLoading={isLoading}
            />
          )}

          {/* Priority Alerts */}
          {activeScreen === 'priority_alerts' && (
            <PriorityAlerts
              alerts={alerts}
              lang={lang}
              onNavigateToTransfers={handleNavigateToTransfers}
              onAcknowledgeAlert={handleAcknowledgeAlert}
              onTakeAction={handleTakeAction}
              isLoading={isLoading}
            />
          )}

          {/* Stock Entry */}
          {activeScreen === 'stock_entry' && (
            <StockEntry
              centres={centres}
              medicines={medicines}
              lang={lang}
              isOnline={isOnline}
              onTransactionSuccess={() => setPendingSyncCount(getOfflineQueue().length)}
              onRefreshData={refreshAllData}
            />
          )}

          {/* Centre Detail */}
          {activeScreen === 'centre_detail' && (
            <CentreDetail
              centres={centres}
              medicines={medicines}
              selectedCentreId={selectedCentreId}
              selectedMedicineId={selectedMedicineId}
              onChangeSelection={(c, m) => {
                setSelectedCentreId(c);
                setSelectedMedicineId(m);
              }}
              lang={lang}
            />
          )}

          {/* Forecast Accuracy Backtest */}
          {activeScreen === 'forecast_accuracy' && (
            <ForecastAccuracy lang={lang} />
          )}

          {/* Inter-PHC Transfers Network */}
          {activeScreen === 'transfers' && (
            <Transfers
              centres={centres}
              medicines={medicines}
              initialShortageCentreId={selectedCentreId}
              initialMedicineId={selectedMedicineId}
              lang={lang}
              onRefreshData={refreshAllData}
            />
          )}

          {/* Weekly Replenishment Action Report */}
          {activeScreen === 'reports' && (
            <WeeklyReport lang={lang} />
          )}

          {/* Geospatial Network Stock Map & Pharmacy Locator */}
          {activeScreen === 'map_view' && (
            <NetworkMapScreen
              lang={lang}
              onNavigateToTransfers={handleNavigateToTransfers}
              preselectedLocationId={selectedCentreId}
            />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
        onOpenRegister={() => {
          setShowLoginModal(false);
          setShowRegisterModal(true);
        }}
        defaultRole={loginDefaultRole}
      />
      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSuccess={() => {
          setShowRegisterModal(false);
          setShowLoginModal(true);
        }}
      />
      <OfflineQueueModal
        isOpen={showQueueModal}
        onClose={() => setShowQueueModal(false)}
        isOnline={isOnline}
        onSyncComplete={() => {
          refreshAllData();
          setPendingSyncCount(getOfflineQueue().length);
        }}
      />
    </div>
  );
}

export default App;
