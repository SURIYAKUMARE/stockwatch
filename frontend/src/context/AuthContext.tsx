import React, { createContext, useContext, useState, useCallback } from 'react';
import type { AuthState, AuthUser, LoginCredentials, RegisterPayload } from '../types/auth';
import type { UserRole } from '../types';

// ─── Context shape ─────────────────────────────────────────────────────────────

interface AuthContextValue extends AuthState {
  login: (creds: LoginCredentials) => Promise<void>;
  logout: () => void;
  register: (payload: RegisterPayload) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Session persistence ───────────────────────────────────────────────────────

const SESSION_KEY = 'sw_session_v3';

function loadSession(): { user: AuthUser; token: string } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
    const legacyUser = localStorage.getItem('stockwatch_user');
    const legacyToken = localStorage.getItem('stockwatch_token') || 'demo_token';
    if (legacyUser) {
      const u = JSON.parse(legacyUser);
      const user: AuthUser = {
        id: u.id || 'demo_user',
        name: u.name || u.username || 'User',
        email: u.email || u.username || '',
        role: mapBackendRole(u.role || 'district_officer'),
        scopeId: u.scopes?.facility_id || u.scopes?.pharmacy_id || u.centre_id,
        scopeName: u.scopes?.district_id || u.scopes?.state_id,
        avatarInitials: (u.name || u.username || 'SW').slice(0, 2).toUpperCase(),
        isDemo: true,
      };
      return { user, token: legacyToken };
    }
    return null;
  } catch {
    return null;
  }
}

function saveSession(user: AuthUser, token: string) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ user, token }));
  localStorage.setItem('stockwatch_token', token);
  localStorage.setItem('stockwatch_user', JSON.stringify({
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.email,
    role: user.role === 'facility' ? 'chc_facility' : user.role,
    scopes: {
      facility_id: user.scopeId,
      pharmacy_id: user.scopeId,
      district_id: user.scopeName,
      state_id: user.scopeName,
    }
  }));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('stockwatch_token');
  localStorage.removeItem('stockwatch_user');
}

// ─── Role mapping: backend role strings → frontend UserRole ──────────────────

function mapBackendRole(role: string): UserRole {
  const map: Record<string, UserRole> = {
    patient: 'patient',
    pharmacist: 'pharmacist',
    chc_facility: 'facility',
    facility: 'facility',
    block_officer: 'district_officer',
    district_officer: 'district_officer',
    state_officer: 'state_officer',
    national_officer: 'national_officer',
  };
  return (map[role] as UserRole) ?? 'facility';
}

function buildUser(backendUser: Record<string, any>, token: string): AuthUser {
  const role = mapBackendRole(backendUser.role);
  const name: string = backendUser.name || backendUser.username || backendUser.id;
  const initials = name
    .split(' ')
    .map((w: string) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return {
    id: backendUser.id,
    name,
    email: backendUser.email || backendUser.username || '',
    role,
    scopeId: backendUser.scopes?.facility_id || backendUser.scopes?.pharmacy_id || backendUser.centre_id,
    scopeName: backendUser.scopes?.district_id || backendUser.scopes?.state_id || undefined,
    avatarInitials: initials || '??',
    isDemo: backendUser.username?.endsWith('_demo') ?? false,
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const saved = loadSession();
    if (saved) {
      return {
        user: saved.user,
        token: saved.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    }
    return { user: null, token: null, isAuthenticated: false, isLoading: false, error: null };
  });

  const login = useCallback(async (creds: LoginCredentials) => {
    setState(s => ({ ...s, isLoading: true, error: null }));

    try {
      // Try real backend JWT first
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username_or_email: creds.email.trim(),
          password: creds.password,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const token: string = data.access_token;
        const user = buildUser(data.user, token);

        // Save session
        saveSession(user, token);

        setState({ user, token, isAuthenticated: true, isLoading: false, error: null });
        return;
      }

      // If backend responded with non-200 (e.g. 404 on Vercel or 500), check demo fallback first
      const { DEMO_ACCOUNTS } = await import('../types/auth');
      const account = DEMO_ACCOUNTS[creds.email.toLowerCase().trim()];
      const isDemoPw = account && (
        creds.password === 'demo123' ||
        creds.password === 'demo1234' ||
        account.password === creds.password
      );
      if (account && isDemoPw) {
        const { password: _, ...user } = account;
        const token = `demo_token_${user.id}_${Date.now()}`;
        saveSession(user, token);
        setState({ user, token, isAuthenticated: true, isLoading: false, error: null });
        return;
      }

      // Parse error from backend for non-demo users
      let errMsg = res.status === 404 ? 'Service unavailable. Please use one of the quick demo accounts.' : 'Invalid credentials.';
      try {
        const errData = await res.json();
        errMsg = errData.detail || errMsg;
      } catch {
        // ignore
      }
      setState(s => ({ ...s, isLoading: false, error: errMsg }));
    } catch (networkErr) {
      // Network offline or backend not running — fall back to demo accounts
      const { DEMO_ACCOUNTS } = await import('../types/auth');
      const account = DEMO_ACCOUNTS[creds.email.toLowerCase().trim()];
      const isDemoPw = account && (
        creds.password === 'demo123' ||
        creds.password === 'demo1234' ||
        account.password === creds.password
      );
      if (account && isDemoPw) {
        const { password: _, ...user } = account;
        const token = `demo_token_${user.id}_${Date.now()}`;
        saveSession(user, token);
        setState({ user, token, isAuthenticated: true, isLoading: false, error: null });
      } else {
        setState(s => ({
          ...s,
          isLoading: false,
          error: 'Could not reach the server. If using demo mode, check your credentials.',
        }));
      }
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (state.token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${state.token}` },
        });
      }
    } catch {
      // best-effort
    }
    clearSession();
    setState({ user: null, token: null, isAuthenticated: false, isLoading: false, error: null });
  }, [state.token]);

  const register = useCallback(async (payload: RegisterPayload) => {
    setState(s => ({ ...s, isLoading: true, error: null }));

    if (!payload.consentGiven) {
      setState(s => ({ ...s, isLoading: false, error: 'You must accept the privacy notice.' }));
      return;
    }
    if (payload.password.length < 8) {
      setState(s => ({ ...s, isLoading: false, error: 'Password must be at least 8 characters.' }));
      return;
    }

    try {
      // Map frontend role to backend role string
      const roleMap: Record<string, string> = {
        patient: 'patient',
        pharmacist: 'pharmacist',
        facility: 'chc_facility',
        district_officer: 'district_officer',
        state_officer: 'state_officer',
        national_officer: 'national_officer',
      };
      const backendRole = roleMap[payload.role] ?? 'patient';

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: payload.email.split('@')[0].replace(/[^a-z0-9_]/gi, '_'),
          email: payload.email,
          password: payload.password,
          name: payload.name,
          role: backendRole,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setState(s => ({
          ...s,
          isLoading: false,
          error: errData.detail || 'Registration failed.',
        }));
        return;
      }

      // Auto-login after successful registration
      await login({ email: payload.email, password: payload.password, rememberMe: true });
    } catch {
      setState(s => ({ ...s, isLoading: false, error: 'Network error during registration.' }));
    }
  }, [login]);

  const clearError = useCallback(() => {
    setState(s => ({ ...s, error: null }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, register, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
