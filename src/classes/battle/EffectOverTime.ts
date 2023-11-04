// represents effects in battle such as poison, etc
export class EffectOverTime {
  name: string;
  frame: number;
  duration: number;
  damage: number;
  malusPA: number;
  malusPM: number;
  heal: number;
  bonusPA: number;
  bonusPM: number;

  constructor(
    name: string,
    frame: number,
    duration: number,
    damage: number,
    malusPA: number,
    malusPM: number,
    heal: number,
    bonusPA: number,
    bonusPM: number
  ) {
    this.name = name;
    this.frame = frame;
    this.duration = duration;
    this.damage = damage;
    this.malusPA = malusPA;
    this.malusPM = malusPM;
    this.heal = heal;
    this.bonusPA = bonusPA;
    this.bonusPM = bonusPM;
  }
}
