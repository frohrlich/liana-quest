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
    const startVec = new Phaser.Math.Vector2(this.indX, this.indY);
    let accessibleTiles = (this.scene as BattleScene).calculateAccessibleTiles(
      startVec,
      this.pm
    );
    const randMove = Phaser.Math.Between(0, accessibleTiles.length - 1);
    let targetVec = accessibleTiles[randMove];
    let path = (this.scene as BattleScene).findPath(startVec, targetVec);
    if (path) {
      this.moveAlong(path);
    } else {
      this.stopMovement();
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
