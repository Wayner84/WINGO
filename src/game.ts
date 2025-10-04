import type {
  ActiveEvent,
  BalanceData,
  BiomeDefinition,
  BoardCell,
  BossDefinition,
  BossState,
  EventDefinition,
  EventEffect,
  FloorModifierState,
  InventoryItem,
  ItemDefinition,
  MetaState,
  PlayerState,
  RunState,
  RunSummary,
  ShopOffer,
  StatusEffectId,
  StatusEffectState,
  DifficultyId,
  DifficultySettings,
  EncounterModifierState,
  Rarity
} from './types';

export interface RNG {
  next(): number;
  int(max: number): number;
  pick<T>(arr: T[]): T;
  shuffle<T>(arr: T[]): T[];
}

const clone = <T>(value: T): T =>
  typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));

const lineCache = new Map<number, number[][]>();

function getLineIndices(size: number): number[][] {
  if (lineCache.has(size)) return lineCache.get(size)!;
  const lines: number[][] = [];
  for (let r = 0; r < size; r += 1) {
    lines.push(Array.from({ length: size }, (_, c) => r * size + c));
  }
  for (let c = 0; c < size; c += 1) {
    lines.push(Array.from({ length: size }, (_, r) => r * size + c));
  }
  lines.push(Array.from({ length: size }, (_, i) => i * (size + 1)));
  lines.push(Array.from({ length: size }, (_, i) => (i + 1) * (size - 1)));
  lineCache.set(size, lines);
  return lines;
}

function getCenterIndex(size: number): number {
  return Math.floor((size * size) / 2);
}

function createBoardNumbers(
  rng: RNG,
  balance: BalanceData,
  boardSize: number,
  distinct: number,
  floor: number
): number[] {
  const perColumn = balance.board.numbersPerColumn;
  const allNumbers: number[] = [];
  for (let c = 0; c < boardSize; c += 1) {
    const start = c * perColumn + 1;
    for (let i = 0; i < perColumn; i += 1) {
      allNumbers.push(start + i);
    }
  }
  rng.shuffle(allNumbers);
  const maxCells = boardSize * boardSize;
  const growth = Math.ceil(boardSize / 2) * floor;
  const uniqueCount = Math.min(maxCells, distinct + growth);
  const pool = allNumbers.slice(0, Math.max(1, uniqueCount));
  const numbers: number[] = [];
  let index = 0;
  while (numbers.length < maxCells) {
    numbers.push(pool[index % pool.length]);
    index += 1;
  }
  rng.shuffle(numbers);
  return numbers;
}

function buildBoard(numbers: number[], balance: BalanceData, boardSize: number): BoardCell[] {
  const columns = balance.board.columns.slice(0, boardSize);
  const center = getCenterIndex(boardSize);
  return numbers.map((value, index) => ({
    id: `cell-${index}`,
    number: value,
    marked: false,
    free: index === center,
    column: columns[index % boardSize]
  }));
}

function shuffleDeck(rng: RNG, balance: BalanceData, boardSize: number): number[] {
  const perColumn = balance.board.numbersPerColumn;
  const deck: number[] = [];
  for (let c = 0; c < boardSize; c += 1) {
    const start = c * perColumn + 1;
    for (let i = 0; i < perColumn; i += 1) {
      deck.push(start + i);
    }
  }
  return rng.shuffle(deck);
}

function rarityValue(rarity: Rarity): number {
  switch (rarity) {
    case 'legendary':
      return 4;
    case 'rare':
      return 3;
    case 'uncommon':
      return 2;
    default:
      return 1;
  }
}

