import Phaser from "phaser";
import { BattleScene } from "./BattleScene";
import { UIElement } from "../classes/UIElement";
import { Spell } from "../classes/Spell";
import { UISpell } from "../classes/UISpell";
import { Unit } from "../classes/Unit";
import { UnitStatDisplay } from "../classes/UnitStatDisplay";
import { UITimelineSlot } from "../classes/UITimelineSlot";
import { UIText } from "../classes/UIText";

export class UIScene extends Phaser.Scene {
  graphics!: Phaser.GameObjects.Graphics;
  battleScene!: BattleScene;
  uiTabWidth!: number;
  // global scale for the UI (change it when changing game resolution)
  uiScale: number = 2.5;
  uiFontColor = 0x00ff40;
  // y coordinates of the top of the UI
  topY!: number;
  uiTabHeight!: number;
  uiSpells: UISpell[] = [];
  uiTimeline: UITimelineSlot[] = [];
  uiTimelineBackgrounds: Phaser.GameObjects.Rectangle[] = [];
  handle!: Phaser.GameObjects.Rectangle;
  unitStats!: UnitStatDisplay;

  constructor() {
    super({
      key: "UIScene",
    });
  }

  init(params: any): void {}

  preload(): void {}

  create(): void {
    this.battleScene = this.scene.get("BattleScene") as BattleScene;
    this.drawOutline();
    this.createEndTurnButton();
    this.updateTimeline(this.battleScene.timeline);
    this.unitStats = this.addStats(0, 0, this.battleScene.currentPlayer);
    const spellTitle = new UIText(this, 1.5, 0.1, "Spells");
    this.refreshSpells();
  }

  addSpell(tab: number, posY: number, spell: Spell) {
    this.uiSpells.push(new UISpell(this, tab, posY, spell));
  }

  addStats(tab: number, posY: number, unit: Unit) {
    const myStats = new UnitStatDisplay(this, tab * 4, posY, unit);
    return myStats;
  }

  changeStatsUnit(unit: Unit) {
    this.unitStats.changeUnit(unit);
  }

  createEndTurnButton() {
    const xPos = this.uiTabWidth * 2.5;
    const yPos = this.topY + this.uiTabHeight / 2;

    this.add
      .rectangle(xPos, yPos, this.uiTabWidth * 0.65, this.uiTabHeight * 0.65)
      .setStrokeStyle(2, 0xcccccc)
      .setFillStyle(0x293154);

    let fontSize = this.battleScene.tileWidth * this.uiScale;
    this.add
      .bitmapText(xPos, yPos, "rainyhearts", "End turn", fontSize)
      .setTint(this.uiFontColor)
      .setOrigin(0.5, 0.5)
      .setInteractive()
      .on("pointerup", () => {
        if (
          this.battleScene.isPlayerTurn &&
          !this.battleScene.currentPlayer.isMoving
        ) {
          this.battleScene.currentPlayer.endTurn();
        }
      });
  }

