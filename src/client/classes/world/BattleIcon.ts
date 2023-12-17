import Phaser from "phaser";

export class BattleIcon extends Phaser.GameObjects.Image {
  id: string;

  constructor(
    scene: Phaser.Scene,
    id: string,
    x: number,
    y: number,
    texture: string,
    frame: number
  ) {
    super(scene, x, y, texture, frame);
    this.id = id;
  }
}
