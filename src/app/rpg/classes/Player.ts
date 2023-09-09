import Phaser from 'phaser';
import { Unit } from './Unit';

export class Player extends Unit {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame: number,
    type: string,
    hp: number,
    damage: number
  ) {
    super(scene, x, y, texture, frame, type, hp, damage);
    this.flipX = true;
    this.setScale(2);
  }
}
