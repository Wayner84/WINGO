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

const testMeta = (): MetaState => ({
  version: 1,
  xp: 0,
  unlocks: {
    biomes: Object.keys(biomes),
    items: items.map((item) => item.id)
  },
  stats: { runs: 0, victories: 0, bestFloor: 0 },
  codex: { items: [], bosses: [], statuses: [] },
  settings: { reducedMotion: false, colorPalette: 'default' }
});

describe('Damage resolution', () => {
  it('awards line damage when a row is completed', () => {
    const game = new GameService(balance, biomes, items);
    const meta = testMeta();
    const rng = new SeededRng(99);
    let run = game.createRun(meta, rng, { seed: 99, biomeId: 'crypt' });
    run.deck = [7, 12, 15];
    run.preview = [];
    // Force top row to create a bingo on 7
    for (let i = 0; i < 5; i += 1) {
      run.board[i].number = 7;
      run.board[i].marked = false;
    }
    const { state, damage } = game.callNext(meta, run, rng);
    expect(damage).toBeGreaterThanOrEqual(balance.damage.lineSingle);
    expect(state.boss.hp).toBeLessThan(run.boss.hp);
  });

  it('applies relic modifiers to damage', () => {
    const game = new GameService(balance, biomes, items);
    const meta = testMeta();
    const rng = new SeededRng(23);
    let run = game.createRun(meta, rng, { seed: 23, biomeId: 'crypt' });
    const arcane = items.find((item) => item.id === 'arcane-dauber');
    if (!arcane) throw new Error('Arcane Dauber missing');
    run.inventory.push({ def: arcane, quantity: 1 });
    run.deck = [9];
    run.preview = [];
    run.player.combo = 2;
    run.board[0].number = 9;
    run.board[0].marked = false;
    const { damage } = game.callNext(meta, run, rng);
    expect(damage).toBeGreaterThan(balance.damage.hit);
  });
});
