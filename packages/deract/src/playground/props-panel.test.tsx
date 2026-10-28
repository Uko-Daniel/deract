import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsPanel } from './props-panel';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
});

const controls = {
  label: { type: 'text' as const, default: 'Hi', label: 'Label' },
  count: { type: 'number' as const, default: 3, min: 0, max: 10, step: 1, label: 'Count' },
  size: { type: 'range' as const, default: 5, min: 1, max: 10, label: 'Size' },
  enabled: { type: 'boolean' as const, default: true, label: 'Enabled' },
  kind: { type: 'select' as const, default: 'a', options: ['a', 'b'] as const, label: 'Kind' },
  color: { type: 'color' as const, default: '#ff0000', label: 'Color' },
};

const fullArgs = {
  label: 'Hi',
  count: 3,
  size: 5,
  enabled: true,
  kind: 'a',
  color: '#ff0000',
};

function setup(
  args: Record<string, unknown> = fullArgs,
  c: Record<string, unknown> = controls,
) {
  const onArg = vi.fn();
  render(
    <PropsPanel
      controls={c as Parameters<typeof PropsPanel>[0]['controls']}
      args={args}
      onArg={onArg}
    />,
  );
  return { onArg };
}

describe('PropsPanel: one input per control type', () => {
  it('renders a text input wired to the value and onArg', () => {
    const { onArg } = setup();
    const input = screen.getByRole('textbox', { name: 'Label' }) as HTMLInputElement;
    expect(input.value).toBe('Hi');
    fireEvent.change(input, { target: { value: 'Yo' } });
    expect(onArg).toHaveBeenCalledWith('label', 'Yo');
  });

  it('renders a number input with min, max, step and numeric change', () => {
    const { onArg } = setup();
    const input = screen.getByRole('spinbutton', { name: 'Count' }) as HTMLInputElement;
    expect(input.value).toBe('3');
    expect(input.min).toBe('0');
    expect(input.max).toBe('10');
    expect(input.step).toBe('1');
    fireEvent.change(input, { target: { value: '7' } });
    expect(onArg).toHaveBeenCalledWith('count', 7);
  });

  it('treats an empty number field as a request to reset to the default', () => {
    const { onArg } = setup();
    const input = screen.getByRole('spinbutton', { name: 'Count' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });
    expect(onArg).toHaveBeenCalledWith('count', 3);
  });

  it('renders a range input with min, max, step, and shows the live value', () => {
    const { onArg } = setup();
    const input = screen.getByRole('slider', { name: /size/i }) as HTMLInputElement;
    expect(input.value).toBe('5');
    expect(input.min).toBe('1');
    expect(input.max).toBe('10');
    expect(input.step).toBe('1');
    expect(screen.getByText('5')).toBeTruthy();
    fireEvent.change(input, { target: { value: '8' } });
    expect(onArg).toHaveBeenCalledWith('size', 8);
  });

  it('renders a checkbox for boolean controls', () => {
    const { onArg } = setup();
    const input = screen.getByRole('checkbox', { name: 'Enabled' }) as HTMLInputElement;
    expect(input.checked).toBe(true);
    fireEvent.click(input);
    expect(onArg).toHaveBeenCalledWith('enabled', false);
  });

  it('renders a select with the declared options', () => {
    const { onArg } = setup();
    const select = screen.getByRole('combobox', { name: 'Kind' }) as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['a', 'b']);
    fireEvent.change(select, { target: { value: 'b' } });
    expect(onArg).toHaveBeenCalledWith('kind', 'b');
  });

  it('renders a color input', () => {
    const { onArg } = setup();
    const input = screen.getByLabelText('Color') as HTMLInputElement;
    expect(input.type).toBe('color');
    expect(input.value).toBe('#ff0000');
    fireEvent.change(input, { target: { value: '#00ff00' } });
    expect(onArg).toHaveBeenCalledWith('color', '#00ff00');
  });
});

describe('PropsPanel: labels and empty state', () => {
  it('uses the control name when no label is given', () => {
    setup({}, { myControl: { type: 'text' as const, default: 'x' } });
    expect(screen.getByRole('textbox', { name: 'myControl' })).toBeTruthy();
  });

  it('falls back to the control default when the value is missing', () => {
    setup({}, { label: { type: 'text' as const, default: 'Hi', label: 'Label' } });
    expect((screen.getByRole('textbox', { name: 'Label' }) as HTMLInputElement).value).toBe('Hi');
  });

  it('shows an empty state when there are no controls', () => {
    setup({}, {});
    expect(screen.getByText('This component has no controls.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Copy args as JSON' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('PropsPanel: copy args as JSON', () => {
  it('writes pretty-printed JSON of the current args to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    const current = { label: 'Yo', count: 7, size: 5, enabled: false, kind: 'b', color: '#00ff00' };
    setup(current);

    fireEvent.click(screen.getByRole('button', { name: 'Copy args as JSON' }));
    expect(writeText).toHaveBeenCalledWith(JSON.stringify(current, null, 2));
    expect(await screen.findByRole('button', { name: 'Copied!' })).toBeTruthy();
  });

  it('reports "Copy failed" when the Clipboard API rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Copy args as JSON' }));
    expect(await screen.findByRole('button', { name: 'Copy failed' })).toBeTruthy();
  });
});