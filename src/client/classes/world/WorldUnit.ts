import Phaser from "phaser";
import { WorldScene } from "../../scenes/WorldScene";
import findPath from "../../utils/findPath";
import { WorldOnlinePlayer } from "./WorldOnlinePlayer";

// unit in the world mode, as opposed to the Unit class for battle
export class WorldUnit extends Phaser.Physics.Arcade.Sprite {
  id: string;
  myScene: WorldScene;
  // position on the grid
  indX: number;
  indY: number;
  // pathfinding
  movePath: Phaser.Math.Vector2[] = [];
  moveChain: any = {};
  frameNumber: number;

  direction: string = "";
  isMoving: boolean = false;

  // time for moving by 1 tile (in ms)
  moveDuration = 180;

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
    this.x = this.tilePosToPixelsX();
    this.y = this.tilePosToPixelsY();
    this.depth = this.y;
    this.type = name;

    // chain of tweens containing the successive moving tweens in path from tile A to tile B
    this.moveChain.targets = this;
    this.moveChain.onStart = () => {
      // depth is same as y
      // so units lower on the screen appear on top
      this.depth = this.y;
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

  // check next direction to take, update tile position,
  // and call move function that adds the actual movement to the tween chain
  moveTo(target: Phaser.Math.Vector2) {
    const { x, y } = target;

    // left
    if (this.indX - x == 1) {
      this.direction = "left";
      this.move(this.direction);
      this.indX--;
    }
    // right
    else if (this.indX - x == -1) {
      this.direction = "right";
      this.move(this.direction);
      this.indX++;
      // down
    } else if (this.indY - y == -1) {
      this.direction = "down";
      this.move(this.direction);
      this.indY++;
      // up
    } else if (this.indY - y == 1) {
      this.direction = "up";
      this.move(this.direction);
      this.indY--;
    }
    this.moveAlong(this.movePath);
  }

  // actual moving of the player
  // via tweens
  move(direction: string) {
    this.isMoving = true;
    const duration = this.moveDuration;
    if (direction == "left" || direction == "right") {
      let deltaX = direction == "left" ? -1 : 1;
      this.moveChain.tweens.push({
        x: this.tilePosToPixelsX(deltaX),
        ease: "Linear",
        onStart: () => {
          this.startMovingAnim(direction);
          this.depth = this.y;
        },
        duration: duration,
        repeat: 0,
        yoyo: false,
      });
    } else {
      let deltaY = direction == "up" ? -1 : 1;
      this.moveChain.tweens.push({
        y: this.tilePosToPixelsY(deltaY),
        ease: "Linear",
        onStart: () => {
          this.startMovingAnim(direction);
          this.depth = this.y;
        },
        duration: duration,
        repeat: 0,
        yoyo: false,
      });
    }
  }

  // stop player movement
  // and their animations too
  stopMovement = () => {
    // clutch for when player is destroyed and keeps moving...
    if (this.anims) {
      this.depth = this.y;
      this.anims.stop();
      this.changeDirection(this.direction);
      this.direction = "";
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
  }

  // convert the tile position (index) of the character to actual pixel position
  // with optional delta
  tilePosToPixelsX(delta: number = 0) {
    return this.myScene.tileWidth * (this.indX + delta) + this.width / 2;
  }

  tilePosToPixelsY(delta: number = 0) {
    return this.myScene.tileHeight * (this.indY + delta) + this.height / 6;
  }

  // called when user clicks a tile while current movement is not finished
  interruptMovement() {
    this.scene.tweens.killTweensOf(this);
    this.stopMovement();
    this.indX = this.myScene.map.worldToTileX(this.x);
    this.indY = this.myScene.map.worldToTileX(this.y);
    // replace unit to center of tile it's currently in
    this.x = this.tilePosToPixelsX();
    this.y = this.tilePosToPixelsY();
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
}
