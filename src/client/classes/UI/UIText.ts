import Phaser from "phaser";
import { UIElement } from "./UIElement";
import { Unit } from "../battle/Unit";

// for simple text on the UI (ie titles)
export class UIText extends UIElement {
  unit: Unit;
  text: Phaser.GameObjects.BitmapText;

  constructor(scene: Phaser.Scene, tab: number, posY: number, text: string) {
    super(scene, tab, posY);
    this.text = this.addText(1, text);
    this.text.setOrigin(0.5);
    const margin = this.myScene.uiScale * 2;
    this.text.y += margin;
    this.text.x -= margin;
  }

  override refresh() {}
}
