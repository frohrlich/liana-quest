import Phaser from "phaser";
import { UIElement } from "./UIElement";
import { Unit } from "../Unit";

/** Display unit stats (pa, pm, hp etc) on the UI. */
export class UnitStatDisplay extends UIElement {
  unit: Unit;
  unitName: Phaser.GameObjects.BitmapText;
  text: Phaser.GameObjects.BitmapText;

  constructor(scene: Phaser.Scene, tab: number, posY: number, unit: Unit) {
    super(scene, tab, posY);
    this.unit = unit;
    this.unitName = this.addText(1, true, `${this.unit.type}`);

    this.text = this.addText(
      1,
      false,
      `PA: ${this.unit.pa}\nPM: ${this.unit.pm}\nHP: ${this.unit.hp}`
    );
    this.text.y += this.fontSize + this.marginY / 2;
  }

  displayStats() {
    this.unitName.text = `${this.unit.type}`;
    this.text.text = `PA: ${this.unit.pa}\nPM: ${this.unit.pm}\nHP: ${this.unit.hp}`;
  }

  override refresh() {
    this.displayStats();
  }

  changeUnit(unit: Unit) {
    this.unit = unit;
    this.displayStats();
  }
}
