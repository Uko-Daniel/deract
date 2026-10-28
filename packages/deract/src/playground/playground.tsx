import { useCallback, useState } from 'react';
import { reducedMotionContext, themeContext, type ContextDef } from '../contexts';
import { viewportPresets, type ViewportPreset } from '../viewports';
import type { Registry } from '../registry';
import { Canvas } from './canvas';
import { EntryView } from './entry-view';
import { PropsPanel } from './props-panel';
import { Sidebar } from './sidebar';
import { Toolbar } from './toolbar';
import { usePlaygroundState } from './use-playground-state';

export interface PlaygroundProps {
  registry: Registry;
  contexts?: readonly ContextDef[];
  viewports?: readonly ViewportPreset[];
  stylesheets?: readonly string[];
  isolation?: 'iframe' | 'none';
  title?: string;
  initial?: { id?: string; variant?: string };
}

const DEFAULT_CONTEXTS: readonly ContextDef[] = [themeContext, reducedMotionContext];

function Brand() {
  return (
    <header className="dct-brand">
      <span className="dct-brand-mark" aria-hidden="true">
        <svg
          viewBox="0 0 32 32"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="square"
        >
          <path d="M11 6H5v20h6" />
          <path d="M21 6h6v20h-6" />
          <path d="M19.5 5 12.5 27" />
        </svg>
      </span>
      <span className="dct-brand-name">Deract</span>
    </header>
  );
}

export function Playground(props: PlaygroundProps) {
  const {
    registry,
    contexts = DEFAULT_CONTEXTS,
    viewports = viewportPresets,
    stylesheets,
    isolation = 'iframe',
    title,
    initial,
  } = props;

  const state = usePlaygroundState({ registry, contexts, viewports, initial });
  const [width, setWidth] = useState(0);
  const onSize = useCallback((s: { width: number }) => setWidth(s.width), []);

  const entry = state.entry;

  if (!entry) {
    return (
      <div className="dct-playground">
        <Brand />
        <p className="dct-empty" role="status">
          No components registered yet.
        </p>
      </div>
    );
  }

  return (
    <div className="dct-playground">
      <Brand />
      <aside className="dct-sidebar-region">
        <Sidebar
          groups={state.groups}
          selectedId={entry.id}
          onSelect={state.selectEntry}
        />
      </aside>
      <div className="dct-main">
        <Toolbar
          variantNames={state.variantNames}
          variant={state.variant}
          onVariant={state.selectVariant}
          contexts={state.activeContexts}
          values={state.contexts}
          onContext={state.setContext}
          viewports={viewports}
          viewportId={state.viewport?.id}
          onViewport={state.setViewport}
          width={width}
          edited={state.edited}
          onReset={state.reset}
        />
        <div className="dct-content">
          <Canvas
            contexts={state.activeContexts}
            contextValues={state.contexts}
            viewport={state.viewport}
            stylesheets={stylesheets}
            isolation={isolation}
            title={title ?? 'Component preview'}
            onSize={onSize}
          >
            {(env, target) => (
              <EntryView entry={entry} args={state.args} env={env} target={target} />
            )}
          </Canvas>
          <PropsPanel
            controls={entry.controls ?? {}}
            args={state.args}
            onArg={state.setArg}
          />
        </div>
      </div>
    </div>
  );
}