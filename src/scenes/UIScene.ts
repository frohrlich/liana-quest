import Phaser from "phaser";
import { BattleScene } from "./BattleScene";
import { UIElement } from "../classes/UIElement";
import { Spell } from "../classes/Spell";
import { UISpell } from "../classes/UISpell";
import { Unit } from "../classes/Unit";
import { UnitStatDisplay } from "../classes/UnitStatDisplay";
import { UITimelineSlot } from "../classes/UITimelineSlot";

export class UIScene extends Phaser.Scene {
  graphics!: Phaser.GameObjects.Graphics;
  battleScene!: BattleScene;
  uiTabWidth!: number;
  // y coordinates of the top of the UI
  topY!: number;
  uiTabHeight!: number;
  uiElements: UIElement[] = [];
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
    this.unitStats = this.addStats(0, 0, this.battleScene.player);
    this.displaySpells(this.battleScene.player);
  }

  addSpell(tab: number, posY: number, spell: Spell) {
    let mySpell = new UISpell(this, tab, posY, spell);
    this.uiElements.push(this.add.existing(mySpell));
  }

  addStats(tab: number, posY: number, unit: Unit) {
    let myStats = new UnitStatDisplay(this, tab, posY, unit);
    this.uiElements.push(this.add.existing(myStats));
    return myStats;
  }

  changeStatsUnit(unit: Unit) {
    this.unitStats.changeUnit(unit);
  }

  createEndTurnButton() {
    let fontSize = this.uiTabWidth / 10;
    const nextTurnButton = this.add
      .text(
        this.uiTabWidth * 2.5,
        this.topY + this.uiTabHeight / 2,
        "End turn",
        {
          color: "#00FF40",
          fontSize: fontSize,
          fontFamily: "PublicPixel",
        }
      )
      .setOrigin(0.5, 0.5);
    nextTurnButton.setInteractive();
    nextTurnButton.on("pointerup", () => {
      if (this.battleScene.isPlayerTurn && !this.battleScene.player.isMoving) {
        this.battleScene.endTurn();
      }
    });
  }

  updateTimeline(timeline: Unit[]) {
    // scale factor for the timeline
    let timelineSize = 5;
    let topMargin = 10;
    let leftMargin = 10;
    // first add handle on the left of the timeline
    let handleWidth = 30;
    let unitHeight = timeline[0].height;
    let unitWidth = timeline[0].width;
    // first we get the handle current position if it's already initialized
    let offsetX = 0;
    let offsetY = 0;
    if (this.handle) {
      // the offset corresponding to the position of the timeline once user dragged it
      // substracting initial position of the handle
      offsetX = this.handle.x - leftMargin - handleWidth / 2;
      offsetY = this.handle.y - (unitHeight * timelineSize) / 2 - topMargin;
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
      offsetY + (unitHeight * timelineSize) / 2 + topMargin,
      handleWidth,
      unitHeight * timelineSize,
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
          (i + 0.5) * unitWidth * timelineSize,
        offsetY + (unitHeight * timelineSize) / 2 + topMargin,
        unit,
        timelineSize
      );
      // on hover, highlight the timeline slot and its corresponding unit
      slot.setInteractive();
      slot.on("pointerover", () => {
        slot.tint = 0x777777;
        slot.unit.tint = 0x777777;
        slot.unit.healthBar.setVisible(true);
      });
      slot.on("pointerout", () => {
        slot.tint = 0xffffff;
        slot.unit.tint = 0xffffff;
        slot.unit.healthBar.setVisible(false);
      });
      // add background color to identify team
      let background = this.add.rectangle(
        offsetX +
          handleWidth +
          leftMargin +
          (i + 0.5) * unitWidth * timelineSize,
        offsetY + (unitHeight * timelineSize) / 2 + topMargin,
        unitWidth * timelineSize,
        unitHeight * timelineSize,
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
            (i + 0.5) * unitWidth * timelineSize + handleWidth / 2 + dragX;
          slot.setPosition(posX, dragY);
          background.setPosition(posX, dragY);
        }
      }
    );
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
    this.refreshUI();
  }

  refreshUI() {
    this.clearSpellsHighlight();
    this.uiElements.forEach((element) => {
      element.refresh();
    });
  }

  // display unit spells on the spell slot of the UI
  displaySpells(unit: Unit) {
    for (let i = 0; i < unit.spells.length; i++) {
      const spell = unit.spells[i];
      this.addSpell(1, i, spell);
    }
  }

  clearSpellsHighlight() {
    this.uiElements.forEach((element) => {
      if (element instanceof UISpell && !element.isInaccessible()) {
        element.text.setColor("#00FF00");
      }
    });
  }

  hideInaccessibleSpells() {
    this.uiElements.forEach((element) => {
      if (element instanceof UISpell) {
        element.hideIfInaccessible();
      }
    });
  }
}
