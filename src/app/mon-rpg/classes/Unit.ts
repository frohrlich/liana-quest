import Phaser from 'phaser';

export class Unit extends Phaser.GameObjects.Sprite {
  // position on the grid
  indX: number;
  indY: number;
  // movement points
  pm: number;
  // pathfinding
  private movePath: Phaser.Math.Vector2[] = [];
  private moveToTarget?: Phaser.Math.Vector2;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame: number,
    indX: number,
    indY: number,
    pm: number
  ) {
    super(scene, x, y, texture, frame);
    this.indX = indX;
    this.indY = indY;
    this.pm = pm;
  }

  moveAlong(path: Phaser.Math.Vector2[]) {
    if (!path || path.length <= 0) {
      return;
    }

    this.movePath = path;
    this.moveTo(this.movePath.shift()!);
  }

  moveTo(target: Phaser.Math.Vector2) {
    this.moveToTarget = target;
  }

}
