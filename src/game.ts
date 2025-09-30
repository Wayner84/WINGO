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
  StatusEffectState
} from './types';

export interface RNG {
  next(): number;
  int(max: number): number;
  pick<T>(arr: T[]): T;
  shuffle<T>(arr: T[]): T[];
}

const BOARD_SIZE = 5;
const ALL_LINES = buildLineIndices();

const clone = <T>(value: T): T =>
  typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));

function buildLineIndices(): number[][] {
  const lines: number[][] = [];
  for (let r = 0; r < BOARD_SIZE; r += 1) {
    lines.push(Array.from({ length: BOARD_SIZE }, (_, c) => r * BOARD_SIZE + c));
  }
  for (let c = 0; c < BOARD_SIZE; c += 1) {
    lines.push(Array.from({ length: BOARD_SIZE }, (_, r) => r * BOARD_SIZE + c));
  }
  lines.push(Array.from({ length: BOARD_SIZE }, (_, i) => i * (BOARD_SIZE + 1)));
  lines.push(Array.from({ length: BOARD_SIZE }, (_, i) => (i + 1) * (BOARD_SIZE - 1)));
  return lines;
}

function createBoardNumbers(rng: RNG, balance: BalanceData): number[] {
  const perColumn = balance.board.numbersPerColumn;
  const numbers: number[] = [];
  for (let c = 0; c < BOARD_SIZE; c += 1) {
    const start = c * perColumn + 1;
    const bucket = Array.from({ length: perColumn }, (_, i) => start + i);
    rng.shuffle(bucket);
    for (let r = 0; r < BOARD_SIZE; r += 1) {
      if (c === 2 && r === 2) {
        numbers.push(0);
      } else {
        numbers.push(bucket.pop() ?? start);
      }
    }
  }
  return numbers;
}

function buildBoard(numbers: number[], balance: BalanceData): BoardCell[] {
  return numbers.map((value, index) => {
    const free = index === balance.board.freeIndex;
    return {
      id: `cell-${index}`,
      number: value,
      marked: free,
      free,
      column: balance.board.columns[index % BOARD_SIZE]
    } satisfies BoardCell;
  });
}

