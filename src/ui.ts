import balanceData from '@data/balance.json';
import bossesData from '@data/bosses.json';
import itemsData from '@data/items.json';
import { EVENT_LIBRARY } from './game';
import { engine } from './engine';
import type {
  BalanceData,
  BiomeDefinition,
  DifficultyId,
  EngineSnapshot,
  InventoryItem,
  ItemDefinition,
  RunState,
  ShopOffer,
  StatusEffectState
} from './types';

const balance = balanceData as BalanceData;
const biomes = bossesData as Record<string, BiomeDefinition>;
const items = itemsData as ItemDefinition[];
const difficulties = balance.difficulties;

const BIOME_NOTES: Record<string, string> = {
  crypt: 'Rotting halls haunted by curses and shrines.',
  emberforge: 'Molten chambers where fire relics abound.',
  aurora: 'Frozen sanctum with vision-focused relics.'
};

const STATUS_NOTES: Record<string, string> = {
  burn: 'Deals damage over time to the boss.',
  chill: 'Chance for boss to skip counterattacks.',
  ooze: 'Reduces boss damage output.',
  curse: 'Harmful omen that may strike back.',
  vulnerable: 'Boss takes increased damage.',
  rebirth: 'Boss may revive if not finished quickly.',
  shield: 'Protective aura for marked cells.',
  fury: 'Your next line deals bonus damage.',
  vision: 'Gain additional call previews.'
};

export class UIManager {
  private root!: HTMLElement;
  private tooltip!: HTMLDivElement;
  private unsubscribe?: () => void;
  private selectedDifficulty: DifficultyId = 'easy';

  mount(root: HTMLElement): void {
    this.root = root;
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'tooltip';
    document.body.appendChild(this.tooltip);
    this.registerTooltip();
    this.unsubscribe = engine.on((snapshot) => this.render(snapshot));
  }

  unmount(): void {
    this.unsubscribe?.();
    this.tooltip.remove();
  }

  private render(snapshot: EngineSnapshot): void {
    this.root.innerHTML = '';
    switch (snapshot.view) {
      case 'title':
        this.renderTitle(snapshot);
        break;
      case 'game':
        if (snapshot.run) this.renderGame(snapshot, snapshot.run);
        break;
      case 'settings':
        this.renderSettings(snapshot);
        break;
      case 'codex':
        this.renderCodex(snapshot);
        break;
      case 'summary':
        this.renderSummary(snapshot);
        break;
    }
  }

