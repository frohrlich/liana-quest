import Phaser from "phaser";
import { WorldScene } from "../../scenes/WorldScene";
import findPath from "../../utils/findPath";
import { WorldOnlinePlayer } from "./WorldOnlinePlayer";

// unit in the world mode, as opposed to the Unit class for battle
export class WorldUnit extends Phaser.Physics.Arcade.Sprite {
  // time for moving by 1 tile (in ms)
  moveDuration = 150;

  interactionMenuWidth = 60;
  interactionMenuHeight = 11;
  interactionMenuOffsetX = 2;
  interactionMenuOffsetY = 2;

  fontSize = 8;

  id: string;
  myScene: WorldScene;
  // position on the grid
  indX: number;
  indY: number;
  // pathfinding
  movePath: Phaser.Math.Vector2[] = [];
  moveChain: any = {};
  frameNumber: number;
  interactionMenuRectangle: Phaser.GameObjects.Rectangle;
  interactionMenuText: Phaser.GameObjects.BitmapText;

  direction: string = "down";
  isMoving: boolean = false;
  unitName: Phaser.GameObjects.BitmapText;

  constructor(
    scene: Phaser.Scene,
    id: string,
    indX: number,
    indY: number,
    texture: string,
    frame: number,
    name: string
  ) {
    super(scene, 0, 0, texture, frame);
    this.id = id;
    this.frameNumber = frame;
    this.myScene = scene as WorldScene;
    this.indX = indX;
    this.indY = indY;
    this.x = this.tilePosToPixelsX(indX);
    this.y = this.tilePosToPixelsY(indY);
    this.depth = this.y;
    this.type = name;

    // chain of tweens containing the successive moving tweens in path from tile A to tile B
    this.moveChain.targets = this;
    this.moveChain.onStart = () => {
      this.isMoving = true;
    };
    this.moveChain.onComplete = () => {
      this.updateServerDirection();
      this.stopMovement();
    };
    this.moveChain.tweens = [];
  }

  updateServerDirection() {}

  setHitboxScale(hitBoxScale: number = 1) {
    this.setSize(
      this.displayWidth * hitBoxScale,
      this.displayHeight * hitBoxScale
    );
  }

  // move along a path
  moveAlong(path: Phaser.Math.Vector2[]) {
    if (!path || path.length <= 0) {
      if (this.isMoving) {
        // when end of path is reached, start the chain of movement tweens
        this.scene.tweens.chain(this.moveChain);
      }
      return;
    }
    this.movePath = path;
    this.moveTo(this.movePath.shift()!);
  }

  // check next direction to take
  // and call move function that adds the actual movement to the tween chain
  moveTo(target: Phaser.Math.Vector2) {
    this.isMoving = true;

    let targetIndX = target.x;
    let targetIndY = target.y;

    if (this.indX - targetIndX > 0) {
      this.direction = "left";
    } else if (this.indX - targetIndX < 0) {
      this.direction = "right";
    } else if (this.indY - targetIndY < 0) {
      this.direction = "down";
    } else if (this.indY - targetIndY > 0) {
      this.direction = "up";
    }

    this.move(targetIndX, targetIndY, this.direction);

    this.indX = targetIndX;
    this.indY = targetIndY;

    this.moveAlong(this.movePath);
  }

  // actual moving of the player
  // via tweens
  move(targetIndX: number, targetIndY: number, direction: string) {
    this.moveChain.tweens.push({
      x: this.tilePosToPixelsX(targetIndX),
      y: this.tilePosToPixelsY(targetIndY),
      ease: "Linear",
      onStart: () => {
        this.startMovingAnim(direction);
      },
      onUpdate: () => {
        this.depth = this.y;
        this.moveInteractionMenuToPlayerPosition();
        this.moveUnitNameToPlayerPosition();
      },
      duration: this.moveDuration,
      repeat: 0,
      yoyo: false,
    });
  }

  // stop player movement
  // and their animations too
  stopMovement = () => {
    // clutch for when player is destroyed and keeps moving...
    if (this.anims) {
      this.anims.stop();
      this.changeDirection(this.direction);
      this.moveChain.tweens = [];
      this.isMoving = false;
    }
  };

  startMovingAnim = (direction: string) => {
    if (this.anims) {
      // if direction is left, just flip the image for right
      this.setFlipX(direction.startsWith("left"));
      // if unit has type 'Amazon', animation for left is 'leftAmazon'
      this.play(direction + this.type, true);
    }
  };

  // change player direction
  changeDirection(direction: string) {
    switch (direction) {
      case "left":
        // if direction is left, just flip the image for right
        this.setFlipX(true);
        this.setTexture("player", this.frameNumber + 1);
        break;
      case "right":
        this.setFlipX(false);
        this.setTexture("player", this.frameNumber + 1);
        break;
      case "up":
        this.setFlipX(false);
        this.setTexture("player", this.frameNumber + 2);
        break;
      case "down":
        this.setFlipX(false);
        this.setTexture("player", this.frameNumber);
        break;
      default:
        break;
    }
    this.direction = direction;

    return this;
  }

