import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { defineComponent } from '../define-component';
import { createRegistry } from '../registry';
import { Sidebar, filterGroups } from './sidebar';

afterEach(cleanup);

const make = (id: string, title: string, group?: string) =>
  defineComponent({ id, title, group, render: () => null });

const groups = () =>
  createRegistry([
    make('button', 'Button', 'Primitives'),
    make('input', 'Text Input', 'Primitives'),
    make('card', 'Card', 'Layout'),
    make('counter', 'Counter'),
  ]).groups();

describe('filterGroups', () => {
  it('returns everything for an empty query', () => {
    expect(filterGroups(groups(), '').map(([name]) => name)).toEqual(['Primitives', 'Layout', 'Other']);
  });

  it('matches title, id and group, ignoring case and spaces', () => {
    const ids = (q: string) =>
      filterGroups(groups(), q).flatMap(([, entries]) => entries.map((e) => e.id));
    expect(ids(' BUT ')).toEqual(['button']);
    expect(ids('text')).toEqual(['input']);
    expect(ids('layout')).toEqual(['card']);
    expect(ids('zzz')).toEqual([]);
  });
});

describe('Sidebar', () => {
  const setup = (selectedId?: string) => {
    const onSelect = vi.fn();
    render(<Sidebar groups={groups()} selectedId={selectedId} onSelect={onSelect} />);
    return { onSelect, search: screen.getByLabelText('Search components') as HTMLInputElement };
  };

  it('lists groups as headings, with Other last', () => {
    setup();
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Primitives',
      'Layout',
      'Other',
    ]);
  });

  it('selects an entry on click and marks the current one', () => {
    const { onSelect } = setup('card');
    fireEvent.click(screen.getByRole('button', { name: 'Counter' }));
    expect(onSelect).toHaveBeenCalledWith('counter');
    expect(screen.getByRole('button', { name: 'Card' }).getAttribute('aria-current')).toBe('true');
    expect(screen.getByRole('button', { name: 'Button' }).getAttribute('aria-current')).toBeNull();
  });

  it('filters while typing and hides empty groups', () => {
    const { search } = setup();
    fireEvent.change(search, { target: { value: 'text' } });
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Text Input']);
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Primitives']);
  });

  it('says so when nothing matches', () => {
    const { search } = setup();
    fireEvent.change(search, { target: { value: 'zzz' } });
    expect(screen.getByRole('status').textContent).toBe('No matching components.');
  });

  it('says so when nothing is registered', () => {
    render(<Sidebar groups={createRegistry().groups()} onSelect={() => {}} />);
    expect(screen.getByRole('status').textContent).toBe('No components registered yet.');
  });

  it('moves focus with the arrow keys, Home and End', () => {
    const { search } = setup();
    const item = (name: string) => screen.getByRole('button', { name });
    search.focus();

    fireEvent.keyDown(search, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(item('Button'));

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(item('Text Input'));

    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(document.activeElement).toBe(item('Counter'));

    fireEvent.keyDown(document.activeElement!, { key: 'Home' });
    expect(document.activeElement).toBe(item('Button'));

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(search);
  });

  it('leaves Home and End alone inside the search box', () => {
    const { search } = setup();
    search.focus();
    const notPrevented = fireEvent.keyDown(search, { key: 'End' });
    expect(notPrevented).toBe(true);
    expect(document.activeElement).toBe(search);
  });
});