import Phaser from "phaser";
import { Spell } from "../battle/Spell";

export class CardUISpell extends Phaser.GameObjects.Container {
  scale = 1.65;
  fontSize = 8;
  iconAlpha = 0.7;

  scene: Phaser.Scene;
  x: number;
  y: number;
  spell: Spell;
  icon: Phaser.GameObjects.Image;
  infoRectangle: Phaser.GameObjects.Rectangle;
  infoText: Phaser.GameObjects.BitmapText;
  spellNameInfoText: Phaser.GameObjects.BitmapText;
  outlineRectangle: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number, spell: Spell) {
    super(scene, x, y);
    this.spell = spell;
    this.addIcon();
    this.addInfoText();
    this.sendToBack(this.infoRectangle);
    this.sendToBack(this.outlineRectangle);
  }

  private showInfo(show: boolean) {
    this.infoRectangle.visible = show;
    this.outlineRectangle.visible = show;
    this.infoText.visible = show;
    this.spellNameInfoText.visible = show;
    this.icon.alpha = show ? 1 : this.iconAlpha;
  }

  addIcon() {
    this.icon = new Phaser.GameObjects.Image(
      this.scene,
      0,
      0,
      "player",
      this.spell.frame
    )
      .setScale(this.scale)
      .setAlpha(this.iconAlpha)
      .setInteractive()
      .on("pointerover", () => {
        this.showInfo(true);
      })
      .on("pointerout", () => {
        this.showInfo(false);
      });
    this.add(this.icon);
  }

  /** Defines spell info text and draws it. */
  addInfoText() {
    const infoOffset = this.icon.displayWidth / 2 + 5;
    const lineHeight = this.fontSize + 1;
    let text = "";

    // spell name text in bold
    let spellNameText = `${this.spell.name}`;
    // spell cost
    let addText = `\ncost: ${this.spell.cost} PA`;
    text += addText;
    // spell range
    // addText = `\n${this.spell.minRange}-${this.spell.maxRange} range`;
    // text += addText;
    // spell max cooldown
    // if (this.spell.maxCooldown > 0) {
    //   addText = `\ncooldown: ${this.spell.maxCooldown}`;
    //   text += addText;
    // }
    // spell damage
    if (this.spell.damage > 0) {
      addText = `\n-${this.spell.damage} HP`;
      text += addText;
    }
    // spell heal
    if (this.spell.heal > 0) {
      addText = `\n+${this.spell.heal} HP`;
      text += addText;
    }
    // spell malus PA
    if (this.spell.malusPA > 0) {
      addText = `\n-${this.spell.malusPA} PA`;
      text += addText;
    }
    // spell bonus PA
    if (this.spell.bonusPA > 0) {
      addText = `\n+${this.spell.bonusPA} PA`;
      text += addText;
    }
    // spell malus PM
    if (this.spell.malusPM > 0) {
      addText = `\n-${this.spell.malusPM} PM`;
      text += addText;
    }
    // spell bonus PM
    if (this.spell.bonusPM > 0) {
      addText = `\n+${this.spell.bonusPM} PM`;
      text += addText;
    }
    // spell effect over time
    if (this.spell.effectOverTime) {
      addText = `\neffect : ${this.spell.effectOverTime.name}(${this.spell.effectOverTime.duration})`;
      text += addText;
    }
    // spell summoned unit
    if (this.spell.summons) {
      addText = `\nsummons : ${this.spell.summons.type}`;
      text += addText;
    }
    // spell push/pull
    if (this.spell.moveTargetBy) {
      const pushOrPull = this.spell.moveTargetBy > 0 ? "push" : "pull";
      addText = `\n${pushOrPull} (${Math.abs(this.spell.moveTargetBy)})`;
      text += addText;
    }

    this.displayInfoText(spellNameText, this.fontSize, text);
    this.displayInfoTextOutline(infoOffset, this.scale, lineHeight);
  }

  private displayInfoText(
    spellNameText: string,
    fontSize: number,
    text: string
  ) {
    this.spellNameInfoText = new Phaser.GameObjects.BitmapText(
      this.scene,
      0,
      0,
      "dogicapixelbold",
      spellNameText,
      fontSize
    )
      .setVisible(false)
      .setAlpha(0.9);
    this.add(this.spellNameInfoText);

    this.infoText = new Phaser.GameObjects.BitmapText(
      this.scene,
      0,
      0,
      "dogicapixel",
      text,
      fontSize
    )
      .setVisible(false)
      .setAlpha(0.9);
    this.add(this.infoText);
  }

  private displayInfoTextOutline(
    infoOffset: number,
    lineWidth: number,
    lineHeight: number
  ) {
    const spellTitleLeftMargin = 2;
    const spellTitleTopMargin = 3;
    const infoTextLeftMargin = 4;
    const infoTextTopMargin = lineHeight / 2;

    const width = Math.max(
      this.infoText.displayWidth,
      this.spellNameInfoText.displayWidth
    );
    const height =
      this.infoText.displayHeight + this.spellNameInfoText.displayHeight;

    const xPos = -width / 2 - infoOffset;
    const yPos = -height / 2 - infoOffset;

    this.infoRectangle = new Phaser.GameObjects.Rectangle(
      this.scene,
      xPos,
      yPos,
      width + infoTextLeftMargin * 2,
      height,
      0x31593b
    )
      .setVisible(false)
      .setAlpha(0.9);
    this.add(this.infoRectangle);

    this.outlineRectangle = new Phaser.GameObjects.Rectangle(
      this.scene,
      xPos,
      yPos,
      width + infoTextLeftMargin * 2 + lineWidth,
      height + lineWidth
    ).setStrokeStyle(lineWidth + 0.5, 0xffffff);
    this.outlineRectangle.alpha = 0.9;
    this.outlineRectangle.visible = false;
    this.add(this.outlineRectangle);

    this.spellNameInfoText.setPosition(
      this.infoRectangle.x -
        this.infoRectangle.displayWidth / 2 +
        spellTitleLeftMargin,
      this.infoRectangle.y -
        this.infoRectangle.displayHeight / 2 +
        spellTitleTopMargin
    );
    this.infoText.setPosition(
      this.infoRectangle.x -
        this.infoRectangle.displayWidth / 2 +
        infoTextLeftMargin,
      this.infoRectangle.y -
        this.infoRectangle.displayHeight / 2 +
        infoTextTopMargin
    );
  }
}
