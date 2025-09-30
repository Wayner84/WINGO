import { engine } from './engine';
import { UIManager } from './ui';

const root = document.getElementById('app');
if (!root) {
  throw new Error('Root element not found');
}

const ui = new UIManager();
ui.mount(root);

if ('serviceWorker' in navigator) {
  // Optional: register a noop service worker for GitHub Pages caching
  navigator.serviceWorker.register('/sw.js').catch(() => {
    /* ignore */
  });
}

// Expose engine for debugging
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).rogueBingo = { engine };