export const EVENT_LIBRARY: Record<string, EventDefinition> = {
  shrine: {
    id: 'shrine',
    name: 'Star Shrine',
    description: 'Trade offerings for blessings.',
    options: [
      {
        id: 'pray',
        label: 'Pray (3 coins)',
        description: 'Heal 1 heart and gain +1 combo.',
        requires: { coins: 3 },
        effect: [
          { coins: -3 },
          { hearts: 1 },
          { combo: 1 }
        ]
      },
      {
        id: 'sacrifice',
        label: 'Sacrifice',
        description: 'Lose 1 heart, gain a relic.',
        effect: [
          { hearts: -1 },
          { item: 'arcane-dauber' }
        ]
      }
    ]
  },
  mystery: {
    id: 'mystery',
    name: 'Mysterious Door',
    description: 'Anything could be inside.',
    options: [
      {
        id: 'open',
        label: 'Open the door',
        description: 'Random reward or curse.',
        effect: [
          { coins: 5 },
          { status: { target: 'player', id: 'curse', stacks: 1, duration: 3 } }
        ]
      },
      {
        id: 'leave',
        label: 'Leave it',
        description: 'Gain a free dauber.',
        effect: [{ freeDaubers: 1 }]
      }
    ]
  },
  forge: {
    id: 'forge',
    name: 'Magma Forge',
    description: 'Temper your equipment.',
    options: [
      {
        id: 'temper',
        label: 'Temper (2 coins)',
        description: 'Next line deals +5 damage.',
        requires: { coins: 2 },
        effect: [{ coins: -2 }, { status: { target: 'player', id: 'fury', stacks: 1, duration: 1 } }]
      },
      {
        id: 'ignite',
        label: 'Ignite',
        description: 'Inflict burn on the boss.',
        effect: [{ status: { target: 'boss', id: 'burn', stacks: 3, duration: 3 } }]
      }
    ]
  },
  smuggler: {
    id: 'smuggler',
    name: 'Gremlin Smuggler',
    description: 'Rare goods for those who pay.',
    options: [
      {
        id: 'buy',
        label: 'Buy contraband (5 coins)',
        requires: { coins: 5 },
        description: 'Gain a random rare item.',
        effect: [{ coins: -5 }, { item: 'frost-lantern' }]
      },
      {
        id: 'threaten',
        label: 'Threaten',
        description: 'Unlock Emberforge permanently.',
        effect: [{ unlockBiome: 'emberforge' }]
      }
    ]
  },
  'fortune-teller': {
    id: 'fortune-teller',
    name: 'Fortune Teller',
    description: 'She peers into the next draws.',
    options: [
      {
        id: 'tip',
        label: 'Tip 2 coins',
        requires: { coins: 2 },
        description: 'Gain +2 preview this floor.',
        effect: [{ coins: -2 }, { status: { target: 'player', id: 'vision', stacks: 2, duration: 2 } }]
      },
      {
        id: 'learn',
        label: 'Learn a secret',
        description: 'Unlock the Seer Lens relic.',
        effect: [{ unlockItem: 'seer-lens' }]
      }
    ]
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora Beacon',
    description: 'Radiant energy courses through you.',
    options: [
      {
        id: 'absorb',
        label: 'Absorb',
        description: 'Heal 1 heart and gain chill power.',
        effect: [{ hearts: 1 }, { status: { target: 'boss', id: 'chill', stacks: 1, duration: 2 } }]
      },
      {
        id: 'channel',
        label: 'Channel outward',
        description: 'Unlock Aurora Sanctum.',
        effect: [{ unlockBiome: 'aurora' }]
      }
    ]
  }
};

export interface RunCreationOptions {
  seed: number;
  biomeId: string;
  difficultyId: DifficultyId;
}

interface SerializedRun {
  state: RunState;
}

export class GameService {
  constructor(
    private readonly balance: BalanceData,
    private readonly biomes: Record<string, BiomeDefinition>,
    private readonly items: ItemDefinition[]
  ) {}

  createRun(meta: MetaState, rng: RNG, options: RunCreationOptions): RunState {
    const biome = this.biomes[options.biomeId];
    const difficulty = this.balance.difficulties[options.difficultyId];
    if (!biome || !difficulty) {
      throw new Error('Invalid run configuration');
    }
    const boardSize = difficulty.boardSize;
    const boss = this.createBoss(biome.floors[0], 0, this.balance.adaptive.threatStart);
    const deck = shuffleDeck(rng, this.balance, boardSize);
    const boardNumbers = createBoardNumbers(rng, this.balance, boardSize, difficulty.distinctNumbers, 0);
    const board = buildBoard(boardNumbers, this.balance, boardSize);
    const player: PlayerState = {
      hearts: difficulty.startingHearts + this.getHeartBonus(meta),
      coins: difficulty.startingCoins,
      combo: 0,
      freeDaubers: 0,
      bombReady: true,
      statuses: []
    };
    const floorModifier = this.pickModifier(rng, 0);
    const encounterModifier = this.assignEncounterModifier(rng, difficulty, 0);
    this.applyEncounterModifierSetup(encounterModifier, player, boss);
    const callCap = Math.max(
      1,
      difficulty.callCapBase + (encounterModifier?.effect.callCapModifier ?? 0)
    );
    const preview = this.computePreview(deck, meta, [], floorModifier, encounterModifier);
    const run: RunState = {
      id: `${Date.now()}-${Math.round(rng.next() * 1_000_000)}`,
      seed: options.seed,
      biomeId: options.biomeId,
      biome,
      difficultyId: difficulty.id,
      difficulty,
      floorIndex: 0,
      callCap,
      callsMade: 0,
      deck,
      preview,
      board,
      boardSize,
      boss,
      player,
      inventory: [],
      shop: [],
      shopAvailable: false,
      awaitingAdvance: false,
      events: this.generateEvents(biome, rng),
      log: [`${difficulty.label} run begins in the ${biome.name}.`],
      defeatedBosses: [],
      adaptiveThreat: this.balance.adaptive.threatStart,
      floorModifier,
      encounterModifier,
      metrics: {
        damageDealt: 0,
        statusesApplied: boss.statuses.length,
        itemsCollected: 0,
        coinsEarned: 0
      }
    };
    this.updateCodex(meta, run);
    return run;
  }

