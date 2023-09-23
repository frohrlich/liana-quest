import Phaser from 'phaser';
import { UIScene } from '../scenes/UIScene';

export abstract class UIElement extends Phaser.GameObjects.Container {
  // which UI tab does this container belong to
  // starting from 0 (leftmost)
  tab: number;
  // vertical position in the tab (0-4)
  posY: number;
  myScene: UIScene;
  fontSize: number;
  textStyle: Phaser.Types.GameObjects.Text.TextStyle;

  constructor(scene: Phaser.Scene, tab: number, posY: number) {
    super(scene);
    this.tab = tab;
    this.posY = posY;
    this.myScene = this.scene as UIScene;
    this.fontSize = this.myScene.uiTabHeight / 5;
    let margin = 10;
    this.x = this.myScene.uiTabWidth * this.tab + margin;
    this.y = this.myScene.topY + this.fontSize * this.posY + margin;
    this.textStyle = {
      color: '#00FF00',
      backgroundColor: '#000066',
      fontSize: this.fontSize,
      fontFamily: 'Noto Sans',
    };
  }

  addText(...text: string[]): Phaser.GameObjects.Text {
    let myText = new Phaser.GameObjects.Text(
      this.scene,
      0,
      0,
      text,
      this.textStyle
    );
    this.add(myText);
    return myText;
  }

  abstract refresh(): void;
}
