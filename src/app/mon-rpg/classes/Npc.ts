import Phaser from 'phaser';
import { Unit } from './Unit';

export class Npc extends Unit {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame: number,
    indX: number,
    indY: number,
    maxPm: number,
    maxPa: number,
    maxHp: number,
    isAlly: boolean
  ) {
    super(scene, x, y, texture, frame, indX, indY, maxPm, maxPa, maxHp, isAlly);
  }

  // plays npc turn
  override playTurn() {
    const startVec = new Phaser.Math.Vector2(this.indX, this.indY);
    // first calculate the accessible tiles around npc
    let accessibleTiles = this.myScene.calculateAccessibleTiles(
      startVec,
      this.pm
    );
    // then chooses one randomly
    const randMove = Phaser.Math.Between(0, accessibleTiles.length - 1);
    let targetVec = accessibleTiles[randMove];
    // then finds the path to it
    let path = this.myScene.findPath(startVec, targetVec);
    if (path) {
      // then move along it
      this.moveAlong(path);
    } else {
      // if no path found, do nothing
      this.stopMovement();
    }
  }

  override nextAction() {
    this.endTurn();
  }

  endTurn() {
    this.refillPoints();
    this.myScene.endTurn();
  }
}
