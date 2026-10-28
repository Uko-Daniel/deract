import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ControlDef, Controls } from '../types';

export interface PropsPanelProps {
  controls: Controls;
  args: Readonly<Record<string, unknown>>;
  onArg(name: string, value: unknown): void;
}

function labelOf(name: string, def: ControlDef): string {
  return def.label ?? name;
}

/** Coerce a possibly-missing value to a finite number or the control's default. */
function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function Field({
  name,
  def,
  value,
  onArg,
}: {
  name: string;
  def: ControlDef;
  value: unknown;
  onArg(name: string, value: unknown): void;
}) {
  const id = useId();
  const label = labelOf(name, def);
  const change = (v: unknown) => onArg(name, v);

  switch (def.type) {
    case 'text': {
      const v = typeof value === 'string' ? value : def.default;
      return (
        <div className="dct-prop">
          <label className="dct-label" htmlFor={id}>
            {label}
          </label>
          <input
            id={id}
            className="dct-input"
            type="text"
            value={v}
            onChange={(e) => change(e.target.value)}
          />
        </div>
      );
    }
    case 'number': {
      const v = numberOr(value, def.default);
      return (
        <div className="dct-prop">
          <label className="dct-label" htmlFor={id}>
            {label}
          </label>
          <input
            id={id}
            className="dct-input"
            type="number"
            value={v}
            min={def.min}
            max={def.max}
            step={def.step}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') {
                change(def.default);
                return;
              }
              const n = Number(raw);
              if (Number.isFinite(n)) change(n);
            }}
          />
        </div>
      );
    }
    case 'range': {
      const v = numberOr(value, def.default);
      return (
        <div className="dct-prop">
          <label className="dct-label" htmlFor={id}>
            {label}{' '}
            <span className="dct-prop-value" aria-hidden="true">
              {v}
            </span>
          </label>
          <input
            id={id}
            className="dct-input dct-range"
            type="range"
            value={v}
            min={def.min}
            max={def.max}
            step={def.step ?? 1}
            onChange={(e) => change(Number(e.target.value))}
          />
        </div>
      );
    }
    case 'boolean': {
      const v = typeof value === 'boolean' ? value : def.default;
      return (
        <div className="dct-prop dct-prop-inline">
          <input
            id={id}
            className="dct-checkbox"
            type="checkbox"
            checked={v}
            onChange={(e) => change(e.target.checked)}
          />
          <label className="dct-label" htmlFor={id}>
            {label}
          </label>
        </div>
      );
    }
    case 'select': {
      const v = typeof value === 'string' ? value : def.default;
      return (
        <div className="dct-prop">
          <label className="dct-label" htmlFor={id}>
            {label}
          </label>
          <select
            id={id}
            className="dct-select"
            value={v}
            onChange={(e) => change(e.target.value)}
          >
            {def.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      );
    }
    case 'color': {
      const v = typeof value === 'string' ? value : def.default;
      return (
        <div className="dct-prop">
          <label className="dct-label" htmlFor={id}>
            {label}
          </label>
          <input
            id={id}
            className="dct-input dct-color"
            type="color"
            value={v}
            onChange={(e) => change(e.target.value)}
          />
        </div>
      );
    }
  }
}

type CopyStatus = 'idle' | 'copied' | 'error';

export function PropsPanel({ controls, args, onArg }: PropsPanelProps) {
  const headingId = useId();
  const [status, setStatus] = useState<CopyStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const names = Object.keys(controls);

  const copy = useCallback(async () => {
    const text = JSON.stringify(args, null, 2);
    if (timerRef.current) clearTimeout(timerRef.current);
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
      } else {
        // Legacy fallback for browsers without the async Clipboard API.
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        document.body.appendChild(ta);
        ta.select();
        let ok = false;
        try {
          ok = typeof document.execCommand === 'function' && document.execCommand('copy');
        } catch {
          ok = false;
        }
        document.body.removeChild(ta);
        if (!ok) throw new Error('copy failed');
      }
      setStatus('copied');
    } catch {
      setStatus('error');
    }
    timerRef.current = setTimeout(() => setStatus('idle'), 1500);
  }, [args]);

  const buttonLabel =
    status === 'copied' ? 'Copied!' : status === 'error' ? 'Copy failed' : 'Copy args as JSON';

  return (
    <section className="dct-props" aria-labelledby={headingId}>
      <header className="dct-props-header">
        <h2 className="dct-props-title" id={headingId}>
          Props
        </h2>
        <button
          type="button"
          className="dct-button dct-button-small"
          onClick={copy}
          disabled={names.length === 0}
        >
          {buttonLabel}
        </button>
      </header>
      {names.length === 0 ? (
        <p className="dct-empty">This component has no controls.</p>
      ) : (
        <div className="dct-props-list">
          {names.map((name) => {
            const def = controls[name];
            if (!def) return null;
            return (
              <Field key={name} name={name} def={def} value={args[name]} onArg={onArg} />
            );
          })}
        </div>
      )}
    </section>
  );
}