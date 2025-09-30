# Contributing

Thanks for helping expand Rogue-Like Bingo! To keep the project consistent and maintainable, follow these guidelines:

1. **Set up** — `npm install` then `npm run dev` to verify local builds. Install Playwright browsers if you run e2e tests (`npx playwright install`).
2. **Branches** — create feature branches per change. Avoid committing directly to `main`.
3. **Data-driven content** — add new bosses/items/events via JSON (`data/`). Update the design spec (`GAME_DESIGN_SPEC.md`) when content changes.
4. **Testing** — run `npm run test` and `npm run test:e2e` before submitting PRs. Add new unit tests for gameplay systems you touch.
5. **Style** — stick to TypeScript, avoid magic numbers, prefer descriptive names. UI tweaks should remain accessible (respect color contrast and reduced-motion setting).
6. **Docs** — update README, design spec, and balance notes when introducing mechanics or tuning numbers.

Open a pull request summarizing changes and include screenshots for UX updates. The CI workflow requires lint, unit tests, e2e tests, and build to pass.
