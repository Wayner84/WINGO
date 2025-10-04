import '../style.css';

import { engine } from './engine';
import { UIManager } from './ui';

function mount(): void {
  const root = document.getElementById('app');
  if (!root) {
    throw new Error('Root element not found');
  }

  const ui = new UIManager();
  ui.mount(root);

  if ('serviceWorker' in navigator) {
    const swUrl = new URL('./sw.js', window.location.href);
    navigator.serviceWorker.register(swUrl).catch(() => {
      /* ignore */
    });
  }

  // Expose engine for debugging
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).rogueBingo = { engine };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}
