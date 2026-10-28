import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Entry, Env, MountEntry, ReactEntry } from '../types';
import type { CanvasTarget } from './canvas';
import { ErrorBoundary, ErrorPanel } from './error';
import { createMountRunner, type MountRunner } from './mount-runner';

// Internal boundary type: args are validated by defineComponent, not here.
type Args = Record<string, any>;

export interface EntryViewProps {
  entry: Entry<any>;
  args: Args;
  env: Env;
  target: CanvasTarget;
}

// Gives each entry OBJECT a number, so a hot-replaced entry (same id,
// new object) is treated as a new entry and remounts cleanly.
const generations = new WeakMap<object, number>();
let counter = 0;
function generation(entry: object): number {
  let g = generations.get(entry);
  if (g === undefined) {
    g = ++counter;
    generations.set(entry, g);
  }
  return g;
}

function isMountEntry(entry: Entry<any>): entry is MountEntry<any> {
  return typeof entry.mount === 'function';
}

// entry.render() is called as the body of this component, so hooks inside
// render() work, and any throw happens below the error boundary.
function RenderBody({ entry, args, env }: { entry: ReactEntry<any>; args: Args; env: Env }) {
  return <>{entry.render(args, env)}</>;
}

function MountView({ entry, args, env, target }: EntryViewProps & { entry: MountEntry<any> }) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const runner = useRef<MountRunner | null>(null);

  // Effect 1: one runner per (entry, element). Cleanup always destroys it.
  useEffect(() => {
    if (!el) return;
    const r = createMountRunner(entry, el, setError);
    runner.current = r;
    return () => {
      r.destroy();
      runner.current = null;
    };
  }, [entry, el]);

  // Effect 2: runs after effect 1, so a new runner receives its first mount here.
  // The runner decides between update() and remount.
  useEffect(() => {
    runner.current?.update(args, env);
  }, [entry, el, args, env]);

  return createPortal(
    <>
      {error ? <ErrorPanel error={error} /> : null}
      <div ref={setEl} />
    </>,
    target.container,
  );
}

export function EntryView({ entry, args, env, target }: EntryViewProps) {
  const key = generation(entry);

  if (isMountEntry(entry)) {
    return <MountView key={key} entry={entry} args={args} env={env} target={target} />;
  }
  return createPortal(
    <ErrorBoundary resetKeys={[key, args, env]}>
      <RenderBody key={key} entry={entry} args={args} env={env} />
    </ErrorBoundary>,
    target.container,
  );
}