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
  PosBillingScreen,
  SuppliersOrdersScreen,
  ColdChainScreen,
  AdrScreen,
  ChcBedsScreen,
  ChcReferralsScreen,
  ChcRosterScreen,
  SurveillanceScreen,
  DistrictIndentsScreen,
  NationalReservesScreen
} from './EnterpriseRoleScreens';

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

  useEffect(() => {
    refreshAllData();
    const livePoll = setInterval(() => {
      if (navigator.onLine && !document.hidden) {
        refreshAllData();
      }
    }, 12000);
    return () => clearInterval(livePoll);
  }, []);

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
    if (activeScreen === 'pos_billing') {
      const pharmId = user.scopeId ?? 'pharma_valparai_01';
      return <PosBillingScreen lang={lang} pharmacyId={pharmId} />;
    }
    if (activeScreen === 'suppliers_orders') {
      return <SuppliersOrdersScreen lang={lang} />;
    }
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

    case 'pos_billing': {
      const pharmId = user?.scopeId ?? 'pharma_valparai_01';
      return <PosBillingScreen lang={lang} pharmacyId={pharmId} />;
    }

    case 'suppliers_orders':
      return <SuppliersOrdersScreen lang={lang} />;

    case 'cold_chain': {
      const facilityId = user?.scopeId ?? selectedCentreId;
      return <ColdChainScreen lang={lang} facilityId={facilityId} />;
    }

    case 'adr_reporting': {
      const facilityId = user?.scopeId ?? selectedCentreId;
      return <AdrScreen lang={lang} facilityId={facilityId} />;
    }

    case 'chc_beds': {
      const facilityId = user?.scopeId ?? 'chc_pollachi';
      return <ChcBedsScreen lang={lang} facilityId={facilityId} />;
    }

    case 'chc_referrals': {
      const facilityId = user?.scopeId ?? 'chc_pollachi';
      return <ChcReferralsScreen lang={lang} facilityId={facilityId} />;
    }

    case 'chc_roster': {
      const facilityId = user?.scopeId ?? 'chc_pollachi';
      return <ChcRosterScreen lang={lang} facilityId={facilityId} />;
    }

    case 'surveillance':
      return <SurveillanceScreen lang={lang} districtId="coimbatore" />;

    case 'district_indents':
      return <DistrictIndentsScreen lang={lang} districtId="coimbatore" />;

    case 'strategic_reserves':
    case 'national_procurement':
    case 'pharmacovigilance_hub':
      return <NationalReservesScreen lang={lang} />;

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
  const usersList = [
    { name: 'Dr. P. Rajesh (DDHS)', role: 'District Health Officer', email: 'ddhs.cbe@tn.gov.in', scope: 'Coimbatore District (12 PHCs)', status: 'ACTIVE', lastActive: 'Just now' },
    { name: 'Dr. J. Nirmala (Addl. Director)', role: 'State Health Officer', email: 'dph.state@tn.gov.in', scope: 'Tamil Nadu (38 Districts)', status: 'ACTIVE', lastActive: '5m ago' },
    { name: 'Dr. V. K. Paul (NHM Advisor)', role: 'National Health Officer', email: 'advisor.nhm@gov.in', scope: 'Ministry of Health & Family Welfare', status: 'ACTIVE', lastActive: '12m ago' },
    { name: 'Dr. M. Sangeetha (MO CHC)', role: 'CHC Medical Officer', email: 'mo.pollachi@phc.tn.gov.in', scope: 'Pollachi CHC Cluster', status: 'ACTIVE', lastActive: '2m ago' },
    { name: 'R. Karpagam, D.Pharm', role: 'PHC Pharmacist', email: 'phc.valparai@phc.tn.gov.in', scope: 'PHC Valparai Depot', status: 'ACTIVE', lastActive: 'Just now' },
    { name: 'K. Senthil, B.Pharm', role: 'Retail Chemist', email: 'senthil@medrx.in', scope: 'Apollo Pharmacy Coimbatore', status: 'ACTIVE', lastActive: '18m ago' },
    { name: 'Dr. Anaimalai BMO', role: 'Block Health Officer', email: 'bmo.anaimalai@tn.gov.in', scope: 'Anaimalai Block Sub-centres', status: 'ACTIVE', lastActive: '1h ago' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#14202B]">
            {lang === 'ta' ? 'அங்கீகரிக்கப்பட்ட பணியாளர்கள் & பயனர் மேலாண்மை' : 'Authorized Personnel & Access Directory'}
          </h2>
          <p className="text-xs text-[#5B6B7A]">
            {lang === 'ta' ? 'அங்கீகரிக்கப்பட்ட சுகாதார அதிகாரிகள் மற்றும் மருந்தாளர்களின் நேரலை பட்டியல்.' : 'Active authenticated officers, medical personnel, and credentialed facility pharmacists.'}
          </p>
        </div>
        <div className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>7 Officers Active Online</span>
        </div>
      </div>

      <div className="bg-white border border-[#E3E8EE] rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F9FB] border-b border-[#E3E8EE] text-[#5B6B7A] font-semibold">
              <tr>
                <th className="py-3 px-4">Officer / Pharmacist</th>
                <th className="py-3 px-4">Designated Role</th>
                <th className="py-3 px-4">Operational Jurisdiction</th>
                <th className="py-3 px-4">Official Email</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8EE]">
              {usersList.map((u, i) => (
                <tr key={i} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-bold text-[#14202B]">{u.name}</td>
                  <td className="py-3 px-4 font-medium text-[#0F6B6B]">{u.role}</td>
                  <td className="py-3 px-4 text-[#5B6B7A]">{u.scope}</td>
                  <td className="py-3 px-4 text-[#5B6B7A] font-mono">{u.email}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-[#5B6B7A]">{u.lastActive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
