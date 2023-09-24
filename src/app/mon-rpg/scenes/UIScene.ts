import Phaser from 'phaser';
import { BattleScene } from './BattleScene';
import { UIElement } from '../classes/UIElement';
import { Spell } from '../classes/Spell';
import { UISpell } from '../classes/UISpell';
import { Unit } from '../classes/Unit';
import { UnitStatDisplay } from '../classes/UnitStatDisplay';

export class UIScene extends Phaser.Scene {
  graphics!: Phaser.GameObjects.Graphics;
  battleScene!: BattleScene;
  uiTabWidth!: number;
  // y coordinates of the top of the UI
  topY!: number;
  uiTabHeight!: number;
  uiElements: UIElement[] = [];

  constructor() {
    super({
      key: 'UIScene',
    });
  }

  init(params: any): void {}

  preload(): void {}

  create(): void {
    this.battleScene = this.scene.get('BattleScene') as BattleScene;
    this.drawOutline();
    this.createEndTurnButton();
    this.addStats(0, 0, this.battleScene.player);
    // spells
    let javelin = new Spell(4, 25, 3, 'Deadly Javelin');
    this.addSpell(1, 0, javelin);
    let punch = new Spell(1, 55, 4, 'Punch');
    this.addSpell(1, 1, punch);
  }

  addSpell(tab: number, posY: number, spell: Spell) {
    let mySpell = new UISpell(this, tab, posY, spell);
    this.uiElements.push(this.add.existing(mySpell));
  }

  addStats(tab: number, posY: number, unit: Unit) {
    let myStats = new UnitStatDisplay(this, tab, posY, unit);
    this.uiElements.push(this.add.existing(myStats));
  }

  createEndTurnButton() {
    let fontSize = this.uiTabWidth / 8;
    const nextTurnButton = this.add
      .text(
        this.uiTabWidth * 2.5,
        this.topY + this.uiTabHeight / 2,
        'End turn',
        {
          color: '#00FF40',
          backgroundColor: '#000066',
          fontSize: fontSize,
          fontFamily: 'Noto Sans',
        }
      )
      .setOrigin(0.5, 0.5);
    nextTurnButton.setInteractive();
    nextTurnButton.on('pointerup', () => {
      if (this.battleScene.isPlayerTurn && !this.battleScene.player.isMoving) {
        this.battleScene.endTurn();
      }
    });
  }

  // draw the outline of the UI
  drawOutline() {
    let bounds = this.battleScene.cameras.main.getBounds();
    let zoom = this.battleScene.cameras.main.zoom;
    let bottom = bounds.bottom * zoom;
    let width = bounds.width * zoom;
    let offset = 2;
    let uiTabWidth = (width - offset * 2) / 3;
    let height = 150;

    this.graphics = this.add.graphics();
    this.graphics.lineStyle(4, 0x79ae55);
    this.graphics.fillStyle(0x1d233c, 1);
    this.graphics.strokeRect(offset, bottom, uiTabWidth, height);
    this.graphics.fillRect(offset, bottom, uiTabWidth, height);
    this.graphics.strokeRect(uiTabWidth + offset, bottom, uiTabWidth, height);
    this.graphics.fillRect(uiTabWidth + offset, bottom, uiTabWidth, height);
    this.graphics.strokeRect(
      uiTabWidth * 2 + offset,
      bottom,
      uiTabWidth,
      height
    );
    this.graphics.fillRect(uiTabWidth * 2 + offset, bottom, uiTabWidth, height);

    this.uiTabWidth = uiTabWidth;
    this.topY = bottom;
    this.uiTabHeight = height;
  }

  endTurn() {
    this.uiElements.forEach((element) => {
      (element as UISpell).isVisible = false;
    });
    this.refreshUI();
  }

  refreshUI() {
    this.uiElements.forEach((element) => {
      element.refresh();
    });
  }
}
