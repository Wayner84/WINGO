# Balance Reference

## Global Constants

- **Call cap**: `callCapBase` (30) with `callCapPerFloor` (-2). Adjust to tune pacing.
- **Preview**: `previewBase` (2). Additional previews gained via relics, events, modifiers.
- **Combo**: `combo.hitBonus` (1 per stack) and `combo.lineBonus` (2). Max combo = 5.
- **Damage Baseline**:
  - Hit: 1 per matched cell
  - Single line: +6
  - Double line: +12
  - Triple line: +20
  - Bingo (4+ lines): +34

## Adaptive Difficulty

Defined in `balance.adaptive`:

- `threatStart`: 1.0 base multiplier.
- `thresholds`: [0.6, 0.9, 1.2] — ratio of callsMade / callCap.
- `bossMultiplier`: 0.18 — added when player is inefficient (>1.2).
- `playerReward`: 0.4 — subtract when player is efficient (<0.6).

Threat influences boss HP via `scaledBossHp` and counter damage.

## Floor Modifiers

| ID | Effect |
|----|--------|
| fog-of-war | Preview -1, tooltips hidden until marked.
| wild-magic | Random status (burn/chill/vulnerable/ooze) applied each call.
| blessing | Start with combo 1, heal 1 heart.

Probability: 40% chance per floor (except first) to roll a modifier.

## Shop Economy

- Base reroll cost: 3 coins (reduced to 2 with Seer Lens).
- Shop offers 3 items biased by biome `shopTags`.
- Prices equal `item.cost` minus discounts; never below 1.

## Status Effects

- **Burn**: Applies `stacks` damage per call, decays by 1 duration.
- **Chill**: Reduces/negates counterattack for duration.
- **Vulnerable**: +20% damage multiplier (applied via curse).
- **Fury**: Bonus triggered next line (abstracted via relics/events).

## Meta Unlocks

| Threshold XP | Unlock |
|--------------|--------|
| 8 | Ember Shard |
| 15 | Emberforge biome |
| 18 | Seer's Lens |
| 28 | Frost Lantern |
| 35 | Aurora biome |
| 45 | Cursed Brand |

Tweak XP formula or thresholds to adjust campaign length.
