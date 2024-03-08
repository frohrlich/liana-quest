import Phaser from "phaser";
import { UIElement } from "./UIElement";
import { Unit } from "../Unit";

/** Display unit stats (pa, pm, hp etc) on the UI. */
export class UnitStatDisplay extends UIElement {
  unit: Unit;
  unitName: Phaser.GameObjects.Text;
  text: Phaser.GameObjects.BitmapText;

  constructor(scene: Phaser.Scene, tab: number, posY: number, unit: Unit) {
    super(scene, tab, posY);
    this.unit = unit;
    this.unitName = this.myScene.add
      .text(this.x, this.y, this.unit.name, {
        font: `bold ${this.fontSize}px dogicapixel`,
        color: "#00ff40",
        fontSize: this.fontSize,
        wordWrap: { width: this.myScene.uiTabWidth, useAdvancedWrap: true },
      })
      .setResolution(20);

    this.text = this.addText(
      1,
      false,
      `AP: ${this.unit.pa}\nMP: ${this.unit.pm}\nHP: ${this.unit.hp}`
    );
    this.text.y = this.unitName.getBottomLeft().y + this.marginY / 2;
  }

  displayStats() {
    this.unitName.text = this.unit.name;
    this.text.text = `AP: ${this.unit.pa}\nMP: ${this.unit.pm}\nHP: ${this.unit.hp}`;
    this.text.y = this.unitName.getBottomLeft().y + this.marginY / 2;
  }

  override refresh() {
    this.displayStats();
  }

  changeUnit(unit: Unit) {
    this.unit = unit;
    this.displayStats();
  }
}
