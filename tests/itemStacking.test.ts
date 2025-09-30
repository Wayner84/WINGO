import { describe, expect, it } from 'vitest';
import balanceData from '@data/balance.json';
import bossesData from '@data/bosses.json';
import itemsData from '@data/items.json';
import { GameService } from '../src/game';
import type { BalanceData, BiomeDefinition, ItemDefinition, MetaState } from '../src/types';
import { SeededRng } from '../src/engine';

const balance = balanceData as BalanceData;
const biomes = bossesData as Record<string, BiomeDefinition>;
const items = itemsData as ItemDefinition[];

const meta: MetaState = {
  version: 1,
  xp: 0,
  unlocks: {
    biomes: Object.keys(biomes),
    items: items.map((item) => item.id)
  },
  stats: { runs: 0, victories: 0, bestFloor: 0 },
  codex: { items: [], bosses: [], statuses: [] },
  settings: { reducedMotion: false, colorPalette: 'default' }
};

describe('Inventory stacking', () => {
  it('increments quantity when buying duplicate relics', () => {
    const game = new GameService(balance, biomes, items);
    const rng = new SeededRng(7);
    let run = game.createRun(meta, rng, { seed: 7, biomeId: 'crypt', difficultyId: 'easy' });
    const relic = items.find((item) => item.id === 'lucky-charm');
    if (!relic) throw new Error('Missing lucky charm');
    run.player.coins = 20;
    run.shop = [
      { item: relic, price: 5, sold: false }
    ];
    run = game.buyItem(meta, run, relic.id);
    expect(run.inventory.find((i) => i.def.id === relic.id)?.quantity).toBe(1);
    run.player.coins = 20;
    run.shop = [
      { item: relic, price: 5, sold: false }
    ];
    run = game.buyItem(meta, run, relic.id);
    expect(run.inventory.find((i) => i.def.id === relic.id)?.quantity).toBe(2);
  });
});
