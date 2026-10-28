import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { defineContext, themeContext } from '../contexts';
import { viewportPresets } from '../viewports';
import { Toolbar, type ToolbarProps } from './toolbar';

afterEach(cleanup);

const base = (over: Partial<ToolbarProps> = {}): ToolbarProps => ({
  variantNames: ['big', 'small'],
  variant: undefined,
  onVariant: vi.fn(),
  contexts: [themeContext],
  values: { theme: 'light' },
  onContext: vi.fn(),
  viewports: viewportPresets,
  viewportId: 'fit',
  onViewport: vi.fn(),
  width: 360.4,
  edited: false,
  onReset: vi.fn(),
  ...over,
});

describe('Toolbar: variant', () => {
  it('offers Default plus the variants and reports the choice', () => {
    const p = base({ variant: 'big' });
    render(<Toolbar {...p} />);
    const select = screen.getByRole('combobox', { name: 'Variant' }) as HTMLSelectElement;
    expect(select.value).toBe('big');
    expect(Array.from(select.options).map((o) => o.text)).toEqual(['Default', 'big', 'small']);

    fireEvent.change(select, { target: { value: 'small' } });
    expect(p.onVariant).toHaveBeenCalledWith('small');
    fireEvent.change(select, { target: { value: '' } });
    expect(p.onVariant).toHaveBeenLastCalledWith(undefined);
  });

  it('hides the variant select when the entry has no variants', () => {
    render(<Toolbar {...base({ variantNames: [] })} />);
    expect(screen.queryByRole('combobox', { name: 'Variant' })).toBeNull();
  });
});

describe('Toolbar: contexts', () => {
  it('uses a segmented control (radio group) for 3 options or fewer', () => {
    const p = base({ values: { theme: 'dark' } });
    render(<Toolbar {...p} />);
    expect(screen.getByRole('group', { name: 'Theme' })).toBeTruthy();
    expect((screen.getByRole('radio', { name: 'Dark' }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('radio', { name: 'Light' }) as HTMLInputElement).checked).toBe(false);

    fireEvent.click(screen.getByRole('radio', { name: 'Light' }));
    expect(p.onContext).toHaveBeenCalledWith('theme', 'light');
  });

  it('uses a select for more than 3 options', () => {
    const density = defineContext({
      id: 'density',
      label: 'Density',
      default: 'a',
      options: ['a', 'b', 'c', 'd'].map((id) => ({ id, label: id.toUpperCase() })),
    });
    const p = base({ contexts: [density], values: { density: 'a' } });
    render(<Toolbar {...p} />);
    expect(screen.queryByRole('group', { name: 'Density' })).toBeNull();
    fireEvent.change(screen.getByRole('combobox', { name: 'Density' }), { target: { value: 'c' } });
    expect(p.onContext).toHaveBeenCalledWith('density', 'c');
  });
});

describe('Toolbar: viewport and reset', () => {
  it('lets the user pick a preset and shows the live width', () => {
    const p = base();
    render(<Toolbar {...p} />);
    expect((screen.getByRole('radio', { name: 'Fit' }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('radio', { name: 'Phone' }));
    expect(p.onViewport).toHaveBeenCalledWith('phone');
    expect(screen.getByText('360 px')).toBeTruthy();
  });

  it('shows a dash before the canvas has been measured', () => {
    render(<Toolbar {...base({ width: 0 })} />);
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('disables Reset until something was edited', () => {
    const p = base();
    const { rerender } = render(<Toolbar {...p} />);
    expect((screen.getByRole('button', { name: 'Reset' }) as HTMLButtonElement).disabled).toBe(true);

    rerender(<Toolbar {...p} edited />);
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(p.onReset).toHaveBeenCalledTimes(1);
  });
});