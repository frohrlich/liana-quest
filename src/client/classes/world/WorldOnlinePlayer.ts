import Phaser from "phaser";
import { WorldUnit } from "./WorldUnit";

export class WorldOnlinePlayer extends WorldUnit {
  constructor(
    scene: Phaser.Scene,
    id: string,
    indX: number,
    indY: number,
    texture: string,
    frame: number,
    name: string
  ) {
    super(scene, id, indX, indY, texture, frame, name);
  }

  override updateServerDirection() {
    this.myScene.socket.emit("updateDirection", this.direction);
  }
}
