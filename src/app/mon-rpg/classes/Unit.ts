import Phaser from 'phaser';
import { BattleScene } from '../scenes/BattleScene';

export class Unit extends Phaser.GameObjects.Sprite {
  // position on the grid
  indX: number;
  indY: number;
  // movement points
  maxPm: number;
  pm: number;
  // pathfinding
  movePath: Phaser.Math.Vector2[] = [];
  direction: string;
  isMoving: boolean;
  moveChain: any = {};

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame: number,
    indX: number,
    indY: number,
    maxPm: number
  ) {
    super(scene, x, y, texture, frame);
    this.indX = indX;
    this.indY = indY;
    this.maxPm = maxPm;
    this.pm = maxPm;
    this.direction = '';
    this.isMoving = false;

    this.moveChain.targets = this;
    this.moveChain.onStart = () => {
      this.isMoving = true;
    };
    this.moveChain.onComplete = this.stopMovement;
    this.moveChain.tweens = [];

  }

  // refills movement points at turn beginning
  refillPoints() {
    this.pm = this.maxPm;
  }

  moveAlong(path: Phaser.Math.Vector2[]) {
    if (!path || path.length <= 0 || path.length > this.pm) {
      if(this.isMoving) {
        this.scene.tweens.chain(this.moveChain);
      }
      return;
    }

    this.movePath = path;
    this.moveTo(this.movePath.shift()!);
  }

  // called before actual move to check direction
  moveTo(target: Phaser.Math.Vector2) {
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
        },
        duration: 300,
        repeat: 0,
        yoyo: false,
      });
    }
  }

  // stop player movement
  // and their animations too
  // also update highlighted tiles
  stopMovement = () => {
    this.isMoving = false;
    this.anims.stop();
    switch (this.direction) {
      case 'left':
        this.setTexture('player', 7);
        break;
      case 'right':
        this.setTexture('player', 7);
        break;
      case 'up':
        this.setTexture('player', 8);
        break;
      case 'down':
        this.setTexture('player', 6);
        break;
      default:
        break;
    }

    this.direction = '';
    (this.scene as BattleScene).clearAccessibleTiles();
    (this.scene as BattleScene).highlightAccessibleTiles(this);
    this.moveChain.tweens = [];
  };

  // convert the tile position (index) of the character to actual pixel position
  tilePosToPixelsX(delta:number=0) {
    return (this.scene as BattleScene).tileWidth * (this.indX + delta) + this.width / 2;
  }

  tilePosToPixelsY(delta:number=0) {
    return (this.scene as BattleScene).tileHeight * (this.indY + delta) + this.height / 6;
  }

  startAnim = (direction: string) => {
    this.setFlipX(direction == 'left');
    this.play(direction, true);
  };
}
