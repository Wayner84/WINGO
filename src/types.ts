export type ItemType = 'relic' | 'consumable' | 'curse';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface ItemDefinition {
  id: string;
  name: string;
  type: ItemType;
  rarity: Rarity;
  cost: number;
  tags: string[];
  effect: string;
  synergy: string;
  icon: string;
}

export interface BossDefinition {
  id: string;
  name: string;
  baseHp: number;
  damage: number;
  elite: boolean;
  status: string[];
  icon: string;
}

export interface BiomeDefinition {
  name: string;
  palette: string;
  floors: BossDefinition[];
  shopTags: string[];
  events: string[];
}

export interface BalanceData {
  startingHearts: number;
  startingCoins: number;
  board: {
    columns: string[];
    numbersPerColumn: number;
    freeIndex: number;
  };
  callCapBase: number;
  callCapPerFloor: number;
  previewBase: number;
  combo: {
    hitBonus: number;
    lineBonus: number;
    max: number;
  };
  damage: {
    hit: number;
    lineSingle: number;
    lineDouble: number;
    lineTriple: number;
    bingo: number;
  };
  adaptive: {
    threatStart: number;
    thresholds: number[];
    bossMultiplier: number;
    playerReward: number;
  };
  floorModifiers: FloorModifierDefinition[];
}

export interface FloorModifierDefinition {
  id: string;
  label: string;
  description: string;
  effect: {
    previewDelta?: number;
    tooltipHidden?: boolean;
    wildMagic?: boolean;
    comboStart?: number;
    heal?: number;
  };
}

export interface BoardCell {
  id: string;
  number: number;
  marked: boolean;
  free: boolean;
  column: string;
  status?: string;
}

export interface InventoryItem {
  def: ItemDefinition;
  quantity: number;
  exhausted?: boolean;
}

export type StatusEffectId =
  | 'burn'
  | 'chill'
  | 'ooze'
  | 'curse'
  | 'vulnerable'
  | 'rebirth'
  | 'shield';

export interface StatusEffectState {
  id: StatusEffectId | string;
  stacks: number;
  duration?: number;
  target: 'player' | 'boss';
}

export interface BossState {
  def: BossDefinition;
  hp: number;
  maxHp: number;
  statuses: StatusEffectState[];
}

export interface PlayerState {
  hearts: number;
  coins: number;
  combo: number;
  freeDaubers: number;
  bombReady: boolean;
  statuses: StatusEffectState[];
}

export interface EventEffect {
  coins?: number;
  hearts?: number;
  combo?: number;
  freeDaubers?: number;
  item?: string;
  status?: {
    target: 'player' | 'boss';
    id: StatusEffectId | string;
    stacks: number;
    duration?: number;
  };
  unlockBiome?: string;
  unlockItem?: string;
  rerollShop?: boolean;
}

export interface EventOption {
  id: string;
  label: string;
  description: string;
  requires?: {
    coins?: number;
    item?: string;
  };
  effect: EventEffect[];
}

export interface EventDefinition {
  id: string;
  name: string;
  description: string;
  icon?: string;
  options: EventOption[];
}

export interface FloorModifierState extends FloorModifierDefinition {}

export interface RunState {
  id: string;
  seed: number;
  biomeId: string;
  biome: BiomeDefinition;
  floorIndex: number;
  callCap: number;
  callsMade: number;
  deck: number[];
  preview: number[];
  board: BoardCell[];
  boss: BossState;
  player: PlayerState;
  inventory: InventoryItem[];
  shop: ShopOffer[];
  events: ActiveEvent[];
  log: string[];
  defeatedBosses: string[];
  adaptiveThreat: number;
  floorModifier?: FloorModifierState;
  summary?: RunSummary;
  metrics?: {
    damageDealt: number;
    statusesApplied: number;
    itemsCollected: number;
    coinsEarned: number;
  };
}

export interface ShopOffer {
  item: ItemDefinition;
  price: number;
  sold: boolean;
  locked?: boolean;
}

export interface ActiveEvent {
  id: string;
  resolved: boolean;
}

export interface RunSummary {
  victory: boolean;
  floorsCleared: number;
  damageDealt: number;
  callsMade: number;
  itemsCollected: number;
  statusesApplied: number;
  coinsEarned: number;
}

export interface MetaState {
  version: number;
  xp: number;
  unlocks: {
    biomes: string[];
    items: string[];
  };
  stats: {
    runs: number;
    victories: number;
    bestFloor: number;
  };
  codex: {
    items: string[];
    bosses: string[];
    statuses: string[];
  };
  settings: {
    reducedMotion: boolean;
    colorPalette: string;
  };
}

export interface EngineSnapshot {
  view: 'title' | 'game' | 'settings' | 'codex' | 'summary';
  run?: RunState;
  meta: MetaState;
  assets: Record<string, string>;
}

export type EngineListener = (snapshot: EngineSnapshot) => void;
