import { Fragment, useId } from 'react';
import type { ContextDef } from '../contexts';
import type { ViewportPreset } from '../viewports';

interface Option {
  id: string;
  label: string;
  title?: string;
}

interface ChoiceProps {
  label: string;
  options: readonly Option[];
  value: string | undefined;
  onChange(id: string): void;
}

function Segmented({ label, options, value, onChange }: ChoiceProps) {
  const name = useId();
  return (
    <fieldset className="dct-field dct-segmented">
      <legend className="dct-label">{label}</legend>
      <div className="dct-segments">
        {options.map((o) => (
          <label key={o.id} className="dct-segment" title={o.title}>
            <input
              type="radio"
              name={name}
              value={o.id}
              checked={o.id === value}
              onChange={() => onChange(o.id)}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Select({ label, options, value, onChange }: ChoiceProps) {
  const id = useId();
  return (
    <div className="dct-field">
      <label className="dct-label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="dct-select"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Choice(props: ChoiceProps) {
  return props.options.length <= 3 ? <Segmented {...props} /> : <Select {...props} />;
}

const RotateIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d="M21 12a9 9 0 1 1-3-6.7" />
    <path d="M21 3v6h-6" />
  </svg>
);

export interface ToolbarProps {
  variantNames: readonly string[];
  variant: string | undefined;
  onVariant(name: string | undefined): void;
  contexts: readonly ContextDef[];
  values: Readonly<Record<string, string>>;
  onContext(contextId: string, optionId: string): void;
  viewports: readonly ViewportPreset[];
  viewportId: string | undefined;
  onViewport(id: string): void;
  /** When custom mode is active and setCustomViewport is provided. */
  customWidth?: number;
  customHeight?: number | null;
  onCustomViewport?(width: number, height?: number | null): void;
  width: number;
  edited: boolean;
  onReset(): void;
}

export function Toolbar(props: ToolbarProps) {
  const { variantNames, variant, contexts, values, viewports, viewportId, width, edited } = props;
  const hasVariant = variantNames.length > 0;
  const customActive = viewportId === 'custom';
  const customEnabled = typeof props.onCustomViewport === 'function';

  const enterCustom = () => {
    if (!customEnabled) return;
    const current = viewports.find((p) => p.id === viewportId);
    const w = current?.width ?? 480;
    const h = current?.height ?? 400;
    props.onCustomViewport!(w, h);
  };

  const rotate = () => {
    if (!customEnabled || !customActive) return;
    const w = props.customWidth;
    const h = props.customHeight;
    if (typeof w === 'number' && typeof h === 'number' && w > 0 && h > 0) {
      props.onCustomViewport!(h, w);
    }
  };

  return (
    <div className="dct-toolbar" role="group" aria-label="Preview controls">
      {hasVariant ? (
        <>
          <Select
            label="Variant"
            options={[
              { id: '', label: 'Default' },
              ...variantNames.map((n) => ({ id: n, label: n })),
            ]}
            value={variant ?? ''}
            onChange={(v) => props.onVariant(v === '' ? undefined : v)}
          />
          <span className="dct-toolbar-divider" aria-hidden="true" />
        </>
      ) : null}

      {contexts.map((c, i) => (
        <Fragment key={c.id}>
          <Choice
            label={c.label}
            options={c.options}
            value={values[c.id]}
            onChange={(optionId) => props.onContext(c.id, optionId)}
          />
          {i === contexts.length - 1 ? (
            <span className="dct-toolbar-divider" aria-hidden="true" />
          ) : null}
        </Fragment>
      ))}

      <Segmented
        label="Viewport"
        options={viewports.map((p) => ({
          id: p.id,
          label: p.label,
          title: p.width === null ? 'Fit the available width' : `${p.width} px`,
        }))}
        value={customActive ? undefined : viewportId}
        onChange={props.onViewport}
      />

      {customEnabled ? (
        <button
          type="button"
          className="dct-button dct-button-small"
          aria-pressed={customActive}
          onClick={() => {
            if (customActive) props.onViewport('fit');
            else enterCustom();
          }}
        >
          Custom
        </button>
      ) : null}

      {customActive && customEnabled ? (
        <div className="dct-toolbar-custom">
          <label className="dct-label">
            W
            <input
              className="dct-input dct-input-narrow"
              type="number"
              inputMode="numeric"
              min={1}
              value={props.customWidth ?? ''}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n) && n > 0) {
                  props.onCustomViewport!(n, props.customHeight ?? null);
                }
              }}
            />
          </label>
          <span className="dct-label" aria-hidden="true">
            ×
          </span>
          <label className="dct-label">
            H
            <input
              className="dct-input dct-input-narrow"
              type="number"
              inputMode="numeric"
              min={1}
              value={props.customHeight ?? ''}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n) && n > 0) {
                  props.onCustomViewport!(props.customWidth ?? 480, n);
                }
              }}
            />
          </label>
          <button
            type="button"
            className="dct-button dct-button-small dct-rotate"
            aria-label="Rotate viewport"
            title="Rotate (swap W and H)"
            onClick={rotate}
            disabled={!props.customWidth || !props.customHeight}
          >
            <RotateIcon />
          </button>
        </div>
      ) : null}

      <span className="dct-toolbar-divider" aria-hidden="true" />

      <span className="dct-readout">
        <span className="dct-label">Width</span>{' '}
        <span className="dct-readout-value">{width > 0 ? `${Math.round(width)} px` : '—'}</span>
      </span>

      <button type="button" className="dct-button" disabled={!edited} onClick={props.onReset}>
        Reset
      </button>
    </div>
  );
}