  callNext(
    meta: MetaState,
    state: RunState,
    rng: RNG
  ): { draw: number; damage: number; matched: number; state: RunState } {
    if (state.summary || state.awaitingAdvance) {
      return { draw: 0, damage: 0, matched: 0, state };
    }
    const next = clone(state);
    if (next.deck.length === 0) {
      next.deck = shuffleDeck(rng, this.balance, next.boardSize);
    }
    let draw = next.deck.shift() ?? rng.int(next.boardSize * this.balance.board.numbersPerColumn) + 1;
    const encounter = next.encounterModifier;
    if (encounter?.effect.sequenceOffset) {
      if (typeof encounter.sequenceAnchor === 'undefined') {
        encounter.sequenceAnchor = draw;
        encounter.sequenceRemaining = encounter.effect.sequenceOffset.count;
      } else if ((encounter.sequenceRemaining ?? 0) > 0) {
        const source = typeof next.lastCall === 'number' ? next.lastCall : encounter.sequenceAnchor;
        draw = source + encounter.effect.sequenceOffset.offset;
        encounter.sequenceRemaining = (encounter.sequenceRemaining ?? 0) - 1;
      }
    }
    next.lastCall = draw;
    next.callsMade += 1;
    let matched = next.board.filter((cell) => !cell.marked && cell.number === draw);
    if (encounter?.blockedState && encounter.blockedState.callsLeft > 0) {
      const blockedColumns = new Set(encounter.blockedState.columns);
      const before = matched.length;
      matched = matched.filter((cell) => !blockedColumns.has(cell.column));
      if (before !== matched.length) {
        next.log.push(`${encounter.name} blocks ${before - matched.length} match${before - matched.length === 1 ? '' : 'es'}.`);
      }
      encounter.blockedState.callsLeft -= 1;
      if (encounter.blockedState.callsLeft <= 0) {
        encounter.blockedState = undefined;
      }
    }
    let damage = 0;
    if (matched.length > 0) {
      matched.forEach((cell) => {
        cell.marked = true;
        this.handleCellMark(next, cell);
      });
      const lineCount = this.countLines(next.board, next.boardSize);
      damage = this.computeDamage(meta, next, matched.length, lineCount);
      next.player.combo = Math.min(this.balance.combo.max, next.player.combo + 1);
      next.boss.hp = Math.max(0, next.boss.hp - damage);
      next.metrics!.damageDealt += damage;
      next.log.push(`Call ${draw} hits ${matched.length} cell${matched.length > 1 ? 's' : ''} for ${damage} damage.`);
      this.applyStatuses(next, rng);
      if (next.boss.hp === 0) {
        this.onBossDefeated(meta, next, rng);
      }
    } else {
      this.onWhiff(meta, next, rng);
    }
    next.preview = this.computePreview(
      next.deck,
      meta,
      next.inventory,
      next.floorModifier,
      next.encounterModifier
    );
    if (!next.summary && !next.awaitingAdvance && next.callsMade >= next.callCap) {
      this.onCallCap(meta, next);
    }
    return { draw, damage, matched: matched.length, state: next };
  }

  freeMark(state: RunState, cellId: string): RunState {
    const next = clone(state);
    if (next.player.freeDaubers <= 0) return next;
    const cell = next.board.find((c) => c.id === cellId);
    if (!cell || cell.marked) return next;
    cell.marked = true;
    next.player.freeDaubers -= 1;
    next.log.push('Free dauber used.');
    return next;
  }

  useBomb(meta: MetaState, state: RunState, rng: RNG): RunState {
    const next = clone(state);
    if (!next.player.bombReady || next.summary) return next;
    next.player.bombReady = false;
    const damage = Math.round(next.boss.maxHp * 0.25);
    next.boss.hp = Math.max(0, next.boss.hp - damage);
    next.metrics!.damageDealt += damage;
    next.log.push(`Bomb deals ${damage} damage!`);
    if (next.boss.hp === 0) {
      this.onBossDefeated(meta, next, rng);
    }
    return next;
  }

