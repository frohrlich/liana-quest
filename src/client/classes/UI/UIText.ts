import Phaser from "phaser";
import { UIElement } from "./UIElement";
import { Unit } from "../battle/Unit";

/** For simple text on the UI (ie titles) */
export class UIText extends UIElement {
  unit: Unit;
  text: Phaser.GameObjects.BitmapText;

  constructor(scene: Phaser.Scene, tab: number, posX: number, text: string) {
    super(scene, tab, posX);
    this.y += this.myScene.offset;
    this.text = this.addText(1, true, text);
    this.text.setOrigin(0, 0.5);
  }

  override refresh() {}
}