  private renderTitle(snapshot: EngineSnapshot): void {
    const sheet = document.createElement('div');
    sheet.className = 'sheet';

    const hero = document.createElement('section');
    hero.className = 'panel';
    hero.innerHTML = `
      <div class="brand">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="var(--accent)" stroke-width="2"></circle><path d="M7 12h10M12 7v10" stroke="var(--accent)" stroke-width="2"></path></svg>
        WINGO
      </div>
      <p>Wield ingenious numbers, gear up, and topple biome bosses in rapid-fire bingo battles.</p>
    `;
    sheet.appendChild(hero);

    const statsPanel = document.createElement('section');
    statsPanel.className = 'panel';
    statsPanel.innerHTML = `
      <h2>Profile</h2>
      <div class="stat-bar">
        <span class="stat-pill" data-tooltip="Runs completed">🧭 ${snapshot.meta.stats.runs}</span>
        <span class="stat-pill" data-tooltip="Victories">🏆 ${snapshot.meta.stats.victories}</span>
        <span class="stat-pill" data-tooltip="Deepest floor">⛏️ ${snapshot.meta.stats.bestFloor}</span>
        <span class="stat-pill" data-tooltip="XP for unlocks">⭐ ${snapshot.meta.xp}</span>
      </div>
    `;
    sheet.appendChild(statsPanel);

    const actions = document.createElement('section');
    actions.className = 'panel';
    const difficultyRow = document.createElement('div');
    difficultyRow.className = 'settings-row';
    const difficultyLabel = document.createElement('label');
    difficultyLabel.textContent = 'Difficulty';
    const difficultySelect = document.createElement('select');
    difficultySelect.className = 'btn';
    Object.values(difficulties).forEach((difficulty) => {
      const option = document.createElement('option');
      option.value = difficulty.id;
      option.textContent = `${difficulty.label} — ${difficulty.boardSize}x${difficulty.boardSize}`;
      if (difficulty.id === this.selectedDifficulty) option.selected = true;
      difficultySelect.appendChild(option);
    });
    difficultySelect.addEventListener('change', () => {
      this.selectedDifficulty = difficultySelect.value as DifficultyId;
    });
    difficultyRow.append(difficultyLabel, difficultySelect);
    actions.appendChild(difficultyRow);
    const continueButton = document.createElement('button');
    continueButton.className = 'btn';
    continueButton.textContent = 'Continue Run';
    continueButton.disabled = !(snapshot.run && !snapshot.run.summary);
    continueButton.addEventListener('click', () => engine.continueRun());
    const settingsButton = document.createElement('button');
    settingsButton.className = 'btn';
    settingsButton.textContent = 'Settings';
    settingsButton.addEventListener('click', () => engine.openSettings());
    const codexButton = document.createElement('button');
    codexButton.className = 'btn';
    codexButton.textContent = 'Codex';
    codexButton.addEventListener('click', () => engine.openCodex());
    const runRow = document.createElement('div');
    runRow.style.display = 'flex';
    runRow.style.flexWrap = 'wrap';
    runRow.style.gap = '10px';
    runRow.append(continueButton, settingsButton, codexButton);
    actions.appendChild(runRow);
    sheet.appendChild(actions);

    const biomePanel = document.createElement('section');
    biomePanel.className = 'panel';
    biomePanel.innerHTML = '<h2>Choose a Biome</h2>';
    const biomeGrid = document.createElement('div');
    biomeGrid.className = 'codex-grid';

    const unlocked = new Set(snapshot.meta.unlocks.biomes);
    Object.entries(biomes).forEach(([id, biome]) => {
      const card = document.createElement('div');
      card.className = 'codex-card';
      const iconId = biome.floors[0]?.icon;
      const img = document.createElement('img');
      img.width = 48;
      img.height = 48;
      const iconSrc = snapshot.assets[iconId];
      if (iconSrc) {
        img.src = iconSrc;
        img.alt = '';
      }
      const title = document.createElement('strong');
      title.textContent = biome.name;
      const note = document.createElement('p');
      note.className = 'small';
      note.textContent = BIOME_NOTES[id] ?? 'Unknown lands.';
      card.appendChild(img);
      card.appendChild(title);
      card.appendChild(note);
      if (unlocked.has(id)) {
        const start = document.createElement('button');
        start.className = 'btn';
        start.textContent = 'Start Run';
        start.addEventListener('click', () => engine.startNewRun(id, this.selectedDifficulty));
        card.appendChild(start);
      } else {
        const locked = document.createElement('span');
        locked.className = 'small';
        locked.textContent = 'Locked — earn more XP.';
        card.appendChild(locked);
      }
      biomeGrid.appendChild(card);
    });
    biomePanel.appendChild(biomeGrid);
    sheet.appendChild(biomePanel);

    this.root.appendChild(sheet);
  }

