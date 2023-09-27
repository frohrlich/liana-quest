import Phaser from 'phaser';

export class Spell {
  minRange: number;
  maxRange: number;
  damage: number;
  cost: number;
  name: string;

  constructor(
    minRange: number,
    maxRange: number,
    damage: number,
    cost: number,
    name: string
  ) {
    this.minRange = minRange;
    this.maxRange = maxRange;
    this.damage = damage;
    this.cost = cost;
    this.name = name;
  }
}
