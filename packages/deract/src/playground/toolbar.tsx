import { useId } from 'react';
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

/** Segmented control for 3 options or fewer, a select otherwise. */
function Choice(props: ChoiceProps) {
  return props.options.length <= 3 ? <Segmented {...props} /> : <Select {...props} />;
}

export interface ToolbarProps {
  variantNames: readonly string[];
  variant: string | undefined;
  onVariant(name: string | undefined): void;
  /** Contexts relevant to the current entry. */
  contexts: readonly ContextDef[];
  values: Readonly<Record<string, string>>;
  onContext(contextId: string, optionId: string): void;
  viewports: readonly ViewportPreset[];
  viewportId: string | undefined;
  onViewport(id: string): void;
  /** Live width of the canvas in px. 0 means not measured yet. */
  width: number;
  edited: boolean;
  onReset(): void;
}

export function Toolbar(props: ToolbarProps) {
  const { variantNames, variant, contexts, values, viewports, viewportId, width, edited } = props;

  return (
    <div className="dct-toolbar" role="group" aria-label="Preview controls">
      {variantNames.length > 0 ? (
        <Select
          label="Variant"
          options={[{ id: '', label: 'Default' }, ...variantNames.map((n) => ({ id: n, label: n }))]}
          value={variant ?? ''}
          onChange={(v) => props.onVariant(v === '' ? undefined : v)}
        />
      ) : null}

      {contexts.map((c) => (
        <Choice
          key={c.id}
          label={c.label}
          options={c.options}
          value={values[c.id]}
          onChange={(optionId) => props.onContext(c.id, optionId)}
        />
      ))}

      <Segmented
        label="Viewport"
        options={viewports.map((p) => ({
          id: p.id,
          label: p.label,
          title: p.width === null ? 'Fit the available width' : `${p.width} px`,
        }))}
        value={viewportId}
        onChange={props.onViewport}
      />

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