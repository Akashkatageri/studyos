import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    (this as any).state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[StudyOS ErrorBoundary] Caught unhandled rendering error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetState = () => {
    try {
      localStorage.removeItem('studyos-user-state');
      sessionStorage.clear();
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }
    window.location.reload();
  };

  render() {
    const state = (this as any).state as State;
    const props = (this as any).props as Props;

    if (state?.hasError) {
      return (
        <div className="min-h-screen bg-[#0C0F12] text-white flex items-center justify-center p-4 font-sans select-none">
          <div className="max-w-md w-full bg-[#141A1F] border border-red-900/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl text-center relative overflow-hidden">
            <div className="w-16 h-16 rounded-2xl bg-red-950/50 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
              <ShieldAlert className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold font-display tracking-tight text-white">
                StudyOS Recovered from an Error
              </h1>
              <p className="text-xs text-gray-400 leading-relaxed font-sans">
                An unexpected rendering glitch occurred. You can reload the app or reset your cached local state to restore smooth operation.
              </p>
              {state.error?.message && (
                <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl text-left text-[11px] font-mono text-red-300 break-words max-h-28 overflow-y-auto mt-2">
                  {state.error.message}
                </div>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 border-none shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>

              <button
                onClick={this.handleResetState}
                className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-800 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>Reset Local Cache & Reload</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return props.children;
  }
}

export default ErrorBoundary;
