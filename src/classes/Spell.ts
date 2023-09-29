export class Spell {
  minRange: number;
  maxRange: number;
  damage: number;
  cost: number;
  name: string;
  // true if spell needs a line of sight to be cast
  lineOfSight: boolean;
  malusPM: number;
  malusPA: number;

  constructor(
    minRange: number,
    maxRange: number,
    damage: number,
    cost: number,
    name: string,
    lineOfSight: boolean,
    malusPM: number = 0,
    malusPA: number = 0
  ) {
    this.minRange = minRange;
    this.maxRange = maxRange;
    this.damage = damage;
    this.cost = cost;
    this.name = name;
    this.lineOfSight = lineOfSight;
    this.malusPM = malusPM;
    this.malusPA = malusPA;
  }
}
