import balanceData from '@data/balance.json';
import bossesData from '@data/bosses.json';
import itemsData from '@data/items.json';
import assetManifest from '@assets/manifest.json';
import { GameService, type RNG } from './game';
import type {
  BalanceData,
  BiomeDefinition,
  EngineListener,
  EngineSnapshot,
  ItemDefinition,
  MetaState,
  RunState,
  RunSummary,
  DifficultyId
} from './types';

const META_KEY = 'rogue-bingo-meta';
const RUN_KEY = 'rogue-bingo-run';
const META_VERSION = 1;

const balance = balanceData as BalanceData;
const biomes = bossesData as Record<string, BiomeDefinition>;
const items = itemsData as ItemDefinition[];
const assets = Object.fromEntries(
  Object.entries(assetManifest as Record<string, string>).map(([id, path]) => [
    id,
    new URL(`../assets/${path}`, import.meta.url).href
  ])
);

export class SeededRng implements RNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  serialize(): number {
    return this.state;
  }

  restore(value: number): void {
    this.state = value >>> 0;
  }

  next(): number {
    this.state += 0x6d2b79f5;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(max: number): number {
    return Math.floor(this.next() * max);
  }

  pick<T>(arr: T[]): T {
    return arr[this.int(arr.length) || 0];
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = this.int(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

const defaultMeta = (): MetaState => ({
  version: META_VERSION,
  xp: 0,
  unlocks: {
    biomes: ['crypt'],
    items: ['aurora-draft', 'healing-brew', 'free-space-charm', 'lucky-charm', 'arcane-dauber']
  },
  stats: {
    runs: 0,
    victories: 0,
    bestFloor: 0
  },
  codex: {
    items: [],
    bosses: [],
    statuses: []
  },
  settings: {
    reducedMotion: false,
    colorPalette: 'default'
  }
});

interface PersistedRun {
  run: ReturnType<GameService['serialize']>;
  rng: number;
}

export class Engine {
  private readonly listeners: Set<EngineListener> = new Set();
  private readonly game = new GameService(balance, biomes, items);
  private rng: SeededRng = new SeededRng(Date.now());
  private meta: MetaState = defaultMeta();
  private run?: RunState;
  private view: EngineSnapshot['view'] = 'title';
  private summaryGranted = false;

  constructor() {
    this.meta = this.loadMeta();
    const persisted = this.loadRun();
    if (persisted) {
      this.rng.restore(persisted.rng);
      this.run = this.game.deserialize(persisted.run, this.meta);
      this.view = 'title';
    }
    this.applySettings();
    this.registerInput();
    this.emit();
  }

  on(listener: EngineListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  snapshot(): EngineSnapshot {
    return {
      view: this.view,
      run: this.run,
      meta: this.meta,
      assets
    };
  }

  startNewRun(biomeId: string, difficultyId: DifficultyId): void {
    const seed = Math.floor(Math.random() * 2 ** 32);
    this.rng = new SeededRng(seed);
    this.run = this.game.createRun(this.meta, this.rng, { seed, biomeId, difficultyId });
    this.summaryGranted = false;
    this.view = 'game';
    this.saveRun();
    this.emit();
  }

  continueRun(): void {
    if (!this.run) return;
    this.view = 'game';
    this.emit();
  }

  openTitle(): void {
    this.view = 'title';
    this.emit();
  }

  openSettings(): void {
    this.view = 'settings';
    this.emit();
  }

  openCodex(): void {
    this.view = 'codex';
    this.emit();
  }

  openSummary(): void {
    if (this.run?.summary) {
      this.view = 'summary';
      this.emit();
    }
  }

  callNext(): void {
    if (!this.run) return;
    const result = this.game.callNext(this.meta, this.run, this.rng);
    this.run = result.state;
    this.checkSummary();
    this.saveRun();
    this.emit();
  }

  useFreeDauber(cellId: string): void {
    if (!this.run) return;
    this.run = this.game.freeMark(this.run, cellId);
    this.saveRun();
    this.emit();
  }

  useBomb(): void {
    if (!this.run) return;
    this.run = this.game.useBomb(this.meta, this.run, this.rng);
    this.checkSummary();
    this.saveRun();
    this.emit();
  }

  advanceFloor(): void {
    if (!this.run) return;
    this.run = this.game.advanceFloor(this.meta, this.run, this.rng);
    this.checkSummary();
    this.saveRun();
    this.emit();
  }

  buyItem(itemId: string): void {
    if (!this.run) return;
    this.run = this.game.buyItem(this.meta, this.run, itemId);
    this.saveRun();
    this.emit();
  }

  useItem(itemId: string): void {
    if (!this.run) return;
    this.run = this.game.useItem(this.meta, this.run, itemId, this.rng);
    this.checkSummary();
    this.saveRun();
    this.emit();
  }

  rerollShop(): void {
    if (!this.run) return;
    this.run = this.game.rerollShop(this.meta, this.run, this.rng);
    this.saveRun();
    this.emit();
  }

  skipShop(): void {
    if (!this.run) return;
    this.run = this.game.skipShop(this.run);
    this.saveRun();
    this.emit();
  }

  resolveEvent(eventId: string, optionId: string): void {
    if (!this.run) return;
    this.run = this.game.resolveEvent(this.meta, this.run, eventId, optionId, this.rng);
    this.saveRun();
    this.emit();
  }

  exportSave(): string {
    const payload = {
      meta: this.meta,
      run: this.run ? { run: this.game.serialize(this.run), rng: this.rng.serialize() } : null
    };
    return JSON.stringify(payload, null, 2);
  }

  importSave(serialized: string): void {
    const data = JSON.parse(serialized) as { meta: MetaState; run?: PersistedRun | null };
    this.meta = this.migrateMeta(data.meta);
    if (data.run && data.run.run) {
      this.run = this.game.deserialize(data.run.run, this.meta);
      this.rng.restore(data.run.rng);
      this.summaryGranted = Boolean(this.run.summary);
    }
    this.saveMeta();
    this.saveRun();
    this.emit();
  }

  deleteRun(): void {
    this.run = undefined;
    this.summaryGranted = false;
    localStorage.removeItem(RUN_KEY);
    this.emit();
  }

  updateSettings(settings: Partial<MetaState['settings']>): void {
    this.meta.settings = { ...this.meta.settings, ...settings };
    this.applySettings();
    this.saveMeta();
    this.emit();
  }

  completeSummaryAcknowledged(): void {
    if (!this.run?.summary) return;
    this.updateMetaAfterRun(this.run.summary);
    this.deleteRun();
    this.summaryGranted = false;
    this.view = 'title';
    this.emit();
  }

  private registerInput(): void {
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Space') {
        event.preventDefault();
        if (this.view === 'game') {
          this.callNext();
        }
      }
    });
  }

  private checkSummary(): void {
    if (!this.run?.summary || this.summaryGranted) return;
    this.updateMetaAfterRun(this.run.summary);
    this.summaryGranted = true;
    this.saveMeta();
  }

  private applySettings(): void {
    if (typeof document === 'undefined') return;

    const apply = (): void => {
      const body = document.body;
      if (!body) return;
      body.classList.toggle('reduced-motion', this.meta.settings.reducedMotion);
      body.dataset.palette = this.meta.settings.colorPalette;
    };

    if (!document.body || document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', apply, { once: true });
      return;
    }

    apply();
  }

  private emit(): void {
    const snapshot = this.snapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  private loadMeta(): MetaState {
    try {
      const raw = localStorage.getItem(META_KEY);
      if (!raw) return defaultMeta();
      const parsed = JSON.parse(raw) as MetaState;
      return this.migrateMeta(parsed);
    } catch (error) {
      console.warn('Failed to load meta progression', error);
      return defaultMeta();
    }
  }

  private migrateMeta(meta: MetaState): MetaState {
    const merged = { ...defaultMeta(), ...meta };
    merged.version = META_VERSION;
    merged.unlocks.biomes = Array.from(new Set(merged.unlocks.biomes.concat(['crypt'])));
    merged.unlocks.items = Array.from(
      new Set(
        merged.unlocks.items.concat([
          'aurora-draft',
          'healing-brew',
          'free-space-charm',
          'lucky-charm',
          'arcane-dauber'
        ])
      )
    );
    return merged;
  }

  private loadRun(): PersistedRun | null {
    try {
      const raw = localStorage.getItem(RUN_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PersistedRun;
      return parsed;
    } catch (error) {
      console.warn('Failed to load run', error);
      return null;
    }
  }

  private saveMeta(): void {
    localStorage.setItem(META_KEY, JSON.stringify(this.meta));
  }

  private saveRun(): void {
    if (!this.run) {
      localStorage.removeItem(RUN_KEY);
      this.summaryGranted = false;
      return;
    }
    const payload: PersistedRun = { run: this.game.serialize(this.run), rng: this.rng.serialize() };
    localStorage.setItem(RUN_KEY, JSON.stringify(payload));
  }

  private updateMetaAfterRun(summary: RunSummary): void {
    this.meta.stats.runs += 1;
    if (summary.victory) {
      this.meta.stats.victories += 1;
    }
    this.meta.stats.bestFloor = Math.max(this.meta.stats.bestFloor, summary.floorsCleared);
    const gainedXp = summary.floorsCleared * 5 + (summary.victory ? 10 : 0);
    this.meta.xp += gainedXp;
    this.applyUnlocks();
    this.saveMeta();
  }

  private applyUnlocks(): void {
    const biomeUnlocks: [number, string][] = [
      [15, 'emberforge'],
      [35, 'aurora'],
      [55, 'swamp'],
      [75, 'dunes'],
      [95, 'reef'],
      [120, 'sky'],
      [150, 'clockwork']
    ];
    for (const [threshold, biome] of biomeUnlocks) {
      if (this.meta.xp >= threshold && !this.meta.unlocks.biomes.includes(biome)) {
        this.meta.unlocks.biomes.push(biome);
      }
    }
    const unlockMap: [number, string][] = [
      [8, 'embershard'],
      [18, 'seer-lens'],
      [28, 'frost-lantern'],
      [45, 'cursed-brand']
    ];
    for (const [threshold, itemId] of unlockMap) {
      if (this.meta.xp >= threshold && !this.meta.unlocks.items.includes(itemId)) {
        this.meta.unlocks.items.push(itemId);
      }
    }
  }
}

export const engine = typeof window !== 'undefined' ? new Engine() : (null as unknown as Engine);