  buyItem(meta: MetaState, state: RunState, itemId: string): RunState {
    const next = clone(state);
    if (!next.shopAvailable) {
      next.log.push('The shop is closed. Defeat an enemy to browse goods.');
      return next;
    }
    const offer = next.shop.find((o) => o.item.id === itemId);
    if (!offer || offer.sold) return next;
    if (!meta.unlocks.items.includes(itemId)) {
      next.log.push('Item is still locked. Progress further to unlock it.');
      return next;
    }
    if (next.player.coins < offer.price) {
      next.log.push('Not enough coins.');
      return next;
    }
    next.player.coins -= offer.price;
    offer.sold = true;
    const inventoryEntry = next.inventory.find((entry) => entry.def.id === itemId);
    if (inventoryEntry) {
      inventoryEntry.quantity += 1;
    } else {
      next.inventory.push({ def: offer.item, quantity: 1 });
    }
    if (offer.item.id === 'free-space-charm') {
      const center = getCenterIndex(next.boardSize);
      const cell = next.board[center];
      if (cell && !cell.marked) {
        cell.marked = true;
        next.log.push('The central star ignites, granting a permanent mark.');
      }
    }
    next.metrics!.itemsCollected += 1;
    this.updateCodex(meta, next, itemId);
    next.log.push(`Purchased ${offer.item.name}.`);
    return next;
  }

  useItem(meta: MetaState, state: RunState, itemId: string, rng: RNG): RunState {
    const next = clone(state);
    const entry = next.inventory.find((item) => item.def.id === itemId);
    if (!entry || entry.quantity <= 0) return next;
    if (entry.def.type === 'consumable') {
      const power = rarityValue(entry.def.rarity);
      if (entry.def.tags.includes('healing')) {
        const heal = 6 * power;
        next.player.hearts += heal;
        next.log.push(`${entry.def.name} restores ${heal} health.`);
      }
      if (entry.def.tags.includes('economy')) {
        const coins = 3 * power;
        next.player.coins += coins;
        next.metrics!.coinsEarned += coins;
        next.log.push(`${entry.def.name} grants ${coins} coins.`);
      }
      if (entry.def.tags.includes('damage')) {
        const burst = 5 * power;
        next.boss.hp = Math.max(0, next.boss.hp - burst);
        next.metrics!.damageDealt += burst;
        next.log.push(`${entry.def.name} blasts the enemy for ${burst} damage.`);
        if (next.boss.hp === 0) {
          this.onBossDefeated(meta, next, rng);
        }
      }
      if (entry.def.tags.includes('shield')) {
        next.player.freeDaubers += power;
        next.log.push(`${entry.def.name} grants ${power} free dauber${power > 1 ? 's' : ''}.`);
      }
      if (entry.def.tags.includes('combo')) {
        next.player.combo = Math.min(this.balance.combo.max, next.player.combo + power);
        next.log.push(`${entry.def.name} boosts combo to ${next.player.combo}.`);
      }
      if (entry.def.tags.includes('status')) {
        this.addStatus(next.boss.statuses, {
          id: 'vulnerable',
          stacks: 1,
          duration: power,
          target: 'boss'
        });
        next.metrics!.statusesApplied += 1;
        next.log.push(`${entry.def.name} exposes the boss for ${power} turn${power > 1 ? 's' : ''}.`);
      }
      entry.quantity -= 1;
      if (entry.quantity === 0) {
        next.inventory = next.inventory.filter((i) => i.quantity > 0);
      }
    } else {
      next.log.push(`${entry.def.name} is a passive modifier and stays equipped.`);
    }
    this.updateCodex(meta, next);
    return next;
  }

  rerollShop(meta: MetaState, state: RunState, rng: RNG): RunState {
    const next = clone(state);
    if (!next.shopAvailable) {
      next.log.push('The shopkeeper is away.');
      return next;
    }
    const cost = this.getRerollCost(next);
    if (next.player.coins < cost) {
      next.log.push('Not enough coins to reroll.');
      return next;
    }
    next.player.coins -= cost;
    next.shop = this.generateShop(meta, rng, next.biome, next.floorIndex + 1, next.difficultyId);
    next.log.push('Shop rerolled.');
    return next;
  }

  skipShop(state: RunState): RunState {
    const next = clone(state);
    if (!next.shopAvailable) return next;
    next.shop.forEach((offer) => (offer.locked = true));
    next.log.push('You ignore the shop for now.');
    next.shopAvailable = false;
    return next;
  }

  resolveEvent(meta: MetaState, state: RunState, eventId: string, optionId: string, rng: RNG): RunState {
    const next = clone(state);
    const active = next.events.find((event) => event.id === eventId);
    if (!active || active.resolved) return next;
    const definition = EVENT_LIBRARY[eventId];
    if (!definition) return next;
    const option = definition.options.find((opt) => opt.id === optionId);
    if (!option) return next;
    if (option.requires?.coins && next.player.coins < option.requires.coins) {
      next.log.push('You cannot afford that choice.');
      return next;
    }
    if (option.requires?.item && !next.inventory.some((i) => i.def.id === option.requires?.item)) {
      next.log.push('You lack the required item.');
      return next;
    }
    option.effect.forEach((effect) => this.applyEventEffect(meta, next, effect, rng));
    active.resolved = true;
    next.log.push(`${definition.name}: ${option.label}.`);
    return next;
  }

