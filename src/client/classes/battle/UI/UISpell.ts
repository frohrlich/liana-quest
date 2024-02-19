import Phaser from "phaser";
import { UIElement } from "./UIElement";
import { Spell } from "../Spell";
import { BattleScene } from "../../../scenes/BattleScene";

export class UISpell extends UIElement {
  iconScale = 1.1;

  spell: Spell;
  icon: Phaser.GameObjects.Image;
  highlightIcon: Phaser.GameObjects.Image;
  battleScene: BattleScene;
  isHighlighted: boolean = false;

  infoRectangle: Phaser.GameObjects.Rectangle;
  infoText: Phaser.GameObjects.BitmapText;
  spellNameInfoText: Phaser.GameObjects.BitmapText;
  outlineRectangle: Phaser.GameObjects.Rectangle;

  spellCooldown: Phaser.GameObjects.BitmapText;
  disabled: boolean;

  constructor(scene: Phaser.Scene, tab: number, posX: number, spell: Spell) {
    super(scene, tab, posX);
    this.spell = spell;
    this.battleScene = this.myScene.battleScene;
    this.addRegularIcon();
    this.addHighlightIcon();
    this.addInfoText();
    this.createSpellCooldown();
    this.disabled = false;
  }

  private showInfo(show: boolean) {
    this.infoRectangle.visible = show;
    this.outlineRectangle.visible = show;
    this.infoText.visible = show;
    this.spellNameInfoText.visible = show;
  }

  addIcon(highlight: boolean) {
    const scale = this.myScene.uiScale;
    const iconFrame = highlight ? this.spell.frame + 1 : this.spell.frame;

    const icon = this.myScene.add
      .image(this.x, this.y, "player", iconFrame)
      .setScale(scale * this.iconScale)
      .setDepth(50000)
      .setVisible(!highlight)
      .setInteractive()
      .on("pointerup", () => {
        this.toggleSpellMode();
      })
      .on("pointerover", () => {
        this.showInfo(true);
      })
      .on("pointerout", () => {
        this.showInfo(false);
      });
    icon.y += icon.displayHeight / 2 - 2;

    if (highlight) {
      this.highlightIcon = icon;
    } else {
      this.icon = icon;
    }
  }

  addRegularIcon() {
    this.addIcon(false);
  }

  addHighlightIcon() {
    this.addIcon(true);
  }

  private toggleSpellMode() {
    if (
      this.battleScene.isPlayerTurn &&
      !this.battleScene.currentPlayer.isMoving
    ) {
      if (!this.isInaccessible()) {
        this.activateSpell();
      }
    }
  }

  private activateSpell() {
    this.myScene.clearSpellsHighlight();
    this.isHighlighted = true;

    this.refresh();
    this.battleScene.clearSpellRange();
    this.battleScene.displaySpellRange(this.spell);
  }

  /** Defines spell info text and draws it. */
  addInfoText() {
    const scale = this.myScene.uiScale;
    let height = 14 * scale;
    const infoOffset = this.icon.displayWidth / 2;
    const lineHeight = this.fontSize + 1;
    const fontSize = this.fontSize;
    let text = "";

    // spell name text in bold
    let spellNameText = `${this.spell.name}`;
    let maxLength = spellNameText.length;
    // spell cost
    let addText = `\ncost: ${this.spell.cost} PA`;
    maxLength = Math.max(maxLength, addText.length);
    text += addText;
    height += lineHeight;
    // spell range
    // addText = `\n${this.spell.minRange}-${this.spell.maxRange} range`;
    // maxLength = Math.max(maxLength, addText.length);
    // text += addText;
    // spell max cooldown
    // if (this.spell.maxCooldown > 0) {
    //   addText = `\ncooldown: ${this.spell.maxCooldown}`;
    //   maxLength = Math.max(maxLength, addText.length);
    //   text += addText;
    //   height += lineHeight;
    // }
    // spell damage
    if (this.spell.damage > 0) {
      addText = `\n-${this.spell.damage} HP`;
      maxLength = Math.max(maxLength, addText.length);
      text += addText;
      height += lineHeight;
    }
    // spell heal
    if (this.spell.heal > 0) {
      addText = `\n+${this.spell.heal} HP`;
      maxLength = Math.max(maxLength, addText.length);
      text += addText;
      height += lineHeight;
    }
    // spell malus PA
    if (this.spell.malusPA > 0) {
      addText = `\n-${this.spell.malusPA} PA`;
      maxLength = Math.max(maxLength, addText.length);
      text += addText;
      height += lineHeight;
    }
    // spell bonus PA
    if (this.spell.bonusPA > 0) {
      addText = `\n+${this.spell.bonusPA} PA`;
      maxLength = Math.max(maxLength, addText.length);
      text += addText;
      height += lineHeight;
    }
    // spell malus PM
    if (this.spell.malusPM > 0) {
      addText = `\n-${this.spell.malusPM} PM`;
      maxLength = Math.max(maxLength, addText.length);
      text += addText;
      height += lineHeight;
    }
    // spell bonus PM
    if (this.spell.bonusPM > 0) {
      addText = `\n+${this.spell.bonusPM} PM`;
      maxLength = Math.max(maxLength, addText.length);
      text += addText;
      height += lineHeight;
    }
    // spell effect over time
    if (this.spell.effectOverTime) {
      addText = `\neffect : ${this.spell.effectOverTime.name}(${this.spell.effectOverTime.duration})`;
      maxLength = Math.max(maxLength, addText.length);
      text += addText;
      height += lineHeight;
    }
    // spell summoned unit
    if (this.spell.summons) {
      addText = `\nsummons : ${this.spell.summons.type}`;
      maxLength = Math.max(maxLength, addText.length);
      text += addText;
      height += lineHeight;
    }
    // spell push/pull
    if (this.spell.moveTargetBy) {
      const pushOrPull = this.spell.moveTargetBy > 0 ? "push" : "pull";
      addText = `\n${pushOrPull} (${Math.abs(this.spell.moveTargetBy)})`;
      maxLength = Math.max(maxLength, addText.length);
      text += addText;
      height += lineHeight;
    }

    let infoTextWidth = 20 * scale + maxLength * (this.fontSize * 0.65);

    this.displayInfoTextOutline(infoTextWidth, infoOffset, height, scale);

    this.displayInfoText(spellNameText, fontSize, lineHeight, text);
  }

