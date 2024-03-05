import Phaser from "phaser";
import { UnitData } from "../../data/UnitData";
import { decodeSpellString } from "../../data/SpellData";
import { CardUISpell } from "./CardUISpell";

export class Card extends Phaser.GameObjects.Container {
  cardWidth = 200;
  cardHeight = 300;
  outlineWidth = 8;
  outlineColor = 0xffffff;
  fillColor = 0x191430;
  illustrationTint = 0x333333;
  fontSize = 16;
  caracFontSize = 32;

  unitData: UnitData;
  // if card on right of screen, character description will go to the left
  isOnRight: boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    unitData: UnitData,
    isOnRight: boolean = false
  ) {
    super(scene, x, y);
    this.unitData = unitData;
    this.isOnRight = isOnRight;
    this.makeIllustration();
    this.makeCardOutline();
    this.makeName();
    this.makeCharacteristics();
    this.makeCharacterIcon();
    this.makeSpellIcons();
    // uncomment this if you want character description to appear alongside card
    // this.makeDescription();
    this.setSize(this.cardWidth, this.cardHeight);
    this.setInteractive();
    this.on("pointerup", () => {
      this.toggleCardView();
    });
  }

  private toggleCardView() {
    this.getAll("name", "toggle").forEach((child) => {
      const myChild = child as Phaser.GameObjects.Image;
      myChild.setVisible(!myChild.visible);
    });
    const illustration = this.getByName(
      "illustration"
    ) as Phaser.GameObjects.Image;
    illustration.setTint(
      illustration.tint === this.illustrationTint
        ? 0xffffff
        : this.illustrationTint
    );
  }

  makeDescription() {
    const descriptionMargin = 2;
    const descriptionText = new Phaser.GameObjects.BitmapText(
      this.scene,
      this.cardWidth / 2 + this.outlineWidth + descriptionMargin,
      0,
      "dogicapixel",
      this.unitData.description,
      this.fontSize
    )
      .setVisible(false)
      .setName("toggle");
    if (this.isOnRight) {
      descriptionText.x = -descriptionText.x - descriptionText.displayWidth;
    }
    // text
    this.add(descriptionText);
    const descriptionOutline = new Phaser.GameObjects.Rectangle(
      this.scene,
      descriptionText.x - descriptionMargin,
      descriptionText.y - descriptionMargin,
      descriptionText.displayWidth + descriptionMargin * 2,
      descriptionText.displayHeight + descriptionMargin * 2,
      0,
      0.7
    )
      .setStrokeStyle(1, this.outlineColor)
      .setOrigin(0, 0)
      .setVisible(false)
      .setName("toggle");
    // outline
    this.add(descriptionOutline);
    this.sendToBack(descriptionOutline);
  }

  makeSpellIcons() {
    const spells = decodeSpellString(this.unitData.spells);
    for (let i = 0; i < spells.length; i++) {
      const spell = spells[i];
      this.add(
        new CardUISpell(
          this.scene,
          (this.cardWidth * (i - 1)) / 3.2,
          this.cardHeight / 6,
          spell
        ).setName("toggle")
      );
    }
  }

  makeCharacterIcon() {
    this.add(
      new Phaser.GameObjects.Image(
        this.scene,
        0,
        -this.cardHeight / 8,
        "player",
        this.unitData.frame
      )
        .setScale(4)
        .setAlpha(0.7)
        .setName("toggle")
    );
  }

  makeName() {
    this.add(
      new Phaser.GameObjects.BitmapText(
        this.scene,
        0,
        -this.cardHeight / 2 + 10,
        "dogicapixelbold",
        this.unitData.type,
        this.fontSize
      )
        .setScale(1.2)
        .setOrigin(0.5, 0)
        .setName("toggle")
    );
  }

  makeCharacteristics() {
    const margin = 10;
    // MP
    this.add(
      new Phaser.GameObjects.BitmapText(
        this.scene,
        -this.cardWidth / 2 + margin,
        this.cardHeight / 2 - this.caracFontSize - margin,
        "dogicapixel",
        this.unitData.PM.toString(),
        this.caracFontSize
      ).setName("toggle")
    );
    // AP
    this.add(
      new Phaser.GameObjects.BitmapText(
        this.scene,
        this.cardWidth / 2 - this.caracFontSize - margin,
        this.cardHeight / 2 - this.caracFontSize - margin,
        "dogicapixel",
        this.unitData.PA.toString(),
        this.caracFontSize
      )
        .setTint(0x33c6f7)
        .setName("toggle")
    );
    // HP
    this.add(
      new Phaser.GameObjects.BitmapText(
        this.scene,
        0,
        this.cardHeight / 2 - this.caracFontSize - margin,
        "dogicapixel",
        this.unitData.HP.toString(),
        this.caracFontSize
      )
        .setTint(0xff0000)
        .setOrigin(0.5, 0)
        .setName("toggle")
    );
  }

  makeIllustration() {
    this.add(
      new Phaser.GameObjects.Image(
        this.scene,
        0,
        0,
        this.unitData.type + "Illus"
      )
        .setTint(this.illustrationTint)
        .setName("illustration")
    );
  }

  makeCardOutline() {
    this.add(
      new Phaser.GameObjects.Rectangle(
        this.scene,
        0,
        0,
        this.cardWidth,
        this.cardHeight
      ).setStrokeStyle(this.outlineWidth, this.outlineColor)
    );
  }
}
