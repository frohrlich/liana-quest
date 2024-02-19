import Phaser from "phaser";
import { WorldScene } from "../../scenes/WorldScene";
import findPath from "../../utils/findPath";

/** Unit in the world mode, as opposed to the Unit class for battle. */
export class WorldUnit extends Phaser.Physics.Arcade.Sprite {
  // time for moving by 1 tile (in ms)
  moveDuration = 150;

  // use these to adjust interaction menu position on click on unit
  minInteractionMenuWidth = 64;
  interactionMenuHeight = 12;
  interactionMenuOffsetX = 7;
  interactionMenuOffsetY = 5;
  interactionMenuOnTopOffsetY = 0;
  interactionMenuOnRightOffsetX = 9;

  fontSize = 8;

  // actual menu width depends on player username length
  interactionMenuWidth: number;
  id: string;
  myScene: WorldScene;
  // position on the grid
  indX: number;
  indY: number;
  // pathfinding
  movePath: Phaser.Math.Vector2[] = [];
  moveChain: any = {};
  frameNumber: number;

  direction: string = "down";
  isMoving: boolean = false;
  unitName: Phaser.GameObjects.BitmapText;
  selectedTint = 0x777777;
  baseTint: number;
  interactionMenuOutlines: Phaser.GameObjects.Rectangle[] = [];
  interactionMenuTexts: Phaser.GameObjects.BitmapText[] = [];

  constructor(
    scene: Phaser.Scene,
    id: string,
    indX: number,
    indY: number,
    texture: string,
    frame: number,
    type: string,
    name: string,
    baseTint: number
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
    this.type = type;
    this.name = name;
    this.baseTint = baseTint;

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

  /** Checks next direction to take
   * and calls move function that adds the 1 tile movement to the tween chain.
   */
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

  /** Actual moving of the player (by 1 tile) via tween. */
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
      },
      duration: this.moveDuration,
      repeat: 0,
      yoyo: false,
    });
  }

  /** Stop player movement and their animations too. */
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

  /** Converts a tile position (index) to actual unit pixel position. */
  tilePosToPixelsX(indX: number) {
    return this.myScene.tileWidth * indX + this.width / 2;
  }

  /** Converts a tile position (index) to actual unit pixel position. */
  tilePosToPixelsY(indY: number) {
    return this.myScene.tileHeight * indY + this.height / 6;
  }

  /** Called when user clicks a tile while current movement is not finished. */
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
      this.myScene.obstacles,
      this.myScene.transparentObstacles
    );
    if (path && path.length > 0) {
      this.moveAlong(path);
    }
  }

  displayInteractionMenu() {
    this.interactionMenuOutlines.forEach((outline) => {
      outline.setVisible(true);
      outline.setInteractive();
    });
    this.interactionMenuTexts.forEach((text) => {
      text.setVisible(true);
    });
  }

  hideInteractionMenu() {
    // added condition to avoid error when unit leaves scene while selected
    if (this.scene) {
      this.interactionMenuOutlines.forEach((outline) => {
        outline.setVisible(false);
        outline.disableInteractive();
      });
      this.interactionMenuTexts.forEach((text) => {
        text.setVisible(false);
      });
    }
  }

  makeChallengeOption() {
    return this.makeInteractionMenuItem("Challenge", 0xffffff, false, () =>
      this.myScene.startChallenge(this)
    );
  }

  private isOnTop() {
    return this.y < this.myScene.tileHeight * 3;
  }

  private isOnRightSide() {
    return (
      this.x + this.interactionMenuOffsetX + this.interactionMenuWidth >
      this.myScene.map.widthInPixels
    );
  }

  activateSelectEvents() {
    this.on("pointerup", () => {
      this.myScene.unselectCurrentUnit();
      this.selectUnit();
    });
    return this;
  }

  selectUnit() {
    this.tint = this.selectedTint;
    this.displayInteractionMenu();
    this.myScene.selectedUnit = this;
  }

  unSelectUnit() {
    this.tint = this.baseTint;
    this.hideInteractionMenu();
    this.myScene.selectedUnit = null;
  }

  /** When building interaction menu, always add the name first
   *  because it sets the menu width.
   */
  makeUnitName() {
    return this.makeInteractionMenuItem(this.name, 0xcccccc, true, null, true);
  }

  makeInteractionMenuItem(
    text: string,
    backgroundColor: number,
    bold: boolean,
    onClickFunction: Function = null,
    setMenuWidth: boolean = false
  ) {
    const font = bold ? "dogicapixelbold" : "dogicapixel";
    const textObject = this.myScene.add
      .bitmapText(0, 0, font, text, this.fontSize)
      .setVisible(false)
      .setTint(0x000000)
      .setDepth(10002);
    this.interactionMenuTexts.push(textObject);

    if (setMenuWidth) {
      this.interactionMenuWidth = Math.max(
        this.minInteractionMenuWidth,
        textObject.displayWidth + 5
      );
    }

    const outline = this.myScene.add
      .rectangle(
        0,
        0,
        this.interactionMenuWidth,
        this.interactionMenuHeight,
        backgroundColor,
        0.9
      )
      .setStrokeStyle(1, 0x000000, 0.9)
      .setVisible(false)
      .setOrigin(0, 0.5)
      .setDepth(10001);
    if (onClickFunction) {
      outline.on("pointerup", onClickFunction);
    }
    this.interactionMenuOutlines.push(outline);

    this.moveInteractionMenuToPlayerPosition();

    return this;
  }

  moveInteractionMenuToPlayerPosition() {
    for (let i = 0; i < this.interactionMenuOutlines.length; i++) {
      const outline = this.interactionMenuOutlines[i];
      const text = this.interactionMenuTexts[i];

      const rectanglePosY = this.isOnTop()
        ? this.y +
          this.displayHeight +
          i * this.interactionMenuHeight -
          3 +
          this.interactionMenuOnTopOffsetY
        : this.y -
          this.displayHeight -
          this.interactionMenuHeight *
            (this.interactionMenuOutlines.length - 1) +
          i * this.interactionMenuHeight +
          this.interactionMenuOffsetY;

      const rectanglePosX = this.isOnRightSide()
        ? this.x -
          this.interactionMenuWidth -
          this.interactionMenuOnRightOffsetX
        : this.x + this.interactionMenuOffsetX;
      outline.setPosition(rectanglePosX, rectanglePosY);

      const textPosY = this.isOnTop()
        ? this.y +
          this.displayHeight +
          i * this.interactionMenuHeight +
          this.interactionMenuOnTopOffsetY -
          6
        : this.y -
          this.displayHeight -
          this.interactionMenuHeight *
            (this.interactionMenuOutlines.length - 1) +
          i * this.interactionMenuHeight +
          this.interactionMenuOffsetY -
          3;

      const textPosX = this.isOnRightSide()
        ? this.x -
          this.interactionMenuWidth -
          this.displayWidth +
          this.interactionMenuOnRightOffsetX +
          8
        : this.x + this.displayWidth / 3 + 1;
      text.setPosition(textPosX, textPosY);
    }
  }

  teleportToPosition(indX: number, indY: number) {
    this.indX = indX;
    this.indY = indY;
    this.x = this.tilePosToPixelsX(indX);
    this.y = this.tilePosToPixelsY(indY);
    this.moveInteractionMenuToPlayerPosition();
  }

  destroy(fromScene?: boolean): void {
    this.interactionMenuOutlines.forEach((outline) => {
      outline.destroy(fromScene);
    });
    this.interactionMenuTexts.forEach((text) => {
      text.destroy(fromScene);
    });

    super.destroy(fromScene);
  }
}
