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
  infoText: Phaser.GameObjects.Text;
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
    this.icon.scale = this.highlightIcon.scale = 5;
    this.icon.y += this.icon.displayHeight / 2;
    this.icon.setInteractive();
    this.highlightIcon.y += this.highlightIcon.displayHeight / 2;
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
    let height = 100;
    const lineHeight = this.fontSize + 10;
    const fontSize = this.fontSize - 5;
    let text = "";
    let addText = `-${this.spell.name}-\n\ncost: ${this.spell.cost} PA`;
    let maxLength = addText.length;
    text += addText;
    addText = `\n\n${this.spell.minRange}-${this.spell.maxRange} range`;
    maxLength = Math.max(maxLength, addText.length);
    text += addText;
    if (this.spell.damage > 0) {
      addText = `\n\n${this.spell.damage} damage`;
      maxLength = Math.max(maxLength, addText.length);
      text += addText;
      height += lineHeight;
    }
    if (this.spell.malusPA > 0) {
      addText = `\n\n-${this.spell.malusPA} PA`;
      maxLength = Math.max(maxLength, addText.length);
      text += addText;
      height += lineHeight;
    }
    if (this.spell.malusPM > 0) {
      addText = `\n\n-${this.spell.malusPM} PM`;
      maxLength = Math.max(maxLength, addText.length);
      text += addText;
      height += lineHeight;
    }
    if (this.spell.effectOverTime) {
      addText = `\n\neffect : ${this.spell.effectOverTime.name}(${this.spell.effectOverTime.duration})`;
      maxLength = Math.max(maxLength, addText.length);
      text += addText;
      height += lineHeight;
    }

    let width = maxLength * (this.fontSize * 0.55);

    this.infoRectangle = this.myScene.add.rectangle(
      this.icon.x + this.icon.displayWidth + width / 4,
      this.icon.y - height * 0.7,
      width,
      height,
      0x31593b
    );
    this.infoRectangle.depth = 20000;
    this.infoRectangle.alpha = 0.9;
    this.infoRectangle.visible = false;

    this.outlineRectangle = this.myScene.add.rectangle(
      this.icon.x + this.icon.displayWidth + width / 4,
      this.icon.y - height * 0.7,
      width + 5,
      height + 5
    );
    this.outlineRectangle.depth = 20000;
    this.outlineRectangle.setStrokeStyle(5, 0xffffff);
    this.outlineRectangle.isStroked = true;
    this.outlineRectangle.alpha = 0.9;
    this.outlineRectangle.visible = false;

    this.infoText = this.myScene.add.text(
      this.infoRectangle.x - this.infoRectangle.displayWidth / 2 + 5,
      this.infoRectangle.y - this.infoRectangle.displayHeight / 2 + 5,
      text,
      {
        color: "#00FF00",
        fontSize: fontSize,
        fontFamily: "PublicPixel",
      }
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