  private displayInfoText(
    spellNameText: string,
    fontSize: number,
    lineHeight: number,
    text: string
  ) {
    this.spellNameInfoText = this.myScene.add.bitmapText(
      this.infoRectangle.x - this.infoRectangle.displayWidth / 2 + 2,
      this.infoRectangle.y - this.infoRectangle.displayHeight / 2 + 3,
      "dogicapixelbold",
      spellNameText,
      fontSize
    );
    this.spellNameInfoText.depth = 20001;
    this.spellNameInfoText.visible = false;
    this.spellNameInfoText.alpha = 0.9;

    this.infoText = this.myScene.add.bitmapText(
      this.infoRectangle.x - this.infoRectangle.displayWidth / 2 + 4,
      this.infoRectangle.y -
        this.infoRectangle.displayHeight / 2 +
        lineHeight / 2,
      "dogicapixel",
      text,
      fontSize
    );
    this.infoText.depth = 20001;
    this.infoText.visible = false;
    this.infoText.alpha = 0.9;
  }

  private displayInfoTextOutline(
    width: number,
    infoOffset: number,
    height: number,
    scale: number
  ) {
    const xPos = this.x - width / 2 - infoOffset;
    const yPos = this.y - height / 2 - infoOffset;

    this.infoRectangle = this.myScene.add.rectangle(
      xPos,
      yPos,
      width,
      height,
      0x31593b
    );
    this.infoRectangle.depth = 20000;
    this.infoRectangle.alpha = 0.9;
    this.infoRectangle.visible = false;

    this.outlineRectangle = this.myScene.add.rectangle(
      xPos,
      yPos,
      width + scale,
      height + scale
    );
    this.outlineRectangle.setStrokeStyle(scale + 0.5, 0xffffff);
    this.outlineRectangle.alpha = 0.9;
    this.outlineRectangle.visible = false;
  }

  /** Disable spell visually if player cannot cast it. */
  hideIfInaccessible() {
    if (this.isInaccessible()) {
      this.icon.tint = 0x00a025;
    } else {
      this.icon.tint = 0xffffff;
    }
  }

  /** True if unit cannot currently cast this spell. */
  isInaccessible() {
    return (
      this.disabled ||
      this.battleScene.currentPlayer.pa < this.spell.cost ||
      this.spell.cooldown > 0
    );
  }

  override refresh(): void {
    this.createSpellCooldown();

    if (this.isHighlighted) {
      this.icon.visible = false;
      this.highlightIcon.visible = true;
    } else {
      this.icon.visible = true;
      this.highlightIcon.visible = false;
    }

    this.hideIfInaccessible();

    if (this.spell.cooldown > 0) {
      this.showSpellCooldown(true);
    } else {
      this.showSpellCooldown(false);
    }
  }

  showSpellCooldown(isVisible: boolean) {
    this.spellCooldown.visible = isVisible;
  }

  createSpellCooldown() {
    if (this.spellCooldown) this.spellCooldown.destroy();
    this.spellCooldown = this.myScene.add.bitmapText(
      this.icon.x,
      this.icon.y + 2,
      "dogicapixel",
      this.spell.cooldown.toString(),
      this.fontSize * 1.8
    );
    this.spellCooldown.setOrigin(0.5);
    this.spellCooldown.depth = 50001;
    this.spellCooldown.visible = false;
  }

  destroy() {
    this.highlightIcon.destroy();
    this.icon.destroy();
    this.infoRectangle.destroy();
    this.infoText.destroy();
    this.spellNameInfoText.destroy();
    this.outlineRectangle.destroy();
    this.spellCooldown.destroy();
  }
}
