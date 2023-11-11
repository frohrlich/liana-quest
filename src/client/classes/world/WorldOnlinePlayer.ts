import Phaser from "phaser";
import { WorldUnit } from "./WorldUnit";

export class WorldOnlinePlayer extends WorldUnit {
  // id used by server to identify player
  playerId: string;

  constructor(
    scene: Phaser.Scene,
    playerId: string,
    indX: number,
    indY: number,
    texture: string,
    frame: number,
    name: string
  ) {
    super(scene, indX, indY, texture, frame, name);
    this.playerId = playerId;
  }

  override updateServerDirection() {
    this.myScene.socket.emit("updateDirection", this.direction);
  }
}