  private renderGame(snapshot: EngineSnapshot, run: RunState): void {
    const container = document.createElement('div');

    const header = document.createElement('header');
    header.className = 'app-bar';
    header.innerHTML = `
      <div class="brand">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="var(--accent)" stroke-width="2"></circle><path d="M7 12h10M12 7v10" stroke="var(--accent)" stroke-width="2"></path></svg>
        ${run.biome.name} — Floor ${run.floorIndex + 1} · ${run.difficulty.label}
      </div>
    `;
    const statRow = document.createElement('div');
    statRow.className = 'stat-bar';
    statRow.innerHTML = `
      <span class="stat-pill" data-tooltip="Hearts">❤️ ${run.player.hearts}</span>
      <span class="stat-pill" data-tooltip="Coins">🪙 ${run.player.coins}</span>
      <span class="stat-pill" data-tooltip="Calls used">📣 ${run.callsMade}/${run.callCap}</span>
      <span class="stat-pill" data-tooltip="Combo level">🔗 ${run.player.combo}</span>
      <span class="stat-pill" data-tooltip="Board size">#️⃣ ${run.boardSize}×${run.boardSize}</span>
    `;
    header.appendChild(statRow);
    const headerButtons = document.createElement('div');
    headerButtons.style.display = 'flex';
    headerButtons.style.gap = '8px';
    const titleBtn = document.createElement('button');
    titleBtn.className = 'btn';
    titleBtn.textContent = 'Title';
    titleBtn.addEventListener('click', () => engine.openTitle());
    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'btn';
    settingsBtn.textContent = 'Settings';
    settingsBtn.addEventListener('click', () => engine.openSettings());
    headerButtons.append(titleBtn, settingsBtn);
    header.appendChild(headerButtons);
    container.appendChild(header);

    const main = document.createElement('main');
    main.className = 'game-layout';

    const boardPanel = document.createElement('section');
    boardPanel.className = 'panel';
    const boardTitle = document.createElement('h2');
    boardTitle.textContent = 'Board';
    boardPanel.appendChild(boardTitle);
    const grid = document.createElement('div');
    grid.className = 'grid';
    grid.style.setProperty('--board-size', String(run.boardSize));
    run.board.forEach((cell) => {
      const button = document.createElement('button');
      button.className = 'cell';
      button.dataset.cell = cell.id;
      button.dataset.marked = cell.marked ? 'true' : 'false';
      button.dataset.free = cell.free ? 'true' : 'false';
      button.setAttribute('data-tooltip', `${cell.column}-${cell.free ? 'FREE' : cell.number}`);
      button.textContent = cell.free ? '★' : String(cell.number);
      if (cell.marked) button.classList.add('marked');
      button.addEventListener('click', () => engine.useFreeDauber(cell.id));
      grid.appendChild(button);
    });
    boardPanel.appendChild(grid);

    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.flexWrap = 'wrap';
    controls.style.gap = '10px';
    const callBtn = document.createElement('button');
    callBtn.className = 'btn';
    callBtn.setAttribute('data-variant', 'primary');
    callBtn.textContent = run.awaitingAdvance ? 'Victory!' : 'Call Next';
    callBtn.disabled = run.awaitingAdvance;
    callBtn.addEventListener('click', () => engine.callNext());
    const freeBtn = document.createElement('button');
    freeBtn.className = 'btn';
    freeBtn.textContent = `Free Dauber (${run.player.freeDaubers})`;
    freeBtn.disabled = run.player.freeDaubers <= 0;
    freeBtn.addEventListener('click', () => {
      const target = run.board.find((cell) => !cell.marked && !cell.free);
      if (target) engine.useFreeDauber(target.id);
    });
    const bombBtn = document.createElement('button');
    bombBtn.className = 'btn';
    bombBtn.textContent = '💣 Bomb';
    bombBtn.disabled = !run.player.bombReady;
    bombBtn.addEventListener('click', () => engine.useBomb());
    const previewInfo = document.createElement('span');
    previewInfo.className = 'stat-pill';
    previewInfo.textContent = `Preview ${run.preview.join(', ') || '—'}`;
    previewInfo.setAttribute('data-tooltip', 'Upcoming calls');
    controls.append(callBtn, freeBtn, bombBtn, previewInfo);
    if (run.awaitingAdvance && !run.summary) {
      const advanceBtn = document.createElement('button');
      advanceBtn.className = 'btn';
      advanceBtn.setAttribute('data-variant', 'primary');
      advanceBtn.textContent = 'Advance to Next Battle';
      advanceBtn.addEventListener('click', () => engine.advanceFloor());
      controls.append(advanceBtn);
      const reminder = document.createElement('span');
      reminder.className = 'stat-pill';
      reminder.textContent = 'Spend your coins or continue!';
      controls.append(reminder);
    }
    boardPanel.appendChild(controls);

    const logCard = document.createElement('div');
    logCard.className = 'panel';
    logCard.style.flex = '1 1 auto';
    logCard.innerHTML = '<h3>Log</h3>';
    const log = document.createElement('div');
    log.className = 'log';
    run.log.slice(-14).forEach((entry) => {
      const p = document.createElement('p');
      p.textContent = entry;
      log.appendChild(p);
    });
    logCard.appendChild(log);
    boardPanel.appendChild(logCard);

    main.appendChild(boardPanel);

    const side = document.createElement('aside');
    side.className = 'panel';
    const bossSection = document.createElement('section');
    bossSection.innerHTML = '<h2>Boss</h2>';
    bossSection.appendChild(this.buildBossCard(snapshot, run));
    side.appendChild(bossSection);

    const shopSection = document.createElement('section');
    shopSection.innerHTML = '<h3>Shop</h3>';
    const shopList = document.createElement('div');
    shopList.className = 'shop-list';
    if (run.shopAvailable) {
      if (run.shop.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'small';
        empty.textContent = 'Shopkeeper is preparing new stock.';
        shopSection.appendChild(empty);
      } else {
        run.shop.forEach((offer) => {
          shopList.appendChild(this.buildShopOffer(snapshot, offer));
        });
        shopSection.appendChild(shopList);
      }
    } else {
      const closed = document.createElement('p');
      closed.className = 'small';
      closed.textContent = 'Shop opens after each victory.';
      shopSection.appendChild(closed);
    }
    const shopButtons = document.createElement('div');
    shopButtons.style.display = 'flex';
    shopButtons.style.gap = '8px';
    const rerollBtn = document.createElement('button');
    rerollBtn.className = 'btn';
    rerollBtn.textContent = 'Reroll';
    rerollBtn.disabled = !run.shopAvailable;
    rerollBtn.addEventListener('click', () => engine.rerollShop());
    const skipBtn = document.createElement('button');
    skipBtn.className = 'btn';
    skipBtn.textContent = 'Skip';
    skipBtn.disabled = !run.shopAvailable;
    skipBtn.addEventListener('click', () => engine.skipShop());
    shopButtons.append(rerollBtn, skipBtn);
    shopSection.appendChild(shopButtons);
    side.appendChild(shopSection);

    const inventorySection = document.createElement('section');
    inventorySection.innerHTML = '<h3>Inventory</h3>';
    const invGrid = document.createElement('div');
    invGrid.className = 'inventory-grid';
    if (run.inventory.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'small';
      empty.textContent = 'No items yet.';
      inventorySection.appendChild(empty);
    } else {
      run.inventory.forEach((entry) => invGrid.appendChild(this.buildInventoryChip(snapshot, entry)));
      inventorySection.appendChild(invGrid);
    }
    side.appendChild(inventorySection);

    const eventsSection = document.createElement('section');
    eventsSection.innerHTML = '<h3>Events</h3>';
    if (run.events.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'small';
      empty.textContent = 'No events available.';
      eventsSection.appendChild(empty);
    } else {
      run.events.forEach((active) => {
        const definition = EVENT_LIBRARY[active.id];
        const card = document.createElement('div');
        card.className = 'codex-card';
        const title = document.createElement('strong');
        title.textContent = definition?.name ?? active.id;
        card.appendChild(title);
        const desc = document.createElement('p');
        desc.className = 'small';
        desc.textContent = definition?.description ?? '';
        card.appendChild(desc);
        if (active.resolved) {
          const resolvedTag = document.createElement('span');
          resolvedTag.className = 'small';
          resolvedTag.textContent = 'Resolved';
          card.appendChild(resolvedTag);
        } else if (definition) {
          definition.options.forEach((option) => {
            const button = document.createElement('button');
            button.className = 'btn';
            button.textContent = option.label;
            const needsCoins = option.requires?.coins;
            if (needsCoins && run.player.coins < needsCoins) button.disabled = true;
            button.addEventListener('click', () => engine.resolveEvent(active.id, option.id));
            button.setAttribute('data-tooltip', option.description);
            card.appendChild(button);
          });
        }
        eventsSection.appendChild(card);
      });
    }
    side.appendChild(eventsSection);

    main.appendChild(side);
    container.appendChild(main);

    const footer = document.createElement('footer');
    footer.innerHTML = `
      <span>Floor modifier: ${run.floorModifier ? run.floorModifier.label : 'None'}.</span>
      <button class="btn" ${run.summary ? '' : 'disabled'}>Summary</button>
    `;
    footer.querySelector('button')?.addEventListener('click', () => engine.openSummary());
    container.appendChild(footer);

    this.root.appendChild(container);
  }

