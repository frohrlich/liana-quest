import Phaser from 'phaser';

export class Spell {
  range: number;
  damage: number;
  name: string;

  constructor(range: number, damage: number, name: string) {
    this.range = range;
    this.damage = damage;
    this.name = name;
  }
}
