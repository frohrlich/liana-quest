export class EffectOverTime {
  duration: number;
  damage: number;
  malusPA: number;
  malusPM: number;

  constructor(
    duration: number,
    damage: number,
    malusPA: number,
    malusPM: number
  ) {
    this.duration = duration;
    this.damage = damage;
    this.malusPA = malusPA;
    this.malusPM = malusPM;
  }
}
