import Phaser from "phaser";
import { BattleScene } from "./BattleScene";
import { Spell } from "../classes/battle/Spell";
import { UISpell } from "../classes/battle/UI/UISpell";
import { Unit } from "../classes/battle/Unit";
import { UnitStatDisplay } from "../classes/battle/UI/UnitStatDisplay";
import { UITimelineSlot } from "../classes/battle/UI/UITimelineSlot";
import { UIText } from "../classes/battle/UI/UIText";

/** Battle UI. */
export class BattleUIScene extends Phaser.Scene {
  graphics: Phaser.GameObjects.Graphics;
  battleScene: BattleScene;
  uiTabWidth: number;
  // global scale for the UI (change it when changing game resolution)
  uiScale: number = 2.5;
  uiFontColor = 0x00ff40;
  buttonTextFontSize = 32;
  offset = 2;

  leftX: number;
  uiTabHeight: number;
  uiSpells: UISpell[] = [];
  uiTimeline: UITimelineSlot[] = [];
  uiTimelineBackgrounds: Phaser.GameObjects.Rectangle[] = [];
  handle: Phaser.GameObjects.Rectangle;
  unitStats: UnitStatDisplay;
  buttonText: Phaser.GameObjects.BitmapText;
  button: Phaser.GameObjects.Rectangle;
  mapWidth: number;
  height: number;

  constructor() {
    super({
      key: "BattleUIScene",
    });
  }

  create(): void {
    this.battleScene = this.scene.get("BattleScene") as BattleScene;
    this.mapWidth = this.battleScene.map.widthInPixels;
    this.drawOutline();
    this.createStartButton();
    this.updateTimeline(this.battleScene.timeline, true);
    this.unitStats = this.addStats(0, 0, this.battleScene.currentPlayer);
    const spellTitle = new UIText(this, 1, 0, "Spells");
    this.refreshSpells();
    this.disableSpells(true);
  }

  disableSpells(isDisabled: boolean) {
    this.uiSpells.forEach((uiSpell) => {
      uiSpell.disabled = isDisabled;
      uiSpell.hideIfInaccessible();
    });
  }

  addSpell(tab: number, posX: number, spell: Spell) {
    this.uiSpells.push(new UISpell(this, tab, posX, spell));
  }

  addStats(tab: number, posY: number, unit: Unit) {
    const myStats = new UnitStatDisplay(this, tab * 4, posY, unit);
    return myStats;
  }

  changeStatsUnit(unit: Unit) {
    this.unitStats.changeUnit(unit);
  }

  createStartButton() {
    const textTopMargin = 2;
    const yPos = this.uiTabHeight * 2.33 + 1;
    const xPos = this.leftX + this.uiTabWidth * 0.5;

    this.button = this.add
      .rectangle(xPos, yPos, this.uiTabWidth * 0.85, this.uiTabHeight * 0.56)
      .setStrokeStyle(2, 0xcccccc)
      .setFillStyle(0x293154)
      .setInteractive()
      .on("pointerup", () => {
        this.battleScene.playerClickedReadyButton();
      });

    let fontSize = this.buttonTextFontSize;
    this.buttonText = this.add
      .bitmapText(
        xPos,
        yPos + textTopMargin,
        "dogicapixel",
        "Fight !",
        fontSize
      )
      .setTint(this.uiFontColor)
      .setOrigin(0.5, 0.5)
      .setCenterAlign();
  }

  setButtonToReady() {
    this.button.setFillStyle(0x00ff00);
    this.buttonText.tint = 0x000000;
  }

  setButtonToNotReady() {
    this.button.setFillStyle(0x293154);
    this.buttonText.tint = this.uiFontColor;
  }

  /** Play this when battle preparation phase ends. */
  startBattle() {
    this.createEndTurnButton();
  }

  /** Changes start button to end turn button for the main phase of the battle. */
  createEndTurnButton() {
    this.deactivateEndTurnButtonVisually();
    this.buttonText.text = "End\nturn";
    this.button.off("pointerup");
    this.button.on("pointerup", () => {
      if (
        this.battleScene.isPlayerTurn &&
        !this.battleScene.currentPlayer.isMoving
      ) {
        this.battleScene.currentPlayer.endTurn();
      }
    });
  }

