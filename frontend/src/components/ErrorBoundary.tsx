import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('StockWatch PHC UI Error Caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
    } catch (e) {}
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F7F9FB] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-[#E3E8EE] p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle size={32} />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-[#14202B]">Temporary Display Issue</h2>
              <p className="text-sm text-[#5B6B7A] leading-relaxed">
                StockWatch PHC encountered a rendering exception. Your offline data in IndexedDB remains safe and intact.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-left font-mono text-xs text-red-700 overflow-x-auto max-h-48 whitespace-pre-wrap">
                <div className="font-bold">{this.state.error.toString()}</div>
                {this.state.error.stack && (
                  <div className="text-[10px] text-gray-500 mt-2 font-mono">{this.state.error.stack}</div>
                )}
                {this.state.errorInfo?.componentStack && (
                  <div className="text-[10px] text-gray-400 mt-1 font-mono">{this.state.errorInfo.componentStack}</div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0F6B6B] hover:bg-[#0a4f4f] text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                <RefreshCw size={14} />
                Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-[#E3E8EE] text-[#14202B] hover:border-red-300 hover:text-red-600 font-bold text-xs rounded-xl transition-all shadow-sm"
              >
                <LogOut size={14} />
                Clear Cache & Reset
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
