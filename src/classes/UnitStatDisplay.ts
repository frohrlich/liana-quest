import Phaser from "phaser";
import { UIElement } from "./UIElement";
import { Unit } from "./Unit";

// display unit stats (pa, pm, hp etc) on the UI
export class UnitStatDisplay extends UIElement {
  unit: Unit;
  text: Phaser.GameObjects.BitmapText;

  constructor(scene: Phaser.Scene, tab: number, posY: number, unit: Unit) {
    super(scene, tab, posY);
    this.unit = unit;
    this.text = this.addText(
      1,
      `${this.unit.type}\nPA: ${this.unit.pa}\nPM: ${this.unit.pm}\nHP: ${this.unit.hp}`
    );
  }

  displayStats() {
    this.text.text = `${this.unit.type}\nPA: ${this.unit.pa}\nPM: ${this.unit.pm}\nHP : ${this.unit.hp}`;
  }

  override refresh() {
    this.displayStats();
  }

  changeUnit(unit: Unit) {
    this.unit = unit;
    this.displayStats();
  }
}
