# Rogue-Like Bingo

A modernized rework of the single-file prototype into a feature-complete, data-driven roguelike bingo built with Vite + TypeScript.

![Game layout](assets/screenshots/overview.svg)

## Highlights

- Multiple biomes with bespoke boss pools, palettes, and shop inventories.
- Expanded relic catalog including synergies, curses, consumables, and adaptive rarity unlocks.
- Meta-progression with XP-based unlocks, codex tracking, and export/importable save files.
- Events, shrines, mystery encounters, and floor modifiers that twist each run.
- Accessibility-first UI with responsive layout, tooltip-rich interactions, and reduced-motion support.

## Getting Started

```bash
npm install
npm run dev
```

Open the printed URL to play locally. The game persists run data and meta progression via `localStorage`.

### Building

```bash
npm run build
```

The optimized site is emitted to `dist/` and can be deployed directly to GitHub Pages.

### Testing

```bash
npm run test        # Vitest unit tests
npm run test:e2e    # Playwright smoke test (requires browsers via `npx playwright install`)
```

## Project Structure

```
src/
  engine.ts   # Game loop, saves, RNG, input binding
  game.ts     # Core game systems, combat, shop, events
  ui.ts       # DOM rendering, tooltips, menus, accessibility helpers
  main.ts     # Entrypoint wiring engine + UI
assets/       # SVG icons and screenshots
data/         # JSON definitions for items, bosses, balance
public/       # Static service worker for caching
```

## Contributing

1. Fork and clone the repository.
2. Create feature branches for new content or mechanics.
3. Run linting and tests before opening a pull request.

Refer to `GAME_DESIGN_SPEC.md`, `docs/Balance.md`, and `agents.md` for design guidelines, balance knobs, and contributor responsibilities.

## License

MIT
