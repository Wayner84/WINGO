# Agents Guide — Rogue-Like Bingo

This repo uses agent roles to structure development.

## 1. Architect
- Split single-file HTML into modular project.
- Set up Vite, npm scripts, and GitHub Actions.
- Ensure build runs: `npm i && npm run dev && npm run build`.

## 2. Game Designer
- Define item/relic catalog in `/data/items.json`.
- Expand bosses and biomes in `/data/bosses.json`.
- Balance curves in `/data/balance.json`.
- Draft `GAME_DESIGN_SPEC.md`.

## 3. Content Engineer
- Implement mechanics: status effects, curses, consumables, events.
- Add adaptive difficulty & floor modifiers.
- Ensure shop & inventory systems handle stacking properly.

## 4. Visuals & UX
- Move styles to `style.css`.
- Generate SVG/canvas assets for items & bosses.
- Add responsive layout, tooltips, codex, title screen, summary screen.

## 5. Meta Progression
- Add unlock tree: new relics, bosses, biomes.
- Save meta progression separately from run state.
- Implement export/import of save JSON.

## 6. QA & Balance
- Create tests for RNG, items, boss HP scaling.
- Add simulation script for 1000 runs, dump CSVs to `/analysis`.
- Tune `data/balance.json`.

## 7. Documentation
- Update `README.md` with install/run instructions.
- Add screenshots/gifs of gameplay.
- Maintain `CHANGELOG.md`, `CONTRIBUTING.md`.

---

### Run Order
Architect → Designer → Content → Visuals → Meta → QA → Docs

### Coding Style
- TypeScript preferred.
- Data-driven (items, bosses, balance).
- No magic numbers; use JSON data files.
- Deterministic RNG for seeds/daily runs.
