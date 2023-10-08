import Phaser from "phaser";
import { UIElement } from "./UIElement";
import { Spell } from "./Spell";
import { BattleScene } from "../scenes/BattleScene";

export class UISpell extends UIElement {
  spell: Spell;
  icon: Phaser.GameObjects.Image;
  highlightIcon: Phaser.GameObjects.Image;
  battleScene: BattleScene;
  isHighlighted: boolean = false;
  infoRectangle: Phaser.GameObjects.Rectangle;
  infoText: Phaser.GameObjects.BitmapText;
  outlineRectangle: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, tab: number, posY: number, spell: Spell) {
    super(scene, tab, posY);
    this.spell = spell;
    this.battleScene = this.myScene.battleScene;
    this.addIcon();
    this.addInfoText();
  }

  private showInfo(show: boolean) {
    this.infoRectangle.visible = show;
    this.outlineRectangle.visible = show;
    this.infoText.visible = show;
  }

  addIcon() {
    const scale = this.myScene.uiScale;
    this.icon = this.myScene.add.image(
      this.x,
      this.y,
      "player",
      this.spell.frame
    );
    this.highlightIcon = this.myScene.add.image(
      this.x,
      this.y,
      "player",
      this.spell.frame + 1
    );
    this.icon.scale = this.highlightIcon.scale = scale * 0.9;
    this.icon.y += this.icon.displayHeight / 2 + 2;
    this.icon.setInteractive();
    this.highlightIcon.y += this.highlightIcon.displayHeight / 2 + 2;
    this.highlightIcon.visible = false;
    this.highlightIcon.setInteractive();

    this.icon.on("pointerup", () => {
      this.toggleSpellMode();
    });
    this.highlightIcon.on("pointerup", () => {
      this.toggleSpellMode();
    });
    this.icon.on("pointerover", () => {
      this.showInfo(true);
    });
    this.icon.on("pointerout", () => {
      this.showInfo(false);
    });
    this.highlightIcon.on("pointerover", () => {
      this.showInfo(true);
    });
    this.highlightIcon.on("pointerout", () => {
      this.showInfo(false);
    });
  }

  private toggleSpellMode() {
    if (this.battleScene.isPlayerTurn && !this.battleScene.player.isMoving) {
      if (this.battleScene.player.pa >= this.spell.cost) {
        this.myScene.clearSpellsHighlight();
        this.isHighlighted = true;
        this.refresh();
        this.battleScene.displaySpellRange(this.spell);
      }
    }
  }

  addInfoText() {
    const scale = this.myScene.uiScale;
    let height = 14 * scale;
    const lineHeight = this.fontSize;
    const fontSize = this.fontSize;
    let text = "";
    let addText = `-${this.spell.name}-\ncost: ${this.spell.cost} PA`;
    let maxLength = addText.length;
    text += addText;
    // addText = `\n${this.spell.minRange}-${this.spell.maxRange} range`;
    // maxLength = Math.max(maxLength, addText.length);
    // text += addText;
    if (this.spell.damage > 0) {
      addText = `\n-${this.spell.damage} HP`;
      maxLength = Math.max(maxLength, addText.length);
      text += addText;
      height += lineHeight;
    }
    if (this.spell.heal > 0) {
      addText = `\n+${this.spell.heal} HP`;
      maxLength = Math.max(maxLength, addText.length);
      text += addText;
      height += lineHeight;
    }
    if (this.spell.malusPA > 0) {
      addText = `\n-${this.spell.malusPA} PA`;
      maxLength = Math.max(maxLength, addText.length);
      text += addText;
      height += lineHeight;
    }
    if (this.spell.bonusPA > 0) {
      addText = `\n+${this.spell.bonusPA} PA`;
      maxLength = Math.max(maxLength, addText.length);
      text += addText;
      height += lineHeight;
    }
    if (this.spell.malusPM > 0) {
      addText = `\n-${this.spell.malusPM} PM`;
      maxLength = Math.max(maxLength, addText.length);
      text += addText;
      height += lineHeight;
    }
    if (this.spell.bonusPM > 0) {
      addText = `\n+${this.spell.bonusPM} PM`;
      maxLength = Math.max(maxLength, addText.length);
      text += addText;
      height += lineHeight;
    }
    if (this.spell.effectOverTime) {
      addText = `\neffect : ${this.spell.effectOverTime.name}(${this.spell.effectOverTime.duration})`;
      maxLength = Math.max(maxLength, addText.length);
      text += addText;
      height += lineHeight;
    }

    let width = maxLength * (this.fontSize * 0.5);

    const xPos = this.x + width / 2;
    const yPos = this.y - height / 2;

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
    this.outlineRectangle.depth = 20000;
    this.outlineRectangle.setStrokeStyle(scale + 0.5, 0xffffff);
    this.outlineRectangle.isStroked = true;
    this.outlineRectangle.alpha = 0.9;
    this.outlineRectangle.visible = false;

    this.infoText = this.myScene.add.bitmapText(
      this.infoRectangle.x - this.infoRectangle.displayWidth / 2 + 2,
      this.infoRectangle.y - this.infoRectangle.displayHeight / 2 + 2,
      "rainyhearts",
      text,
      fontSize
    );
    this.infoText.depth = 20001;
    this.infoText.visible = false;
    this.infoText.alpha = 0.9;
  }

  // disable spell visually if player cannot launch it
  hideIfInaccessible() {
    if (this.isInaccessible()) {
      this.icon.tint = 0x00a025;
    } else {
      this.icon.tint = 0xffffff;
    }
  }

  // true if unit cannot currently launch this spell
  isInaccessible() {
    return this.battleScene.player.pa < this.spell.cost;
  }

  override refresh(): void {
    if (this.isHighlighted) {
      this.icon.visible = false;
      this.highlightIcon.visible = true;
    } else {
      this.icon.visible = true;
      this.highlightIcon.visible = false;
    }
    this.hideIfInaccessible();
  }
}
