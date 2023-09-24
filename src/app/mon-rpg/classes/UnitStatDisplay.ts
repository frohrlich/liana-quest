import Phaser from 'phaser';
import { UIElement } from './UIElement';
import { Unit } from './Unit';

// display unit stats (pa, pm, hp etc) on the UI
export class UnitStatDisplay extends UIElement {
  unit: Unit;

  constructor(scene: Phaser.Scene, tab: number, posY: number, unit: Unit) {
    super(scene, tab, posY);
    this.unit = unit;
    this.displayStats();
  }

  displayStats() {
    this.removeAll(true);
    this.addText(
      `PA : ${this.unit.pa}\n`,
      `PM : ${this.unit.pm}\n`,
      `HP : ${this.unit.hp}`
    );
  }

  override refresh() {
    this.displayStats();
  }
}
