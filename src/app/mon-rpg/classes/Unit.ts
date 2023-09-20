import Phaser from 'phaser';
import { BattleScene } from '../scenes/BattleScene';
import { Spell } from './Spell';

export class Unit extends Phaser.GameObjects.Sprite {
  myScene: BattleScene;
  // position on the grid
  indX: number;
  indY: number;
  // movement points
  maxPm: number;
  pm: number;
  // health points
  maxHp: number;
  hp: number;
  // pathfinding
  movePath: Phaser.Math.Vector2[] = [];
  direction: string;
  isMoving: boolean;
  moveChain: any = {};
  frameNumber: number;
  isAlly: boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame: number,
    indX: number,
    indY: number,
    maxPm: number,
    maxHp: number,
    isAlly: boolean
  ) {
    super(scene, x, y, texture, frame);
    this.myScene = this.scene as BattleScene;
    this.indX = indX;
    this.indY = indY;
    this.maxPm = maxPm;
    this.pm = maxPm;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.direction = '';
    this.isMoving = false;
    this.frameNumber = frame;
    this.isAlly = isAlly;

    this.moveChain.targets = this;
    this.moveChain.onStart = () => {
      // depth is same as y
      // so units lower on the screen appear on top
      this.depth = this.y;
      this.isMoving = true;
    };
    this.moveChain.onComplete = this.stopMovement;
    this.moveChain.tweens = [];
  }

  // refills movement points at turn beginning
  refillPoints() {
    this.pm = this.maxPm;
  }

  // move along a path
  moveAlong(path: Phaser.Math.Vector2[]) {
    if (!path || path.length <= 0 || path.length > this.pm) {
      if (this.isMoving) {
        this.scene.tweens.chain(this.moveChain);
      }
      return;
    }

    this.movePath = path;
    this.moveTo(this.movePath.shift()!);
  }

  // called before actual move to check direction
  moveTo(target: Phaser.Math.Vector2) {
    this.myScene.removeFromObstacleLayer(this);
    let { x, y } = target;
    // left
    if (this.indX - x == 1) {
      this.direction = 'left';
      this.move(x, this.direction);
      this.indX--;
      this.pm--;
    }
    // right
    else if (this.indX - x == -1) {
      this.direction = 'right';
      this.move(x, this.direction);
      this.indX++;
      this.pm--;
      // down
    } else if (this.indY - y == -1) {
      this.direction = 'down';
      this.move(y, this.direction);
      this.indY++;
      this.pm--;
      // up
    } else if (this.indY - y == 1) {
      this.direction = 'up';
      this.move(y, this.direction);
      this.indY--;
      this.pm--;
    }
    this.myScene.addToObstacleLayer(
      new Phaser.Math.Vector2(this.indX, this.indY)
    );
    this.moveAlong(this.movePath);
  }

  // actual moving of the player
  // via tweens
  move(tilePos: number, direction: string) {
    this.isMoving = true;
    if (direction == 'left' || direction == 'right') {
      let deltaX = direction == 'left' ? -1 : 1;
      this.moveChain.tweens.push({
        x: this.tilePosToPixelsX(deltaX),
        ease: 'Linear',
        onStart: () => {
          this.startAnim(direction);
          this.depth = this.y;
        },
        duration: 300,
        repeat: 0,
        yoyo: false,
      });
    } else {
      let deltaY = direction == 'up' ? -1 : 1;
      this.moveChain.tweens.push({
        y: this.tilePosToPixelsY(deltaY),
        ease: 'Linear',
        onStart: () => {
          this.startAnim(direction);
          this.depth = this.y;
        },
        duration: 300,
        repeat: 0,
        yoyo: false,
      });
    }
  }

  // stop player movement
  // and their animations too
  stopMovement = () => {
    this.depth = this.y;
    this.isMoving = false;
    this.anims.stop();
    this.changeDirection(this.direction);
    this.direction = '';
    this.moveChain.tweens = [];
    this.nextAction();
  };

  // convert the tile position (index) of the character to actual pixel position
  tilePosToPixelsX(delta: number = 0) {
    return this.myScene.tileWidth * (this.indX + delta) + this.width / 2;
  }

  tilePosToPixelsY(delta: number = 0) {
    return this.myScene.tileHeight * (this.indY + delta) + this.height / 6;
  }

  startAnim = (direction: string) => {
    // if direction is left, just flip the image for right
    this.setFlipX(direction.startsWith('left'));
    // if unit has type 'amazon', animation for left is 'leftamazon'
    this.play(direction + this.type, true);
  };

  // polymorphic methods
  playTurn() {}
  nextAction() {}

  isDead(): boolean {
    return this.hp <= 0;
  }

  // launch a spell at specified position
  launchSpell(currentSpell: Spell, targetVec: Phaser.Math.Vector2) {
    let direction = '';
    this.lookAtTile(targetVec, direction);
  }

  // look at a position (change player direction)
  lookAtTile(targetVec: Phaser.Math.Vector2, direction: string) {
    // upper right corner
    if (targetVec.x >= this.indX && targetVec.y <= this.indY) {
      if (targetVec.x + targetVec.y < this.indX + this.indY) {
        direction = 'up';
      } else {
        direction = 'right';
      }
      // lower right corner
    } else if (targetVec.x >= this.indX && targetVec.y > this.indY) {
      if (targetVec.x - targetVec.y < this.indX - this.indY) {
        direction = 'down';
      } else {
        direction = 'right';
      }
      // lower left corner
    } else if (targetVec.x < this.indX && targetVec.y >= this.indY) {
      if (targetVec.x + targetVec.y < this.indX + this.indY) {
        direction = 'left';
      } else {
        direction = 'down';
      }
      // upper left corner
    } else if (targetVec.x < this.indX && targetVec.y < this.indY) {
      if (targetVec.x - targetVec.y < this.indX - this.indY) {
        direction = 'left';
      } else {
        direction = 'up';
      }
    }
    this.changeDirection(direction);
  }

  // change player direction
  changeDirection(direction: string) {
    switch (direction) {
      case 'left':
        // if direction is left, just flip the image for right
        this.setFlipX(true);
        this.setTexture('player', this.frameNumber + 1);
        break;
      case 'right':
        this.setFlipX(false);
        this.setTexture('player', this.frameNumber + 1);
        break;
      case 'up':
        this.setFlipX(false);
        this.setTexture('player', this.frameNumber + 2);
        break;
      case 'down':
        this.setFlipX(false);
        this.setTexture('player', this.frameNumber);
        break;
      default:
        break;
    }
  }
}