  deactivateEndTurnButtonVisually() {
    this.button.setFillStyle(0x15192b);
    this.buttonText.setTint(0x00701c);
  }

  activateEndTurnButtonVisually() {
    this.button.setFillStyle(0x293154);
    this.buttonText.setTint(this.uiFontColor);
  }

  updateTimeline(timeline: Unit[], isPreparationPhase = false) {
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
      slot.tint = unit.isSelected ? unit.selectedTint : unit.baseTint;
      // on hover, highlight the timeline slot and its corresponding unit
      slot.setInteractive();
      slot.on("pointerover", () => {
        slot.unit.selectUnit();
      });
      slot.on("pointerout", () => {
        slot.unit.unselectUnit();
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
        unit.isTeamA ? 0x0000ff : 0xff0000,
        0.3
      );
      this.uiTimelineBackgrounds.push(background);
      this.uiTimeline.push(slot);
      this.add.existing(slot);
    }

    // move the timeline around by grabbing the handle
    this.makeTimelineHandleDraggable(unitWidth, handleWidth);

    if (!isPreparationPhase) this.highlightCurrentUnitInTimeline(timeline);
  }

  private highlightCurrentUnitInTimeline(timeline: Unit[]) {
    let fillIndex = 0;
    if (this.battleScene.timelineIndex < timeline.length) {
      fillIndex = this.battleScene.timelineIndex;
    }
    const currentBackground = this.uiTimelineBackgrounds[fillIndex];
    if (currentBackground) currentBackground.fillColor = 0xffffff;
  }

  private makeTimelineHandleDraggable(unitWidth: number, handleWidth: number) {
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
  }

  drawOutline() {
    const bounds = this.battleScene.cameras.main.getBounds();
    const zoom = this.battleScene.cameras.main.zoom;
    this.leftX = this.mapWidth * zoom;
    this.height = bounds.height * zoom;
    const uiTabHeight = (this.height - this.offset * 2) / 3;
    const uiWidth = this.game.canvas.width - this.leftX - this.offset;

    this.graphics = this.add.graphics();
    this.graphics.lineStyle(4, 0x79ae55);
    this.graphics.fillStyle(0x1d233c, 1);
    this.graphics.strokeRect(this.leftX, this.offset, uiWidth, uiTabHeight);
    this.graphics.fillRect(this.leftX, this.offset, uiWidth, uiTabHeight);
    this.graphics.strokeRect(
      this.leftX,
      uiTabHeight + this.offset,
      uiWidth,
      uiTabHeight
    );
    this.graphics.fillRect(
      this.leftX,
      uiTabHeight + this.offset,
      uiWidth,
      uiTabHeight
    );
    this.graphics.strokeRect(
      this.leftX,
      uiTabHeight * 2 + this.offset,
      uiWidth,
      uiTabHeight
    );
    this.graphics.fillRect(
      this.leftX,
      uiTabHeight * 2 + this.offset,
      uiWidth,
      uiTabHeight
    );

    this.uiTabHeight = uiTabHeight;
    this.uiTabWidth = uiWidth;
  }

  endPlayerTurn() {
    this.refreshSpells();
    this.disableSpells(true);
    this.deactivateEndTurnButtonVisually();
  }

  startPlayerTurn() {
    this.activateEndTurnButtonVisually();
    this.disableSpells(false);
    this.refreshSpells();
    this.refreshUI();
  }

  refreshUI() {
    this.changeStatsUnit(this.battleScene.currentPlayer);
    this.uiSpells.forEach((uiSpell) => {
      uiSpell.refresh();
    });
    this.unitStats.refresh();
  }

  refreshUIAfterSpell(spell: Spell) {
    this.uiSpells.forEach((uiSpell) => {
      // replace local spell with one from server, to update cooldown
      if (uiSpell.spell.name === spell.name) uiSpell.spell = spell;
      uiSpell.refresh();
    });
  }

  /** Displays unit spells on the spell slots of the UI. */
  displaySpells(unit: Unit) {
    for (let i = 0; i < unit.spells.length; i++) {
      const spell = unit.spells[i];
      this.addSpell(1.15, 0.14 + 0.33 * i, spell);
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