  // convert a tile position (index) to actual unit pixel position
  tilePosToPixelsX(indX: number) {
    return this.myScene.tileWidth * indX + this.width / 2;
  }

  tilePosToPixelsY(indY: number) {
    return this.myScene.tileHeight * indY + this.height / 6;
  }

  // called when user clicks a tile while current movement is not finished
  interruptMovement() {
    this.scene.tweens.killTweensOf(this);
    this.stopMovement();
    this.indX = this.myScene.map.worldToTileX(this.x);
    this.indY = this.myScene.map.worldToTileX(this.y);
    this.moveToNearestTileInFrontOfUnit();
  }

  moveToNearestTileInFrontOfUnit() {
    let tileDeltaX = 0,
      tileDeltaY = 0;

    switch (this.direction) {
      case "left":
        tileDeltaX = -1;
        break;
      case "right":
        tileDeltaX = 1;
        break;
      case "up":
        tileDeltaY = -1;
        break;
      case "down":
        tileDeltaY = 1;
        break;
      default:
        break;
    }

    const nearestX = this.tilePosToPixelsX(this.indX + tileDeltaX);
    const nearestY = this.tilePosToPixelsY(this.indY + tileDeltaY);

    this.myScene.tweens.add({
      targets: this,
      x: nearestX,
      y: nearestY,
      ease: "Linear",
      onStart: () => {
        this.startMovingAnim(this.direction);
      },
      onUpdate: () => {
        this.depth = this.y;
      },
      duration: this.moveDuration,
      repeat: 0,
      yoyo: false,
    });
  }

  moveToPosition(indX: number, indY: number) {
    if (this.isMoving) {
      this.interruptMovement();
    }
    const startVec = new Phaser.Math.Vector2(this.indX, this.indY);
    const targetVec = new Phaser.Math.Vector2(indX, indY);
    const path = findPath(
      startVec,
      targetVec,
      this.myScene.background,
      this.myScene.obstacles
    );
    if (path && path.length > 0) {
      this.moveAlong(path);
    }
  }

  displayInteractionMenu() {
    this.interactionMenuRectangle.setVisible(true);
    this.interactionMenuText.setVisible(true);
    this.interactionMenuRectangle.setInteractive();
  }

  hideInteractionMenu() {
    this.interactionMenuRectangle.setVisible(false);
    this.interactionMenuText.setVisible(false);
    this.interactionMenuRectangle.disableInteractive();
  }

  moveInteractionMenuToPlayerPosition() {
    if (this.interactionMenuRectangle) {
      const rectanglePosY = this.isOnTop()
        ? this.y + this.displayHeight
        : this.y - this.displayHeight + this.interactionMenuOffsetY;
      this.interactionMenuRectangle.setPosition(
        this.x + this.displayWidth + this.interactionMenuOffsetX,
        rectanglePosY
      );
      const textPosY = this.isOnTop()
        ? this.y + this.displayHeight - 3
        : this.y - this.displayHeight - 1;
      this.interactionMenuText.setPosition(
        this.x + this.displayWidth / 3 + 1,
        textPosY
      );
    }
  }

  makeInteractionMenu() {
    this.interactionMenuRectangle = this.myScene.add
      .rectangle(
        0,
        0,
        this.interactionMenuWidth,
        this.interactionMenuHeight,
        0xffffff,
        0.9
      )
      .setVisible(false)
      .setOrigin(0.3, 0.5)
      .setDepth(10001);
    const text = "Challenge";
    this.interactionMenuText = this.myScene.add
      .bitmapText(0, 0, "dogicapixel", text, this.fontSize)
      .setVisible(false)
      .setTint(0x000000)
      .setDepth(10002);
    this.moveInteractionMenuToPlayerPosition();
    return this;
  }

  private isOnTop() {
    return this.y < this.myScene.tileHeight * 3;
  }

  activateSelectEvents() {
    this.on("pointerup", () => {
      this.selectUnit();
    });
    return this;
  }

  selectUnit() {
    this.displayInteractionMenu();
    this.showUnitName();
    this.myScene.selectedUnit = this;
  }

  unSelectUnit() {
    this.hideInteractionMenu();
    this.hideUnitName();
    this.myScene.selectedUnit = null;
  }

  makeUnitName() {
    this.unitName = this.myScene.add
      .bitmapText(0, 0, "dogicapixelbold", this.type, this.fontSize)
      .setVisible(false)
      .setDepth(10002);
    this.moveUnitNameToPlayerPosition();
  }

  moveUnitNameToPlayerPosition() {
    if (this.unitName) {
      const posX = this.isOnTop()
        ? this.x - this.unitName.displayWidth * 0.8
        : this.x;
      const posY = this.isOnTop()
        ? this.y + this.displayHeight / 2
        : this.y + this.displayHeight;
      this.unitName.setPosition(posX, posY).setOrigin(0.5, 0.5);
    }
  }

  hideUnitName() {
    this.unitName.setVisible(false);
  }

  showUnitName() {
    this.unitName.setVisible(true);
  }
}
