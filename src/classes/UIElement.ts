import Phaser from "phaser";
import { UIScene } from "../scenes/UIScene";

export abstract class UIElement {
  // which UI tab does this element belong to
  // starting from 0 (leftmost)
  tab: number;
  // vertical position in the tab (0-4)
  posY: number;
  myScene: UIScene;
  fontSize: number;
  textStyle: Phaser.Types.GameObjects.Text.TextStyle;
  x: number;
  y: number;
  margin: number;

  constructor(scene: Phaser.Scene, tab: number, posY: number) {
    this.tab = tab;
    this.posY = posY;
    this.myScene = scene as UIScene;
    this.fontSize = this.myScene.battleScene.tileWidth;
    console.log(this.fontSize);

    this.margin = 2 * this.myScene.uiScale;
    this.x = this.myScene.uiTabWidth * this.tab + this.margin;
    this.y = this.myScene.topY + (this.fontSize + this.margin) * this.posY;
  }

  addText(scale: number, ...text: string[]): Phaser.GameObjects.BitmapText {
    return this.myScene.add
      .bitmapText(
        this.x + this.margin,
        this.y + this.margin,
        "rainyhearts",
        text,
        this.fontSize * scale
      )
      .setTint(this.myScene.uiFontColor);
  }

  abstract refresh(): void;
}
