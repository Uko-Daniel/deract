export interface ViewportPreset {
  id: string;
  label: string;
  width: number | null; // null = fit the available space
  height?: number | null;
}

export const viewportPresets: readonly ViewportPreset[] = [
  { id: 'phone', label: 'Phone', width: 360 },
  { id: 'tablet', label: 'Tablet', width: 768 },
  { id: 'desktop', label: 'Desktop', width: 1280 },
  { id: 'fit', label: 'Fit', width: null },
];