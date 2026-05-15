import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
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
    console.error("SmartCampus runtime error:", error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface p-6">
          <div className="max-w-md w-full bg-white border border-border rounded-3xl p-8 shadow-card text-center">
            <div className="h-14 w-14 rounded-2xl bg-accent-red-light text-accent-red flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h1 className="font-display text-2xl text-navy">
              Что-то пошло не так
            </h1>
            <p className="text-sm text-muted mt-2">
              На странице произошла ошибка. Попробуйте перезагрузить или вернуться
              на дашборд.
            </p>
            <pre className="mt-4 text-[11px] text-muted bg-surface-subtle border border-border rounded-xl p-3 text-left overflow-auto max-h-32">
              {this.state.error.message}
            </pre>
            <div className="flex gap-2 mt-5 justify-center">
              <button
                onClick={() => {
                  this.reset();
                  location.assign("/dashboard");
                }}
                className="px-4 h-10 rounded-xl bg-navy text-white text-sm font-medium hover:bg-navy/90"
              >
                На дашборд
              </button>
              <button
                onClick={() => location.reload()}
                className="px-4 h-10 rounded-xl border border-border text-sm font-medium inline-flex items-center gap-2 hover:bg-surface-subtle"
              >
                <RefreshCw className="h-4 w-4" />
                Перезагрузить
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
