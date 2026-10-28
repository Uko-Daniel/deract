import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { defineComponent } from '../define-component';
import { createRegistry } from '../registry';
import { Playground } from './playground';

afterEach(cleanup);

const registry = createRegistry([
  defineComponent({
    id: 'button',
    title: 'Button',
    controls: { label: { type: 'text', default: 'Hi' } },
    variants: { big: { label: 'Big' } },
    render: (args) => <button>{String(args.label)}</button>,
  }),
  defineComponent({ id: 'card', title: 'Card', render: () => null }),
]);

describe('Playground', () => {
  it('renders the sidebar, the toolbar controls, an iframe canvas, and the props panel', () => {
    render(<Playground registry={registry} />);
    expect(screen.getByRole('navigation', { name: 'Components' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Button' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Variant' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Theme' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Viewport' })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'label' })).toBeTruthy();
    expect(document.querySelector('iframe')).toBeTruthy();
  });

  it('shows an empty state when the registry is empty', () => {
    render(<Playground registry={createRegistry()} />);
    expect(screen.getByRole('status').textContent).toBe('No components registered yet.');
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('renders the brand header with the logo and wordmark', () => {
    render(<Playground registry={registry} />);
    expect(screen.getByText('Deract')).toBeTruthy();
    const brand = document.querySelector('.dct-brand');
    expect(brand?.querySelector('svg')).toBeTruthy();
  });
});