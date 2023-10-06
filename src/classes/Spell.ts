import { EffectOverTime } from "./EffectOverTime";

export class Spell {
  frame: number;
  minRange: number;
  maxRange: number;
  damage: number;
  cost: number;
  name: string;
  // true if spell needs a line of sight to be cast
  lineOfSight: boolean;
  malusPM: number;
  malusPA: number;
  // area of effect type (mono target by default)
  aoe: string;
  aoeSize: number;
  effectOverTime: EffectOverTime;

  constructor(
    frame: number,
    minRange: number,
    maxRange: number,
    damage: number,
    cost: number,
    name: string,
    lineOfSight: boolean,
    malusPM: number = 0,
    malusPA: number = 0,
    aoe: string = "monoTarget",
    aoeSize: number = 0,
    effectOverTime: EffectOverTime = null
  ) {
    this.frame = frame;
    this.minRange = minRange;
    this.maxRange = maxRange;
    this.damage = damage;
    this.cost = cost;
    this.name = name;
    this.lineOfSight = lineOfSight;
    this.malusPM = malusPM;
    this.malusPA = malusPA;
    this.aoe = aoe;
    this.aoeSize = aoeSize;
    this.effectOverTime = effectOverTime;
  }
}