  updateTimeline(timeline: Unit[]) {
    // scale factor for the timeline
    const topMargin = 10;
    const leftMargin = 10;
    // first add handle on the left of the timeline
    const handleWidth = this.uiScale * 6;
    const unitHeight = timeline[0].height;
    const unitWidth = timeline[0].width;
    // first we get the handle current position if it's already initialized
    let offsetX = 0;
    let offsetY = 0;
    if (this.handle) {
      // the offset corresponding to the position of the timeline once user dragged it
      // substracting initial position of the handle
      offsetX = this.handle.x - leftMargin - handleWidth / 2;
      offsetY = this.handle.y - (unitHeight * this.uiScale) / 2 - topMargin;
    }
    this.uiTimeline.forEach((slot) => {
      slot.destroy();
    });
    this.uiTimelineBackgrounds.forEach((border) => {
      border.destroy();
    });
    this.handle?.destroy();
    this.uiTimelineBackgrounds = [];
    this.uiTimeline = [];
    this.handle = this.add.rectangle(
      offsetX + leftMargin + handleWidth / 2,
      offsetY + (unitHeight * this.uiScale) / 2 + topMargin,
      handleWidth,
      unitHeight * this.uiScale,
      0x888888
    );
    for (let i = 0; i < timeline.length; i++) {
      const unit = timeline[i];
      // each slot represents a tiny unit portrait in the timeline
      let slot = new UITimelineSlot(
        this,
        offsetX +
          handleWidth +
          leftMargin +
          (i + 0.5) * unitWidth * this.uiScale,
        offsetY + (unitHeight * this.uiScale) / 2 + topMargin,
        unit,
        this.uiScale
      );
      // on hover, highlight the timeline slot and its corresponding unit
      slot.setInteractive();
      slot.on("pointerover", () => {
        slot.unit.selectUnit();
        slot.unit.healthBar.setVisible(true);
      });
      slot.on("pointerout", () => {
        slot.unit.unselectUnit();
        slot.unit.healthBar.setVisible(false);
      });
      // add background color to identify team
      let background = this.add.rectangle(
        offsetX +
          handleWidth +
          leftMargin +
          (i + 0.5) * unitWidth * this.uiScale,
        offsetY + (unitHeight * this.uiScale) / 2 + topMargin,
        unitWidth * this.uiScale,
        unitHeight * this.uiScale,
        unit.isAlly ? 0x0000ff : 0xff0000,
        0.3
      );
      this.uiTimelineBackgrounds.push(background);
      this.uiTimeline.push(slot);
      this.add.existing(slot);
    }

    // move the timeline around by grabbing the handle
    this.handle.setInteractive({ draggable: true });
    this.handle.on(
      "drag",
      (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        this.handle.setPosition(dragX, dragY);
        for (let i = 0; i < this.uiTimeline.length; i++) {
          const slot = this.uiTimeline[i];
          const background = this.uiTimelineBackgrounds[i];
          let posX =
            (i + 0.5) * unitWidth * this.uiScale + handleWidth / 2 + dragX;
          slot.setPosition(posX, dragY);
          background.setPosition(posX, dragY);
        }
      }
    );

    let fillIndex;
    if (this.battleScene.turnIndex < timeline.length) {
      fillIndex = this.battleScene.turnIndex;
    } else {
      fillIndex = 0;
    }
    const currentBackground = this.uiTimelineBackgrounds[fillIndex];
    if (currentBackground) currentBackground.fillColor = 0xffffff;
  }

  // draw the outline of the UI
  drawOutline() {
    let bounds = this.battleScene.cameras.main.getBounds();
    let zoom = this.battleScene.cameras.main.zoom;
    let bottom = bounds.bottom * zoom;
    let width = bounds.width * zoom;
    let offset = 2;
    let uiTabWidth = (width - offset * 2) / 3;
    let height = 30 * this.uiScale;

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
    this.refreshUI();
    this.clearSpellsHighlight();
  }

  refreshUI() {
    this.changeStatsUnit(this.battleScene.currentPlayer);
    this.uiSpells.forEach((uiSpell) => {
      uiSpell.refresh();
    });
    this.unitStats.refresh();
  }

  // display unit spells on the spell slot of the UI
  displaySpells(unit: Unit) {
    for (let i = 0; i < unit.spells.length; i++) {
      const spell = unit.spells[i];
      this.addSpell(1.15 + 0.33 * i, 1.35, spell);
    }
  }

  refreshSpells() {
    this.uiSpells.forEach((uiSpell) => {
      uiSpell.destroy();
    });
    this.uiSpells = [];
    this.displaySpells(this.battleScene.currentPlayer);
  }

  clearSpellsHighlight() {
    this.uiSpells.forEach((uiSpell) => {
      uiSpell.isHighlighted = false;
      uiSpell.refresh();
    });
  }
}
