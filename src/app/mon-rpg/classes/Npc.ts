import Phaser from 'phaser';
import { Unit } from './Unit';
import { BattleScene } from '../scenes/BattleScene';
import findPath from '../utils/findPath';

export class Npc extends Unit {
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
    super(scene, x, y, texture, frame, indX, indY, maxPm);
  }

  playTurn() {
    let randX, randY;
    do {
      randX = this.indX + Phaser.Math.Between(-this.pm, this.pm);
      randY = this.indY + Phaser.Math.Between(-this.pm, this.pm);
    } while (!(this.scene as BattleScene).isAccessible(randX, randY, this));

    if ((this.scene as BattleScene).isAccessible(randX, randY, this)) {
      const startVec = new Phaser.Math.Vector2(this.indX, this.indY);
      const targetVec = new Phaser.Math.Vector2(randX, randY);

      // pathfinding
      let path = findPath(
        startVec,
        targetVec,
        (this.scene as BattleScene).background!,
        (this.scene as BattleScene).obstacles!
      );

      this.moveAlong(path);
    }
  }
}
