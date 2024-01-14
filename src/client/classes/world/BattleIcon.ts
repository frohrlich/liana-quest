import Phaser from "phaser";
import { WorldScene } from "../../scenes/WorldScene";

export class BattleIcon extends Phaser.GameObjects.Image {
  id: string;
  myScene: WorldScene;
  indX: number;
  indY: number;

  constructor(
    scene: Phaser.Scene,
    id: string,
    indX: number,
    indY: number,
    texture: string,
    frame: number
  ) {
    super(scene, 0, 0, texture, frame);
    this.myScene = scene as WorldScene;
    this.indX = indX;
    this.indY = indY;
    this.x = this.myScene.map.tileToWorldX(indX);
    this.y = this.myScene.map.tileToWorldY(indY);
    this.id = id;
  }
}
