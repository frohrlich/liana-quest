import Phaser from 'phaser';
import { BattleScene } from './BattleScene';

export class UIScene extends Phaser.Scene {
  graphics!: Phaser.GameObjects.Graphics;
  battleScene!: BattleScene;
  uiTabWidth!: number;
  // y coordinates of the top of the UI
  topY!: number;
  uiTabHeight!: number;

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

    // draw some background for the menu
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
}
