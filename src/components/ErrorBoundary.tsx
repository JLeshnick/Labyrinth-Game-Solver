import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { RefreshCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Optional label shown in the compact error card (e.g. "Board", "Solver Panel") */
  label?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="h-screen w-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center gap-6 p-8">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/30">
            <RefreshCcw className="w-8 h-8 text-red-400" />
          </div>
          <div className="text-center max-w-md">
            <h1 className="text-xl font-bold text-stone-100 mb-2">Something went wrong</h1>
            <p className="text-stone-400 text-sm mb-4">
              The solver or board encountered an unexpected error.
            </p>
            <pre className="text-xs text-red-400 bg-stone-900 rounded-xl p-4 text-left overflow-auto max-h-40 mb-6 border border-stone-800">
              {this.state.error.message}
            </pre>
            <button
              onClick={() => this.setState({ error: null })}
              className="px-6 py-2.5 bg-theme-primary text-stone-950 font-bold rounded-xl hover:bg-theme-primary-hover transition-colors"
            >
              Try to recover
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Compact error boundary for wrapping individual panels/components. Shows an
 *  inline error card rather than a full-screen takeover. */
export class InlineErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[InlineErrorBoundary:${this.props.label ?? "unknown"}]`, error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 p-4 text-center rounded-xl border border-red-800/40 bg-red-950/20">
          <RefreshCcw className="w-6 h-6 text-red-400" />
          <div>
            <p className="text-xs font-bold text-red-300">{this.props.label ?? "Component"} crashed</p>
            <p className="text-[10px] text-stone-500 mt-0.5">{this.state.error.message}</p>
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            className="px-3 py-1 text-xs bg-red-900/40 text-red-300 border border-red-800/40 rounded-lg hover:bg-red-900/60 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
