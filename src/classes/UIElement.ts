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

  constructor(scene: Phaser.Scene, tab: number, posY: number) {
    this.tab = tab;
    this.posY = posY;
    this.myScene = scene as UIScene;
    this.fontSize = this.myScene.uiTabHeight / 6;
    let margin = 10;
    this.x = this.myScene.uiTabWidth * this.tab + margin;
    this.y = this.myScene.topY + (this.fontSize + 10) * this.posY + margin;
    this.textStyle = {
      color: "#00FF00",
      fontSize: this.fontSize,
      fontFamily: "PublicPixel",
    };
  }

  addText(...text: string[]): Phaser.GameObjects.Text {
    return this.myScene.add.text(this.x, this.y, text, this.textStyle);
  }

  abstract refresh(): void;
}