  advanceFloor(meta: MetaState, state: RunState, rng: RNG): RunState {
    const next = clone(state);
    if (!next.awaitingAdvance) return next;
    const upcomingIndex = next.floorIndex + 1;
    if (upcomingIndex >= next.biome.floors.length) {
      next.summary = this.buildSummary(next, true);
      return next;
    }
    next.floorIndex = upcomingIndex;
    next.awaitingAdvance = false;
    next.shopAvailable = false;
    next.shop = [];
    next.callsMade = 0;
    next.player.combo = 0;
    next.player.freeDaubers += 1;
    next.player.bombReady = true;
    const boardSize = next.difficulty.boardSize;
    next.boardSize = boardSize;
    next.deck = shuffleDeck(rng, this.balance, boardSize);
    next.board = buildBoard(
      createBoardNumbers(rng, this.balance, boardSize, next.difficulty.distinctNumbers, next.floorIndex),
      this.balance,
      boardSize
    );
    const bossDef = next.biome.floors[next.floorIndex];
    next.boss = this.createBoss(bossDef, next.floorIndex, next.adaptiveThreat);
    next.floorModifier = this.pickModifier(rng, next.floorIndex);
    if (next.floorModifier?.effect.heal) {
      next.player.hearts += next.floorModifier.effect.heal;
    }
    if (next.floorModifier?.effect.comboStart) {
      next.player.combo = next.floorModifier.effect.comboStart;
    }
    next.encounterModifier = this.assignEncounterModifier(rng, next.difficulty, next.floorIndex);
    this.applyEncounterModifierSetup(next.encounterModifier, next.player, next.boss);
    next.callCap = Math.max(
      1,
      next.difficulty.callCapBase + next.difficulty.callCapPerFloor * next.floorIndex +
        (next.encounterModifier?.effect.callCapModifier ?? 0)
    );
    next.preview = this.computePreview(
      next.deck,
      meta,
      next.inventory,
      next.floorModifier,
      next.encounterModifier
    );
    next.events = this.generateEvents(next.biome, rng);
    next.log.push(`Floor ${next.floorIndex + 1}: ${bossDef.name} approaches.`);
    this.updateCodex(meta, next);
    return next;
  }

  serialize(state: RunState): SerializedRun {
    return { state: clone(state) };
  }

  deserialize(payload: SerializedRun, meta: MetaState): RunState {
    const run = clone(payload.state);
    run.biome = this.biomes[run.biomeId];
    run.difficulty = this.balance.difficulties[run.difficultyId];
    run.boardSize = run.boardSize ?? run.difficulty.boardSize;
    run.shop = run.shop.map((offer) => ({ ...offer }));
    run.events = run.events.map((event) => ({ ...event }));
    run.shopAvailable = Boolean(run.shopAvailable);
    run.awaitingAdvance = Boolean(run.awaitingAdvance);
    if (run.encounterModifier?.effect.blockedColumns && !run.encounterModifier.blockedState) {
      run.encounterModifier.blockedState = {
        columns: [...run.encounterModifier.effect.blockedColumns.columns],
        callsLeft: run.encounterModifier.effect.blockedColumns.calls
      };
    }
    this.updateCodex(meta, run);
    return run;
  }

  private getHeartBonus(meta: MetaState): number {
    if (meta.xp >= 60) return 2;
    if (meta.xp >= 25) return 1;
    return 0;
  }

  private createBoss(def: BossDefinition, floor: number, threat: number): BossState {
    const hp = Math.round(def.baseHp * (1 + floor * 0.18) * threat);
    return {
      def,
      hp,
      maxHp: hp,
      statuses: def.status.map((id) => ({ id, stacks: 1, target: 'boss' as const }))
    };
  }

  private computePreview(
    deck: number[],
    meta: MetaState,
    inventory: InventoryItem[],
    modifier?: FloorModifierState,
    encounter?: EncounterModifierState
  ): number[] {
    const vision = this.balance.previewBase + this.getVisionBonus(meta, inventory);
    const modifierDelta = modifier?.effect.previewDelta ?? 0;
    const encounterDelta = -(encounter?.effect.previewPenalty ?? 0);
    return deck.slice(0, Math.max(0, vision + modifierDelta + encounterDelta));
  }

  private getVisionBonus(meta: MetaState, inventory: InventoryItem[]): number {
    let bonus = 0;
    inventory.forEach((item) => {
      if (item.def.type === 'consumable') return;
      if (item.def.tags.includes('vision') || item.def.tags.includes('preview')) {
        bonus += rarityValue(item.def.rarity);
      }
    });
    if (meta.codex.items.includes('seer-lens')) bonus += 1;
    return bonus;
  }

