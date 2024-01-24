import Phaser from "phaser";
import { UIScene } from "../../scenes/UIScene";

export abstract class UIElement {
  // which UI tab does this element belong to
  // starting from 0 (topmost)
  tab: number;
  posX: number;
  myScene: UIScene;
  fontSize: number;
  textStyle: Phaser.Types.GameObjects.Text.TextStyle;
  x: number;
  y: number;
  marginX: number;
  marginY: number;

  constructor(scene: Phaser.Scene, tab: number, posX: number) {
    this.tab = tab;
    this.posX = posX;
    this.myScene = scene as UIScene;
    this.fontSize = this.myScene.battleScene.tileWidth;

    this.marginX = 2 * this.myScene.uiScale;
    this.marginY = 4 * this.myScene.uiScale;
    this.y =
      (this.myScene.height / 3 + this.myScene.offset * 2) * this.tab +
      this.marginY;
    this.x = this.myScene.leftX + posX * this.myScene.uiTabWidth + this.marginX;
  }

  addText(
    scale: number,
    bold: boolean,
    ...text: string[]
  ): Phaser.GameObjects.BitmapText {
    return this.myScene.add
      .bitmapText(
        this.x,
        this.y,
        "dogicapixel" + (bold ? "bold" : ""),
        text,
        this.fontSize * scale
      )
      .setTint(this.myScene.uiFontColor);
  }

  abstract refresh(): void;
}
