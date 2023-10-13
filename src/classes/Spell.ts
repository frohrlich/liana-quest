import { EffectOverTime } from "./EffectOverTime";
import { Unit } from "./Unit";

export class Spell {
  frame: number;
  minRange: number;
  maxRange: number;
  cost: number;
  name: string;
  // true if spell needs a line of sight to be cast
  lineOfSight: boolean;
  damage: number;
  malusPM: number;
  malusPA: number;
  heal: number;
  bonusPA: number;
  bonusPM: number;
  // area of effect type (mono target by default)
  aoe: string;
  aoeSize: number;
  effectOverTime: EffectOverTime;
  // for summon spells, defines summoned unit
  summons: Unit;

  constructor(
    frame: number,
    minRange: number,
    maxRange: number,
    cost: number,
    name: string,
    lineOfSight: boolean,
    damage: number,
    malusPM: number = 0,
    malusPA: number = 0,
    heal: number = 0,
    bonusPA: number = 0,
    bonusPM: number = 0,
    aoe: string = "monoTarget",
    aoeSize: number = 0,
    effectOverTime: EffectOverTime = null,
    summons: Unit = null
  ) {
    this.frame = frame;
    this.minRange = minRange;
    this.maxRange = maxRange;
    this.cost = cost;
    this.name = name;
    this.lineOfSight = lineOfSight;
    this.damage = damage;
    this.malusPM = malusPM;
    this.malusPA = malusPA;
    this.heal = heal;
    this.bonusPA = bonusPA;
    this.bonusPM = bonusPM;
    this.aoe = aoe;
    this.aoeSize = aoeSize;
    this.effectOverTime = effectOverTime;
    this.summons = summons;
  }
}