  private computeDamage(meta: MetaState, state: RunState, matched: number, lines: number): number {
    let damage = matched * this.balance.damage.hit + state.player.combo * this.balance.combo.hitBonus;
    if (lines >= 1) damage += this.balance.damage.lineSingle;
    if (lines >= 2) damage += this.balance.damage.lineDouble;
    if (lines >= 3) damage += this.balance.damage.lineTriple;
    if (lines >= 4) damage += this.balance.damage.bingo;
    const passiveDamage = state.inventory
      .filter((item) => item.def.type !== 'consumable' && item.def.tags.includes('damage'))
      .reduce((total, item) => total + rarityValue(item.def.rarity), 0);
    damage += passiveDamage;
    if (state.inventory.some((item) => item.def.type !== 'consumable' && item.def.tags.includes('combo'))) {
      damage += matched * 2;
    }
    if (state.inventory.some((item) => item.def.id === 'arcane-dauber')) {
      damage += state.player.combo * 2;
    }
    if (state.inventory.some((item) => item.def.id === 'embershard') && lines > 0) {
      this.addStatus(state.boss.statuses, { id: 'burn', stacks: 3, duration: 3, target: 'boss' });
      state.metrics!.statusesApplied += 3;
    }
    if (state.inventory.some((item) => item.def.id === 'frost-lantern') && lines > 0) {
      this.addStatus(state.boss.statuses, { id: 'chill', stacks: 1, duration: 2, target: 'boss' });
    }
    if (lines > 0 && state.inventory.some((item) => item.def.type !== 'consumable' && item.def.tags.includes('status'))) {
      this.addStatus(state.boss.statuses, { id: 'vulnerable', stacks: 1, duration: 2, target: 'boss' });
      state.metrics!.statusesApplied += 1;
    }
    if (state.inventory.some((item) => item.def.id === 'cursed-brand')) {
      damage = Math.round(damage * 1.2);
      this.addStatus(state.boss.statuses, { id: 'vulnerable', stacks: 1, duration: 2, target: 'boss' });
    }
    return Math.max(0, Math.round(damage));
  }

  private countLines(board: BoardCell[], boardSize: number): number {
    let lines = 0;
    for (const indices of getLineIndices(boardSize)) {
      if (indices.every((idx) => board[idx]?.marked)) lines += 1;
    }
    return lines;
  }

  private handleCellMark(state: RunState, cell: BoardCell): void {
    if (cell.free) return;
    if (cell.status === 'shield') {
      state.player.combo += 1;
    }
  }

  private applyStatuses(state: RunState, rng: RNG): void {
    const burn = state.boss.statuses.find((status) => status.id === 'burn');
    if (burn) {
      state.boss.hp = Math.max(0, state.boss.hp - burn.stacks);
      burn.duration = (burn.duration ?? burn.stacks) - 1;
      if ((burn.duration ?? 0) <= 0) {
        state.boss.statuses = state.boss.statuses.filter((s) => s !== burn);
      }
    }
    if (state.floorModifier?.effect.wildMagic) {
      const options: StatusEffectId[] = ['burn', 'chill', 'vulnerable', 'ooze'];
      const status = rng.pick(options);
      if (rng.next() > 0.5) {
        this.addStatus(state.boss.statuses, { id: status, stacks: 1, target: 'boss' });
        state.log.push(`Wild magic inflicts ${status} on the boss.`);
      } else {
        this.addStatus(state.player.statuses, { id: status, stacks: 1, target: 'player' });
        state.log.push(`Wild magic afflicts you with ${status}.`);
      }
    }
  }

  private onBossDefeated(meta: MetaState, state: RunState, rng: RNG): void {
    state.log.push(`${state.boss.def.name} is defeated!`);
    state.defeatedBosses.push(state.boss.def.id);
    const rewardRange = state.difficulty.rewardCoins;
    const reward = rng.int(rewardRange.max - rewardRange.min + 1) + rewardRange.min;
    const economyBonus = state.inventory
      .filter(
        (item) =>
          item.def.type !== 'consumable' &&
          (item.def.tags.includes('economy') || item.def.tags.includes('luck'))
      )
      .reduce((total, item) => total + rarityValue(item.def.rarity), 0);
    const totalReward = reward + economyBonus;
    state.player.coins += totalReward;
    state.metrics!.coinsEarned += totalReward;
    state.adaptiveThreat = this.adjustThreat(state);
    state.awaitingAdvance = true;
    state.shopAvailable = true;
    state.lastCall = undefined;
    const nextFloorIndex = state.floorIndex + 1;
    if (nextFloorIndex >= state.biome.floors.length) {
      state.log.push(`You cleared the ${state.biome.name}!`);
      state.summary = this.buildSummary(state, true);
      state.shopAvailable = false;
      state.shop = [];
      return;
    }
    state.shop = this.generateShop(meta, rng, state.biome, nextFloorIndex, state.difficultyId);
    state.events = [];
    const rewardText = economyBonus > 0 ? `${totalReward} coins (+${economyBonus} bonus).` : `${totalReward} coins.`;
    state.log.push(`You earn ${rewardText} The shop opens before the next foe.`);
  }

