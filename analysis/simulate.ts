import balanceData from '@data/balance.json';
import bossesData from '@data/bosses.json';
import itemsData from '@data/items.json';
import { GameService } from '../src/game';
import { SeededRng } from '../src/engine';
import type { BalanceData, BiomeDefinition, ItemDefinition, MetaState } from '../src/types';
import { writeFileSync } from 'node:fs';

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

const game = new GameService(balance, biomes, items);

interface ResultRow {
  seed: number;
  biome: string;
  victory: boolean;
  floors: number;
  damage: number;
  calls: number;
  coins: number;
}

const results: ResultRow[] = [];

for (let i = 0; i < 1000; i += 1) {
  const seed = 1000 + i;
  const rng = new SeededRng(seed);
  let run = game.createRun(meta, rng, { seed, biomeId: meta.unlocks.biomes[i % meta.unlocks.biomes.length] });
  while (!run.summary) {
    const outcome = game.callNext(meta, run, rng);
    run = outcome.state;
    if (run.summary) break;
    if (run.callsMade > run.callCap * 2) {
      run.summary = {
        victory: false,
        floorsCleared: run.floorIndex,
        damageDealt: run.metrics?.damageDealt ?? 0,
        callsMade: run.callsMade,
        itemsCollected: run.metrics?.itemsCollected ?? 0,
        statusesApplied: run.metrics?.statusesApplied ?? 0,
        coinsEarned: run.metrics?.coinsEarned ?? 0
      };
    }
  }
  if (!run.summary) continue;
  results.push({
    seed,
    biome: run.biomeId,
    victory: run.summary.victory,
    floors: run.summary.floorsCleared,
    damage: run.summary.damageDealt,
    calls: run.summary.callsMade,
    coins: run.summary.coinsEarned
  });
}

const csv = [
  'seed,biome,victory,floors,damage,calls,coins',
  ...results.map((row) => `${row.seed},${row.biome},${row.victory ? 1 : 0},${row.floors},${row.damage},${row.calls},${row.coins}`)
].join('\n');

writeFileSync(new URL('./sim-results.csv', import.meta.url), csv);
