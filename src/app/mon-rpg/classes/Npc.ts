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

  override playTurn() {
    let maxAttempts = 999;
    let attempts = 0;
    const startVec = new Phaser.Math.Vector2(this.indX, this.indY);
    let path: Phaser.Math.Vector2[] = [];
    if (this.pm > 0) {
      do {
        const randX = this.indX + Phaser.Math.Between(-this.pm, this.pm);
        const randY = this.indY + Phaser.Math.Between(-this.pm, this.pm);
        const targetVec = new Phaser.Math.Vector2(randX, randY);
        // pathfinding
        path = findPath(
          startVec,
          targetVec,
          (this.scene as BattleScene).background!,
          (this.scene as BattleScene).obstacles!
        );
        attempts++;
      } while (
        (path.length <= 0 || path.length > this.pm) &&
        attempts < maxAttempts
      );
      this.moveAlong(path);
    } else {
      this.endTurn();
    }
  }

  override nextAction() {
    this.endTurn();
  }

  endTurn() {
    this.refillPoints();
    (this.scene as BattleScene).endTurn();
  }
}
