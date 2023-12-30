import Phaser from "phaser";
import { WorldUnit } from "./WorldUnit";

export class WorldNpc extends WorldUnit {
  // delay between each random movement of the npc on the map
  movingDelay = 10000;
  // range (in tiles) of a random movement on the map
  movingRange = 3;

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
}