function shuffleDeck(rng: RNG, balance: BalanceData): number[] {
  const count = balance.board.columns.length * balance.board.numbersPerColumn;
  const deck = Array.from({ length: count }, (_, i) => i + 1);
  return rng.shuffle(deck);
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
    const boss = this.createBoss(biome.floors[0], 0, this.balance.adaptive.threatStart);
    const deck = shuffleDeck(rng, this.balance);
    const board = buildBoard(createBoardNumbers(rng, this.balance), this.balance);
    const player: PlayerState = {
      hearts: this.balance.startingHearts + this.getHeartBonus(meta),
      coins: this.balance.startingCoins,
      combo: 0,
      freeDaubers: 1,
      bombReady: true,
      statuses: []
    };
    const preview = this.computePreview(deck, meta, [], undefined);
    const floorModifier = this.pickModifier(rng, 0);
    const run: RunState = {
      id: `${Date.now()}-${Math.round(rng.next() * 1_000_000)}`,
      seed: options.seed,
      biomeId: options.biomeId,
      biome,
      floorIndex: 0,
      callCap: this.balance.callCapBase,
      callsMade: 0,
      deck,
      preview,
      board,
      boss,
      player,
      inventory: [],
      shop: this.generateShop(meta, rng, biome, 0),
      events: this.generateEvents(biome, rng),
      log: [`You enter the ${biome.name}.`],
      defeatedBosses: [],
      adaptiveThreat: this.balance.adaptive.threatStart,
      floorModifier,
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

  callNext(meta: MetaState, state: RunState, rng: RNG): { draw: number; damage: number; matched: number; state: RunState } {
    if (state.summary) return { draw: 0, damage: 0, matched: 0, state };
    const next = clone(state);
    if (next.deck.length === 0) {
      next.deck = shuffleDeck(rng, this.balance);
    }
    const draw = next.deck.shift() ?? rng.int(75) + 1;
    next.callsMade += 1;
    const matched = next.board.filter((cell) => !cell.marked && cell.number === draw);
    let damage = 0;
    if (matched.length > 0) {
      matched.forEach((cell) => {
        cell.marked = true;
        this.handleCellMark(next, cell);
      });
      const lineCount = this.countLines(next.board);
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
    next.preview = this.computePreview(next.deck, meta, next.inventory, next.floorModifier);
    if (!next.summary && next.callsMade >= next.callCap) {
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
    next.metrics!.itemsCollected += 1;
    this.updateCodex(meta, next, itemId);
    next.log.push(`Purchased ${offer.item.name}.`);
    return next;
  }

  useItem(meta: MetaState, state: RunState, itemId: string): RunState {
    const next = clone(state);
    const entry = next.inventory.find((item) => item.def.id === itemId);
    if (!entry || entry.quantity <= 0) return next;
    if (entry.def.type === 'consumable') {
      if (entry.def.id === 'healing-brew') {
        const heal = next.biomeId === 'aurora' ? 2 : 1;
        next.player.hearts += heal;
        next.log.push(`Healing Brew restores ${heal} heart${heal > 1 ? 's' : ''}.`);
      }
      entry.quantity -= 1;
      if (entry.quantity === 0) {
        next.inventory = next.inventory.filter((i) => i.quantity > 0);
      }
    } else {
      next.log.push(`${entry.def.name} is a passive relic and stays equipped.`);
    }
    this.updateCodex(meta, next);
    return next;
  }

  rerollShop(meta: MetaState, state: RunState, rng: RNG): RunState {
    const next = clone(state);
    const cost = this.getRerollCost(next);
    if (next.player.coins < cost) {
      next.log.push('Not enough coins to reroll.');
      return next;
    }
    next.player.coins -= cost;
    next.shop = this.generateShop(meta, rng, next.biome, next.floorIndex);
    next.log.push('Shop rerolled.');
    return next;
  }

  skipShop(state: RunState): RunState {
    const next = clone(state);
    next.shop.forEach((offer) => (offer.locked = true));
    next.log.push('You ignore the shop for now.');
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
    next.floorIndex += 1;
    if (next.floorIndex >= next.biome.floors.length) {
      next.summary = this.buildSummary(next, true);
      return next;
    }
    const bossDef = next.biome.floors[next.floorIndex];
    next.boss = this.createBoss(bossDef, next.floorIndex, next.adaptiveThreat);
    next.deck = shuffleDeck(rng, this.balance);
    next.board = buildBoard(createBoardNumbers(rng, this.balance), this.balance);
    next.board[this.balance.board.freeIndex].marked = true;
    next.callCap = this.balance.callCapBase + this.balance.callCapPerFloor * next.floorIndex;
    next.callsMade = 0;
    next.player.combo = 0;
    next.player.freeDaubers += 1;
    next.player.bombReady = true;
    next.floorModifier = this.pickModifier(rng, next.floorIndex);
    if (next.floorModifier?.effect.heal) {
      next.player.hearts += next.floorModifier.effect.heal;
    }
    if (next.floorModifier?.effect.comboStart) {
      next.player.combo = next.floorModifier.effect.comboStart;
    }
    next.preview = this.computePreview(next.deck, meta, next.inventory, next.floorModifier);
    next.shop = this.generateShop(meta, rng, next.biome, next.floorIndex);
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
    run.shop = run.shop.map((offer) => ({ ...offer }));
    run.events = run.events.map((event) => ({ ...event }));
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

  private computePreview(deck: number[], meta: MetaState, inventory: InventoryItem[], modifier?: FloorModifierState): number[] {
    const vision = this.balance.previewBase + this.getVisionBonus(meta, inventory);
    const modifierDelta = modifier?.effect.previewDelta ?? 0;
    return deck.slice(0, Math.max(0, vision + modifierDelta));
  }

  private getVisionBonus(meta: MetaState, inventory: InventoryItem[]): number {
    let bonus = 0;
    if (inventory.some((item) => item.def.id === 'lucky-charm')) bonus += 1;
    if (inventory.some((item) => item.def.id === 'seer-lens')) bonus += 2;
    if (meta.codex.items.includes('seer-lens')) bonus += 0; // lore bonus placeholder
    return bonus;
  }

  private computeDamage(meta: MetaState, state: RunState, matched: number, lines: number): number {
    let damage = matched * this.balance.damage.hit + state.player.combo * this.balance.combo.hitBonus;
    if (lines >= 1) damage += this.balance.damage.lineSingle;
    if (lines >= 2) damage += this.balance.damage.lineDouble;
    if (lines >= 3) damage += this.balance.damage.lineTriple;
    if (lines >= 4) damage += this.balance.damage.bingo;
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
    if (state.inventory.some((item) => item.def.id === 'cursed-brand')) {
      damage = Math.round(damage * 1.2);
      this.addStatus(state.boss.statuses, { id: 'vulnerable', stacks: 1, duration: 2, target: 'boss' });
    }
    return Math.max(0, Math.round(damage));
  }

  private countLines(board: BoardCell[]): number {
    let lines = 0;
    for (const indices of ALL_LINES) {
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
    state.player.coins += 6 + state.floorIndex * 2;
    state.metrics!.coinsEarned += 6 + state.floorIndex * 2;
    state.adaptiveThreat = this.adjustThreat(state);
    const progressed = this.advanceFloor(meta, state, rng);
    Object.assign(state, progressed);
  }

  private onWhiff(meta: MetaState, state: RunState, rng: RNG): void {
    state.player.combo = 0;
    if (state.inventory.some((item) => item.def.id === 'cursed-brand')) {
      state.player.hearts -= 1;
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
    } else {
      const damage = state.boss.def.damage + Math.floor(state.adaptiveThreat - 1);
      state.player.hearts -= damage;
      state.log.push(`${state.boss.def.name} counters for ${damage} damage.`);
      if (state.player.hearts <= 0) {
        state.summary = this.buildSummary(state, false);
      }
    }
  }

  private onCallCap(meta: MetaState, state: RunState): void {
    state.player.hearts -= state.boss.def.damage;
    state.log.push(`${state.boss.def.name} enrages as calls run out!`);
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

  private generateShop(meta: MetaState, rng: RNG, biome: BiomeDefinition, floor: number): ShopOffer[] {
    const unlocked = this.items.filter((item) => meta.unlocks.items.includes(item.id));
    const pool = unlocked.filter((item) => {
      if (item.type === 'curse' && floor === 0) return false;
      if (biome.shopTags.length === 0) return true;
      return item.tags.some((tag) => biome.shopTags.includes(tag)) || item.rarity === 'common';
    });
    const offers: ShopOffer[] = [];
    rng.shuffle(pool);
    for (let i = 0; i < Math.min(3, pool.length); i += 1) {
      const item = pool[i];
      offers.push({ item, price: Math.max(1, item.cost - this.getShopDiscount(meta, item)), sold: false });
    }
    return offers;
  }

  private getShopDiscount(meta: MetaState, item: ItemDefinition): number {
    if (item.id === 'seer-lens') return 1;
    if (meta.unlocks.items.includes('seer-lens') && item.tags.includes('vision')) return 1;
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
      state.shop = this.generateShop(meta, rng, state.biome, state.floorIndex);
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
