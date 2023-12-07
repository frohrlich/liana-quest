import Phaser from "phaser";
import { WorldUnit } from "./WorldUnit";
import findPath from "../../utils/findPath";

export class WorldNpc extends WorldUnit {
  // delay between each random movement of the npc on the map
  movingDelay = 10000;
  // range (in tiles) of a random movement on the map
  movingRange = 3;
  // the id is used to link a world npc to its battle counterpart
  id: string;
  timer: Phaser.Time.TimerEvent;

  constructor(
    scene: Phaser.Scene,
    id: string,
    indX: number,
    indY: number,
    texture: string,
    frame: number,
    name: string
  ) {
    super(scene, indX, indY, texture, frame, name);
    this.id = id;
    // this.moveRandomly(this.movingDelay, this.movingRange);
  }

  override destroy(fromScene?: boolean): void {
    this.timer.remove();
    super.destroy();
  }
}