  private onWhiff(meta: MetaState, state: RunState, rng: RNG): void {
    state.player.combo = 0;
    if (state.inventory.some((item) => item.def.id === 'cursed-brand')) {
      state.player.hearts -= 2;
      state.log.push('The curse lashes out for missing a call.');
      if (state.player.hearts <= 0) {
        state.summary = this.buildSummary(state, false);
      }
    }
    const chilled = state.boss.statuses.find((status) => status.id === 'chill' && (status.duration ?? 0) > 0);
    if (chilled) {
      chilled.duration = (chilled.duration ?? 1) - 1;
      state.log.push('The boss is chilled and misses a counter attack.');
      if ((chilled.duration ?? 0) <= 0) {
        state.boss.statuses = state.boss.statuses.filter((s) => s !== chilled);
      }
      return;
    }
    const encounter = state.encounterModifier;
    const bonusDamage = encounter?.effect.bossDamageBonus ?? 0;
    const shieldValue = state.inventory
      .filter((item) => item.def.type !== 'consumable' && item.def.tags.includes('shield'))
      .reduce((total, item) => total + rarityValue(item.def.rarity), 0);
    const damage = Math.max(1, state.boss.def.damage + bonusDamage - shieldValue);
    state.player.hearts -= damage;
    state.log.push(`${state.boss.def.name} counters for ${damage} damage.`);
    if (state.player.hearts <= 0) {
      state.summary = this.buildSummary(state, false);
    }
  }

  private onCallCap(meta: MetaState, state: RunState): void {
    const bonusDamage = state.encounterModifier?.effect.bossDamageBonus ?? 0;
    const shieldValue = state.inventory
      .filter((item) => item.def.type !== 'consumable' && item.def.tags.includes('shield'))
      .reduce((total, item) => total + rarityValue(item.def.rarity), 0);
    const damage = Math.max(1, state.boss.def.damage + bonusDamage - shieldValue);
    state.player.hearts -= damage;
    state.log.push(`${state.boss.def.name} enrages as calls run out for ${damage} damage!`);
    if (state.player.hearts <= 0) {
      state.summary = this.buildSummary(state, false);
    } else {
      state.callsMade = 0;
      state.player.combo = 0;
    }
  }

  private adjustThreat(state: RunState): number {
    const ratio = state.callsMade / Math.max(1, state.callCap);
    let threat = state.adaptiveThreat;
    if (ratio < this.balance.adaptive.thresholds[0]) {
      threat = Math.max(1, threat - this.balance.adaptive.playerReward);
    } else if (ratio > this.balance.adaptive.thresholds[2]) {
      threat += this.balance.adaptive.bossMultiplier;
    }
    return threat;
  }

  private pickModifier(rng: RNG, floor: number): FloorModifierState | undefined {
    if (this.balance.floorModifiers.length === 0) return undefined;
    if (floor === 0 && rng.next() < 0.4) return undefined;
    if (rng.next() < 0.4) return undefined;
    const modifier = clone(this.balance.floorModifiers[rng.int(this.balance.floorModifiers.length)]);
    return modifier;
  }

  private assignEncounterModifier(
    rng: RNG,
    difficulty: DifficultySettings,
    floor: number
  ): EncounterModifierState | undefined {
    if (!difficulty.negativeModifierFloors.includes(floor)) return undefined;
    if (this.balance.encounterModifiers.length === 0) return undefined;
    const definition = this.balance.encounterModifiers[rng.int(this.balance.encounterModifiers.length)];
    const modifier: EncounterModifierState = clone({ ...definition });
    if (modifier.effect.blockedColumns) {
      modifier.blockedState = {
        columns: [...modifier.effect.blockedColumns.columns],
        callsLeft: modifier.effect.blockedColumns.calls
      };
    }
    if (modifier.effect.sequenceOffset) {
      modifier.sequenceRemaining = modifier.effect.sequenceOffset.count;
    }
    return modifier;
  }

  private applyEncounterModifierSetup(
    modifier: EncounterModifierState | undefined,
    player: PlayerState,
    boss: BossState
  ): void {
    if (!modifier) return;
    const status = modifier.effect.startingStatus;
    if (!status) return;
    const targetCollection = status.target === 'player' ? player.statuses : boss.statuses;
    this.addStatus(targetCollection, {
      id: status.id,
      stacks: status.stacks,
      duration: status.duration,
      target: status.target
    });
  }