  private renderSettings(snapshot: EngineSnapshot): void {
    const sheet = document.createElement('div');
    sheet.className = 'sheet';
    const panel = document.createElement('section');
    panel.className = 'panel';
    panel.innerHTML = `
      <h2>Settings</h2>
      <div class="settings-row">
        <label>Reduced motion</label>
        <button class="switch" data-checked="${snapshot.meta.settings.reducedMotion}" id="reducedMotion"><span class="sr-only">Toggle reduced motion</span></button>
      </div>
      <div class="settings-row">
        <label for="paletteSelect">Color palette</label>
        <select id="paletteSelect" class="btn">
          <option value="default" ${snapshot.meta.settings.colorPalette === 'default' ? 'selected' : ''}>Azure</option>
          <option value="ember" ${snapshot.meta.settings.colorPalette === 'ember' ? 'selected' : ''}>Ember</option>
          <option value="verdant" ${snapshot.meta.settings.colorPalette === 'verdant' ? 'selected' : ''}>Verdant</option>
        </select>
      </div>
      <div class="settings-row">
        <button class="btn" id="exportSave">Export Save</button>
        <button class="btn" id="importSave">Import Save</button>
      </div>
      <div class="settings-row">
        <button class="btn" id="backTitle">Back</button>
      </div>
    `;
    sheet.appendChild(panel);
    this.root.appendChild(sheet);

    panel.querySelector('#reducedMotion')?.addEventListener('click', () => {
      engine.updateSettings({ reducedMotion: !snapshot.meta.settings.reducedMotion });
    });
    panel.querySelector('#paletteSelect')?.addEventListener('change', (event) => {
      const target = event.target as HTMLSelectElement;
      engine.updateSettings({ colorPalette: target.value });
    });
    panel.querySelector('#exportSave')?.addEventListener('click', () => {
      const blob = new Blob([engine.exportSave()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'rogue-bingo-save.json';
      link.click();
      URL.revokeObjectURL(url);
    });
    panel.querySelector('#importSave')?.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (!file) return;
        file.text().then((text) => engine.importSave(text));
      });
      input.click();
    });
    panel.querySelector('#backTitle')?.addEventListener('click', () => engine.openTitle());
  }

  private renderCodex(snapshot: EngineSnapshot): void {
    const sheet = document.createElement('div');
    sheet.className = 'sheet';
    const panel = document.createElement('section');
    panel.className = 'panel';
    panel.innerHTML = '<h2>Codex</h2>';
    const grid = document.createElement('div');
    grid.className = 'codex-grid';

    const knownItems = new Set(snapshot.meta.codex.items);
    knownItems.forEach((itemId) => {
      const def = items.find((item) => item.id === itemId);
      const card = document.createElement('div');
      card.className = 'codex-card';
      const title = document.createElement('strong');
      title.textContent = def?.name ?? itemId;
      card.appendChild(title);
      const desc = document.createElement('p');
      desc.className = 'small';
      desc.textContent = def?.effect ?? 'Mystery effect';
      card.appendChild(desc);
      grid.appendChild(card);
    });

    const bossesSection = document.createElement('div');
    bossesSection.className = 'codex-card';
    bossesSection.innerHTML = `<strong>Bosses</strong><p class="small">${snapshot.meta.codex.bosses.join(', ') || 'None yet'}</p>`;
    grid.appendChild(bossesSection);

    const statusesSection = document.createElement('div');
    statusesSection.className = 'codex-card';
    statusesSection.innerHTML = `<strong>Status Effects</strong><p class="small">${snapshot.meta.codex.statuses
      .map((id) => `${id}: ${STATUS_NOTES[id] ?? 'Unknown effect'}`)
      .join('<br/>') || 'None yet'}</p>`;
    grid.appendChild(statusesSection);

    panel.appendChild(grid);
    const back = document.createElement('button');
    back.className = 'btn';
    back.textContent = 'Back to Title';
    back.addEventListener('click', () => engine.openTitle());
    panel.appendChild(back);
    sheet.appendChild(panel);
    this.root.appendChild(sheet);
  }

  private renderSummary(snapshot: EngineSnapshot): void {
    const sheet = document.createElement('div');
    sheet.className = 'sheet';
    const panel = document.createElement('section');
    panel.className = 'panel';
    const summary = snapshot.run?.summary;
    if (!summary) {
      panel.innerHTML = '<p>No run summary available.</p>';
    } else {
      panel.innerHTML = `
        <h2>${summary.victory ? 'Victory!' : 'Defeat'}</h2>
        <ul class="small" style="line-height:1.6;">
          <li>Floors cleared: <strong>${summary.floorsCleared}</strong></li>
          <li>Damage dealt: <strong>${summary.damageDealt}</strong></li>
          <li>Calls made: <strong>${summary.callsMade}</strong></li>
          <li>Items collected: <strong>${summary.itemsCollected}</strong></li>
          <li>Status effects applied: <strong>${summary.statusesApplied}</strong></li>
          <li>Coins earned: <strong>${summary.coinsEarned}</strong></li>
        </ul>
        <button class="btn" id="summaryBack">Back to title</button>
      `;
    }
    sheet.appendChild(panel);
    this.root.appendChild(sheet);
    panel.querySelector('#summaryBack')?.addEventListener('click', () => engine.completeSummaryAcknowledged());
  }

  private buildBossCard(snapshot: EngineSnapshot, run: RunState): HTMLElement {
    const card = document.createElement('div');
    card.className = 'panel';
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    const name = document.createElement('strong');
    name.textContent = run.boss.def.name;
    const hp = document.createElement('span');
    hp.textContent = `${run.boss.hp}/${run.boss.maxHp}`;
    header.append(name, hp);
    const hpBar = document.createElement('div');
    hpBar.className = 'hpbar';
    const hpInner = document.createElement('div');
    hpInner.className = 'hp';
    hpInner.style.width = `${Math.round((run.boss.hp / run.boss.maxHp) * 100)}%`;
    hpBar.appendChild(hpInner);
    const statuses = document.createElement('div');
    statuses.innerHTML = run.boss.statuses
      .map((status) => `<span class="status-badge" data-tooltip="${this.describeStatus(status)}">${status.id} ×${status.stacks}</span>`)
      .join('') || '<span class="small">No statuses</span>';
    card.append(header, hpBar, statuses);
    const encounter = document.createElement('p');
    encounter.className = 'small';
    if (run.encounterModifier) {
      encounter.innerHTML = `<strong>Modifier:</strong> ${run.encounterModifier.name}<br>${run.encounterModifier.description}`;
    } else {
      encounter.textContent = 'Modifier: None active.';
    }
    card.appendChild(encounter);
    return card;
  }

  private buildShopOffer(snapshot: EngineSnapshot, offer: ShopOffer): HTMLElement {
    const row = document.createElement('div');
    row.className = 'item';
    const icon = document.createElement('img');
    icon.width = 24;
    icon.height = 24;
    const src = snapshot.assets[offer.item.icon];
    if (src) {
      icon.src = src;
      icon.alt = '';
    }
    const title = document.createElement('div');
    title.className = 'ttl';
    title.textContent = offer.item.name;
    const desc = document.createElement('div');
    desc.className = 'desc';
    desc.textContent = offer.item.effect;
    const textWrap = document.createElement('div');
    textWrap.append(title, desc);
    const button = document.createElement('button');
    button.className = 'btn';
    button.textContent = `${offer.price} 🪙`;
    if (offer.sold) {
      button.disabled = true;
      button.textContent = 'Sold';
    }
    row.setAttribute('data-tooltip', `${offer.item.effect}\n${offer.item.synergy}`);
    button.addEventListener('click', () => engine.buyItem(offer.item.id));
    row.append(icon, textWrap, button);
    return row;
  }

  private buildInventoryChip(snapshot: EngineSnapshot, entry: InventoryItem): HTMLElement {
    const chip = document.createElement('div');
    chip.className = 'inventory-chip';
    chip.setAttribute('data-tooltip', `${entry.def.effect}\n${entry.def.synergy}`);
    const icon = document.createElement('img');
    icon.width = 24;
    icon.height = 24;
    const src = snapshot.assets[entry.def.icon];
    if (src) {
      icon.src = src;
      icon.alt = '';
    }
    chip.append(icon, document.createTextNode(` ${entry.def.name} ×${entry.quantity}`));
    if (entry.def.type === 'consumable') {
      const use = document.createElement('button');
      use.className = 'btn';
      use.textContent = 'Use';
      use.addEventListener('click', () => engine.useItem(entry.def.id));
      chip.appendChild(use);
    }
    return chip;
  }

  private describeStatus(status: StatusEffectState): string {
    return STATUS_NOTES[status.id] ?? 'Unknown effect';
  }

  private registerTooltip(): void {
    document.addEventListener('pointerover', (event) => {
      const target = event.target as HTMLElement;
      const tip = target?.getAttribute?.('data-tooltip');
      if (!tip) return;
      this.tooltip.dataset.visible = 'true';
      this.tooltip.textContent = tip;
      this.positionTooltip(event as PointerEvent);
    });
    document.addEventListener('pointermove', (event) => {
      if (this.tooltip.dataset.visible !== 'true') return;
      this.positionTooltip(event as PointerEvent);
    });
    document.addEventListener('pointerout', () => {
      this.tooltip.dataset.visible = 'false';
    });
  }

  private positionTooltip(event: PointerEvent): void {
    this.tooltip.style.left = `${event.clientX + 18}px`;
    this.tooltip.style.top = `${event.clientY + 18}px`;
  }
}
