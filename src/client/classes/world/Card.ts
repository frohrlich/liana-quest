import Phaser from "phaser";
import { UnitData } from "../../data/UnitData";

export class Card extends Phaser.GameObjects.Container {
  cardWidth = 100;
  cardHeight = 150;
  outlineWidth = 4;
  outlineColor = 0xffffff;
  fillColor = 0x191430;

  unitData: UnitData;

  constructor(scene: Phaser.Scene, x: number, y: number, unitData: UnitData) {
    super(scene, x, y);
    this.unitData = unitData;
    this.makeIllustration();
    this.makeCardOutline();
    this.makeName();
    this.makeCharacteristics();
  }

  makeName() {
    this.add(
      new Phaser.GameObjects.BitmapText(
        this.scene,
        -this.cardWidth / 4,
        -this.cardHeight / 2 + 10,
        "dogicapixelbold",
        this.unitData.type,
        8
      )
    );
  }

  makeCharacteristics() {
    const caracFontSize = 16;
    const margin = 5;
    // PM
    this.add(
      new Phaser.GameObjects.BitmapText(
        this.scene,
        -this.cardWidth / 2 + margin,
        this.cardHeight / 2 - caracFontSize - margin,
        "dogicapixel",
        this.unitData.PM.toString(),
        caracFontSize
      )
    );
    // PA
    this.add(
      new Phaser.GameObjects.BitmapText(
        this.scene,
        this.cardWidth / 2 - caracFontSize - margin,
        this.cardHeight / 2 - caracFontSize - margin,
        "dogicapixel",
        this.unitData.PA.toString(),
        caracFontSize
      ).setTint(0x33c6f7)
    );
    // HP
    this.add(
      new Phaser.GameObjects.BitmapText(
        this.scene,
        0,
        this.cardHeight / 2 - caracFontSize - margin,
        "dogicapixel",
        this.unitData.HP.toString(),
        caracFontSize
      )
        .setTint(0xff0000)
        .setOrigin(0.5, 0)
    );
  }

  makeIllustration() {
    this.add(
      new Phaser.GameObjects.Image(
        this.scene,
        0,
        0,
        this.unitData.type + "Illus"
      ).setTint(0x555555)
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
