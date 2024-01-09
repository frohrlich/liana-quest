import Phaser from "phaser";
import { WorldUnit } from "./WorldUnit";
import { DialogData } from "../../data/NpcData";

export class WorldNpc extends WorldUnit {
  // delay between each random movement of the npc on the map
  movingDelay = 10000;
  // range (in tiles) of a random movement on the map
  movingRange = 3;
  dialogData: DialogData;

  constructor(
    scene: Phaser.Scene,
    id: string,
    indX: number,
    indY: number,
    texture: string,
    frame: number,
    name: string,
    baseTint: number,
    dialogData: DialogData = null
  ) {
    super(scene, id, indX, indY, texture, frame, name, baseTint);
    this.dialogData = dialogData;
  }

  makeSpeakOption() {
    this.interactionMenuRectangle = this.myScene.add
      .rectangle(
        0,
        0,
        this.interactionMenuWidth,
        this.interactionMenuHeight,
        0xffffff,
        0.9
      )
      .setStrokeStyle(1, 0x000000, 0.9)
      .setVisible(false)
      .setOrigin(0.3, 0.5)
      .setDepth(10001)
      .on("pointerup", () => {
        this.myScene.input.off("pointerup");
        this.myScene.startDialog(this);
      });

    const text = "Speak";
    this.interactionMenuText = this.myScene.add
      .bitmapText(0, 0, "dogicapixel", text, this.fontSize)
      .setVisible(false)
      .setTint(0x000000)
      .setDepth(10002);
    this.moveInteractionMenuToPlayerPosition();
    return this;
  }
}
