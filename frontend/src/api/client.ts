/**
 * Typed StockWatch API client.
 * Reads the JWT token from localStorage (sw_session_v3) so that
 * protected endpoints receive the Authorization header automatically.
 */
import type {
  Centre,
  Medicine,
  KPIData,
  MatrixData,
  AlertItem,
  ForecastDetailData,
  TransferSuggestionsData,
  BacktestData,
} from '../types';

// ─── Token helper ──────────────────────────────────────────────────────────────

function getToken(): string | null {
  try {
    const raw = localStorage.getItem('sw_session_v3');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token ?? null;
  } catch {
    return null;
  }
}

// ─── Base client ───────────────────────────────────────────────────────────────

export class StockWatchApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string> | undefined ?? {}),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errDetail = `Request failed: ${res.status}`;
      try {
        const errJson = await res.json();
        errDetail = errJson.detail || errJson.message || errDetail;
      } catch {
        errDetail = res.statusText || errDetail;
      }
      throw new Error(errDetail);
    }

    return res.json();
  }

  // ─── Auth ────────────────────────────────────────────────────────────────────

  async login(credentials: { username_or_email: string; password: string }) {
    return this.request<{
      access_token: string;
      token_type: string;
      user: Record<string, any>;
    }>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' }).catch(() => null);
  }

  async getMe() {
    return this.request<Record<string, any>>('/auth/me');
  }

  async register(payload: {
    username: string;
    email: string;
    password: string;
    name: string;
    role: string;
  }) {
    return this.request<{ status: string; user_id: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ─── Core PHC data ────────────────────────────────────────────────────────────

  async getHealth() {
    return this.request<{ status: string; app: string; version: string }>('/health');
  }

  async getMetadata() {
    return this.request<{ centres: Centre[]; medicines: Medicine[] }>('/metadata');
  }

  async getKPIs() {
    return this.request<KPIData>('/kpis');
  }

  async getMatrix() {
    return this.request<MatrixData>('/matrix');
  }

  async getAlerts(tier?: string, block?: string) {
    const params = new URLSearchParams();
    if (tier && tier !== 'ALL') params.append('tier', tier);
    if (block) params.append('block', block);
    const q = params.toString() ? `?${params.toString()}` : '';
    return this.request<AlertItem[]>(`/alerts${q}`);
  }

  async getCentreForecast(centreId: string, medicineId: string) {
    return this.request<ForecastDetailData>(`/centres/${centreId}/medicines/${medicineId}/forecast`);
  }

  async createTransaction(payload: {
    centre_id: string;
    medicine_id: string;
    type: string;
    qty: number;
    batch?: string;
    expiry?: string;
    user?: string;
    confirmed?: boolean;
  }) {
    return this.request<any>('/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getTransferSuggestions(centre: string, medicine: string, qty?: number) {
    const params = new URLSearchParams({ centre, medicine });
    if (qty) params.append('qty', qty.toString());
    return this.request<TransferSuggestionsData>(`/transfers/suggest?${params}`);
  }

  async approveTransfer(payload: {
    donor_id: string;
    recipient_id: string;
    medicine_id: string;
    qty: number;
    user_name: string;
  }) {
    return this.request<{ success: boolean; transferred_qty: number; donor: any; recipient: any }>('/transfers/approve', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getPooledStock() {
    return this.request<any[]>('/transfers/pooled');
  }

  async getBacktest() {
    return this.request<BacktestData>('/backtest');
  }

  async getWeeklyReport() {
    return this.request<any>('/report/weekly');
  }

  async acknowledgeAlert(alertId: string, user = 'Officer') {
    return this.request(`/alerts/${alertId}/ack`, {
      method: 'POST',
      body: JSON.stringify({ user }),
    });
  }

  async takeAlertAction(alertId: string, action: string, user = 'Officer', notes = '') {
    return this.request(`/alerts/${alertId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, user, notes }),
    });
  }

  async simulateAction(action: 'spike' | 'supplier_delay' | 'stale_data' | 'reset') {
    return this.request(`/simulate/${action}`, { method: 'POST' });
  }

  // ─── Inventory (new Phase 4 endpoints) ───────────────────────────────────────

  async getInventory(ownerId: string) {
    return this.request<any>(`/inventory/${ownerId}`);
  }

  async createInventoryTransaction(payload: Record<string, any>) {
    return this.request<any>('/inventory/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async importInventory(payload: Record<string, any>) {
    return this.request<any>('/inventory/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ─── Medicine catalogue (Phase 4) ────────────────────────────────────────────

  async getMedicines(query?: string) {
    const q = query ? `?q=${encodeURIComponent(query)}` : '';
    return this.request<any>(`/medicines${q}`);
  }

  async scanDuplicates() {
    return this.request<any>('/medicines/duplicates/scan');
  }

  // ─── Pharmacy discovery ───────────────────────────────────────────────────────

  async getNearbyPharmacies(lat: number, lng: number, maxKm = 20) {
    return this.request<any[]>(`/pharmacies/nearby?lat=${lat}&lng=${lng}&max_distance_km=${maxKm}`);
  }

  // ─── Analytics ────────────────────────────────────────────────────────────────

  async getStateAnalytics(stateId: string) {
    return this.request<any>(`/analytics/state?state_id=${stateId}`);
  }

  async getNationalAnalytics() {
    return this.request<any>('/analytics/national');
  }

  // ─── Admin ────────────────────────────────────────────────────────────────────

  async getAuditLogs() {
    return this.request<any[]>('/admin/audit-logs');
  }
}

export const apiClient = new StockWatchApiClient();
