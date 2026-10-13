/**
 * OfficerDashboard — routes the authenticated officer to the correct
 * existing screen (CommandCenter, PriorityAlerts, StockEntry, etc.)
 * and adds stub screens for state/national/pharmacist extras.
 *
 * For facility/district officers this is a thin wrapper around the
 * existing, tested PHC components. State and national officers get
 * a placeholder overview until Phase 5 fleshes them out.
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { AppScreen } from '../../components/nav/AppShell';
import type { Language } from '../../i18n';
import type { Centre, Medicine, MatrixData, KPIData, AlertItem } from '../../types';
import { getOfflineQueue, flushOfflineQueue } from '../../db/offlineQueue';

// Existing PHC dashboard components
import { CommandCenter } from '../../components/CommandCenter';
import { PriorityAlerts } from '../../components/PriorityAlerts';
import { StockEntry } from '../../components/StockEntry';
import { CentreDetail } from '../../components/CentreDetail';
import { ForecastAccuracy } from '../../components/ForecastAccuracy';
import { Transfers } from '../../components/Transfers';
import { WeeklyReport } from '../../components/WeeklyReport';

// New stub screens
import { MedicineCatalogue } from './MedicineCatalogue';
import { AuditLogs } from './AuditLogs';
import { PharmacistInventory } from './PharmacistInventory';
import { StateNationalOverview } from './StateNationalOverview';
import { InventoryManager } from './InventoryManager';
import { CsvImporter } from './CsvImporter';
import { NetworkMapScreen } from './NetworkMapScreen';

import {
  FALLBACK_CENTRES,
  FALLBACK_MEDICINES,
  FALLBACK_KPIS,
  FALLBACK_ALERTS,
  FALLBACK_MATRIX,
} from '../../db/demoFallbackData';

interface OfficerDashboardProps {
  activeScreen: AppScreen;
  lang: Language;
  isOnline: boolean;
  onTransactionSuccess: () => void;
}

export function OfficerDashboard({ activeScreen, lang, isOnline, onTransactionSuccess }: OfficerDashboardProps) {
  const { user } = useAuth();
  const [centres, setCentres] = useState<Centre[]>(FALLBACK_CENTRES);
  const [medicines, setMedicines] = useState<Medicine[]>(FALLBACK_MEDICINES);
  const [matrixData, setMatrixData] = useState<MatrixData | null>(FALLBACK_MATRIX);
  const [kpiData, setKpiData] = useState<KPIData | null>(FALLBACK_KPIS);
  const [alerts, setAlerts] = useState<AlertItem[]>(FALLBACK_ALERTS);
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedCentreId, setSelectedCentreId] = useState(() => user?.scopeId || 'phc_valparai');
  const [selectedMedicineId, setSelectedMedicineId] = useState('med_pcm');
  const [pendingSyncCount, setPendingSyncCount] = useState(getOfflineQueue().length);

  const refreshAllData = async () => {
    try {
      const [metaRes, kpiRes, matrixRes, alertsRes] = await Promise.all([
        fetch('/api/metadata').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/kpis').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/matrix').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/alerts').then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      if (metaRes?.centres?.length > 0) setCentres(metaRes.centres);
      if (metaRes?.medicines?.length > 0) setMedicines(metaRes.medicines);
      if (kpiRes && kpiRes.centres_at_risk !== undefined) setKpiData(kpiRes);
      if (matrixRes && matrixRes.rows?.length > 0) setMatrixData(matrixRes);
      if (alertsRes && alertsRes.length > 0) setAlerts(alertsRes);
    } catch (e) {
      console.error('Data fetch failed, using fallback demo data', e);
    }
  };

  useEffect(() => { refreshAllData(); }, []);

  const handleSelectCell = (centreId: string, medicineId: string) => {
    setSelectedCentreId(centreId);
    setSelectedMedicineId(medicineId);
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    await fetch(`/api/alerts/${alertId}/ack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: user?.name ?? 'Officer' }),
    });
    refreshAllData();
  };

  const handleTakeAction = async (alertId: string, action: string, notes?: string) => {
    await fetch(`/api/alerts/${alertId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, user: user?.name ?? 'Officer', notes: notes ?? '' }),
    });
    refreshAllData();
  };

  // ─── Pharmacist-specific screens ───────────────────────────────────────────
  if (user?.role === 'pharmacist') {
    if (activeScreen === 'inventory' || activeScreen === 'dashboard') {
      return <PharmacistInventory lang={lang} medicines={medicines} isLoading={isLoading} />;
    }
    if (activeScreen === 'inventory_manager') {
      // Use demo pharmacy ID from seed data
      const pharmId = user.scopeId ?? 'pharma_valparai_01';
      return <InventoryManager lang={lang} ownerId={pharmId} ownerType="pharmacy" />;
    }
    if (activeScreen === 'stock_entry' || activeScreen === 'stock_entry_facility') {
      return (
        <StockEntry
          centres={centres}
          medicines={medicines}
          lang={lang}
          isOnline={isOnline}
          onTransactionSuccess={() => { setPendingSyncCount(getOfflineQueue().length); onTransactionSuccess(); }}
          onRefreshData={refreshAllData}
        />
      );
    }
    if (activeScreen === 'alerts') {
      return (
        <PriorityAlerts
          alerts={alerts}
          lang={lang}
          onNavigateToTransfers={handleSelectCell}
          onAcknowledgeAlert={handleAcknowledgeAlert}
          onTakeAction={handleTakeAction}
          isLoading={isLoading}
        />
      );
    }
    if (activeScreen === 'reports' || activeScreen === 'weekly_report') {
      return <WeeklyReport lang={lang} />;
    }
    if (activeScreen === 'expiry_batches') {
      const pharmId = user.scopeId ?? 'pharma_valparai_01';
      return <InventoryManager lang={lang} ownerId={pharmId} ownerType="pharmacy" />;
    }
    if (activeScreen === 'import_csv') {
      const pharmId = user.scopeId ?? 'pharma_valparai_01';
      return <CsvImporter lang={lang} ownerId={pharmId} ownerType="pharmacy" />;
    }
    if (activeScreen === 'medicine_catalogue') {
      return <MedicineCatalogue lang={lang} />;
    }
    if (activeScreen === 'map_view') {
      return <NetworkMapScreen lang={lang} onNavigateToTransfers={handleSelectCell} />;
    }
    if (activeScreen === 'audit_logs') {
      return <AuditLogs lang={lang} />;
    }
  }

  // ─── State / national overview ─────────────────────────────────────────────
  if (user?.role === 'state_officer' || user?.role === 'national_officer') {
    if (activeScreen === 'dashboard') {
      return <StateNationalOverview role={user.role} lang={lang} alerts={alerts} kpiData={kpiData} isLoading={isLoading} />;
    }
  }

  // ─── Common PHC officer screens (facility, district, state, national) ──────
  switch (activeScreen) {
    case 'command_center':
    case 'dashboard':
      return (
        <CommandCenter
          matrixData={matrixData}
          kpiData={kpiData}
          lang={lang}
          onSelectCell={(cId, mId) => { handleSelectCell(cId, mId); }}
          onNavigateToTransfers={(cId, mId) => { handleSelectCell(cId, mId); }}
          isLoading={isLoading}
        />
      );

    case 'priority_alerts':
    case 'alerts':
      return (
        <PriorityAlerts
          alerts={alerts}
          lang={lang}
          onNavigateToTransfers={handleSelectCell}
          onAcknowledgeAlert={handleAcknowledgeAlert}
          onTakeAction={handleTakeAction}
          isLoading={isLoading}
        />
      );

    case 'stock_entry':
    case 'stock_entry_facility':
      return (
        <StockEntry
          centres={centres}
          medicines={medicines}
          lang={lang}
          isOnline={isOnline}
          onTransactionSuccess={() => { setPendingSyncCount(getOfflineQueue().length); onTransactionSuccess(); }}
          onRefreshData={refreshAllData}
        />
      );

    case 'centre_detail':
      return (
        <CentreDetail
          centres={centres}
          medicines={medicines}
          selectedCentreId={selectedCentreId}
          selectedMedicineId={selectedMedicineId}
          onChangeSelection={(c, m) => { setSelectedCentreId(c); setSelectedMedicineId(m); }}
          lang={lang}
        />
      );

    case 'forecast':
    case 'forecast_accuracy':
      return <ForecastAccuracy lang={lang} />;

    case 'transfers':
    case 'transfers_network':
      return (
        <Transfers
          centres={centres}
          medicines={medicines}
          initialShortageCentreId={selectedCentreId}
          initialMedicineId={selectedMedicineId}
          lang={lang}
          onRefreshData={refreshAllData}
        />
      );

    case 'weekly_report':
    case 'reports':
      return <WeeklyReport lang={lang} />;

    case 'map_view':
      return (
        <NetworkMapScreen
          lang={lang}
          onNavigateToTransfers={(cId, mId) => { handleSelectCell(cId, mId); }}
          preselectedLocationId={selectedCentreId}
        />
      );

    case 'medicine_catalogue':
      return <MedicineCatalogue lang={lang} />;

    case 'audit_logs':
      return <AuditLogs lang={lang} />;

    case 'inventory':
    case 'inventory_manager': {
      const centreId = user?.scopeId ?? selectedCentreId;
      return <InventoryManager lang={lang} ownerId={centreId} ownerType="facility" />;
    }

    case 'import_csv': {
      const centreId = user?.scopeId ?? selectedCentreId;
      return <CsvImporter lang={lang} ownerId={centreId} ownerType="facility" />;
    }

    case 'user_management':
      return <UserMgmtStub lang={lang} />;

    default:
      return (
        <div className="p-8 text-center text-xs text-[#5B6B7A]">
          Screen <code className="font-mono bg-[#F7F9FB] px-1.5 py-0.5 rounded">{activeScreen}</code> not yet implemented.
        </div>
      );
  }
}

// ─── (Stub screens removed — full implementations in InventoryManager.tsx and CsvImporter.tsx) ──

function UserMgmtStub({ lang }: { lang: Language }) {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <h2 className="text-base font-bold text-[#14202B]">User Management</h2>
      <p className="text-xs text-[#5B6B7A]">User provisioning and role assignment coming in Phase 3 (Auth module).</p>
      <div className="bg-white border border-[#E3E8EE] rounded-xl p-6 text-xs text-[#5B6B7A] space-y-2">
        <div className="font-semibold text-[#14202B]">Note on officer accounts</div>
        <p>District, state, and national officer accounts are created through an administrative process, not public self-registration. Role changes are audited.</p>
      </div>
    </div>
  );
}
