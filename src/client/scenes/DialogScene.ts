import { DialogData } from "../data/NpcData";
import { WorldScene } from "./WorldScene";

export class DialogScene extends Phaser.Scene {
  leftMargin = 5;
  topMargin = 10;
  bottomMargin = 5;
  intraResponsesMargin = 7;
  outlineLineWidth = 3;
  fontSize = 16;

  imageKey: string;
  dialogData: DialogData;
  image: Phaser.GameObjects.Image;
  worldScene: WorldScene;
  dialogRectangle: Phaser.GameObjects.Rectangle;
  dialog: Phaser.GameObjects.BitmapText;
  response: Phaser.GameObjects.BitmapText;
  responseRectangle: Phaser.GameObjects.Rectangle;
  characterName: string;
  name: Phaser.GameObjects.BitmapText;

  quit: Phaser.GameObjects.BitmapText;
  quitRectangle: Phaser.GameObjects.Rectangle;

  constructor() {
    super({
      key: "DialogScene",
    });
  }

  create(data: any) {
    this.worldScene = this.scene.get("WorldScene") as WorldScene;
    this.imageKey = data.imageKey;
    this.dialogData = data.dialogData;
    this.characterName = data.characterName;

    this.displayImage();
    this.createDialogOutline();
    this.displayCharacterName();
    this.displayDialog();
    this.displayQuitText();
    this.displayResponse();
  }

  displayQuitText() {
    this.quit = this.add
      .bitmapText(
        this.dialogRectangle.getBottomLeft().x + this.leftMargin,
        this.dialogRectangle.getBottomLeft().y - this.bottomMargin,
        "dogicapixelbold",
        this.dialogData.quitText,
        this.fontSize
      )
      .setMaxWidth(this.dialogRectangle.displayWidth)
      .setTint(0xccffcc)
      .setDepth(1);
    this.quit.y -= this.quit.displayHeight;

    this.quitRectangle = this.add
      .rectangle(
        this.quit.getTopLeft().x,
        this.quit.getTopLeft().y - 5,
        this.quit.displayWidth,
        this.quit.displayHeight + 5,
        0x888888
      )
      .setStrokeStyle(2, 0xeeeeee)
      .setInteractive()
      .setOrigin(0, 0)
      .on("pointerup", () => {
        this.worldScene.enableMovingOnClick();
        this.scene.stop("DialogScene");
      });
  }

  displayCharacterName() {
    this.name = this.add
      .bitmapText(
        this.dialogRectangle.getTopLeft().x + this.leftMargin,
        this.dialogRectangle.getTopLeft().y + this.topMargin,
        "dogicapixelbold",
        this.characterName,
        this.fontSize
      )
      .setMaxWidth(this.dialogRectangle.displayWidth)
      .setTint(0xaaddaa)
      .setDepth(1);

    this.add
      .rectangle(
        this.name.getTopLeft().x,
        this.name.getTopLeft().y - 5,
        this.dialogRectangle.width -
          this.leftMargin * 2 +
          this.outlineLineWidth / 2,
        this.name.displayHeight + 5,
        0x225522
      )
      .setOrigin(0, 0);
  }

  displayResponse() {
    this.response = this.add
      .bitmapText(
        this.dialogRectangle.getBottomLeft().x + this.leftMargin,
        this.quitRectangle.getTopLeft().y - this.intraResponsesMargin,
        "dogicapixelbold",
        this.dialogData.responseText,
        this.fontSize
      )
      .setMaxWidth(this.dialogRectangle.displayWidth)
      .setTint(0xccffcc)
      .setDepth(1);
    this.response.y -= this.response.displayHeight;

    this.responseRectangle = this.add
      .rectangle(
        this.response.getTopLeft().x,
        this.response.getTopLeft().y - 5,
        this.response.displayWidth,
        this.response.displayHeight + 5,
        0x888888
      )
      .setStrokeStyle(2, 0xeeeeee)
      .setInteractive()
      .setOrigin(0, 0)
      .on("pointerup", () => {});
  }

  displayDialog() {
    this.dialog = this.add
      .bitmapText(
        this.dialogRectangle.getTopLeft().x + this.leftMargin,
        this.dialogRectangle.getTopLeft().y +
          this.name.displayHeight +
          this.topMargin * 2,
        "dogicapixel",
        this.dialogData.dialogText,
        this.fontSize
      )
      .setMaxWidth(this.dialogRectangle.displayWidth)
      .setTint(0xccffcc);
  }

  displayImage() {
    this.image = this.add
      .image(
        this.game.canvas.width * 0.28,
        this.game.canvas.height / 2,
        this.imageKey
      )
      .setScale(0.53);
  }

  createDialogOutline() {
    this.dialogRectangle = this.add
      .rectangle(
        this.image.getTopRight().x,
        this.image.getTopRight().y,
        this.image.displayWidth * 1.5,
        this.image.displayHeight,
        0x000000,
        0.9
      )
      .setOrigin(0, 0);

    this.add
      .rectangle(
        this.image.getTopLeft().x,
        this.image.getTopLeft().y,
        this.image.displayWidth + this.dialogRectangle.displayWidth,
        this.image.displayHeight
      )
      .setOrigin(0, 0)
      .setStrokeStyle(this.outlineLineWidth, 0x000000, 0.9);
  }
}
