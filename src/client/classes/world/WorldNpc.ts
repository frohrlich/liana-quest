import Phaser from "phaser";
import { WorldUnit } from "./WorldUnit";
import { DialogData } from "../../data/WorldData";

export class WorldNpc extends WorldUnit {
  // delay between each random movement of the npc on the map
  movingDelay = 10000;
  // range (in tiles) of a random movement on the map
  movingRange = 3;
  dialogData: DialogData;
  illustrationKey: string;

  constructor(
    scene: Phaser.Scene,
    id: string,
    indX: number,
    indY: number,
    texture: string,
    frame: number,
    type: string,
    name: string,
    baseTint: number,
    dialogData: DialogData = null,
    illustrationKey: string = null
  ) {
    super(scene, id, indX, indY, texture, frame, type, name, baseTint);
    this.dialogData = dialogData;
    this.illustrationKey = illustrationKey;
  }

  makeTalkOption() {
    return this.makeInteractionMenuItem("Talk", 0xffffff, false, () => {
      this.myScene.input.off("pointerup");
      this.myScene.startDialog(this);
    });
  }
}
