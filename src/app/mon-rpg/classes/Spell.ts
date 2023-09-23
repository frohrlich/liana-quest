import Phaser from 'phaser';

export class Spell {
  range: number;
  damage: number;
  cost: number;
  name: string;

  constructor(range: number, damage: number, cost: number, name: string) {
    this.range = range;
    this.damage = damage;
    this.cost = cost;
    this.name = name;
  }
}
