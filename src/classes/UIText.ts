import Phaser from "phaser";
import { UIElement } from "./UIElement";
import { Unit } from "./Unit";

// display unit stats (pa, pm, hp etc) on the UI
export class UIText extends UIElement {
  unit: Unit;
  text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, tab: number, posY: number, text: string) {
    super(scene, tab, posY);
    this.text = this.addText(text);
    this.text.setOrigin(0.5);
    this.text.y += 10;
  }

  override refresh() {}
}
