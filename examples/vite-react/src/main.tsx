import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createRegistry } from '@atlis/deract';
import { Playground } from '@atlis/deract/playground';

import '@atlis/deract/styles.css';
import '@atlis/deract/fonts.css'; // optional — Space Grotesk wordmark; drop to save bytes
import './styles.css';

import { button } from './entries/button';
import { counter } from './entries/counter';
import { gsapBox } from './entries/gsap-box';

const registry = createRegistry([button, counter, gsapBox]);

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root not found');
createRoot(rootEl).render(
  <StrictMode>
    <Playground registry={registry} title="Deract playground" />
  </StrictMode>,
);