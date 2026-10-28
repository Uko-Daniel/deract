import { Component, type ReactNode } from 'react';
import { toError } from './mount-runner';

export function ErrorPanel({ error }: { error: Error }) {
  return (
    <div className="dct-error" role="alert">
      <strong className="dct-error-title">{error.message || 'Something went wrong'}</strong>
      {error.stack ? <pre className="dct-error-stack">{error.stack}</pre> : null}
    </div>
  );
}

function changed(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]));
}

interface BoundaryProps {
  /** When any of these change, the boundary forgets its error and tries again. */
  resetKeys: readonly unknown[];
  children: ReactNode;
}

interface BoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { error: toError(error) };
  }

  componentDidCatch(error: unknown): void {
    console.error('[deract] an entry threw while rendering', error);
  }

  componentDidUpdate(prev: BoundaryProps): void {
    if (this.state.error && changed(prev.resetKeys, this.props.resetKeys)) {
      this.setState({ error: null });
    }
  }

  render(): ReactNode {
    return this.state.error ? <ErrorPanel error={this.state.error} /> : this.props.children;
  }
}