# Rogue-Like Bingo — Design Spec

## Core Loop

1. Select a biome. Each biome defines a palette, boss list, shop tags, and event table.
2. Generate a 5×5 bingo board using seeded RNG. Players call numbers to mark cells automatically.
3. Completing lines damages the floor boss. Combo chains and relics amplify damage.
4. Defeat the boss before the call cap expires. Earn coins, visit shops, and resolve events between floors.
5. Meta XP unlocks new biomes, relics, and codex entries. Persistent settings carry across runs.

## Biomes

| ID | Name | Palette | Bosses | Events | Notes |
|----|------|---------|--------|--------|-------|
| crypt | Gloom Crypt | verdant | Dungeon Slime → Catacomb Lich | shrine, mystery, fortune-teller | Tutorial biome; healing + curse interactions. |
| emberforge | Emberforge | ember | Molten Golem → Phoenix Warmind | forge, smuggler, mystery | Burn-heavy enemies and damage relics. |
| aurora | Aurora Sanctum | default | Frost Titan → Aurora Harbinger | shrine, mystery, aurora | Vision and chill mechanics dominate. |

Each biome supplies three shop tags that bias item pools and a themed floor modifier chance.

## Bosses

- **Dungeon Slime**: High HP sponge that introduces ooze status.
- **Catacomb Lich** (elite): Applies curses and higher damage counterattacks.
- **Molten Golem**: Burn-centric, moderate HP.
- **Phoenix Warmind** (elite): Burn + rebirth mechanic; players must finish quickly.
- **Frost Titan**: Applies chill, slowing counterattacks.
- **Aurora Harbinger** (elite): Alternates chill and vulnerability pulses.

Boss stats scale via `balance.adaptive` threat adjustments and per-floor multipliers.

## Items & Relics

Rarities: common, uncommon, rare, epic, legendary. Types: relic (passive), consumable (single-use), curse (negative passive).

Notable relics:

- **Arcane Dauber** (rare): +2 damage per combo tier.
- **Lucky Charm** (uncommon): +1 preview (+1 extra with other luck tags).
- **Cursed Brand** (epic curse): Adds Vulnerable to boss, damages player on whiff.
- **Healing Brew** (common consumable): Restore 1–2 hearts.
- **Frost Lantern** (legendary): Adds Chill on line clears.
- **Seer's Lens** (rare): +2 preview and cheaper rerolls.
- **Ember Shard** (uncommon): First line inflicts Burn ×3.

Items are data-driven (`data/items.json`). Inventory stacks by ID; curses cannot be consumed.

## Events

Events live in `EVENT_LIBRARY` and can award coins, apply statuses, unlock biomes, or hand out items.

- **Star Shrine**: Trade coins for healing/combo or sacrifice a heart for a relic.
- **Mysterious Door**: Gambles coins vs. curses or grants daubers.
- **Magma Forge**: Adds Fury buff or burn to boss.
- **Gremlin Smuggler**: Rare item purchase or unlock Emberforge.
- **Fortune Teller**: Adds previews or unlocks Seer Lens.
- **Aurora Beacon**: Heal & chill or unlock Aurora Sanctum.

Events are shown in UI with descriptive tooltips and requirement checks.

## Floor Modifiers

Defined in `data/balance.json`:

- **Fog of War**: -1 preview, hide tooltips.
- **Wild Magic**: Random statuses on calls.
- **Blessing**: Start with combo 1 and heal 1 heart.

Higher floors have increased chance to roll a modifier.

## Status Effects

- **Burn**: Damage over time, decays per turn.
- **Chill**: Skip boss counterattacks while duration > 0.
- **Ooze**: Reduces boss damage (flavor effect handled in narrative).
- **Curse**: Negative state on player; tracked for codex.
- **Vulnerable**: Increases subsequent damage.
- **Rebirth**: Boss-specific threat (handled in elite logic).
- **Shield**: Grants combo bump when free-marked.
- **Fury**: Next line deals bonus damage.
- **Vision**: Temporary preview bonus.

## Meta Progression

- XP gained = `floorsCleared * 5 + (victory ? 10 : 0)`.
- Unlock thresholds:
  - 8 XP → Ember Shard relic
  - 15 XP → Emberforge biome
  - 18 XP → Seer's Lens relic
  - 28 XP → Frost Lantern relic
  - 35 XP → Aurora biome
  - 45 XP → Cursed Brand curse
- Codex tracks seen items, bosses, statuses.
- Settings: reduced motion toggle, palette selection.

## Adaptive Difficulty

Threat level starts at 1.0 and adjusts per floor based on call efficiency. Threat modifies boss HP and counter damage. Wild modifiers and curses introduce dynamic challenge scaling.

## Victory & Summary

Upon defeating final biome boss, display summary modal with metrics:
- Floors cleared
- Damage dealt
- Calls made
- Items collected
- Status effects applied
- Coins earned

Players can export save JSON or continue meta progression into new runs.