  private generateShop(
    meta: MetaState,
    rng: RNG,
    biome: BiomeDefinition,
    floor: number,
    difficultyId: DifficultyId
  ): ShopOffer[] {
    const unlocked = this.items.filter((item) => meta.unlocks.items.includes(item.id));
    const pool = unlocked.filter((item) => {
      if (item.type === 'curse' && floor === 0) return false;
      if (biome.shopTags.length === 0) return true;
      return item.tags.some((tag) => biome.shopTags.includes(tag)) || item.rarity === 'common';
    });
    const offers: ShopOffer[] = [];
    rng.shuffle(pool);
    const offerCount = floor >= 2 ? 4 : 3;
    for (let i = 0; i < Math.min(offerCount, pool.length); i += 1) {
      const item = pool[i];
      const price = Math.max(1, item.cost - this.getShopDiscount(meta, item, difficultyId));
      offers.push({ item, price, sold: false });
    }
    return offers;
  }

  private getShopDiscount(meta: MetaState, item: ItemDefinition, difficultyId: DifficultyId): number {
    if (item.id === 'seer-lens') return 1;
    if (meta.unlocks.items.includes('seer-lens') && item.tags.includes('vision')) return 1;
    if (difficultyId === 'hard' && item.rarity === 'common') return 1;
    return 0;
  }

  private getRerollCost(state: RunState): number {
    const base = 3;
    if (state.inventory.some((item) => item.def.id === 'seer-lens')) return base - 1;
    return base;
  }

  private generateEvents(biome: BiomeDefinition, rng: RNG): ActiveEvent[] {
    const events: ActiveEvent[] = [];
    const pool = [...biome.events];
    rng.shuffle(pool);
    for (let i = 0; i < Math.min(2, pool.length); i += 1) {
      events.push({ id: pool[i], resolved: false });
    }
    return events;
  }

  private applyEventEffect(meta: MetaState, state: RunState, effect: EventEffect, rng: RNG): void {
    if (effect.coins) {
      state.player.coins = Math.max(0, state.player.coins + effect.coins);
      state.metrics!.coinsEarned += Math.max(0, effect.coins);
    }
    if (effect.hearts) {
      state.player.hearts += effect.hearts;
    }
    if (effect.combo) {
      state.player.combo = Math.min(this.balance.combo.max, state.player.combo + effect.combo);
    }
    if (effect.freeDaubers) {
      state.player.freeDaubers += effect.freeDaubers;
    }
    if (effect.item) {
      const def = this.items.find((item) => item.id === effect.item);
      if (def) {
        const entry = state.inventory.find((i) => i.def.id === def.id);
        if (entry) entry.quantity += 1;
        else state.inventory.push({ def, quantity: 1 });
        this.updateCodex(meta, state, def.id);
      }
    }
    if (effect.status) {
      const targetCollection = effect.status.target === 'boss' ? state.boss.statuses : state.player.statuses;
      this.addStatus(targetCollection, {
        id: effect.status.id,
        stacks: effect.status.stacks,
        duration: effect.status.duration,
        target: effect.status.target
      });
      state.metrics!.statusesApplied += effect.status.stacks;
    }
    if (effect.unlockBiome && !meta.unlocks.biomes.includes(effect.unlockBiome)) {
      meta.unlocks.biomes.push(effect.unlockBiome);
    }
    if (effect.unlockItem && !meta.unlocks.items.includes(effect.unlockItem)) {
      meta.unlocks.items.push(effect.unlockItem);
    }
    if (effect.rerollShop) {
      state.shop = this.generateShop(meta, rng, state.biome, state.floorIndex + 1, state.difficultyId);
    }
  }

  private addStatus(collection: StatusEffectState[], status: StatusEffectState): void {
    const existing = collection.find((s) => s.id === status.id);
    if (existing) {
      existing.stacks += status.stacks;
      if (status.duration) {
        existing.duration = (existing.duration ?? 0) + status.duration;
      }
    } else {
      collection.push(status);
    }
  }

  private buildSummary(state: RunState, victory: boolean): RunSummary {
    return {
      victory,
      floorsCleared: state.floorIndex + (victory ? 1 : 0),
      damageDealt: state.metrics?.damageDealt ?? 0,
      callsMade: state.callsMade,
      itemsCollected: state.metrics?.itemsCollected ?? 0,
      statusesApplied: state.metrics?.statusesApplied ?? 0,
      coinsEarned: state.metrics?.coinsEarned ?? 0
    };
  }

  private updateCodex(meta: MetaState, state: RunState, itemId?: string): void {
    if (itemId && !meta.codex.items.includes(itemId)) {
      meta.codex.items.push(itemId);
    }
    state.inventory.forEach((entry) => {
      if (!meta.codex.items.includes(entry.def.id)) meta.codex.items.push(entry.def.id);
    });
    if (!meta.codex.bosses.includes(state.boss.def.id)) meta.codex.bosses.push(state.boss.def.id);
    state.boss.statuses.forEach((status) => {
      if (!meta.codex.statuses.includes(status.id)) meta.codex.statuses.push(status.id);
    });
  }
}
