export class EffectOverTime {
  name: string;
  frame: number;
  duration: number;
  damage: number;
  malusPA: number;
  malusPM: number;

  constructor(
    name: string,
    frame: number,
    duration: number,
    damage: number,
    malusPA: number,
    malusPM: number
  ) {
    this.name = name;
    this.frame = frame;
    this.duration = duration;
    this.damage = damage;
    this.malusPA = malusPA;
    this.malusPM = malusPM;
  }
}
