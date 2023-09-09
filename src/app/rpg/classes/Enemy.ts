import Phaser from 'phaser';
import { Unit } from './Unit';

export class Enemy extends Unit {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame: number|undefined,
    type: string,
    hp: number,
    damage: number
  ) {
    super(scene, x, y, texture, frame, type, hp, damage);
  }
}
